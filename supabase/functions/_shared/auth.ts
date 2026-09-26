import { createClient, User } from 'npm:@supabase/supabase-js@2';

export interface AuthResult {
  user: User | null;
  userId: string | null;
  isServiceRole: boolean;
  error: string | null;
}

export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!token) {
    return { user: null, userId: null, isServiceRole: false, error: '缺少 Authorization 凭据' };
  }

  // 1. 判断是否是内部 service_role 凭据
  if (serviceRoleKey && token === serviceRoleKey) {
    return { user: null, userId: 'service_role', isServiceRole: true, error: null };
  }

  // 2. 校验 JWT 合法性并提取 auth.uid()
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, userId: null, isServiceRole: false, error: '服务端 Supabase 环境变量未配置' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return {
      user: null,
      userId: null,
      isServiceRole: false,
      error: error?.message || '无效或已过期的登录令牌',
    };
  }

  return {
    user: data.user,
    userId: data.user.id,
    isServiceRole: false,
    error: null,
  };
}

export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
