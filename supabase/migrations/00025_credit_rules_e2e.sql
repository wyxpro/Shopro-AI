-- ==============================================================================
-- Migration 00025: 积分体系端到端规则统一（自包含 + 幂等，可独立于 00022-00024 应用）
--
-- 规则口径（前后端与数据库三处一致）：
--   1. 新用户注册默认 20 积分，并写入首条「注册赠送 +20」流水（10 积分 = 1 元）
--   2. 视频生成固定单价 10 积分/次：前端提交任务时经 deduct_credits 原子扣费；
--      credit_costs.generate_video 置 0，杜绝 VideoCreatePage 前端扣 10 + EF 扣 50 的双重扣费
--   3. 失败回滚：refund_credits RPC（仅 service_role / 边缘函数）自动退还预扣积分；
--      重试不重复扣费
-- ==============================================================================

-- ── 0. 前置：credit_logs 双轨字段归一化（旧库缺列时补齐，幂等）─────────────────
ALTER TABLE public.credit_logs
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS balance_after integer;

UPDATE public.credit_logs
SET action = COALESCE(action, type),
    balance_after = COALESCE(balance_after, credits_after, 0)
WHERE action IS NULL OR balance_after IS NULL;

-- ── 1. 加固版原子扣费 RPC：FOR UPDATE 行锁 + 余额校验 + 越权防护 + jsonb 返回 ──
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id    uuid,
  p_amount     int,
  p_action     text DEFAULT 'AI视频生成'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total   int;
  v_used    int;
  v_left    int;
BEGIN
  -- 严格防止横向越权：如果客户端携带 JWT 登录态，必须等于自己的 UID
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION '权限拒绝：禁止从其他用户的账户扣除积分';
  END IF;

  -- 锁定行并检查可用余额（悲观锁防并发双扣）
  SELECT credits_total, credits_used INTO v_total, v_used
  FROM public.user_plans
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '未找到用户套餐计划';
  END IF;

  v_left := v_total - v_used;
  IF v_left < p_amount THEN
    RAISE EXCEPTION '积分不足：当前剩余 % 积分，本次需要 % 积分', v_left, p_amount;
  END IF;

  UPDATE public.user_plans
  SET credits_used = credits_used + p_amount,
      updated_at   = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_logs (
    user_id, amount, type, action, description, credits_after, balance_after
  )
  VALUES (
    p_user_id, -p_amount, 'deduct', p_action, p_action,
    v_left - p_amount, v_left - p_amount
  );

  RETURN jsonb_build_object('ok', true, 'credits_left', v_left - p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, int, text) TO authenticated, service_role;

-- ── 2. 失败回滚退款 RPC：仅限 service_role（边缘函数 refund_generation_credits 调用）──
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id uuid,
  p_amount  int,
  p_reason  text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used    int;
  v_total   int;
  v_balance int;
BEGIN
  SELECT credits_used, credits_total INTO v_used, v_total
  FROM public.user_plans
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '用户套餐不存在');
  END IF;

  UPDATE public.user_plans
  SET credits_used = GREATEST(0, credits_used - p_amount),
      updated_at   = now()
  WHERE user_id = p_user_id
  RETURNING credits_used, credits_total INTO v_used, v_total;

  v_balance := GREATEST(0, v_total - v_used);

  INSERT INTO public.credit_logs (
    user_id, amount, type, action, description, credits_after, balance_after
  )
  VALUES (
    p_user_id, p_amount, 'refund', 'refund',
    COALESCE(p_reason, '任务生成失败，自动返还积分'),
    v_balance, v_balance
  );

  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credits(uuid, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, int, text) TO service_role;

-- ── 3. 注册初始化：新用户默认 20 积分 + 首条「注册赠送 +20」流水 ────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_free_plan_id uuid;
  v_register_bonus int := 20;
BEGIN
  -- 从邮箱前缀生成用户名
  v_username := split_part(NEW.email, '@', 1);

  -- 创建 profiles 记录（忽略已存在的冲突）
  BEGIN
    INSERT INTO public.profiles (id, email, username, role)
    VALUES (NEW.id, NEW.email, v_username, 'user');
  EXCEPTION WHEN unique_violation THEN
    NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'profiles insert error: %', SQLERRM;
  END;

  -- 绑定免费套餐并赠送 20 积分
  BEGIN
    SELECT id INTO v_free_plan_id FROM public.plans WHERE name = '免费版' LIMIT 1;
    INSERT INTO public.user_plans (user_id, plan_id, credits_total, credits_used)
    VALUES (NEW.id, v_free_plan_id, v_register_bonus, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- 首条入账流水：注册赠送 +20（仅在本次确有插入时写入，幂等）
    IF FOUND THEN
      INSERT INTO public.credit_logs (
        user_id, amount, type, action, description, credits_after, balance_after
      )
      VALUES (
        NEW.id, v_register_bonus, 'bonus', 'register_gift',
        '注册赠送 +20 积分', v_register_bonus, v_register_bonus
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user_plans init error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ── 4. 视频生成计费归一：EF 侧不再扣费，统一由前端提交时原子扣 10 积分 ──────────
UPDATE public.credit_costs
SET cost = 0,
    description = '视频生成（EF侧不扣费）：统一由前端提交任务时原子扣 10 积分/次，失败经 refund_generation_credits 回滚'
WHERE action = 'generate_video';
