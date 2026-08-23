# 🛒 Shopro AI - 抖音/TikTok 电商 AIGC 带货视频系统 (双端全栈架构)

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5.13-4FC08D?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7.2-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.0.7-646CFF?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element_Plus-2.9.1-409EFF?logo=elementplus&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2.103.1-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Deno" src="https://img.shields.io/badge/Edge_Functions-Deno-000000?logo=deno&logoColor=white" />
  <img alt="MSW" src="https://img.shields.io/badge/MSW-2.7.0-FF6A00?logo=mockserviceworker&logoColor=white" />
  <img alt="Spring Boot" src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?logo=springboot&logoColor=white" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/AI-DeepSeek_v4_Flash-blue" />
  <img alt="CosyVoice" src="https://img.shields.io/badge/Audio-CosyVoice2_TeleSpeech-orange" />
  <img alt="Seedance" src="https://img.shields.io/badge/Video-Seedance_2.0-violet" />
</p>

---

## 💎 项目简介

<img width="1884" height="1212" alt="image" src="https://github.com/user-attachments/assets/e8b5767a-6113-4193-af0e-954e29b68f32" />
<img width="1280" height="705" alt="image" src="https://github.com/user-attachments/assets/8a2b2a47-b8a1-4b46-9a7a-efb9c1f16564" />
<img width="1280" height="679" alt="image" src="https://github.com/user-attachments/assets/cf2db694-ed54-4606-b7ca-6ff22854d3fb" />

**Shopro AI 电商 AIGC 带货视频系统** 是一款面向国内外电商商家（如抖音、TikTok、快手、小红书、Amazon、Shopee 等）的商业化双端 SaaS 平台。系统通过深度融合先进的多模态大模型与全链路智能工作流，解决商家在短视频营销中面临的“文案撰写难、数字人/外籍演员贵、剪辑成本高、多语言本地化差、跨平台发布繁琐”等核心痛点。

系统构建了**前端商家端平台 + 厂商运营中台双端解耦**的现代化工程架构：
1. **商家创作端 (C/B 端)**：采用 React 18 + TypeScript + Vite + Tailwind CSS + Supabase BaaS + 16+ 个 Deno Edge Functions 边缘微服务，提供一站式「URL 卖点提取 ➔ 流式脚本生成 ➔ 情感数字人映射 ➔ 多轨 Canvas 剪辑 ➔ 积分扣减审计 ➔ 多平台定时发布与数据回流」。
2. **厂商运营后台 (Shopro-backend)**：采用 Vue 3 + TypeScript + Vite + Element Plus + Pinia + ECharts + MSW / Spring Boot REST API，提供企业级「运营总览看板 ➔ 客户与算力调账 ➔ AI 任务 Attempt 追踪与故障退款 ➔ 敏感词风控证据链复核 ➔ 订单充值补发与套餐版本快照 ➔ 恢复 Demo 演示数据」。

### ⚡ 核心价值与特色
*   **最新 1080P 核心实操演示视频**：品牌官网（`LandingPage.tsx`）集成 `public/Shopro.mp4` 1080P 超清全流程带货实操演示视频，支持全屏播放、进度控制及音量调节。
*   **真实积分扣减与流水明细全闭环**：基于 `deductUserCredits` 机制，生成视频时真实校验并扣除 10 积分，自动在 `credit_logs` 表中写入带有时间戳、扣除额度（`-10`）、剩余积分及事项描述的审计日志，支持全站 `credits_changed` 实时广播。
*   **双端解耦与厂商中台管控**：独立厂商运营后台支撑商业化运营、算力调账、AI 失败任务退款、内容风控证据链及 RBAC 细粒度权限管控。
*   **零成本 MSW Mock 与 Spring Boot 无缝接轨**：厂商后台自带 MSW 浏览器持久化 Mock，生产环境只需修改环境变量即可秒级无缝切换为 Spring Boot REST API 模式。
*   **极致降本**：无需聘请外籍主播与剪辑师，注册送 50 初始积分，生成单条视频消耗 10 积分（10 积分 = 1 元），综合成本降至不足 1 元。
*   **极致增效**：从商品 URL 到生成多语种情感数字人口播视频仅需 3-5 分钟。
*   **转化导向与全自适应**：引入“说服框架”CoT 分层文案、高精度暗色/浅色玻璃态 UI，移动端与桌面端全自适应。

---

## 🛠️ 技术栈

### 🌐 商家创作端前端技术栈 (React Client)

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | React | 18.3.1 | 组件化 UI 与状态驱动渲染 |
| 开发语言 | TypeScript | 5.5.3 | 强类型约束，提升工程可维护性 |
| 构建工具 | Vite | 5.4.1 | 极速热更新，生产资源打包优化 |
| 路由管理 | react-router-dom | 6.26.2 | 单页路由及受保护路由 |
| 状态/异步 | @tanstack/react-query | 5.56.2 | 异步数据缓存、乐观更新与生命周期管理 |
| UI 组件 | Radix UI + shadcn/ui | 基础组件 | Dialog、Select、Tabs、Tooltip、Sheet 等 |
| 样式系统 | Tailwind CSS / tailwindcss-animate | 3.4.11 | 原子化布局、过渡及高精度动效 |
| 动画驱动 | framer-motion | 12.4.10 | 页面进入、列表卡片拖拽与过渡动画 |
| 数据可视化 | recharts | 2.12.7 | 流量数据看板、雷达图、转化漏斗图 |
| 文件导出 | xlsx / jspdf / qrcode | 最新版 | 支持分镜 Excel 导出、脚本 PDF 以及微信支付二维码 |

### 🏢 厂商运营后台技术栈 (Shopro-backend Admin)

| 分类 | 技术/依赖 | 版本/说明 | 业务职责与用途 |
|---|---|---:|---|
| 核心框架 | Vue | 3.5.13 | Vue 3 Setup 语法糖与响应式后台架构 |
| 开发语言 | TypeScript | 5.7.2 | 全链路强类型定义、领域模型与接口契约约束 |
| 构建工具 | Vite | 6.0.7 | 秒级热重载（HMR）、Manual Chunks 分包打包优化 |
| 路由与状态 | Vue Router + Pinia | 4.5.0 / 2.3.0 | 动态路由挂载、RBAC 路由守卫与全局 Admin Auth Store |
| UI 组件库 | Element Plus | 2.9.1 | 企业级后台表格、表单、弹窗与仪表盘卡片 |
| 图表可视化 | ECharts | 5.6.0 | 履约趋势折线图、算力与任务状态占比环形图 |
| HTTP & API 模拟 | Axios + MSW | 1.7.9 / 2.7.0 | Service Worker 拦截 API，零成本持久化 Mock 演示 |

### ⚙️ 后端与数据服务 (Supabase + Spring Boot)

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| 云服务 BaaS | Supabase | Auth、DB、Storage、Edge Functions | 商家端全栈后端云服务托管 |
| 数据库 | PostgreSQL | 由 Supabase 托管 | RLS 物理数据隔离，pgvector 向量模糊搜索 |
| 边缘计算 | Supabase Edge Functions | Deno 运行时 | AI 编排、支付闭环、竞品抓取、团队协作接口 (16+ 函数) |
| 生产后端框架 | Spring Boot | 3.x REST Server (支持对接) | 厂商后台 REST API (`/api/admin/**`) |
| 后端安全与锁 | Spring Security + Redis | JWT + Redisson 悲观锁 | 管理员认证、RBAC 拦截与并发扣费保护 |
| 积分流水 | `deductUserCredits` + `credit_logs` | `src/hooks/useCredits.ts` | 真实扣减积分余额、全站事件广播并写入消费明细 |

### 🤖 AI 服务与多模态模型

| 模块/能力 | 对接模型 | 调用入口 / SDK | 用途与优势 |
|---|---|---|---|
| **文本大模型** | **DeepSeek-V4-Flash** | `/functions/v1/deepseek-v4-flash` | 营销文案、多语种翻译、商品特征解析、NLP情感极值标注 |
| **语音大模型** | **CosyVoice2 / TeleSpeech** | `/functions/v1/siliconflow-audio` | `CosyVoice2-0.5B` 情感化语音合成，`TeleSpeechASR` 录音高精度转录 |
| **视频生成** | **Seedance 2.0** | `/functions/v1/seedance` (submit/query) | `seedance-2-0-fast-260128` 物理级高画质多模态短视频生成与图生视频 |
| **图像/封面** | **Flux 1.1 Pro** | `ai-assistant` (generate_cover) | 竖版高分辨率带货短视频封面设计及图生图参考 |
| **备份视频** | Kling / Sora | `/functions/v1/kling-video-create` / `sora` | 备用高端概念短片生成与转场渲染 |
| **备份对话** | MiniMax-M3 | `/functions/v1/minimax-chat` | 备用聊天模型与目标受众痛点推导 |
| **百度代理** | 文心一言 (Wenxin) | `/functions/v1/wenxin-text-generation` | 自动后备文本代理生成 |
| **向量搜索** | OpenAI Text-Embedding-Ada-002 | RAG 向量知识库 / RPC | 将高分脚本与话术进行 Few-shot 匹配增强 |

---

## 📁 目录结构与两端工程拓扑

```text
Shopro AI/
├── public/
│   └── Shopro.mp4                 # 官网 1080P 高清全流程带货实操演示视频
├── src/                           # 【商家端 / 客户端】前端源码 (React 18 + Vite)
│   ├── App.tsx                    # 应用根组件，挂载 React-Query、AuthProvider、Toaster
│   ├── routes.tsx                 # 页面路由配置 (受保护路由与公开路由)
│   ├── main.tsx                   # React 项目打包入口
│   ├── index.css                  # 全局样式，包含 Tailwind 与玻璃态主题变量
│   ├── components/                # 业务公共组件
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx     # 核心主布局，实现全局搜索、积分余额显示、侧边栏及主题切换
│   │   ├── ui/                    # shadcn 风格原子级组件
│   │   └── ...
│   ├── hooks/
│   │   ├── useCredits.ts          # 积分余额实时查询、deductUserCredits 真实扣除与广播
│   │   └── ...
│   ├── pages/                     # 42 个核心业务页面组件
│   │   ├── LandingPage.tsx        # 品牌官网首页 (播放 public/Shopro.mp4 实操演示)
│   │   ├── DashboardPage.tsx      # 商家工作台主页
│   │   ├── VideoCreatePage.tsx    # 视频生成配置中心 (向导式生成与真实积分扣减)
│   │   ├── VideoEditPage.tsx      # 可视化多轨道分镜编辑器
│   │   ├── WorksPage.tsx          # 作品管理 (含视频第一帧真实封面截取)
│   │   ├── ProductsPage.tsx       # 商品管理 (一键 URL/口令多模态解析导入)
│   │   ├── CreditsPage.tsx        # 积分商城与充值收银台 (查看 credit_logs 明细)
│   │   └── ...
│   └── types/                     # 数据模型类型定义
├── Shopro-backend/                # 【厂商运营后台 / 管理中台】系统源码 (Vue 3 + Vite)
│   └── Shopro-backend-main/
│       ├── README.md              # 厂商运营后台全量评估与设计文档
│       ├── README1.md             # 标准评估文档备份
│       ├── package.json           # Vue 3 / Element Plus / MSW / ECharts 依赖
│       └── src/
│           ├── api/               # /api/admin/** REST API 封装 (auth, billing, risk, workflows...)
│           ├── components/        # 业务与公共组件 (积分调整弹窗、风险处置弹窗等)
│           ├── mocks/             # MSW Mock 拦截层与种子数据持久化
│           ├── router/            # RBAC 权限守卫与动态路由
│           ├── stores/            # Admin Auth Store 状态管理
│           └── views/             # 厂商后台管理页面 (Dashboard, AI 任务, 算力调账, 风控...)
├── supabase/                      # 【云后端 BaaS】 Supabase 基础设施配置
│   ├── functions/                 # 16 个 Deno 边缘函数微服务
│   └── migrations/                # 21 个 PostgreSQL 数据库迁移文件 (含 RLS 及防薅锁)
└── docs/                          # 项目 PRD、架构说明与商业计划书
```

---

## ⚡ 核心功能模块与工作流

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

### 1. 🎬 官网 1080P 核心演示视频 (`/Shopro.mp4`)
* **视频组件封装**：品牌官网首页 (`LandingPage.tsx`) 精准集成 `public/Shopro.mp4` 带货实操视频。
* **极速加载**：配置 `preload="metadata"` 确保首帧与时长秒级展现，支持进度拖拽、全屏播放与 HD 标志。

### 2. 💰 积分扣减与流水账单明细
* **全局扣费封装 (`deductUserCredits`)**：在 `src/hooks/useCredits.ts` 中集中管控积分逻辑。当用户点击“AI视频生成”时，系统校验可用余额，若余额充足则从 `user_plans` 的 `credits_used` 中真实扣除 10 积分（批量生成时按数量计算）。
* **收支审计明细 (`credit_logs`)**：扣除成功后自动插入 Supabase `credit_logs` 数据表，记录 `user_id`、`type: 'video_generate'`、`amount: -10`、`credits_after` 以及具体作品描述。
* **全站实时广播**：触发 `credits_changed` 自定义事件，顶部导航栏（`MainLayout`）、个人中心（`ProfilePage`）以及充值中心（`CreditsPage`）无需刷新即刻同步展现最新余额。

### 3. 🏢 厂商运营后台 7 大中台管控体系 (Shopro-backend)
* **📊 运营总览看板**：实时监控 AI 履算成功率、订单净支付金额、风险待办数及大模型服务健康度，使用 ECharts 动态渲染履约趋势与算力占比。
* **👥 客户全景与算力调账**：商家用户能力/并发配额管控，提供人工加/扣算力积分调账功能，变更实时存入审计日志。
* **🤖 AI 任务中心与 Attempt 追踪**：AI 工作流节点下探查看单次任务的多次 retry 尝试记录 (Attempt)、错误码与耗时，提供任务强切、失败重试及“故障失败算力退款”。
* **🛡️ 智能内容风控治理**：捕获涉黄、涉政、违禁词及版权风险事件，展示原始 Prompt 与上下文证据链，支持处置（阻断/告警/忽略）与商家申诉二次复核。
* **💳 订单充值与套餐版本快照**：订单流水查询、权益一键补发，以及覆盖提交 ➔ 审批/驳回 ➔ 算力扣减的退款全流程。
* **⚙️ 系统运维与敏捷恢复**：监控 downstream API 延时，基于 RBAC 进行角色权限拦截；Demo 模式下可随时一键恢复 MSW 演示种子数据。

### 4. 🛍️ 一键 URL / 口令解析商品导入 & 16国选品矩阵
* **一键 URL / 剪贴板口令解析**：支持抖音、TikTok、拼多多、淘宝、Shopee、亚马逊等链接或口令解析，自动调用 **DeepSeek-V4-Flash** 提取规范标题、分类、活动售价与三大 AI 卖点。
* **第三方数据引擎接入**：选品中心支持 FastData、EchoTik、GoodsFox、Kalodata、TikMeta、Shoplus 引擎介入。
* **16 国爆款商品矩阵**：涵盖美国、印尼、英国、越南、泰国、巴西、日本等 16 国真实选品与图片素材。

### 5. 🎬 作品素材与首帧封面动态提取 
* **视频首帧动态截取**：生成视频保存时调用 `extractVideoFirstFrame` 截取第一帧图片作为真实高保真封面。
* **真实提示词绑定**：作品标题自动绑定保存用户输入的真实提示词内容（`prompt.trim()`）。

### 6. 👥 数字人情感合成与多轨剪辑 
* **情绪对齐**：系统利用 NLP 分析台词的情感极值，自动映射数字人面部表情（平和、喜悦、担忧、激动、说服）与语气。
* **多轨道编辑器**：网页端提供多轨道可视化 Canvas 剪辑面板，直观拖拽分镜卡片、配音音轨与字幕。

---

## ⚙️ 部署指南

### 1. 商家端 (Client App) 本地启动
```bash
# 根目录下安装 dependencies
npm install

# 启动商家端开发服务
npm run dev
```

### 2. 厂商运营后台 (Shopro-backend) 本地启动
```bash
# 进入厂商后台目录
cd Shopro-backend/Shopro-backend-main

# 安装 pnpm 依赖
pnpm install

# 启动厂商后台 Vite 开发服务器 (访问 http://localhost:5173，账号 admin@shopro.ai)
pnpm dev

# 生产环境编译打包
pnpm build
```

### 3. Supabase 数据库与边缘函数部署
```bash
# 1. 链接项目并推送 21 个 SQL 迁移文件
supabase link --project-ref <your-project-ref>
supabase db push

# 2. 部署 16 个 Deno Edge Functions
supabase functions deploy ai-assistant
supabase functions deploy deepseek-v4-pro
supabase functions deploy stepaudio
supabase functions deploy seedance
supabase functions deploy phase3-assistant
supabase functions deploy create-payment-order
supabase functions deploy wechat-payment-webhook
supabase functions deploy query-payment-status
supabase functions deploy kling-video-create
supabase functions deploy kling-video-query
supabase functions deploy minimax-chat
supabase functions deploy sora-video-create
supabase functions deploy sora-video-query
supabase functions deploy send-sms-code
supabase functions deploy verify-sms-code
supabase functions deploy setup-demo
```

---

## 📦 API 接口

### 🏢 厂商运营后台 REST API (`/api/admin/**`)

| 业务模块 | HTTP 方法 | Endpoint 路径 | 所需权限 | 功能描述 |
|---|---|---|---|---|
| **认证授权** | `POST` | `/api/admin/auth/login` | 无 | 管理员登录，返回 JWT Token 与用户信息 |
| **运营总览** | `GET` | `/api/admin/dashboard/overview` | `dashboard:view` | 获取看板核心指标与环比数据 |
| | `GET` | `/api/admin/dashboard/fulfillment-trend` | `dashboard:view` | 获取履约成功率与趋势折线图数据 |
| **客户与算力**| `GET` | `/api/admin/customers/users` | `customers:view` | 分页查询商家用户列表及算力使用情况 |
| | `POST` | `/api/admin/credits/adjust` | `customers:view` | 人工加/扣算力积分，记录调账日志 |
| **AI 任务中心**| `GET` | `/api/admin/ai/workflows` | `workflow:view` | 分页查询 AI 脚本/语音/视频工作流任务 |
| | `GET` | `/api/admin/ai/workflows/:id` | `workflow:view` | 获取指定工作流详情与 Attempt 尝试日志 |
| | `POST` | `/api/admin/ai/workflows/:id/refund` | `workflow:view` | 对因故障失败的任务执行算力人工退款 |
| **风险与风控**| `GET` | `/api/admin/risk/events` | `risk:view` | 分页查询敏感词与内容风险事件及证据链 |
| | `POST` | `/api/admin/risk/events/:id/decide` | `risk:view` | 提交风险处置决定（阻断/告警/忽略） |
| **订单与计费**| `GET` | `/api/admin/billing/orders` | `billing:view` | 分页查询充值与套餐购买订单 |
| | `POST` | `/api/admin/billing/orders/:id/reissue`| `billing:view` | 对异常订单手动执行“权益一键补发” |
| **系统与运维**| `POST` | `/api/admin/system/demo-data/reset` | `system:view` | （Demo模式）一键恢复 MSW 演示种子数据 |

### 🌐 商家端 AI 网关 (`ai-assistant`)

> **端点**：`POST /functions/v1/ai-assistant`

| Action | 功能描述 | 核心参数 | 响应数据 |
|--------|---------|---------|---------|
| `generate_selling_points` | 商品卖点生成 | `product_name`, `category` | `{ selling_points: string[] }` |
| `extract_url_selling_points` | URL 网页卖点提取 | `url` | `{ selling_points: string[] }` |
| `generate_script_four_layer` | CoT 四层流式脚本生成 | `product_name`, `selling_points` | `{ scenes: Scene[] }` |
| `emotion_analysis` | 台词 NLP 情绪分析 | `sentences: string[]` | `[{ emotion, intensity }]` |
| `generate_video` | 视频生成任务提交（Seedance） | `project_id`, `prompt` | `{ success, request_id }` |

---

## 💡 总结与展望

### 📌 总结
Shopro AI 成功构建了**商家前端 + 厂商运营中台**的高完成度双端闭环体系。项目不仅为前端商户提供了自动化爆款带货视频量产能力，更为平台运营商提供了包含算力审计、Attempt 日志下探、故障退款、风控证据链与预留 Spring Boot 接轨的标准企业级中台能力。

### 🗺️ 未来 GTM 路线图
| 阶段 | 时间 | 里程碑 |
|------|------|--------|
| 🌱 公测种子期 | 2026 Q2 | 正式上线，获客 5000+ 商家，付费转化率 ≥ 8% |
| 📈 规模商业化 | 2026 Q3-Q4 | 联合 20+ 头部 MCN/ERP，月 MRR 突破 ¥20 万 |
| 🌐 跨境出海版 | 2027 | TikTok Shop/Lazada/Shopee 一键发布，海外节点上线 |
| 🏭 生态开放 | 2027+ | 完全开放 OpenAPI，接入聚水潭/旺店通，打造无人值守视频工场 |

---

<p align="center">
  <sub>Built with ❤️ by Shopro AI 研发团队 - AIGC带货视频</sub>
</p>
