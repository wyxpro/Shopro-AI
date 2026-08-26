# AI 工作流与 Supabase Edge Functions 规范

## 🤖 核心 AI 模型与调用路由表

Shopro AI 对接了多模态 AI 模型链路，所有 AI 请求统一路由至 Supabase Edge Functions：

| 模块/功能 | 模型 API | Edge Function 端点 | 说明与参数规范 |
|---|---|---|---|
| **文案与营销脚本** | **DeepSeek-V4-Flash** | `/functions/v1/deepseek-v4-flash` | 自动生成短视频脚本、分镜提取、CoT 情感打标 |
| **语音合成与转录** | **CosyVoice2 / TeleSpeech** | `/functions/v1/siliconflow-audio` | 情感化数字人口播合成与高精度语音识别 (ASR) |
| **高精短视频合成** | **Seedance 2.0** | `/functions/v1/seedance` | 物理级多模态画质，异步提交任务 (`submit`) 与轮询查询 (`query`) |
| **爆款封面生成** | **Flux 1.1 Pro** | `ai-assistant` (generate_cover) | 高分辨率商品海报与封面 |
| **后备/辅助大模型** | MiniMax / 文心一言 / Kling | `/functions/v1/minimax-chat` 等 | 后备冗余服务，降级保障 |

---

## ⚡ 算力积分扣减与审计规范 (`useCredits`)

在商家创作端，任何产生 AI 算力消耗的操作（如脚本生成、视频合成、语音克隆）必须遵循严格的积分机制：

1. **扣扣逻辑与 Hook**:
   ```typescript
   import { useCredits } from "@/hooks/useCredits";

   const { deductUserCredits, balance } = useCredits();

   // 在触发 AI 生成前校验并扣除积分
   const handleGenerateVideo = async () => {
     const COST = 10; // 单条视频合成消耗 10 积分
     if (balance < COST) {
       toast.error("积分不足，请先充值");
       return;
     }

     const success = await deductUserCredits(COST, "Seedance 2.0 视频合成");
     if (!success) return;

     // 继续发起 AI 异步请求...
   };
   ```

2. **积分扣除标准**:
   - 文案生成 / AI 脚本: 1~2 积分
   - 语音合成 (CosyVoice2): 3 积分
   - 视频合成 (Seedance 2.0): 10 积分
   - 注册默认赠送: 50 初始积分

3. **退款机制与尝试日志 (Attempt Log)**:
   - 若 Edge Function 返回非 2xx 或任务状态为 `FAILED`，需调用后台 Attempt 审计或者反向触发积分退回。
