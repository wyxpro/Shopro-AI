# 🛒 Shopro AI -抖音/TikTok电商AIGC带货视频创作平台

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5.13-4FC08D?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7.2-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.0.7-646CFF?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element_Plus-2.9.1-409EFF?logo=elementplus&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2.103.1-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Spring Boot" src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?logo=springboot&logoColor=white" />
  <img alt="AI" src="https://img.shields.io/badge/AI-DeepSeek_v4_Flash-blue" />
  <img alt="Audio" src="https://img.shields.io/badge/Audio-CosyVoice2_TeleSpeech-orange" />
  <img alt="Video" src="https://img.shields.io/badge/Video-Seedance_2.0-violet" />
</p>

---

## 💎 项目简介
<img width="1280" height="705" alt="image" src="https://github.com/user-attachments/assets/8a2b2a47-b8a1-4b46-9a7a-efb9c1f16564" />
<img width="1280" height="679" alt="image" src="https://github.com/user-attachments/assets/cf2db694-ed54-4606-b7ca-6ff22854d3fb" />
<img width="1673" height="901" alt="image" src="https://github.com/user-attachments/assets/81e57fba-298c-41dc-aa94-c68a66cee6fb" />

**Shopro-AI 电商 AIGC 带货视频系统** 是一款面向国内外电商商家（如抖音、TikTok、小红书、Amazon、Shopee 等）的商业化 SaaS 平台。该系统通过深度融合先进的多模态大模型与全链路智能工作流，解决商家在短视频营销中面临的“文案撰写难、数字人/外籍演员贵、剪辑成本高、多语言本地化差、跨平台发布繁琐”等核心痛点。

系统构建了**商家端创作系统（C端/B端） + 厂商运营后台管理中台（Shopro-backend）** 的双端企业级解耦架构：
1. **商家创作端**：支持从「商品信息输入/URL 卖点提取 ➔ AI 智能脚本生成 ➔ 数字人选择与克隆 ➔ 多语言智能翻译 ➔ 分镜编辑 ➔ 素材混剪 ➔ 视频异步合成 ➔ 真实积分扣除与日志审计 ➔ 多平台一键发布与数据回流」的完整商业闭环，将传统的五人工作流压缩为“一人 + AI”，帮助商家以极低成本高速量产高转化的爆款短视频。
2. **厂商运营端**：提供企业级多租户 SaaS 运维中台，覆盖运营总览、算力积分调账、AI 工作流 Attempt 尝试级追踪与退款、内容风控证据链审计、订单与套餐版本快照及 MSW 零成本演示重置。

### ⚡ 核心价值与特色
*   **极致降本**：无需聘请外籍主播与剪辑师，注册送 50 初始积分，生成单条视频消耗 10 积分（10 积分 = 1 元），综合成本降至不足 1 元。
*   **极致增效**：从商品 URL 到生成多语种情感数字人口播视频仅需 3-5 分钟。
*   **转化导向**：引入营销学“说服框架”，对文案进行 CoT 分层打标签，自动映射数字人情绪。
*   **数据驱动**：集成 ROI 预测、A/B 分镜测试及投放数据回流闭环，越用越聪明。
*   **全自适应体验**：高精度的暗色/浅色玻璃态 UI，支持移动端和桌面端无缝响应。

---

## 🛠️ 技术栈

### 🌐 前端技术栈

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | React / Vue | 18.3.1 / 3.5.13 | 商家创作端 (React 18) 与 厂商运营后台 (Vue 3) |
| 开发语言 | TypeScript | 5.7.2 | 全链路强类型约束，提升工程可维护性 |
| 构建工具 | Vite | 6.0.7 / 5.4.1 | 极速热更新，生产资源打包优化与 Manual Chunks 分包 |
| 路由管理 | react-router-dom / Vue Router | 6.26.2 / 4.5.0 | 单页路由、受保护路由及 RBAC 权限路由守卫 |
| 状态/异步 | @tanstack/react-query / Pinia | 5.56.2 / 2.3.0 | 异步数据缓存、全局 Auth 会话与乐观更新 |
| UI 组件 | Radix UI + Element Plus | 基础组件 / 2.9.1 | 商家端组件与厂商后台企业级表格/表单/仪表盘 |
| 样式系统 | Tailwind CSS / Vanilla CSS | 3.4.11 / CSS3 | 原子化布局、高精度玻璃态与后台全局主题覆盖 |
| 动画与图表 | framer-motion / Recharts / ECharts | 12.4.10 / 5.6.0 | 页面动效、商家端流量看板与厂商履算趋势折线图/环形图 |
| API 模拟 | MSW (Mock Service Worker) | 2.7.0 | 厂商后台 Service Worker 请求拦截与浏览器端数据持久化 |
| 代码质量 | Biome / tsgo | 2.4.5 / 0.0.1 | 极速 Lint、格式化及预构建类型检查 |

### ⚙️ 后端与数据服务

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| 云服务 BaaS | Supabase | Auth、DB、Storage、Edge Functions | 商家端全栈后端云服务托管 |
| 厂商后端标准 | Spring Boot | 3.x REST Server | 厂商后台 REST API (`/api/admin/**`) 生产接入标准 |
| 数据库 | PostgreSQL | 由 Supabase 托管 | RLS 物理数据隔离，pgvector 向量模糊搜索 |
| 账户认证 | Supabase Auth / JWT | 邮箱/手机登录与 JWT 会话 | 商家端与厂商后台 RBAC 权限校验与 Token 刷新 |
| 边缘计算 | Supabase Edge Functions | Deno 运行时 | AI 编排、支付闭环、竞品抓取、团队协作接口 |
| 实时流式 | SSE + eventsource-parser | 前端 `src/lib/sse.ts` 封装 | 实现打字机流式（SSE）文本响应解析 |
| 积分流水 | `deductUserCredits` + `credit_logs` | `src/hooks/useCredits.ts` | 真实扣减积分余额、全站事件广播并写入消费明细 |
| 统一 API 契约 | `ApiResponse<T>` / `PageResult<T>` | `{ code, message, data, traceId }` | 前后端统一响应外层结构与分页传输格式 |

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

## 📁 目录结构与 42 个核心页面

```text
Shopro AI/
├── Shopro-backend/                 # 🏢 厂商运营后台管理系统 (Vue 3 + Element Plus + MSW / Spring Boot)
│   └── Shopro-backend-main/        # 厂商后台源码、API 模块与 MSW 模拟引擎
│       ├── src/api/                # 厂商后台 REST API (auth, billing, credits, risk, system...)
│       ├── src/views/              # 8 大业务域运营管理页面 (Dashboard, Users, AI-Ops, Risk...)
│       ├── src/mocks/              # MSW 浏览器端 Mock 数据库与状态重置引擎
│       ├── README.md               # 厂商运营后台详细技术与架构设计文档
│       └── README1.md              # 厂商运营后台全量评估标准文档
├── public/
│   └── Shopro.mp4                 # 官网最新 1080P 高清全流程带货实操演示视频
├── src/
│   ├── App.tsx                    # 应用根组件，挂载 React-Query、AuthProvider、Toaster
│   ├── routes.tsx                 # 页面路由配置 (受保护路由与公开路由)
│   ├── main.tsx                   # React 项目打包入口
│   ├── index.css                  # 全局样式，包含 Tailwind 与玻璃态主题变量
│   ├── components/                # 业务公共组件
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx     # 核心主布局，实现全局搜索、积分余额显示、侧边栏及主题切换
│   │   ├── ui/                    # shadcn 风格原子级组件 (Button, Dialog, Badge, Input...)
│   │   ├── CoverCandidates.tsx    # AI 封面多候选展示与下载
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx        # Supabase Session 状态管理
│   ├── db/
│   │   └── supabase.ts            # Client 单例初始化
│   ├── hooks/
│   │   ├── use-mobile.tsx         # 移动端断点检测
│   │   ├── use-toast.ts           # Toast 通知
│   │   ├── useCredits.ts          # 积分余额实时查询、deductUserCredits 真实扣除与广播
│   │   └── useDraft.ts            # 页面内容本地缓存恢复
│   ├── lib/
│   │   ├── audioRecorder.ts       # 麦克风录音控制 (配合 StepAudio ASR)
│   │   ├── sse.ts                 # SSE 流式解析及 StepAudio / Seedance API 轮询
│   │   └── utils.ts               # CSS 样式合并等辅助函数
│   ├── pages/                     # 业务页面 (42个核心页面及子页面)
│   │   ├── LandingPage.tsx        # 品牌官网首页，播放 public/Shopro.mp4 1080P 实操演示
│   │   ├── LoginPage.tsx          # 登录注册页面 (支持验证码与密码双重认证)
│   │   ├── DashboardPage.tsx      # 工作台主页，展示快捷入口、生成历史和关键指标
│   │   ├── HomePage.tsx           # 视频生成工作流 (含「参考/商品/数字人/首尾帧」选品自动装载与 10 积分扣除)
│   │   ├── VideoCreatePage.tsx    # 视频生成配置中心 (向导式生成与积分扣减)
│   │   ├── VideoEditPage.tsx      # 可视化多轨道分镜编辑器 (字幕轨、人像轨、声轨)
│   │   ├── WorksPage.tsx          # 作品管理，包含合成进度及视频第一帧真实封面持久化
│   │   ├── MaterialsPage.tsx      # 素材库管理 (支持分类上传及删除)
│   │   ├── ProductsPage.tsx       # 商品管理，URL/口令多模态解析导入与「创建视频」跨页直连选品
│   │   ├── ProductSelectionPage.tsx# 智能选品工坊，16国真实选品矩阵与第三方数据引擎接入中心
│   │   ├── AvatarsPage.tsx        # 数字人库，支持上传头像图片及 StepAudio TTS 试听
│   │   ├── TemplatesPage.tsx      # 视频模板库，一键套用带货模板
│   │   ├── ScriptPage.tsx         # 脚本管理，可在此独立撰写、导出
│   │   ├── StyleCopyPage.tsx      # 爆款风格复刻页，输入竞品链接自动抽取节奏
│   │   ├── KnowledgePage.tsx      # 品牌/商品知识库 (用于 RAG 检索 Few-shot)
│   │   ├── CompetitorPage.tsx     # 竞品爆款监控分析
│   │   ├── LiveHighlightPage.tsx  # 直播高光切片提取器
│   │   ├── AnalyticsPage.tsx      # 流量漏斗、完播率及 ROI 分析图表
│   │   ├── DataDashboardPage.tsx  # 商业数据洞察全景看板 (大盘核心指标与趋势图)
│   │   ├── ProfilePage.tsx        # 个人中心及账号安全设置
│   │   ├── CreditsPage.tsx        # 积分商城与充值收银台 (真实展现 credit_logs 收支明细)
│   │   ├── OrderDetailPage.tsx    # 微信支付订单状态页
│   │   ├── PromptTemplatesPage.tsx# 系统 Prompt 策略管理页
│   │   ├── ActivitiesPage.tsx     # 操作日志与审计足迹
│   │   ├── InvitePage.tsx         # 邀请有礼推广页面
│   │   ├── PublishPage.tsx        # 跨平台多端发布 (抖音/TikTok/小红书/快手/B站排期发布)
│   │   ├── ABTestPage.tsx         # A/B 测试管理中心 (脚本/封面版本对比)
│   │   ├── EmotionAnalysisPage.tsx# NLP 情绪分析与时间轴对齐工作区
│   │   ├── MultiLangPage.tsx      # 多语言翻译控制台
│   │   ├── TaskQueuePage.tsx      # 视频生成异步任务队列监控
│   │   ├── ExportFormatsPage.tsx  # 跨平台多格式导出 (Excel/PDF/视频)
│   │   ├── LLMCachePage.tsx       # AI 缓存命中率监控与管理
│   │   ├── TeamSpacePage.tsx      # 团队协作空间 (角色权限、协作管理)
│   │   ├── OpenAPIPage.tsx        # 开放开发平台 (API Key 生成与 API 调试)
│   │   ├── DataFeedbackPage.tsx   # 广告回流与自学习面板
│   │   ├── TrendingPatternsPage.tsx# 千万级热门爆款视频模式分析
│   │   ├── PersonalizePage.tsx    # 账号私有风格模型定制微调
│   │   ├── BatchCreatePage.tsx    # 批量生成管理器 (批量计算并扣除积分)
│   │   ├── AiToolboxPage.tsx      # 营销 AI 工具箱 (关键词提取、字幕打点等)
│   │   ├── NotificationsPage.tsx  # 系统通知中心
│   │   ├── Index.tsx              # 根路径重定向索引页
│   │   └── NotFound.tsx           # 404 兜底页
│   └── types/
│       ├── types.ts               # 数据模型 (Product, Material, CreditLog, Job...)
│       └── route.ts               # 路由定义
├── supabase/
│   ├── functions/                 # 16 个 Deno 边缘函数微服务
│   │   ├── ai-assistant/          # 统一 AI 网关，内置 llm 动作控制
│   │   ├── deepseek-v4-pro/       # DeepSeek V4 文本生成代理 (带 API Fallback)
│   │   ├── stepaudio/             # StepAudio 2.5 ASR 和 TTS 物理代理
│   │   ├── seedance/              # Seedance 2.0 异步视频生成/状态查询
│   │   ├── phase3-assistant/      # 竞品抓取、直播分析、团队、APIKey、发布管理
│   │   ├── create-payment-order/  # 创建微信支付订单及二维码生成
│   │   ├── wechat-payment-webhook/# 微信支付成功回调验签及充值入账
│   │   ├── query-payment-status/  # 支付轮询查询接口
│   │   ├── kling-video-create/    # 可灵视频任务创建
│   │   ├── kling-video-query/     # 可灵视频任务查询
│   │   ├── minimax-chat/          # MiniMax 接口代理
│   │   ├── sora-video-create/     # Sora 视频任务创建
│   │   ├── sora-video-query/      # Sora 视频任务查询
│   │   ├── send-sms-code/         # 验证码发送 (短信服务集成)
│   │   ├── verify-sms-code/       # 验证码登录验证
│   │   ├── wenxin-text-generation/# 百度文心代理 Edge Function
│   │   └── setup-demo/            # 演示数据初始化种子数据
│   └── migrations/                # 21 个 PostgreSQL 数据库迁移文件 (含 RLS 及防薅 RPC 锁)
```

---

## ⚡ 核心功能模块与工作流

### 🔄 全链路智能生成工作流

```
商品 URL / 口令输入
        │
        ▼
① 🕷️  URL 卖点智能提取
   DeepSeek-V4-Flash 解析 HTML → 输出 3 条核心卖点 JSON
        │
        ▼
② ✍️  CoT 四层营销脚本生成（SSE 打字机流式）
   卖点层 → 痛点层 → 钩子层（前3秒留存）→ CTA 转化层
        │
        ▼
③ 💰  积分真实扣除与审计记录
   deductUserCredits 校验余额 → 扣除 10 积分 → 写入 credit_logs 消费明细
        │
        ▼
④ 🎭  NLP 情感分析与数字人映射
   台词情绪极值分析 → 时间轴情绪标注 → 数字人表情/语气映射
        │
        ▼
⑤ 🎙️  多语种情感配音合成
   CosyVoice2-0.5B → 情感化口播 MP3 / TeleSpeechASR 录音转写
        │
        ▼
⑥ 🎬  Seedance 2.0 物理级视频渲染（异步队列）
   首尾帧参考图 + 音频声轨 → 720P 多模态合成视频 (第一帧图持久化封面)
        │
        ▼
⑦ ✂️  多轨道可视化编辑器（可选）
   字幕轨 / 人像轨 / 声音轨 / 特效轨 → 拖拽拼接
        │
        ▼
⑧ 🚀  跨平台一键发布 + 数据回流自调优
   抖音 / TikTok / 快手 / 小红书 / B站 定时发布 → ROI 回流 → AI 重写优化
```

### 1. 🎬 官网 1080P 核心演示视频 (`/Shopro.mp4`)
* **视频组件封装**：品牌官网首页 (`LandingPage.tsx`) 精准集成 `public/Shopro.mp4` 带货实操视频。
* **极速加载**：配置 `preload="metadata"` 确保首帧与时长秒级展现，支持进度拖拽、全屏播放与 HD 标志。

### 2. 💰 积分扣减与流水账单明细
* **全局扣费封装 (`deductUserCredits`)**：在 `src/hooks/useCredits.ts` 中集中管控积分逻辑。当用户点击“AI视频生成”时，系统校验可用余额，若余额充足则从 `user_plans` 的 `credits_used` 中真实扣除 10 积分（批量生成时按数量计算）。
* **收支审计明细 (`credit_logs`)**：扣除成功后自动插入 Supabase `credit_logs` 数据表，记录 `user_id`、`type: 'video_generate'`、`amount: -10`、`credits_after` 以及具体作品描述。
* **全站实时广播**：触发 `credits_changed` 自定义事件，使得顶部导航栏（`MainLayout`）、个人中心（`ProfilePage`）以及充值中心（`CreditsPage`）无需刷页面即刻同步展现最新余额与收支明细。

### 3. 🧠 AI 脚本与提示词增强工作台
*   **低延时中文流式打字机**：工作台“提示词增强”强约束纯中文输出，支持低延时平滑逐字/逐块打字机流式渲染，瞬间提升提示词专业度。
*   **视频生成模型矩阵**：集成了 7 大业界尖端视频生成模型，并配备厂商专属视觉标识：
    - ⚡ **Seedance 2.0** (ByteDance)
    - 💎 **happyhorse 1.0** (HappyHorse AI)
    - 👾 **Krea** (Krea AI)
    - ☁️ **wan2.7** (Alibaba Cloud 阿里通义)
    - 🎬 **Kling** (Kuaishou AI 快手可灵)
    - 📷 **Luma** (Luma Labs)
    - 🥞 **pixverse** (PixVerse)
*   **视频默认画质**：工作台默认配置 `720P · 16:9 · 5s` 标清爆款比例与高清帧率。
*   **分镜 CoT 架构**：基于思维链（CoT）四层营销架构，流式（SSE）生成分镜脚本：钩子（Hook）➔ 痛点（Pain Point）➔ 产品介绍（Product）➔ 行动召唤（CTA）。

### 4. 🛍️ 一键 URL / 口令解析商品导入 & 工作台商品联动 & 16国选品矩阵
*   **工作台「商品」Tab & 智能选品弹窗**：
    - 工作台视频生成输入区新增「商品」标签，支持在模态框中从 Supabase `products` 数据库实时调取商品。
    - 选择商品后，AI 自动提取规范标题、原价/活动价、商品分类、核心卖点与详细描述，智能合成结构化爆款带货视频 Prompt 脚本并自动填充至输入框。
*   **「商品管理」一键「创建视频」双向直连**：
    - 在商品卡片与表格操作栏提供一键「创建视频」按钮，采用自定义 `RedirectWithState` 路由透传机制，保障跨页面 `location.state` 状态不丢失；
    - 秒级直接跳转至主工作台 `/video/create` 视频生成界面并自动选中指定商品。
*   **一键 URL / 剪贴板口令解析导入**：
    - 支持抖音 🎵、TikTok 🎶、拼多多 🔴、淘宝 🟠、Shopee 🧡、亚马逊 📦、全网通用 🌐 等平台商品网页链接或分享口令（淘口令/抖音口令）。
    - 实时调用 **DeepSeek-V4-Flash** 多模态能力，自动提取规范标题、所属分类、原价/折后活动售价、三大 AI 核心卖点、商品实物封面图及详细描述。
    - 提供高亮亮彩纯白电商风格控制台，支持用户自定义编辑并一键存入 Supabase `products` 数据库。
*   **第三方数据引擎接入中心 (Data Engine Integration Center)**：
    - 智能选品支持数据引擎介入（FastData、EchoTik、GoodsFox、Kalodata、TikMeta、Shoplus）。
    - 默认激活 **FastData** 数据引擎为【已连接】，其余引擎均支持弹窗配置 API Endpoint 与 API Key 自定义介入。
*   **16 国爆款商品矩阵**：
    - 涵盖美国、印尼、英国、越南、泰国、马来西亚、菲律宾、西班牙、墨西哥、德国、法国、意大利、巴西、日本、新加坡等 16 个国家/地区，每国包含 5+ 真实实物无人物商品图片数据。

### 5. 🎬 作品素材与首帧封面动态提取 
*   **视频首帧动态截取**：全站 AI 生成视频保存至作品素材库时，自动调用 `extractVideoFirstFrame` 截取对应视频第一帧图片作为真实高保真封面。
*   **真实提示词绑定**：作品标题自动绑定并保存为用户输入的真实提示词内容（`prompt.trim()`），告别固定模板标题。

### 6. 👥 数字人情感合成与多轨剪辑 
*   **情绪对齐**：系统利用 NLP 分析台词的情感极值，在分镜时间轴上自动映射数字人的面部表情（平和、喜悦、担忧、激动、说服）与语气。
*   **多模态配音**：利用 `CosyVoice2-0.5B` 根据情感标记生成自然拟真的小语种配音。
*   **多轨道编辑器**：在网页端提供多轨道可视化 Canvas 剪辑面板，直观拖拽分镜卡片、配音音轨、字幕，实现免学习拼积木式合成。

### 7. 💡 流量追踪、A/B测试与广告回流 
*   **漏斗分析**：展示不同视频版本的转化漏斗图（播放量-完播率-点击率-成交金额），直接计算 ROI。
*   **A/B测试**：同一商品配置多组脚本/封面，在线追踪测试，智能淘汰低效版本。
*   **多平台发布**：可将渲染完成的视频直接调度至抖音、TikTok、小红书、快手或 B站，设定排期计划自动定时发布。
*   **自适应优化**：将真实投放转化差的文案数据回流，自动反馈给 AI 训练，对低分脚本进行“一键调优”重写。

### 8. 🔗 团队协作与 OpenAPI 开放平台 
*   **团队协作**：支持主账号创建团队空间，通过邮箱发送邀请凭证，配置管理员或协作者角色，共享素材库与作品集。
*   **OpenAPI 调试**：面向大商户或 ERP 系统，提供 `ak_...` 自定义 API 密钥生成、Revoke 控制，并附带在线交互式 API 沙箱调试器。

### 9. 🏢 厂商运营后台管理系统 (Shopro-backend)
https://shopro-backend.netlify.app/（测试模拟版）
*   **运营总览看板 (Dashboard)**：聚合展示 AI 履约成功率、订单净支付金额、服务影响指数及 ECharts 履约趋势与算力占比图表。
*   **客户与算力积分管理 (Customers & Credits)**：查看商家用户使用全景，动态配置能力与并发配额，支持带审计追踪的人工算力加/扣调账。
*   **AI 任务中心与 Attempt 日志下探 (AI Operations)**：工作流实时追踪，下探查看任务多次 retry 尝试记录 (Attempt)、第三方接口耗时与错误码，提供任务强切、失败重试及“故障失败算力退款”。
*   **智能内容风控治理 (Risk Governance)**：捕获涉黄、涉政、敏感违禁词事件，展示原始提示词与生成上下文证据链，支持处置（阻断/告警/忽略）与商家申诉二次复核。
*   **订单、退款与套餐版本快照 (Billing & Packages)**：提供订单流水明细与异常订单“权益一键补发”，覆盖退款申请审批全生命周期，支持算力套餐版本快照创建。
*   **系统运维与 MSW 零成本恢复 (System & Demo Reset)**：监控下游 AI 服务 health 状态，基于 RBAC 管理权限角色，支持在 Demo 模式下一键恢复 MSW 演示种子数据。
*   **生产环境 Spring Boot 无缝对接**：前端 API 统一为 `/api/admin/**`，采用 `ApiResponse<T>` / `PageResult<T>` 统一契约。生产环境修改 `VITE_USE_MOCK=false` 即可秒级接轨真实后端。

---

## ⚙️ 部署指南

### 1. 商家创作端部署 (React 18 + Supabase)

#### 环境要求
*   **Node.js**: 18.0 或更高版本
*   **包管理器**: npm / pnpm
*   **Supabase CLI**: 最新稳定版 (本地 Deno 测试及数据库迁移推送)

#### 步骤说明
```bash
# 1. 克隆与安装依赖
npm install

# 2. 本地开发与代码质检
npm run dev      # 启动本地开发服务
npm run lint     # 执行代码检查与格式化
npm run build    # 编译生成生产包

# 3. 部署 Supabase 数据库迁移 (应用全部 21 个 SQL 迁移文件)
supabase link --project-ref <your-project-ref>
supabase db push

# 4. 部署 16 个 Deno Edge Functions 边缘函数
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
supabase functions deploy wenxin-text-generation
supabase functions deploy setup-demo
```

### 2. 厂商运营后台部署 (Shopro-backend)

```bash
# 1. 进入厂商运营后台工程目录
cd Shopro-backend/Shopro-backend-main

# 2. 安装 pnpm 依赖
pnpm install

# 3. 启动开发服务器 (默认启用 MSW Mock 模拟)
pnpm dev

# 4. 编译生产产物
pnpm build
```
编译产物位于 `dist/`，可直接发布到 EdgeOne / Cloudflare Pages 等静态托管平台，或将 `dist/` 复制到 Spring Boot 的 `src/main/resources/static` 目录下。

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

> **端点**：`POST /functions/v1/ai-assistant`  
> **请求格式**：`{ "action": "<action>", "user_id": "<uid>", ...params }`

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
| `crawl_competitor` | 限制抓取竞品数据 |
| `list_competitors` | 列出竞品账号列表 |
| `generate_api_key` | 生成 OpenAPI 密钥（`ak_…`） |
| `revoke_api_key` | 撤销 API 密钥 |
| `list_api_keys` | 列出所有 API 密钥 |
| `create_publish_task` | 创建跨平台定时发布任务 |
| `list_publish_tasks` | 查询发布任务列表 |
| `invite_team_member` | 邀请团队成员（邮箱） |
| `list_team_members` | 列出团队成员及角色 |

### 💳 微信支付 API

| 端点 | 功能描述 |
|------|---------|
| `POST /functions/v1/create-payment-order` | 创建微信支付订单 + 返回二维码 URL |
| `POST /functions/v1/wechat-payment-webhook` | 微信支付成功回调验签 + 积分充值入账 |
| `POST /functions/v1/query-payment-status` | 轮询支付状态查询 |

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

Shopro AI 是一套面向 **带货短视频量产** 领域的一站式 SaaS 系统。项目融合了 DeepSeek-V4-Flash、CosyVoice2-0.5B、TeleSpeechASR、Seedance 2.0 等前沿多模态大模型，以极高的工程化完成度打通了“商家创作端 + 厂商运营中台”的完整商业化双端闭环，包含“文案-配音-画面-积分审计-风控复核-算力退款-数据回流-团队协作-支付”全链条功能，具有极高的商业化落地价值和出海想象空间。

---

<p align="center">
  <sub>Built with ❤️ by Shopro AI 研发团队 - AIGC带货视频</sub>
</p>
