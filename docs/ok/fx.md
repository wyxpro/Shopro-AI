# Shopro AI 项目全景分析与功能完善建议

> **分析对象**：E:\Code\AI\Start\Web\Shopro
> **分析范围**：商家创作端 `src/`、厂商运营中台 `backend/`、AI 服务与数据层 `supabase/` + `mcp/` + `api/`
> **分析方式**：全量静态代码走查（含 Git 追踪状态、密钥扫描、RLS/SQL 审计），未修改任何业务代码
> **报告日期**：2026-09-26

---

## 〇、结论摘要（先读这一段）

**一句话结论**：这是一个**前端展示层完成度极高的商业化 Demo 级项目**，但在「安全性、真实后端、测试」三个维度存在**结构性缺陷**，当前状态**不具备生产上线条件**。

| 维度 | 评级 | 核心判断 |
|---|---|---|
| 前端 UI/交互完成度 | ★★★★☆ | 42 个页面、46,278 行，组件体系完善，视觉与交互专业 |
| 前端真实数据链路 | ★★★☆☆ | 约 6 成页面接真实 Supabase，约 3 成掺入 Mock/随机数，3 个纯静态 |
| 厂商运营中台 | ★★★☆☆ | 14 个页面 UI 完整，但**全部业务逻辑与数据由 3,683 行 MSW Mock 承载**，无真实后端代码 |
| AI 服务层 | ★★★☆☆ | 17 个 Edge Function 多数真实调用第三方大模型，但含大量 Mock 降级分支与无鉴权端点 |
| 数据层 | ★★☆☆☆ | 23 个迁移、RLS 覆盖较广，但**权限未收紧（可自助刷积分）**，且存在幽灵列缺陷 |
| **安全性** | **★☆☆☆☆** | **三条红线：真实密钥入库、支付回调未验签、积分 RPC 对 PUBLIC 开放** |
| 工程化 | ★☆☆☆☆ | **全仓库零测试、零 CI**，后端无 lint 配置，文档与实现大面积不一致 |

**必须优先处置的 3 个高危项**（详见第五章）：

1. 🔴 **`key.txt` 明文密钥已被 Git 追踪入库**（5 个文件，含真实 JWT 与 API Key）——需立即轮换密钥并清理 Git 历史
2. 🔴 **微信支付回调未做签名验签**（`wechat-payment-webhook`）——可被伪造回调刷积分
3. 🔴 **`refund_credits` 等 `SECURITY DEFINER` RPC 未做 GRANT/REVOKE**——任意用户可直接调用自助刷积分

---

## 一、项目整体结构与实现现状

### 1.1 三层架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│  商家创作端 src/  (React 18 + TS + Vite + Tailwind + shadcn)      │
│  42 个页面 / 46,278 行 ── 直接调用 Supabase Client + Edge Function │
└───────────────────────────┬──────────────────────────────────────┘
                            │  supabase-js (anon key)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase 云后端                                                  │
│  ├─ Auth（邮箱/手机号/验证码）                                     │
│  ├─ PostgreSQL 23 个迁移 + RLS + RPC（积分扣减/退款/限流）          │
│  ├─ Storage（素材/封面）                                          │
│  └─ Edge Functions 17 个 Deno 函数 ── 转发 DeepSeek/Seedance/...   │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTPS
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  第三方大模型矩阵                                                  │
│  DeepSeek-V4 · Seedance 2.0 · CosyVoice2 · TeleSpeechASR          │
│  Kling · Sora · MiniMax · 文心一言 · 微信支付 V3                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  厂商运营中台 backend/  (Vue 3 + Element Plus + Pinia + ECharts)   │
│  14 个页面 / 9,217 行                                             │
│  └─ 48 个 REST 端点，全部由 MSW Mock 拦截（3,683 行）★无真实后端  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MCP 开放生态 mcp/ + api/  (Python FastMCP)                       │
│  主服务 7 工具 + 备份服务 3 工具 ── httpx 真实调用上游             │
│  ⚠ 0.0.0.0:8080、零鉴权、公网暴露 https://f.playe.top/mcp         │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 代码规模实测

| 模块 | 文件数 | 代码行数 | 说明 |
|---|---:|---:|---|
| `src/`（商家端） | 134 | **46,278** | 42 个页面 + 56 个 UI 原子组件 |
| `backend/src/`（厂商中台） | 76 | **9,217** | 14 个页面 + 48 个 Mock 端点 |
| `supabase/functions/` | 17 个目录 | — | Deno Edge Functions |
| `supabase/migrations/` | 23 个 SQL | — | 另有 234KB `schema.sql`（已过期） |
| `mcp/` + `api/` | 6 个 .py | — | FastMCP 服务与 Vercel 适配层 |
| **合计（不含 dist/node_modules）** | — | **≈ 5.5 万行** | — |

### 1.3 文档 vs 实现的一致性核查（实测）

文档（README / docs）与代码存在**系统性偏差**，这是评估项目成熟度的重要信号：

| 核查项 | 文档声称 | 实测结果 | 判定 |
|---|---|---|---|
| Edge Functions 数量 | 16 个 | **17 个** | ❌ 不一致 |
| 数据库迁移数量 | 21 个 | **23 个** | ❌ 不一致 |
| `query-payment-status` 函数 | 文档记录了端点 | **代码中不存在** | ❌ 幽灵接口 |
| `phase3-assistant` action 表 | 列出 10 个 action | 实际 14 个，**文档列的 `list_*`/`invite_team_member` 一个都没有** | ❌ 严重不符 |
| MCP 工具模型标注 | 说用 DeepSeek-V4-Pro / StepAudio | 实际调 DeepSeek-V4-Flash / CosyVoice2 | ❌ 不符 |
| 厂商后台生产架构 | "Spring Boot 3.x + Spring Security + JWT + PostgreSQL + Redis" | **仓库内无任何 Java 代码** | ❌ 严重失实 |
| 厂商后台页面数 | "20+ 企业级页面" | **14 个** | ❌ 夸大 |
| "改一行 `VITE_USE_MOCK=false` 即可切后端" | — | **关掉 Mock 后系统完全不可用**（登录都失败） | ❌ 严重误导 |
| 密钥治理 | `docs/完善.md` 称"明文 key 已全部消除 ✅" | **`key.txt` 仍在源码中读取，且已入库** | ❌ 与事实相反 |
| `siliconflow-audio` | README 正文提及 | **实际存在** | ✅ 一致 |

> **管理启示**：项目文档已失去"可信基线"作用。建议将 README 降级为"愿景/规划文档"，另建 `docs/CURRENT_STATE.md` 记录实测现状，避免后续接手者被误导。

---

## 二、前端层（商家创作端 `src/`）

### 2.1 现状

**技术栈落地质量较高**：React 18.3 + TS 5.5 + Vite 5.4 + Tailwind 3.4 + shadcn/Radix 组件体系完整。路由采用懒加载 + `Suspense` + `ErrorBoundary` 包裹，基础设施正规。

**页面实现真实度分层**（按数据来源判定）：

| 实现层级 | 数量 | 代表页面 | 判定依据 |
|---|---:|---|---|
| **A 完整真实** | ≈12–15 | Products、TeamSpace、OpenAPIPage、PromptTemplates、TaskQueue、LLMCache、MultiLang、Activities、Invite、Profile | 直接读写 Supabase 表 / 调 Edge Function，无假数据 |
| **B 部分 Mock** | ≈12 | HomePage、WorksPage、CreditsPage、AnalyticsPage、ABTestPage、CompetitorPage、KnowledgePage、DataFeedbackPage、LiveHighlightPage、StyleCopyPage、AvatarsPage | 主链路真实，但含随机数兜底 / Mock 数组 / `setTimeout` 模拟 |
| **C 纯静态占位** | 3 | NotificationsPage、AiToolboxPage、（部分）LiveHighlightPage | 全量硬编码数组，无任何持久化 |

**典型问题样本（有据可查）**：

- `HomePage.tsx:1115-1177`：4 个视频模型分支实际返回 `mockVideos` 随机示例视频，却将结果**写入 `video_projects` 并标记 `status:'completed'`** —— 用户拿到无关视频却被当作真实产物。
- `ABTestPage.tsx:83-86`：新建 A/B 变体时 `impressions/clicks/conversions` 全部写入 `Math.floor(Math.random()*3000)` —— **随机数污染真实 A/B 数据集**。
- `WorksPage.tsx:762-763`：页面加载时**硬编码删除全表** `title='无线耳机落水测试'` 记录（未限定 `user_id`），可能误删他人数据。
- `KnowledgePage.tsx:212-245`："AI 智能整合"实为**本地字符串拼接**，无任何 LLM 调用；顶部统计 `5,970+` / `99.4%` 为写死。
- `useCredits.ts:181-233`：RPC 失败时的降级路径为 `select` → `update` 的 read-modify-write，**存在并发扣费竞态**，且硬编码 `planId '8165825b-...'`。

**孤儿代码**：`DashboardPage.tsx` 被 `lazy()` 导入但从未挂载任何 `<Route>`（死导入）；`DataDashboardPage`、`MaterialsPage`、`PublishPage`（430 行）、`Index`、`NotFound` 共约 1,300 行**从未被路由引用**。

### 2.2 问题清单

| # | 问题 | 证据位置 | 严重度 |
|---|---|---|---|
| F1 | SiliconFlow API Key **明文硬编码进源码**（2 处） | `src/lib/sse.ts:237`、`src/services/audio/index.ts:9` | 🔴 高 |
| F2 | `VITE_` 前缀第三方密钥（DeepSeek/Cdance/SiliconFlow）**打入前端产物**，任何人可提取盗刷 | `.env:6-20`、`lib/sse.ts:125`、`lib/vectrust/index.ts:11-14` | 🔴 高 |
| F3 | Supabase anon key 硬编码兜底 | `src/db/supabase.ts:3-4` | 🔴 高 |
| F4 | 权限仅靠**客户端字符串匹配**（`planName.includes('pro')`），仅 2 个路由生效，可绕过 | `components/PlanGate.tsx:28-32`、`App.tsx:252/256` | 🔴 高 |
| F5 | `Profile.role` 类型定义了但**从未参与任何鉴权判断** | `types/types.ts:9`，全局零引用 | 🔴 高 |
| F6 | `ABTestPage` 写入随机假数据污染真实数据集 | `pages/ABTestPage.tsx:83-86` | 🔴 高 |
| F7 | `HomePage` 伪造视频生成结果并写库标记 `completed` | `pages/HomePage.tsx:1115-1177` | 🔴 高 |
| F8 | `WorksPage` 硬编码全表删除，未限定用户 | `pages/WorksPage.tsx:762-763` | 🔴 高 |
| F9 | `deductUserCredits` 降级路径存在并发竞态 + 硬编码 planId | `hooks/useCredits.ts:181-233, 197` | 🔴 高 |
| F10 | **零测试**（无 test/spec、无 Storybook、无 test 脚本） | `package.json:6-10` | 🔴 高 |
| F11 | 超长单文件，单组件 2,000–4,700 行，状态数十个 useState | `VideoEditPage.tsx`(4743)、`ProductSelectionPage.tsx`(3354)、`HomePage.tsx`(2732) | 🔴 高 |
| F12 | `react-query` 已安装并挂 Provider，但**全库零处 `useQuery`**，全站手写 `setInterval` 轮询 | `App.tsx:185/273`；`HomePage.tsx:855/877/928/1144` | 🟡 中 |
| F13 | **无统一 API 封装层**，`src/services/` 仅 `audio/index.ts` | — | 🟡 中 |
| F14 | 数据请求普遍不检查 `error` 返回，`catch (err: any)` 泛滥 | `WorksPage.tsx:771/804`、`AnalyticsPage.tsx:240` | 🟡 中 |
| F15 | 仅 1 个 ErrorBoundary，且错误上报依赖登录态（未登录必失败） | `App.tsx:83, 104, 119` | 🟡 中 |
| F16 | 约 65 处 `any`，数据模型未覆盖真实表导致各页内联重复 interface | `VideoEditPage.tsx`(9)、`VideoCreatePage.tsx`(8)、`ABTestPage.tsx:25-40` | 🟡 中 |
| F17 | 硬编码第三方图片/视频 URL 遍布（unsplash / w3schools / mixkit / 知乎） | `WorksPage.tsx:71/388/680-685`、`ProfilePage.tsx:65` | 🟡 中 |
| F18 | `OpenAPIPage` 在**浏览器端明文生成 API Key**，与同页"建议服务端调用"提示自相矛盾 | `pages/OpenAPIPage.tsx:98-124 vs 338` | 🟡 中 |
| F19 | 约 1,300 行孤儿页面代码（含死导入） | `App.tsx:21`、`PublishPage/DataDashboardPage/MaterialsPage` | 🟡 中 |
| F20 | lint 脚本用 `;` 串联导致**任一段失败不中断**；引用了不存在的规则文件 | `package.json:9`、`.rules/check.sh:17/21` | 🟢 低 |
| F21 | 平台映射/封面兜底/AB 面板逻辑在 4–5 个页面各写一份 | `WorksPage` vs `ABTestPage` vs `PublishPage` vs `ExportFormatsPage` | 🟢 低 |

### 2.3 改进建议

| # | 改进项 | 具体做法 | 优先级 | 工作量 |
|---|---|---|---|---|
| P1 | **密钥全面收口** | ① 删除 `sse.ts:237`、`services/audio/index.ts:9` 的明文 key；② 所有第三方调用改经 Edge Function 代理，前端不再持有任何 `sk-`；③ 移除全部 `VITE_*_API_KEY`；④ 轮换已泄露密钥 | P0 | 2 天 |
| P2 | **权限体系下沉到服务端** | ① 权限判断改为由 Edge Function / RPC 返回 `permissions[]` 数组；② `PlanGate` 只做 UI 隐藏，真实拦截靠 RLS + RPC 内校验；③ 补齐 34 个未受控路由的套餐策略 | P0 | 3 天 |
| P3 | **清除假数据污染真实链路** | ① `ABTestPage` 新建变体去掉随机数，改为 0 初值；② `HomePage` 未接真实模型的 4 个分支改为明确"即将上线"禁用态，禁止写库标 `completed`；③ 删除 `WorksPage:762` 硬编码删表；④ 移除 `WorksPage:687` 的测试用户种子逻辑 | P0 | 1.5 天 |
| P4 | **积分扣减改为单一原子路径** | 删除 `useCredits.ts:181-233` 的 read-modify-write 降级，RPC 失败即失败并提示；移除硬编码 `planId`；补充幂等键防重复扣费 | P0 | 1 天 |
| P5 | **补齐测试基建** | 引入 Vitest + React Testing Library，优先覆盖：积分扣减、支付流程、AuthContext、路由守卫、关键数据转换函数；目标首期 30% 行覆盖率 | P1 | 5 天 |
| P6 | **建立统一数据访问层** | 新建 `src/api/` 统一封装：`client.ts`（超时/重试/错误归一/401 处理）+ 按域拆分的 `products.ts`/`video.ts`/`credits.ts`；**同时启用 react-query** 替换手写轮询 | P1 | 5 天 |
| P7 | **拆分超长组件** | `VideoEditPage`(4743 行) → 按轨道/面板/时间轴拆为 6–8 个子组件 + 自定义 hooks；`HomePage`/`ProductSelectionPage` 同理；把 `mockVideos`/`MOCK_SELECTOR_PRODUCTS` 等常量抽到 `src/mocks/` 并标注仅 Demo 用 | P1 | 8 天 |
| P8 | **统一错误处理与兜底** | ① 全局 `QueryClient` 错误回调 + 统一 toast；② 所有 `.select()/.insert()` 检查 `error`；③ ErrorBoundary 上报改为不依赖登录态（先本地队列，登录后补报）；④ `catch (err: unknown)` + 类型收窄替换 `any` | P1 | 3 天 |
| P9 | **数据模型归一** | 把各页内联的 `ab_test_variants`/`teams`/`api_keys`/`publish_tasks` 等 interface 收敛进 `types/types.ts`；建议引入 `supabase gen types typescript` 自动生成数据库类型 | P2 | 2 天 |
| P10 | **清理死代码** | 删除 6 个未路由页面或补上路由；移除 `App.tsx:21` 死导入；`PublishPage` 若要保留需明确与 `ExportFormatsPage` 的职责边界 | P2 | 1 天 |
| P11 | **修复 lint 门禁** | 把 `package.json:9` 的 `;` 改为 `&&`，任一环节失败即中止；补齐 `.rules/check.sh` 引用的规则文件；纳入 CI | P2 | 0.5 天 |

---

## 三、后端层（厂商运营中台 `backend/` + 数据层 `supabase/`）

### 3.1 现状

#### (1) 厂商运营中台 `backend/`

**核心事实：这是一个"高完成度前端原型 + 3,683 行 MSW 内存后端"，仓库内不存在任何真实后端代码。**

- 技术栈：Vue 3.5 + TS 5.7 + Element Plus 2.9 + Pinia 2.3 + ECharts 5.6 + axios，**14 个页面 / 9,217 行**
- 业务模块 6 个：运营总览、客户与算力、AI 任务、风险治理、订单计费、系统运维
- **Mock 层占全项目代码约 40%**（3,683 / 9,217 行），承载了：数据持久化（localStorage）、RBAC 鉴权、状态机与业务规则、种子数据（120 用户/90 工作流/80 订单）、异步副作用推进器
- **48 个 REST 端点**全部由 MSW 拦截（`mocks/handlers/` 10 个文件）
- `VITE_USE_MOCK` 未落任何 `.env` 文件 → **Mock 默认必然启用**；关掉后**所有请求 404，连登录页都进不去**（`main.ts:62-66`）
- **值得肯定**：`ApiResponse<T>`/`PageResult<T>` 契约真实落地；Dashboard 指标/趋势是**真实聚合计算**而非写死（`mocks/handlers/dashboard.ts:52-103`）；`any` 全项目仅 1 处；Mock 端 fail-close 鉴权设计合理（只信任 `x-shopro-admin-id`，角色由"服务端"目录解析）

#### (2) 数据层 `supabase/`

- **23 个迁移文件**，覆盖 30+ 张表：`profiles`/`products`/`video_projects`/`materials`/`scripts`/`avatars`/`plans`/`user_plans`/`credit_logs`/`video_jobs`/`orders`/`teams`/`api_keys`/`risk_events`/`model_calls` 等
- RLS 覆盖较广（10 个迁移文件开启 RLS 并配策略），索引较完整
- **`deduct_credits`（`00013:25-48`）是原子的**：`UPDATE ... WHERE (credits_total-credits_used) >= p_amount` + `IF NOT FOUND RAISE`，天然防并发超扣 ✅
- `upsert_rate_limit` 用 `ON CONFLICT DO UPDATE` 原子计数 ✅

### 3.2 问题清单

| # | 问题 | 证据位置 | 严重度 |
|---|---|---|---|
| B1 | **仓库内无真实后端**，全部能力由 MSW Mock 承载；关掉 Mock 系统完全不可用 | 无任何 `.java/pom.xml`；`main.ts:62-66`；`mocks/handlers/**` | 🔴 致命 |
| B2 | **`refund_credits` 等 `SECURITY DEFINER` RPC 未做 GRANT/REVOKE** → 任意用户可调 `refund_credits(999999)` **自助刷积分** | `00022:77-111`；全库 `GRANT`/`REVOKE` **零命中** | 🔴 严重 |
| B3 | `add_credits` 引用**从未创建的列 `credits_remaining`** → 干净库执行必报错 | `00009:40-61`；`schema.sql:858-867` | 🔴 严重 |
| B4 | `handle_new_user` 同样引用幽灵列，迁移不可重放（`00016` 才修正） | `00011:28` vs `00002:87-98` | 🔴 高 |
| B5 | `shopro:unauthorized`（401）事件**无任何监听者**，会话失效无兜底 | `api/client.ts:70-72`，全项目零 `addEventListener` | 🔴 高 |
| B6 | 无 token/刷新机制，用户对象（含权限数组）**明文存 localStorage**，启动不校验会话 | `stores/auth.ts:36`；`getCurrentAdmin` 零调用 | 🔴 高 |
| B7 | 变更类操作大量缺 catch，失败时用户看不到任何提示 | `OrderListView.vue:335-361,385-411`、`WorkflowDetailView.vue:207-221` | 🔴 高 |
| B8 | 登录为演示逻辑，**密码完全被忽略**，未知邮箱回退超管 | `mocks/handlers/auth.ts:14-20` | 🔴 高 |
| B9 | 前端扣费降级直更 `user_plans`，与 `00022:8-27` 的 RLS 收紧**冲突 → 静默失败** | `src/hooks/useCredits.ts:230-233` vs `00022:8-27` | 🟡 中 |
| B10 | `credit_logs` **双轨字段**（`type`/`action`、`credits_after`/`balance_after`），三处代码各写一套 | `00002:113`、`00022:66-74`、`useCredits.ts:245-260` | 🟡 中 |
| B11 | `supabase/schema.sql`（234KB）**与迁移严重漂移**，仍保留旧全权限策略 | `schema.sql:7424-7427` | 🟡 中 |
| B12 | `refund_credits` 无 `FOR UPDATE` 行锁，并发退款可叠加 | `00022:85-88` | 🟡 中 |
| B13 | Mock 与真实后端契约不一致：关键字检索用 `JSON.stringify(item).includes()` | `mocks/handlers/utils.ts:107-111` | 🟡 中 |
| B14 | 分页 `pageSize` 无上限，前端硬编码 `pageSize:100` | `mocks/handlers/utils.ts:106`；`OrderListView.vue:278` | 🟡 中 |
| B15 | 无测试 / 后端无 lint 配置（根 `biome.json` 不含 `backend/`）/ 无 CI | `package.json:6-10`；`biome.json:7-12`；无 `.github` | 🔴 高 |
| B16 | 路由无权限时静默重定向，无 403 页与提示 | `router/index.ts:93` | 🟡 中 |
| B17 | 鉴权头为非标准自定义头而非 `Authorization: Bearer` | `api/client.ts:29-30` | 🟡 中 |
| B18 | 无国际化，中文/货币/日期全部硬编码 | 各 `views/**/*.vue` | 🟢 低 |
| B19 | 多个 API 函数/端点定义后零消费（`getCurrentAdmin`/`getJob`/`getOrganizations` 等） | `api/auth.ts:8`、`api/workflows.ts:23/39` | 🟢 低 |
| B20 | 文档端口 5173 与实际 5175 不符 | `README.md:191` vs `vite.config.ts:25` | 🟢 低 |

### 3.3 改进建议

| # | 改进项 | 具体做法 | 优先级 | 工作量 |
|---|---|---|---|---|
| Q1 | **数据库权限收紧（最高优先）** | ① 对所有 `SECURITY DEFINER` 函数执行 `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated`，仅 `GRANT EXECUTE` 给 `service_role`；② 新增迁移 `00024_fix_function_acl.sql`；③ 审计所有 RPC 的 `auth.uid()` 校验是否到位 | P0 | 1 天 |
| Q2 | **修复幽灵列缺陷** | 删除或重写 `00009` 的 `add_credits`、`00011` 的 `handle_new_user`，统一使用 `credits_total/credits_used`；在干净库上完整重放全部 23 个迁移验证 | P0 | 1 天 |
| Q3 | **明确后端技术选型并落地** | 二选一并公示：**方案 A**（推荐）用 Supabase Edge Function / PostgREST 承接厂商中台，把 `mocks/domain/*-rules.ts` 的业务逻辑迁移为 SQL 函数 + RLS；**方案 B** 另建 Spring Boot 服务，按 48 个 mock 端点逐一实现并写契约测试。无论哪种，必须先冻结 API 契约（OpenAPI 3.0） | P0 | 需求确认 2 天 |
| Q4 | **建立会话与 401/403 兜底** | ① 监听 `shopro:unauthorized` → 清理 store 并跳登录；② 接入 `app.config.errorHandler` 全局兜底；③ 引入真实 JWT（access + refresh）替代 localStorage 明文用户对象；④ 启动时调用 `/auth/me` 校验会话 | P0 | 3 天 |
| Q5 | **补齐测试/lint/CI 门禁** | ① 接入 Vitest 对 `mocks/domain/*-rules.ts` 写单测（这层是业务规则核心，性价比最高）；② 把 `backend/` 纳入 biome 或新建 ESLint 配置；③ 建 GitHub Actions：`typecheck + lint + test + build` | P1 | 4 天 |
| Q6 | **补齐变更操作的错误提示** | 统一封装 `useAsyncAction`（已有雏形）为强制模式：所有变更操作必须带 loading + 成功/失败 toast；禁止裸 `await` | P1 | 2 天 |
| Q7 | **消除契约不一致** | ① Mock 端的关键字检索改为按指定字段匹配，并显式声明可检索字段；② `pageSize` 加上限（如 100）并做参数校验；③ 时间过滤改用规范化 `timestamptz` 比较；④ 统一为 `Authorization: Bearer` | P1 | 2 天 |
| Q8 | **数据层一致性治理** | ① 删除 `supabase/schema.sql`（已过期，易误导）或改为仅用于冷启动；② `credit_logs` 双轨字段做一次性收敛（保留 `action`/`balance_after`，删除旧列并更新所有写入点）；③ `refund_credits` 增加行锁 | P1 | 2 天 |
| Q9 | **文档纠偏** | 重写 `backend/README.md`：如实说明"当前为 Mock 演示实现、无生产后端"；删除 Spring Boot / JWT / Redis 等未落地描述；修正端口与页面数 | P1 | 0.5 天 |
| Q10 | **补充 403 页面与国际化预留** | 路由守卫改为返回 403 页并提示缺失权限码；文案抽到 `src/locales/zh-CN.ts` 为后续 i18n 预留 | P2 | 1.5 天 |

---

## 四、AI 服务层（`supabase/functions/` + `mcp/` + `api/`）

### 4.1 现状

**17 个 Edge Functions 的真实度分层**：

| 类别 | 函数 | 判定依据 |
|---|---|---|
| **真实调用第三方** | `deepseek-v4-pro`、`seedance`、`stepaudio`、`siliconflow-audio`、`wenxin-text-generation`、`create-payment-order`、`kling-video-create/query`、`sora-video-create/query`、`minimax-chat` | 有真实 `fetch` 上游、读取 env 密钥、有 JWT 校验（部分缺） |
| **混合（真实 + Mock 降级）** | `ai-assistant`、`phase3-assistant` | 主链路真实，但含大量降级分支 |
| **真实但危险** | `setup-demo` | 真实创建用户，但**零鉴权 + 硬编码口令 `demo123456`** |
| **真实解密但未验签** | `wechat-payment-webhook` | AES-GCM 解密真实，**签名验证缺失** |

**`ai-assistant` 内部的降级分支清单**（关键：这些分支返回的是**伪 AI 结果**，但前端无法区分）：

| Action | 实现真实度 | 证据 |
|---|---|---|
| `generate_storyboard` | **纯硬编码**返回值 | `index.ts:581-593` |
| `analyze_traffic` | **纯随机数计算** | `index.ts:767-787` |
| `analyze_style` | 降级为 Mock | `index.ts:802-814` |
| `generate_ab_variants` | Mock | `index.ts:840-858` |
| `extract_highlights` | 降级 Mock | `index.ts:1022-1040` |
| `generate_video` | 无 key 时返回 mock 进度 | `index.ts:614-633` |
| `emotion_analysis` | 规则兜底 | `index.ts:1214-1227` |
| `generate_selling_points` | 模板兜底 | `index.ts:548-555` |
| `callLLM`、`generate_script_four_layer`、`translate_script`、`optimize_prompt`、`knowledge_rag_search` | **真实** | `index.ts:181/194` |

**`ai-assistant` 值得肯定的部分**：统一 try/catch、错误落库 `error_logs`、模型台账 `model_calls`、双层限流（内存 + DB RPC）、SHA-256 缓存（24h TTL）、扣费 fail-close、日预算熔断 —— **这是全项目工程质量最高的一个文件**。

**`phase3-assistant`**：14 个 action，其中 `crawl_competitor`（`index.ts:91-105`）与 `analyze_live_highlight`（`:153-171`）**用 LLM 幻觉 + `Math.random` 冒充真实抓取数据**；`publish_video`（`:371-382`）**写入假发布链接**。

**MCP 服务**：主服务 `mcp_shopro_server.py` 7 个工具全部通过 `httpx` 真实调用上游 ✅；备份服务 `mcp_server.py` 3 个工具。但**主服务的鉴权被移除**（`handle_tool_call:38-63` 无校验，而备份版 `mcp_server.py:26-40` 有 `verify_auth()`），且默认绑定 `0.0.0.0:8080`，公网地址 `https://f.playe.top/mcp` 已暴露。

**`api/` 目录**：是 MCP 与 DXKP 的 Vercel Serverless 适配层（非业务 API），但存在两处高危：`api/mcp.py:18` **显式关闭 DNS Rebinding 防护**，`api/dxkp.py:43-47` **无鉴权地注入服务端 API_KEY 转发上游**。

### 4.2 问题清单

| # | 问题 | 证据位置 | 严重度 |
|---|---|---|---|
| A1 | **真实密钥 `key.txt` 硬编码入库且已被 Git 追踪**（5 个文件，含 234 字节真实 JWT + 66 字节 API Key） | `supabase/functions/{ai-assistant,deepseek-v4-pro,seedance,stepaudio,wenxin-text-generation}/key.txt` | 🔴 严重 |
| A2 | 代码仍保留 `key.txt` 兜底读取，文档却声称"已移除" | `ai-assistant/index.ts:604-612,1256-1262,1338-1344`；`stepaudio/index.ts:35-43` | 🔴 严重 |
| A3 | **微信支付回调未做签名验签**（`Wechatpay-Signature` 仅在 CORS 头出现，代码从未校验） | `wechat-payment-webhook/index.ts:7, 33-54` | 🔴 严重 |
| A4 | **公网 MCP 端点零鉴权 + 关闭 DNS Rebinding 防护** | `mcp_shopro_server.py:38-63,378-383`；`api/mcp.py:18,51` | 🔴 严重 |
| A5 | `deepseek-v4-pro`、`stepaudio` **无 JWT 校验** | `deepseek-v4-pro/index.ts`、`stepaudio/index.ts` | 🔴 高 |
| A6 | `send-sms-code`/`verify-sms-code` 无鉴权 → **短信轰炸 / 资费盗刷** | `send-sms-code/index.ts:8-45` | 🔴 高 |
| A7 | `setup-demo` 无鉴权，可创建已知口令账号并枚举用户 | `setup-demo/index.ts:18-33` | 🔴 高 |
| A8 | `ai-assistant` 无 JWT 时**信任 body 里的 `user_id`**，配合 `service_role` 可越权操作他人数据 | `ai-assistant/index.ts:352-362` | 🔴 高 |
| A9 | `api/dxkp.py` 无鉴权密钥代理，上游额度可被白嫖 | `api/dxkp.py:6,19,43-62` | 🔴 高 |
| A10 | `phase3-assistant` 用 LLM 幻觉 + 随机数冒充真实抓取；发布写假链接 | `phase3-assistant/index.ts:91-105,153-171,371-382` | 🔴 高 |
| A11 | 全部 17 个函数 CORS 为 `'*'` | 各 `index.ts` 头部 | 🟡 中 |
| A12 | 异步视频后台轮询（40×6s）可能被运行时回收，超时置 `failed` 但**不触发积分退款** | `ai-assistant/index.ts:701-763` | 🟡 中 |
| A13 | `seedance`/`kling`/`sora` 仅做透传，**无服务端状态落库/重试/超时兜底**，状态完全依赖前端轮询 | `seedance/index.ts` 等 | 🟡 中 |
| A14 | 无共享中间件，CORS/JWT/错误处理在 17 个文件各写一遍（kling/sora/minimax 几乎逐字重复） | — | 🟡 中 |
| A15 | `wechat-payment-webhook` 异常静默吞掉恒返 200，掩盖故障 | `wechat-payment-webhook/index.ts:131-134` | 🟢 低 |
| A16 | 文档与代码大面积不一致（函数数、迁移数、幽灵接口、phase3 action 表、MCP 模型标注） | 见 §1.3 | 🟡 中 |

### 4.3 改进建议

| # | 改进项 | 具体做法 | 优先级 | 工作量 |
|---|---|---|---|---|
| R1 | **密钥应急响应（当天完成）** | ① **立即轮换** 5 个 `key.txt` 中的所有密钥（DeepSeek / Seedance / StepFun / 文心）；② `git rm --cached` 5 个 `key.txt` 并加入 `.gitignore`；③ 用 `git filter-repo` 清理历史提交；④ 删除 `ai-assistant`/`stepaudio` 中 4 处 `Deno.readTextFile('./key.txt')` 兜底逻辑，改为 env 缺失即快速失败 | P0 | 1 天 |
| R2 | **微信支付回调补验签** | 用 `Wechatpay-Signature` + 平台证书公钥验签，校验 `timestamp` 防重放窗口（5 分钟）；验签失败返回 4xx 而非吞掉；异常改为返回 500 以便微信重试 | P0 | 1 天 |
| R3 | **统一 Edge Function 鉴权中间件** | 抽 `_shared/auth.ts`：所有函数入口强制校验 JWT 并取 `auth.uid()`（禁止信任 body 的 `user_id`）；`send-sms-code`/`verify-sms-code` 增加图形验证码 + 手机号频控（60s/次、10 次/天）；`setup-demo` 改为仅允许 service_role 调用或加环境开关 | P0 | 2 天 |
| R4 | **MCP 服务加固** | ① 恢复并强制鉴权（Bearer Token，`mcp_server.py:26-40` 已有可复用实现）；② 默认绑定改为 `127.0.0.1`，容器内通过 reverse proxy 暴露；③ `api/mcp.py:18` 恢复 DNS Rebinding 防护；④ `api/dxkp.py` 增加调用方鉴权 | P0 | 1.5 天 |
| R5 | **删除/隔离"伪 AI"降级分支** | 为 `ai-assistant` 的 8 个 Mock 分支引入显式标记：响应体加 `"degraded": true` + `"degraded_reason"`，前端展示"演示数据"角标；或直接改为返回 501 让前端走"功能开发中"。`phase3-assistant` 的 `crawl_competitor`/`analyze_live_highlight` 同理，禁止用随机数冒充真实抓取 | P0 | 2 天 |
| R6 | **异步任务可靠性建设** | ① 视频任务改为「Edge Function 提交 → `video_jobs` 落库 → 定时任务（`pg_cron` 或 Supabase Scheduled Function）轮询 → 更新状态」；② 超时/失败自动触发积分退款（对接已有 `refund_credits`）；③ 增加幂等键防重复提交 | P1 | 4 天 |
| R7 | **抽取共享模块消除重复** | 新建 `supabase/functions/_shared/`：`cors.ts`（按域名白名单替代 `*`）、`auth.ts`、`errors.ts`、`llm.ts`、`db.ts`；17 个函数统一引用 | P1 | 3 天 |
| R8 | **可观测性补强** | Edge Function 统一结构化日志（含 `trace_id`/`user_id`/`action`/`latency`/`cost`）；复用已有 `model_calls` 台账做成本看板；接入告警（失败率、超时率、单用户异常调用） | P1 | 3 天 |
| R9 | **契约真相化** | 用 OpenAPI 3.0 描述全部 Edge Function 与 `phase3-assistant` action；配置 schema 校验入参；以此作为前后端唯一契约来源 | P1 | 3 天 |
| R10 | **文档纠偏** | 修正 README 中函数数（17）、迁移数（23）、删除幽灵 `query-payment-status`、修正 `phase3-assistant` action 表与 MCP 模型标注 | P2 | 0.5 天 |

---

## 五、跨层系统性问题：三条安全红线

### 红线一：密钥管理体系失效

| 风险点 | 具体证据 | 影响 |
|---|---|---|
| 密钥入库 | 5 个 `key.txt` 被 Git 追踪，含真实 JWT 与 API Key | 任何拿到仓库的人可直接消耗平台全部 AI 额度 |
| 源码硬编码 | `src/lib/sse.ts:237`、`src/services/audio/index.ts:9` 明文 `sk-fvaew...` | 前端产物可逆向提取 |
| 前端持有密钥 | `.env` 的 `VITE_DEEPSEEK_API_KEY`/`VITE_CDANCE_API_KEY`/`VITE_SILICONFLOW_API_KEY` | 打包进 bundle，等同公开 |
| 文档虚假声明 | `docs/完善.md:181,195` 声称"明文 key 已全部消除 ✅" | 掩盖风险，延误处置 |

**处置**：所有第三方调用**必须**经 Edge Function 代理；前端零密钥；密钥管理器（Supabase Secrets / Vault）统一托管；已泄露密钥**全部轮换**。

### 红线二：资金链路存在漏洞

| 风险点 | 具体证据 | 影响 |
|---|---|---|
| 支付回调未验签 | `wechat-payment-webhook/index.ts:33-54` | 可伪造回调直接充值 |
| 积分 RPC 未收紧权限 | 全库无 `GRANT`/`REVOKE`；`refund_credits`(`00022:77-111`) | 任意用户可调用 `refund_credits(999999)` 自助刷积分 |
| `ai-assistant` 信任 body user_id | `index.ts:352-362` | 越权操作他人数据，配合 service_role 绕过 RLS |
| 前端扣费可绕过 | `PlanGate` 客户端判定；`useCredits` 降级直更表 | 权限与计费均在客户端可篡改 |

**处置**：支付回调补验签 → RPC 权限收紧 → 所有计费判断在服务端完成 → 引入对账任务（每日核对 `credit_logs` 与 `orders`）。

### 红线三：公网暴露的零鉴权入口

| 入口 | 状态 |
|---|---|
| `https://f.playe.top/mcp` | 零鉴权、DNS Rebinding 防护已关闭 |
| `send-sms-code` / `verify-sms-code` | 无鉴权，可短信轰炸盗刷资费 |
| `setup-demo` | 无鉴权，可创建已知口令账号 + 枚举用户列表 |
| `deepseek-v4-pro` / `stepaudio` | 无本地 JWT 校验 |
| `api/dxkp.py` | 无鉴权注入服务端密钥的代理 |

**处置**：全量加鉴权 + 频控 + 额度上限；对外端点接入 WAF 或网关层限流。

---

## 六、分阶段落地路线图

### 阶段 P0：安全止血（建议 1 周内完成，不涉及功能开发）

| 序号 | 任务 | 产出 | 预估 |
|---|---|---|---|
| 1 | 轮换全部泄露密钥 + 清理 Git 历史 + 移除 `key.txt` 读取逻辑 | 安全事件闭环报告 | 1 天 |
| 2 | 微信支付回调补签名验签 | 验签通过的 webhook + 单测 | 1 天 |
| 3 | 数据库 RPC 权限收紧（`REVOKE ... FROM PUBLIC`）+ 幽灵列修复 | `00024_fix_function_acl.sql` | 1 天 |
| 4 | Edge Function 统一 JWT 校验 + 短信接口频控 + MCP 恢复鉴权 | `_shared/auth.ts` | 2 天 |
| 5 | 清除前端假数据污染（ABTest 随机数、HomePage 伪生成、WorksPage 硬删）+ 积分扣减原子化 | 修复 PR | 2 天 |

### 阶段 P1：真实化与工程质量（1 个月）

| 序号 | 任务 | 产出 | 预估 |
|---|---|---|---|
| 6 | 后端选型决策 + API 契约冻结（OpenAPI 3.0） | 技术方案文档 + 契约文件 | 1 周 |
| 7 | 前端统一数据访问层 + 启用 react-query | `src/api/**` | 1 周 |
| 8 | 测试基建（Vitest）+ CI 门禁（typecheck/lint/test/build） | CI 流水线 | 1 周 |
| 9 | 异步视频任务可靠化（落库 + 定时轮询 + 失败退款） | `video_jobs` 闭环 | 1 周 |
| 10 | 共享中间件抽取 + CORS 白名单 + 可观测性 | `_shared/**` + 日志看板 | 1 周 |

### 阶段 P2：架构治理与体验完善（2–3 个月）

| 序号 | 任务 | 产出 | 预估 |
|---|---|---|---|
| 11 | 超长组件拆分（VideoEditPage 等） | 组件树重构 | 2 周 |
| 12 | 厂商中台业务逻辑后端化（迁移 `mocks/domain/*-rules.ts`） | 真实后端服务 | 3–4 周 |
| 13 | 数据模型归一 + Supabase 类型自动生成 | `types/types.ts` 重构 | 1 周 |
| 14 | 文档体系重建（现状文档与愿景文档分离） | `docs/CURRENT_STATE.md` | 3 天 |
| 15 | 死代码清理 + 国际化预留 + 403 兜底 | 清理 PR | 1 周 |

---

## 七、分层总结表（现状 / 问题 / 改进建议）

### 7.1 前端层（商家创作端 `src/`）

| 维度 | 现状 | 主要问题 | 改进建议 |
|---|---|---|---|
| 页面与路由 | 42 个页面 / 46,278 行；路由懒加载 + ErrorBoundary；6 个页面未被路由 | 约 1,300 行死代码；`DashboardPage` 死导入 | 删除或补路由（P10） |
| 数据链路 | 直接调 Supabase Client + Edge Function；无统一 API 层 | 12–15 个页面真实，约 12 个含 Mock，3 个纯静态 | 建 `src/api/**` 统一层（P6） |
| 状态管理 | 已装 react-query 但零使用；全站手写 `setInterval` 轮询 | 无缓存/去重/重试；响应不一致 | 启用 react-query（P6） |
| 权限控制 | `PlanGate` 客户端字符串匹配；仅 2 个路由受控 | `role` 字段从未使用；34 个路由无套餐校验；可绕过 | 权限下沉服务端（P2） |
| 计费 | `deductUserCredits` 封装较完整，含 Realtime 同步 | 降级路径竞态；硬编码 planId；写入随机假数据污染 A/B | 单一原子路径（P4）+ 清假数据（P3） |
| 类型与模型 | `types.ts` 390 行，覆盖核心模型 | 约 65 处 `any`；缺失模型被各页内联重复声明 | 模型归一 + 自动生成类型（P9） |
| 安全 | — | **明文 API Key ×2**；`VITE_*` 密钥入产物；anon key 硬编码 | 密钥全面收口（P1） |
| 工程化 | Biome + tsgo + ast-grep 规则链 | **零测试**；lint 用 `;` 不中断；超高长文件 | 测试基建（P5）+ 拆分（P7）+ 修 lint（P11） |

### 7.2 后端层（厂商中台 `backend/` + 数据层 `supabase/`）

| 维度 | 现状 | 主要问题 | 改进建议 |
|---|---|---|---|
| 服务端实现 | 14 页面 / 9,217 行；48 个 REST 端点 | **无真实后端**，全部由 3,683 行 MSW Mock 承载；关 Mock 即不可用 | 后端选型并落地（Q3） |
| API 契约 | `ApiResponse<T>`/`PageResult<T>` 真实落地；axios 双拦截器 | 关键字检索语义错误；`pageSize` 无上限；鉴权头非标准 | 消除契约不一致（Q7） |
| RBAC | 前端权限码常量 + Mock 端 fail-close 校验（设计合理） | 权限目录在前端硬编码；无 403 页；路由静默重定向 | 403 兜底 + 权限服务端化（Q4/Q10） |
| 会话 | localStorage 明文存用户对象 | **无 token/刷新**；401 事件无监听者；启动不校验会话 | 真实 JWT + 401 兜底（Q4） |
| 数据库 | 23 迁移 / 30+ 表；RLS 覆盖较广；`deduct_credits` 原子 ✅ | **RPC 未收紧权限 → 可刷积分**；幽灵列 `credits_remaining`；双轨字段 | ACL 收紧（Q1）+ 修复幽灵列（Q2）+ 治理一致性（Q8） |
| 数据源一致性 | 迁移演进到 `00023` | `schema.sql`(234KB) 严重漂移且保留旧权限策略 | 删除或明确其用途（Q8） |
| 工程质量 | TS `strict: true`；`any` 仅 1 处 ✅ | **零测试 / 无 lint / 无 CI**；变更操作大量无 catch | 测试+lint+CI（Q5）+ 错误提示（Q6） |
| 文档 | `backend/README.md` 详尽 | 宣称 Spring Boot/JWT/Redis、"20+ 页面"均不实 | 文档纠偏（Q9） |

### 7.3 AI 服务层（`supabase/functions/` + `mcp/` + `api/`）

| 维度 | 现状 | 主要问题 | 改进建议 |
|---|---|---|---|
| Edge Functions | 17 个函数；13 个真实调用上游 | 4 个函数无 JWT；`setup-demo` 零鉴权+硬编码口令；全局 CORS `*` | 统一鉴权中间件（R3） |
| 密钥管理 | 依赖 `Deno.env.get` | **5 个 `key.txt` 入库 + 4 处代码兜底读取**；文档谎称已清除 | 应急轮换 + 清理（R1） |
| AI 真实度 | `ai-assistant` 工程质量最高（限流/缓存/台账/熔断） | 8 个 action 返回伪 AI 结果且前端无法区分；`phase3` 用随机数冒充抓取 | 显式标记降级或改 501（R5） |
| 支付 | `create-payment-order` 官方 SDK 真实下单 ✅ | **webhook 未验签**；异常静默吞掉恒返 200 | 补验签（R2） |
| 异步任务 | `ai-assistant` 有 setTimeout 轮询 | 可能被运行时回收；超时不退款；`seedance/kling/sora` 无状态落库 | 任务可靠化（R6） |
| MCP 生态 | 主服务 7 工具真实调用 ✅；备份服务 3 工具 | **零鉴权 + 0.0.0.0 + 关闭 DNS Rebinding + 公网暴露** | MCP 加固（R4） |
| `api/` 适配层 | `mcp.py`/`dxkp.py` 为 Vercel ASGI 入口 | `dxkp.py` 无鉴权密钥代理；依赖清单与 `mcp/` 不一致 | 鉴权 + 依赖统一（R4） |
| 可维护性 | — | CORS/JWT/错误处理 17 份重复实现；无共享模块 | 抽 `_shared/**`（R7） |
| 可观测性 | 有 `error_logs`/`model_calls` 台账 ✅ | 无结构化日志规范、无告警、无 trace 串联 | 可观测性补强（R8） |
| 契约与文档 | README/docs 详尽 | **函数数/迁移数/action 表/模型标注全部不符** | 契约真相化（R9）+ 文档纠偏（R10） |

---

## 八、附录：本次分析已核实的关键数据

| 核实项 | 命令 / 方式 | 结果 |
|---|---|---|
| 前端页面数 | `ls src/pages/*.tsx \| wc -l` | **42** |
| 前端代码行数 | `find src -name "*.tsx" -o -name "*.ts" \| xargs wc -l` | **46,278** |
| 厂商中台代码行数 | `find backend/src -name "*.ts" -o -name "*.vue" \| xargs wc -l` | **9,217** |
| Edge Functions 数量 | `ls -d supabase/functions/*/ \| wc -l` | **17**（README 称 16） |
| 数据库迁移数量 | `ls supabase/migrations/*.sql \| wc -l` | **23**（README 称 21） |
| 密钥是否入库 | `git ls-files "supabase/functions/*/key.txt"` | **5 个命中**（234B JWT ×4、66B Key ×1） |
| 支付回调验签 | grep `Wechatpay-Signature` in webhook | **仅出现在 CORS 头，无校验代码** |
| RPC 权限收紧 | grep `GRANT\|REVOKE` in migrations | **零命中** → PUBLIC 默认可执行 `SECURITY DEFINER` 函数 |
| 前端硬编码密钥 | grep `sk-[a-zA-Z0-9]{20,}` in src | **2 处命中**（`sse.ts:237`、`services/audio/index.ts:9`） |
| 测试文件 | `find ... -name "*.test.*" -o -name "*.spec.*"` | **零命中** |
| 真实后端代码 | Glob `**/*.java` / `pom.xml` | **零命中** |

---

> **报告说明**：本报告基于静态代码走查与命令行实测，未运行项目、未修改任何业务代码。所有结论均标注了可复核的文件路径与行号。建议在启动 P0 阶段整改前，先行确认密钥轮换的排期与责任人。
