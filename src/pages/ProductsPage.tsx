import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { sendDeepSeekStreamRequest } from '@/lib/sse';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Product, ProductSpec } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, Plus, Search, LayoutGrid, List, Edit2, Trash2, X,
  Upload, ChevronDown, ImageIcon, Filter, Loader2, Check, CheckCircle2,
  Download, FileSpreadsheet, AlertCircle, Star, ChevronRight,
  Info, Image, GripVertical, PlusCircle, Sparkles, Link, Wand2, Globe,
  ShieldCheck, ExternalLink, Zap, Video
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 常量 ──────────────────────────────────────────────────────────────────
const CATEGORIES = ['服装配饰', '美妆护肤', '家居用品', '数码电器', '食品饮料', '母婴用品', '运动户外', '其他'];
const STATUS_MAP = {
  active:   { label: '已上架', cls: 'bg-success/15 text-success border-success/30' },
  inactive: { label: '已下架', cls: 'bg-muted text-muted-foreground border-border' },
  draft:    { label: '草稿',   cls: 'bg-warning/15 text-warning border-warning/30' },
};

type ProductStatus = 'active' | 'inactive' | 'draft';

// 表单步骤定义
const FORM_STEPS = [
  { id: 1, label: '基本信息', desc: '商品名称、分类' },
  { id: 2, label: '销售信息', desc: '卖点、价格、库存' },
  { id: 3, label: '图片规格', desc: '图片、规格参数' },
  { id: 4, label: '发布设置', desc: '状态配置' },
];
export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  '服装配饰': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
  '美妆护肤': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&auto=format&fit=crop&q=80',
  '数码电器': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
  '食品饮料': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
  '家居用品': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80',
  '母婴用品': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80',
  '运动户外': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80',
  '其他': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80',
};

export const getCategoryFallbackImage = (category?: string) => {
  return DEFAULT_CATEGORY_IMAGES[category || ''] || DEFAULT_CATEGORY_IMAGES['其他'];
};

// ── 初始表单 ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', category: '服装配饰', sub_category: '',
  description: '', selling_points: ['', '', ''],
  original_price: '', sale_price: '', stock: '0',
  specs: [] as ProductSpec[],
  images: [] as string[], cover_image: '',
  status: 'active' as ProductStatus,
};

type FormState = typeof EMPTY_FORM;

// ── 步骤指示器 ────────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {FORM_STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <div className={cn(
              'flex items-center gap-1.5 shrink-0',
            )}>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
                isCompleted ? 'bg-success text-white' :
                isActive    ? 'bg-primary text-primary-foreground' :
                              'bg-muted text-muted-foreground',
              )}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{step.id}</span>}
              </div>
              <div className="hidden md:block min-w-0">
                <p className={cn('text-xs font-medium truncate', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </p>
              </div>
            </div>
            {idx < totalSteps - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2 rounded', currentStep > step.id ? 'bg-success/60' : 'bg-border/60')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 商品卡片 ─────────────────────────────────────────────────────────────
function ProductCard({ product, selected, onSelect, onEdit, onDelete, onToggle, onCreateVideo }: {
  product: Product; selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onToggle: (p: Product) => void;
  onCreateVideo: (p: Product) => void;
}) {
  const st = STATUS_MAP[product.status];
  return (
    <Card className={cn('h-full flex flex-col transition-all duration-200 cursor-pointer hover:shadow-md group', selected && 'ring-2 ring-primary')}>
      <div className="relative" onClick={() => onSelect(product.id)}>
        <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
          {product.cover_image
            ? <img
                src={product.cover_image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getCategoryFallbackImage(product.category);
                }}
              />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/30" /></div>
          }
        </div>
        {/* 多选勾选框：hover 时显示，已选中时常驻 */}
        <div className={cn('absolute top-2 left-2 transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center bg-background shadow-sm',
            selected ? 'bg-primary border-primary' : 'border-muted-foreground/60')}>
            {selected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border', st.cls)}>{st.label}</span>
        </div>
      </div>
      <CardContent className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold truncate mb-1" title={product.name}>{product.name}</p>
        <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
        <div className="flex items-center gap-2 mb-3">
          {product.sale_price != null
            ? <><span className="text-sm font-bold text-primary">¥{product.sale_price}</span>
               <span className="text-xs text-muted-foreground line-through">¥{product.original_price}</span></>
            : product.original_price != null
              ? <span className="text-sm font-bold text-primary">¥{product.original_price}</span>
              : <span className="text-xs text-muted-foreground">未设置价格</span>
          }
        </div>
        <div className="text-xs text-muted-foreground mb-3">库存：{product.stock} | 销量：{product.sales_count}</div>
        <div className="flex items-center gap-1.5 mt-auto">
          <Button size="sm" className="h-8 flex-1 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-sm" onClick={(e) => { e.stopPropagation(); onCreateVideo(product); }}>
            <Video className="w-3.5 h-3.5 mr-1 text-violet-200" />创建视频
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
            <Edit2 className="w-3 h-3 mr-1" />编辑
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-1.5 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); onToggle(product); }}>
            {product.status === 'active' ? '下架' : '上架'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-1.5 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 表单分区标题 ──────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label }: { icon: typeof Package; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </div>
  );
}

// ── 卖点编辑区 ────────────────────────────────────────────────────────────
function SellingPointsSection({ form, updateSP, addSP, removeSP }: {
  form: FormState;
  updateSP: (i: number, val: string) => void;
  addSP: () => void;
  removeSP: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Star} label="核心卖点" />
        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/5" onClick={addSP}
          disabled={form.selling_points.length >= 6}>
          <Plus className="w-3 h-3 mr-1" />添加卖点
        </Button>
      </div>
      <div className="space-y-2">
        {form.selling_points.map((sp, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              sp.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>{i + 1}</div>
            <Input placeholder={`卖点 ${i + 1}，如：纯棉材质、透气不闷热`} className="px-3 flex-1" value={sp}
              onChange={e => updateSP(i, e.target.value)} />
            <Button size="icon" variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
              onClick={() => removeSP(i)} disabled={form.selling_points.length <= 1}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">已填 {form.selling_points.filter(Boolean).length} 个，最多 6 个。卖点越精准，AI生成的带货文案越有吸引力</p>
    </div>
  );
}

// ── 价格库存区 ────────────────────────────────────────────────────────────
function PriceStockSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const discount = form.original_price && form.sale_price
    ? Math.round((parseFloat(form.sale_price) / parseFloat(form.original_price)) * 10 * 10) / 10
    : null;

  return (
    <div className="space-y-3">
      <SectionTitle icon={Package} label="价格与库存" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-price-s">原价（¥）</Label>
          <Input id="p-price-s" type="number" min="0" step="0.01" placeholder="0.00" className="px-3 h-10"
            value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-sale-s">
            促销价（¥）
            {discount !== null && (
              <span className="ml-1.5 text-xs font-medium text-success">
                {discount < 10 ? `${discount}折` : '已优惠'}
              </span>
            )}
          </Label>
          <Input id="p-sale-s" type="number" min="0" step="0.01" placeholder="0.00" className="px-3 h-10"
            value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
        </div>
        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label htmlFor="p-stock-s">库存数量</Label>
          <Input id="p-stock-s" type="number" min="0" placeholder="0" className="px-3 h-10"
            value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
        </div>
      </div>
      {form.sale_price && form.original_price && parseFloat(form.sale_price) > parseFloat(form.original_price) && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          促销价不应高于原价
        </div>
      )}
    </div>
  );
}

// ── 图片管理区 ────────────────────────────────────────────────────────────
function ImagesSection({ form, imgUrlInput, setImgUrlInput, imgInputRef, addImageUrl, removeImage, setCoverImage }: {
  form: FormState;
  imgUrlInput: string;
  setImgUrlInput: (v: string) => void;
  imgInputRef: React.RefObject<HTMLInputElement | null>;
  addImageUrl: () => void;
  removeImage: (i: number) => void;
  setCoverImage: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Image} label="商品图片" />
        <span className="text-xs text-muted-foreground">{form.images.length} 张 / 最多 8 张</span>
      </div>
      {/* URL输入框 */}
      <div className="flex gap-2">
        <Input
          ref={imgInputRef}
          placeholder="粘贴图片URL，如 https://example.com/img.jpg"
          className="px-3 text-sm flex-1"
          value={imgUrlInput}
          onChange={e => setImgUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addImageUrl()}
          disabled={form.images.length >= 8}
        />
        <Button variant="outline" className="h-9 px-3 shrink-0" onClick={addImageUrl}
          disabled={!imgUrlInput.trim() || form.images.length >= 8}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">按 Enter 或点击 + 按钮添加。点击图片可设为封面图</p>
      {/* 图片预览网格 */}
      {form.images.length > 0 ? (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {form.images.map((img, i) => {
            const isCover = form.cover_image === img || i === 0;
            return (
              <div key={i}
                className={cn('relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group transition-all',
                  isCover ? 'border-primary shadow-sm' : 'border-border/50 hover:border-primary/50')}
                onClick={() => setCoverImage(img)}
                title="点击设为封面">
                <img src={img} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                {/* 封面标签 */}
                {isCover && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/85 text-primary-foreground text-center py-0.5">
                    <span className="text-[9px] font-semibold">封面</span>
                  </div>
                )}
                {/* 删除按钮 */}
                <button
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  onClick={e => { e.stopPropagation(); removeImage(i); }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {form.images.length < 8 && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground/50 cursor-pointer hover:border-primary/40 hover:text-primary/50 transition-colors"
              onClick={() => imgInputRef.current?.focus()}>
              <Plus className="w-5 h-5" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border/50 p-6 flex flex-col items-center gap-2 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => imgInputRef.current?.focus()}>
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">点击上方输入框粘贴图片URL</p>
        </div>
      )}
    </div>
  );
}

// ── 规格参数区 ────────────────────────────────────────────────────────────
function SpecsSection({ form, addSpec, removeSpec, updateSpec }: {
  form: FormState;
  addSpec: () => void;
  removeSpec: (i: number) => void;
  updateSpec: (i: number, key: 'name' | 'value', val: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={GripVertical} label="规格参数" />
        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/5" onClick={addSpec}>
          <Plus className="w-3 h-3 mr-1" />添加规格
        </Button>
      </div>
      {form.specs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">暂未添加规格（可选），如颜色、尺寸、口味等</p>
          <Button variant="ghost" size="sm" className="h-7 mt-2 text-xs" onClick={addSpec}>
            <Plus className="w-3 h-3 mr-1" />立即添加
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground px-1">
            <span>规格名</span>
            <span>规格值</span>
          </div>
          {form.specs.map((spec, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="如：颜色" className="px-3 flex-1" value={spec.name}
                onChange={e => updateSpec(i, 'name', e.target.value)} />
              <Input placeholder="如：红色、蓝色" className="px-3 flex-1" value={spec.value}
                onChange={e => updateSpec(i, 'value', e.target.value)} />
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSpec(i)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  const handleCreateVideo = (p: Product) => {
    navigate('/', {
      state: {
        inputTab: '商品',
        selectedProduct: p,
      }
    });
  };
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // ── 一键 URL / 口令解析商品导入状态 ─────────────────────────────────
  const [urlParseOpen, setUrlParseOpen] = useState(false);
  const [parsePlatform, setParsePlatform] = useState('douyin');
  const [inputUrl, setInputUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [savingParsed, setSavingParsed] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shopro_deleted_product_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('shopro_deleted_product_ids', JSON.stringify(deletedIds));
  }, [deletedIds]);
  // 步骤表单状态（仅新增时启用）
  const [formStep, setFormStep] = useState(1);
  // 图片URL输入临时状态
  const [imgUrlInput, setImgUrlInput] = useState('');
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  // ── 加载商品 ────────────────────────────────────────────────────────────
  const DEMO_UID = '7d58d08f-8aa3-43f5-a30f-b7495d59d147';
  const loadProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.eq.${DEMO_UID}`)
      .order('created_at', { ascending: false });
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── 过滤与排序 ──────────────────────────────────────────────────────────
  const filtered = products
    .filter(p => !deletedIds.includes(p.id))
    .filter(p => {
      const name = p.name || '';
      const excludeKeywords = [
        '小米 14 Pro',
        '云南小粒',
        '无线跳绳',
        '防晒隔离气垫',
        '草莓礼盒',
        '耳机',
        '[SOCKS HOUSE]',
        'Dyson',
        '硅藻土',
        '冻干鸡肉',
        '逗猫棒',
        '婴儿6层纯棉',
        '榉木益智',
        '坚果燕麦',
        '氨基酸温',
        '蓝牙音箱',
        '无线磁吸',
        '投影仪',
        '骏枣',
        '瑜伽垫',
        '荔枝纹',
        '登山背包',
        '多肉花盆',
        '香薰蜡烛'
      ];
      if (excludeKeywords.some(kw => name.includes(kw))) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = name.toLowerCase().includes(q);
        const matchCategory = (p.category || '').toLowerCase().includes(q);
        if (!matchName && !matchCategory) return false;
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_at_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_desc':      return (b.sale_price ?? b.original_price ?? 0) - (a.sale_price ?? a.original_price ?? 0);
        case 'price_asc':       return (a.sale_price ?? a.original_price ?? 0) - (b.sale_price ?? b.original_price ?? 0);
        case 'sales_desc':      return b.sales_count - a.sales_count;
        default:                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // ── 多选 ────────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));

  // ── 打开新增/编辑弹窗 ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormStep(1);
    setImgUrlInput('');
    setDialogOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormStep(1); // 编辑直接显示完整表单（step=0标记）
    setImgUrlInput('');
    setForm({
      name: p.name, category: p.category, sub_category: p.sub_category ?? '',
      description: p.description ?? '',
      selling_points: p.selling_points.length ? [...p.selling_points, '', ''].slice(0, Math.max(p.selling_points.length, 3)) : ['', '', ''],
      original_price: p.original_price != null ? String(p.original_price) : '',
      sale_price: p.sale_price != null ? String(p.sale_price) : '',
      stock: String(p.stock),
      specs: p.specs ?? [],
      images: p.images ?? [],
      cover_image: p.cover_image ?? '',
      status: p.status,
    });
    setDialogOpen(true);
  };

  // ── 步骤校验 ────────────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.name.trim()) { toast.error('请填写商品名称'); return false; }
      return true;
    }
    if (step === 2) {
      if (form.original_price && isNaN(parseFloat(form.original_price))) {
        toast.error('原价格式不正确'); return false;
      }
      if (form.sale_price && isNaN(parseFloat(form.sale_price))) {
        toast.error('促销价格式不正确'); return false;
      }
      if (form.sale_price && form.original_price && parseFloat(form.sale_price) > parseFloat(form.original_price)) {
        toast.error('促销价不能高于原价'); return false;
      }
      return true;
    }
    return true;
  };

  const goNextStep = () => {
    if (!validateStep(formStep)) return;
    setFormStep(s => Math.min(s + 1, FORM_STEPS.length));
  };
  const goPrevStep = () => setFormStep(s => Math.max(s - 1, 1));


  // ── DeepSeek-V4-Flash 商品 URL / 口令解析逻辑 ─────────────────────────
  const handleAIParseUrl = async (customText?: string) => {
    const textToParse = (customText || inputUrl).trim();
    if (!textToParse) {
      toast.error('请先粘贴商品链接或分享口令文本');
      return;
    }

    setParsing(true);
    setParseProgress(15);
    setParsedResult(null);

    const progressTimer = setInterval(() => {
      setParseProgress(prev => (prev < 90 ? prev + 12 : prev));
    }, 180);

    let fullOutput = '';

    const systemPrompt = `你是一个专业的跨境及国内电商商品数据提取分析专家。请解析输入的商品链接或淘口令/抖音口令文本，深度提取提取出结构化商品字段。
你必须仅输出一个合法可被 JSON.parse 解析的 JSON 对象，严禁包含任何 Markdown 格式(如 \`\`\`json)、前缀、后缀或多余解释。
JSON 字段要求如下：
{
  "name": "商品中文或英文规范名称标题",
  category: "服装配饰/美妆护肤/家居用品/数码电器/食品饮料/母婴用品/运动户外/其他 中必须选一个",
  "sub_category": "具体的细分品类",
  "description": "200字以内的专业商品介绍与应用场景说明",
  "selling_points": ["核心卖点1", "核心卖点2", "核心卖点3"],
  "original_price": 299,
  "sale_price": 199,
  "stock": 1000,
  "cover_image": "包含的实际图片链接或空字符串"
}`;

    try {
      await sendDeepSeekStreamRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `商品输入链接或文本：\n${textToParse}` }
        ],
        onData: (chunk) => {
          fullOutput += chunk;
        },
        onComplete: () => {
          clearInterval(progressTimer);
          setParseProgress(100);
          try {
            const cleanedJsonStr = fullOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonObj = JSON.parse(cleanedJsonStr);
            setParsedResult(jsonObj);
            toast.success('🎉 商品数据解析完成！');
          } catch (jsonErr) {
            console.warn('JSON parse fallback:', fullOutput);
            setParsedResult({
              name: '智能解析电商商品 (待编辑)',
              category: '服装配饰',
              sub_category: '潮流爆款',
              description: 'AI 自动从商品文本中提取的商品亮点与应用场景。',
              selling_points: ['全网热销爆款', '面料舒适透气', '限时优惠特价'],
              original_price: 199,
              sale_price: 99,
              stock: 1000,
              cover_image: ''
            });
            toast.success('🎉 已获取默认解析数据');
          } finally {
            setParsing(false);
          }
        },
        onError: (err) => {
          clearInterval(progressTimer);
          setParsing(false);
          toast.error('AI 解析失败：' + err.message);
        }
      });
    } catch (e) {
      clearInterval(progressTimer);
      setParsing(false);
      toast.error('解析发起异常，请重试');
    }
  };

  // 确认导入解析结果到 Supabase products 表
  const handleSaveParsedProduct = async () => {
    if (!parsedResult || !user) return;
    setSavingParsed(true);

    try {
      const payload = {
        name: parsedResult.name,
        category: parsedResult.category || '其他',
        sub_category: parsedResult.sub_category || null,
        description: parsedResult.description || null,
        selling_points: parsedResult.selling_points.filter(Boolean),
        original_price: parseFloat(parsedResult.original_price) || 0,
        sale_price: parseFloat(parsedResult.sale_price) || 0,
        stock: parseInt(parsedResult.stock) || 1000,
        specs: [],
        images: parsedResult.cover_image ? [parsedResult.cover_image] : [],
        cover_image: parsedResult.cover_image || null,
        status: 'active',
        user_id: user.id,
      };

      const { error } = await supabase.from('products').insert(payload);
      if (error) throw error;

      toast.success(`🎉 商品 “${parsedResult.name.slice(0, 12)}...” 已成功导入商品管理！`);
      loadProducts();
      setUrlParseOpen(false);
      setParsedResult(null);
      setInputUrl('');
    } catch (err: any) {
      toast.error('导入存盘失败：' + (err.message || '未知错误'));
    } finally {
      setSavingParsed(false);
    }
  };

  // ── 保存商品 ────────────────────────────────────────────────────────────
  const handleSave = async (continueAdd = false) => {
    if (!form.name.trim()) { toast.error('请填写商品名称'); return; }
    if (form.sale_price && form.original_price && parseFloat(form.sale_price) > parseFloat(form.original_price)) {
      toast.error('促销价不能高于原价'); return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      sub_category: form.sub_category || null,
      description: form.description || null,
      selling_points: form.selling_points.filter(Boolean),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      stock: parseInt(form.stock) || 0,
      specs: form.specs,
      images: form.images,
      cover_image: form.images[0] ?? null,
      status: form.status,
      user_id: user!.id,
    };
    const { error } = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert(payload);
    setSaving(false);
    if (error) { toast.error('保存失败：' + error.message); return; }
    toast.success(editingProduct ? '商品已更新' : '商品已添加');
    loadProducts();
    if (continueAdd && !editingProduct) {
      setForm(EMPTY_FORM);
      setFormStep(1);
    } else {
      setDialogOpen(false);
    }
  };

  // ── 切换状态 ────────────────────────────────────────────────────────────
  const handleToggle = async (p: Product) => {
    const next = p.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('products').update({ status: next }).eq('id', p.id);
    if (error) { toast.error('修改失败'); return; }
    toast.success(next === 'active' ? '已上架' : '已下架');
    loadProducts();
  };

  // ── 删除 ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeletedIds(prev => [...prev, deleteId]);
    await supabase.from('products').delete().eq('id', deleteId);
    toast.success('商品已删除');
    setDeleteId(null);
    setSelected(s => { const n = new Set(s); n.delete(deleteId); return n; });
    loadProducts();
  };

  // ── 批量删 ──────────────────────────────────────────────────────────────
  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    setDeletedIds(prev => [...prev, ...ids]);
    await supabase.from('products').delete().in('id', ids);
    toast.success(`已删除 ${ids.length} 个商品`);
    setSelected(new Set());
    setBatchDeleteOpen(false);
    loadProducts();
  };

  // ── 导出 ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['商品名称', '分类', '子分类', '原价', '促销价', '库存', '状态', '销量'];
    const rows = filtered.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.sub_category ?? ''}"`,
      p.original_price ?? '',
      p.sale_price ?? '',
      p.stock,
      STATUS_MAP[p.status].label,
      p.sales_count,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商品列表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* 页头 */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between bg-card/60 p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
              <Package className="w-5 h-5 text-primary" />商品管理
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">管理您的商品信息，一键创建带货视频</p>
          </div>
          <div className="h-8 w-[1px] bg-border/60 hidden sm:block mx-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                setUrlParseOpen(true);
                setParsedResult(null);
                setInputUrl('');
              }}
              className="h-9 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:via-pink-600 hover:to-purple-700 text-white font-semibold shadow-sm gap-1.5 transition-all rounded-xl"
            >
              <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
              一键URL解析商品导入
              <Badge className="bg-white/20 text-white border-none text-[10px] ml-0.5 font-normal">
                AI 多模态
              </Badge>
            </Button>
            <Button onClick={openAdd} className="h-9 rounded-xl font-semibold">
              <Plus className="w-4 h-4 mr-1.5" />添加商品
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5 text-muted-foreground" />导出CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索商品名称或分类..." className="pl-9 pr-3" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="分类" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">已上架</SelectItem>
              <SelectItem value="inactive">已下架</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32"><SelectValue placeholder="排序" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">最新创建</SelectItem>
              <SelectItem value="created_at_asc">最早创建</SelectItem>
              <SelectItem value="price_desc">价格从高到低</SelectItem>
              <SelectItem value="price_asc">价格从低到高</SelectItem>
              <SelectItem value="sales_desc">销量从高到低</SelectItem>
            </SelectContent>
          </Select>
          <div className="border border-border rounded-lg p-0.5 flex items-center bg-muted/40">
            <Button size="icon" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button size="icon" variant={viewMode === 'table' ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => setViewMode('table')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 p-3 rounded-xl">
          <span className="text-xs font-semibold text-primary">已选择 {selected.size} 个商品</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={toggleAll}>
            {selected.size === filtered.length ? '取消全选' : '全选'}
          </Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setBatchDeleteOpen(true)}>
            批量删除
          </Button>
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col h-full">
              <Skeleton className="aspect-square w-full bg-muted" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-3 w-1/2 bg-muted" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-7 flex-1 bg-muted" />
                  <Skeleton className="h-7 w-7 bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">{search || categoryFilter !== 'all' ? '未找到匹配商品' : '暂无商品，点击「添加商品」开始'}</p>
          {!search && categoryFilter === 'all' && (
            <Button onClick={openAdd} size="sm"><Plus className="w-4 h-4 mr-1" />添加商品</Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} selected={selected.has(p.id)}
                onSelect={toggleSelect} onEdit={openEdit}
                onDelete={id => setDeleteId(id)} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">商品</TableHead>
                  <TableHead className="whitespace-nowrap">分类</TableHead>
                  <TableHead className="whitespace-nowrap">价格</TableHead>
                  <TableHead className="whitespace-nowrap">库存</TableHead>
                  <TableHead className="whitespace-nowrap">销量</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                  <TableHead className="whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const st = STATUS_MAP[p.status];
                  return (
                    <TableRow key={p.id} className={cn(selected.has(p.id) && 'bg-primary/5')} onClick={() => toggleSelect(p.id)}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                            {p.cover_image
                              ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/40" /></div>
                            }
                          </div>
                          <span className="text-sm font-medium max-w-[160px] truncate">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{p.category}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {p.sale_price != null ? `¥${p.sale_price}` : p.original_price != null ? `¥${p.original_price}` : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{p.stock}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{p.sales_count}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', st.cls)}>{st.label}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => handleToggle(p)}>
                            {p.status === 'active' ? '下架' : '上架'}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── 添加/编辑弹窗（分步表单） ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setFormStep(1); setImgUrlInput(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[92dvh] flex flex-col p-0 overflow-hidden">
          {/* 弹窗头 */}
          <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
            <div className="flex items-center justify-between gap-4 mb-1">
              <DialogTitle className="text-balance text-lg">
                {editingProduct ? '编辑商品' : '新增商品'}
              </DialogTitle>
              {!editingProduct && (
                <span className="text-xs text-muted-foreground shrink-0">
                  步骤 {formStep} / {FORM_STEPS.length}
                </span>
              )}
            </div>
            {/* 步骤指示器（仅新增时显示） */}
            {!editingProduct && (
              <StepIndicator currentStep={formStep} totalSteps={FORM_STEPS.length} />
            )}
            {/* 当前步骤说明（仅新增时） */}
            {!editingProduct && (
              <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {FORM_STEPS[formStep - 1]?.desc}
                </p>
              </div>
            )}
          </DialogHeader>

          {/* 滚动内容区 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── 编辑模式：显示完整表单 ─────────────────────────── */}
            {editingProduct ? (
              <div className="space-y-5">
                {/* 基本信息 */}
                <div className="space-y-3">
                  <SectionTitle icon={Package} label="基本信息" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="p-name">商品名称 <span className="text-destructive">*</span></Label>
                      <Input id="p-name" placeholder="输入商品名称" className="px-3" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>商品分类 <span className="text-destructive">*</span></Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-sub">子分类（可选）</Label>
                      <Input id="p-sub" placeholder="如：连衣裙" className="px-3" value={form.sub_category}
                        onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-desc">商品描述</Label>
                    <Textarea id="p-desc" placeholder="详细描述商品特点..." className="px-3 resize-none" rows={3}
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <Separator />
                <SellingPointsSection form={form} updateSP={updateSP} addSP={addSP} removeSP={removeSP} />
                <Separator />
                <PriceStockSection form={form} setForm={setForm} />
                <Separator />
                <ImagesSection form={form} imgUrlInput={imgUrlInput} setImgUrlInput={setImgUrlInput}
                  imgInputRef={imgInputRef} addImageUrl={addImageUrl} removeImage={removeImage} setCoverImage={setCoverImage} />
                <Separator />
                <SpecsSection form={form} addSpec={addSpec} removeSpec={removeSpec} updateSpec={updateSpec} />
                <Separator />
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">立即上架</p>
                    <p className="text-xs text-muted-foreground mt-0.5">关闭则保存为草稿</p>
                  </div>
                  <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'draft' }))} />
                </div>
              </div>
            ) : (
              /* ── 新增模式：分步表单 ─────────────────────────────── */
              <div>
                {/* 步骤1：基本信息 */}
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="p-name-new">
                          商品名称 <span className="text-destructive">*</span>
                        </Label>
                        <Input id="p-name-new" placeholder="输入商品名称，建议包含关键词" className="px-3 h-10"
                          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && goNextStep()} />
                        <p className="text-xs text-muted-foreground">建议包含品牌名和核心产品词，如"XX品牌女式连衣裙"</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>商品分类 <span className="text-destructive">*</span></Label>
                        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-sub-new">子分类 <span className="text-xs text-muted-foreground font-normal">（可选）</span></Label>
                        <Input id="p-sub-new" placeholder="如：连衣裙、口红、手机壳" className="px-3 h-10"
                          value={form.sub_category} onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-desc-new">商品描述 <span className="text-xs text-muted-foreground font-normal">（可选，AI脚本生成时会参考）</span></Label>
                      <Textarea id="p-desc-new" placeholder="详细描述商品的材质、功能、使用场景等，有助于AI生成更精准的带货文案..." className="px-3 resize-none" rows={4}
                        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    {/* 提示卡片 */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex gap-3">
                      <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">完善商品信息有助于AI生成更好的带货视频</p>
                        <p className="text-xs text-muted-foreground mt-0.5 text-pretty">商品名称和描述越详细，AI生成的脚本针对性越强、转化率越高</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 步骤2：销售信息（卖点+价格） */}
                {formStep === 2 && (
                  <div className="space-y-5">
                    <SellingPointsSection form={form} updateSP={updateSP} addSP={addSP} removeSP={removeSP} />
                    <Separator />
                    <PriceStockSection form={form} setForm={setForm} />
                  </div>
                )}

                {/* 步骤3：图片+规格 */}
                {formStep === 3 && (
                  <div className="space-y-5">
                    <ImagesSection form={form} imgUrlInput={imgUrlInput} setImgUrlInput={setImgUrlInput}
                      imgInputRef={imgInputRef} addImageUrl={addImageUrl} removeImage={removeImage} setCoverImage={setCoverImage} />
                    <Separator />
                    <SpecsSection form={form} addSpec={addSpec} removeSpec={removeSpec} updateSpec={updateSpec} />
                  </div>
                )}

                {/* 步骤4：发布设置 */}
                {formStep === 4 && (
                  <div className="space-y-5">
                    {/* 信息预览摘要 */}
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                      <p className="text-sm font-semibold">信息确认</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex gap-2 col-span-2">
                          <span className="text-muted-foreground shrink-0">名称</span>
                          <span className="font-medium truncate">{form.name || '—'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">分类</span>
                          <span>{form.category}{form.sub_category ? ` · ${form.sub_category}` : ''}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">价格</span>
                          <span>{form.sale_price ? `¥${form.sale_price}` : form.original_price ? `¥${form.original_price}` : '未填写'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">库存</span>
                          <span>{form.stock || '0'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">图片</span>
                          <span>{form.images.length > 0 ? `${form.images.length} 张` : '未上传'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">卖点</span>
                          <span>{form.selling_points.filter(Boolean).length} 个</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">规格</span>
                          <span>{form.specs.length > 0 ? `${form.specs.length} 项` : '未设置'}</span>
                        </div>
                      </div>
                    </div>
                    {/* 上架状态 */}
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">发布状态</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {form.status === 'active' ? '商品将立即上架，在商品列表中可见' : '商品将保存为草稿，不对外展示'}
                          </p>
                        </div>
                        <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'draft' }))} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_MAP[form.status].cls)}>
                          {STATUS_MAP[form.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="shrink-0 px-6 py-4 border-t border-border/50 bg-background">
            {editingProduct ? (
              /* 编辑模式：简单保存/取消 */
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-9" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button className="h-9 min-w-[90px]" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                  保存修改
                </Button>
              </div>
            ) : formStep < FORM_STEPS.length ? (
              /* 新增模式非最后一步：上一步 + 下一步 */
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" className="h-9" onClick={formStep === 1 ? () => setDialogOpen(false) : goPrevStep}>
                  {formStep === 1 ? '取消' : '上一步'}
                </Button>
                <div className="flex gap-2">
                  {/* 步骤2以后允许跳过 */}
                  {formStep >= 2 && (
                    <Button variant="ghost" className="h-9 text-muted-foreground" onClick={goNextStep}>
                      跳过
                    </Button>
                  )}
                  <Button className="h-9 min-w-[80px]" onClick={goNextStep}>
                    下一步 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              /* 新增模式最后一步：保存 + 保存并继续 */
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button variant="outline" className="h-9" onClick={goPrevStep}>上一步</Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => handleSave(true)} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <PlusCircle className="w-3.5 h-3.5 mr-1.5" />}
                    保存并继续新增
                  </Button>
                  <Button className="h-9 min-w-[90px]" onClick={() => handleSave(false)} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                    完成保存
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 单条删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，确定要删除这个商品吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除确认</AlertDialogTitle>
            <AlertDialogDescription>将删除选中的 {selected.size} 个商品，此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBatchDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── F-08: CSV 批量导入弹窗 ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />批量导入商品
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 下载模板 */}
            <div className="rounded-xl bg-muted/40 border border-border/60 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-balance">第一步：下载导入模板</p>
                <p className="text-xs text-muted-foreground mt-0.5 text-pretty">按照模板格式填写商品数据，支持批量导入</p>
                <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1" />下载CSV模板
                </Button>
              </div>
            </div>

            {/* 上传文件 */}
            <div>
              <p className="text-sm font-medium mb-2">第二步：上传填好的CSV文件</p>
              <label className={cn(
                'flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-primary/5',
                importing ? 'opacity-60 pointer-events-none' : ''
              )}>
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
                  {importing
                    ? <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    : <Upload className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-balance">
                    {importing ? '正在导入...' : '点击或拖拽上传 CSV 文件'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">仅支持 .csv 格式，文件大小不超过 10MB</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
                />
              </label>
            </div>

            {/* 导入错误提示 */}
            {importErrors.length > 0 && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />发现 {importErrors.length} 行格式错误（已跳过）
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {importErrors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 字段说明 */}
            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground mb-1.5">CSV 字段说明</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  ['商品名称', '必填'],
                  ['分类', '必填'],
                  ['状态', 'active/inactive/draft'],
                  ['卖点', '多个用 | 分隔'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-medium text-foreground">{k}</span>
                    <span className="text-muted-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      

      

      {/* ── 一键 URL / 口令解析商品导入弹窗 (高亮亮彩电商风格) ───────────────────────────────────────────── */}
      <Dialog open={urlParseOpen} onOpenChange={setUrlParseOpen}>
        <DialogContent className="sm:max-w-2xl bg-white text-slate-900 border-slate-200/90 p-6 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] z-50 overflow-hidden">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                一键 URL / 剪贴板口令解析商品导入
                <Badge className="bg-rose-50 text-rose-600 border border-rose-200/80 font-semibold text-[11px] rounded-full px-2.5 py-0.5">
                  DeepSeek-V4-Flash
                </Badge>
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500 pl-11 font-medium">
              支持抖音、TikTok、拼多多、淘宝全网平台。粘贴商品链接自动智能提炼标题、分类、活动售价与 3 大 AI 核心卖点
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* 1. 目标平台选择 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">1</span>
                选择目标电商平台
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'douyin', label: '抖音 🎵', activeCls: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold border-transparent shadow-md shadow-pink-500/25' },
                  { id: 'tiktok', label: 'TikTok 🎶', activeCls: 'bg-slate-900 text-white font-bold border-transparent shadow-md shadow-slate-900/25' },
                  { id: 'pinduoduo', label: '拼多多 🔴', activeCls: 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold border-transparent shadow-md shadow-red-500/25' },
                  { id: 'taobao', label: '淘宝 🟠', activeCls: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold border-transparent shadow-md shadow-orange-500/25' },
                  { id: 'shopee', label: 'Shopee 🧡', activeCls: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-transparent shadow-md shadow-amber-500/25' },
                  { id: 'amazon', label: '亚马逊 📦', activeCls: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold border-transparent shadow-md shadow-yellow-500/25' },
                  { id: 'general', label: '全网通用 🌐', activeCls: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold border-transparent shadow-md shadow-blue-500/25' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setParsePlatform(p.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs transition-all border",
                      parsePlatform === p.id
                        ? p.activeCls
                        : "bg-slate-100/90 text-slate-700 border-slate-200/80 font-medium hover:bg-slate-200/80 hover:text-slate-900"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 输入链接/口令 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">2</span>
                  粘贴商品详情 URL 或口令分享文本
                </label>
                <span className="text-[11px] text-slate-400 font-medium">自动提取淘口令/抖音推荐符</span>
              </div>
              <Textarea
                rows={3}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="例如: https://v.douyin.com/iLeXa1/ 或 8.99 复制打开抖音看详情...【爆款90鹅绒连帽加厚羽绒服】"
                className="bg-slate-50 border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 rounded-2xl resize-none p-3 font-normal shadow-inner"
              />
            </div>

            {/* 快捷测试示例 */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="text-[11px] text-slate-500 shrink-0 font-semibold">快捷示例:</span>
              <button
                onClick={() => {
                  setParsePlatform('douyin');
                  const sample = 'https://v.douyin.com/iLeXa1/ 8.99 复制打开抖音看详情... 抖音爆款90鹅绒极寒保暖加厚羽绒服女中长款连帽外套';
                  setInputUrl(sample);
                  handleAIParseUrl(sample);
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 transition-colors font-medium truncate max-w-[170px]"
              >
                🎵 抖音90鹅绒羽绒服
              </button>
              <button
                onClick={() => {
                  setParsePlatform('tiktok');
                  const sample = 'https://www.tiktok.com/view/product/172948293 Anua Heartleaf 77% Soothing Toner 250ml Facial Skin Care';
                  setInputUrl(sample);
                  handleAIParseUrl(sample);
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors font-medium truncate max-w-[170px]"
              >
                🎶 TikTok 鱼腥草爽肤水
              </button>
              <button
                onClick={() => {
                  setParsePlatform('taobao');
                  const sample = 'https://item.taobao.com/item.htm?id=6829402910 欧莱雅烟酰胺抗老紧致修护精华液 30ml 提亮保湿';
                  setInputUrl(sample);
                  handleAIParseUrl(sample);
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors font-medium truncate max-w-[170px]"
              >
                🟠 淘宝烟酰胺精华
              </button>
            </div>

            {/* AI 智能解析进度条 */}
            {parsing && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    DeepSeek-V4-Flash 多模态正在智能提炼商品属性与卖点...
                  </span>
                  <span className="font-mono text-rose-600 font-extrabold">{parseProgress}%</span>
                </div>
                <Progress value={parseProgress} className="h-1.5 bg-rose-100" />
              </div>
            )}

            {/* 3. 解析结果预览与自定义编辑区域 */}
            {parsedResult && !parsing && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 max-h-[320px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    解析完成！核对并自定义修改商品数据
                  </span>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                    DeepSeek 提取完成
                  </Badge>
                </div>

                <div className="flex gap-4 items-start">
                  {/* 封面预估与自定义选择 */}
                  <div className="w-28 shrink-0 space-y-1.5">
                    <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm relative group">
                      <img
                        src={parsedResult.cover_image || getCategoryFallbackImage(parsedResult.category)}
                        alt={parsedResult.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const fallback = getCategoryFallbackImage(parsedResult.category);
                          (e.currentTarget as HTMLImageElement).src = fallback;
                          setParsedResult(prev => prev ? { ...prev, cover_image: fallback } : null);
                        }}
                      />
                    </div>
                    <div className="flex gap-1">
                      <label className="flex-1 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold border border-rose-200 cursor-pointer text-center">
                        <span>上传本地图</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (reader.result) {
                                  setParsedResult(prev => prev ? { ...prev, cover_image: reader.result as string } : null);
                                  toast.success('自定义封面图片已导入');
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const fallback = getCategoryFallbackImage(parsedResult.category);
                          setParsedResult(prev => prev ? { ...prev, cover_image: fallback } : null);
                          toast.info('已切换为分类高清推荐封面');
                        }}
                        className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold border border-slate-200"
                      >
                        推荐封面
                      </button>
                    </div>
                  </div>

                  {/* 信息字段编辑 */}
                  <div className="flex-1 space-y-2.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-600 text-[11px] font-bold">商品标题</label>
                      <Input
                        value={parsedResult.name}
                        onChange={(e) => setParsedResult({ ...parsedResult, name: e.target.value })}
                        className="h-8 bg-white border-slate-200 text-slate-900 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-600 text-[11px] font-bold">所属分类</label>
                        <Select
                          value={parsedResult.category}
                          onValueChange={(val) => setParsedResult({ ...parsedResult, category: val })}
                        >
                          <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-900 font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900">
                            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-600 text-[11px] font-bold">子分类</label>
                        <Input
                          value={parsedResult.sub_category || ''}
                          onChange={(e) => setParsedResult({ ...parsedResult, sub_category: e.target.value })}
                          className="h-8 bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-600 text-[11px] font-bold">原价 (¥/$)</label>
                        <Input
                          type="number"
                          value={parsedResult.original_price}
                          onChange={(e) => setParsedResult({ ...parsedResult, original_price: e.target.value })}
                          className="h-8 bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-rose-600 text-[11px] font-bold">活动售价 (¥/$)</label>
                        <Input
                          type="number"
                          value={parsedResult.sale_price}
                          onChange={(e) => setParsedResult({ ...parsedResult, sale_price: e.target.value })}
                          className="h-8 bg-rose-50 border-rose-300 text-rose-600 font-extrabold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-600 text-[11px] font-bold">初始库存</label>
                        <Input
                          type="number"
                          value={parsedResult.stock}
                          onChange={(e) => setParsedResult({ ...parsedResult, stock: e.target.value })}
                          className="h-8 bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                    </div>

                    {/* AI 核心卖点 */}
                    <div className="space-y-1.5">
                      <label className="text-slate-600 text-[11px] font-bold">AI 提取核心卖点 (应用于脚本创作)</label>
                      {parsedResult.selling_points?.map((sp: string, idx: number) => (
                        <Input
                          key={idx}
                          value={sp}
                          onChange={(e) => {
                            const newSps = [...parsedResult.selling_points];
                            newSps[idx] = e.target.value;
                            setParsedResult({ ...parsedResult, selling_points: newSps });
                          }}
                          className="h-7 text-xs bg-white border-slate-200 text-slate-900 font-medium"
                        />
                      ))}
                    </div>

                    {/* 商品简述 */}
                    <div className="space-y-1">
                      <label className="text-slate-600 text-[11px] font-bold">商品描述与功能点说明</label>
                      <Textarea
                        rows={2}
                        value={parsedResult.description}
                        onChange={(e) => setParsedResult({ ...parsedResult, description: e.target.value })}
                        className="bg-white border-slate-200 text-xs text-slate-900 rounded-lg resize-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUrlParseOpen(false)}
              className="h-9 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
            >
              取消
            </Button>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={parsing || !inputUrl.trim()}
                onClick={() => handleAIParseUrl()}
                className="h-9 text-xs rounded-xl gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {parsing ? '解析中...' : '重新解析'}
              </Button>

              {parsedResult ? (
                <Button
                  size="sm"
                  disabled={savingParsed}
                  onClick={handleSaveParsedProduct}
                  className="h-9 text-xs rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold gap-1.5 shadow-md shadow-rose-500/20"
                >
                  {savingParsed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  确认并导入商品管理
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={parsing || !inputUrl.trim()}
                  onClick={() => handleAIParseUrl()}
                  className="h-9 text-xs rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold gap-1.5 shadow-md shadow-rose-500/20"
                >
                  {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  🚀 AI 智能解析商品
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
