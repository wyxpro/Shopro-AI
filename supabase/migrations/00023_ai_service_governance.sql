-- 00023: AI 服务治理能力升级（对应 docs/完善.md 3.4.3）
-- 1. risk_events    —— 内容审核命中事件落库，供后台风控联动审计（Row 8）
-- 2. model_calls    —— 模型调用台账（action/provider/model/延迟/成本），支撑成本核算与日预算护栏（Row 10）
-- 3. emotion_analyses —— 情绪分析结果落库供复用（Row 4）
-- 4. prompt_templates 版本化：新增 action_key/version/is_active/variant 列，支持网关读取启用版本做 A/B（Row 2）
-- 5. user_plans 新增 daily_credit_budget 列（0 表示不限额），配合 model_calls 做超预算熔断

-- ══════════════════════════════════════════════════════════════════════════
-- 1. risk_events：内容风控命中事件
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.risk_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source       text NOT NULL DEFAULT 'content_moderation',
  action       text,
  decision     text NOT NULL,           -- reject | review_pending | pass_flagged
  category     text,                    -- porn|violence|gambling|drug|political|fraud|forbidden_goods|abuse|system_error
  matched_kw   text,                    -- 命中的违禁词（初筛）
  confidence   numeric(4,3),            -- 0.000 ~ 1.000
  snippet      text,                    -- 被审核内容摘要（截断存储，避免存全量敏感文本）
  reason       text,
  meta         jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_user ON public.risk_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_decision ON public.risk_events (decision, created_at DESC);

ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
-- 用户可读取自己的风控事件；写入统一由 service_role（ai-assistant 网关）执行，不开启客户端写策略
DROP POLICY IF EXISTS "risk_events_select_own" ON public.risk_events;
CREATE POLICY "risk_events_select_own" ON public.risk_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════
-- 2. model_calls：模型调用台账
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.model_calls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  provider      text,                   -- dxkp | siliconflow | seedance | appmiaoda | ...
  model         text,
  status        text NOT NULL,          -- success | error | cached | blocked
  latency_ms    integer,
  credits_cost  integer DEFAULT 0,      -- 本次消耗积分（用于成本聚合）
  cache_key     text,
  error_msg     text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_calls_user_time ON public.model_calls (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_calls_action ON public.model_calls (action, created_at DESC);
-- 日预算护栏聚合索引（按用户+当日）
CREATE INDEX IF NOT EXISTS idx_model_calls_budget ON public.model_calls (user_id, (created_at::date), credits_cost);

ALTER TABLE public.model_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "model_calls_select_own" ON public.model_calls;
CREATE POLICY "model_calls_select_own" ON public.model_calls
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 原子写入台账 + 返回当日累计成本（供预算判断，避免客户端读改写竞态）
CREATE OR REPLACE FUNCTION public.record_model_call(
  p_user_id uuid,
  p_action text,
  p_provider text,
  p_model text,
  p_status text,
  p_latency_ms integer,
  p_credits_cost integer,
  p_cache_key text DEFAULT NULL,
  p_error_msg text DEFAULT NULL
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    INSERT INTO model_calls (user_id, action, provider, model, status, latency_ms, credits_cost, cache_key, error_msg)
    VALUES (p_user_id, p_action, p_provider, p_model, p_status, p_latency_ms, p_credits_cost, p_cache_key, p_error_msg)
    RETURNING 1
  )
  SELECT COALESCE(SUM(credits_cost), 0)::integer
  FROM model_calls
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now());
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. emotion_analyses：情绪分析结果落库
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.emotion_analyses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id  text,
  source_hash text,                    -- 输入文本指纹，用于缓存复用
  segments    jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emotion_analyses_user ON public.emotion_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_hash ON public.emotion_analyses (source_hash);

ALTER TABLE public.emotion_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emotion_analyses_select_own" ON public.emotion_analyses;
CREATE POLICY "emotion_analyses_select_own" ON public.emotion_analyses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════
-- 4. prompt_templates 版本化（供网关按 action 读取启用版本做 A/B）
-- ══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.prompt_templates
  ADD COLUMN IF NOT EXISTS action_key text,
  ADD COLUMN IF NOT EXISTS version    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variant    text NOT NULL DEFAULT 'A';

CREATE INDEX IF NOT EXISTS idx_prompt_templates_active_action
  ON public.prompt_templates (action_key, is_active, variant)
  WHERE is_active = true;

-- 为四层脚本生成种子两条启用模板（A/B），供网关读取
INSERT INTO public.prompt_templates (title, category, platform, content, is_system, action_key, version, is_active, variant)
SELECT * FROM (VALUES
  ('四层脚本模板-A（转化优先）', 'script', 'douyin',
   '你是专业电商带货视频脚本策划师，精通「钩子→痛点→卖点→CTA」四层结构。要求：开场2秒强钩子制造悬念；痛点场景真实可共鸣；卖点用可感知利益表达（而非参数堆砌）；CTA制造限时紧迫感直引导购。全程紧扣带货转化目标。',
   true, 'generate_script_four_layer', 1, true, 'A'),
  ('四层脚本模板-B（种草优先）', 'script', 'douyin',
   '你是专业电商带货视频脚本策划师，精通「钩子→痛点→卖点→CTA」四层结构。要求：以生活方式与情绪价值切入建立向往感；痛点用故事化叙述；卖点场景化演示强调真实体验；CTA自然软引导鼓励评论互动。全程强化信任与种草氛围。',
   true, 'generate_script_four_layer', 1, true, 'B')
) AS v(title, category, platform, content, is_system, action_key, version, is_active, variant)
WHERE NOT EXISTS (
  SELECT 1 FROM public.prompt_templates WHERE action_key = 'generate_script_four_layer'
);

-- ══════════════════════════════════════════════════════════════════════════
-- 5. user_plans 日预算字段
-- ══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS daily_credit_budget integer NOT NULL DEFAULT 0; -- 0 = 不限额
