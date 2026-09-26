/**
 * useCredits - 积分余额实时查询与原子扣减 Hook（P0-核心闭环）
 *
 * 规则口径：新用户注册默认 20 积分；视频生成固定消耗 10 积分/次（见 creditGuard.ts 与迁移 00025）
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CreditLog } from '@/types/types';
import { insufficientCreditsMessage, openCreditsDialog } from '@/lib/creditGuard';
import { toast } from 'sonner';

export interface CreditsState {
  creditsTotal: number;
  creditsUsed: number;
  creditsLeft: number;
  usagePercent: number;
  loading: boolean;
  planName: string;
}

// ── 模块级余额缓存：供 creditGuard 零网络请求前置校验使用 ────────────────────
let _latestCreditsLeft: number | null = null;
/** 读取最近一次已知的积分余额；尚未获取过时返回 null（调用方自行回源） */
export function peekCreditsLeft(): number | null {
  return _latestCreditsLeft;
}

export function useCredits() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditsState>({
    creditsTotal: 20, creditsUsed: 0, creditsLeft: 20,
    usagePercent: 0, loading: true, planName: '免费版',
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = useCallback(async () => {
    if (!user) { setState(s => ({ ...s, loading: false })); return; }
    setState(s => ({ ...s, loading: true }));
    try {
      const { data } = await supabase
        .from('user_plans')
        .select('credits_total, credits_used, plans(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const total = data.credits_total ?? 20;
        const used = data.credits_used ?? 0;
        const left = Math.max(0, total - used);
        _latestCreditsLeft = left;
        setState({
          creditsTotal: total,
          creditsUsed: used,
          creditsLeft: left,
          usagePercent: total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0,
          loading: false,
          planName: (data.plans as { name?: string } | null)?.name ?? '免费版',
        });
      } else {
        // 兜底逻辑：无 user_plans 记录时默认给予 20 初始积分（与注册赠送一致）
        _latestCreditsLeft = 20;
        setState({
          creditsTotal: 20,
          creditsUsed: 0,
          creditsLeft: 20,
          usagePercent: 0,
          loading: false,
          planName: '免费版',
        });
      }
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // 1. Supabase Realtime 跨端/多标签页实时监听 (user_plans & credit_logs)
  useEffect(() => {
    if (!user?.id) return;

    try {
      const channel = supabase
        .channel(`user-credits-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_plans',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetch();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'credit_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetch();
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch (e) {
      console.warn('[useCredits] Realtime 订阅初始化跳过:', e);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, fetch]);

  // 2. 监听本地自定义事件（保留兼容本地迅速响应）
  useEffect(() => {
    const handleChanged = () => { fetch(); };
    window.addEventListener('credits_changed', handleChanged);
    return () => window.removeEventListener('credits_changed', handleChanged);
  }, [fetch]);

  return { ...state, refresh: fetch };
}

/**
 * deductUserCredits - 扣除用户积分
 * 唯一原子路径：数据库 SECURITY DEFINER RPC deduct_credits（FOR UPDATE 行锁 + 余额校验 + 流水写入，杜绝并发双扣）
 */
export async function deductUserCredits(
  userId: string,
  amount: number,
  description: string,
  type: CreditLog['type'] = 'video_generate'
): Promise<{ success: boolean; creditsLeft: number; message?: string; insufficientCredits?: boolean }> {
  if (!userId) {
    return { success: false, creditsLeft: 0, message: '请先登录账号' };
  }

  try {
    // 唯一原子路径：执行数据库 RPC deduct_credits（返回 jsonb: { ok, credits_left }）
    const { data: rpcData, error: rpcError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_action: description || type,
    });

    if (rpcError) {
      console.warn('[useCredits] deduct_credits RPC 失败:', rpcError.message);
      const isInsufficient = rpcError.message?.includes('积分不足') || rpcError.message?.includes('insufficient');
      if (isInsufficient) {
        // 余额不足：标准文案 + 自动弹出积分管理与充值弹窗
        let left = _latestCreditsLeft ?? 0;
        if (left <= 0) {
          const { data: plan } = await supabase
            .from('user_plans')
            .select('credits_total, credits_used')
            .eq('user_id', userId)
            .maybeSingle();
          left = Math.max(0, (plan?.credits_total ?? 0) - (plan?.credits_used ?? 0));
        }
        toast.error(insufficientCreditsMessage(left, amount), { duration: 6000 });
        openCreditsDialog();
        return { success: false, creditsLeft: left, insufficientCredits: true, message: insufficientCreditsMessage(left, amount) };
      }
      return {
        success: false,
        creditsLeft: 0,
        message: `扣除积分失败：${rpcError.message || '系统繁忙，请稍后重试'}`,
      };
    }

    // RPC 成功：优先采用 RPC 返回的最新余额（00024+ jsonb 版本）；
    // 旧版 RPC（00013 void）无返回值时回退为重查一次，保证两种线上版本均正确
    let left = Number(rpcData?.credits_left);
    if (!Number.isFinite(left) || rpcData === null) {
      const { data: latestPlan } = await supabase
        .from('user_plans')
        .select('credits_total, credits_used')
        .eq('user_id', userId)
        .maybeSingle();
      left = Math.max(0, (latestPlan?.credits_total ?? 0) - (latestPlan?.credits_used ?? amount));
    }
    left = Math.max(0, left);
    _latestCreditsLeft = left;

    // 广播本地事件 & 跨标签页
    window.dispatchEvent(new CustomEvent('credits_changed', { detail: { creditsLeft: left } }));

    return {
      success: true,
      creditsLeft: left,
    };
  } catch (err: any) {
    console.error('扣除积分过程产生错误:', err);
    return {
      success: false,
      creditsLeft: 0,
      message: '扣除积分过程产生错误',
    };
  }
}

/**
 * refundGenerationCredits - 视频生成失败自动退还积分（失败回滚）
 * 经 ai-assistant 边缘函数 refund_generation_credits action 执行（refund_credits RPC 仅限 service_role），
 * 逐笔审计入账，保障「失败不扣费、重试不重复扣费」。
 */
export async function refundGenerationCredits(
  userId: string,
  amount: number = 10,
  reason: string = '视频生成失败，自动退还积分'
): Promise<{ success: boolean; balance: number; message?: string }> {
  if (!userId) return { success: false, balance: 0, message: '请先登录账号' };
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { action: 'refund_generation_credits', amount, reason },
    });
    if (error) {
      console.warn('[useCredits] 退款失败:', error.message);
      return { success: false, balance: 0, message: error.message };
    }
    const balance = Math.max(0, Number(data?.data?.balance ?? data?.balance ?? 0));
    if (Number.isFinite(balance) && data) _latestCreditsLeft = balance;
    window.dispatchEvent(new CustomEvent('credits_changed', { detail: { creditsLeft: balance } }));
    return { success: true, balance };
  } catch (err: any) {
    console.error('[useCredits] 退款过程产生错误:', err);
    return { success: false, balance: 0, message: err?.message || '退款请求失败' };
  }
}

