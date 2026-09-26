/**
 * 视频与项目相关统一 API
 */
import { supabase } from '@/db/supabase';
import { handleApiRequest, type ApiResponse } from './client';

export interface VideoProjectItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  video_style?: string;
  prompt_text?: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
}

export async function fetchVideoProjects(userId?: string): Promise<ApiResponse<VideoProjectItem[]>> {
  return handleApiRequest(async () => {
    let query = supabase.from('video_projects').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const res = await query;
    return { data: res.data as VideoProjectItem[], error: res.error };
  });
}

export async function createVideoProjectRecord(payload: Partial<VideoProjectItem>): Promise<ApiResponse<VideoProjectItem>> {
  return handleApiRequest(async () => {
    const res = await supabase.from('video_projects').insert(payload).select().single();
    return { data: res.data as VideoProjectItem, error: res.error };
  });
}

export async function updateVideoProjectRecord(id: string, updates: Partial<VideoProjectItem>): Promise<ApiResponse<VideoProjectItem>> {
  return handleApiRequest(async () => {
    const res = await supabase.from('video_projects').update(updates).eq('id', id).select().single();
    return { data: res.data as VideoProjectItem, error: res.error };
  });
}

export async function deleteVideoProjectRecord(id: string, userId?: string): Promise<ApiResponse<null>> {
  return handleApiRequest(async () => {
    let query = supabase.from('video_projects').delete().eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const res = await query;
    return { data: null, error: res.error };
  });
}
