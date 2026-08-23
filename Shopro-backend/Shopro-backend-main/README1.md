# 🛒 Shopro AI - 厂商运营后台管理系统 (Shopro-backend)

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5.13-4FC08D?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7.2-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.0.7-646CFF?logo=vite&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element_Plus-2.9.1-409EFF?logo=elementplus&logoColor=white" />
  <img alt="Pinia" src="https://img.shields.io/badge/Pinia-2.3.0-FR7800?logo=pinia&logoColor=white" />
  <img alt="MSW" src="https://img.shields.io/badge/MSW-2.7.0-FF6A00?logo=mockserviceworker&logoColor=white" />
  <img alt="ECharts" src="https://img.shields.io/badge/ECharts-5.6.0-AA2116?logo=apacheecharts&logoColor=white" />
  <img alt="Spring Boot" src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?logo=springboot&logoColor=white" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/AI-DeepSeek_v4_Flash-blue" />
  <img alt="CosyVoice" src="https://img.shields.io/badge/Audio-CosyVoice2-orange" />
  <img alt="Seedance" src="https://img.shields.io/badge/Video-Seedance_2.0-violet" />
</p>

---

## 📋 项目简介

**Shopro AI 厂商运营后台 (Shopro-backend)** 是专为 **Shopro AI 抖音/TikTok 电商 AIGC 带货视频平台** 设计的高性能、企业级运营管理与管控中心。系统聚焦于多租户 SaaS 平台的商业化闭环运维、算力调度监控、风控合规审计以及客户全生命周期管理。

架构设计上，本项目采用了**前端高保真敏捷原型 + MSW 原生零成本 Mock 演示 + 无缝切换 Spring Boot REST API 架构**。前端基于 Vue 3 + TypeScript + Vite + Element Plus 构建，预留了严格的统一 API 数据响应结构与 RBAC 权限边界。运营人员不仅可以通过直观的数据看板洞察全局履约与充值交易，还能实时监控 AI 视频/脚本生成任务状态、管控算力积分扣减与退款、处置内容敏感词风险以及管理工单与套餐版本。

### ⚡ 核心价值与业务定位
* 📊 **全链路运维监控**：实时展示算力消耗、AI 履约成功率、订单净支付金额与大模型服务健康度。
* 🤖 **AI 算力与工作流管控**：支持生成任务下探至 Attempt 尝试级记录，提供失败任务人工退款、重试与阻断取消机制。
* 🛡️ **智能内容风控治理**：集成敏感词与风险事件审计，提供上下文证据链与申诉处置闭环。
* 💳 **算力积分与灵活计费**：支持用户算力流水追溯、人工扣减/赠送调账，以及算力套餐版本快照创建。
* 🔌 **零成本演示与后端无缝接轨**：自带 MSW（Mock Service Worker）本地状态持久化与一键还原，同时原生兼容 Spring Boot REST API 协议。

---

## 🛠️ 技术栈

### 🌐 前端技术栈

| 分类 | 技术 / 依赖 | 版本 | 业务职责与用途 |
|---|---|---|---|
| 核心框架 | Vue | 3.5.13 | 响应式 UI 组件化架构，Vue 3 Setup 语法糖 |
| 开发语言 | TypeScript | 5.7.2 | 全链路强类型定义、领域模型与接口契约约束 |
| 构建工具 | Vite | 6.0.7 | 秒级热重载（HMR）、分包打包优化（Manual Chunks） |
| 路由管理 | Vue Router | 4.5.0 | 动态路由挂载、页面懒加载与 RBAC 权限路由守卫 |
| 状态管理 | Pinia | 2.3.0 | 全局管理员认证会话（Auth Store）与权限集合 |
| UI 组件库 | Element Plus | 2.9.1 | 企业级后台表格、表单、弹窗与仪表盘卡片 |
| 图表可视化 | ECharts | 5.6.0 | 履约趋势折线图、算力与任务状态占比环形图 |
| HTTP 客户端 | Axios | 1.7.9 | 统一封装拦截器、JWT 注入与全局错误提示 |
| API 模拟 | MSW (Mock Service Worker) | 2.7.0 | Service Worker 拦截网络请求，浏览器端持久化 Mock |
| 时间处理 | Day.js | 1.11.13 | 格式化时间戳、相对时间计算与日期筛选范围 |
| 包管理器 | pnpm | 10.34.5 | 高效依赖锁盘、软链接存储与快速构建 |

### ⚙️ 后端与服务架构（Spring Boot 生产标准）

| 分类 | 技术 / 组件 | 规范与说明 | 项目中的作用 |
|---|---|---|---|
| 服务框架 | Spring Boot | 3.x REST Server | 提供 `/api/admin/**` 标准 RESTful API 接口 |
| 安全认证 | Spring Security + JWT | Stateless Session | 管理员 JWT 登录校验、Token 刷新与 RBAC 权限拦截 |
| 数据隔离 | PostgreSQL / MySQL | Multi-Tenant RLS | 持久化用户、积分、订单、风控与 AI 任务流水 |
| 缓存与锁 | Redis | Dynamic Redisson | 算力扣减悲观分布式锁、Token 黑名单与数据缓存 |
| 数据响应契约 | `ApiResponse<T>` | `{ code, message, data, traceId }` | 统一前端与后端错误处理及链路追踪 |
| 分页响应契约 | `PageResult<T>` | `{ items, total, page, pageSize }` | 统一所有列表接口的分页传输格式 |

### 🤖 AI 服务与多模态模型调度

| 模块 / 能力 | 对接底层 AI 模型 | 运营后台控制粒度 | 业务用途与治理 |
|---|---|---|---|
| **文本大模型** | DeepSeek-V4-Flash / DeepSeek R1 | 营销脚本生成吞吐量、失败重试率 | 监控文案 CoT 脚本生成、多语言翻译任务 |
| **语音大模型** | CosyVoice2 / TeleSpeech ASR | 声音克隆与音视频合成耗时 | 监控配音合成成功率、情绪极值映射 |
| **视频生成** | Seedance 2.0 / Sora / Kling | 视频渲染算力消耗（GPU Tokens） | 监控分镜混剪与物理级短视频生成任务 |
| **图像/封面** | Flux 1.1 Pro | 封面候选图生成频次 | 监控 AI 带货短视频封面设计吞吐 |
| **向量检索** | OpenAI Text-Embedding | RAG 知识库命中率与向量耗时 | 监控电商爆款话术 Few-shot 向量检索效率 |

---

## 📁 目录结构

```text
Shopro-backend/
└── Shopro-backend-main/
    ├── .env.example              # 环境变量配置模板 (MOCK开关/API地址)
    ├── index.html                # Vite HTML 应用单页入口
    ├── package.json              # 项目依赖、编译与运行脚本定义
    ├── pnpm-lock.yaml            # pnpm 依赖锁定文件
    ├── vite.config.ts            # Vite 构建配置与 Manual Chunks 分包策略
    ├── tsconfig.json             # TypeScript 全局配置
    ├── README.md                 # 快速上手 README
    ├── README1.md                # 厂商运营后台全量评估与设计文档
    ├── admin-architecture-spec.md# 厂商后台架构与规格说明书
    ├── 项目结构与功能模块说明.md   # 核心功能模块与接口联调约定
    ├── front-README.md           # 商家端/C端系统说明文档
    ├── public/                   # 静态资源与 mockServiceWorker.js 入口
    └── src/                      # 前端核心源码
        ├── App.vue               # Vue 根组件
        ├── main.ts               # 应用入口（全局组件挂载、MSW 动态启动）
        ├── style.css             # 全局 CSS 样式与 Element Plus 覆盖
        ├── api/                  # REST API 请求模块 (与后端 /api/admin/* 一一对应)
        │   ├── auth.ts           # 登录、登出、个人信息
        │   ├── billing.ts        # 订单、退款、积分流水、套餐版本
        │   ├── client.ts         # Axios 客户端拦截器与通用配置
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
        ├── mocks/                # MSW Mock 模拟服务层
        │   ├── browser.ts        # MSW Worker 初始化
        │   ├── handlers/         # 各领域 API 拦截 Handlers
        │   ├── domain/           # 模拟业务规则与状态校验
        │   └── seed/             # 初始演示数据集与持久化 Reset 逻辑
        ├── router/               # 路由声明与 RBAC 权限拦截守卫
        ├── stores/               # Pinia 状态管理 (auth.ts 会话与权限)
        ├── types/                # TypeScript 接口与领域模型类型定义
        └── views/                # 业务页面组件
            ├── DashboardView.vue # 运营总览工作台
            ├── LoginView.vue     # 管理员登录页
            ├── SystemView.vue    # 系统运营与治理页
            ├── UsersView.vue     # 用户管理页
            ├── ai-operations/    # AI 任务运营与 Workflow 详情
            ├── billing/          # 订单、退款与算力套餐管理
            ├── customers/        # 客户详情与配额管理
            └── risk/             # 内容风控事件与申诉处理
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

## ⚙️ 部署指南

### 1. 本地开发环境启动

```bash
# 1. 克隆项目并进入工程目录
cd Shopro-backend/Shopro-backend-main

# 2. 安装 pnpm 依赖（推荐 pnpm 10+）
pnpm install

# 3. 启动本地 Vite 开发服务器
pnpm dev
```

启动成功后，浏览器访问 `http://localhost:5173`。演示账号：`admin@shopro.ai`，密码可任意填写。

### 2. 环境变量配置 (`.env`)

复制 `.env.example` 并新建 `.env` 文件：

```env
# 是否启用 MSW 本地 API 模拟 (演示模式设为 true，生产对接 Spring Boot 设为 false)
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

构建完成后生成的 `dist/` 文件夹包含了已高度压缩与分包的静态 HTML/CSS/JS 资源。

### 4. 生产环境部署方案

#### 方案 A：独立静态托管 (EdgeOne / Cloudflare Pages / Nginx)
直接将 `dist/` 上传至静态托管平台。若使用 Nginx，需配置 SPA 路由回退：

```nginx
server {
    listen 80;
    server_name admin.shopro.ai;

    location / {
        root /usr/share/nginx/html/dist;
        index index.html;
        try_files $uri $uri/ /index.html; # SPA 路由回退
    }

    # 反向代理 Spring Boot 后端接口
    location /api/admin/ {
        proxy_pass http://127.0.0.1:8080/api/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 方案 B：Spring Boot 一体化打包部署
将构建好的 `dist/` 内部所有文件复制至 Spring Boot 项目的 `src/main/resources/static/` 目录下，部署 Spring Boot Jar 包即可同时提供 API 服务与运营后台页面。

---

## 📦 API 接口（表格总结）

所有 API 前缀统一为 `/api/admin/**`，请求与响应严格遵循以下 JSON 结构：
* **标准响应**：`{ "code": 200, "message": "success", "data": { ... }, "traceId": "tr_12345" }`
* **分页响应**：`{ "code": 200, "message": "success", "data": { "items": [...], "total": 100, "page": 1, "pageSize": 10 } }`

| 业务模块 | HTTP 方法 | Endpoint 路径 | 所需权限 | 功能描述 |
|---|---|---|---|---|
| **认证授权** | `POST` | `/api/admin/auth/login` | 无 | 管理员登录，返回 JWT Token 与用户信息 |
| | `POST` | `/api/admin/auth/logout` | 无 | 退出登录并作废 Token |
| | `GET` | `/api/admin/auth/me` | 无 | 获取当前登录管理员的详细信息与权限列表 |
| **运营总览** | `GET` | `/api/admin/dashboard/overview` | `dashboard:view` | 获取看板核心指标与环比数据 |
| | `GET` | `/api/admin/dashboard/fulfillment-trend` | `dashboard:view` | 获取履约成功率与趋势折线图数据 |
| | `GET` | `/api/admin/dashboard/task-distribution` | `dashboard:view` | 获取任务类型与状态分布图数据 |
| **客户与用户**| `GET` | `/api/admin/customers/users` | `customers:view` | 分页查询商家用户列表及算力使用情况 |
| | `GET` | `/api/admin/customers/users/:id` | `customers:view` | 获取单个用户详情、配额与能力配置 |
| | `PUT` | `/api/admin/customers/users/:id/config` | `customers:view` | 更新用户的并发数、能力开关与配额限制 |
| **算力积分** | `GET` | `/api/admin/credits/transactions` | `customers:view` | 查询用户算力积分流水变动明细 |
| | `POST` | `/api/admin/credits/adjust` | `customers:view` | 人工加/扣算力积分，记录调账日志 |
| **客服工单** | `GET` | `/api/admin/tickets` | `customers:view` | 分页查询客服工单列表 |
| | `GET` | `/api/admin/tickets/:id` | `customers:view` | 查询工单详情与对话/处理记录 |
| | `POST` | `/api/admin/tickets` | `customers:view` | 创建新工单 |
| | `PUT` | `/api/admin/tickets/:id` | `customers:view` | 更新工单状态与回复处理意见 |
| **AI 任务中心**| `GET` | `/api/admin/ai/workflows` | `workflow:view` | 分页查询 AI 脚本/语音/视频工作流任务 |
| | `GET` | `/api/admin/ai/workflows/:id` | `workflow:view` | 获取指定工作流详情与 Attempt 尝试日志 |
| | `POST` | `/api/admin/ai/workflows/:id/retry` | `workflow:view` | 重新发起失败的 AI 生成任务 |
| | `POST` | `/api/admin/ai/workflows/:id/cancel` | `workflow:view` | 强制终止执行中的 AI 生成任务 |
| | `POST` | `/api/admin/ai/workflows/:id/refund` | `workflow:view` | 对因故障失败的任务执行算力人工退款 |
| **风险与风控**| `GET` | `/api/admin/risk/events` | `risk:view` | 分页查询敏感词与内容风险事件 |
| | `GET` | `/api/admin/risk/events/:id` | `risk:view` | 查看风险事件详情、原始证据链与历史处置 |
| | `POST` | `/api/admin/risk/events/:id/decide` | `risk:view` | 提交风险处置决定（阻断/告警/忽略） |
| | `POST` | `/api/admin/risk/events/:id/appeal` | `risk:view` | 处理商家对风控处置的申诉 |
| **订单与计费**| `GET` | `/api/admin/billing/orders` | `billing:view` | 分页查询充值与套餐购买订单 |
| | `GET` | `/api/admin/billing/orders/:id` | `billing:view` | 查看订单详情与支付/权益状态 |
| | `POST` | `/api/admin/billing/orders/:id/reissue`| `billing:view` | 对异常订单手动执行“权益一键补发” |
| | `POST` | `/api/admin/billing/refunds` | `billing:view` | 发起订单退款申请 |
| | `POST` | `/api/admin/billing/refunds/:id/approve`|`billing:view`| 审批通过退款申请并扣减对应权益 |
| | `POST` | `/api/admin/billing/refunds/:id/reject`| `billing:view` | 驳回退款申请 |
| | `POST` | `/api/admin/billing/packages/versions`|`billing:view` | 创建算力套餐新版本与权益快照 |
| **系统与运维**| `GET` | `/api/admin/system/health` | `system:view` | 查询系统及下游 AI 服务健康状态 |
| | `GET` | `/api/admin/system/admins` | `system:view` | 获取管理员列表与角色分配 |
| | `GET` | `/api/admin/system/roles` | `system:view` | 获取系统 RBAC 角色与权限字典 |
| | `GET` | `/api/admin/system/audit-logs` | `system:view` | 分页查询敏感操作审计日志 |
| | `POST` | `/api/admin/system/demo-data/reset` | `system:view` | （Demo模式）一键恢复 MSW 演示种子数据 |

---

## 💡 总结与展望

### 🏆 项目整体评估与亮点
1. **高可用敏捷架构**：前端不仅展现了完备的 20+ 企业级管理页面，更通过 MSW 实现了包含数据持久化、规则校验与状态机流转的零成本演示环境，极大降低了产品演示与集成测试门槛。
2. **严格的接口边界设计**：将 API 隔离在 `src/api` 层，定义了高度规范的 `ApiResponse` 与 `PageResult` 数据结构。生产环境无需修改一行 Vue 页面代码，仅需调整 `VITE_USE_MOCK=false` 即可秒级无缝接入 Spring Boot 后端。
3. **深入 AI 业务肌理**：不同于传统的 CRUD 后台，系统专门针对电商 AIGC 特性设计了 **Attempt 尝试日志下探**、**失败算力退款**、**风控证据链复核** 与 **算力套餐快照** 模块，真正切中电商商家与 SaaS 厂商的运维痛点。

### 🚀 未来展望与演进规划
* 🔐 **集成 Spring Security & OAuth2**：生产环境全面接入 Spring Boot REST API，引入 JWT 动态双 Token 刷盘与无感知无缝续期。
* 📈 **AI 模型智能路由与降级**：后台新增 AI 服务商熔断器配置界面，实现当 Seedance 2.0 或 DeepSeek 接口超时率高于 5% 时，自动自动平滑切至 Kling 或 文心一言 备用节点。
* 📊 **大数据高级分析看板**：结合 ClickHouse 或 BigQuery 对 AI 视频的高转率（CTR/CVR）数据进行多维交叉分析，反哺 AIGC 话术模板库优化。
