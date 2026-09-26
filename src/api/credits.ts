/**
 * 积分与套餐相关统一 API
 */
import { supabase } from '@/db/supabase';
import { handleApiRequest, type ApiResponse } from './client';

export interface UserCreditsInfo {
  total: number;
  used: number;
  left: number;
  planName?: string;
  status?: string;
}

export async function fetchUserCredits(userId: string): Promise<ApiResponse<UserCreditsInfo>> {
  return handleApiRequest(async () => {
    const res = await supabase
      .from('user_plans')
      .select('credits_total, credits_used, status, plan:plans(name)')
      .eq('user_id', userId)
      .maybeSingle();

    if (res.error) {
      return { data: null, error: res.error };
    }

    const total = res.data?.credits_total ?? 20;
    const used = res.data?.credits_used ?? 0;
    const left = Math.max(0, total - used);
    const planName = (res.data as any)?.plan?.name || '免费版';

    return {
      data: {
        total,
        used,
        left,
        planName,
        status: res.data?.status || 'active',
      },
      error: null,
    };
  });
}
