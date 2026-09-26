import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://backend.appmiaoda.com/projects/supabase313589630060507136";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey) {
  console.warn("[Supabase] 环境变量 VITE_SUPABASE_ANON_KEY 未配置，请在 .env 中设置");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);