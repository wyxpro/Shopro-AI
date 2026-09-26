/**
 * 电商商品相关统一 API
 */
import { supabase } from '@/db/supabase';
import { handleApiRequest, type ApiResponse } from './client';

export interface ProductItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  sub_category?: string;
  description?: string;
  original_price?: number;
  sale_price?: number;
  stock?: number;
  cover_image?: string;
  images?: string[];
  selling_points?: string[];
  ai_selling_points?: string[];
  specs?: { name: string; value: string }[];
  target_platform?: string;
  target_language?: string;
  sales_count?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchProducts(options: {
  userId?: string;
  category?: string;
  search?: string;
} = {}): Promise<ApiResponse<ProductItem[]>> {
  return handleApiRequest(async () => {
    let query = supabase.from('products').select('*');
    if (options.userId) {
      const DEMO_UID = '7d58d08f-8aa3-43f5-a30f-b7495d59d147';
      query = query.or(`user_id.eq.${options.userId},user_id.eq.${DEMO_UID}`);
    }
    if (options.category && options.category !== '全部') {
      query = query.eq('category', options.category);
    }
    const res = await query.order('created_at', { ascending: false });
    return { data: res.data as ProductItem[], error: res.error };
  });
}
