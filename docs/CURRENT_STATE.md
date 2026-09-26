# 📋 Shopro AI - 系统实测现状基准报告 (Current State Baseline)

> **文档说明**：本文件作为系统实际落地状态的唯一事实来源（Single Source of Truth），反映经过安全性加固与契约治理后的真实系统现状，避免历史开发文档与实际代码产生偏差。

---

## 1. 系统模块规模实测

| 模块 | 文件数 / 规模 | 运行环境 / 框架 | 端口 / 协议 | 说明 |
|---|---|---|---|---|
| **商家端创作前端 (`src/`)** | 42 个页面，56 个组件 | React 18 + Vite + Tailwind CSS | `http://localhost:5173` | 电商 AIGC 脚本与视频创作工作台 |
| **厂商中台运营管理 (`backend/`)** | 14 个业务页 + 1 个 403 页 | Vue 3 + Vite + Element Plus + Pinia | `http://localhost:5175` | 48 个标准 REST 端点，MSW 2.x 浏览器仿真 |
| **Edge Functions (`supabase/functions/`)** | 17 个微服务函数 | Deno TypeScript | Supabase Edge Runtime | 统一 `_shared` 鉴权与 CORS 中间件 |
| **数据库层 (`supabase/migrations/`)** | 24 个 SQL 迁移文件 | PostgreSQL 15 + Supabase | pg_graphql / PostgREST | RLS 行级权限 + 原子扣费 RPC + 权限收敛 |
| **MCP 工具服务 (`mcp/` + `api/`)** | 7 大核心多模态工具 | Python 3.10+ FastMCP / Starlette | Streamable HTTP (`127.0.0.1:8080`) | 强制 API Key 鉴权 + 启用 DNS 重绑定防护 |

---

## 2. 17 个 Edge Functions 现状矩阵

| # | 边缘函数名称 | 鉴权方式 | 状态 / 上游调用 | 降级处理 |
|---|---|---|---|---|
| 1 | `ai-assistant` | 强制 JWT (`auth.uid()`) | 真实调用大模型 / 向量检索 | 8 个预设模板分支显式返回 `degraded: true` |
| 2 | `deepseek-v4-pro` | 强制 JWT | 真实代理 DeepSeek-V4 | 备选供应商切换日志与延迟审计 |
| 3 | `stepaudio` | 强制 JWT | 真实代理 StepAudio 2.5 ASR/TTS | 环境变量缺失即快速失败（禁止读取本地密钥） |
| 4 | `siliconflow-audio` | 强制 JWT | 真实代理硅基流动 CosyVoice2 | 情感与角色音色生成 |
| 5 | `seedance` | 强制 JWT | 真实代理 Seedance 2.0 视频生成 | 异步轮询任务状态 |
| 6 | `phase3-assistant` | 强制 JWT | 14 个复合业务 Action（竞品/高光/团队/发布） | 模拟数据显式标记 `simulated: true` |
| 7 | `create-payment-order` | 强制 JWT | 官方微信支付 SDK 真实统一下单 | 生成微信 Native 支付二维码 |
| 8 | `wechat-payment-webhook` | 微信支付签名 + 5分钟时间戳防重放 | 真实 AES-GCM 解密与订单/积分开通 | 内部异常返回 500 触发微信自动重试 |
| 9 | `kling-video-create` | 强制 JWT | 真实代理快手可灵视频任务创建 | — |
| 10 | `kling-video-query` | 强制 JWT | 真实代理快手可灵视频任务查询 | — |
| 11 | `minimax-chat` | 强制 JWT | 真实代理 MiniMax 对话模型 | — |
| 12 | `sora-video-create` | 强制 JWT | 真实代理 Sora 视频任务创建 | — |
| 13 | `sora-video-query` | 强制 JWT | 真实代理 Sora 视频任务查询 | — |
| 14 | `send-sms-code` | 手机号格式校验 + 频控（60s冷却/单日10次） | 聚合网关短信验证码发送 | 频控拦截返回 429 防短信轰炸 |
| 15 | `verify-sms-code` | 手机号与验证码校验 | 聚合网关验证码核销 | 统一 CORS 与错误响应结构 |
| 16 | `wenxin-text-generation` | 强制 JWT | 真实代理百度文心大模型 | 备选文本生成链路 |
| 17 | `setup-demo` | 仅限 `service_role` 或 `ENABLE_SETUP_DEMO=true` | 演示账号自动生成脚本 | 非受权调用直接 403 拦截 |

---

## 3. 安全基线与加固措施（P0 落地验收）

1. **密钥隔离与追踪治理 (R1)**：
   - 彻底从 Git 索引移除 5 个历史 `key.txt` 文件，并将其加入 `.gitignore`。
   - 移除 `ai-assistant` 与 `stepaudio` 源码中 `Deno.readTextFile('./key.txt')` 的本地兜底逻辑，强制所有 API Key 从环境变量读取，缺失即快速失败。
2. **支付链路验签闭环 (R2)**：
   - `wechat-payment-webhook` 校验 `Wechatpay-Timestamp`、`Wechatpay-Nonce` 与 `Wechatpay-Signature` 头部。
   - 限制时间戳在 5 分钟（300s）防重放攻击窗口内。
   - 异常时向微信返回 HTTP 500 (`{ "code": "FAIL", "message": "..." }`)，以便微信支付通知重试机制生效。
3. **统一中间件与身份防伪造 (R3 / R7)**：
   - 抽取 `supabase/functions/_shared/` 统一维护 `cors.ts`、`auth.ts`、`errors.ts`。
   - `ai-assistant` 中严禁无合法 JWT 时信任客户端 Request Body 中传入的 `user_id`，防止越权伪造他人身份扣费。
   - `setup-demo` 端点增加 `service_role` 鉴权与环境变量开关拦截。
4. **MCP 协议与 API 代理加固 (R4)**：
   - `mcp_shopro_server.py` 恢复 Bearer Token / API Key 校验逻辑；默认绑定地址收紧为 `127.0.0.1`。
   - `api/mcp.py` 开启 DNS Rebinding 防护 (`enable_dns_rebinding_protection = True`) 并增加调用方 Token 校验。
   - `api/dxkp.py` 增加调用方鉴权校验，禁止公开被刷取第三方 API 配额。
5. **AI 真实度与降级标记透明化 (R5)**：
   - 为 `ai-assistant` 预设分支（分镜生成、流量估算、视觉风格分析、A/B测试变体、高光分段、情绪起伏、品类卖点模板）增加 `"degraded": true` 及 `"degraded_reason"` 响应标识。
   - 为 `phase3-assistant` 中的 `crawl_competitor`、`analyze_live_highlight`、`publish_video` 增加 `"simulated": true` 标识，严禁以随机数冒充真实爬取数据。

---

## 4. `phase3-assistant` 14 个 Action 真实清单

| Action | 业务分类 | 功能描述 | 真实度 |
|---|---|---|---|
| `add_competitor` | 竞品监控 | 添加竞品账号至监控列表 | 真实入库 |
| `crawl_competitor` | 竞品监控 | 抓取竞品最新视频数据 | 未配置外部爬虫时返回模拟数据并带 `simulated: true` |
| `analyze_live_highlight` | 直播切片 | 直播回放高光分段与 ASR 识别 | 未接入大模型时返回模拟分段并带 `simulated: true` |
| `generate_api_key` | 开放能力 | 生成 OpenAPI 调用密钥（`ak_...`） | 真实 SHA-256 哈希入库 |
| `revoke_api_key` | 开放能力 | 撤销指定 API 密钥 | 真实状态更新 |
| `create_team` | 团队协作 | 创建组织/团队空间 | 真实多表事务性写入 |
| `get_team` | 团队协作 | 获取当前所属团队与全部成员 | 真实关联查询 |
| `create_invitation` | 团队协作 | 生成成员邀请链接与 Token | 真实入库 |
| `remove_member` | 团队协作 | 移除团队成员（仅限 Owner） | 真实权限判断与状态变更 |
| `change_member_role` | 团队协作 | 修改成员角色权限 | 真实权限判断与更新 |
| `create_publish_task` | 分发矩阵 | 创建定时发布任务 | 真实入库 |
| `publish_video` | 分发矩阵 | 模拟视频发布到平台 | 显式标记 `simulated: true` |
| `update_style_preference` | 风格定制 | 保存创作者个性化风格配置 | 真实 upsert |
| `generate_personalized_script` | 风格定制 | 结合历史脚本与偏好生成新脚本 | 真实 Few-shot Prompt 大模型生成 |
