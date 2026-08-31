import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Sparkles, ChevronDown, ImageIcon, Video, Wand2,
  BarChart2, Droplets, ArrowUpCircle, Mic, Globe, RefreshCcw,
  MoreHorizontal, Maximize2, Copy, Plus, ChevronRight, Loader2, X, Download, Image as ImageIcon2, Layers, Play, User, Users2,
  ShoppingBag, Package, Search, Check, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { deductUserCredits } from '@/hooks/useCredits';
import { toast } from 'sonner';
import ProductVideoWizard from './VideoCreatePage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sendDeepSeekStreamRequest, sendStepAudioASR, submitSeedanceVideo, querySeedanceVideo, sendStepFlashStreamRequest } from '@/lib/sse';
import { extractVideoFirstFrame, getVideoCoverImage } from '@/lib/videoFrame';
import { audioRecorder } from '@/lib/audioRecorder';
import { Product } from '@/types/types';
import { getCategoryFallbackImage } from './ProductsPage';



const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── 工具卡片数据 ────────────────────────────────────────────────────────
const QUICK_TOOLS = [
  {
    id: 'script', label: 'AI智能脚本', sub: '智能生成短视频爆款带货脚本',
    gradient: 'from-rose-800/80 to-pink-900/80',
    cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=180&fit=crop',
    path: '/script',
  },
  {
    id: 'style-copy', label: '爆款风格复刻', sub: '一键复刻高转化内容风格',
    gradient: 'from-violet-800/80 to-indigo-900/80',
    cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=300&h=180&fit=crop',
    path: '/style-copy',
  },
  {
    id: 'competitor', label: '竞品爆款分析', sub: '抓取竞品爆款视频策略',
    gradient: 'from-sky-800/80 to-blue-900/80',
    cover: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&h=180&fit=crop',
    path: '/competitor',
  },
  {
    id: 'analytics', label: '流量分析', sub: '实时追踪完播率与转化漏斗',
    gradient: 'from-amber-800/80 to-orange-900/80',
    cover: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&h=180&fit=crop',
    path: '/analytics',
  },
  {
    id: 'live-highlight', label: '直播高光切片', sub: 'AI自动识别直播精华',
    gradient: 'from-teal-800/80 to-emerald-900/80',
    cover: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=180&fit=crop',
    path: '/live-highlight',
  },
  {
    id: 'knowledge', label: '知识库', sub: '沉淀带货话术，AI语义检索',
    gradient: 'from-fuchsia-800/80 to-purple-900/80',
    cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=180&fit=crop',
    path: '/knowledge',
  },
];



// 模型与对应后端标识
type ModelId = 'Seedance' | 'Kling' | 'Krea' | 'Luma' | 'pixverse' | 'happyhorse' | 'wan';
const MODELS: { label: string; id: ModelId; vendor: string; iconSymbol: string }[] = [
  { label: 'Seedance 2.0', id: 'Seedance', vendor: 'ByteDance', iconSymbol: '⚡' },
  { label: 'happyhorse 1.0', id: 'happyhorse', vendor: 'HappyHorse AI', iconSymbol: '💎' },
  { label: 'wan2.7', id: 'wan', vendor: 'Alibaba Cloud', iconSymbol: '☁️' },
  { label: 'Kling', id: 'Kling', vendor: 'Kuaishou AI', iconSymbol: '🎬' },
  { label: 'Krea', id: 'Krea', vendor: 'Krea AI', iconSymbol: '👾' },
  { label: 'Luma', id: 'Luma', vendor: 'Luma Labs', iconSymbol: '📷' },
  { label: 'pixverse', id: 'pixverse', vendor: 'PixVerse', iconSymbol: '🥞' },
];
const RESOLUTIONS = ['720P · 9:16 · 5s', '1080P · 16:9 · 10s', '4K · 1:1 · 8s'];
const INSPIRE_VIDEOS = [
  {
    url: '/Video/CreatOK_2.mp4',
    prompt: '时尚秋季外套女款展示，微风吹拂，高级质感，落叶背景',
    model: 'Seedance 2.0',
    ratio: '9:16',
    refImage: '有参考图',
    firstLast: '无首尾帧',
    category: '服装',
    language: '中文'
  },
  {
    url: '/Video/CreatOK_4.mp4',
    prompt: 'Makeup foundation application, close up on skin smooth blending, soft natural lighting',
    model: 'Kling',
    ratio: '16:9',
    refImage: '无参考图',
    firstLast: '有首尾帧',
    category: '美妆',
    language: '英文'
  },
  {
    url: '/Video/CreatOK_5.mp4',
    prompt: 'Smart watch rotate view, carbon fiber strap, holographic display neon accent',
    model: 'Luma',
    ratio: '1:1',
    refImage: '有参考图',
    firstLast: '有首尾帧',
    category: '数码',
    language: '英文'
  },
  {
    url: '/Video/CreatOK_6.mp4',
    prompt: '美味草莓芝士蛋糕切片，淋上红莓果酱，慢动作，诱人甜点',
    model: 'Krea',
    ratio: '9:16',
    refImage: '无参考图',
    firstLast: '无首尾帧',
    category: '食品',
    language: '中文'
  },
  {
    url: '/Video/CreatOK_7.mp4',
    prompt: 'Nordic style living room, cozy sofa, plant leaf shadow, warm aesthetic room tour',
    model: 'pixverse',
    ratio: '16:9',
    refImage: '有参考图',
    firstLast: '无首尾帧',
    category: '家居',
    language: '德文'
  },
  {
    url: '/Video/CreatOK_8.mp4',
    prompt: '运动女鞋减震底测试，慢镜头起跳落地，水花四溅效果',
    model: 'Seedance 2.0',
    ratio: '9:16',
    refImage: '无参考图',
    firstLast: '有首尾帧',
    category: '服装',
    language: '中文'
  },
  {
    url: '/Video/CreatOK_9.mp4',
    prompt: 'Organic lipstick swatch on hand, gloss reflection, flowers around, cosmetic brand ad',
    model: 'Kling',
    ratio: '9:16',
    refImage: '有参考图',
    firstLast: '有首尾帧',
    category: '美妆',
    language: '英文'
  },
  {
    url: '/Video/CreatOK_10.mp4',
    prompt: 'Wireless earbuds falling into water, high speed splash capture, blue ambient lighting',
    model: 'Luma',
    ratio: '3:4',
    refImage: '无参考图',
    firstLast: '无首尾帧',
    category: '数码',
    language: '日文'
  },
  {
    url: '/Video/CreatOK_11.mp4',
    prompt: '咖啡拿铁拉花艺术过程，心形图案，温暖日光，精致陶瓷杯',
    model: 'Krea',
    ratio: '9:16',
    refImage: '有参考图',
    firstLast: '无首尾帧',
    category: '食品',
    language: '中文'
  }
];

const FILTER_CONFIG = [
  { key: 'model', label: '模型', options: ['全部', 'Seedance 2.0', 'happyhorse 1.0', 'wan2.7', 'Kling', 'Krea', 'Luma', 'pixverse'] },
  { key: 'ratio', label: '比例', options: ['全部', '9:16', '16:9', '1:1', '3:4'] },
  { key: 'refImage', label: '参考图', options: ['全部', '有参考图', '无参考图'] },
  { key: 'firstLast', label: '首尾帧', options: ['全部', '有首尾帧', '无首尾帧'] },
  { key: 'category', label: '商品分类', options: ['全部', '服装', '美妆', '数码', '食品', '家居'] },
  { key: 'language', label: '语言·2', options: ['全部', '中文', '英文', '日文', '德文'] },
];

const MAIN_TABS = ['视频生成', '分镜编辑', '图片生成'];
const INPUT_TABS = ['参考', '商品', '数字人', '首尾帧'];

// 预设高品质演示备选商品列表
const MOCK_SELECTOR_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    user_id: 'demo',
    name: '极简美学 冰感丝滑防晒外套',
    category: '服装配饰',
    sub_category: '女装',
    description: '采用UPF50+高倍防晒微孔原纱面料，轻盈透气，体感瞬降5℃，告别闷热闷汗，修身立体剪裁，户外出行与日常通勤百搭必备。',
    selling_points: ['UPF50+高倍防晒', '冰感凉爽降温5℃', '微孔透气不闷汗'],
    ai_selling_points: ['修身显瘦版型', '加长遮掌设计'],
    original_price: 299,
    sale_price: 129,
    stock: 850,
    specs: [{ name: '颜色', value: '冰川白/烟波粉/曜石黑' }],
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
    status: 'active',
    sales_count: 3420,
    target_language: 'zh',
    target_platform: 'douyin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    user_id: 'demo',
    name: '光采焕亮 玻色因紧致精华眼霜',
    category: '美妆护肤',
    sub_category: '眼部护理',
    description: '蕴含30%高浓度玻色因与九肽复合物，协同冰感锌合金按摩头，精准抚平眼周细纹干纹，淡化黑眼圈，提拉紧致眼部轮廓。',
    selling_points: ['30%高浓度玻色因', '冰感锌合金按摩头', '7天实测淡化细纹'],
    ai_selling_points: ['改善熬夜黑眼圈', '温和敏感肌可用'],
    original_price: 499,
    sale_price: 239,
    stock: 520,
    specs: [{ name: '净含量', value: '20g/支' }],
    images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&auto=format&fit=crop&q=80',
    status: 'active',
    sales_count: 5890,
    target_language: 'zh',
    target_platform: 'douyin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-003',
    user_id: 'demo',
    name: '空间声学 空间音频主动降噪耳机 Pro',
    category: '数码电器',
    sub_category: '音频设备',
    description: '搭载48dB深度混合主动降噪算法与钛合金振膜动圈单元，支持LDAC高解析音频传输，40小时全天候超长续航，双麦克风AI通话降噪。',
    selling_points: ['48dB深度智能降噪', 'LDAC无损高解析音质', '40小时长效续航'],
    ai_selling_points: ['人体工学零压佩戴', '双设备无缝连接'],
    original_price: 899,
    sale_price: 399,
    stock: 310,
    specs: [{ name: '版本', value: '主动降噪旗舰版' }],
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
    status: 'active',
    sales_count: 2150,
    target_language: 'zh',
    target_platform: 'douyin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-004',
    user_id: 'demo',
    name: '高山原叶 手作冷萃白桃乌龙茶包',
    category: '食品饮料',
    sub_category: '冲饮茶包',
    description: '甄选高山一级乌龙茶原叶配伍真白桃果粒，采用冷热双萃工艺，0糖0脂0卡，水润清甜，回甘持久，随时随地享受精致冷萃茶道。',
    selling_points: ['高山原叶+真白桃果粒', '0糖0脂0卡无负担', '冷热双萃3秒出味'],
    ai_selling_points: ['玉米纤维三角立体茶包', '独立防潮包装'],
    original_price: 99,
    sale_price: 49.9,
    stock: 1200,
    specs: [{ name: '规格', value: '30包/盒' }],
    images: ['https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
    status: 'active',
    sales_count: 9800,
    target_language: 'zh',
    target_platform: 'douyin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-005',
    user_id: 'demo',
    name: '自然沉香 悬浮感天然慢回弹枕',
    category: '家居用品',
    sub_category: '家纺寝具',
    description: '采用非温感慢回弹记忆棉核心，开创双向弧形颈椎托举结构，透气天丝提花枕套，有效释放肩颈压力，深度改善睡眠质量。',
    selling_points: ['人体工学颈椎双向托举', '非温感慢回弹记忆棉', '天丝抑菌亲肤枕套'],
    ai_selling_points: ['分散头颈85%压力', '支持全枕无残留冲洗'],
    original_price: 359,
    sale_price: 168,
    stock: 450,
    specs: [{ name: '高度', value: '10/12cm曲面双高' }],
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80',
    status: 'active',
    sales_count: 4120,
    target_language: 'zh',
    target_platform: 'douyin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// ── 图片生成模型与对应标识 ──────────────────────────────────────────────
const IMG_MODELS = [
  { label: 'Flux 1.1 Pro', id: 'Flux' },
  { label: 'Midjourney v6', id: 'Midjourney' },
  { label: 'SDXL 3.0', id: 'SDXL' }
];
const IMG_RESOLUTIONS = [
  '1:1 · 方形 (1024×1024)',
  '16:9 · 横屏 (1280×720)',
  '9:16 · 竖屏 (720×1280)'
];

// 预设高频常用数字人快捷列表 (使用 public/person 目录资源)
const QUICK_AVATARS = [
  { id: 'avatar-005', name: '萌萌·零食吃播', preview_image: '/person/girl3.png', gender: 'female', tags: ['零食', '甜美'] },
  { id: 'avatar-003', name: '安娜·时尚穿搭', preview_image: '/person/girl2.png', gender: 'female', tags: ['服装', '高级感'] },
  { id: 'avatar-004', name: '张总·大疆Pocket 4品牌风格宣传', preview_image: '/person/boy2.png', gender: 'male', tags: ['大疆Pocket4', '沉稳'] },
  { id: 'avatar-001', name: '小雅·美妆达人', preview_image: '/person/girl1.png', gender: 'female', tags: ['美妆', '亲和力'] },
  { id: 'avatar-002', name: '阿杰·数码评测', preview_image: '/person/boy1.png', gender: 'male', tags: ['数码', '专业'] },
  { id: 'avatar-007', name: '美玲·韩系美妆', preview_image: '/person/girl4.png', gender: 'female', tags: ['美妆', '精致'] },
  { id: 'avatar-006', name: '陆沉·男装潮流风尚', preview_image: '/person/boy3.png', gender: 'male', tags: ['潮服', '帅气'] },
  { id: 'avatar-008', name: '雪儿·轻奢珠宝', preview_image: '/person/girl5.png', gender: 'female', tags: ['珠宝', '典雅'] },
];

export function getAvatarMatchedVideo(avatarName?: string, avatarImage?: string): string {
  if (!avatarName && !avatarImage) return '/Video/CreatOK_10.mp4';
  const name = avatarName || '';
  const img = avatarImage || '';

  if (name.includes('萌萌') || img.includes('girl3')) return '/Video/CreatOK_10.mp4';
  if (name.includes('安娜') || img.includes('girl2')) return '/Video/CreatOK_7.mp4';
  if (name.includes('张总') || name.includes('Pocket') || img.includes('boy2')) return '/Video/CreatOK_8.mp4';
  if (name.includes('小雅') || img.includes('girl1')) return '/Video/CreatOK_2.mp4';
  if (name.includes('阿杰') || img.includes('boy1')) return '/Video/CreatOK_4.mp4';
  if (name.includes('美玲') || img.includes('girl4')) return '/Video/CreatOK_9.mp4';
  if (name.includes('陆沉') || img.includes('boy3')) return '/Video/CreatOK_6.mp4';
  if (name.includes('雪儿') || img.includes('girl5')) return '/Video/CreatOK_11.mp4';

  return '/Video/CreatOK_10.mp4';
}

// ── 主页组件 ───────────────────────────────────────────────────────────
export default function HomePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [mainTab, setMainTab] = useState(projectId ? '分镜编辑' : '视频生成');
  const [inputTab, setInputTab] = useState(location.state?.inputTab || '参考');
  const [selectedAvatar, setSelectedAvatar] = useState<{ id?: string; name: string; preview_image?: string } | null>(
    location.state?.selectedAvatar ?? null
  );

  const [prompt, setPrompt] = useState('');

  // ── 商品选择弹窗及提取提示词相关状态 ──────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('全部');

  const loadProductsForSelector = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const DEMO_UID = '7d58d08f-8aa3-43f5-a30f-b7495d59d147';
      let query = supabase.from('products').select('*');
      if (user?.id) {
        query = query.or(`user_id.eq.${user.id},user_id.eq.${DEMO_UID}`);
      }
      const { data } = await query.order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setProductsList(data as Product[]);
      } else {
        setProductsList(MOCK_SELECTOR_PRODUCTS);
      }
    } catch (err) {
      console.error('Failed to fetch products for selector:', err);
      setProductsList(MOCK_SELECTOR_PRODUCTS);
    } finally {
      setLoadingProducts(false);
    }
  }, [user]);

  const handleSelectProduct = useCallback((prod: Product) => {
    setSelectedProduct(prod);
    setIsProductModalOpen(false);

    const points = (prod.selling_points || []).filter(Boolean);
    const aiPoints = (prod.ai_selling_points || []).filter(Boolean);
    const allPoints = Array.from(new Set([...points, ...aiPoints]));
    const priceText = prod.sale_price != null ? `¥${prod.sale_price}` : prod.original_price != null ? `¥${prod.original_price}` : '';

    let generatedPrompt = `【爆款电商带货视频】${prod.name}`;
    if (prod.category) generatedPrompt += `（${prod.category}）`;
    if (priceText) generatedPrompt += ` | 特惠活动价：${priceText}`;

    if (allPoints.length > 0) {
      generatedPrompt += `\n✨ 核心卖点：${allPoints.join('；')}`;
    }

    if (prod.description) {
      generatedPrompt += `\n📝 商品详情描述：${prod.description.trim()}`;
    }

    generatedPrompt += `\n🎥 视频分镜与视角要求：镜头首先前3秒高清特写展示${prod.name}的高保真实物细节与质感，痛点引发共鸣，接着自然过渡至使用场景演示，配合柔和高光与动态转场，突出${allPoints[0] || '核心优势'}，最后高能促成买家下单。`;

    setPrompt(generatedPrompt);

    toast.success(`已成功选择商品「${prod.name}」，关键卖点与描述信息已自动生成并填充至提示词脚本！`, {
      duration: 4000,
      style: {
        background: '#1c1929',
        color: '#ffffff',
        border: '1.5px solid #10b981',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
        borderRadius: '14px',
        padding: '12px 16px',
        fontSize: '13px',
        fontWeight: '600',
      },
    });
  }, []);

  useEffect(() => {
    if (location.state?.selectedProduct) {
      setMainTab('视频生成');
      setInputTab('商品');
      handleSelectProduct(location.state.selectedProduct);
    } else if (location.state?.inputTab === '商品') {
      setMainTab('视频生成');
      setInputTab('商品');
    } else if (location.state?.selectedAvatar) {
      setMainTab('视频生成');
      setSelectedAvatar(location.state.selectedAvatar);
      setInputTab(location.state?.inputTab || '数字人');
    }
  }, [location.state, handleSelectProduct]);

  const filteredSelectorProducts = productsList.filter(prod => {
    if (selectedCategoryFilter !== '全部' && prod.category !== selectedCategoryFilter) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      const matchName = (prod.name || '').toLowerCase().includes(q);
      const matchCategory = (prod.category || '').toLowerCase().includes(q);
      const matchPoints = [...(prod.selling_points || []), ...(prod.ai_selling_points || [])].some(pt => pt.toLowerCase().includes(q));
      const matchDesc = (prod.description || '').toLowerCase().includes(q);
      return matchName || matchCategory || matchPoints || matchDesc;
    }
    return true;
  });
  const [model, setModel] = useState<{ label: string; id: ModelId }>({ label: 'Seedance 2.0', id: 'Seedance' });
  const [resolution, setResolution] = useState('720P · 16:9 · 5s');
  const [modelOpen, setModelOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);

  // 灵感广场筛选状态
  const [filterModel, setFilterModel] = useState('全部');
  const [filterRatio, setFilterRatio] = useState('全部');
  const [filterRefImage, setFilterRefImage] = useState('全部');
  const [filterFirstLast, setFilterFirstLast] = useState('全部');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [filterLanguage, setFilterLanguage] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const filteredInspireVideos = INSPIRE_VIDEOS.filter(video => {
    if (filterModel !== '全部' && video.model !== filterModel) return false;
    if (filterRatio !== '全部' && video.ratio !== filterRatio) return false;
    if (filterRefImage !== '全部' && video.refImage !== filterRefImage) return false;
    if (filterFirstLast !== '全部' && video.firstLast !== filterFirstLast) return false;
    if (filterCategory !== '全部' && video.category !== filterCategory) return false;
    if (filterLanguage !== '全部' && video.language !== filterLanguage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrompt = video.prompt.toLowerCase().includes(q);
      const matchModel = video.model.toLowerCase().includes(q);
      const matchCategory = video.category.toLowerCase().includes(q);
      return matchPrompt || matchModel || matchCategory;
    }
    return true;
  });

  // 新增的高级分辨率/宽高比/时长/扩展设置状态
  const [activeResolution, setActiveResolution] = useState('720P');
  const [activeRatio, setActiveRatio] = useState('16:9');
  const [activeDuration, setActiveDuration] = useState(5);
  const [autoOptimize, setAutoOptimize] = useState(false);

  // 新增参考图片、视频、首尾帧的图片上传状态
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refVideo, setRefVideo] = useState<string | null>(null);
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  // 语音输入状态
  const [recording, setRecording] = useState(false);

  // 提示词增强进度条状态
  const [enhanceProgress, setEnhanceProgress] = useState(0);

  // 图片生成相关新状态与 ref
  const [imgSubTab, setImgSubTab] = useState('智能绘图');
  const [imgRefImage, setImgRefImage] = useState<string | null>(null);
  const [enhancingImg, setEnhancingImg] = useState(false);
  const [imgRecording, setImgRecording] = useState(false);
  const imgUploadInputRef = useRef<HTMLInputElement>(null);

  // 上传文件的 ref
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  const updateResolution = (res: string, ratio: string, dur: number) => {
    setActiveResolution(res);
    setActiveRatio(ratio);
    setActiveDuration(dur);
    setResolution(`${res} · ${ratio} · ${dur}s`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRefImage(reader.result as string);
        toast.success('参考图片已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRefVideo(reader.result as string);
        toast.success('参考视频已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFirstFrame(reader.result as string);
        toast.success('首帧图片已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLastFrame(reader.result as string);
        toast.success('尾帧图片已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceInput = async () => {
    if (recording) {
      setRecording(false);
      toast.info('🎙️ 录音已结束，正在识别语音...');
      try {
        const { base64, recognizedText } = await audioRecorder.stop();
        if (recognizedText && recognizedText.trim()) {
          setPrompt(prev => prev + (prev ? '，' : '') + recognizedText.trim());
          toast.success('🎙️ 语音识别成功');
          return;
        }

        await sendStepAudioASR({
          audioData: base64,
          onData: (text) => {
            setPrompt(prev => prev + (prev ? '，' : '') + text);
          },
          onComplete: () => {
            toast.success('🎙️ 语音识别成功');
          },
          onError: (err) => {
            console.error('ASR error:', err);
            toast.error(`${err.message}`);
          }
        });
      } catch (err) {
        console.error('Failed to stop recording:', err);
        toast.error('录音处理失败，请重试');
      }
    } else {
      try {
        await audioRecorder.start();
        setRecording(true);
        toast.info('🎙️ 录音中... 请说话，再次点击按钮以停止并识别', { duration: 5000 });
      } catch (err) {
        console.error('Microphone access failed:', err);
        toast.error('无法启用麦克风，请检查权限设置');
      }
    }
  };

  // AI生成状态
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 图片生成状态
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgModel, setImgModel] = useState({ label: 'Flux 1.1 Pro', id: 'Flux' });
  const [imgResolution, setImgResolution] = useState('2K · 低 · 1:1');
  const [imgModelOpen, setImgModelOpen] = useState(false);
  const [imgResOpen, setImgResOpen] = useState(false);

  // 图片生成高级配置状态
  const [imgResolutionType, setImgResolutionType] = useState('2K');
  const [imgQuality, setImgQuality] = useState('低');
  const [imgCustomSize, setImgCustomSize] = useState(false);
  const [imgAspect, setImgAspect] = useState('1:1');

  const updateImgResolution = (resType: string, qual: string, aspect: string) => {
    setImgResolutionType(resType);
    setImgQuality(qual);
    setImgAspect(aspect);
    setImgResolution(`${resType} · ${qual} · ${aspect}`);
  };

  const [generatedVideos, setGeneratedVideos] = useState<any[]>([]);
  const [activePlayVideo, setActivePlayVideo] = useState<any>(null);

  const loadGeneratedVideos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('video_projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) {
      setGeneratedVideos(data);
    }
  }, [user]);

  useEffect(() => {
    loadGeneratedVideos();
  }, [loadGeneratedVideos]);

  const [imgEnhanceProgress, setImgEnhanceProgress] = useState(0);

  const handleEnhanceImgPrompt = async () => {
    if (!imgPrompt.trim()) { toast.error('请输入图片描述'); return; }
    setEnhancingImg(true);
    setImgEnhanceProgress(15);
    const progressTimer = setInterval(() => {
      setImgEnhanceProgress(p => (p < 92 ? p + Math.floor(Math.random() * 8 + 5) : p));
    }, 200);

    const originalPrompt = imgPrompt;
    abortRef.current = new AbortController();
    let fullText = '';
    let isFirstChunk = true;
    try {
      await sendDeepSeekStreamRequest({
        messages: [{
          role: 'user',
          content: `请将以下简短图片描述扩展为一段专业的AI绘图提示词，要求：画面细节丰富、构图精美、适合带货电商场景。完全使用中文输出，直接输出提示词内容，严禁包含额外解释、前缀或引号。原文：${originalPrompt}`,
        }],
        max_tokens: 512,
        onData: (data) => {
          if (!data || data === '[DONE]') return;
          let chunk = data;
          try {
            const parsed = JSON.parse(data);
            chunk = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.text ?? data;
          } catch {
            // plain text chunk
          }
          if (chunk) {
            if (isFirstChunk) {
              setImgPrompt('');
              isFirstChunk = false;
            }
            fullText += chunk;
            setImgPrompt(fullText);
          }
        },
        onComplete: () => {
          clearInterval(progressTimer);
          setImgEnhanceProgress(100);
          toast.success('图片提示词已增强');
        },
        onError: (err) => {
          clearInterval(progressTimer);
          toast.error(`增强失败：${err.message}`);
        },
        signal: abortRef.current?.signal,
      });
    } catch (e: unknown) {
      clearInterval(progressTimer);
      toast.error(`增强失败：${(e as Error).message}`);
    } finally {
      setTimeout(() => {
        setImgEnhanceProgress(0);
        setEnhancingImg(false);
      }, 500);
    }
  };

  const handleImgVoiceInput = async () => {
    if (imgRecording) {
      setImgRecording(false);
      toast.info('🎙️ 录音已结束，正在识别语音...');
      try {
        const { base64, recognizedText } = await audioRecorder.stop();
        if (recognizedText && recognizedText.trim()) {
          setImgPrompt(prev => prev + (prev ? '，' : '') + recognizedText.trim());
          toast.success('🎙️ 语音识别成功');
          return;
        }

        await sendStepAudioASR({
          audioData: base64,
          onData: (text) => {
            setImgPrompt(prev => prev + (prev ? '，' : '') + text);
          },
          onComplete: () => {
            toast.success('🎙️ 语音识别成功');
          },
          onError: (err) => {
            console.error('ASR error:', err);
            toast.error(`${err.message}`);
          }
        });
      } catch (err) {
        console.error('Failed to stop recording:', err);
        toast.error('录音处理失败，请重试');
      }
    } else {
      try {
        await audioRecorder.start();
        setImgRecording(true);
        toast.info('🎙️ 录音中... 请说话，再次点击按钮以停止并识别', { duration: 5000 });
      } catch (err) {
        console.error('Microphone access failed:', err);
        toast.error('无法启用麦克风，请检查权限设置');
      }
    }
  };

  const handleImgRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImgRefImage(reader.result as string);
        toast.success('图片导入成功');
      };
      reader.readAsDataURL(file);
    }
  };
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgProgress, setImgProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const imgTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 提示词增强状态
  const [enhancing, setEnhancing] = useState(false);

  // 停止轮询
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (imgTimeoutRef.current) { clearInterval(imgTimeoutRef.current); imgTimeoutRef.current = null; }
  }, []);

  // 图片生成处理器
  const handleImageGenerate = () => {
    if (!imgPrompt.trim()) { toast.error('请输入图片描述'); return; }
    setImgGenerating(true);
    setResultImage(null);
    setImgProgress(5);
    
    let currentProgress = 5;
    imgTimeoutRef.current = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        if (imgTimeoutRef.current) clearInterval(imgTimeoutRef.current);
        setImgGenerating(false);
        setImgProgress(100);
        const mockImages = [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
        ];
        const randomImage = mockImages[Math.floor(Math.random() * mockImages.length)];
        setResultImage(randomImage);
        toast.success('图片生成完成！');
      } else {
        setImgProgress(currentProgress);
      }
    }, 400);
  };

  // 轮询 Sora 任务
  const pollSora = useCallback((vid: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 80) { stopPoll(); setGenerating(false); toast.error('视频生成超时，请重试'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('sora-video-query', { body: { video_id: vid } });
        if (error) { const msg = await error?.context?.text(); console.error('sora-query', msg); return; }
        const status = data?.status;
        if (status === 'completed') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          if (data?.video_url) { setResultVideo(data.video_url); toast.success('Sora 视频生成完成！'); }
        } else if (status === 'failed' || status === 'cancelled') {
          stopPoll(); setGenerating(false); toast.error('视频生成失败，请重试');
        } else {
          setGenProgress(Math.min(90, (data?.progress ?? attempts * 4)));
        }
      } catch (e) { console.error('sora poll error', e); }
    }, 8000);
  }, [stopPoll]);

  // 轮询 Seedance 任务
  const pollSeedance = useCallback((reqId: string, dbProjectId?: string | null) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        stopPoll();
        setGenerating(false);
        toast.error('视频生成超时，请重试');
        if (dbProjectId) {
          await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
        }
        return;
      }
      try {
        const data = await querySeedanceVideo(reqId);
        const status = data?.status;
        if (status === 'success') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          const rawVideoUrl = data?.outcome?.video_url || data?.video_url || '/Video/CreatOK_2.mp4';
          const videoUrl = selectedAvatar ? getAvatarMatchedVideo(selectedAvatar.name, selectedAvatar.preview_image) : rawVideoUrl;
          setResultVideo(videoUrl);
          toast.success(selectedAvatar ? `已为您成功生成数字人「${selectedAvatar.name}」带货视频！` : 'Seedance 视频生成完成！');
          if (dbProjectId) {
            const coverFrame = await getVideoCoverImage(videoUrl, selectedAvatar?.preview_image, firstFrame || undefined);
            await supabase.from('video_projects').update({
              status: 'completed',
              progress: 100,
              video_url: videoUrl,
              thumbnail_url: coverFrame,
            }).eq('id', dbProjectId);
            loadGeneratedVideos();
          }
        } else if (status === 'failed' || status === 'cancelled') {
          stopPoll(); setGenerating(false); toast.error(`视频生成失败: ${data?.error || '模型生成出错'}`);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
        } else {
          const prog = Math.min(95, attempts * 4);
          setGenProgress(prog);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ progress: prog }).eq('id', dbProjectId);
          }
        }
      } catch (e) {
        console.error('seedance poll error', e);
      }
    }, 5000);
  }, [stopPoll, loadGeneratedVideos]);

  // 轮询 Kling 任务
  const pollKling = useCallback((taskId: string, dbProjectId?: string | null) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        stopPoll();
        setGenerating(false);
        toast.error('视频生成超时，请重试');
        if (dbProjectId) {
          await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
        }
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('kling-video-query', { body: { task_id: taskId } });
        if (error) {
          console.error('kling-query error', error);
          return;
        }
        const status = data?.status; // 'SUCCESS' or 'processing' or 'FAILED'
        if (status === 'SUCCESS') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          const videoUrl = data?.video_url || data?.outcome?.video_url;
          if (videoUrl) {
            setResultVideo(videoUrl);
            toast.success('Kling 视频生成完成！');
            if (dbProjectId) {
              const coverFrame = await getVideoCoverImage(videoUrl, selectedAvatar?.preview_image, firstFrame || undefined);
              await supabase.from('video_projects').update({
                status: 'completed',
                progress: 100,
                video_url: videoUrl,
                thumbnail_url: coverFrame,
              }).eq('id', dbProjectId);
              loadGeneratedVideos();
            }
          }
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          stopPoll(); setGenerating(false); toast.error(`视频生成失败: ${data?.error || '模型生成出错'}`);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
        } else {
          const prog = Math.min(95, attempts * 4);
          setGenProgress(prog);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ progress: prog }).eq('id', dbProjectId);
          }
        }
      } catch (e) {
        console.error('kling poll error', e);
      }
    }, 5000);
  }, [stopPoll, loadGeneratedVideos]);

  // 提交生成
  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('请输入视频描述'); return; }

    // 校验与扣除积分 (生成视频每次消耗 10 积分)
    if (user) {
      const videoTitle = prompt.trim().slice(0, 15) || `${model.label}视频`;
      const deductRes = await deductUserCredits(user.id, 10, `生成AI视频《${videoTitle}》`, 'video_generate');
      if (!deductRes.success) {
        toast.error(deductRes.message || `积分不足！生成 AI 视频每次需消耗 10 积分（当前剩余 ${deductRes.creditsLeft} 积分），请点击右上角粉红积分按钮充值！`, { duration: 5000 });
        return;
      }
      toast.info(`⚡ 已扣除 10 积分（当前剩余 ${deductRes.creditsLeft} 积分），AI 视频生成任务已成功启动！`);
    } else {
      toast.info('⚡ 已扣除 10 积分，AI 视频生成任务已成功启动！');
    }

    setGenerating(true); setResultVideo(null); setGenProgress(5); stopPoll();

    try {
      if (model.id === 'Seedance') {
        // 先在数据库中创建视频项目
        let dbProjectId: string | null = null;
        if (user) {
          try {
            const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
              user_id: user.id,
              title: prompt.trim() || `${model.label} 视频`,
              status: 'processing',
              video_style: model.label,
              duration: Number(activeDuration) || 8,
              prompt_text: prompt,
              progress: 5,
            }).select('id').maybeSingle();
            
            if (projErr) {
              console.error("Failed to insert video project:", projErr);
            } else if (projData) {
              dbProjectId = projData.id;
            }
          } catch (dbErr) {
            console.error("Database insert error:", dbErr);
          }
        }

        const payload: any = {
          prompt,
          duration: activeDuration,
          resolution: '720p',
          ratio: activeRatio,
          watermark: false,
          generate_audio: true,
        };

        if (firstFrame) payload.first_frame = firstFrame;
        if (lastFrame) payload.last_frame = lastFrame;
        
        const reference_images: string[] = [];
        if (refImage) reference_images.push(refImage);
        if (reference_images.length > 0) payload.reference_images = reference_images;

        const reference_videos: string[] = [];
        if (refVideo) reference_videos.push(refVideo);
        if (reference_videos.length > 0) payload.reference_videos = reference_videos;

        const res = await submitSeedanceVideo(payload);
        const reqId = res.request_id;
        if (!reqId) {
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
          throw new Error('未获取到 Seedance 任务ID');
        }
        setTaskId(reqId);
        pollSeedance(reqId, dbProjectId);
      } else if (model.id === 'Kling') {
        // 先在数据库中创建视频项目
        let dbProjectId: string | null = null;
        if (user) {
          try {
            const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
              user_id: user.id,
              title: prompt.trim() || `${model.label} 视频`,
              status: 'processing',
              video_style: model.label,
              duration: Number(activeDuration) || 8,
              prompt_text: prompt,
              progress: 5,
            }).select('id').maybeSingle();
            
            if (projErr) {
              console.error("Failed to insert video project:", projErr);
            } else if (projData) {
              dbProjectId = projData.id;
            }
          } catch (dbErr) {
            console.error("Database insert error:", dbErr);
          }
        }

        const payload: any = {
          prompt,
          duration: activeDuration,
        };
        
        if (refImage) {
          payload.image_list = [refImage];
        } else if (firstFrame) {
          payload.image_list = [firstFrame];
        }

        const { data, error } = await supabase.functions.invoke('kling-video-create', { body: payload });
        if (error) {
          const msg = await error?.context?.text();
          throw new Error(msg || error.message);
        }
        
        const task_id = data?.task_id;
        if (!task_id) {
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
          throw new Error('未获取到 Kling 任务ID');
        }
        setTaskId(task_id);
        pollKling(task_id, dbProjectId);
      } else if (['Krea', 'Luma', 'pixverse', 'happyhorse', 'wan'].includes(model.id)) {
        // 模拟生成过程，展示高保真原型
        let dbProjectId: string | null = null;
        if (user) {
          try {
            const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
              user_id: user.id,
              title: prompt.trim() || `${model.label} 视频`,
              status: 'processing',
              video_style: model.label,
              duration: Number(activeDuration) || 8,
              prompt_text: prompt,
              progress: 5,
            }).select('id').maybeSingle();
            
            if (projErr) {
              console.error("Failed to insert video project:", projErr);
            } else if (projData) {
              dbProjectId = projData.id;
            }
          } catch (dbErr) {
            console.error("Database insert error:", dbErr);
          }
        }

        const simulatedTaskId = `sim_${Math.random().toString(36).substring(2, 11)}`;
        setTaskId(simulatedTaskId);

        let currentProgress = 5;
        pollRef.current = setInterval(async () => {
          currentProgress += Math.floor(Math.random() * 15) + 10;
          if (currentProgress >= 100) {
            stopPoll();
            setGenerating(false);
            setGenProgress(100);
            
            const mockVideos = [
              'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-illuminated-city-street-40019-large.mp4',
              'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-smartphone-with-a-vertical-video-of-a-woman-41865-large.mp4',
              'https://assets.mixkit.co/videos/preview/mixkit-coffee-pour-in-slow-motion-42289-large.mp4',
              'https://assets.mixkit.co/videos/preview/mixkit-woman-shopping-online-on-smartphone-41867-large.mp4'
            ];
            const randomVideo = mockVideos[Math.floor(Math.random() * mockVideos.length)];
            setResultVideo(randomVideo);
            toast.success(`${model.label} 视频生成完成！`);

            if (dbProjectId) {
              const coverFrame = await getVideoCoverImage(randomVideo, selectedAvatar?.preview_image, firstFrame || undefined);
              await supabase.from('video_projects').update({
                status: 'completed',
                progress: 100,
                video_url: randomVideo,
                thumbnail_url: coverFrame,
              }).eq('id', dbProjectId);
              loadGeneratedVideos();
            }
          } else {
            setGenProgress(currentProgress);
            if (dbProjectId) {
              await supabase.from('video_projects').update({ progress: currentProgress }).eq('id', dbProjectId);
            }
          }
        }, 1500);
      } else {
        toast.error('该视频模型暂未接入生成接口');
        setGenerating(false); setGenProgress(0);
      }
    } catch (e: unknown) {
      setGenerating(false); setGenProgress(0);
      toast.error(`生成失败：${(e as Error).message}`);
    }
  };

  // DeepSeek-V4-Flash 提示词增强 (全中文低延时打字机流式输出)
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) { toast.error('请先输入基础描述'); return; }
    setEnhancing(true);
    setEnhanceProgress(10);

    const progressTimer = setInterval(() => {
      setEnhanceProgress(prev => (prev < 90 ? prev + 8 : prev));
    }, 150);

    const originalPrompt = prompt;
    abortRef.current = new AbortController();
    let fullText = '';
    let isFirstChunk = true;

    try {
      await sendDeepSeekStreamRequest({
        messages: [{
          role: 'user',
          content: `请对以下描述进行视频提示词扩展与增强。必须完全使用中文输出，严禁包含任何英文、解释、前缀或引导语，直接输出包含场景细节与视觉画面的中文提示词。原描述：${originalPrompt}`,
        }],
        max_tokens: 300,
        onData: (data) => {
          if (!data || data === '[DONE]') return;
          let chunk = data;
          try {
            const parsed = JSON.parse(data);
            chunk = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.text ?? data;
          } catch {
            // data is already a plain text chunk
          }
          if (chunk) {
            if (isFirstChunk) {
              setPrompt('');
              isFirstChunk = false;
            }
            fullText += chunk;
            setPrompt(fullText);
          }
        },
        onComplete: () => {
          clearInterval(progressTimer);
          setEnhanceProgress(100);
          setTimeout(() => {
            toast.success('提示词已增强');
            setEnhancing(false);
            setEnhanceProgress(0);
          }, 200);
        },
        onError: (err) => {
          clearInterval(progressTimer);
          setEnhanceProgress(0);
          if (!abortRef.current?.signal.aborted) {
            toast.error(`增强失败：${err.message}`);
            if (isFirstChunk) {
              setPrompt(originalPrompt);
            }
          }
          setEnhancing(false);
        },
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
      clearInterval(progressTimer);
      setEnhanceProgress(0);
      if (!abortRef.current?.signal.aborted) {
        toast.error(`增强失败：${(e as Error).message}`);
        if (isFirstChunk) {
          setPrompt(originalPrompt);
        }
      }
      setEnhancing(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg,#0e0e12 0%,#14111a 40%,#0c0e14 100%)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes textWaveRipple {
          0% { text-shadow: 0 0 0px rgba(236, 72, 153, 0); color: rgba(255, 255, 255, 0.8); }
          50% { text-shadow: 0 0 10px rgba(236, 72, 153, 0.8), 0 0 20px rgba(168, 85, 247, 0.5); color: #f472b6; }
          100% { text-shadow: 0 0 0px rgba(236, 72, 153, 0); color: rgba(255, 255, 255, 0.8); }
        }
        .enhancing-text-wave { animation: textWaveRipple 1.6s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-10">

        {/* ── 大标题 ────────────────────────────────────────────────── */}
        <div className="text-center space-y-5">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-tight">
            生成、编辑或复刻电商带货视频
          </h1>
          {/* 主 Tab */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/5 backdrop-blur">
            {MAIN_TABS.map(t => (
              <button key={t} onClick={() => setMainTab(t)}
                className={cn('px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  mainTab === t ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white/90')}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* ── 视频生成输入区 ───────────────────────────────────────────────── */}
        {mainTab === '视频生成' && (
          <div className="rounded-2xl" style={{ background: 'linear-gradient(135deg, #4f3fa8 0%, #1aad6b 50%, #d44800 100%)', padding: '1.5px' }}>
            <div className="rounded-[14px] bg-[#16151f] border border-transparent transition-all duration-300">
              {/* 顶部 Tab + 展开按钮 */}
              <div className="flex items-center justify-between px-3 md:px-4 pt-3 pb-1">
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  {INPUT_TABS.map(t => (
                    <button key={t} onClick={() => {
                      setInputTab(t);
                      if (t === '商品') {
                        setIsProductModalOpen(true);
                        loadProductsForSelector();
                      }
                    }}
                      className={cn('flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap shrink-0',
                        inputTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}
                    >
                      {t === '参考' && <ImageIcon className="w-3.5 h-3.5" />}
                      {t === '商品' && <Package className="w-3.5 h-3.5 text-violet-400" />}
                      {t === '首尾帧' && <Copy className="w-3.5 h-3.5" />}
                      {t === '数字人' && <Users2 className="w-3.5 h-3.5 text-primary" />}
                      {t === '编辑' && <Wand2 className="w-3.5 h-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
                <button className="text-white/30 hover:text-white/70 transition-colors shrink-0 ml-2">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* 隐藏的文件输入框 */}
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={videoInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                className="hidden"
              />
              <input
                type="file"
                ref={firstFrameInputRef}
                onChange={handleFirstFrameUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={lastFrameInputRef}
                onChange={handleLastFrameUpload}
                accept="image/*"
                className="hidden"
              />

              {/* AI 提示词增强动态打字机进度条 */}
              {enhancing && (
                <div className="px-4 py-2 border-b border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-amber-950/20 rounded-t-xl transition-all duration-300 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                      AI 正在深度智能扩展视频画面视角与光影细节...
                    </span>
                    <span className="text-[11px] font-mono text-rose-400 font-bold">{enhanceProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900/80 rounded-full h-1.5 overflow-hidden border border-rose-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 rounded-full transition-all duration-150 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                      style={{ width: `${enhanceProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 文本输入 */}
              <div className="px-3 md:px-4 pb-2 pt-2 flex flex-col gap-2">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="flex gap-1.5 pt-1 shrink-0 items-center">
                    {inputTab === '首尾帧' ? (
                      <div className="flex items-center gap-1 shrink-0 mr-1 select-none">
                        {/* 首帧 */}
                        <div
                          onClick={() => firstFrameInputRef.current?.click()}
                          className={cn(
                            "w-11 h-[72px] rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/4 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden transform rotate-[-6deg] cursor-pointer",
                            firstFrame && "border-solid border-emerald-500/50"
                          )}
                        >
                          {firstFrame ? (
                            <>
                              <img src={firstFrame} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setFirstFrame(null); }}
                                className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-white"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-white/40 mb-0.5" />
                              <span className="text-[9px] text-white/40 font-medium leading-none">首帧</span>
                            </>
                          )}
                        </div>

                        {/* 双向箭头 */}
                        <span className="text-white/20 text-[9px] font-bold mx-0.5">↔</span>

                        {/* 尾帧 */}
                        <div
                          onClick={() => lastFrameInputRef.current?.click()}
                          className={cn(
                            "w-11 h-[72px] rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/4 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden transform rotate-[6deg] cursor-pointer",
                            lastFrame && "border-solid border-emerald-500/50"
                          )}
                        >
                          {lastFrame ? (
                            <>
                              <img src={lastFrame} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setLastFrame(null); }}
                                className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-white"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-white/40 mb-0.5" />
                              <span className="text-[9px] text-white/40 font-medium leading-none">尾帧</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : inputTab === '商品' ? (
                      <div className="flex items-center gap-1.5 shrink-0 mr-1 select-none">
                        {selectedProduct ? (
                          <div className="flex items-center gap-2 bg-violet-950/60 border border-violet-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white relative shadow-md">
                            <img
                              src={selectedProduct.cover_image || getCategoryFallbackImage(selectedProduct.category)}
                              alt={selectedProduct.name}
                              className="w-10 h-10 rounded-lg object-cover border border-violet-400/40 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getCategoryFallbackImage(selectedProduct.category);
                              }}
                            />
                            <div className="flex flex-col min-w-0 max-w-[160px]">
                              <span className="font-bold text-white text-xs truncate" title={selectedProduct.name}>
                                {selectedProduct.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                                <span className="bg-violet-500/20 text-violet-300 px-1 rounded">{selectedProduct.category}</span>
                                {(selectedProduct.sale_price ?? selectedProduct.original_price) && (
                                  <span className="font-bold text-rose-400">¥{selectedProduct.sale_price ?? selectedProduct.original_price}</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProductModalOpen(true);
                                loadProductsForSelector();
                              }}
                              className="text-[10px] text-violet-300 underline hover:text-white ml-1 font-medium"
                            >
                              更换
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(null)}
                              className="w-4 h-4 rounded-full bg-black/60 hover:bg-black flex items-center justify-center text-white ml-1"
                              title="清除商品"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProductModalOpen(true);
                              loadProductsForSelector();
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:border-violet-400/60 hover:bg-violet-600/30 transition-all text-xs font-semibold text-violet-200 shadow-sm group"
                          >
                            <ShoppingBag className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                            <span>选择商品管理中的商品</span>
                            <ChevronRight className="w-3.5 h-3.5 text-violet-400/70" />
                          </button>
                        )}
                      </div>
                    ) : inputTab === '数字人' ? (
                      <div className="flex flex-col gap-1.5 shrink-0 mr-1 select-none">
                        {selectedAvatar ? (
                          <div className="flex items-center gap-2 bg-primary/15 border border-primary/40 rounded-xl px-2.5 py-1.5 text-xs text-white relative group">
                            <img
                              src={selectedAvatar.preview_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                              alt={selectedAvatar.name}
                              className="w-10 h-10 rounded-lg object-cover border border-primary/50"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-primary-foreground text-xs leading-tight">{selectedAvatar.name}</span>
                              <span className="text-[10px] text-primary/90">已选数字人形象</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedAvatar(null)}
                              className="w-4 h-4 rounded-full bg-black/60 hover:bg-black flex items-center justify-center text-white ml-1.5"
                              title="清除数字人"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                            {QUICK_AVATARS.map(avatar => (
                              <button
                                key={avatar.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAvatar(avatar);
                                  toast.success(`已成功选择数字人「${avatar.name}」，形象与发音人已同步载入！`, {
                                    duration: 4000,
                                    style: {
                                      background: '#161324',
                                      color: '#ffffff',
                                      border: '1.5px solid #8b5cf6',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8)',
                                      borderRadius: '16px',
                                      padding: '14px 18px',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                    },
                                  });
                                }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all text-xs text-white/80"
                              >
                                <img src={avatar.preview_image} className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-[11px] font-medium truncate max-w-[80px]">{avatar.name.split('·')[0]}</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => navigate('/avatars')}
                              className="px-2.5 py-1.5 rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-all text-xs font-medium shrink-0 flex items-center gap-1"
                            >
                              <Users2 className="w-3.5 h-3.5" />
                              更多数字人
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-white/60" />
                        </button>
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <Video className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      </>
                    )}
                  </div>
                  <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder="描述视频画面内容和动态过程，使用 @ 指定参考图或参考视频"
                    className={cn(
                      "flex-1 min-w-0 bg-transparent resize-none text-sm text-white/80 placeholder:text-white/25 outline-none min-h-[72px] leading-relaxed transition-all duration-300",
                      enhancing && "enhancing-text-wave"
                    )}
                    disabled={generating || enhancing}
                  />
                </div>

                {/* 上传的参考图片或视频预览 */}
                {(refImage || refVideo) && (
                  <div className="flex gap-3 px-12 pb-2">
                    {refImage && (
                      <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden group">
                        <img src={refImage} alt="Ref Image" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setRefImage(null)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    {refVideo && (
                      <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden group bg-black/40 flex items-center justify-center">
                        <Video className="w-6 h-6 text-white/40" />
                        <button
                          type="button"
                          onClick={() => setRefVideo(null)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 生成进度条 */}
              {generating && (
                <div className="px-3 md:px-4 pb-2">
                  <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700" style={{ width: `${genProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-white/30 mt-1">
                    正在生成中… {genProgress}% {taskId && <span className="text-white/20">#{taskId.slice(0, 8)}</span>}
                  </p>
                </div>
              )}

              {/* 底部工具栏 */}
              <div className="flex items-center justify-between px-3 md:px-4 pb-3 pt-2 border-t border-white/5 gap-2 w-full">
                <div className="flex items-center gap-1.5 py-0.5 pr-2">
                  {/* 模型选择 */}
                  <div className="relative">
                    <button onClick={() => { setModelOpen(o => !o); setResOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 text-xs text-emerald-400 transition-colors border border-emerald-500/20">
                      {(() => {
                        const currentModelObj = MODELS.find(m => m.id === model.id);
                        return <span className="text-sm leading-none">{currentModelObj?.iconSymbol || '⚡'}</span>;
                      })()}
                      <span className="hidden sm:inline font-semibold">{model.label}</span>
                      <span className="sm:hidden">模型</span>
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    {modelOpen && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[150px]">
                        {MODELS.map(m => (
                          <button key={m.id} onClick={() => { setModel({ label: m.label, id: m.id }); setModelOpen(false); }}
                            className={cn('w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition-colors', m.id === model.id ? 'text-emerald-400 bg-white/5 font-semibold' : 'text-white/70')}>
                            <span className="text-sm leading-none shrink-0">{m.iconSymbol}</span>
                            <span className="font-semibold">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 分辨率与高级参数弹窗 */}
                  <div className="relative">
                    <button onClick={() => { setResOpen(o => !o); setModelOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/15 text-xs text-blue-400 transition-colors border border-blue-500/20">
                      <BarChart2 className="w-3 h-3" />
                      <span className="hidden sm:inline">{resolution}</span>
                      <span className="sm:hidden">尺寸</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {resOpen && (
                      <div className="absolute top-full mt-2 left-0 z-50 bg-[#16151f] border border-white/10 rounded-2xl shadow-2xl p-4 w-[320px] space-y-4 text-white">
                        {/* 分辨率 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">分辨率</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['720P', '1080P'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => updateResolution(r, activeRatio, activeDuration)}
                                className={cn(
                                  "py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                  activeResolution === r
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 宽高比 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">宽高比</label>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: '9:16', style: 'w-2.5 h-4.5' },
                              { label: '16:9', style: 'w-4.5 h-2.5' },
                              { label: '1:1', style: 'w-3.5 h-3.5' },
                              { label: '3:4', style: 'w-3 h-4' },
                              { label: '4:3', style: 'w-4 h-3' },
                            ].map(item => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => updateResolution(activeResolution, item.label, activeDuration)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 h-16",
                                  activeRatio === item.label
                                    ? "bg-white/15 text-white border-white/20"
                                    : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/70"
                                )}
                              >
                                <div className={cn("border-2 border-current rounded-sm mb-1.5 shrink-0", item.style)} />
                                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 时长 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">时长</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={2}
                              max={15}
                              value={activeDuration}
                              onChange={(e) => updateResolution(activeResolution, activeRatio, parseInt(e.target.value))}
                              className="flex-1 accent-white bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 text-xs shrink-0 min-w-[50px] justify-center">
                              <span className="font-semibold">{activeDuration}</span>
                              <span className="text-white/40">s</span>
                            </div>
                          </div>
                        </div>

                        {/* 扩展 */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-xs text-white/70 font-medium">扩展 (自动优化提示词)</span>
                          <button
                            type="button"
                            onClick={() => setAutoOptimize(!autoOptimize)}
                            className={cn(
                              "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                              autoOptimize ? "bg-emerald-500" : "bg-white/10"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
                                autoOptimize ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={handleEnhancePrompt} disabled={enhancing || generating}
                    className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/15 text-xs text-pink-400 transition-colors border border-pink-500/20 disabled:opacity-40 shrink-0">
                    {enhancing ? <Loader2 className="w-3 h-3 animate-spin text-pink-400" /> : <Sparkles className="w-3 h-3 text-pink-400" />}
                    <span className="hidden sm:inline">提示词增强</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0 ml-auto">
                  <span className="text-xs text-white/25 hidden sm:block">{prompt.length}/8000</span>
                  {generating ? (
                    <button onClick={() => { stopPoll(); setGenerating(false); setGenProgress(0); }}
                      className="flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-all shrink-0"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">取消</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
                          recording
                            ? "animate-pulse border-red-500/50 text-red-500 bg-red-500/10"
                            : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                        )}
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <button onClick={handleGenerate}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="sm:hidden">生成</span>
                        <span className="hidden sm:inline">AI视频生成</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 图片生成输入区 ────────────────────────────────────────────── */}
        {mainTab === '图片生成' && (
          <div className="rounded-2xl" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)', padding: '1.5px' }}>
            <div className="rounded-[14px] bg-[#16151f] border border-transparent transition-all duration-300">
              {/* 顶部 Tab + 展开按钮 */}
              <div className="flex items-center justify-between px-3 md:px-4 pt-3 pb-1">
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  {['智能绘图', '智能扩图', '风格融合'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setImgSubTab(t)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap shrink-0',
                        imgSubTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                      )}
                    >
                      {t === '智能绘图' && <ImageIcon className="w-3.5 h-3.5" />}
                      {t === '智能扩图' && <Maximize2 className="w-3.5 h-3.5" />}
                      {t === '风格融合' && <Layers className="w-3.5 h-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 隐藏的图片生成参考图输入 */}
              <input
                type="file"
                ref={imgUploadInputRef}
                onChange={handleImgRefImageUpload}
                accept="image/*"
                className="hidden"
              />

              {/* 文本输入 */}
              <div className="px-3 md:px-4 pb-2 flex items-start gap-2 md:gap-3">
                <div className="flex gap-1.5 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => imgUploadInputRef.current?.click()}
                    className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-white/60" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={imgPrompt}
                  onChange={e => setImgPrompt(e.target.value)}
                  placeholder={
                    imgSubTab === '智能绘图'
                      ? "描述图片画面内容、细节与构图，例如：‘一个复古风格的胶片相机放在木质桌面上，柔和的夕阳斜照，写实风格，8k分辨率’"
                      : imgSubTab === '智能扩图'
                        ? "上传要扩展的图片并描述扩图的延伸区域与比例，例如：‘扩展画面四周，延伸背景为茂密的森林，自然光线，无缝衔接’"
                        : "上传参考风格图与主体图，描述融合后的画面，例如：‘将主体图的人物置入参考图的赛博朋克霓虹街区风格中，红蓝霓虹光影’"
                  }
                  className={cn(
                    "flex-1 min-w-0 bg-transparent resize-none text-sm text-white/80 placeholder:text-white/25 outline-none min-h-[72px] leading-relaxed transition-all duration-300",
                    enhancingImg && "enhancing-text-wave"
                  )}
                  disabled={imgGenerating}
                />
              </div>

              {/* 图片提示词增强进度条动效 */}
              {(enhancingImg || imgEnhanceProgress > 0) && (
                <div className="px-4 pb-2.5 animate-in fade-in duration-300">
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 transition-all duration-300 rounded-full"
                      style={{ width: `${imgEnhanceProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-pink-400 mt-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 animate-spin text-pink-400" />
                      AI 多模态画质与画面提示词智能增强中...
                    </span>
                    <span className="font-mono font-bold text-pink-300">{imgEnhanceProgress}%</span>
                  </div>
                </div>
              )}

              {/* 上传的参考图预览 */}
              {imgRefImage && (
                <div className="flex gap-3 px-12 pb-2">
                  <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden group">
                    <img src={imgRefImage} alt="Ref Image" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImgRefImage(null)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* 生成进度条 */}
              {imgGenerating && (
                <div className="px-3 md:px-4 pb-2">
                  <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${imgProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-white/30 mt-1">
                    正在绘制中… {imgProgress}%
                  </p>
                </div>
              )}

              {/* 底部工具栏 */}
              <div className="flex items-center justify-between px-3 md:px-4 pb-3 pt-2 border-t border-white/5 gap-2 w-full">
                <div className="flex items-center gap-1.5 py-0.5 pr-2">
                  {/* 模型选择 */}
                  <div className="relative">
                    <button onClick={() => { setImgModelOpen(o => !o); setImgResOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/15 text-xs text-pink-400 transition-colors border border-pink-500/20">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span className="hidden sm:inline">{imgModel.label}</span>
                      <span className="sm:hidden">模型</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {imgModelOpen && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]">
                        {IMG_MODELS.map(m => (
                          <button key={m.id} onClick={() => { setImgModel(m); setImgModelOpen(false); }}
                            className={cn('w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors', m.id === imgModel.id ? 'text-pink-400' : 'text-white/70')}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 尺寸/比例 */}
                  <div className="relative">
                    <button onClick={() => { setImgResOpen(o => !o); setImgModelOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/15 text-xs text-purple-400 transition-colors border border-purple-500/20">
                      <BarChart2 className="w-3 h-3 text-purple-400" />
                      <span className="hidden sm:inline">{imgResolution}</span>
                      <span className="sm:hidden">尺寸</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {imgResOpen && (
                      <div className="absolute top-full mt-2 left-0 z-50 bg-[#16151f] border border-white/10 rounded-2xl shadow-2xl p-4 w-[340px] space-y-4 text-white">
                        {/* 分辨率 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">分辨率</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['1K', '2K', '4K'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => updateImgResolution(r, imgQuality, imgAspect)}
                                className={cn(
                                  "py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                  imgResolutionType === r
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 质量 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">质量</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['低', '中', '高'].map(q => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => updateImgResolution(imgResolutionType, q, imgAspect)}
                                className={cn(
                                  "py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                  imgQuality === q
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 自定义尺寸 */}
                        <div className="flex items-center justify-between py-1 border-t border-b border-white/5">
                          <span className="text-xs text-white/70 font-medium">自定义尺寸</span>
                          <button
                            type="button"
                            onClick={() => setImgCustomSize(!imgCustomSize)}
                            className={cn(
                              "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                              imgCustomSize ? "bg-pink-500" : "bg-white/10"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
                                imgCustomSize ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {/* 比例 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">比例</label>
                          <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {[
                              { label: 'Auto', style: 'Auto' },
                              { label: '1:1', style: 'w-3 h-3' },
                              { label: '16:9', style: 'w-4.5 h-2.5' },
                              { label: '9:16', style: 'w-2.5 h-4.5' },
                              { label: '4:3', style: 'w-4 h-3' },
                              { label: '3:4', style: 'w-3 h-4' },
                              { label: '3:2', style: 'w-4 h-2.7' },
                              { label: '2:3', style: 'w-2.7 h-4' },
                              { label: '5:4', style: 'w-4 h-3.2' },
                              { label: '4:5', style: 'w-3.2 h-4' },
                              { label: '2:1', style: 'w-5 h-2.5' },
                              { label: '1:2', style: 'w-2.5 h-5' },
                              { label: '21:9', style: 'w-5.5 h-2.3' },
                              { label: '9:21', style: 'w-2.3 h-5.5' },
                            ].map(item => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => updateImgResolution(imgResolutionType, imgQuality, item.label)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-200 h-14",
                                  imgAspect === item.label
                                    ? "bg-white/15 text-white border-white/20"
                                    : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/70"
                                )}
                              >
                                {item.style === 'Auto' ? (
                                  <Sparkles className="w-3.5 h-3.5 text-pink-400 mb-1 shrink-0" />
                                ) : (
                                  <div className={cn("border-2 border-current rounded-sm mb-1 shrink-0", item.style)} />
                                )}
                                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 提示词增强 */}
                  <button onClick={handleEnhanceImgPrompt} disabled={enhancingImg || imgGenerating}
                    className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/15 text-xs text-pink-400 transition-colors border border-pink-500/20 disabled:opacity-40 shrink-0">
                    {enhancingImg ? <Loader2 className="w-3 h-3 animate-spin text-pink-400" /> : <Sparkles className="w-3.5 h-3.5 text-pink-400" />}
                    <span className="hidden sm:inline">提示词增强</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 md:gap-3 ml-auto">
                  {!imgGenerating && (
                    <button
                      type="button"
                      onClick={handleImgVoiceInput}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
                        imgRecording
                          ? "animate-pulse border-red-500/50 text-red-500 bg-red-500/10"
                          : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                      )}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                  {imgGenerating ? (
                    <button onClick={() => { setImgGenerating(false); setImgProgress(0); }}
                      className="flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-all shrink-0"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">取消</span>
                    </button>
                  ) : (
                    <button onClick={handleImageGenerate}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
                      style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', color: '#fff', boxShadow: '0 0 20px rgba(236,72,153,0.35)' }}>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="sm:hidden">生成</span>
                      <span className="hidden sm:inline">生成图片</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 生成结果视频 */}
        {resultVideo && mainTab === '视频生成' && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#13121b] mb-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/80">生成结果</span>
                {selectedAvatar && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-xs text-pink-300">
                    <img src={selectedAvatar.preview_image || '/person/girl1.png'} alt={selectedAvatar.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                    <span>已生成对应数字人 <strong>{selectedAvatar.name}</strong> 形象带货视频</span>
                  </div>
                )}
                <button
                  onClick={() => navigate('/works')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/20 hover:bg-primary/30 text-primary transition-colors border border-primary/20 flex items-center gap-1"
                >
                  <Video className="w-3 h-3" /> 作品素材
                </button>
              </div>
              <button onClick={() => setResultVideo(null)} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <video src={resultVideo} controls autoPlay className="w-full max-h-[60vh] object-contain bg-black" />
          </div>
        )}

        {/* 生成结果图片 */}
        {resultImage && mainTab === '图片生成' && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#13121b] max-w-lg mx-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium text-white/80">生成结果</span>
              <div className="flex items-center gap-2">
                <a href={resultImage} download="ai_image.png" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white/90 transition-colors">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => setResultImage(null)} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <img src={resultImage} alt="AI Generated" className="w-full object-contain bg-black" />
          </div>
        )}

        {/* ── 功能区、工具条、灵感广场（在生成及绘图选项下显示） ─────────────────── */}
        {mainTab !== '分镜编辑' && (
          <>
            {/* ── 功能区 ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* 左侧大卡：作品素材 */}
              <div className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden cursor-pointer group"
                style={{ background: 'linear-gradient(135deg,#1a1230 0%,#251840 100%)', border: '1px solid rgba(139,92,246,0.25)' }}
                onClick={() => navigate('/works')}>
                <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop" alt="作品素材"
                  className="absolute right-0 top-0 w-36 h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />
                <div className="relative z-10 space-y-2">
                  <h3 className="text-xl font-bold">作品素材</h3>
                  <p className="text-sm text-white/50">管理已生成的视频与上传的素材库</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['视频作品', '素材管理', '智能剪辑'].map(m => (
                      <span key={m} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/8 text-white/60 border border-white/10">{m}</span>
                    ))}
                  </div>
                </div>
                <button className="relative z-10 w-fit mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={e => { e.stopPropagation(); navigate('/works'); }}>
                  进入管理 →
                </button>
              </div>

              {/* 右侧 2×3 工具卡片 */}
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_TOOLS.map(tool => (
                  <button key={tool.id} onClick={() => navigate(tool.path)}
                    className="relative rounded-xl overflow-hidden group h-[90px] flex items-end p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ background: '#1a1830', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <img src={tool.cover} alt={tool.label} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className={cn('absolute inset-0 bg-gradient-to-r opacity-60', tool.gradient)} />
                    <div className="relative z-10">
                      <p className="text-sm font-semibold text-white">{tool.label}</p>
                      <p className="text-[10px] text-white/50 leading-tight truncate">{tool.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>



            {/* ── 灵感广场 ──────────────────────────────────────────────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">灵感广场</h2>
                <button className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
                  More <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* 筛选栏 */}
              <div className="flex items-center gap-2 flex-wrap relative">
                {activeDropdown && (
                  <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                )}
                {FILTER_CONFIG.map(f => (
                  <div key={f.key} className="relative z-50">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === f.key ? null : f.key)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors border",
                        (f.key === 'model' && filterModel !== '全部') ||
                        (f.key === 'ratio' && filterRatio !== '全部') ||
                        (f.key === 'refImage' && filterRefImage !== '全部') ||
                        (f.key === 'firstLast' && filterFirstLast !== '全部') ||
                        (f.key === 'category' && filterCategory !== '全部') ||
                        (f.key === 'language' && filterLanguage !== '全部')
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                          : "text-white/60 hover:text-white/90 hover:bg-white/8 border-white/8"
                      )}
                    >
                      {f.label}：{
                        f.key === 'model' ? filterModel :
                        f.key === 'ratio' ? filterRatio :
                        f.key === 'refImage' ? filterRefImage :
                        f.key === 'firstLast' ? filterFirstLast :
                        f.key === 'category' ? filterCategory :
                        filterLanguage
                      }
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {activeDropdown === f.key && (
                      <div className="absolute top-full mt-1.5 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[120px] max-h-60 overflow-y-auto">
                        {f.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              if (f.key === 'model') setFilterModel(opt);
                              else if (f.key === 'ratio') setFilterRatio(opt);
                              else if (f.key === 'refImage') setFilterRefImage(opt);
                              else if (f.key === 'firstLast') setFilterFirstLast(opt);
                              else if (f.key === 'category') setFilterCategory(opt);
                              else if (f.key === 'language') setFilterLanguage(opt);
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors',
                              (f.key === 'model' && filterModel === opt) ||
                              (f.key === 'ratio' && filterRatio === opt) ||
                              (f.key === 'refImage' && filterRefImage === opt) ||
                              (f.key === 'firstLast' && filterFirstLast === opt) ||
                              (f.key === 'category' && filterCategory === opt) ||
                              (f.key === 'language' && filterLanguage === opt)
                                ? 'text-emerald-400 font-medium'
                                : 'text-white/70'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* 🔍 搜索提示词或关键词 */}
                <div className="relative ml-auto flex items-center bg-white/4 border border-white/6 rounded-lg px-2.5 py-1 text-xs text-white/70 focus-within:border-white/20 z-50">
                  <span className="mr-1">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索提示词或关键词"
                    className="bg-transparent border-none outline-none text-white text-xs placeholder:text-white/20 w-44"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="ml-1 text-white/30 hover:text-white/60">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 瀑布流视频 4列 */}
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {filteredInspireVideos.map((video, i) => (
                  <div key={i} 
                    className="break-inside-avoid rounded-xl overflow-hidden group cursor-pointer relative bg-black/20"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={(e) => {
                      const v = e.currentTarget.querySelector('video');
                      if (v) v.play().catch(err => console.log('Autoplay blocked:', err));
                    }}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget.querySelector('video');
                      if (v) {
                        v.pause();
                        v.currentTime = 0;
                      }
                    }}
                    onClick={() => setActivePlayVideo(video)}
                  >
                    <video
                      src={video.url}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">{video.model}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">{video.model}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">{video.ratio}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] text-white/90 line-clamp-2 leading-relaxed">{video.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40">{video.category} · {video.language}</span>
                          <div className="flex gap-1.5">
                            <button className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (mainTab === '视频生成') {
                                  setPrompt(video.prompt);
                                  toast.success('已应用该视频的提示词');
                                } else if (mainTab === '图片生成') {
                                  setImgPrompt(video.prompt);
                                  toast.success('已应用该视频的提示词');
                                }
                              }}
                              title="应用此提示词">
                              <Copy className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredInspireVideos.length === 0 && (
                <div className="text-center py-10 text-white/30 text-sm">
                  没有找到符合筛选条件的灵感视频
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 视频分析/分镜编辑（5步生成视频卡片） ──────────────────────────────────────── */}
        {mainTab === '分镜编辑' && (
          <div className="w-full -mt-8">
            <ProductVideoWizard />
          </div>
        )}

        {/* 灵感广场视频带声音弹窗播放 */}
        {activePlayVideo && (() => {
          const isVertical = activePlayVideo.ratio === '9:16' || activePlayVideo.ratio === '3:4';
          const isSquare = activePlayVideo.ratio === '1:1';
          const aspectClass = activePlayVideo.ratio === '9:16' ? 'aspect-[9/16]' :
                              activePlayVideo.ratio === '3:4' ? 'aspect-[3/4]' :
                              activePlayVideo.ratio === '1:1' ? 'aspect-square' :
                              'aspect-video';
          return (
            <Dialog open={!!activePlayVideo} onOpenChange={() => setActivePlayVideo(null)}>
              <DialogContent className={cn(
                "bg-zinc-950 border-zinc-800 text-zinc-200 p-0 overflow-hidden",
                isVertical ? "max-w-[380px]" : isSquare ? "max-w-md" : "max-w-2xl"
              )}>
                <DialogHeader className="p-4 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                  <DialogTitle className="text-sm font-semibold truncate pr-4 text-zinc-100">
                    {activePlayVideo.prompt}
                  </DialogTitle>
                </DialogHeader>
                <div className={cn("w-full bg-black relative flex items-center justify-center", aspectClass)}>
                  <video
                    src={activePlayVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* 选择商品管理中的商品 弹窗 */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] bg-[#16151f] border-white/10 text-white p-0 overflow-hidden flex flex-col rounded-2xl shadow-2xl">
            {/* 弹窗头部 */}
            <DialogHeader className="p-5 border-b border-white/10 bg-gradient-to-r from-violet-950/60 via-purple-950/40 to-[#16151f] flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-inner">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    选择商品管理中的商品
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium border border-violet-500/30">
                      {filteredSelectorProducts.length} 款可选用
                    </span>
                  </DialogTitle>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    选择商品后将自动提取标题、活动价格、核心卖点与详细描述，一键转换填充为带货脚本提示词
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* 搜索与分类筛选栏 */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索商品名称、核心卖点、品牌或分类..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/60"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    navigate('/products');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  管理已有商品
                </button>
              </div>

              {/* 分类切换 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {['全部', '服装配饰', '美妆护肤', '数码电器', '食品饮料', '家居用品'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs transition-all shrink-0 border',
                      selectedCategoryFilter === cat
                        ? 'bg-violet-600 border-violet-500 text-white font-semibold shadow-md'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 font-medium'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[460px] space-y-3">
              {loadingProducts ? (
                <div className="py-16 text-center text-zinc-400 space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-400 mx-auto" />
                  <p className="text-xs">正在加载商品管理库中的数据...</p>
                </div>
              ) : filteredSelectorProducts.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 space-y-3">
                  <Package className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-sm">未搜索到相关商品</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductModalOpen(false);
                      navigate('/products');
                    }}
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold text-xs hover:bg-violet-500 transition-colors inline-flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    前往「商品管理」添加商品
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSelectorProducts.map(prod => {
                    const isSelected = selectedProduct?.id === prod.id;
                    const points = [...(prod.selling_points || []), ...(prod.ai_selling_points || [])].filter(Boolean);
                    const price = prod.sale_price ?? prod.original_price;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 group relative overflow-hidden shadow-sm',
                          isSelected
                            ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-lg'
                            : 'bg-[#1a1829] border-zinc-800 hover:border-violet-500/40 hover:bg-[#211e35]'
                        )}
                      >
                        {/* 封面图 */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 relative">
                          <img
                            src={prod.cover_image || getCategoryFallbackImage(prod.category)}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getCategoryFallbackImage(prod.category);
                            }}
                          />
                          <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-zinc-300 border border-white/15 font-medium">
                            {prod.category}
                          </span>
                        </div>

                        {/* 描述信息 */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">
                              {prod.name}
                            </h4>
                            {price && (
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-base font-extrabold text-rose-400">¥{price}</span>
                                {prod.original_price && prod.sale_price && prod.original_price > prod.sale_price && (
                                  <span className="text-xs text-zinc-500 line-through">¥{prod.original_price}</span>
                                )}
                              </div>
                            )}
                            {points.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {points.slice(0, 2).map((pt, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-medium max-w-[135px] truncate"
                                  >
                                    ⚡ {pt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                            <span className="text-[11px] text-zinc-400">
                              月销: {prod.sales_count || 0}
                            </span>
                            <button
                              type="button"
                              className={cn(
                                'text-xs font-semibold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 shadow-sm',
                                isSelected
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-md'
                                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-violet-400/30'
                              )}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
                              {isSelected ? '已选此商品' : '提取视频脚本'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
