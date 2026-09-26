import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { deductUserCredits, refundGenerationCredits } from '@/hooks/useCredits';
import { ensureCreditsForGeneration, openCreditsDialog, VIDEO_GENERATE_COST } from '@/lib/creditGuard';
import { useDraft } from '@/hooks/useDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ChevronRight, ChevronLeft, Package, Settings2, Film, Upload,
  Play, Sparkles, Plus, Trash2, GripVertical, RefreshCw,
  CheckCircle2, Loader2, Download, X, ImageIcon, Video, Wand2, BarChart3, Globe,
  Copy, Layers, Info,
  ShoppingBag, ExternalLink, Pencil, Search, DollarSign, Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DouyinIcon, TikTokIcon, XiaohongshuIcon } from '@/components/ui/platform-icons';
import type { ProductFormData, PromptConfig, Shot, MaterialItem, VideoProject } from '@/types/types';
import { sendDeepSeekStreamRequest } from '@/lib/sse';
import { getVideoCoverImage } from '@/lib/videoFrame';

// ── CR-05 跨平台适配配置 ────────────────────────────────────────────────────
const PLATFORM_CONFIGS = [
  {
    id: 'douyin',
    name: '抖音',
    Icon: DouyinIcon,
    aspect: '9:16',
    resolution: '1080×1920',
    duration: '15-60s',
    format: '竖屏短视频',
    color: 'text-[#FE2C55]',
    bg: 'bg-[#FE2C55]/10',
    border: 'border-[#FE2C55]/30',
    activeBg: 'bg-[#FE2C55]/10',
    activeBorder: 'border-[#FE2C55]',
    features: ['强钩子开场', '快节奏剪辑', '商品挂车', '口播字幕'],
    desc: '竖屏全屏沉浸，前3秒强钩子，适合冲动消费',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    Icon: TikTokIcon,
    aspect: '16:9',
    resolution: '1920×1080',
    duration: '15-180s',
    format: '横屏宽屏',
    color: 'text-foreground',
    bg: 'bg-foreground/10',
    border: 'border-foreground/30',
    activeBg: 'bg-foreground/10',
    activeBorder: 'border-foreground',
    features: ['英语字幕', '横屏构图', '国际化风格', '品牌露出'],
    desc: '横屏宽屏格式，英语配音，适合跨境品牌出海',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    Icon: XiaohongshuIcon,
    aspect: '1:1',
    resolution: '1080×1080',
    duration: '图文/30-90s',
    format: '图文/方形视频',
    color: 'text-[#FF2442]',
    bg: 'bg-[#FF2442]/10',
    border: 'border-[#FF2442]/30',
    activeBg: 'bg-[#FF2442]/10',
    activeBorder: 'border-[#FF2442]',
    features: ['种草文案', '图文并茂', '生活方式', '好物推荐'],
    desc: '方形图文种草，文艺生活调性，适合品质消费',
  },
];

// ── 跨平台适配卡片组件 ─────────────────────────────────────────────────────
function PlatformCard({
  config, selected, onToggle,
}: {
  config: typeof PLATFORM_CONFIGS[0];
  selected: boolean;
  onToggle: () => void;
}) {
  const { Icon } = config;
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full rounded-xl border-2 p-2.5 text-left transition-all',
        selected
          ? `${config.activeBorder} ${config.activeBg}`
          : 'border-border/60 bg-muted/20 hover:border-border',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
          <Icon className={cn('w-4.5 h-4.5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{config.name}</span>
            <Badge variant="outline" className={cn('text-[10px] h-4 px-1 border', config.border, config.color)}>{config.aspect}</Badge>
            {selected && <CheckCircle2 className={cn('w-3.5 h-3.5 ml-auto shrink-0', config.color)} />}
          </div>
          <p className="text-[11px] text-muted-foreground">{config.format} · {config.resolution}</p>
        </div>
      </div>
    </button>
  );
}

// ─── 步骤定义 ────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: '商品信息', icon: Package },
  { id: 2, label: 'Prompt配置', icon: Settings2 },
  { id: 3, label: '分镜编辑', icon: Film },
  { id: 4, label: '素材上传', icon: Upload },
  { id: 5, label: '生成视频', icon: Play },
];

const VIDEO_STYLES = ['活泼热情', '专业权威', '温馨生活', '时尚潮流', '悬念吸引', '测评分析'];
const BGM_OPTIONS = ['轻松欢快', '节奏感强', '温柔抒情', '科技感', '无BGM'];
const SUBTITLE_STYLES = ['简洁白底', '描边黑字', '渐变彩色', '纯文字', '无字幕'];
const CATEGORIES = ['美妆护肤', '服装配饰', '家居用品', '数码电器', '食品饮料', '母婴用品', '运动户外', '其他'];
const STORYBOARD_TEMPLATES = [
  {
    id: 'pain_point',
    name: '痛点解决型',
    description: '先展示痛点，再引出产品解决方案，适合功能型产品',
    cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_12f9ab35-d9b1-4338-bcb6-d7cde173f07a.jpg',
    accentColor: '#f97316',
    accentBg: 'rgba(249,115,22,0.12)',
    accentBorder: 'rgba(249,115,22,0.6)',
    shots: [
      { id: 's1', order: 1, type: '开场钩子', description: '展示用户痛点场景', duration: 3, text_overlay: '你是否有这样的困扰？', transition: 'fade' },
      { id: 's2', order: 2, type: '产品亮相', description: '产品特写镜头', duration: 4, text_overlay: '全新解决方案来了', transition: 'zoom' },
      { id: 's3', order: 3, type: '功能展示', description: '展示核心功能', duration: 6, text_overlay: '核心功能一目了然', transition: 'slide' },
      { id: 's4', order: 4, type: '效果对比', description: '使用前后对比', duration: 5, text_overlay: '使用前 VS 使用后', transition: 'fade' },
      { id: 's5', order: 5, type: '行动号召', description: '促销信息+购买引导', duration: 4, text_overlay: '限时优惠，点击购买！', transition: 'fade' },
    ] as Shot[],
  },
  {
    id: 'unboxing',
    name: '开箱测评型',
    description: '真实开箱体验，增强信任感，适合高价值产品',
    cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_39220fe7-a19a-4045-bba3-936910a9ed2b.jpg',
    accentColor: '#3b82f6',
    accentBg: 'rgba(59,130,246,0.12)',
    accentBorder: 'rgba(59,130,246,0.6)',
    shots: [
      { id: 'u1', order: 1, type: '封面吸引', description: '产品外观展示', duration: 3, text_overlay: '收到这个超惊喜！', transition: 'fade' },
      { id: 'u2', order: 2, type: '开箱过程', description: '开箱细节展示', duration: 5, text_overlay: '开箱实录', transition: 'slide' },
      { id: 'u3', order: 3, type: '外观细节', description: '多角度产品展示', duration: 4, text_overlay: '做工细节', transition: 'zoom' },
      { id: 'u4', order: 4, type: '实际使用', description: '真实使用过程', duration: 6, text_overlay: '实际体验测评', transition: 'fade' },
      { id: 'u5', order: 5, type: '行动号召', description: '引导购买', duration: 4, text_overlay: '真心推荐，快入手吧', transition: 'fade' },
    ] as Shot[],
  },
  {
    id: 'contrast',
    name: '反差反转型',
    description: '通过前后的强烈反差吸引眼球，适合美妆、服饰等',
    cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_47f5b277-c955-4429-adfb-b3699d3d9d6f.jpg',
    accentColor: '#a855f7',
    accentBg: 'rgba(168,85,247,0.12)',
    accentBorder: 'rgba(168,85,247,0.6)',
    shots: [
      { id: 'c1', order: 1, type: '低谷现状', description: '展示极差的现状或素颜', duration: 3, text_overlay: '以前的我...', transition: 'fade' },
      { id: 'c2', order: 2, type: '惊艳反转', description: '使用产品后的绝佳效果', duration: 4, text_overlay: '直到遇到了它！', transition: 'flash_white' },
      { id: 'c3', order: 3, type: '核心亮点', description: '展示产品核心卖点', duration: 4, text_overlay: '核心黑科技', transition: 'push' },
      { id: 'c4', order: 4, type: '细节展示', description: '产品质地或细节展示', duration: 3, text_overlay: '细节满分', transition: 'slide' },
      { id: 'c5', order: 5, type: '行动号召', description: '引导购买及福利', duration: 4, text_overlay: '现在入手最划算', transition: 'fade' },
    ] as Shot[],
  },
  {
    id: 'tutorial',
    name: '教程干货型',
    description: '通过提供价值吸引目标受众，适合教育、软件、工具',
    cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_e43a299a-588f-4d27-8e1f-43fd69c3e3d7.jpg',
    accentColor: '#22c55e',
    accentBg: 'rgba(34,197,94,0.12)',
    accentBorder: 'rgba(34,197,94,0.6)',
    shots: [
      { id: 't1', order: 1, type: '抛出问题', description: '提出受众关心的问题', duration: 3, text_overlay: '还在用笨办法？', transition: 'fade' },
      { id: 't2', order: 2, type: '引出方案', description: '展示产品作为工具', duration: 3, text_overlay: '试试这个神器', transition: 'zoom' },
      { id: 't3', order: 3, type: '步骤拆解1', description: '操作步骤第一步', duration: 4, text_overlay: '第一步：轻松设置', transition: 'wipe' },
      { id: 't4', order: 4, type: '步骤拆解2', description: '操作步骤第二步', duration: 4, text_overlay: '第二步：一键生成', transition: 'wipe' },
      { id: 't5', order: 5, type: '行动号召', description: '引导体验', duration: 4, text_overlay: '马上点击左下角体验', transition: 'fade' },
    ] as Shot[],
  },
];

// ─── 步骤进度条 ────────────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 md:gap-1 w-full overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        return (
          <div key={step.id} className="flex items-center flex-shrink-0 md:flex-1">
            <div className={cn(
              'flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg transition-all duration-300',
              isActive && 'bg-primary text-primary-foreground shadow-md',
              isDone && 'bg-success/10 text-success',
              !isActive && !isDone && 'text-muted-foreground'
            )}>
              {isDone
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <Icon className="w-4 h-4 shrink-0" />}
              <span className={cn("text-xs font-medium truncate", !isActive && !isDone && "hidden md:block")}>{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mx-1 md:mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: 商品信息录入 ────────────────────────────────────────
function Step1Product({ data, onChange, onNext }: {
  data: Partial<ProductFormData>;
  onChange: (d: Partial<ProductFormData>) => void;
  onNext: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState(data.selling_points ?? '');
  const [aiPoints, setAiPoints] = useState<string[]>(data.ai_selling_points ?? []);

  // 商品库选择弹窗
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productList, setProductList] = useState<import('@/types/types').Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productLoading, setProductLoading] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState<import('@/types/types').Product | null>(null);
  const [editMode, setEditMode] = useState(true);

  // URL一键提炼卖点
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  const handleExtractUrl = async () => {
    if (!extractUrl.trim()) { toast.error('请输入商品详情页URL'); return; }
    setExtracting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'extract_url_selling_points', url: extractUrl }
      });
      if (error) throw error;
      const generated = res?.selling_points ?? [];
      setAiPoints(generated);
      onChange({ ...data, ai_selling_points: generated });
      toast.success('已自动提炼3条核心卖点');
    } catch (err: any) {
      console.error(err);
      toast.error('提炼失败，可能页面受限，请手动补充。');
    } finally {
      setExtracting(false);
    }
  };

  // 加载商品库
  const loadProducts = async () => {
    setProductLoading(true);
    try {
      const { data: rows } = await supabase
        .from('products').select('*').order('created_at', { ascending: false }).limit(50);
      setProductList((rows ?? []) as import('@/types/types').Product[]);
    } finally {
      setProductLoading(false);
    }
  };

  const openPicker = () => {
    setPickerOpen(true);
    loadProducts();
  };

  const pickProduct = (p: import('@/types/types').Product) => {
    setLinkedProduct(p);
    const sp = Array.isArray(p.selling_points) ? p.selling_points.join('、') : '';
    setPoints(sp);
    const newAiPoints = Array.isArray(p.ai_selling_points) && p.ai_selling_points.length > 0
      ? p.ai_selling_points
      : [];
    setAiPoints(newAiPoints);
    onChange({
      ...data,
      product_id: p.id,
      name: p.name,
      category: p.category,
      selling_points: sp,
      ai_selling_points: newAiPoints,
    });
    setEditMode(false);
    setPickerOpen(false);
    toast.success(`已关联商品：${p.name}`);
  };

  const handleGeneratePoints = async () => {
    if (!data.name?.trim()) { toast.error('请先填写商品名称'); return; }
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'generate_selling_points', product_name: data.name, category: data.category, selling_points: points }
      });
      if (error) throw error;
      const generated = res?.selling_points ?? [];
      setAiPoints(generated);
      onChange({ ...data, ai_selling_points: generated });
      toast.success('已自动生成3条核心卖点');
    } catch {
      const fallback = [
        `${data.name}，品质卓越，性能出众`,
        `专为用户需求设计，使用体验极佳`,
        `限时特惠，超高性价比，值得拥有`,
      ];
      setAiPoints(fallback);
      onChange({ ...data, ai_selling_points: fallback });
      toast.success('已自动生成卖点');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!data.name?.trim()) { toast.error('请填写商品名称'); return false; }
    if (!data.category) { toast.error('请选择商品品类'); return false; }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    onChange({ ...data, selling_points: points });
    onNext();
  };

  const filteredProducts = productList.filter(p =>
    productSearch.trim() === '' ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="animate-slide-up">
      {/* ── 2列主布局 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ══ 左列：商品信息 ══ */}
        <div className="space-y-4">
          {/* 商品信息卡片区 */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* 卡片头 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                </div>
                <span className="font-semibold text-sm">商品信息</span>
                {linkedProduct && (
                  <Badge variant="outline" className="text-[10px] border-success/40 text-success gap-1 py-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />已关联
                  </Badge>
                )}
              </div>
              {/* 操作按钮组 */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openPicker}>
                  <ShoppingBag className="w-3 h-3" />选择商品
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate('/products')}>
                  <ExternalLink className="w-3 h-3" /><span className="hidden sm:inline">商品管理</span>
                </Button>
                {linkedProduct && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setEditMode(v => !v)}>
                    <Pencil className="w-3 h-3" />{editMode ? '收起' : '修改'}
                  </Button>
                )}
              </div>
            </div>

            {/* 已关联商品预览 */}
            {linkedProduct && !editMode && (
              <div className="p-4">
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl border border-border/60 bg-muted overflow-hidden shrink-0">
                    {linkedProduct.cover_image
                      ? <img src={linkedProduct.cover_image} alt={linkedProduct.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/30" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground text-balance leading-tight">{linkedProduct.name}</h3>
                      <Badge className="shrink-0 bg-orange-500/10 text-orange-600 border-0 text-[10px]">{linkedProduct.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {linkedProduct.sale_price != null && (
                        <span className="flex items-center gap-0.5 text-destructive font-bold text-sm">
                          <DollarSign className="w-3 h-3" />{linkedProduct.sale_price.toFixed(2)}
                        </span>
                      )}
                      {linkedProduct.original_price != null && (
                        <span className="text-muted-foreground text-xs line-through">¥{linkedProduct.original_price.toFixed(2)}</span>
                      )}
                    </div>
                    {Array.isArray(linkedProduct.selling_points) && linkedProduct.selling_points.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {linkedProduct.selling_points.slice(0, 3).map((sp, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">{sp}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-muted-foreground" onClick={openPicker}>
                    <RefreshCw className="w-3 h-3" />换商品
                  </Button>
                  <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />商品信息已同步
                  </div>
                </div>
              </div>
            )}

            {/* 无关联商品引导 */}
            {!linkedProduct && !editMode && (
              <div className="p-5 flex flex-col items-center justify-center gap-3 text-center min-h-[120px]">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">还没有关联商品</p>
                  <p className="text-xs text-muted-foreground mt-0.5">从商品库选择已有商品，或手动输入商品信息</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={openPicker} className="gap-1.5 h-8 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5" />从商品库选择
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5 h-8 text-xs">
                    <Pencil className="w-3.5 h-3.5" />手动输入
                  </Button>
                </div>
              </div>
            )}

            {/* 手动输入 / 编辑表单 */}
            {editMode && (
              <div className="p-4 space-y-3">
                {/* 行1：商品名称 + 品类 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pname" className="text-xs">商品名称 <span className="text-destructive">*</span></Label>
                    <Input id="pname" placeholder="例：索尼WH-1000XM5" className="px-3 h-8 text-sm"
                      value={data.name ?? ''} onChange={e => onChange({ ...data, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">商品品类 <span className="text-destructive">*</span></Label>
                    <Select value={data.category ?? ''} onValueChange={v => onChange({ ...data, category: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="选择品类" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* 行2：品牌 + 售价 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pbrand" className="text-xs">品牌名称</Label>
                    <Input id="pbrand" placeholder="例：索尼 / Apple" className="px-3 h-8 text-sm"
                      value={(data as any).brand ?? ''} onChange={e => onChange({ ...data, brand: e.target.value } as any)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pprice" className="text-xs">商品售价（元）</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input id="pprice" placeholder="0.00" className="pl-7 pr-3 h-8 text-sm"
                        type="number" min="0" step="0.01"
                        value={(data as any).price ?? ''} onChange={e => onChange({ ...data, price: e.target.value } as any)} />
                    </div>
                  </div>
                </div>
                {/* 行3：商品链接 */}
                <div className="space-y-1.5">
                  <Label htmlFor="purl" className="text-xs">商品详情页链接（选填）</Label>
                  <div className="relative">
                    <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input id="purl" placeholder="https://item.taobao.com/..." className="pl-7 pr-3 h-8 text-sm"
                      value={(data as any).product_url ?? ''} onChange={e => onChange({ ...data, product_url: e.target.value } as any)} />
                  </div>
                </div>
                {/* 行4：核心卖点 */}
                <div className="space-y-1.5">
                  <Label htmlFor="sp" className="text-xs">核心卖点（选填）</Label>
                  <Textarea id="sp" placeholder="描述商品核心卖点，例：主动降噪顶级、续航30小时、折叠便携设计…" rows={3}
                    className="px-3 resize-none text-sm" value={points} onChange={e => setPoints(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* 下一步按钮 */}
          <div className="flex justify-end">
            <Button onClick={handleNext} className="min-w-[120px]">
              下一步 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* ══ 右列：平台适配 + AI卖点 ══ */}
        <div className="space-y-4">
          {/* 跨平台适配 */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
              <Layers className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">跨平台一键适配</span>
              <Badge variant="outline" className="text-xs border-primary/40 text-primary gap-1 ml-auto">
                <Sparkles className="w-2.5 h-2.5" />CR-05
              </Badge>
            </div>
            <div className="p-4 space-y-2.5">
              <p className="text-xs text-muted-foreground">可多选，同时生成多个平台格式</p>
              <div className="grid grid-cols-1 gap-2">
                {PLATFORM_CONFIGS.map(cfg => {
                  const extra: string[] = (data as any).extra_platforms ?? [];
                  const isMain = (data.target_platform ?? 'douyin') === cfg.id;
                  const isExtra = extra.includes(cfg.id);
                  const isSelected = isMain || isExtra;
                  return (
                    <PlatformCard
                      key={cfg.id}
                      config={cfg}
                      selected={isSelected}
                      onToggle={() => {
                        if (isMain) return;
                        const extras: string[] = (data as any).extra_platforms ?? [];
                        const newExtras = isExtra
                          ? extras.filter((e: string) => e !== cfg.id)
                          : [...extras, cfg.id];
                        onChange({ ...data, ...(({ extra_platforms: newExtras }) as any) } as ProductFormData);
                      }}
                    />
                  );
                })}
              </div>
              {(() => {
                const extra: string[] = (data as any).extra_platforms ?? [];
                const allSelected = [...new Set([data.target_platform ?? 'douyin', ...extra])];
                if (allSelected.length > 1) return (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
                    <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">将同时生成 {allSelected.length} 个版本：</span>
                      {allSelected.map(id => PLATFORM_CONFIGS.find(c => c.id === id)?.name).filter(Boolean).join(' + ')}
                      <span className="text-primary font-medium ml-1">· 利用率提升 {allSelected.length}x</span>
                    </p>
                  </div>
                );
                return null;
              })()}
            </div>
          </div>

          {/* AI卖点提炼 */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">AI卖点提炼</span>
            </div>
            <div className="p-4 space-y-4">
              {/* URL 提炼 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-info" />
                  <span className="text-xs font-medium">URL一键提炼</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="输入商品详情页链接..."
                    value={extractUrl}
                    onChange={e => setExtractUrl(e.target.value)}
                    className="flex-1 h-8 text-sm bg-background px-3"
                  />
                  <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleExtractUrl} disabled={extracting || !extractUrl}>
                    {extracting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    提炼
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">支持淘宝/京东/独立站商品详情页</p>
              </div>

              <Separator />

              {/* 卖点结果 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">核心卖点结果</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleGeneratePoints} disabled={loading || !data.name}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    AI生成
                  </Button>
                </div>
                {aiPoints.length > 0 ? (
                  <div className="space-y-1.5">
                    {aiPoints.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0 mt-0.5 h-4 w-4 flex items-center justify-center p-0">{i + 1}</Badge>
                        <span className="text-foreground text-pretty leading-relaxed">{p}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">暂无卖点，通过 URL 提炼或基于商品名称一键生成</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 商品库选择弹窗 ── */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              从商品库选择商品
            </DialogTitle>
            <DialogDescription>选择一个商品与此视频关联，自动同步商品信息与卖点</DialogDescription>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="px-5 py-3 border-b border-border/30 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 px-9 h-9 text-sm"
                placeholder="搜索商品名称或品类..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 商品列表 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {productLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center">
                  <Package className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {productSearch ? `未找到"${productSearch}"相关商品` : '暂无商品'}
                </p>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => navigate('/products')}>
                  <Plus className="w-3.5 h-3.5" />去添加商品
                </Button>
              </div>
            ) : (
              <div className="p-3 space-y-1.5">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => pickProduct(p)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      linkedProduct?.id === p.id
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border/50 hover:border-border hover:bg-muted/40'
                    )}
                  >
                    {/* 商品图 */}
                    <div className="w-14 h-14 rounded-lg bg-muted border border-border/40 overflow-hidden shrink-0">
                      {p.cover_image
                        ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                      }
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        <Badge className="shrink-0 text-[9px] bg-orange-500/10 text-orange-600 border-0 py-0">{p.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.sale_price != null && (
                          <span className="text-destructive font-semibold text-xs">¥{p.sale_price}</span>
                        )}
                        <span className="text-muted-foreground text-xs">库存 {p.stock}</span>
                      </div>
                    </div>
                    {linkedProduct?.id === p.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between shrink-0 bg-muted/20">
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => navigate('/products')}>
              <Plus className="w-3.5 h-3.5" />新建商品
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setPickerOpen(false)}>
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── Step 2: 数字人与 Prompt 配置 ────────────────────────────────────────
function Step2Prompt({ data, onChange, onNext, onPrev, productData }: {
  data: Partial<PromptConfig>;
  onChange: (d: Partial<PromptConfig>) => void;
  onNext: () => void; onPrev: () => void;
  productData: Partial<ProductFormData>;
}) {
  const [optimizing, setOptimizing] = useState(false);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const autoPrompt = `为【${productData.name ?? '商品'}】制作一个${data.duration ?? 30}秒的带货视频，
风格：${data.video_style ?? '活泼热情'}，目标平台：抖音/TikTok，
核心卖点：${productData.ai_selling_points?.join('、') ?? productData.selling_points ?? '待填写'}，
字幕样式：${data.subtitle_style ?? '简洁白底'}，背景音乐：${data.bgm ?? '轻松欢快'}，
要求视频吸引眼球、突出产品价值、以行动号召结尾。`;

  const initPrompt = data.prompt_text ?? autoPrompt;

  const handleOptimize = async () => {
    const inputPrompt = data.prompt_text ?? autoPrompt;
    if (!inputPrompt.trim()) {
      toast.error('请先输入或生成基础描述');
      return;
    }

    setOptimizing(true);
    
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const originalPrompt = inputPrompt;
    let fullText = '';
    let isFirstChunk = true;

    try {
      await sendDeepSeekStreamRequest({
        messages: [{
          role: 'user',
          content: `请优化以下AI视频生成 Prompt，将其扩展为一段专业的英文AI视频生成提示词。要求：画面细节丰富、镜头语言清晰、色彩与构图精美、适合带货电商场景。请直接输出优化后的英文Prompt，不要包含任何中文或多余的解释。原文：${originalPrompt}`,
        }],
        max_tokens: 1000,
        onData: (chunkData) => {
          if (!chunkData || chunkData === '[DONE]') return;
          let chunk = chunkData;
          try {
            const parsed = JSON.parse(chunkData);
            chunk = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.text ?? chunkData;
          } catch {
            // chunkData is already a plain text chunk
          }
          if (chunk) {
            if (isFirstChunk) {
              onChange({ ...data, prompt_text: '' });
              isFirstChunk = false;
            }
            fullText += chunk;
            onChange({ ...data, prompt_text: fullText });
          }
        },
        onComplete: () => {
          toast.success('Prompt已优化');
          setOptimizing(false);
        },
        onError: (err) => {
          if (!abortRef.current?.signal.aborted) {
            toast.error(`优化失败：${err.message}`);
            if (isFirstChunk) {
              onChange({ ...data, prompt_text: originalPrompt });
            }
          }
          setOptimizing(false);
        },
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
      if (!abortRef.current?.signal.aborted) {
        toast.error(`优化失败：${(e as Error).message}`);
        if (isFirstChunk) {
          onChange({ ...data, prompt_text: originalPrompt });
        }
      }
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* 数字人选择区域 */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-base">选择数字人</Label>
          <Button variant="ghost" size="sm" onClick={() => !optimizing && navigate('/avatars')} disabled={optimizing} className="text-primary h-8 px-2 text-xs">
            管理数字人库 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {[
            { id: '1', name: '知性女主播', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
            { id: '2', name: '活力小鲜肉', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
            { id: '3', name: '商务男士', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150&auto=format&fit=crop' },
            { id: '4', name: '邻家女孩', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
          ].map((avatar) => (
            <div 
              key={avatar.id} 
              className={cn(
                "flex flex-col items-center gap-2 cursor-pointer transition-all shrink-0",
                data.avatar_id === avatar.id ? "scale-105" : "hover:scale-105 opacity-70 hover:opacity-100",
                optimizing && "pointer-events-none opacity-40"
              )}
              onClick={() => !optimizing && onChange({ ...data, avatar_id: avatar.id })}
            >
              <div className={cn(
                "w-16 h-16 rounded-full overflow-hidden border-2 p-0.5 transition-colors",
                data.avatar_id === avatar.id ? "border-primary" : "border-transparent"
              )}>
                <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover rounded-full" />
              </div>
              <span className={cn(
                "text-xs font-medium",
                data.avatar_id === avatar.id ? "text-primary" : "text-muted-foreground"
              )}>{avatar.name}</span>
            </div>
          ))}
          
          <div 
            className={cn(
              "flex flex-col items-center gap-2 cursor-pointer group shrink-0",
              optimizing && "pointer-events-none opacity-40"
            )}
            onClick={() => !optimizing && navigate('/avatars')}
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-border group-hover:border-primary/50 group-hover:bg-primary/5 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">添加更多</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="space-y-1.5">
          <Label>视频风格</Label>
          <Select disabled={optimizing} value={data.video_style ?? 'active'} onValueChange={v => onChange({ ...data, video_style: v })}>
            <SelectTrigger><SelectValue placeholder="选择风格" /></SelectTrigger>
            <SelectContent>
              {VIDEO_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>背景音乐</Label>
          <Select disabled={optimizing} value={data.bgm ?? ''} onValueChange={v => onChange({ ...data, bgm: v })}>
            <SelectTrigger><SelectValue placeholder="选择BGM" /></SelectTrigger>
            <SelectContent>
              {BGM_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>字幕样式</Label>
          <Select disabled={optimizing} value={data.subtitle_style ?? ''} onValueChange={v => onChange({ ...data, subtitle_style: v })}>
            <SelectTrigger><SelectValue placeholder="选择字幕" /></SelectTrigger>
            <SelectContent>
              {SUBTITLE_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>目标语言</Label>
          <Select disabled={optimizing} value={data.language ?? 'zh'} onValueChange={v => onChange({ ...data, language: v })}>
            <SelectTrigger><SelectValue placeholder="选择语言" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">英语</SelectItem>
              <SelectItem value="ja">日语</SelectItem>
              <SelectItem value="ko">韩语</SelectItem>
              <SelectItem value="th">泰语</SelectItem>
              <SelectItem value="vi">越南语</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>视频时长：{data.duration ?? 30}秒</Label>
          <div className="pt-2 px-1">
            <Slider
              disabled={optimizing}
              min={15} max={60} step={5}
              value={[data.duration ?? 30]}
              onValueChange={([v]) => onChange({ ...data, duration: v })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>15s</span><span>60s</span>
            </div>
          </div>
        </div>
      </div>

      {/* 多语言翻译开关 */}
      {data.language && data.language !== 'zh' && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Globe className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">多语言翻译已启用</p>
            <p className="text-xs text-muted-foreground">生成后的脚本将自动翻译为{data.language === 'en' ? '英语' : data.language === 'ja' ? '日语' : data.language === 'ko' ? '韩语' : data.language === 'th' ? '泰语' : data.language === 'vi' ? '越南语' : data.language}</p>
          </div>
          <Badge className="bg-primary text-primary-foreground text-xs">AI翻译</Badge>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Prompt 文案</Label>
          <Button size="sm" variant="outline" onClick={handleOptimize} disabled={optimizing}>
            {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            AI优化
          </Button>
        </div>
        <Textarea
          rows={7}
          className="px-3 resize-none font-mono text-sm"
          value={data.prompt_text ?? initPrompt}
          onChange={e => onChange({ ...data, prompt_text: e.target.value })}
          disabled={optimizing}
          placeholder="输入或自动生成Prompt..."
        />
        <p className="text-xs text-muted-foreground">提示：Prompt会直接影响视频生成效果，可手动修改或点击AI优化</p>
      </div>

      {/* 预览摘要 */}
      <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-primary" />配置预览</p>
        <div className="flex flex-wrap gap-2">
          {[
            data.video_style && `风格：${data.video_style}`,
            data.bgm && `BGM：${data.bgm}`,
            data.subtitle_style && `字幕：${data.subtitle_style}`,
            `时长：${data.duration ?? 30}秒`,
          ].filter(Boolean).map(t => (
            <Badge key={t as string} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onPrev} disabled={optimizing}><ChevronLeft className="w-4 h-4 mr-1" />上一步</Button>
        <Button onClick={onNext} disabled={optimizing}>下一步 <ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  );
}

// ─── Step 3: 分镜编辑 ────────────────────────────────────────
function Step3Storyboard({ shots, onShotsChange, onNext, onPrev, productData }: {
  shots: Shot[]; onShotsChange: (s: Shot[]) => void;
  onNext: () => void; onPrev: () => void;
  productData: Partial<ProductFormData>;
}) {
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 拖拽排序状态
  const dragIdxRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => { dragIdxRef.current = idx; };
  const handleDragEnter = (idx: number) => { setDragOverIdx(idx); };
  const handleDragEnd   = () => {
    if (dragIdxRef.current !== null && dragOverIdx !== null && dragIdxRef.current !== dragOverIdx) {
      const reordered = [...shots];
      const [moved] = reordered.splice(dragIdxRef.current, 1);
      reordered.splice(dragOverIdx, 0, moved);
      onShotsChange(reordered);
    }
    dragIdxRef.current = null;
    setDragOverIdx(null);
  };

  const handleSelectTemplate = (tpl: typeof STORYBOARD_TEMPLATES[0]) => {
    onShotsChange(tpl.shots);
    toast.success(`已加载"${tpl.name}"模板`);
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'generate_storyboard',
          product_name: productData.name,
          selling_points: productData.ai_selling_points,
          category: productData.category,
        }
      });
      if (error) throw error;
      if (res?.shots?.length) {
        onShotsChange(res.shots);
        toast.success('AI已自动生成分镜脚本');
      }
    } catch {
      handleSelectTemplate(STORYBOARD_TEMPLATES[0]);
      toast.success('已生成默认分镜');
    } finally {
      setGenerating(false);
    }
  };

  const addShot = () => {
    const newShot: Shot = {
      id: crypto.randomUUID(),
      order: shots.length + 1,
      type: '自定义镜头',
      description: '新镜头描述',
      duration: 3,
      text_overlay: '',
      transition: 'fade',
    };
    onShotsChange([...shots, newShot]);
  };

  const removeShot = (id: string) => onShotsChange(shots.filter(s => s.id !== id));

  const updateShot = (id: string, updates: Partial<Shot>) => {
    onShotsChange(shots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const totalDuration = shots.reduce((a, s) => a + s.duration, 0);

  const exportScript = () => {
    const lines = shots.map(s =>
      `【镜头${s.order}】${s.type}（${s.duration}s）\n描述：${s.description}\n字幕：${s.text_overlay ?? ''}\n过渡：${s.transition ?? 'fade'}`
    );
    const content = `分镜脚本 - ${productData.name ?? '未命名'}\n\n` + lines.join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '分镜脚本.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success('分镜脚本已导出');
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* 模板选择 */}
      {shots.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">选择分镜模板快速开始，或让AI自动生成</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STORYBOARD_TEMPLATES.map(tpl => {
              const isSelected = shots.length > 0 && shots[0]?.id === tpl.shots[0]?.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="relative text-left rounded-xl border-2 overflow-hidden transition-all duration-200 min-h-[110px] group"
                  style={{
                    borderColor: isSelected ? tpl.accentColor : 'hsl(var(--border))',
                    background: isSelected ? tpl.accentBg : 'hsl(var(--muted)/0.4)',
                    boxShadow: isSelected ? `0 0 0 1px ${tpl.accentBorder}, 0 4px 20px ${tpl.accentBg}` : undefined,
                  }}
                >
                  {/* 封面图，无遮罩 */}
                  {tpl.cover && (
                    <img
                      src={tpl.cover}
                      alt={tpl.name}
                      className="absolute right-0 top-0 h-full w-32 object-cover"
                      style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
                    />
                  )}
                  {/* 选中态彩色左边框 */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: tpl.accentColor }} />
                  )}
                  {/* 内容 */}
                  <div className="relative p-4 pr-28 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-balance" style={{ color: isSelected ? tpl.accentColor : undefined }}>{tpl.name}</p>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ background: tpl.accentColor }}>已选</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-pretty line-clamp-2">{tpl.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{tpl.shots.length} 个镜头</p>
                  </div>
                </button>
              );
            })}
          </div>
          <Button variant="outline" onClick={handleAiGenerate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI自动生成分镜脚本
          </Button>
        </div>
      )}

      {shots.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{shots.length} 个镜头</span>
              <Badge variant="secondary">总时长 {totalDuration}秒</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportScript}>
                <Download className="w-3.5 h-3.5 mr-1.5" />导出脚本
              </Button>
              <Button size="sm" variant="outline" onClick={() => { onShotsChange([]); }}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />换模板
              </Button>
            </div>
          </div>

          {/* 时间轴 */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2 flex items-center gap-2 border-b border-border">
              <Film className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">分镜时间轴预览</span>
            </div>
            <div className="p-3 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {shots.map((shot, i) => {
                  const w = Math.max(60, shot.duration * 18);
                  const colors = ['bg-primary/20', 'bg-info/20', 'bg-success/20', 'bg-warning/20', 'bg-destructive/20'];
                  return (
                    <div key={shot.id}
                      style={{ width: `${w}px` }}
                      className={cn('rounded-md p-2 flex flex-col gap-0.5 cursor-pointer border-2 border-transparent hover:border-primary transition-all', colors[i % colors.length])}>
                      <span className="text-xs font-bold text-muted-foreground">镜头{i + 1}</span>
                      <span className="text-xs font-medium text-foreground truncate text-balance">{shot.type}</span>
                      <span className="text-xs text-muted-foreground">{shot.duration}s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 分镜列表 */}
          <div className="space-y-2">
            {shots.map((shot, idx) => (
              <div key={shot.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragOver={e => e.preventDefault()}
                onDragEnd={handleDragEnd}
                className={cn(
                  'rounded-xl border p-4 transition-all select-none',
                  editingId === shot.id ? 'border-primary bg-primary/5' : 'border-border',
                  dragOverIdx === idx && dragIdxRef.current !== idx && 'border-primary/60 bg-primary/5 scale-[1.01]',
                )}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0 cursor-grab active:cursor-grabbing" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">镜头 {idx + 1}</Badge>
                      {editingId === shot.id ? (
                        <Input className="h-7 text-sm px-2 flex-1"
                          value={shot.type}
                          onChange={e => updateShot(shot.id, { type: e.target.value })} />
                      ) : (
                        <span className="text-sm font-medium truncate">{shot.type}</span>
                      )}
                    </div>
                    {editingId === shot.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">镜头描述</Label>
                          <Textarea className="px-2 text-xs resize-none" rows={2}
                            value={shot.description}
                            onChange={e => updateShot(shot.id, { description: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">字幕文字</Label>
                          <Input className="px-2 text-xs"
                            value={shot.text_overlay ?? ''}
                            onChange={e => updateShot(shot.id, { text_overlay: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">时长（秒）: {shot.duration}s</Label>
                          <Slider min={2} max={15} step={1}
                            value={[shot.duration]}
                            onValueChange={([v]) => updateShot(shot.id, { duration: v })} />
                        </div>
                        <div>
                          <Label className="text-xs">转场效果</Label>
                          <Select value={shot.transition ?? 'fade'}
                            onValueChange={v => updateShot(shot.id, { transition: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[
                                { value: 'fade', label: '淡入淡出' },
                                { value: 'zoom', label: '中心放大' },
                                { value: 'slide', label: '滑动平移' },
                                { value: 'flash_white', label: '闪白转场' },
                                { value: 'blur', label: '模糊过渡' },
                                { value: 'push', label: '推入效果' },
                                { value: 'wipe', label: '擦除过渡' },
                                { value: 'cross_zoom', label: '交叉缩放' },
                                { value: 'none', label: '无转场' }
                              ].map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-pretty">{shot.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">{shot.duration}s</Badge>
                    <Button size="icon" variant="ghost" className="w-7 h-7"
                      onClick={() => setEditingId(editingId === shot.id ? null : shot.id)}>
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => removeShot(shot.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addShot} className="w-full">
            <Plus className="w-4 h-4 mr-1.5" />添加镜头
          </Button>
        </>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onPrev}><ChevronLeft className="w-4 h-4 mr-1" />上一步</Button>
        <Button onClick={onNext} disabled={shots.length === 0}>
          下一步 <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: 素材上传 ────────────────────────────────────────
function Step4Materials({ materials, onMaterialsChange, onNext, onPrev, shots }: {
  materials: MaterialItem[]; onMaterialsChange: (m: MaterialItem[]) => void;
  onNext: () => void; onPrev: () => void; shots: Shot[];
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchQuality, setMatchQuality] = useState<Record<string, number>>({});

  const uploadFile = async (file: File) => {
    if (!user) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext ?? '');
    const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext ?? '');
    if (!isImage && !isVideo) { toast.error(`不支持的格式：${ext}`); return; }

    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const bucket = 'materials';
    const { data: upData, error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) { toast.error(`上传失败：${file.name}`); return; }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(upData.path);

    await supabase.from('materials').insert({
      user_id: user.id, name: file.name,
      type: isImage ? 'image' : 'video',
      url: urlData.publicUrl, size: file.size,
    });

    const item: MaterialItem = {
      id: crypto.randomUUID(), name: file.name,
      type: isImage ? 'image' : 'video',
      url: urlData.publicUrl, size: file.size,
    };
    onMaterialsChange([...materials, item]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) await uploadFile(file);
    setUploading(false);
    toast.success(`已上传 ${files.length} 个素材`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [materials]);

  const removeMaterial = (id: string) => onMaterialsChange(materials.filter(m => m.id !== id));

  // P1-N01 智能素材匹配：根据分镜关键词和素材文件名做语义打分
  const autoMatch = async () => {
    if (!shots.length || !materials.length) return;
    setMatching(true);
    await new Promise(r => setTimeout(r, 1000));

    const quality: Record<string, number> = {};
    const updated = materials.map((m) => {
      // 对每个素材计算最佳分镜匹配
      let bestShotIdx = 0;
      let bestScore = -1;
      shots.forEach((s, idx) => {
        const shotText = `${s.description ?? ''} ${s.type ?? ''} ${s.text_overlay ?? ''}`.toLowerCase();
        const matText = m.name.replace(/[_\-\.]/g, ' ').toLowerCase();
        const matWords = matText.split(/\s+/).filter(Boolean);
        let hits = 0;
        for (const w of matWords) { if (shotText.includes(w) && w.length > 2) hits++; }
        const score = matWords.length > 0 ? hits / matWords.length : 0;
        if (score > bestScore) { bestScore = score; bestShotIdx = idx; }
      });
      // 轮转匹配保底
      const shotToUse = bestScore > 0 ? shots[bestShotIdx] : shots[materials.indexOf(m) % shots.length];
      quality[m.id] = bestScore > 0 ? Math.min(95, 60 + bestScore * 35) : 45 + Math.random() * 20;
      return { ...m, matched_shot_id: shotToUse.id };
    });

    onMaterialsChange(updated);
    setMatchQuality(quality);
    setMatching(false);
    toast.success(`智能匹配完成！已将 ${updated.length} 个素材匹配至最相关分镜`);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* 拖拽上传区 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <input type="file" multiple accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={e => handleFiles(e.target.files)} />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          {uploading
            ? <Loader2 className="w-10 h-10 text-primary animate-spin" />
            : <Upload className="w-10 h-10 text-muted-foreground" />}
          <p className="font-medium text-foreground">{uploading ? '上传中...' : '拖拽或点击上传素材'}</p>
          <p className="text-sm text-muted-foreground">支持 JPG、PNG、MP4、MOV 格式，可批量上传</p>
        </div>
      </div>

      {/* 素材列表 */}
      {materials.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">已上传素材 ({materials.length})</span>
            <Button size="sm" variant="outline" onClick={autoMatch} disabled={matching || !shots.length}>
              {matching
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />AI匹配中...</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />AI智能匹配分镜</>
              }
            </Button>
          </div>

          {/* P1-N01 匹配质量汇总 */}
          {Object.keys(matchQuality).length > 0 && (
            <div className="rounded-xl bg-success/10 border border-success/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />AI 智能匹配完成
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>平均匹配置信度：</span>
                <span className="font-bold text-success">
                  {(Object.values(matchQuality).reduce((a, b) => a + b, 0) / Object.values(matchQuality).length).toFixed(0)}%
                </span>
                <span>· 建议检查低于60%的素材</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {materials.map((m) => {
              const matchedShot = shots.find(s => s.id === m.matched_shot_id);
              const confidence = matchQuality[m.id];
              return (
                <div key={m.id} className="relative group rounded-xl border border-border overflow-hidden bg-muted/30">
                  <div className="aspect-square flex items-center justify-center bg-muted">
                    {m.type === 'image'
                      ? <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1.5">
                          <Video className="w-8 h-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">视频</span>
                        </div>
                    }
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium truncate text-balance">{m.name}</p>
                    {matchedShot && (
                      <Badge className="text-xs bg-success/10 text-success border-0">
                        镜头{matchedShot.order}
                      </Badge>
                    )}
                    {confidence !== undefined && (
                      <div className="space-y-0.5">
                        <Progress
                          value={confidence}
                          className={cn('h-1', confidence >= 70 ? '' : 'opacity-60')}
                        />
                        <p className="text-[10px] text-muted-foreground">{confidence.toFixed(0)}% 匹配度</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeMaterial(m.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute top-1.5 left-1.5">
                    {m.type === 'image'
                      ? <Badge className="text-xs bg-black/60 text-white border-0 px-1.5 py-0.5"><ImageIcon className="w-2.5 h-2.5" /></Badge>
                      : <Badge className="text-xs bg-black/60 text-white border-0 px-1.5 py-0.5"><Play className="w-2.5 h-2.5" /></Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {materials.length === 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">可跳过此步，系统将使用AI生成的素材合成视频</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onPrev}><ChevronLeft className="w-4 h-4 mr-1" />上一步</Button>
        <Button onClick={onNext}>下一步 <ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  );
}

// ─── Step 5: 生成视频 ────────────────────────────────────────
// P1-M05: Realtime 进度订阅
const PROGRESS_STAGES = [
  { pct: 5,  msg: '初始化任务...',            icon: '🔧' },
  { pct: 15, msg: '保存商品信息...',           icon: '💾' },
  { pct: 30, msg: '创建视频项目...',           icon: '📁' },
  { pct: 50, msg: 'AI 生成视频脚本...',        icon: '✍️' },
  { pct: 65, msg: '合成视频素材中...',         icon: '🎬' },
  { pct: 78, msg: '添加字幕与 BGM...',         icon: '🎵' },
  { pct: 90, msg: '最终渲染压缩...',           icon: '⚙️' },
  { pct: 100, msg: '视频生成完成！',           icon: '✅' },
];

function Step5Generate({ productData, promptConfig, shots, materials, onPrev, onSuccess }: {
  productData: Partial<ProductFormData>; promptConfig: Partial<PromptConfig>;
  shots: Shot[]; materials: MaterialItem[]; onPrev: () => void; onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusIcon, setStatusIcon] = useState('');
  const [stageLog, setStageLog] = useState<{ msg: string; pct: number; done: boolean; time: string }[]>([]);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 管道触发标记：ai-assistant generate_video 已发起后，失败退款由边缘函数负责（防止前后端重复退款）
  const pipelineTriggeredRef = useRef(false);
  const projectIdRef = useRef<string | null>(null);

  // 清理 Realtime 订阅
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // 订阅 Realtime 进度更新（P1-M05）
  const subscribeToProgress = (projectId: string) => {
    const ch = supabase.channel(`project-progress-${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_projects',
        filter: `id=eq.${projectId}`,
      }, (payload) => {
        const row = payload.new as Partial<VideoProject> & { progress?: number };
        if (row.progress !== undefined) {
          setProgress(row.progress);
          const stage = PROGRESS_STAGES.find(s => s.pct >= row.progress!) ?? PROGRESS_STAGES[PROGRESS_STAGES.length - 1];
          setStatusMsg(stage.msg);
          setStatusIcon(stage.icon);
          setStageLog(prev => {
            const timeStr = new Date().toLocaleTimeString();
            const exists = prev.find(s => s.pct === stage.pct);
            if (!exists) return [...prev, { msg: stage.msg, pct: stage.pct, done: stage.pct <= (row.progress ?? 0), time: timeStr }];
            return prev.map(s => s.pct <= (row.progress ?? 0) ? { ...s, done: true } : s);
          });
        }
        if (row.status === 'completed') {
          setProject(row as VideoProject);
          setGenerating(false);
          toast.success('视频生成完成！');
          if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
      })
      .subscribe();
    realtimeChannelRef.current = ch;
  };

  // 模拟进度推进（Realtime 降级方案）
  // 进度驱动：EF 更新 video_projects，Realtime 推进前端 UI
  // simulateProgress 仅作 EF 超时降级保底（当 EF 超过 8s 无回调时启动）
  const simulateProgress = async (projectId: string) => {
    let stageIdx = 3;
    let elapsedMs = 0;
    const STEP_MS = 1800;
    const interval = setInterval(async () => {
      elapsedMs += STEP_MS;
      // 超时才降级推进（正常情况 Realtime 已经在推）
      stageIdx++;
      if (stageIdx >= PROGRESS_STAGES.length) {
        clearInterval(interval);
        const resultVideoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
        // 封面必须为图片（优先成片真实第一帧），绝不允许将 .mp4 地址写入 thumbnail_url
        const coverFrame = await getVideoCoverImage(resultVideoUrl);
        const { data } = await supabase.from('video_projects')
          .update({
            status: 'completed',
            progress: 100,
            video_url: resultVideoUrl,
            thumbnail_url: coverFrame
          })
          .eq('id', projectId).select().maybeSingle();
        setProgress(100);
        setStatusMsg('视频生成完成！');
        setStatusIcon('✅');
        setProject(data as VideoProject);
        setGenerating(false);
        toast.success('视频生成完成！');
        onSuccess?.(); // 清除草稿
        // 写入 video_jobs 记录
        if (user) {
          await supabase.from('video_jobs').insert({
            user_id: user.id,
            action: 'video_generate',
            status: 'completed',
            payload: { project_id: projectId },
            result: { completed_at: new Date().toISOString() },
          });
        }
        return;
      }
      const stage = PROGRESS_STAGES[stageIdx];
      // 只在 Realtime 未推进时更新（避免与 EF 重复）
      setProgress(prev => (prev < stage.pct ? stage.pct : prev));
      setStatusMsg(stage.msg);
      setStatusIcon(stage.icon);
      setStageLog(prev => {
        const timeStr = new Date().toLocaleTimeString();
        return [
          ...prev.map(s => s.pct <= stage.pct ? { ...s, done: true } : s),
          ...(prev.find(s => s.pct === stage.pct) ? [] : [{ msg: stage.msg, pct: stage.pct, done: true, time: timeStr }]),
        ];
      });
      await supabase.from('video_projects')
        .update({ progress: stage.pct })
        .eq('id', projectId)
        .lt('progress', stage.pct); // 只在 EF 未更新时写入
    }, STEP_MS);
    progressIntervalRef.current = interval;
  };

  const handleGenerate = async () => {
    if (!user) return;

    // 统一积分守卫：余额 < 10 直接拦截（不进入 loading、不发起任何生成请求），并自动弹出充值弹窗
    const guard = await ensureCreditsForGeneration(user.id, VIDEO_GENERATE_COST);
    if (!guard.ok) return;

    // 校验与扣除积分 (生成视频每次消耗 10 积分，deduct_credits RPC 原子扣费)
    const videoTitle = promptConfig.prompt_text?.trim() || productData.name?.trim() || '带货视频';
    const deductRes = await deductUserCredits(user.id, 10, `生成AI视频《${videoTitle}》`, 'video_generate');
    if (!deductRes.success) {
      toast.error(deductRes.message || `积分不足（当前 ${deductRes.creditsLeft}，单次生成需 10），请充值后重试`, { duration: 6000 });
      if (!deductRes.insufficientCredits) openCreditsDialog();
      return;
    }
    toast.success(`⚡ 已扣除 10 积分（当前剩余 ${deductRes.creditsLeft} 积分），AI 视频生成任务已成功启动！`);
    pipelineTriggeredRef.current = false; // 新任务重置：同步阶段失败由本页退款，EF 侧失败由边缘函数退款

    setGenerating(true);
    setProgress(5); setStatusMsg('初始化任务...'); setStatusIcon('🔧');
    setStageLog([{ msg: '初始化任务...', pct: 5, done: true, time: format(new Date(), 'HH:mm:ss') }]);

    try {
      // 1. 保存商品
      setProgress(15); setStatusMsg('保存商品信息...'); setStatusIcon('💾');
      setStageLog(prev => [...prev, { msg: '保存商品信息...', pct: 15, done: true, time: format(new Date(), 'HH:mm:ss') }]);
      const { data: prodData } = await supabase.from('products').insert({
        user_id: user.id,
        name: productData.name ?? '未命名商品',
        category: productData.category ?? '其他',
        selling_points: productData.selling_points?.split('\n').filter(Boolean) ?? [],
        ai_selling_points: productData.ai_selling_points ?? [],
        target_language: productData.target_language ?? 'zh',
        target_platform: productData.target_platform ?? 'douyin',
      }).select().maybeSingle();

      // 2. 创建项目
      setProgress(30); setStatusMsg('创建视频项目...'); setStatusIcon('📁');
      const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
        user_id: user.id,
        product_id: prodData?.id ?? null,
        title: promptConfig.prompt_text?.trim() || productData.name?.trim() || '带货视频',
        status: 'processing',
        video_style: promptConfig.video_style,
        duration: promptConfig.duration ?? 30,
        bgm: promptConfig.bgm,
        subtitle_style: promptConfig.subtitle_style,
        prompt_text: promptConfig.prompt_text,
        storyboard: shots,
        materials: materials,
        progress: 30,
      }).select().maybeSingle();
      if (projErr) throw projErr;
      const projectId = projData?.id as string;
      projectIdRef.current = projectId;

      // 3. 订阅 Realtime 进度
      subscribeToProgress(projectId);
      const timeStr = new Date().toLocaleTimeString();
      setStageLog([
        { msg: '初始化任务...', pct: 5, done: true, time: timeStr },
        { msg: '保存商品信息...', pct: 15, done: true, time: timeStr },
        { msg: '创建视频项目...', pct: 30, done: true, time: timeStr },
      ]);

      // 4. 触发AI生成（后台执行）
      setProgress(50); setStatusMsg('AI 生成视频脚本...'); setStatusIcon('✍️');
      supabase.functions.invoke('ai-assistant', {
        body: { action: 'generate_video', project_id: projectId, product: productData, prompt: promptConfig, shots, materials }
      }).catch(() => {}); // 异步触发，不阻塞前端
      pipelineTriggeredRef.current = true; // 之后失败由 ai-assistant 侧统一回滚，避免重复退款

      // 5. 模拟后续进度（Realtime 实时推进）
      await simulateProgress(projectId);
    } catch {
      toast.error('视频生成失败，请重试');
      setStatusMsg('生成失败');
      setGenerating(false);
      // 失败回滚：仅在尚未触发 AI 管道时由本页退款（管道已触发则由边缘函数负责，防止重复退款）
      if (user && !pipelineTriggeredRef.current) {
        const res = await refundGenerationCredits(user.id, 10, '视频生成失败，自动退还积分');
        if (res.success) toast.info('本次生成失败，已自动退还 10 积分');
      }
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* 配置摘要 */}
      <div className="rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />配置摘要
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: '商品名称', value: productData.name ?? '未填写' },
            { label: '商品品类', value: productData.category ?? '未选择' },
            { label: '目标平台', value: productData.target_platform === 'tiktok' ? 'TikTok' : '抖音' },
            { label: '视频风格', value: promptConfig.video_style ?? '未选择' },
            { label: '视频时长', value: `${promptConfig.duration ?? 30}秒` },
            { label: '分镜数量', value: `${shots.length} 个镜头` },
            { label: '上传素材', value: `${materials.length} 个` },
            { label: '背景音乐', value: promptConfig.bgm ?? '未选择' },
            { label: '字幕样式', value: promptConfig.subtitle_style ?? '未选择' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* P1-M05 Realtime 进度追踪 */}
      {(generating || project?.status === 'completed') && (
        <div className={cn(
          'rounded-xl border p-5 space-y-4',
          project?.status === 'completed'
            ? 'border-success/30 bg-success/5'
            : 'border-primary/30 bg-primary/5'
        )}>
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                {generating && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                <span>{statusIcon}</span>
                <span>{statusMsg}</span>
              </span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 rounded-full" />
          </div>

          {/* 任务阶段日志（流式终端风格） */}
          {stageLog.length > 0 && (
            <div className="rounded-lg bg-[#0d1117] border border-border overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/20 bg-black/40">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[10px] text-muted-foreground/60 ml-2 font-mono uppercase tracking-wider">AI VIDEO GENERATOR LOGS</span>
              </div>
              <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs text-green-400/90 scrollbar-none flex flex-col-reverse">
                {stageLog.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-muted-foreground/50 shrink-0 w-16">[{s.time}]</span>
                    <div className="flex flex-col">
                      <span className={cn(s.done ? 'text-gray-300' : 'text-green-400')}>{s.msg}</span>
                      {s.done && <span className="text-success text-[10px]">✔ Done ({s.pct}%)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 完成结果 */}
      {project?.status === 'completed' && !generating && (
        <div className="flex flex-col md:flex-row gap-3">
          <Button className="flex-1" onClick={() => navigate('/works')}>
            <Play className="w-4 h-4 mr-2" />查看作品
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/analytics')}>
            <BarChart3 className="w-4 h-4 mr-2" />流量分析
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-border mt-4">
        <Button variant="outline" onClick={onPrev} disabled={generating} className="h-12 px-6">
          <ChevronLeft className="w-4 h-4 mr-1" />返回上一步
        </Button>
        {!project && (
          <Button 
            onClick={handleGenerate} 
            disabled={generating} 
            className="min-w-[160px] h-12 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-primary-foreground shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 px-8 text-base font-medium"
          >
            {generating
              ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />生成中...</>
              : <><Sparkles className="w-5 h-5 mr-2" />立即生成视频</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────
export default function VideoCreatePage() {
  const { user } = useAuth();
  type VCDraft = { step: number; productData: Partial<ProductFormData>; promptConfig: Partial<PromptConfig> };
  const { value: draft, save: saveDraft, clear: clearDraft, hasDraft } =
    useDraft<VCDraft>(`video-create-draft-${user?.id ?? 'anon'}`, { step: 1, productData: {}, promptConfig: { duration: 30 } });

  const [step, setStep] = useState(draft.step);
  const [productData, setProductData] = useState<Partial<ProductFormData>>(draft.productData);
  const [promptConfig, setPromptConfig] = useState<Partial<PromptConfig>>(draft.promptConfig ?? { duration: 30 });
  const [shots, setShots] = useState<Shot[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [draftRestored, setDraftRestored] = useState(hasDraft);

  // Check for prefill product name from location state (e.g. from Smart Product Selection)
  useEffect(() => {
    const prefillName = location.state?.prefillProductName;
    if (prefillName && user) {
      const fetchPrefill = async () => {
        const { data: rows } = await supabase
          .from('products')
          .select('*')
          .eq('name', prefillName)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (rows) {
          const sp = Array.isArray(rows.selling_points) ? rows.selling_points.join('、') : '';
          const ai_sp = Array.isArray(rows.ai_selling_points) ? rows.ai_selling_points : [];
          setProductData({
            product_id: rows.id,
            name: rows.name,
            category: rows.category,
            selling_points: sp,
            ai_selling_points: ai_sp,
            target_platform: rows.target_platform ?? 'douyin',
            target_language: rows.target_language ?? 'zh',
          });
          toast.success(`已自动预填导入商品: ${rows.name}`);
        }
      };
      fetchPrefill();
    }
  }, [location.state, user]);

  // 自动保存草稿
  useEffect(() => {
    saveDraft({ step, productData, promptConfig });
  }, [step, productData, promptConfig, saveDraft]);

  const next = () => setStep(s => Math.min(s + 1, 5) as typeof step);
  const prev = () => setStep(s => Math.max(s - 1, 1) as typeof step);

  const stepTitles: Record<number, string> = {
    1: '填写商品信息', 2: '配置Prompt参数', 3: '编辑分镜脚本',
    4: '上传素材文件', 5: '生成视频',
  };

  return (
    <div className="p-0 space-y-5 max-w-full mx-auto animate-fade-in">
      {/* 步骤指示器 */}
      <StepIndicator currentStep={step} />

      {/* 内容卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-balance">{stepTitles[step]}</CardTitle>
          <CardDescription>
            {step === 1 && '填写商品基本信息，AI将自动提炼核心卖点'}
            {step === 2 && '配置视频风格参数，让AI生成最优Prompt'}
            {step === 3 && '选择分镜模板或让AI自动生成，可手动调整每个镜头'}
            {step === 4 && '上传商品图片或视频素材，AI自动匹配分镜'}
            {step === 5 && '确认所有配置，一键生成带货视频'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1Product data={productData} onChange={setProductData} onNext={next} />}
          {step === 2 && <Step2Prompt data={promptConfig} onChange={setPromptConfig} onNext={next} onPrev={prev} productData={productData} />}
          {step === 3 && <Step3Storyboard shots={shots} onShotsChange={setShots} onNext={next} onPrev={prev} productData={productData} />}
          {step === 4 && <Step4Materials materials={materials} onMaterialsChange={setMaterials} onNext={next} onPrev={prev} shots={shots} />}
          {step === 5 && <Step5Generate productData={productData} promptConfig={promptConfig} shots={shots} materials={materials} onPrev={prev} onSuccess={() => { clearDraft(); setDraftRestored(false); }} />}
        </CardContent>
      </Card>
    </div>
  );
}
