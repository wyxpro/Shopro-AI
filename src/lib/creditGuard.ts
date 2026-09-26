/**
 * creditGuard - 积分体系端到端统一守卫（P0）
 *
 * 规则口径（前后端与数据库三处一致）：
 *  - 新用户注册默认 20 积分（见 supabase/migrations/00025_credit_rules_e2e.sql）
 *  - 每次视频生成固定消耗 10 积分（10 积分 = 1 元）
 *  - 剩余积分 ≥ 10 才可生成；不足时直接拦截并自动弹出「积分管理与充值」弹窗
 *
 * 所有触发生成的入口（首页工作台 / VideoCreatePage / BatchCreatePage 等）
 * 必须复用 ensureCreditsForGeneration，禁止各自实现导致不一致。
 */
import { supabase } from '@/db/supabase';
import { fetchUserCredits } from '@/api/credits';
import { toast } from 'sonner';

/** 视频生成固定单价：积分/次 */
export const VIDEO_GENERATE_COST = 10;

/** 新用户注册赠送积分 */
export const REGISTER_BONUS_CREDITS = 20;

/** 请求 MainLayout 打开「积分管理与充值」弹窗的全局事件 */
export const OPEN_CREDITS_DIALOG_EVENT = 'shopro:open-credits-dialog';

/** 打开积分管理与充值弹窗（MainLayout 监听后弹窗，默认定位充值 Tab） */
export function openCreditsDialog(): void {
  window.dispatchEvent(new CustomEvent(OPEN_CREDITS_DIALOG_EVENT));
}

/** 标准化余额不足提示文案 */
export function insufficientCreditsMessage(current: number, cost: number = VIDEO_GENERATE_COST): string {
  return `积分不足（当前 ${current}，单次生成需 ${cost}），请充值后重试`;
}

/**
 * 前置余额守卫：余额充足返回 true；不足时 toast 提示 + 自动弹出充值弹窗并返回 false。
 * 调用方必须在进入 loading / 调用大模型 / Edge Function / 写生成记录之前调用，
 * 返回 false 时应立即 return，确保「不足即拦截」且不发出任何生成相关网络请求。
 *
 * 余额读取优先使用 useCredits 维护的模块级缓存（MainLayout 全局挂载，通常已预热），
 * 仅在缓存缺失时回源查询一次，避免点击瞬间产生多余网络请求。
 */
export async function ensureCreditsForGeneration(
  userId: string | null | undefined,
  cost: number = VIDEO_GENERATE_COST
): Promise<{ ok: boolean; left: number }> {
  if (!userId) return { ok: true, left: 0 }; // 未登录沿用各页面既有演示流程，不拦截

  const { peekCreditsLeft } = await import('@/hooks/useCredits');
  let left = peekCreditsLeft();

  if (left === null) {
    const res = await fetchUserCredits(userId);
    left = res.data?.left ?? 0;
  }

  if (left < cost) {
    toast.error(insufficientCreditsMessage(left, cost), { duration: 6000 });
    openCreditsDialog();
    return { ok: false, left };
  }
  return { ok: true, left };
}
