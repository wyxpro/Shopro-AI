# Shopro AI 项目架构与开发指南

## 🏢 双端解耦架构概述

Shopro AI 采用**商家端创作系统 (React 18)** + **厂商运营中台 (Vue 3)** 的双端解耦企业级 SaaS 架构：

```text
Shopro AI/
├── src/                                  # 🛒 商家创作端 (React 18 + Vite + TS + TailwindCSS + Supabase)
│   ├── components/                       # UI 组件 (Radix UI / shadcn/ui + 业务自定义组件)
│   ├── hooks/                            # 自定义 Hook (useCredits, useAuth, useTheme 等)
│   ├── lib/                              # 工具库 (supabase.ts, sse.ts 实时流解析)
│   ├── pages/                            # 商家创作端各核心功能页面 (AI 脚本生成, 数字人, 素材库等)
│   └── routes.tsx                        # React Router 路由配置
│
├── Shopro-backend/Shopro-backend-main/    # 🏢 厂商运营中台 (Vue 3 + Element Plus + MSW / Spring Boot)
│   └── src/
│       ├── api/                          # REST API 客户端定义 (auth, billing, risk, system...)
│       ├── views/                        # 运营中台页面 (用户管理, 算力调账, AI风控, 审计等)
│       └── mocks/                        # MSW 浏览器端数据 Mock 与恢复引擎
│
└── supabase/                             # ⚡ Supabase 云后端配置与 Edge Functions
    └── functions/                        # Deno 运行时 AI 服务编排接口
```

---

## 🛒 商家创作端 (`src/`)

### 技术栈规范
- **框架**: React 18.3 + TypeScript 5.7
- **构建**: Vite 6.0
- **样式**: Tailwind CSS (原子化) + Vanilla CSS (高精度暗色玻璃态)
- **UI 组件**: Radix UI + shadcn/ui + Lucide Icons
- **状态与请求**: `@tanstack/react-query` (异步缓存与乐观更新) + Supabase Client

### 核心目录职责
- `src/components/ui/`: 通用 UI 原子组件（按钮、弹窗、下拉菜单等）
- `src/hooks/useCredits.ts`: 积分扣除与日志追踪的核心 Hook，所有消耗算力的操作必须通过该 Hook 操作。
- `src/lib/sse.ts`: 用于处理 AI 文本流式打字机效果（SSE EventSource）。

---

## 🏢 厂商运营后台 (`Shopro-backend/Shopro-backend-main/`)

### 技术栈规范
- **框架**: Vue 3.5 + Element Plus + TypeScript
- **状态**: Pinia
- **Mock/数据引擎**: MSW (Mock Service Worker 2.7)，支持脱离后端独立运行，同时预留了 Spring Boot `/api/admin/**` 的 REST 接口规范。

### 核心功能域
1. **运营总览与 Dashboard**: 算力履算趋势、活跃商家、算力消耗分布。
2. **多租户与算力调账**: 商家算力积分人工调账与冲正日志。
3. **AI 工作流 Attempt 追踪**: 支持追踪 AI 视频生成各环节 Attempt 日志，并提供一键退款机制。
