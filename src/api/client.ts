/**
 * 统一 API 客户端基础工具类与错误归一化处理
 */
import { supabase } from '@/db/supabase';

export interface ApiResponse<T = any> {
  data: T | null;
  error: Error | null;
  success: boolean;
  status: number;
}

export interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
}

/**
 * 统一包装异步操作，捕获异常并归一化为统一结构
 */
export async function handleApiRequest<T>(
  fn: () => Promise<{ data: T | null; error: any; status?: number }>,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 15000 } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('请求超时，请检查网络或稍后重试')), timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    if (result.error) {
      const errMsg = result.error.message || result.error.details || '操作失败';
      return {
        data: null,
        error: new Error(errMsg),
        success: false,
        status: result.status || 400,
      };
    }
    return {
      data: result.data,
      error: null,
      success: true,
      status: result.status || 200,
    };
  } catch (err: any) {
    console.error('[ApiClient Error]:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
      success: false,
      status: 500,
    };
  }
}
