-- ==============================================================================
-- Migration 00024: 数据库权限收紧 (ACL Hardening) 与幽灵列修复 (Ghost Columns Fix)
-- 对应 fx.md 3.3 Q1, Q2, Q8 & 7.2 数据层治理建议
-- ==============================================================================

-- ── 1. 修复幽灵列缺陷：重写 add_credits，废除不存在的 credits_remaining ─────────────
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount  int,
  p_desc    text DEFAULT '充值'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total   int;
  v_used    int;
  v_balance int;
BEGIN
  -- 锁定 user_plans 行并更新 credits_total
  UPDATE public.user_plans
  SET credits_total = credits_total + p_amount,
      updated_at    = now()
  WHERE user_id = p_user_id
  RETURNING credits_total, credits_used INTO v_total, v_used;

  IF NOT FOUND THEN
    -- 如果用户尚未初始化 user_plans，自动创建默认套餐
    INSERT INTO public.user_plans (user_id, credits_total, credits_used, status)
    VALUES (p_user_id, p_amount + 50, 0, 'active')
    RETURNING credits_total, credits_used INTO v_total, v_used;
  END IF;

  v_balance := GREATEST(0, v_total - v_used);

  -- 统一规范写入流水记录 (收敛双轨字段)
  INSERT INTO public.credit_logs (
    user_id,
    amount,
    type,
    action,
    description,
    credits_after,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    'topup',
    'topup',
    p_desc,
    v_balance,
    v_balance
  );

  RETURN jsonb_build_object(
    'ok', true,
    'credits_total', v_total,
    'credits_used', v_used,
    'balance', v_balance
  );
END;
$$;

-- ── 2. 收紧 add_credits ACL 权限：仅允许 service_role 执行，防止客户端任意刷积分 ───
REVOKE ALL ON FUNCTION public.add_credits(uuid, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, int, text) TO service_role;


-- ── 3. 加固并收紧 refund_credits：增加 FOR UPDATE 行锁 + 仅限 service_role ───────
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
  -- 加行锁检查并更新
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

  -- 写入正向退还流水 (收敛双轨字段)
  INSERT INTO public.credit_logs (
    user_id,
    action,
    type,
    amount,
    balance_after,
    credits_after,
    description
  )
  VALUES (
    p_user_id,
    'refund',
    'refund',
    p_amount,
    v_balance,
    v_balance,
    COALESCE(p_reason, '任务生成失败，自动返还积分')
  );

  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END;
$$;

-- 仅允许后端 Edge Function (service_role) 执行退款，严禁客户端 RPC 自助调用
REVOKE ALL ON FUNCTION public.refund_credits(uuid, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, int, text) TO service_role;


-- ── 4. 加固 deduct_credits ACL 与越权检查 ─────────────────────────────────────
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

  -- 锁定行并检查可用余额
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
    user_id,
    amount,
    type,
    action,
    description,
    credits_after,
    balance_after
  )
  VALUES (
    p_user_id,
    -p_amount,
    'deduct',
    p_action,
    p_action,
    v_left - p_amount,
    v_left - p_amount
  );

  RETURN jsonb_build_object(
    'ok', true,
    'credits_left', v_left - p_amount
  );
END;
$$;

-- 扣费仅允许已登录的 authenticated 角色及 service_role 调用，禁止匿名 anon
REVOKE ALL ON FUNCTION public.deduct_credits(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, int, text) TO authenticated, service_role;


-- ── 5. 加固其他辅助 RPC 函数 ──────────────────────────────────────────────────
-- increment_llm_cache_hit
REVOKE ALL ON FUNCTION public.increment_llm_cache_hit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_llm_cache_hit(text) TO authenticated, service_role;

-- upsert_rate_limit
REVOKE ALL ON FUNCTION public.upsert_rate_limit(text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_rate_limit(text, text, int, int) TO authenticated, service_role;
