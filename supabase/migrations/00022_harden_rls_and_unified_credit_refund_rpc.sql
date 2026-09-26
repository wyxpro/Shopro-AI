-- 00022: 后端数据与权限安全加固迁移
-- 1. 收缩 user_plans 和 video_jobs 的 RLS 策略，禁止客户端直接篡改计费和任务态
-- 2. 字段兼容归一化 credit_logs (type/action, credits_after/balance_after)
-- 3. 补充 refund_credits RPC 失败退款原子操作
-- 4. 补充 increment_llm_cache_hit RPC 修复缓存计数
-- 5. 补充 error_logs 的 INSERT 权限以支持前端 ErrorBoundary 上报

-- ── 1. user_plans RLS 收缩（只读放行，写入收紧）────────────────────────────
ALTER TABLE IF EXISTS public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_plans_all" ON public.user_plans;
DROP POLICY IF EXISTS "user_plans_user_all" ON public.user_plans;
DROP POLICY IF EXISTS "user_plans_select_own" ON public.user_plans;
DROP POLICY IF EXISTS "user_plans_update_own" ON public.user_plans;

-- 客户端仅允许 SELECT 自己的套餐与积分记录
CREATE POLICY "user_plans_select_own" ON public.user_plans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 客户端允许插入初始套餐（仅供注册首选，不能自设高额积分）
DROP POLICY IF EXISTS "user_plans_insert_own" ON public.user_plans;
CREATE POLICY "user_plans_insert_own" ON public.user_plans
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND credits_total <= 50);

-- 注意：UPDATE user_plans 必须通过 SECURITY DEFINER RPC (deduct_credits, refund_credits) 或 service_role 执行

-- ── 2. video_jobs RLS 收缩（防止客户端随意修改状态机）────────────────────────
ALTER TABLE IF EXISTS public.video_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_jobs_user_all" ON public.video_jobs;
DROP POLICY IF EXISTS "video_jobs_select_own" ON public.video_jobs;
DROP POLICY IF EXISTS "video_jobs_insert_own" ON public.video_jobs;

CREATE POLICY "video_jobs_select_own" ON public.video_jobs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "video_jobs_insert_own" ON public.video_jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 3. avatars 与 templates 公共资源保护───────────────────────────────────────
ALTER TABLE IF EXISTS public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.templates ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户只读模板和数字人
DROP POLICY IF EXISTS "avatars_public_read" ON public.avatars;
CREATE POLICY "avatars_public_read" ON public.avatars
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "templates_public_read" ON public.templates;
CREATE POLICY "templates_public_read" ON public.templates
  FOR SELECT TO authenticated USING (true);

-- ── 4. error_logs 允许前端上报异常────────────────────────────────────────────
ALTER TABLE IF EXISTS public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_insert_auth" ON public.error_logs;
CREATE POLICY "error_logs_insert_auth" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── 5. credit_logs 双轨字段归一化兼容──────────────────────────────────────────
ALTER TABLE IF EXISTS public.credit_logs
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS balance_after integer;

-- 补齐历史字段默认值
UPDATE public.credit_logs
SET action = COALESCE(action, type),
    balance_after = COALESCE(balance_after, credits_after, 0)
WHERE action IS NULL OR balance_after IS NULL;

-- ── 6. 补充 refund_credits RPC（任务失败自动退还积分）───────────────────────────
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id uuid,
  p_amount  int,
  p_reason  text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. 回退 credits_used
  UPDATE public.user_plans
  SET credits_used = GREATEST(0, credits_used - p_amount),
      updated_at   = now()
  WHERE user_id = p_user_id;

  -- 2. 写入正向退还流水 (兼顾两套字段)
  INSERT INTO public.credit_logs (
    user_id,
    action,
    type,
    amount,
    balance_after,
    credits_after,
    description
  )
  SELECT
    p_user_id,
    'refund',
    'refund',
    p_amount,
    (credits_total - credits_used),
    (credits_total - credits_used),
    COALESCE(p_reason, '任务生成失败，自动返还积分')
  FROM public.user_plans
  WHERE user_id = p_user_id;
END;
$$;

-- ── 7. 补充 increment_llm_cache_hit RPC（修复缓存命中计数自增）─────────────────
CREATE OR REPLACE FUNCTION public.increment_llm_cache_hit(p_cache_key text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.llm_cache
  SET hit_count = hit_count + 1
  WHERE cache_key = p_cache_key;
END;
$$;
