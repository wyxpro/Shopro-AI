# 🛒 Shopro AI - 跨境电商 AIGC 带货短视频创作平台

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5.13-4FC08D?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7.2-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.0.7-646CFF?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element_Plus-2.9.1-409EFF?logo=elementplus&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2.103.1-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-FastMCP_Python-8A2BE2" />
  <img alt="AI" src="https://img.shields.io/badge/AI-GLM_5.3_Flash-blue" />
  <img alt="LLM Fallback" src="https://img.shields.io/badge/LLM_Fallback-DeepSeek_v4_Flash-blueviolet" />
  <img alt="Audio" src="https://img.shields.io/badge/Audio-CosyVoice2_TeleSpeech-orange" />
  <img alt="Video" src="https://img.shields.io/badge/Video-Seedance_2.0_·_Kling_V3_·_Wan3_·_MiniMax_H3_·_HappyHorse_1.1-violet" />
  <img alt="Gateway" src="https://img.shields.io/badge/Gateway-Tokendance_·_Sophnet-yellowgreen" />
  <img alt="Package Manager" src="https://img.shields.io/badge/pnpm-10.34.5-F69220?logo=pnpm&logoColor=white" />
</p>

---

## 💎 项目简介

<img width="1666" height="851" alt="image" src="https://github.com/user-attachments/assets/ab16fd76-7a2b-4ef4-875f-04436746a605" />
<img width="1280" height="679" alt="image" src="https://github.com/user-attachments/assets/cf2db694-ed54-4606-b7ca-6ff22854d3fb" />

**电商 AIGC 带货视频创作平台** 是一款面向国内外电商商家（如抖音、TikTok、小红书、Amazon、Shopee、Lazada 等）的企业级商业化 SaaS 平台。该系统通过深度融合先进的多模态大模型、思维链（CoT）营销方法论与工业级音视频渲染流水线，解决商家在短视频营销中面临的“文案撰写难、数字人/外籍演员贵、剪辑门槛高、多语言本地化差、跨平台发布与投后数据割裂”等核心痛点。

系统构建了**商家端创作系统（`src/` - React 18 + Supabase） + 厂商运营后台管理中台（`backend/` - Vue 3 + Element Plus） + Model Context Protocol 智能体开放生态（`mcp/`）** 的三位一体全栈架构：
1. **商家创作端 (`src/`)**：支持从「商品信息输入/URL 卖点提取 ➔ AI 智能脚本生成与提示词增强 ➔ 多模型视频生成矩阵（含用户自定义 OpenAI 兼容模型） ➔ 数字人选择与微表情映射 ➔ 多语言智能翻译 ➔ 分镜编辑 ➔ 素材混剪 ➔ 视频异步合成 ➔ 积分前置守卫、真实扣除与日志审计 ➔ 跨平台导出发布与数据回流」的完整商业闭环，将传统的五人工作流压缩为“一人 + AI”，帮助商家以极低成本高速量产高转化的爆款短视频。
2. **厂商运营端 (`backend/`)**：提供企业级多租户 SaaS 运维中台，覆盖运营总览大盘、算力积分调账、AI 工作流 Attempt 尝试级追踪与退款、内容风控证据链审计、订单补发及 MSW 零成本演示重置。
3. **MCP 开放智能体生态 (`mcp/`)**：基于官方 Model Context Protocol 与 Python FastMCP，将 Shopro 的核心能力封装为标准 AI 工具集，支持 Claude Desktop、Cursor 等客户端与智能体生态无缝调用。

### ⚡ 核心价值与特色
*   **极致降本**：无需聘请外籍主播与剪辑师，新用户注册赠送 20 初始积分，生成单条视频固定消耗 10 积分（10 积分 = 1 元），综合出片成本降至不足 1 元。
*   **零无效消耗**：全站生成入口统一复用 `ensureCreditsForGeneration` 前置余额守卫，积分不足 10 时立即拦截并自动弹出「积分管理与充值」面板，绝不发出任何生成请求，从源头杜绝欠费扣减与算力浪费。
*   **极致增效**：从商品 URL 到生成多语种情感数字人口播视频仅需 3-5 分钟。
*   **转化导向**：引入营销学“说服框架”，对文案进行 CoT 分层打标签，自动提取 NLP 情绪极值并映射数字人微表情与语气。
*   **数据驱动**：集成完播率与 ROI 预测、A/B 分镜测试及投放数据回流闭环，越用越聪明。
*   **全自适应体验**：高精度的暗色/浅色玻璃态 UI，支持移动端和桌面端无缝响应；内置安全回退兜底，环境配置缺失亦能平稳运行，彻底告别白屏。

---

## 🛠️ 技术栈总览

### 🌐 商家创作端 (`src/`)

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | React | 18.3.1 | 商家创作端 SPA 应用架构 |
| 开发语言 | TypeScript | 5.5+ / 5.7.2 | 全链路强类型约束，提升工程可维护性 |
| 构建工具 | Vite | 5.4.21 / 6.0+ | 极速热更新，生产资源打包优化与 Manual Chunks 分包 |
| 路由管理 | react-router-dom | 6.26.2 | 单页路由、受保护路由、跨页选品状态透传守卫 |
| 状态/异步 | @tanstack/react-query | 5.56.2 | 异步数据缓存、全局 Auth 会话与乐观更新 |
| UI 组件 | Radix UI + shadcn 规范 | 基础无障碍组件库 | 商家端模态框、下拉菜单、滑动条、折叠面板等 |
| 样式系统 | Tailwind CSS / Vanilla CSS | 3.4.11 / CSS3 | 原子化布局、高精度玻璃态与自适应响应式主题 |
| 动画与图表 | framer-motion / Recharts | 12.4.10 / 2.12.7 | 页面动效、商家端流量漏斗看板与趋势图 |
| 流式通信 | eventsource-parser | 3.0.8 | SSE 打字机流式（Server-Sent Events）文本解析 |
| 模型接入层 | Vite Dev Proxy + REST 客户端 | `/glm-api`、`/tokendance-api`、`/dxkp-api`、`/siliconflow-api`、`/gmicloud-api` | 多厂商大模型网关代理，剔除 CORS 限制并隐藏真实域名与密钥 |
| 代码质量 | Biome / tsgo | 2.4.5 / 0.0.1 | 极速 Lint、代码格式化及预构建类型检查 |

### 🏢 厂商运营后台 (`backend/`)

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | Vue 3 | 3.5.13 | 厂商运营管理端企业级中台 |
| 组件库 | Element Plus | 2.9.1 | 企业级表格、表单、标签页、筛选器与布局体系 |
| 状态管理 | Pinia | 2.3.0 | 模块化集中状态管理与用户权限凭据存储 |
| 图表大盘 | ECharts | 5.6.0 | 履约成功率趋势折线图、算力占比环形图与漏斗图 |
| 服务模拟 | MSW (Mock Service Worker) | 2.7.0 | Service Worker 请求拦截与浏览器端数据持久化/演示重置 |
| 后端对接标准 | REST API (`/api/admin/**`) | Spring Boot 3.x 标准 | 采用 `ApiResponse<T>` / `PageResult<T>` 统一契约 |

### ⚙️ 后端、数据服务与开放协议

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| 云服务 BaaS | Supabase | Auth、DB、Storage、Edge Functions | 商家端全栈后端云服务托管 |
| 数据库 | PostgreSQL (Supabase 托管) | 25 个 SQL 迁移文件 | RLS 物理数据隔离、防刷事务锁、FTS 全文检索知识库 |
| 账户认证 | Supabase Auth / JWT | 邮箱/手机号/短信验证码与 JWT 会话 | 商家端与厂商后台 RBAC 权限校验与 Token 刷新 |
| 边缘计算 | Supabase Edge Functions | 18 个 Deno 运行时微服务 + `_shared` 统一中间件 | AI 编排、支付闭环、竞品抓取、团队协作、短信验证 |
| 积分体系 | `creditGuard` + `useCredits` + `credit_logs` | `src/lib/creditGuard.ts` / `src/hooks/useCredits.ts` | 注册赠 20 / 单条生成 10 统一口径，前置余额守卫、原子扣费 RPC 与流水审计 |
| 开放协议 | Model Context Protocol (MCP) | Python FastMCP (`mcp/` + `api/`) | 封装 7 大标准化电商 AI 生产力工具供 Agent 调用 |

### 🤖 AI 服务与多模态模型矩阵

| 模块/能力 | 对接模型 | 调用入口 / SDK | 用途与优势 |
|---|---|---|---|
| **文本大模型（主通道）** | **GLM-5.3-Flash** (Sophnet) | `/functions/v1/glm-5-3-flash` + 前端 `/glm-api` 直连兜底 | 营销脚本、提示词增强、多语种翻译、卖点结构化抽取；SSE 打字机流式，强制思维链与 100 词内输出模板收敛降尾程延时 |
| **视频生成矩阵** | **Seedance 2.0**（ByteDance Ark，默认） | `/tokendance-api` Ark v3 generations/tasks 异步协议 | 物理级多模态短视频与图生视频，异步提交 + 轮询取回成片 |
| | **Kling-V3** (Kuaishou) | `/functions/v1/kling-video-create` / `kling-video-query` | 高保真人像与运镜控制备用通道 |
| | **Wan3.0 Prime** (Qwen · Alibaba) | `/tokendance-api` 异步任务网关 | 国产开源系风格与长镜头表现 |
| | **MiniMax H3 Max** | `/tokendance-api` Video V2 协议 | 高动态商品展示与镜头切换 |
| | **HappyHorse 1.1** (Alibaba) | `/tokendance-api` DashScope 异步协议 | `X-DashScope-Async` 提交，支持 size/duration 参数级控台 |
| **图像与封面** | **Flux 1.1 Pro / Midjourney v6 / SDXL 3.0** | `ai-assistant` (generate_cover / 图片生成网关) | 竖版高分辨率带货封面与商品概念图，候选图执选与下载 |
| **自定义模型** | 用户自备 OpenAI 兼容端点 | `src/lib/customModel.ts` + `CustomModelDialog` | 商家可自行填写请求地址/模型 ID/密钥，端点格式校验 + 真实连通测试通过才启用，按 video/image 隔离持久化，失败自动降级本地管线 |
| **语音合成/转写** | **CosyVoice2-0.5B / TeleSpeechASR / StepAudio 2.5** | `/functions/v1/siliconflow-audio`、`/functions/v1/stepaudio` | 情感化多语种口播 MP3 与录音高精度转录 |
| **备份与兜底** | MiniMax-M3 / Sora-2 / 文心一言 | `/functions/v1/minimax-chat`、`sora-video-*`、`wenxin-text-generation` | 备用对话推理、概念短片与文本代理兜底 |
| **知识库检索** | PostgreSQL FTS 全文检索 + Few-shot | RAG 知识库 / RPC | 高分脚本与话术命中增强，无外部向量服务依赖 |

> **降级透明化约定**：预设启发式分支响应带 `degraded: true`，模拟数据（竞品抓取/直播切片/发布）带 `simulated: true`，严禁以随机数冒充真实模型输出。

---

## 📁 目录结构与 42 个核心页面

```text
Shopro/
├── backend/                           # 🏢 厂商运营后台管理系统 (Vue 3 + Element Plus + Pinia + MSW)
│   ├── src/api/                       # 厂商后台 REST API (auth, billing, credits, risk, system...)
│   ├── src/views/                     # 8 大业务域运营管理页面 (Dashboard, Users, AI-Ops, Risk...)
│   ├── src/mocks/                     # MSW 浏览器端 Mock 数据库与状态重置引擎
│   ├── README.md                      # 厂商运营后台详细技术与架构设计文档
│   └── package.json                   # 厂商端独立依赖与运行脚本
├── mcp/                               # 🤖 Model Context Protocol (MCP) 开放服务体系
│   ├── mcp_shopro_server.py           # FastMCP HTTP 模式服务端 (默认仅绑定 127.0.0.1:8080)
│   ├── mcp_shopro_server_stdio.py     # FastMCP Stdio 模式入口 (支持 Claude Desktop / Cursor 直连)
│   ├── tools.json                     # 7 大标准化 MCP 工具规范 Schema 定义
│   ├── requirements_mcp.txt           # MCP 服务所需 Python 依赖清单
│   └── mcp.md                         # MCP 接入、配置与调试专属指导手册
├── api/                               # 🧩 生产环境 Serverless 代理层 (Vercel)
│   ├── dxkp.py                        # Starlette 第三方 AI 网关代理 (调用方鉴权，禁止公开被刷配额)
│   └── mcp.py                         # MCP Streamable HTTP 入口 (开启 DNS Rebinding 防护)
├── docs/                              # 📚 核心设计、Prompt工程与商业知识库
│   ├── ai/                            # AI 核心设计与分镜策略
│   │   ├── ai.md                      # AI 能力需求、提示词策略与 API 定价深度分析报告
│   │   ├── vedio.md                   # 平台 5 秒宣传片尾页分镜、逐秒脚本与多模型 Prompt 指南
│   │   └── GMI.md                     # 云算力与基础设施评估报告
│   ├── prd/                           # 产品规划与市场调研
│   │   ├── PRD.md                     # 完整产品需求规格说明书
│   │   ├── 竞品.md                    # 行业竞品商业与功能横向评测
│   │   └── 计划书.md                  # 商业化推广与全景商业计划书
│   ├── CURRENT_STATE.md               # 系统实测现状基准报告（模块规模/函数矩阵/安全基线）
│   └── 后端.md                        # 后端服务层与数据层整改规范
├── public/
│   └── Shopro.mp4                     # 官网最新 1080P 高清全流程带货实操演示视频
├── src/                               # 🛒 商家端源码 (React 18 + Vite + TailwindCSS)
│   ├── App.tsx                        # 应用根组件，挂载 React-Query、AuthProvider、Toaster 与全部路由表
│   ├── main.tsx                       # React 项目打包入口
│   ├── index.css                      # 全局样式，包含 Tailwind 与玻璃态主题变量
│   ├── api/                           # 统一 API 门面 (client / video / products / credits / index)
│   ├── components/                    # 业务公共组件
│   │   ├── layouts/MainLayout.tsx     # 核心主布局，实现全局搜索、积分余额显示、积分管理充值弹窗与主题切换
│   │   ├── ui/                        # shadcn 风格原子级组件 (Button, Dialog, Badge, Input... 共 57 个)
│   │   ├── common/                    # 业务共享弹窗：CustomModelDialog / PaymentDialog / PlatformCredentialDialog
│   │   └── CoverCandidates.tsx        # AI 封面多候选展示与下载
│   ├── contexts/AuthContext.tsx       # Supabase Session 状态管理
│   ├── db/supabase.ts                 # Client 单例初始化 (含默认安全回退，防白屏崩溃)
│   ├── hooks/
│   │   ├── use-mobile.tsx             # 移动端断点检测
│   │   ├── use-toast.ts               # Toast 通知
│   │   ├── useCredits.ts              # 积分余额实时查询、模块级缓存 peekCreditsLeft、真实扣除与 `credits_changed` 广播
│   │   └── useDraft.ts                # 页面内容本地缓存恢复
│   ├── lib/
│   │   ├── creditGuard.ts             # 积分端到端统一守卫：VIDEO_GENERATE_COST=10 / REGISTER_BONUS_CREDITS=20 / ensureCreditsForGeneration
│   │   ├── customModel.ts             # 自定义 OpenAI 兼容模型：端点拼接校验、连通测试、调用与 URL 提取
│   │   ├── videoFrame.ts              # 视频首帧抽取与真实封面持久化
│   │   ├── audioRecorder.ts           # 麦克风录音控制 (配合 StepAudio ASR)
│   │   ├── sse.ts                     # SSE 流式解析、GLM/DeepSeek 多级降级链、StepAudio 与 Seedance 轮询
│   │   ├── vectrust/                  # Seedance (dxkp 网关) 视频提交与查询
│   │   ├── seedancemini/              # Seedance 2.0 Mini (Tokendance Ark v3) 异步任务对接
│   │   ├── happyhorse/                # HappyHorse 1.1 (Tokendance DashScope) 异步任务对接
│   │   ├── wan3/                      # Wan3.0 Prime (Tokendance) 视频合成对接
│   │   ├── minimax/                   # MiniMax H3 Max (Tokendance Video V2) 对接
│   │   └── utils.ts                   # CSS 样式合并等辅助函数
│   ├── pages/                         # 业务页面 (42 个核心页面及子页面)
│   │   ├── LandingPage.tsx            # 品牌官网首页，播放 public/Shopro.mp4 1080P 实操演示
│   │   ├── LoginPage.tsx              # 登录注册页 (邮箱验证码/密码与手机号三通道，demo_user 一键免密体验通道；注册仅写入触发器默认 20 积分)
│   │   ├── DashboardPage.tsx          # 工作台主页，展示快捷入口、生成历史和关键指标
│   │   ├── HomePage.tsx               # 核心创作工作台（参考/商品/数字人/首尾帧选品装载、5 大视频模型与提示词增强、10 积分前置拦截与扣除、自定义模型入口、灵感广场筛选）
│   │   ├── VideoCreatePage.tsx        # 视频生成配置中心 (向导式生成、分辨率/宽高比/时长直传模型参数与积分扣减)
│   │   ├── VideoEditPage.tsx          # 可视化多轨道分镜编辑器 (字幕轨、人像轨、声轨)
│   │   ├── WorksPage.tsx              # 作品管理，包含合成进度及视频第一帧真实封面持久化
│   │   ├── MaterialsPage.tsx          # 素材库管理 (支持分类上传及删除)
│   │   ├── ProductsPage.tsx           # 商品管理，URL/口令多模态解析导入与「创建视频」跨页直连选品
│   │   ├── ProductSelectionPage.tsx   # 智能选品工坊，16国真实选品矩阵与第三方数据引擎接入中心
│   │   ├── AvatarsPage.tsx            # 数字人库，支持上传头像图片及 StepAudio TTS 试听
│   │   ├── TemplatesPage.tsx          # 视频模板库，一键套用带货模板
│   │   ├── ScriptPage.tsx             # 脚本管理，可在此独立撰写、导出
│   │   ├── StyleCopyPage.tsx          # 爆款风格复刻页，输入竞品链接自动抽取节奏
│   │   ├── KnowledgePage.tsx          # 品牌/商品知识库 (用于 RAG 检索 Few-shot)
│   │   ├── CompetitorPage.tsx         # 竞品爆款监控分析 (5 个监控账号与真实抓取数据，默认 3 个可展开全部)
│   │   ├── LiveHighlightPage.tsx      # 直播高光切片提取器
│   │   ├── AnalyticsPage.tsx          # 多平台流量漏斗、完播率及 ROI 分析 (默认数据置零，API 凭证授权成功后才展示)
│   │   ├── DataDashboardPage.tsx      # 商业数据洞察全景看板 (大盘核心指标与趋势图)
│   │   ├── ProfilePage.tsx            # 个人中心及账号安全设置
│   │   ├── CreditsPage.tsx            # 积分商城与充值收银台 (真实展现 credit_logs 收支明细)
│   │   ├── OrderDetailPage.tsx        # 微信支付订单状态页
│   │   ├── PromptTemplatesPage.tsx    # 系统 Prompt 策略管理页
│   │   ├── ActivitiesPage.tsx         # 操作日志与审计足迹
│   │   ├── InvitePage.tsx             # 邀请有礼推广页面
│   │   ├── PublishPage.tsx            # 跨平台多端发布 (抖音/TikTok/小红书/快手/B站排期发布)
│   │   ├── ABTestPage.tsx             # A/B 测试管理中心 (脚本/封面版本对比)
│   │   ├── EmotionAnalysisPage.tsx    # NLP 情绪分析与时间轴对齐工作区
│   │   ├── MultiLangPage.tsx          # 多语言翻译控制台
│   │   ├── TaskQueuePage.tsx          # 视频生成异步任务队列监控
│   │   ├── ExportFormatsPage.tsx      # 跨平台一键分发与多格式导出 (Excel/PDF/视频、共享 API 凭证授权弹窗、真实首帧素材选择)
│   │   ├── LLMCachePage.tsx           # AI 缓存命中率监控与管理
│   │   ├── TeamSpacePage.tsx          # 团队协作空间 (角色权限、协作管理)
│   │   ├── OpenAPIPage.tsx            # 开放开发平台 (API Key 生成与 API 调试)
│   │   ├── DataFeedbackPage.tsx       # 广告回流与自学习面板
│   │   ├── TrendingPatternsPage.tsx   # 千万级热门爆款视频模式分析
│   │   ├── PersonalizePage.tsx        # 账号私有风格模型定制微调
│   │   ├── BatchCreatePage.tsx        # 批量生成管理器 (批量计算并扣除积分)
│   │   ├── AiToolboxPage.tsx          # 营销 AI 工具箱 (关键词提取、字幕打点等)
│   │   ├── NotificationsPage.tsx      # 系统通知中心
│   │   ├── Index.tsx                  # 根路径重定向索引页
│   │   └── NotFound.tsx               # 404 兜底页
│   └── types/types.ts                 # 数据模型 (Product, Material, CreditLog, Job...)
├── supabase/
│   ├── functions/                     # 18 个 Deno 边缘函数微服务 + `_shared` 统一中间件
│   │   ├── _shared/                   # 全站统一中间件：auth.ts (强制 JWT)、cors.ts、errors.ts
│   │   ├── ai-assistant/              # 统一 AI 网关，callLLM 采用 GLM 优先 + DeepSeek 回退，内置 18 个 action
│   │   ├── glm-5-3-flash/             # GLM-5.3-Flash 主文本通道 (Sophnet OpenAI 兼容接口，sophnet→dxkp→SiliconFlow 三级降级)
│   │   ├── deepseek-v4-pro/           # DeepSeek V4 文本生成代理 (带 API Fallback)
│   │   ├── stepaudio/                 # StepAudio 2.5 ASR 和 TTS 物理代理
│   │   ├── siliconflow-audio/         # 硅基流动 CosyVoice2 语音合成服务
│   │   ├── seedance/                  # Seedance 2.0 异步视频生成/状态查询
│   │   ├── phase3-assistant/          # 竞品抓取、直播分析、团队、APIKey、发布管理 (14 个 Action)
│   │   ├── create-payment-order/      # 创建微信支付订单及二维码生成
│   │   ├── wechat-payment-webhook/    # 微信支付成功回调验签及充值入账 (时间戳防重放)
│   │   ├── kling-video-create/        # 可灵视频任务创建
│   │   ├── kling-video-query/         # 可灵视频任务查询
│   │   ├── minimax-chat/              # MiniMax 接口代理
│   │   ├── sora-video-create/         # Sora 视频任务创建
│   │   ├── sora-video-query/          # Sora 视频任务查询
│   │   ├── send-sms-code/             # 验证码发送 (60s 冷却/单日 10 次频控防轰炸)
│   │   ├── verify-sms-code/           # 验证码登录验证
│   │   ├── wenxin-text-generation/    # 百度文心代理 Edge Function
│   │   └── setup-demo/                # 演示数据初始化 (仅限 service_role 或环境变量开关)
│   ├── migrations/                    # 25 个 PostgreSQL 数据库迁移文件 (含 RLS 收紧、原子扣费 RPC、积分规则端到端对齐)
│   └── schema.sql                     # 全量数据库结构基准 (含 credit_logs action/balance_after 列与 handle_new_user 触发器)
├── .env.example                       # 环境变量标准模板 (Supabase、GLM/Sophnet 与 Tokendance 网关各模型 Key)
├── vercel.json                        # 生产部署重写规则 (/dxkp-api → /api/dxkp、/mcp → /api/mcp、SPA 回退)
├── AGENTS.md                          # 智能体协作规范与 Git 自动化管理准则
└── package.json                       # 根工程脚本与主依赖声明
```

---

## ⚡ 核心功能模块与工作流

### 🔄 全链路智能生成工作流

```
商品 URL / 口令输入
        │
        ▼
① 🕷️  URL 卖点智能提取 (GLM-5.3-Flash，DeepSeek-V4-Flash 回退)
   解析页面 HTML / 口令文本 → 结构化输出 3 条高转化核心卖点 JSON
        │
        ▼
② ✍️  CoT 四层营销脚本生成与提示词增强（SSE 打字机流式）
   黄金3秒留存钩子层 → 场景化痛点激化层 → 卖点与解决方案层 → 强促单 CTA 转化层
        │
        ▼
③ 💰  积分前置守卫、真实扣除与审计记录 (creditGuard + useCredits)
   ensureCreditsForGeneration 前置校验余额（<10 即拦截并弹充值面板）→ 扣除 10 积分
   → deduct_credits 原子 RPC (FOR UPDATE 行锁) → 写入 credit_logs 并全站广播
        │
        ▼
④ 🎭  NLP 情感分析与数字人映射
   台词情绪极值分析 → 时间轴情绪标注 → 映射数字人表情（喜悦/专注/说服）与语气
        │
        ▼
⑤ 🎙️  多语种情感配音合成
   CosyVoice2-0.5B → 情感化口播 MP3 / TeleSpeechASR 录音转写
        │
        ▼
⑥ 🎬  多模型视频渲染矩阵（异步队列，默认 Seedance 2.0）
   分辨率/宽高比/时长直接透传模型参数 → Seedance / Kling-V3 / Wan3.0 / MiniMax H3 / HappyHorse 1.1 / 自定义模型
   → 720P~1080P 多模态合成视频 (第一帧图持久化封面)
        │
        ▼
⑦ ✂️  多轨道可视化编辑器（可选）
   字幕轨 / 人像轨 / 声音轨 / 特效轨 → 拖拽拼接
        │
        ▼
⑧ 🚀  跨平台一键发布 + 数据回流自调优
   抖音 / TikTok / 快手 / 小红书 / B站 定时发布 → ROI 回流 → AI 重写优化
```

### 1. 🎬 官网 1080P 核心演示视频 (`/Shopro.mp4`) 与宣传片分镜指南
* **视频组件封装**：品牌官网首页 (`LandingPage.tsx`) 精准集成 `public/Shopro.mp4` 带货实操视频。
* **极速加载**：配置 `preload="metadata"` 确保首帧与时长秒级展现，支持进度拖拽、全屏播放与 HD 标志。
* **专业宣传片分镜规范**：在 [`docs/ai/vedio.md`](docs/ai/vedio.md) 中完整定义了 5 秒商业宣传片尾页规范，拆解 0.0s~5.0s 逐秒分镜细节，并配套 Runway Gen-3 Alpha、Sora、可灵 AI、即梦 AI、海螺 AI 等大模型中英文提示词与后期音效方案。

### 2. 💰 积分端到端统一口径与流水审计
*   **单一口径常量 (`creditGuard.ts`)**：`REGISTER_BONUS_CREDITS = 20`、`VIDEO_GENERATE_COST = 10` 集中于 `src/lib/creditGuard.ts`，前端入口、Edge Function RPC 与数据库触发器三处保持一致，禁止各页自行实现导致口径偏差。
*   **前置拦截守卫 (`ensureCreditsForGeneration`)**：首页工作台、`VideoCreatePage`、`BatchCreatePage`（批量按数量计算）等全部生成入口在进入 loading 与调用大模型之前必须先过守卫；余额不足即 toast 提示并广播 `shopro:open-credits-dialog` 事件，由 `MainLayout` 自动弹出「积分管理与充值」面板，同时**不发出任何生成请求**。
*   **注册初始额度**：`handle_new_user` 触发器写入 20 积分并记一笔注册赠送流水；客户端兜底 `user_plans.upsert` 已改为 `ignoreDuplicates: true`，确保不会覆盖触发器已写入的初始记录。
*   **原子扣费与审计 (`credit_logs`)**：`deduct_credits` RPC 采 jsonb 完整实现，`FOR UPDATE` 行锁 + 越权校验，写入 `user_id`、`type`、`action`、`amount: -10`、`balance_after` 与作品描述，根治列缺失与 NOT NULL 违约导致的扣费失败。
*   **全站实时广播**：扣除成功触发 `credits_changed` 自定义事件，顶部导航栏（`MainLayout`）、个人中心（`ProfilePage`）与充值中心（`CreditsPage`）无需刷页即同步最新余额与收支明细；`peekCreditsLeft` 模块级缓存避免点击瞬间冗余网络请求。

### 3. 🧠 AI 脚本、提示词增强与多模型生成工作台
*   **GLM-5.3-Flash 主通道 + 多级降级**：文本能力默认走 `glm-5-3-flash` 边缘函数与 `/glm-api` 前端直连兜底，失败逐级降级至 dxkp 网关、`deepseek-v4-pro` 与 SiliconFlow；全链失败才报错且透出真实原因（不再误报“响应超时”）。
*   **低延时中文流式打字机**：提示词增强强约束纯中文输出，模板收敛为「总字数 100 词以内、直接输出一段正文、严禁 Markdown 与解释」，实测输出由约 1000 字收敛至 94 字；`max_tokens` 预算由 4096 收敛至 2048（含强制思维链预留），显著缩短尾程延时。
*   **视频生成模型矩阵**：工作台集成 5 大可用模型，默认选中 Seedance 2.0，并配备厂商专属标识：
    - ⚡ **Seedance 2.0** (ByteDance Ark、默认选中)
    - 🚀 **MiniMax H3 Max** (MiniMax)
    - 🌀 **Wan3.0 Prime** (Qwen · Alibaba)
    - 🐎 **HappyHorse 1.1** (Alibaba Tokendance/DashScope)
    - 🎬 **Kling-V3** (Kuaishou AI 快手可灵)
*   **图片生成模型**：提供 **Flux 1.1 Pro**、**Midjourney v6**、**SDXL 3.0** 三档选择，均可叠加自定义模型。
*   **生成参数真实生效**：分辨率/宽高比/时长不再硬编码，直接透传至 Seedance、Kling、Wan3、MiniMax、HappyHorse 请求体，并存入 `video_projects` 的 `aspect_ratio` 与 `resolution`；「扩展（自动优化提示词）」开关开启时自动追加镜头质感与转化引导语。
*   **视频默认画质**：工作台默认配置 `720P · 16:9 · 5s`。
*   **分镜 CoT 架构**：基于思维链（CoT）四层营销架构，流式（SSE）生成分镜脚本：钩子（Hook）➔ 痛点（Pain Point）➔ 产品介绍（Product）➔ 行动召唤（CTA）。

### 4. 🧬 自定义模型接入（OpenAI 兼容端点）
*   **入口与弹窗**：工作台视频与图片两处模型下拉均提供「+ 自定义模型」入口；弹窗采用 `createPortal` 挂 `document.body` 的 fixed 全屏遮罩居中顶层模态（z-index 2147483000、零 CSS 动画），彻底根治后台窗口节流导致动画冻结、弹窗不可见的问题，并规避与灵感广场筛选栏的层叠冲突。
*   **配置字段**：支持填写 API 格式、自定义请求地址（自动补全 `/chat/completions`）、模型 ID、展示名称（0/64 计数）与 API 密钥，实时展示端点拼接预览。
*   **校验与真实联通测试**：内置端点格式校验，仅当真实连接测试返回通过才允许「保存并启用」，避免无效配置造成生成失败。
*   **持久化与隔离**：配置写入 `localStorage`，按 `video` / `image` 功能维度隔离存储（`src/lib/customModel.ts`），支持已存模型的编辑与删除。
*   **生成与降级**：生成时真实调用所配置的 OpenAI 兼容 Chat Completions 端点，解析返回的视频/图片 URL 直接展示；失败时自动降级本地模拟管线，不阻断工作流。

### 5. 📤 跨平台导出与多平台分析授权闭环
*   **共享 API 凭证授权弹窗**：`PlatformCredentialDialog` 统一提供 Key/Secret/回调 URL 填写与连接测试校验，替换早期模拟 OAuth 动画，并同时复用于导出页与分析页，两端授权状态双向同步。
*   **真实素材对应**：导出素材列表异步提取原始 AI 视频真实首帧作为封面（并展示分辨率），全站禁用与商品无关的占位图。
*   **默认分发体验**：导出页默认展示「一键分发」Tab 并预选抖音竖屏推荐格式；多平台分析页默认数据置零，仅授权成功后展示真实指标。

### 6. 🛍️ 一键 URL / 口令解析商品导入 & 工作台商品联动 & 16国选品矩阵
*   **工作台「商品」Tab & 智能选品弹窗**：
    - 工作台视频生成输入区新增「商品」标签，支持在模态框中从 Supabase `products` 数据库实时调取商品。
    - 选择商品后，AI 自动提取规范标题、原价/活动价、商品分类、核心卖点与详细描述，智能合成结构化爆款带货视频 Prompt 脚本并自动填充至输入框。
*   **「商品管理」一键「创建视频」双向直连**：
    - 在商品卡片与表格操作栏提供一键「创建视频」按钮，采用自定义 `RedirectWithState` 路由透传机制，保障跨页面 `location.state` 状态不丢失；
    - 秒级直接跳转至主工作台 `/video/create` 视频生成界面并自动选中指定商品。
*   **一键 URL / 剪贴板口令解析导入**：
    - 支持抖音 🎵、TikTok 🎶、拼多多 🔴、淘宝 🟠、Shopee 🧡、亚马逊 📦、全网通用 🌐 等平台商品网页链接或分享口令（淘口令/抖音口令）。
    - 实时调用 **GLM-5.3-Flash**（DeepSeek-V4-Flash 回退）多模态能力，自动提取规范标题、所属分类、原价/折后活动售价、三大 AI 核心卖点、商品实物封面图及详细描述。
    - 提供高亮亮彩纯白电商风格控制台，支持用户自定义编辑并一键存入 Supabase `products` 数据库。
*   **第三方数据引擎接入中心 (Data Engine Integration Center)**：
    - 智能选品支持数据引擎介入（FastData、EchoTik、GoodsFox、Kalodata、TikMeta、Shoplus）。
    - 默认激活 **FastData** 数据引擎为【已连接】，其余引擎均支持弹窗配置 API Endpoint 与 API Key 自定义介入。
*   **16 国爆款商品矩阵**：
    - 涵盖美国、印尼、英国、越南、泰国、马来西亚、菲律宾、西班牙、墨西哥、德国、法国、意大利、巴西、日本、新加坡等 16 个国家/地区，每国包含 5+ 真实实物无人物商品图片数据。

### 7. 🎬 作品素材与首帧封面动态提取 
*   **视频首帧动态截取**：全站 AI 生成视频保存至作品素材库时，自动调用 `extractVideoFirstFrame` 截取对应视频第一帧图片作为真实高保真封面。
*   **真实提示词绑定**：作品标题自动绑定并保存为用户输入的真实提示词内容（`prompt.trim()`），告别固定模板标题。

### 8. 👥 数字人情感合成与多轨剪辑 
*   **情绪对齐**：系统利用 NLP 分析台词的情感极值，在分镜时间轴上自动映射数字人的面部表情（平和、喜悦、担忧、激动、说服）与语气。
*   **多模态配音**：利用 `CosyVoice2-0.5B` 根据情感标记生成自然拟真的小语种配音。
*   **多轨道编辑器**：在网页端提供多轨道可视化 Canvas 剪辑面板，直观拖拽分镜卡片、配音音轨、字幕，实现免学习拼积木式合成。

### 9. 💡 流量追踪、A/B测试与广告回流 
*   **漏斗分析**：展示不同视频版本的转化漏斗图（播放量-完播率-点击率-成交金额），直接计算 ROI。
*   **A/B测试**：同一商品配置多组脚本/封面，在线追踪测试，智能淘汰低效版本。
*   **多平台发布**：可将渲染完成的视频直接调度至抖音、TikTok、小红书、快手或 B站，设定排期计划自动定时发布。
*   **自适应优化**：将真实投放转化差的文案数据回流，自动反馈给 AI 训练，对低分脚本进行“一键调优”重写。

### 10. 🔗 团队协作与 OpenAPI 开放平台 
*   **团队协作**：支持主账号创建团队空间，通过邮箱发送邀请凭证，配置管理员或协作者角色，共享素材库与作品集。
*   **OpenAPI 调试**：面向大商户或 ERP 系统，提供 `ak_...` 自定义 API 密钥生成、Revoke 控制，并附带在线交互式 API 沙箱调试器。

### 11. 🏢 厂商运营后台管理系统 (`backend/`)
https://shopro-backend.netlify.app/（测试演示版）
*   **运营总览看板 (Dashboard)**：聚合展示 AI 履约成功率、订单净支付金额、服务影响指数及 ECharts 履约趋势与算力占比图表。
*   **客户与算力积分管理 (Customers & Credits)**：查看商家用户使用全景，动态配置能力与并发配额，支持带审计追踪的人工算力加/扣调账。
*   **AI 任务中心与 Attempt 日志下探 (AI Operations)**：工作流实时追踪，下探查看任务多次 retry 尝试记录 (Attempt)、第三方接口耗时与错误码，提供任务强切、失败重试及“故障失败算力退款”。
*   **智能内容风控治理 (Risk Governance)**：捕获涉黄、涉政、敏感违禁词事件，展示原始提示词与生成上下文证据链，支持处置（阻断/告警/忽略）与商家申诉二次复核。
*   **订单、退款与套餐版本快照 (Billing & Packages)**：提供订单流水明细与异常订单“权益一键补发”，覆盖退款申请审批全生命周期，支持算力套餐版本快照创建。
*   **系统运维与 MSW 零成本恢复 (System & Demo Reset)**：监控下游 AI 服务 health 状态，基于 RBAC 管理权限角色，支持在 Demo 模式下一键恢复 MSW 演示种子数据。
*   **生产环境 Spring Boot 无缝对接**：前端 API 统一为 `/api/admin/**`，采用 `ApiResponse<T>` / `PageResult<T>` 统一契约。生产环境修改 `VITE_USE_MOCK=false` 即可秒级接轨真实后端。

---

## 🤖 Model Context Protocol (MCP) 智能体开放服务

Shopro AI 在 `mcp/` 目录下深度集成了官方 MCP 协议，使用 Python `FastMCP` 开发了专用的 MCP 服务，使 AI Agent 能够直接调用 Shopro 视频生成与脚本提取核心能力。详细文档见 [`mcp/mcp.md`](mcp/mcp.md)。

### 🛠️ 7 大核心 MCP 工具清单
1. **`extract_product_highlights`**：使用 **DeepSeek-V4-Pro** 深度分析商品描述或链接，提取前三大核心卖点、受众痛点与广告切入视角。
2. **`generate_marketing_script`**：基于 AIDA 营销框架智能撰写短视频脚本，输出包含 Hook、痛点、解决方案的分镜动作与台词。
3. **`translate_marketing_script`**：高质量本地化翻译，自动严格保持原有的分镜格式与占位符完整无缺。
4. **`synthesize_voice_tts`**：调用 **StepAudio 2.5 TTS** 大模型生成带情感色彩的语音音频，返回 Base64 格式的 MP3 音频流。
5. **`enhance_video_prompt`**：利用 **StepFun** 大模型将简短商品文案转化为物理级细致的视频生成 Prompt。
6. **`submit_video_generation_task`**：异步提交 Seedance 2.0 视频生成任务，返回全局 `task_id`。
7. **`query_video_task_status`**：轮询视频生成任务状态、合成进度与成片 MP4 下载地址。

### 🚀 启动与客户端接入
```bash
# 1. 安装依赖
cd mcp
pip install -r requirements_mcp.txt

# 2. 方式 A: HTTP 模式启动 (默认仅绑定 127.0.0.1:8080，强制 Bearer Token / API Key 鉴权)
python mcp_shopro_server.py

# 3. 方式 B: Stdio 模式启动 (适用于 Claude Desktop / Cursor 直连)
python mcp_shopro_server_stdio.py
```

> **生产入口与安全加固**：`api/mcp.py` 提供 Vercel Serverless 形态的 Streamable HTTP 入口（`vercel.json` 将 `/mcp` 重写至 `/api/mcp`），已开启 `enable_dns_rebinding_protection` 并校验调用方 Token；`api/dxkp.py` 同样增加调用方鉴权，避免第三方 API 配额被公开刷取。

在 Claude Desktop 配置（`claude_desktop_config.json`）中接入：
```json
{
  "mcpServers": {
    "shopro-ai": {
      "command": "python",
      "args": ["E:\\Code\\AI\\Start\\Web\\Shopro\\mcp\\mcp_shopro_server_stdio.py"]
    }
  }
}
```

---

## 📚 知识库与专业文档导航 (`docs/`)

项目配套了覆盖商业、技术、Prompt 工程与竞品分析的完整知识库体系：

| 模块分类 | 文档路径 | 核心内容与价值 |
|---|---|---|
| **AI能力与成本** | [`docs/ai/ai.md`](docs/ai/ai.md) | **AI能力与提示词矩阵报告**：文本模态已全量改标 GLM-5.3-Flash 主通道（含提示词增强与竞品风格复刻），详细梳理语音、视频模型选型、多模态流转拓扑、各环节 API 成本估算、Fallback 链路与能力真实度分级清单。 |
| **宣传片分镜** | [`docs/ai/vedio.md`](docs/ai/vedio.md) | **宣传片尾页分镜指南**：5 秒商业片尾逐秒拆解，集成 Runway、Sora、可灵、即梦等中英文对照顶级提示词与音频后期指南。 |
| **算力评估** | [`docs/ai/GMI.md`](docs/ai/GMI.md) | **GMI与基础设施报告**：云端算力调度与生产基础设施评估。 |
| **产品规格** | [`docs/prd/PRD.md`](docs/prd/PRD.md) | **产品需求规格说明书**：完整阐述商家端与运营端的全功能蓝图、交互流程与业务校验逻辑。 |
| **市场竞品** | [`docs/prd/竞品.md`](docs/prd/竞品.md) | **行业竞品分析报告**：横向深度对标 HeyGen、CapCut、TikTok Symphony 等竞品的优劣势与差异化壁垒。 |
| **现状基准** | [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) | **系统实测现状报告**：模块规模、18 个边缘函数现状矩阵、安全基线与 P0 落地验收、`phase3-assistant` 14 个 Action 真实清单与真实度标注。 |
| **后端治理** | [`docs/后端.md`](docs/后端.md) | **后端与数据层整改规范**：密钥隔离、RPC 权限收敛、回调验签与降级透明化。 |
| **技能框架** | [`skill-creator/`](skill-creator/) | **AI Agent 技能套件**：标准化 Agent 技能规范、评估测试集运行引擎（eval-viewer）及自动化测试脚本。 |

---

## ⚙️ 部署指南

### 1. 商家创作端部署 (`src/` - React 18 + Supabase)

#### 环境要求
*   **Node.js**: 18.3.1 或更高版本
*   **包管理器**: **pnpm** (推荐 pnpm 10.34.5) 或 npm
*   **Supabase CLI**: 最新稳定版 (本地 Deno 测试及数据库迁移推送)
*   **浏览器**: 现代主流浏览器（支持 WebRTC 录音与 SSE 流式）

#### 关键环境变量与本地代理
开发态不直接请求厂商域名，而是由 `vite.config.ts` 代理转发，同时避免 CORS 与密钥暴露：

| 代理前缀 | 真实上游 | 用途 | 对应环境变量 |
|---|---|---|---|
| `/glm-api` | `https://www.sophnet.com/api/open-apis` | GLM-5.3-Flash 文本主通道（注意 rewrite 必须映射到真实前缀，仅剔除前缀会被 nginx 405 拒绝） | `VITE_GLM_API_KEY` / `VITE_GLM_BASE_URL` / `VITE_GLM_MODEL` |
| `/tokendance-api` | `https://tokendance.space` | Seedance Mini / Wan3.0 / MiniMax H3 / HappyHorse 1.1 视频网关 | `VITE_SEEDANCE_MINI_API_KEY`、`VITE_WAN3_API_KEY`、`VITE_MINIMAX_API_KEY`、`VITE_HAPPYHORSE_API_KEY` |
| `/dxkp-api` | `https://ai.dxkp.com` | DeepSeek-V4 回退链与 Seedance 网关 | `VITE_DEEPSEEK_API_KEY` |
| `/siliconflow-api` | `https://api.siliconflow.cn` | CosyVoice2 TTS / TeleSpeechASR / 文本兜底 | `VITE_SILICONFLOW_API_KEY` |
| `/gmicloud-api` | `https://console.gmicloud.ai` | 云算力接口探测 | — |

> 边缘函数侧密钥一律通过 `supabase secrets set GLM_API_KEY=… DEEPSEEK_API_KEY=… SILICONFLOW_API_KEY=…` 注入，缺失时函数返回 503 并记录审计日志，不再回退明文常量。

#### 步骤说明
```bash
# 1. 安装项目依赖
pnpm install

# 2. 配置环境变量 (代码内置默认安全回退，亦可使用 .env 自定义)
cp .env.example .env

# 3. 本地开发与代码质检
pnpm run dev      # 启动本地开发服务 (vite.config.dev.ts，支持 0.0.0.0 局域网访问)
pnpm run lint     # tsgo 类型检查 + biome lint + 规范脚本校验
pnpm run build    # 编译生成生产包

# 4. 部署 Supabase 数据库迁移 (应用全部 25 个 SQL 迁移文件)
supabase link --project-ref <your-project-ref>
supabase db push
```

> **托管环境迁移提醒**：若使用平台托管的 Supabase 实例（如秒搭），`git push` **不会**自动应用 `supabase/migrations/` 下的 SQL；积分、RLS 等结构变更必须手动执行迁移 SQL（或 `supabase db push`）后才能在线生效，否则会出现 `credit_logs` 缺列导致扣积分失败一类的线上缺陷。

### 2. 厂商运营后台部署 (`backend/` - Vue 3 + Element Plus)

```bash
# 1. 进入厂商运营后台工程目录
cd backend

# 2. 安装 pnpm 依赖
pnpm install

# 3. 启动开发服务器 (默认启用 MSW Mock 模拟)
pnpm dev

# 4. 编译生产产物
pnpm build
```
编译产物位于 `backend/dist/`，可直接发布到 EdgeOne / Cloudflare Pages / Netlify 等静态托管平台，或复制到 Spring Boot 的 `src/main/resources/static` 目录下。

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

### 🌐`ai-assistant` — 统一 AI 网关

> **端点**：`POST /functions/v1/ai-assistant`（强制 JWT，严禁无合法 Token 时信任 Request Body 中的 `user_id`）  
> **请求格式**：`{ "action": "<action>", "user_id": "<uid>", ...params }`  
> **模型链路**：`callLLM` 默认 **GLM-5.3-Flash 优先 + 网关 DeepSeek 回退**；启发式预设分支响应带 `degraded: true`。

| Action | 功能描述 | 核心参数 | 响应数据 |
|--------|---------|---------|---------|
| `generate_selling_points` | 商品卖点生成 | `product_name`, `category`, `description` | `{ selling_points: string[] }` |
| `extract_url_selling_points` | URL 网页卖点提取 | `url` | `{ selling_points: string[] }` |
| `optimize_prompt` | 视频 Prompt 优化（英文输出） | `prompt`, `product_name`, `platform`, `style` | `{ optimized_prompt: string }` |
| `generate_storyboard` | 分镜脚本生成 | `product_name`, `selling_points[]` | `{ shots: Shot[] }` |
| `generate_script_four_layer` | CoT 四层流式脚本生成 | `product_name`, `category`, `selling_points`, `audience`, `platform`, `video_length` | `{ scenes: Scene[], prompt_text, script_id }` |
| `analyze_traffic` | 流量完播率预测 | `duration`, `has_subtitle`, `pacing`, `bgm_tempo`, `product_category` | `{ completion_rate, click_rate, suggestions[] }` |
| `analyze_style` | 竞品视频风格分析 | `source_url`, `source_type` | `{ rhythm, pacing, virality_score, … }` |
| `analyze_style_deep` | 竞品风格深度文字解读 | `dna_fingerprint`, `rhythm`, `virality_score`, … | `{ analysis: string }` |
| `generate_ab_variants` | A/B 变体脚本生成 | `product_name`, `variant_count` | `{ variants: Variant[] }` |
| `extract_highlights` | 直播高光切片提取 | `video_url`, `user_id` | `{ highlights[] }` |
| `knowledge_rag_search` | RAG 向量知识库检索 | `query`, `user_id`, `limit` | `{ results: KBItem[] }` |
| `emotion_analysis` | 台词 NLP 情绪分析 | `sentences: string[]` | `[{ emotion, intensity, color, suggestion }]` |
| `translate_script` | 多语种脚本翻译 | `script`, `source_lang`, `target_lang` | `{ translated: string }` |
| `generate_cover` | AI 封面图生成任务提交 | `product_name`, `style`, `platform` | `{ task_id: string }` |
| `query_cover_task` | 封面生成任务状态查询 | `task_id` | `{ status, image_url }` |
| `content_moderation` | 内容安全审核 | `text` | `{ safe: boolean, flags[] }` |
| `retry_video_job` | 失败视频任务重试 | `project_id`, `user_id` | `{ success: boolean }` |
| `generate_video` | 视频生成任务提交（Seedance） | `project_id`, `prompt`, `materials[]` | `{ success, request_id }` |

### 🧠`glm-5-3-flash` — 文本大模型主通道

> **端点**：`POST /functions/v1/glm-5-3-flash`（需 `Authorization: Bearer <JWT>`）  
> **上游**：Sophnet 平台 OpenAI 兼容 `/v1/chat/completions`，模型 `glm-5.3-flash`，密钥由 `GLM_API_KEY` 环境变量注入。  
> **降级链**：sophnet → dxkp 网关 → SiliconFlow；`max_tokens` 预算 2048（含强制思维链预留）。  
> **前端直连兜底**：开发态可直接走 `/glm-api/v1/chat/completions` 代理，与边缘函数双通道共存。

### 🎬 视频生成网关（前端直连 + 异步任务轮询）

| 模型 | 网关与协议 | 提交 / 查询入口 | 关键参数 |
|---|---|---|---|
| **Seedance 2.0**（默认） | Tokendance / Volcengine Ark v3 | `src/lib/seedancemini` → `/tokendance-api` generations & tasks | `model`、`content[]`（参考图/首尾帧）、`resolution`、`ratio`、`duration` |
| **Wan3.0 Prime** | Tokendance 异步任务 | `src/lib/wan3` | `size`、`duration`、参考图 |
| **MiniMax H3 Max** | Tokendance Video V2 | `src/lib/minimax` | `prompt`、`duration`、分辨率 |
| **HappyHorse 1.1** | Tokendance / DashScope 异步 | `src/lib/happyhorse` | `model: happyhorse-1.1-t2v`，必须携带 `X-DashScope-Async: enable`，`parameters.size/duration` |
| **Kling-V3** | Supabase Edge Function | `/functions/v1/kling-video-create` / `kling-video-query` | 任务创建与状态轮询 |
| **Seedance (dxkp 网关)** | 第三方代理 | `src/lib/vectrust` → `/dxkp-api/v1/video/generations` | 生产环境由 `api/dxkp.py` 代理并鉴权 |

> 各模型参数规格存在差异（分辨率/时长/字段名称不一），提交前必须按模型分支适配，否则会被网关 400 静默降级。

### 📺`seedance` — Seedance 2.0 视频生成

> **端点**：`POST /functions/v1/seedance`

| Action | 功能 | 核心参数 | 响应 |
|--------|------|---------|------|
| `create` | 提交视频生成任务 | `prompt`, `first_frame`, `last_frame`, `duration`, `resolution`, `ratio`, `seed` | `{ task_id }` |
| `query` | 查询任务状态 | `task_id` | `{ status, video_url, progress }` |

### 🤖`phase3-assistant` — 综合后端

> **端点**：`POST /functions/v1/phase3-assistant`（需 `Authorization: Bearer <JWT>`）

| Action | 功能描述 |
|--------|---------|
| `add_competitor` | 添加竞品监控账号 |
| `crawl_competitor` | 抓取竞品视频数据（未配置爬虫时支持显式标记模拟数据） |
| `analyze_live_highlight` | 直播高光分析与 ASR 切片建议 |
| `generate_api_key` | 生成 OpenAPI 密钥（`ak_…`） |
| `revoke_api_key` | 撤销 API 密钥 |
| `create_team` | 创建团队空间 |
| `get_team` | 查询用户当前团队及成员列表 |
| `create_invitation` | 邀请团队成员 |
| `remove_member` | 移除团队成员 |
| `change_member_role` | 更新成员角色（管理员/成员等） |
| `create_publish_task` | 创建跨平台定时发布任务 |
| `publish_video` | 执行视频发布（模拟演示模式） |
| `update_style_preference` | 保存创作者个性化风格偏好 |
| `generate_personalized_script` | 结合风格偏好 Few-shot 生成专属带货脚本 |

### 💳 微信支付 API

| 端点 | 功能描述 |
|------|---------|
| `POST /functions/v1/create-payment-order` | 创建微信支付订单 + 返回二维码 URL |
| `POST /functions/v1/wechat-payment-webhook` | 微信支付成功回调验签（防重放+签名校验）+ 充值入账 |

### 🎙️ 音频 API

| 端点 | 功能 | 核心参数 |
|------|------|---------|
| `POST /functions/v1/siliconflow-audio` | CosyVoice2 TTS 情感合成 | `text`, `voice_id`, `emotion` |
| `POST /functions/v1/stepaudio` | TeleSpeechASR 录音转写 | `audio_base64`, `language` |

### 🔗 备选模型 API

| 端点 | 功能描述 |
|------|---------|
| `POST /functions/v1/deepseek-v4-pro` | DeepSeek V4 直连代理（带 API Fallback） |
| `POST /functions/v1/minimax-chat` | MiniMax-M3 对话代理 |
| `POST /functions/v1/kling-video-create` | 可灵视频任务创建 |
| `POST /functions/v1/kling-video-query` | 可灵视频任务状态查询 |
| `POST /functions/v1/sora-video-create` | Sora 视频任务创建 |
| `POST /functions/v1/sora-video-query` | Sora 视频任务状态查询 |
| `POST /functions/v1/wenxin-text-generation` | 百度文心一言文本代理 |
| `POST /functions/v1/send-sms-code` | 发送手机短信验证码 |
| `POST /functions/v1/verify-sms-code` | 验证短信验证码登录 |

---

## 💡 总结与展望

### 📌 总结

Shopro AI 是一套面向 **带货短视频量产** 领域的一站式 SaaS 系统。项目融合了 Seedance 2.0 / Kling-V3 / Wan3.0 / MiniMax H3 / HappyHorse 1.1 构成的五模型视频矩阵， GLM-5.3-Flash、CosyVoice2-0.5B、TeleSpeechASR，以及以极高的工程化完成度打通了“商家创作端 + 厂商运营中台 + MCP 智能体生态”的完整商业化闭环，包含“文案-配音-画面-积分守卫与审计-风控复核-算力退款-数据回流-团队协作-支付-自定义模型-开放生态”全链条功能，具有极高的商业化落地价值和出海想象空间。

---

<p align="center">
  <sub>Built with ❤️ by Shopro AI 研发团队 · 跨境电商 AIGC 带货短视频创作平台</sub>
</p>
