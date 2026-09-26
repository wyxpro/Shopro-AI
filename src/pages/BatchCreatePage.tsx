import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { deductUserCredits, refundGenerationCredits } from '@/hooks/useCredits';
import { ensureCreditsForGeneration, openCreditsDialog, VIDEO_GENERATE_COST } from '@/lib/creditGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Layers, Plus, Trash2, Play, Pause, RotateCcw, Download, CheckCircle2,
  AlertCircle, Loader2, Package, Video, Settings2, ChevronDown, ChevronUp,
  Clock, ArrowRight, X, FileUp, Search, Filter, Grid3X3, List,
} from 'lucide-react';

// ─── 类型 ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  image_url: string | null;
  selling_points: string[];
}

interface BatchJob {
  id: string;
  name: string;
  status: string;
  total_count: number;
  completed_count: number;
  failed_count: number;
  config: any;
  created_at: string;
}

interface BatchJobItem {
  id: string;
  batch_id: string;
  product_id: string | null;
  product_name: string | null;
  status: string;
  video_project_id: string | null;
  error_message: string | null;
  created_at: string;
}

const VIDEO_STYLES = ['活泼热情', '专业权威', '温馨生活', '时尚潮流', '悬念吸引', '测评分析'];
const BGM_OPTIONS = ['轻松欢快', '节奏感强', '温柔抒情', '科技感', '无BGM'];
const SUBTITLE_STYLES = ['简洁白底', '描边黑字', '渐变彩色', '纯文字', '无字幕'];
const LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英语' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'th', label: '泰语' },
  { value: 'vi', label: '越南语' },
];
const PLATFORMS = [
  { value: 'douyin', label: '抖音' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'kuaishou', label: '快手' },
  { value: 'xiaohongshu', label: '小红书' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending:    { label: '待处理', color: 'text-muted-foreground', icon: Clock },
  processing: { label: '处理中', color: 'text-primary', icon: Loader2 },
  paused:     { label: '已暂停', color: 'text-warning', icon: Pause },
  completed:  { label: '已完成', color: 'text-success', icon: CheckCircle2 },
  failed:     { label: '失败',   color: 'text-destructive', icon: AlertCircle },
  cancelled:  { label: '已取消', color: 'text-muted-foreground', icon: X },
};

// ─── 商品选择弹窗 ───────────────────────────────────────────────────────────
function ProductPicker({
  open, onClose, onSelect, excludeIds,
}: {
  open: boolean; onClose: () => void; onSelect: (products: Product[]) => void; excludeIds: string[];
}) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase.from('products').select('id,name,category,price,image_url,selling_points').eq('user_id', user.id)
      .then(({ data }) => { setProducts((data ?? []) as Product[]); setLoading(false); });
  }, [open, user]);

  const filtered = products.filter(p =>
    !excludeIds.includes(p.id) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? '').includes(search))
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedProducts = products.filter(p => selected.has(p.id));
    onSelect(selectedProducts);
    setSelected(new Set());
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>选择商品</DialogTitle>
          <DialogDescription>从商品库中选择要批量生成的商品</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input placeholder="搜索商品名称..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto flex-1 min-h-0">
            {filtered.map(p => {
              const isSel = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md",
                    isSel ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", isSel ? "bg-primary border-primary" : "border-border")}>
                      {isSel && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-xs font-medium truncate">{p.name}</span>
                  </div>
                  {p.category && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-8">暂无符合条件的商品</div>}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm text-muted-foreground">已选择 {selected.size} 个商品</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0}>确认添加</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function BatchCreatePage() {
  const { user } = useAuth();
  const [view, setView] = useState<'create' | 'history'>('create');

  // 创建模式
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // 统一配置
  const [globalConfig, setGlobalConfig] = useState({
    language: 'zh',
    platform: 'douyin',
    style: '活泼热情',
    duration: 30,
    bgm: '轻松欢快',
    subtitle: '简洁白底',
    useTranslation: false,
  });

  // 独立配置模式
  const [useIndividualConfig, setUseIndividualConfig] = useState(false);
  const [productConfigs, setProductConfigs] = useState<Record<string, any>>({});

  // 历史任务
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [jobItems, setJobItems] = useState<Record<string, BatchJobItem[]>>({});
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // 加载历史任务
  const loadJobs = useCallback(async () => {
    if (!user) return;
    setLoadingJobs(true);
    const { data } = await supabase.from('batch_jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setBatchJobs((data ?? []) as BatchJob[]);
    setLoadingJobs(false);
  }, [user]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // 轮询活跃任务
  useEffect(() => {
    const active = batchJobs.some(j => j.status === 'processing' || j.status === 'pending');
    if (active) {
      pollRef.current = setInterval(loadJobs, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [batchJobs, loadJobs]);

  // 加载任务详情
  const loadJobItems = async (jobId: string) => {
    const { data } = await supabase.from('batch_job_items').select('*').eq('batch_id', jobId).order('created_at');
    setJobItems(prev => ({ ...prev, [jobId]: (data ?? []) as BatchJobItem[] }));
  };

  const handleAddProducts = (products: Product[]) => {
    setSelectedProducts(prev => [...prev, ...products.filter(p => !prev.some(ep => ep.id === p.id))]);
    setPickerOpen(false);
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
    setProductConfigs(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleSubmit = async () => {
    if (!user || selectedProducts.length === 0) {
      toast.error('请先选择至少一个商品');
      return;
    }

    const totalCost = selectedProducts.length * VIDEO_GENERATE_COST;

    // 统一积分守卫：余额不足以覆盖整个批次时直接拦截，并自动弹出充值弹窗
    const guard = await ensureCreditsForGeneration(user.id, totalCost);
    if (!guard.ok) return;

    const deductRes = await deductUserCredits(user.id, totalCost, `批量生成 ${selectedProducts.length} 个商品视频`, 'video_generate');
    if (!deductRes.success) {
      toast.error(deductRes.message || `积分不足（当前 ${deductRes.creditsLeft}，批量生成需 ${totalCost}），请充值后重试`, { duration: 6000 });
      if (!deductRes.insufficientCredits) openCreditsDialog();
      return;
    }

    setSubmitting(true);
    try {
      const config = useIndividualConfig
        ? { mode: 'individual', products: productConfigs }
        : { mode: 'global', ...globalConfig };

      const { data: job, error: jobErr } = await supabase.from('batch_jobs').insert({
        user_id: user.id,
        name: `批量生成 - ${selectedProducts.length}个商品`,
        status: 'pending',
        total_count: selectedProducts.length,
        config,
      }).select().single();

      if (jobErr || !job) throw jobErr || new Error('创建任务失败');

      const items = selectedProducts.map(p => ({
        batch_id: job.id,
        product_id: p.id,
        product_name: p.name,
        status: 'pending',
        config: useIndividualConfig ? (productConfigs[p.id] ?? globalConfig) : globalConfig,
      }));

      const { error: itemsErr } = await supabase.from('batch_job_items').insert(items);
      if (itemsErr) throw itemsErr;

      toast.success(`批量任务已创建，共 ${selectedProducts.length} 个商品`);
      setSelectedProducts([]);
      setProductConfigs({});
      setView('history');
      loadJobs();
    } catch (err: any) {
      toast.error('创建失败：' + (err.message || '请重试'));
      // 失败回滚：批量任务创建失败时退还已扣的全部积分
      const res = await refundGenerationCredits(user.id, totalCost, `批量任务创建失败，退还 ${selectedProducts.length} 个视频积分`);
      if (res.success) toast.info(`已自动退还 ${totalCost} 积分`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async (jobId: string) => {
    await supabase.from('batch_jobs').update({ status: 'paused' }).eq('id', jobId);
    toast.success('任务已暂停');
    loadJobs();
  };

  const handleResume = async (jobId: string) => {
    await supabase.from('batch_jobs').update({ status: 'processing' }).eq('id', jobId);
    toast.success('任务已恢复');
    loadJobs();
  };

  const handleCancel = async (jobId: string) => {
    await supabase.from('batch_jobs').update({ status: 'cancelled' }).eq('id', jobId);
    await supabase.from('batch_job_items').update({ status: 'cancelled' }).eq('batch_id', jobId).neq('status', 'completed');
    toast.success('任务已取消');
    loadJobs();
  };

  const progressPct = (job: BatchJob) => job.total_count > 0 ? Math.round(((job.completed_count + job.failed_count) / job.total_count) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* 标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <Layers className="w-5 h-5 text-primary" />批量生成工作台
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">一次性提交多个商品，AI 批量生成带货视频</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant={view === 'create' ? 'default' : 'outline'} size="sm" onClick={() => setView('create')}>
            <Plus className="w-4 h-4 mr-1.5" />新建任务
          </Button>
          <Button variant={view === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setView('history')}>
            <Clock className="w-4 h-4 mr-1.5" />历史任务
          </Button>
        </div>
      </div>

      {view === 'create' ? (
        <div className="space-y-6">
          {/* 商品选择区 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />选择商品
              </CardTitle>
              <CardDescription>从商品库中选择需要生成视频的商品，支持批量选择</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProducts.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm mb-4">暂无商品，请先添加商品到批量列表</p>
                  <Button onClick={() => setPickerOpen(true)}><Plus className="w-4 h-4 mr-1.5" />添加商品</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">已选择 {selectedProducts.length} 个商品</span>
                    <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" />继续添加</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProducts.map(p => (
                      <div key={p.id} className="rounded-xl border border-border p-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.category && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
                            {p.price && <span className="text-xs text-muted-foreground">¥{p.price}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveProduct(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 配置区 */}
          {selectedProducts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />生成配置
                </CardTitle>
                <CardDescription>统一配置所有商品的生成参数，或为每个商品单独配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 统一配置 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">目标语言</label>
                    <Select value={globalConfig.language} onValueChange={v => setGlobalConfig(c => ({ ...c, language: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">目标平台</label>
                    <Select value={globalConfig.platform} onValueChange={v => setGlobalConfig(c => ({ ...c, platform: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">视频风格</label>
                    <Select value={globalConfig.style} onValueChange={v => setGlobalConfig(c => ({ ...c, style: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VIDEO_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">视频时长（秒）</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={15} max={60} step={5}
                        value={globalConfig.duration}
                        onChange={e => setGlobalConfig(c => ({ ...c, duration: Number(e.target.value) }))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-sm font-mono w-10 text-right">{globalConfig.duration}s</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">背景音乐</label>
                    <Select value={globalConfig.bgm} onValueChange={v => setGlobalConfig(c => ({ ...c, bgm: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BGM_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">字幕样式</label>
                    <Select value={globalConfig.subtitle} onValueChange={v => setGlobalConfig(c => ({ ...c, subtitle: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBTITLE_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 多语言翻译 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                  <input
                    type="checkbox"
                    id="useTranslation"
                    checked={globalConfig.useTranslation}
                    onChange={e => setGlobalConfig(c => ({ ...c, useTranslation: e.target.checked }))}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  <label htmlFor="useTranslation" className="text-sm cursor-pointer select-none flex-1">
                    <span className="font-medium">启用多语言翻译</span>
                    <span className="text-muted-foreground ml-1">生成后将脚本文案自动翻译为目标语言</span>
                  </label>
                </div>

                {/* 提交 */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t">
                  <Button variant="outline" onClick={() => { setSelectedProducts([]); setProductConfigs({}); }}>清空</Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="min-w-[140px]">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
                    开始批量生成
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* 历史任务 */
        <div className="space-y-4">
          {loadingJobs ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : batchJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Layers className="w-12 h-12 mb-4 opacity-20" />
              <p>暂无批量生成任务</p>
              <Button variant="outline" className="mt-4" onClick={() => setView('create')}><Plus className="w-4 h-4 mr-1.5" />创建新任务</Button>
            </div>
          ) : (
            batchJobs.map(job => {
              const isExpanded = expandedJob === job.id;
              const pct = progressPct(job);
              const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              return (
                <Card key={job.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{job.name}</h3>
                          <Badge className={cn('text-[10px]', statusCfg.color)}><StatusIcon className={cn('w-3 h-3 mr-0.5', job.status === 'processing' && 'animate-spin')} />{statusCfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>总计 {job.total_count} 个</span>
                          <span className="text-success">成功 {job.completed_count}</span>
                          {job.failed_count > 0 && <span className="text-destructive">失败 {job.failed_count}</span>}
                          <span>创建于 {new Date(job.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.status === 'processing' && (
                          <Button variant="outline" size="sm" onClick={() => handlePause(job.id)}><Pause className="w-3.5 h-3.5 mr-1" />暂停</Button>
                        )}
                        {job.status === 'paused' && (
                          <Button variant="outline" size="sm" onClick={() => handleResume(job.id)}><Play className="w-3.5 h-3.5 mr-1" />恢复</Button>
                        )}
                        {(job.status === 'pending' || job.status === 'processing' || job.status === 'paused') && (
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleCancel(job.id)}><X className="w-3.5 h-3.5 mr-1" />取消</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setExpandedJob(isExpanded ? null : job.id); if (!isExpanded) loadJobItems(job.id); }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    {/* 进度条 */}
                    <div className="mt-3">
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">进度 {pct}%</span>
                        <span className="text-[10px] text-muted-foreground">{job.completed_count + job.failed_count} / {job.total_count}</span>
                      </div>
                    </div>
                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        {(jobItems[job.id] ?? []).map(item => (
                          <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 text-sm">
                            <span className="flex-1 min-w-0 truncate">{item.product_name || '未知商品'}</span>
                            <Badge className={cn('text-[10px]', STATUS_CONFIG[item.status]?.color ?? '')}>
                              {STATUS_CONFIG[item.status]?.label ?? item.status}
                            </Badge>
                            {item.video_project_id && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                                <a href={`/works?project=${item.video_project_id}`}>查看</a>
                              </Button>
                            )}
                            {item.error_message && <span className="text-[10px] text-destructive truncate max-w-[200px]">{item.error_message}</span>}
                          </div>
                        ))}
                        {(jobItems[job.id] ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">加载中...</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <ProductPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAddProducts} excludeIds={selectedProducts.map(p => p.id)} />
    </div>
  );
}
