# 🛒 Shopro AI - 厂商运营后台管理系统 (Shopro-backend)

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5.13-4FC08D?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7.2-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.0.7-646CFF?logo=vite&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element_Plus-2.9.1-409EFF?logo=elementplus&logoColor=white" />
  <img alt="Pinia" src="https://img.shields.io/badge/Pinia-2.3.0-FR7800?logo=pinia&logoColor=white" />
  <img alt="MSW" src="https://img.shields.io/badge/MSW-2.7.0-FF6A00?logo=mockserviceworker&logoColor=white" />
  <img alt="ECharts" src="https://img.shields.io/badge/ECharts-5.6.0-AA2116?logo=apacheecharts&logoColor=white" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/AI-DeepSeek_v4_Flash-blue" />
  <img alt="CosyVoice" src="https://img.shields.io/badge/Audio-CosyVoice2-orange" />
  <img alt="Seedance" src="https://img.shields.io/badge/Video-Seedance_2.0-violet" />
</p>

---

## 📋 项目简介

**Shopro AI 厂商运营后台 (Shopro-backend)** 是专为 **Shopro AI 抖音/TikTok 电商 AIGC 带货视频平台** 设计的高性能、企业级运营管理与管控中心。系统聚焦于多租户 SaaS 平台的商业化闭环运维、算力调度监控、风控合规审计以及客户全生命周期管理。

架构设计上，本项目为 **Vue 3 + MSW 完整 Mock 仿真环境**，涵盖 **14 个企业级运营管控页面** 与 **48 个 REST 契约 Mock 接口**。系统在浏览器层通过 Service Worker 拦截统一的 `/api/admin/**` 网络请求，具备领域状态机流转、不可变流水校验、悲观锁定模拟与演示数据一键恢复能力，可直接作为高保真演示系统独立运行，也可通过配置无缝切换对接真实后端服务。

### ⚡ 核心价值与业务定位
* 📊 **全链路运维监控**：实时展示算力消耗、AI 履约成功率、订单净支付金额与大模型服务健康度。
* 🤖 **AI 算力与工作流管控**：支持生成任务下探至 Attempt 尝试级记录，提供失败任务人工退款、重试与阻断取消机制。
* 🛡️ **智能内容风控治理**：集成敏感词与风险事件审计，提供上下文证据链与申诉处置闭环。
* 💳 **算力积分与灵活计费**：支持用户算力流水追溯、人工扣减/赠送调账，以及算力套餐版本快照创建。
* 🔌 **零依赖高保真运行**：自带 MSW（Mock Service Worker）本地状态持久化与一键还原，严格遵循标准化 REST API 契约协议。

---

## 🛠️ 技术栈

### 🌐 核心技术选型

| 分类 | 技术 / 依赖 | 版本 | 业务职责与用途 |
|---|---|---|---|
| 核心框架 | Vue | 3.5.13 | 响应式 UI 组件化架构，Vue 3 Setup 语法糖 |
| 开发语言 | TypeScript | 5.7.2 | 全链路强类型定义、领域模型与接口契约约束 |
| 构建工具 | Vite | 6.0.7 | 秒级热重载（HMR）、分包打包优化（默认端口 5175） |
| 路由管理 | Vue Router | 4.5.0 | 动态路由挂载、页面懒加载与 RBAC 权限路由守卫、403 兜底 |
| 状态管理 | Pinia | 2.3.0 | 全局管理员认证会话（Auth Store）与权限集合 |
| UI 组件库 | Element Plus | 2.9.1 | 企业级后台表格、表单、弹窗与仪表盘卡片 |
| 图表可视化 | ECharts | 5.6.0 | 履约趋势折线图、算力与任务状态占比环形图 |
| HTTP 客户端 | Axios | 1.7.9 | 统一封装拦截器、JWT Authorization 注入与全局 401 广播 |
| 仿真后端 | MSW (Mock Service Worker) | 2.7.0 | Service Worker 拦截网络请求，浏览器端持久化 Mock 与状态机 |
| 时间处理 | Day.js | 1.11.13 | 格式化时间戳、相对时间计算与日期筛选范围 |
| 包管理器 | pnpm | 10.34.5 | 高效依赖锁盘、软链接存储与快速构建 |

### ⚙️ 契约与接口规范

| 分类 | 规范与说明 | 说明 |
|---|---|---|
| 接口基址 | `/api/admin/**` | 所有厂商中台管控接口统一前缀 |
| 认证机制 | Bearer Token / `x-shopro-admin-id` | 请求拦截器自动注入 Token，服务端校验主体与 RBAC 权限 |
| 401/403 机制 | 状态码语义化 | 401 广播 `shopro:unauthorized` 自动登出；403 路由拦截重定向至 `/403` 页面 |
| 数据响应契约 | `ApiResponse<T>` | `{ code, message, data, traceId }` 统一成功/失败结构 |
| 分页响应契约 | `PageResult<T>` | `{ items, total, page, pageSize }` 统一列表分页格式，限制 `pageSize <= 100` |

---

## 📁 目录结构

```text
backend/
├── index.html                # Vite HTML 应用单页入口
├── package.json              # 项目依赖、编译与运行脚本定义
├── pnpm-lock.yaml            # pnpm 依赖锁定文件
├── vite.config.ts            # Vite 构建配置（端口 5175，分包策略）
├── tsconfig.json             # TypeScript 全局配置
├── README.md                 # 厂商运营后台架构与说明文档
├── public/                   # 静态资源与 mockServiceWorker.js 入口
└── src/                      # 前端核心源码
    ├── App.vue               # Vue 根组件
    ├── main.ts               # 应用入口（全局组件挂载、会话校验、MSW 动态启动、401 监听）
    ├── style.css             # 全局 CSS 样式与 Element Plus 覆盖
    ├── api/                  # REST API 请求模块 (与后端 /api/admin/* 一一对应)
    │   ├── auth.ts           # 登录、登出、个人信息
    │   ├── billing.ts        # 订单、退款、积分流水、套餐版本
    │   ├── client.ts         # Axios 客户端拦截器与通用配置 (Bearer Token 注入)
    │   ├── credits.ts        # 用户算力积分查询与调整
    │   ├── customers.ts      # 客户/用户列表与能力配置
    │   ├── dashboard.ts      # 运营总览看板数据
    │   ├── risk.ts           # 内容风控与安全事件
    │   ├── system.ts         # 系统健康、RBAC角色、审计日志、Demo重置
    │   ├── tickets.ts        # 客服工单管理
    │   └── workflows.ts     # AI 任务中心（生成工作流、重试、退款）
    ├── components/           # Vue 业务与公共组件
    │   ├── business/         # 业务专属组件（积分调整弹窗、风险处置弹窗、时间线等）
    │   └── common/           # 基础公共组件（页面头部、状态标签、空状态、确认框）
    ├── composables/          # 组合式 API 函数 (如 usePagination 统一分页)
    ├── constants/            # 全局常量、RBAC 权限码定义与状态枚举
    ├── layouts/              # 布局组件 (AdminLayout 左侧固定导航+顶部栏)
    ├── mocks/                # MSW Mock 模拟服务层（48 个 REST 接口）
    │   ├── browser.ts        # MSW Worker 初始化
    │   ├── handlers/         # 各领域 API 拦截 Handlers（严格校验与参数容错）
    │   ├── domain/           # 模拟业务规则与状态校验
    │   └── seed/             # 初始演示数据集与持久化 Reset 逻辑
    ├── router/               # 路由声明与 RBAC 权限拦截守卫（含 403 路由）
    ├── stores/               # Pinia 状态管理 (auth.ts 会话与权限)
    ├── types/                # TypeScript 接口与领域模型类型定义
    └── views/                # 业务页面组件（14 个业务页 + 403 权限页）
        ├── DashboardView.vue # 运营总览工作台
        ├── LoginView.vue     # 管理员登录页
        ├── ForbiddenView.vue # 403 无权访问拦截页
        ├── SystemView.vue    # 系统运营与治理页（健康/审计/审批队列/角色）
        ├── ai-operations/    # AI 任务运营：WorkflowListView / WorkflowDetailView
        ├── billing/          # OrderListView / OrderDetailView（订单、退款、套餐、后端聚合 KPI）
        ├── customers/        # UserListView / UserDetailView / CreditLedgerView / TicketListView / TicketDetailView
        └── risk/             # RiskEventListView / RiskEventDetailView（内容风控与处置）
```

---

## ⚡ 核心功能模块和工作流程

```text
                               ┌────────────────────────┐
                               │  管理员登录 (JWT鉴权)  │
                               └───────────┬────────────┘
                                           │
                               ┌───────────▼────────────┐
                               │   运营总览 Dashboard   │
                               └─────┬──────────────┬───┘
                                     │              │
        ┌────────────────────────────┴─┐          ┌─┴────────────────────────────┐
        │     AI 任务与算力管控中心    │          │    客户、算力积分与交易治理   │
        └──────────────┬───────────────┘          └──────────────┬───────────────┘
                       │                                         │
 ┌─────────────────────┼─────────────────────┐     ┌─────────────┼─────────────┐
 │                     │                     │     │             │             │
▼                     ▼                     ▼     ▼             ▼             ▼
AI 工作流监控        尝试记录(Attempt)     失败人工退款  客户能力配置  算力人工调账  退款审批/重发
(Seedance/DeepSeek)  日志与耗时下探        算力实时补回  与用量限制    与流水审计    订单权益快照
```

### 1. 📊 运营总览工作台 (Dashboard Workflow)
* **核心指标展示**：实时汇总展示平台的 AI 履约成功率、净支付金额、风险待办数及服务影响指数，支持同比/环比分析。
* **趋势与分布可视化**：结合 ECharts 动态渲染履约趋势折线图与算力/任务状态分布环形图。
* **快捷处置卡片**：自动提取高优先级的风险待办与失败 AI 任务，点击直达对应页面并附带筛选条件。

### 2. 👥 客户与算力积分管理 (Customers & Credits Workflow)
* **客户全景视窗**：查看商家用户的基础信息、组织关系、已绑定能力及累计消耗算力。
* **算力积分调账**：运营人员可发起算力人工加减调账，必须填写变更原因，所有调账实时记录到审计日志中。
* **配额与能力管控**：动态配置用户的并发生成限制、高清视频导出权限与专属数字人模型配额。

### 3. 🤖 AI 任务运营中心 (AI Operations Workflow)
* **工作流监控**：追踪从脚本生成、配音合成到视频渲染的完整 AI 工作流节点状态（进行中、已完成、失败、人工干预）。
* **Attempt 记录追踪**：下探查看单次任务的多次 retry 细节、第三方模型接口返回的错误码与耗时。
* **异常处置操作**：支持强行终止卡死任务、一键重新发起失败任务，以及对因系统故障失败的任务执行“算力人工退款”。

### 4. 🛡️ 风险与内容治理 (Risk Governance Workflow)
* **敏感词与违规事件**：捕获 AI 生成文本与视频封面中的涉黄、涉政、侵权或违禁词风险事件。
* **证据链展示**：提供原始提示词、AI 生成上下文与触发规则命中的特征片段证据。
* **处置与申诉**：运营人员可做“阻断、告警或忽略”处置，支持商家申诉的二次复核与历史追溯。

### 5. 💳 订单与套餐管理 (Billing & Package Workflow)
* **订单流水与补发**：查询充值与套餐购买订单，对支付成功但权益未到账的订单执行“权益一键补发”。
* **退款审批流**：涵盖提交退款申请 ➔ 运营主管审批/驳回 ➔ 自动扣减对应算力积分的完整生命周期。
* **套餐版本快照**：支持配置不同阶梯的算力套餐，保存历史快照以保证旧用户的权益不被挤占。

### 6. ⚙️ 系统运营与数据重置 (System & Governance Workflow)
* **服务健康度**：监控接入的 DeepSeek、CosyVoice、Seedance 及 Supabase 等下游服务的 API 响应延迟与可用性。
* **RBAC 权限管理**：配置管理员账号与角色权限（如 `dashboard:view`, `workflow:view`, `risk:view`, `billing:view`）。
* **演示数据一键恢复**：在 Demo 模式下，支持随时恢复 MSW 默认种子数据，极大提升演示体验。

---

## ⚙️ 本地运行指南

### 1. 本地开发环境启动

```bash
# 1. 进入工程目录
cd backend

# 2. 安装依赖（推荐 pnpm 10+）
pnpm install

# 3. 启动本地 Vite 开发服务器（端口：5175）
pnpm dev
```

启动成功后，浏览器访问 `http://localhost:5175`。
* **演示账号**：`admin@shopro.ai`，密码可任意填写（默认具备超级管理员全量权限）。
* **受限测试账号**：可在登录页切换或调试不同权限角色的展示与 403 拦截。

### 2. 环境变量配置 (`.env`)

```env
# 是否启用 MSW 本地 API 模拟 (演示模式设为 true，对接真实 API 设为 false)
VITE_USE_MOCK=true

# 后端 REST API 基础路径
VITE_API_BASE_URL=/api

# 运行模式: demo (演示模式) / production (生产模式)
VITE_APP_MODE=demo
```

### 3. 构建生产产物

```bash
# 执行类型检查与 Vite 生产编译
pnpm build

# 本地预览编译后的 dist/ 产物
pnpm preview
```

构建完成后生成的 `dist/` 文件夹包含了已分包优化的静态 HTML/CSS/JS 资源。

---

## 📦 API 接口清单 (48 个 REST 契约端点)

所有 API 前缀统一为 `/api/admin/**`，请求与响应严格遵循标准 JSON 结构：
* **标准响应**：`{ "code": 0, "message": "success", "data": { ... }, "traceId": "..." }`
* **分页响应**：`{ "code": 0, "message": "success", "data": { "items": [...], "total": 100, "page": 1, "pageSize": 10 } }`
* **错误响应**：`{ "code": "FORBIDDEN", "message": "当前角色没有执行此操作的权限", "data": null, "traceId": "..." }`

| 业务模块 | HTTP 方法 | Endpoint 路径 | 所需权限 | 功能描述 |
|---|---|---|---|---|
| **认证授权** | `POST` | `/api/admin/auth/login` | 无 | 管理员登录，返回管理员主体与权限 |
| | `GET` | `/api/admin/auth/me` | 登录主体 | 验证当前管理员 Token 与会话有效性 |
| | `POST` | `/api/admin/auth/logout` | 无 | 退出登录 |
| **运营总览** | `GET` | `/api/admin/dashboard` | `dashboard:view` | 看板核心指标、趋势、任务分布、待办 |
| | `GET` | `/api/admin/dashboard/todos` | `dashboard:view` | 待办事项聚合查询 |
| **客户与用户**| `GET` | `/api/admin/customers/users` | `customers:view` | 分页查询商家用户列表及算力使用情况 |
| | `GET` | `/api/admin/customers/users/:id` | `customers:view` | 获取单个用户详情、配额与能力配置 |
| | `PATCH` | `/api/admin/customers/users/:id/capabilities` | `customers:operate` | 更新用户能力开关与额度限制 |
| | `GET` | `/api/admin/customers/users/:id/credit-ledger` | `customers:view` | 分页查询用户不可变积分流水 |
| | `POST` | `/api/admin/customers/users/:id/credit-adjustments` | `customers:operate` | 人工加/扣积分（amount>=1000 进待审批队列） |
| | `POST` | `/api/admin/customers/credit-ledger/:entryId/reversal` | `customers:operate` | 冲正：生成反向 REVERSAL 流水 |
| | `GET` | `/api/admin/customers/organizations` | `customers:view` | 组织机构列表 |
| **客服工单** | `GET` | `/api/admin/tickets` | `customers:view` | 分页查询客服工单列表 |
| | `GET` | `/api/admin/tickets/:id` | `customers:view` | 查询工单详情 |
| | `POST` | `/api/admin/tickets` | `customers:operate` | 创建新工单 |
| | `PATCH` | `/api/admin/tickets/:id` | `customers:operate` | 更新工单状态与处理结论 |
| **AI 任务中心**| `GET` | `/api/admin/ai/workflows` | `workflow:view` | 分页查询 AI 工作流任务 |
| | `GET` | `/api/admin/ai/workflows/:id` | `workflow:view` | 工作流详情（含子任务/尝试/积分/审计） |
| | `GET` | `/api/admin/ai/jobs/:id` | `workflow:view` | 任务详情 |
| | `POST` | `/api/admin/ai/jobs/:id/retry` | `workflow:operate` | 重试失败任务（需 retryable 标识） |
| | `POST` | `/api/admin/ai/jobs/:id/cancel-request` | `workflow:operate` | 请求取消进行中的任务 |
| | `POST` | `/api/admin/ai/jobs/:id/manual-refund` | `workflow:operate` | 对最终失败任务人工补偿积分 |
| | `GET` | `/api/admin/ai/providers/health` | `workflow:view` | AI 模型供应商可用性 |
| **风险与风控**| `GET` | `/api/admin/risk/events` | `risk:view` | 分页查询内容风险事件 |
| | `GET` | `/api/admin/risk/events/:id` | `risk:view` | 风险事件详情与处置历史 |
| | `POST` | `/api/admin/risk/events/:id/decisions` | `risk:decide` | 提交风险处置决定（阻断/告警/忽略） |
| | `POST` | `/api/admin/risk/events/:id/appeals` | `risk:decide` | 处理商家对风控处置的申诉 |
| **订单与计费**| `GET` | `/api/admin/billing/orders` | `billing:view` | 分页查询充值与套餐订单 |
| | `GET` | `/api/admin/billing/summary` | `billing:view` | 订单 KPI 后端聚合（同筛选口径） |
| | `GET` | `/api/admin/billing/orders/:id` | `billing:view` | 订单详情与支付/权益状态 |
| | `POST` | `/api/admin/billing/orders/:id/regrant-entitlement` | `billing:entitlement:grant` | 对异常订单手动权益补发 |
| | `GET` | `/api/admin/billing/refunds` | `billing:view` | 退款申请列表 |
| | `POST` | `/api/admin/billing/refunds` | `billing:refund:create` | 发起退款申请 |
| | `POST` | `/api/admin/billing/refunds/:id/approve` | `billing:refund:approve` | 审批通过并调度执行 |
| | `POST` | `/api/admin/billing/refunds/:id/reject` | `billing:refund:approve` | 驳回退款申请 |
| | `GET` | `/api/admin/billing/plans` | `billing:view` | 套餐版本列表 |
| | `POST` | `/api/admin/billing/plans` | `billing:plan:manage` | 创建套餐新版本与权益快照 |
| | `GET` | `/api/admin/billing/credit-ledger` | `billing:view` | 全量积分流水聚合 |
| **系统与运维**| `GET` | `/api/admin/system/health` | `system:view` | 系统及下游 AI 服务健康状态 |
| | `GET` | `/api/admin/system/audit-logs` | `system:view` | 分页查询敏感操作审计日志 |
| | `GET` | `/api/admin/system/approvals` | `system:approvals:view` | 审批队列（积分调整 + 退款） |
| | `POST` | `/api/admin/system/approvals/:id/approve` | `system:approvals:decide` | 审批通过 |
| | `POST` | `/api/admin/system/approvals/:id/reject` | `system:approvals:decide` | 审批驳回 |
| | `GET` | `/api/admin/system/admins` | `system:view` | 管理员列表与角色分配 |
| | `GET` | `/api/admin/system/roles` | `system:view` | 系统 RBAC 角色与权限字典 |
| | `GET` | `/api/admin/search` | `search:use` | 全局快捷检索 |
| | `POST` | `/api/admin/demo/reset` | `system:demo:reset` | （Demo）一键恢复 MSW 演示种子数据 |
