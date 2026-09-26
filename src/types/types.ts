// 用户相关类型
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  role: UserRole;
  notification_enabled: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
}

// 商品信息（扩展）
export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  sub_category: string | null;
  description: string | null;
  selling_points: string[];
  ai_selling_points: string[];
  original_price: number | null;
  sale_price: number | null;
  stock: number;
  specs: ProductSpec[];
  images: string[];
  cover_image: string | null;
  status: 'active' | 'inactive' | 'draft';
  sales_count: number;
  target_language: string;
  target_platform: 'douyin' | 'tiktok';
  created_at: string;
  updated_at: string;
}

export interface ProductSpec {
  name: string;
  value: string;
}

// 数字人
export interface Avatar {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: 'zh' | 'en' | 'both';
  style: string;
  tags: string[];
  preview_image: string | null;
  sample_video: string | null;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

// 视频模板
export interface VideoTemplate {
  id: string;
  name: string;
  industry: '电商' | '教育' | '金融' | '美妆' | '其他';
  scene: '产品介绍' | '节日促销' | '课程推广' | '品牌宣传' | '开箱测评';
  thumbnail: string | null;
  preview_video: string | null;
  use_count: number;
  duration: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

// 套餐
export interface Plan {
  id: string;
  name: string;
  level: number;
  price: number;
  credits: number;
  features: string[];
  limits: Record<string, number | string | boolean>;
  is_popular: boolean;
  created_at: string;
}

// 用户套餐订阅
export interface UserPlan {
  id: string;
  user_id: string;
  plan_id: string;
  credits_total: number;
  credits_used: number;
  cycle_start: string;
  cycle_end: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

// 积分流水
export interface CreditLog {
  id: string;
  user_id: string;
  amount: number;
  type: 'video_generate' | 'template_download' | 'material_upload' | 'purchase' | 'refund' | 'bonus' | 'deduct';
  description: string;
  credits_after: number;
  created_at: string;
}

// 分镜镜头
export interface Shot {
  id: string;
  order: number;
  type: string;
  description: string;
  duration: number; // 秒
  text_overlay?: string;
  transition?: string;
}

// 分镜模板
export interface StoryboardTemplate {
  id: string;
  name: string;
  description: string;
  shots: Shot[];
}

// 视频项目
export interface VideoProject {
  id: string;
  user_id: string;
  product_id: string | null;
  title: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  // Prompt配置
  video_style: string | null;
  duration: number;
  bgm: string | null;
  subtitle_style: string | null;
  prompt_text: string | null;
  // 分镜配置
  storyboard: Shot[];
  // 素材
  materials: MaterialItem[];
  // 视频结果
  video_url: string | null;
  thumbnail_url: string | null;
  resolution: string;
  // 目标分发平台（跨平台导出/分析用）
  target_platform?: string | null;
  progress: number;
  error_message: string | null;
  // 流量分析
  predicted_completion_rate: number | null;
  predicted_click_rate: number | null;
  traffic_suggestions: TrafficSuggestion[];
  // 爆款复刻
  reference_video_url: string | null;
  style_data: StyleData | null;
  created_at: string;
  updated_at: string;
  // 关联商品
  product?: Product;
}

// 素材条目
export interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  size?: number;
  width?: number;
  height?: number;
  duration_sec?: number;
  matched_shot_id?: string;
}

// 素材库
export interface Material {
  id: string;
  user_id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  size: number | null;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  tags: string[];
  created_at: string;
}

// 流量建议
export interface TrafficSuggestion {
  type: 'subtitle' | 'bgm' | 'pacing' | 'cta' | 'thumbnail';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// 风格数据
export interface StyleData {
  rhythm: string;
  subtitle_style: string;
  bgm_type: string;
  color_tone: string;
  pacing: string;
}

// 知识库条目
export interface KnowledgeItem {
  id: string;
  user_id: string;
  type: 'storyboard' | 'prompt' | 'optimization';
  content: Record<string, unknown>;
  source_project_id: string | null;
  created_at: string;
}

// ══════════════════════════════════════════════
// AI 智能脚本生成模块
// ══════════════════════════════════════════════

/** 单个分镜场景 */
export interface ScriptScene {
  order: number;
  scene: string;          // 场景名称
  visual: string;         // 画面描述
  dialogue: string;       // 台词
  duration: number;       // 建议时长（秒）
  prompt: string;         // 该场景的 AIGC Prompt
}

/** AI 脚本记录 */
export interface Script {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  selling_points: string[];
  target_audience: string;
  platform: string;
  scenes: ScriptScene[];
  prompt_text: string;
  edited_scenes: ScriptScene[] | null;
  edited_prompt: string | null;
  status: 'draft' | 'generating' | 'done' | 'failed';
  feedback_saved: boolean;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════
// 爆款视频风格复刻模块
// ══════════════════════════════════════════════

export interface StyleAnalysis {
  id: string;
  user_id: string;
  source_type: 'link' | 'upload';
  source_url: string | null;
  file_url: string | null;
  rhythm: string | null;
  transitions: string[];
  subtitle_style: string | null;
  bgm_type: string | null;
  bgm_mood: string | null;
  color_tone: string | null;
  pacing: string | null;
  report_data: StyleReportData;
  applied_product_id: string | null;
  status: 'pending' | 'analyzing' | 'done' | 'failed';
  created_at: string;
}

export interface StyleReportData {
  rhythm_score: number;       // 0-100
  pacing_label: string;       // 快/中/慢
  transitions_summary: string;
  subtitle_summary: string;
  bgm_summary: string;
  tags: string[];             // 风格标签
}

// ══════════════════════════════════════════════
// 流量诊断与优化模块
// ══════════════════════════════════════════════

export interface DiagSuggestion {
  id: string;
  type: 'pacing' | 'subtitle' | 'bgm' | 'cta' | 'thumbnail' | 'structure';
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  adopted: boolean | null;   // null = 未处理
}

export interface Diagnostic {
  id: string;
  user_id: string;
  project_id: string | null;
  video_duration: number | null;
  pacing_distribution: Record<string, number>;
  subtitle_coverage: number | null;
  predicted_completion: number | null;
  predicted_like_rate: number | null;
  predicted_comment_rate: number | null;
  predicted_share_rate: number | null;
  suggestions: DiagSuggestion[];
  optimized_script_id: string | null;
  optimization_status: 'idle' | 'processing' | 'done' | 'failed';
  created_at: string;
}

// ══════════════════════════════════════════════
// 知识反馈与系统进化模块
// ══════════════════════════════════════════════

export type KnowledgeSourceType = 'script_edit' | 'prompt_edit' | 'optimization_adopt' | 'optimization_reject';

export interface KnowledgeEntry {
  id: string;
  user_id: string;
  source_type: KnowledgeSourceType;
  source_id: string | null;
  title: string;
  content: Record<string, unknown>;
  quality_score: number;   // 0-5
  is_applied: boolean;
  applied_at: string | null;
  created_at: string;
}

// 视频生成步骤
export type VideoStep = 1 | 2 | 3 | 4 | 5;

// 视频生成表单状态
export interface VideoCreationState {
  step: VideoStep;
  productData: Partial<ProductFormData>;
  promptConfig: Partial<PromptConfig>;
  storyboard: Shot[];
  materials: MaterialItem[];
  projectId?: string;
}

export interface ProductFormData {
  name: string;
  category: string;
  brand: string;
  price: string;
  product_url: string;
  selling_points: string;
  target_language: string;
  target_platform: 'douyin' | 'tiktok';
  ai_selling_points: string[];
  product_id?: string;
}

export interface PromptConfig {
  video_style: string;
  duration: number;
  bgm: string;
  subtitle_style: string;
  prompt_text: string;
  avatar_id?: string;
  language?: string;
  use_translation?: boolean;
}

// 仪表盘统计
export interface DashboardStats {
  total_videos: number;
  processing_videos: number;
  completed_videos: number;
  total_materials: number;
}

// API响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
