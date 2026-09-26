# Shopro AI 厂商运营后台 Demo：架构与构建规格

## 1. 项目目标

为 Shopro AI 电商 AIGC 带货视频平台构建一个厂商运营后台 Demo，用于比赛展示。

后台聚焦运营闭环，而不是复刻用户端全部 42 个页面。必须完整展示：

- 平台经营数据总览
- 用户与积分管理
- AI 视频、脚本、配音生成任务管理
- 作品与内容审核
- 订单与套餐管理
- 模拟操作可实时反馈，并能恢复演示数据

本阶段不接真实数据库、支付、AI 服务或 Spring Boot；使用 Mock API，但必须保留未来接入 Spring Boot 的接口边界。

## 2. 技术栈

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Element Plus
- Axios
- ECharts
- MSW（Mock Service Worker）
- Day.js
- pnpm
- ESLint 或 Biome

禁止使用 Vue 2、Nuxt、大型后台模板、真实后端服务和数据库。

## 3. 架构原则

```text
Vue 页面 / 组件
        ↓
Pinia（仅保存本地 UI 与登录状态）
        ↓
src/api 中的 API 模块
        ↓
Axios Client
        ↓
/api/admin/*
        ├── Demo：MSW 拦截并返回 Mock 数据
        └── 未来：Spring Boot REST API
```

要求：

- 页面和组件中不得直接写 Mock 数据。
- 所有数据必须从 `src/api` 请求。
- Mock 只存在于 `src/mocks`。
- 使用环境变量 `VITE_USE_MOCK=true` 控制 Mock。
- 使用环境变量 `VITE_API_BASE_URL=/api` 控制后端地址。
- 所有接口使用统一响应体：

```ts
interface ApiResponse<T> {
  code: number
  message: string
  data: T
  traceId?: string
}

interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

## 4. 推荐目录结构

```text
src/
├── api/
│   ├── client.ts
│   ├── dashboard.ts
│   ├── users.ts
│   ├── jobs.ts
│   ├── contents.ts
│   ├── orders.ts
│   └── system.ts
├── components/
│   ├── common/
│   ├── charts/
│   └── business/
├── layouts/
│   └── AdminLayout.vue
├── mocks/
│   ├── browser.ts
│   ├── handlers.ts
│   ├── data/
│   └── seed.ts
├── router/
│   └── index.ts
├── stores/
│   ├── auth.ts
│   └── app.ts
├── types/
│   ├── api.ts
│   ├── user.ts
│   ├── job.ts
│   ├── content.ts
│   └── order.ts
├── utils/
├── views/
│   ├── LoginView.vue
│   ├── DashboardView.vue
│   ├── SystemView.vue
│   ├── customers/           # 客户域：UserListView / UserDetailView / CreditLedgerView / TicketListView / TicketDetailView
│   ├── ai-operations/       # AI 履约域：WorkflowListView / WorkflowDetailView
│   ├── risk/                # 风险域：RiskEventListView / RiskEventDetailView
│   └── billing/             # 交易域：OrderListView / OrderDetailView
├── App.vue
└── main.ts
```

## 5. 页面与路由

| 路由 | 页面 | 重点功能 |
|---|---|---|
| `/login` | 演示登录 | 选择管理员身份登录（写入 x-shopro-admin-id 主体） |
| `/dashboard` | 运营总览 | 核心指标、趋势图、任务状态、待处理事项 |
| `/users` | 客户列表 | 搜索、筛选、分页，进入客户全景 |
| `/customers/users/:id` | 客户全景 | 积分/订单/AI/风险/工单聚合、积分调整、能力限制、建单 |
| `/customers/users/:id/credits` | 积分流水 | 不可变账本、冲正（REVERSAL） |
| `/tickets` `/tickets/:id` | 工单 | 列表与处理（状态、结论、权限门控） |
| `/ai-operations` `/ai-operations/workflows/:id` | AI 工作流 | 子任务/执行尝试/供应商成本/积分扣退、重试、取消、人工补偿 |
| `/risk/events` `/risk/events/:id` | 内容风险 | 风险事件处置（申诉、封禁） |
| `/billing/orders` `/billing/orders/:id` | 交易与计费 | 订单、退款审批、套餐版本、后端聚合 KPI |
| `/system` | 系统治理 | 服务健康、审计、审批队列（通过/驳回）、角色权限 |

旧壳路由 `/jobs`、`/contents`、`/orders` 保留为重定向（分别指向 `/ai-operations`、`/risk/events`、`/billing/orders`）。
左侧菜单按域分组：运营总览、客户与工单、AI 履约、内容风险、交易计费、系统治理。

## 6. Demo 数据设计

使用固定随机种子生成可重复的演示数据，并持久化到 localStorage。

- 用户：120 条，包含普通用户、企业用户、已禁用用户。
- AI 任务：90 条，状态包含排队中、生成中、成功、失败、已取消。
- 内容：50 条，状态包含待审核、已通过、已驳回、已下架。
- 订单：80 条，状态包含已支付、待支付、退款中、已退款。
- 操作日志：100 条。
- 至少保留 1 条失败的视频生成任务，用于现场演示“查看原因 → 重试 → 成功”。

提供“恢复演示数据”按钮，清空本地 Demo 修改并重新加载初始数据。

## 7. 关键接口

```text
POST  /api/admin/auth/login
GET   /api/admin/auth/me            # 预留：当前登录管理员（fail-close，无主体 401）
POST  /api/admin/auth/logout        # 预留：服务端会话失效（Demo 仅前端清理）
GET   /api/admin/dashboard
GET   /api/admin/dashboard/todos    # 预留：待办聚合（当前由前端自行读取）

# 客户域
GET   /api/admin/customers/users
GET   /api/admin/customers/users/:id
GET   /api/admin/customers/users/:id/credit-ledger
POST  /api/admin/customers/users/:id/credit-adjustments   # amount>=1000 进 PENDING 审批
POST  /api/admin/customers/credit-ledger/:entryId/reversal # 冲正（REVERSAL）
PATCH /api/admin/customers/users/:id/capabilities
GET   /api/admin/customers/organizations      # 预留
GET   /api/admin/customers/organizations/:id  # 预留

# 工单
GET   /api/admin/tickets
POST  /api/admin/tickets
GET   /api/admin/tickets/:id
PATCH /api/admin/tickets/:id

# AI 履约
GET   /api/admin/ai/workflows
GET   /api/admin/ai/workflows/:id
GET   /api/admin/ai/jobs/:id        # 预留（详情已内嵌于 workflow/:id）
POST  /api/admin/ai/jobs/:id/retry            # 仅限 FAILED/TIMED_OUT/EXPIRED 且 retryable
POST  /api/admin/ai/jobs/:id/cancel-request   # 进入 CANCEL_REQUESTED，等待确认
POST  /api/admin/ai/jobs/:id/manual-refund
GET   /api/admin/ai/providers/health # 预留

# 风险
GET   /api/admin/risk/events
GET   /api/admin/risk/events/:id
POST  /api/admin/risk/events/:id/decisions
POST  /api/admin/risk/events/:id/appeals

# 交易与计费
GET   /api/admin/billing/orders
GET   /api/admin/billing/summary    # 后端聚合 KPI
GET   /api/admin/billing/orders/:id
GET   /api/admin/billing/refunds
POST  /api/admin/billing/refunds
POST  /api/admin/billing/refunds/:id/approve
POST  /api/admin/billing/refunds/:id/reject
POST  /api/admin/billing/orders/:id/regrant-entitlement
GET   /api/admin/billing/plans
POST  /api/admin/billing/plans
GET   /api/admin/billing/credit-ledger # 预留

# 系统治理
GET   /api/admin/system/health
GET   /api/admin/system/audit-logs
GET   /api/admin/system/approvals
POST  /api/admin/system/approvals/:id/approve   # 通过（REFUND 代理 billing）
POST  /api/admin/system/approvals/:id/reject    # 驳回（不落账）
GET   /api/admin/system/admins
GET   /api/admin/system/roles
GET   /api/admin/search              # 预留：全局搜索
POST  /api/admin/demo/reset
```

列表接口支持：`page`、`pageSize`、`keyword`、`status` 及域内专属筛选。统一响应包裹 `ApiResponse{code,message,data,traceId}`，分页 `PageResult{items,total,page,pageSize}`；数组型端点返回裸数组。

## 8. 交互要求

- 所有列表必须有加载态、空状态和分页。
- 用户禁用、积分调整、内容审核、任务取消等操作必须有二次确认。
- 成功或失败必须显示 Element Plus 消息提示。
- 失败任务点击“重试”后，状态切换为“生成中”，约 3 秒后自动变为“成功”。
- 顶栏显示当前管理员、通知入口、全屏按钮和“Demo 数据”标识。
- 页面刷新后仍保留已执行的 Demo 操作。
- 所有管理操作写入“操作日志”。

## 9. 视觉要求

- 整体为专业、清爽的信息密度型 SaaS 后台。
- 使用白色或浅灰主背景，深色侧边栏。
- 品牌强调色使用紫蓝渐变，呼应 Shopro AI 用户端。
- 不要过度使用玻璃态、渐变大卡片或装饰性动效。
- 总览页使用 KPI 卡片、折线图、柱状图、环形图和待处理任务列表。
- 桌面端优先，最低适配宽度 1024px。
- 不依赖外部图片；作品封面使用稳定的本地占位图或 CSS 渐变图。

## 10. Spring Boot 接入预留

未来真实落地时：

- Vue 前端仍独立构建为静态资源。
- Spring Boot 提供 `/api/admin/**` REST API。
- Spring Security 负责 JWT、登录和 RBAC 权限。
- 管理员角色：`SUPER_ADMIN`（全权 `*`）、`OPERATIONS`（运营）、`RISK_REVIEWER`（风险审核）、`FINANCE`（财务）。权限码以 `constants/permissions.ts` 为单一来源。
- 生产环境可采用 `admin.shopro.xxx` 托管前端，`api.shopro.xxx` 托管 Spring Boot。
- 如需单体部署，可将前端 `dist` 复制至 Spring Boot 的 `src/main/resources/static`。

切换到真实后端时，不修改页面，只将 `VITE_USE_MOCK=false` 并配置真实 `VITE_API_BASE_URL`。

## 11. 交付要求

完成后必须具备：

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- 构建产物为 `dist`。
- README 包含启动、构建、Mock 开关和静态部署说明。
- 无 TypeScript 错误。
- 无页面直接依赖 Mock 数据。
- 可直接部署到 EdgeOne Pages 或 Cloudflare Pages。
- 默认打开后可用演示账号进入，并完整走通业务演示流程。
