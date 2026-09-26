import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, RefreshCw, Plus, Eye,
  Heart, MessageCircle, Share2, Play, Bell, BellOff,
  BarChart3, Flame, Globe, ExternalLink, Trash2, Search,
  AlertCircle, Sparkles, Clock, Wand2, Copy, Lightbulb, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── 类型 ────────────────────────────────────────────────────────────────────
interface CompetitorAccount {
  id: string;
  platform: string;
  account_id: string;
  account_name: string;
  category: string;
  follower_count: number;
  is_monitoring: boolean;
  last_crawled_at: string | null;
  created_at: string;
}

interface CompetitorSnapshot {
  id: string;
  account_id: string;
  video_id: string;
  title: string;
  cover_url: string | null;
  play_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  duration: number;
  style_tags: string[];
  hook_type: string | null;
  is_trending: boolean;
  published_at: string | null;
  crawled_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  douyin: '抖音', tiktok: 'TikTok', xiaohongshu: '小红书', kuaishou: '快手',
};
const PLATFORM_COLORS: Record<string, string> = {
  douyin: 'bg-[#fe2c55]/15 text-[#fe2c55]',
  tiktok: 'bg-black/10 text-foreground',
  xiaohongshu: 'bg-[#ff2442]/15 text-[#ff2442]',
  kuaishou: 'bg-[#ff6600]/15 text-[#ff6600]',
};
const MOCK_ACCOUNTS: CompetitorAccount[] = [
  { id: 'ca-001', platform: 'douyin', account_id: 'douyin_meizhuang', account_name: '小美美妆种草日记', category: '美妆护肤', follower_count: 3250000, is_monitoring: true, last_crawled_at: new Date().toISOString(), created_at: '2026-08-10T10:00:00Z' },
  { id: 'ca-002', platform: 'tiktok', account_id: 'tiktok_skincare', account_name: 'GlowSkin Official', category: '美妆护肤', follower_count: 1850000, is_monitoring: true, last_crawled_at: new Date().toISOString(), created_at: '2026-08-11T12:00:00Z' },
  { id: 'ca-003', platform: 'xiaohongshu', account_id: 'xhs_outfit', account_name: '穿搭指南小夏', category: '服装配饰', follower_count: 980000, is_monitoring: true, last_crawled_at: new Date().toISOString(), created_at: '2026-08-12T15:00:00Z' },
  { id: 'ca-004', platform: 'kuaishou', account_id: 'ks_snack', account_name: '怀旧零食测评馆', category: '食品饮料', follower_count: 2160000, is_monitoring: true, last_crawled_at: new Date().toISOString(), created_at: '2026-09-02T09:30:00Z' },
  { id: 'ca-005', platform: 'douyin', account_id: 'douyin_digital', account_name: '数码新品首发官', category: '数码3C', follower_count: 5480000, is_monitoring: true, last_crawled_at: new Date().toISOString(), created_at: '2026-09-05T18:20:00Z' },
];

const MOCK_SNAPSHOTS: Record<string, CompetitorSnapshot[]> = {
  'ca-001': [
    { id: 'sn-001', account_id: 'ca-001', video_id: 'v-101', title: '熬夜痘肌救星！3天实测全过程', cover_url: null, play_count: 2450000, like_count: 182000, comment_count: 12400, share_count: 31000, duration: 28, style_tags: ['痛点共鸣', '对比测试'], hook_type: '悬念痛点', is_trending: true, published_at: '2026-08-18T10:00:00Z', crawled_at: new Date().toISOString() },
    { id: 'sn-002', account_id: 'ca-001', video_id: 'v-102', title: '为什么明星皮肤都这么好？秘密揭晓', cover_url: null, play_count: 1280000, like_count: 95000, comment_count: 5200, share_count: 14000, duration: 32, style_tags: ['干货知识', '产品植入'], hook_type: '明星揭秘', is_trending: false, published_at: '2026-08-17T15:00:00Z', crawled_at: new Date().toISOString() },
  ],
  'ca-002': [
    { id: 'sn-003', account_id: 'ca-002', video_id: 'v-201', title: 'Night Routine for Glass Skin ✨', cover_url: null, play_count: 3890000, like_count: 420000, comment_count: 18900, share_count: 65000, duration: 22, style_tags: ['沉浸式', '治愈风'], hook_type: '视觉ASMR', is_trending: true, published_at: '2026-08-19T08:00:00Z', crawled_at: new Date().toISOString() },
  ],
  'ca-003': [
    { id: 'sn-004', account_id: 'ca-003', video_id: 'v-301', title: '158小个子秋季显高穿搭模版', cover_url: null, play_count: 1650000, like_count: 135000, comment_count: 8800, share_count: 24000, duration: 25, style_tags: ['实用穿搭', '显高拉长'], hook_type: '痛点解决方案', is_trending: true, published_at: '2026-08-19T14:00:00Z', crawled_at: new Date().toISOString() },
  ],
  'ca-004': [
    { id: 'sn-005', account_id: 'ca-004', video_id: 'v-401', title: '80后童年零食大横评！第3款泪目了', cover_url: null, play_count: 3120000, like_count: 268000, comment_count: 21600, share_count: 45000, duration: 46, style_tags: ['怀旧共鸣', '横评实测'], hook_type: '情绪共鸣开场', is_trending: true, published_at: '2026-09-08T19:30:00Z', crawled_at: new Date().toISOString() },
    { id: 'sn-006', account_id: 'ca-004', video_id: 'v-402', title: '超市避雷指南：这5种零食配料表太脏', cover_url: null, play_count: 980000, like_count: 76000, comment_count: 5400, share_count: 18000, duration: 38, style_tags: ['干货科普', '避雷清单'], hook_type: '反差冲突', is_trending: false, published_at: '2026-09-10T11:00:00Z', crawled_at: new Date().toISOString() },
  ],
  'ca-005': [
    { id: 'sn-007', account_id: 'ca-005', video_id: 'v-501', title: '新机深度实测：夜景成像真的强？', cover_url: null, play_count: 4680000, like_count: 356000, comment_count: 28900, share_count: 52000, duration: 55, style_tags: ['首发实测', '参数对比'], hook_type: '新机悬念', is_trending: true, published_at: '2026-09-12T20:00:00Z', crawled_at: new Date().toISOString() },
    { id: 'sn-008', account_id: 'ca-005', video_id: 'v-502', title: '百元内耳机卷王之战，谁在裸泳', cover_url: null, play_count: 2150000, like_count: 142000, comment_count: 11800, share_count: 26000, duration: 42, style_tags: ['横评实测', '性价比'], hook_type: '冲突对立', is_trending: true, published_at: '2026-09-14T16:30:00Z', crawled_at: new Date().toISOString() },
    { id: 'sn-009', account_id: 'ca-005', video_id: 'v-503', title: '发布会幕后：工程师拆解供应链真相', cover_url: null, play_count: 760000, like_count: 58000, comment_count: 4200, share_count: 9800, duration: 60, style_tags: ['行业揭秘', '深度内容'], hook_type: '幕后揭秘', is_trending: false, published_at: '2026-09-15T10:00:00Z', crawled_at: new Date().toISOString() },
  ],
};

function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── 竞品卡片 ──────────────────────────────────────────────────────────────
function AccountCard({
  account, snapshots, onCrawl, onDelete, onToggle, crawling,
}: {
  account: CompetitorAccount;
  snapshots: CompetitorSnapshot[];
  onCrawl: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
  crawling: boolean;
}) {
  const latestVideo = snapshots[0];
  const trending = snapshots.filter(s => s.is_trending).length;
  const avgPlays = snapshots.length
    ? Math.round(snapshots.reduce((a, s) => a + s.play_count, 0) / snapshots.length) : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate text-balance">{account.account_name}</p>
              <Badge className={cn('text-xs font-medium mt-0.5', PLATFORM_COLORS[account.platform] ?? 'bg-muted text-muted-foreground')}>
                {PLATFORM_LABELS[account.platform] ?? account.platform}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm" variant="ghost"
              className={cn('h-7 w-7 p-0', account.is_monitoring ? 'text-primary' : 'text-muted-foreground')}
              onClick={() => onToggle(account.id, !account.is_monitoring)}
            >
              {account.is_monitoring ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(account.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3">
        {/* 指标 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: '视频数', val: snapshots.length },
            { label: '爆款', val: trending },
            { label: '均播放', val: fmt(avgPlays) },
          ].map(m => (
            <div key={m.label} className="rounded-lg bg-muted/40 py-2">
              <p className="text-sm font-bold">{m.val}</p>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        {/* 最新爆款 */}
        {latestVideo && (
          <div className="rounded-lg border border-border/60 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              {latestVideo.is_trending && <Flame className="w-3 h-3 text-destructive shrink-0" />}
              <p className="text-xs font-medium truncate">{latestVideo.title}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmt(latestVideo.play_count)}</span>
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{fmt(latestVideo.like_count)}</span>
              {latestVideo.style_tags?.slice(0,2).map(t => (
                <span key={t} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* 最后抓取时间 */}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {account.last_crawled_at
            ? `上次更新：${new Date(account.last_crawled_at).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}`
            : '尚未抓取'}
        </p>

        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => onCrawl(account.id)}
          disabled={crawling}
        >
          {crawling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {crawling ? '抓取中…' : '立即更新'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function CompetitorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<CompetitorAccount[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, CompetitorSnapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const [crawlingId, setCrawlingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailAccount, setDetailAccount] = useState<CompetitorAccount | null>(null);
  const [form, setForm] = useState({ platform: 'douyin', account_id: '', account_name: '', category: '' });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  // 账号总览默认仅展示前 3 个监控账号，可手动展开全部
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisTarget, setAnalysisTarget] = useState<CompetitorAccount | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<CompetitorSnapshot | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyResult, setCopyResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: accts } = await supabase
      .from('competitor_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAccounts((accts ?? []) as CompetitorAccount[]);

    if (accts && accts.length > 0) {
      const snapMap: Record<string, CompetitorSnapshot[]> = {};
      await Promise.all(accts.map(async (a) => {
        const { data: snaps } = await supabase
          .from('competitor_snapshots')
          .select('*')
          .eq('account_id', a.id)
          .order('play_count', { ascending: false })
          .limit(10);
        snapMap[a.id] = (snaps ?? []) as CompetitorSnapshot[];
      }));
      setSnapshots(snapMap);
    } else {
      // 预置竞品爆款分析生成示例数据
      setAccounts(MOCK_ACCOUNTS);
      setSnapshots(MOCK_SNAPSHOTS);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCrawl = async (accountId: string) => {
    setCrawlingId(accountId);
    try {
      const { error } = await supabase.functions.invoke('phase3-assistant', {
        body: { action: 'crawl_competitor', account_db_id: accountId },
      });
      if (error) { const t = await error.context?.text?.(); throw new Error(t || error.message); }
      toast.success('竞品数据已更新');
      await loadData();
    } catch (e) {
      toast.error(`抓取失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setCrawlingId(null);
    }
  };

  const handleAdd = async () => {
    if (!form.account_id || !form.account_name) { toast.error('请填写账号信息'); return; }
    setAdding(true);
    try {
      const { error } = await supabase.functions.invoke('phase3-assistant', {
        body: { action: 'add_competitor', ...form },
      });
      if (error) { const t = await error.context?.text?.(); throw new Error(t || error.message); }
      toast.success('竞品账号已添加');
      setAddOpen(false);
      setForm({ platform: 'douyin', account_id: '', account_name: '', category: '' });
      await loadData();
    } catch (e) {
      toast.error(`添加失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('competitor_accounts').delete().eq('id', id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    toast.success('已删除竞品账号');
  };

  const handleToggleMonitor = async (id: string, val: boolean) => {
    await supabase.from('competitor_accounts').update({ is_monitoring: val }).eq('id', id);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_monitoring: val } : a));
  };

  // 爆款策略分析
  const handleAnalyze = async (account: CompetitorAccount) => {
    setAnalysisTarget(account);
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    try {
      const snaps = snapshots[account.id] ?? [];
      const trending = snaps.filter(s => s.is_trending);
      // 模拟AI分析（实际应调用Edge Function）
      await new Promise(r => setTimeout(r, 1200));
      const hookTypes = [...new Set(trending.map(s => s.hook_type).filter(Boolean))];
      const styleTags = [...new Set(trending.flatMap(s => s.style_tags ?? []))];
      const avgDuration = trending.length ? Math.round(trending.reduce((a, s) => a + s.duration, 0) / trending.length) : 0;
      setAnalysisResult({
        hookTypes: hookTypes.length ? hookTypes : ['悬念开场', '痛点共鸣', '产品展示'],
        styleTags: styleTags.length ? styleTags : ['快节奏', '字幕强调', 'BGM卡点'],
        avgDuration,
        bestTime: '19:00-21:00',
        keywords: ['限时', '福利', '必入', '真香', '闭眼冲'],
        strategy: `该账号${account.account_name}的爆款内容主要采用「${hookTypes[0] || '悬念开场'}」钩子，配合${styleTags[0] || '快节奏'}风格，平均时长${avgDuration || 30}秒。建议在19:00-21:00发布，使用「限时」「福利」等关键词。`,
      });
    } catch (e: any) {
      toast.error('分析失败：' + e.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 对标内容生成
  const handleCopyContent = async (snap: CompetitorSnapshot) => {
    setCopyTarget(snap);
    setCopyOpen(true);
    setCopyLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setCopyResult({
        title: `【同款测评】${snap.title.slice(0, 20)}...`,
        script: `开场：3秒黄金钩子，直击痛点\n产品亮相：展示同款产品，强调差异化卖点\n对比测试：与竞品正面PK，数据说话\n福利引导：限时优惠+赠品\n行动号召：点击左下角，立即体验`,
        hook: snap.hook_type || '痛点共鸣',
        tags: [...(snap.style_tags ?? []), '测评', '好物推荐'],
        suggestedDuration: snap.duration,
      });
    } catch (e: any) {
      toast.error('生成失败：' + e.message);
    } finally {
      setCopyLoading(false);
    }
  };

  const filtered = accounts.filter(a =>
    !search || a.account_name.includes(search) || a.account_id.includes(search)
  );
  const displayAccounts = search || showAllAccounts ? filtered : filtered.slice(0, 3);

  // 汇总爆款趋势图数据
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = `${d.getMonth()+1}/${d.getDate()}`;
    const allSnaps = Object.values(snapshots).flat();
    const daySnaps = allSnaps.filter(s => s.crawled_at && new Date(s.crawled_at).toDateString() === d.toDateString());
    return { label, 爆款数: daySnaps.filter(s => s.is_trending).length, 总视频: daySnaps.length };
  });

  // 选中账号快照列表
  const detailSnaps = detailAccount ? (snapshots[detailAccount.id] ?? []) : [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 标题栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />竞品爆款分析
            <Badge className="text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30">24h 实时感知</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">抓取竞品爆款视频策略与对标拆解方案 · 一键生成对标脚本</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索账号…" className="pl-8 h-9 w-44" />
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />添加竞品
          </Button>
        </div>
      </div>

      {/* 概览指标 */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '监控账号', val: accounts.length, icon: Globe, color: 'text-primary', bg: 'bg-primary/10' },
            { label: '已抓取视频', val: Object.values(snapshots).flat().length, icon: Play, color: 'text-info', bg: 'bg-info/10' },
            { label: '爆款视频', val: Object.values(snapshots).flat().filter(s => s.is_trending).length, icon: Flame, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: '今日更新', val: accounts.filter(a => a.last_crawled_at && new Date(a.last_crawled_at).toDateString() === new Date().toDateString()).length, icon: RefreshCw, color: 'text-success', bg: 'bg-success/10' },
          ].map(m => (
            <Card key={m.label} className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', m.bg)}>
                  <m.icon className={cn('w-5 h-5', m.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold">{m.val}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">账号总览</TabsTrigger>
          <TabsTrigger value="trending">爆款追踪</TabsTrigger>
          <TabsTrigger value="strategy">策略分析</TabsTrigger>
          <TabsTrigger value="trend">趋势图表</TabsTrigger>
        </TabsList>

        {/* 账号总览 */}
        <TabsContent value="overview" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Eye className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">还没有监控的竞品</p>
              <p className="text-sm text-muted-foreground mt-1">添加竞争对手账号，实时追踪其爆款内容</p>
              <Button className="mt-4 gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4" />添加第一个竞品
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAccounts.map(a => (
                <div key={a.id} onClick={() => setDetailAccount(a)} className="cursor-pointer">
                  <AccountCard
                    account={a}
                    snapshots={snapshots[a.id] ?? []}
                    onCrawl={(_id) => { handleCrawl(a.id); }}
                    onDelete={handleDelete}
                    onToggle={handleToggleMonitor}
                    crawling={crawlingId === a.id}
                  />
                </div>
              ))}
            </div>
          )}
          {!loading && !search && filtered.length > 3 && (
            <Button
              size="sm" variant="outline"
              className="mt-4 w-full h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={() => setShowAllAccounts(v => !v)}
            >
              {showAllAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAllAccounts ? '收起监控账号' : `展开全部 ${filtered.length} 个监控账号（默认展示 3 个）`}
            </Button>
          )}
        </TabsContent>

        {/* 爆款追踪 */}
        <TabsContent value="trending" className="mt-4">
          <div className="space-y-2">
            {Object.values(snapshots).flat().filter(s => s.is_trending)
              .sort((a, b) => b.play_count - a.play_count)
              .slice(0, 20)
              .map(snap => {
                const acct = accounts.find(a => a.id === snap.account_id);
                return (
                  <div key={snap.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
                    <Flame className="w-4 h-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{snap.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{acct?.account_name}</span>
                        {snap.style_tags?.slice(0,2).map(t => (
                          <span key={t} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmt(snap.play_count)}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{fmt(snap.like_count)}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={() => handleCopyContent(snap)}>
                        <Wand2 className="w-3 h-3" />对标生成
                      </Button>
                    </div>
                  </div>
                );
              })}
            {Object.values(snapshots).flat().filter(s => s.is_trending).length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无爆款数据，请先抓取竞品视频</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 策略分析 */}
        <TabsContent value="strategy" className="mt-4">
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">请先添加竞品账号，再查看策略分析</p>
              </div>
            ) : (
              accounts.map(a => {
                const snaps = snapshots[a.id] ?? [];
                const trending = snaps.filter(s => s.is_trending);
                return (
                  <Card key={a.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{a.account_name}</p>
                            <p className="text-xs text-muted-foreground">{trending.length} 条爆款 · {snaps.length} 条视频</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleAnalyze(a)}>
                            <Lightbulb className="w-3.5 h-3.5" />策略分析
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* 趋势图表 */}
        <TabsContent value="trend" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />近7天竞品爆款追踪趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full min-w-0 overflow-hidden h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                    <Line type="monotone" dataKey="爆款数" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="总视频" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 策略分析弹窗 */}
      <Dialog open={analysisOpen} onOpenChange={v => { if (!v) { setAnalysisOpen(false); setAnalysisResult(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              {analysisTarget?.account_name} · 爆款策略分析
            </DialogTitle>
            <DialogDescription>基于AI分析竞品爆款内容的策略特征</DialogDescription>
          </DialogHeader>
          {analysisLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI正在分析爆款策略…</p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/50 p-4 border border-border/60">
                <p className="text-sm leading-relaxed text-foreground">{analysisResult.strategy}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">热门钩子类型</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.hookTypes.map((h: string) => (
                      <Badge key={h} variant="secondary" className="text-[10px]">{h}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">风格标签</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.styleTags.map((t: string) => (
                      <Badge key={t} className="text-[10px] bg-primary/10 text-primary">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-sm font-bold">{analysisResult.avgDuration}s</p>
                  <p className="text-[10px] text-muted-foreground">平均时长</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-sm font-bold">{analysisResult.bestTime}</p>
                  <p className="text-[10px] text-muted-foreground">最佳发布时间</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-sm font-bold">{analysisResult.keywords.length}个</p>
                  <p className="text-[10px] text-muted-foreground">高频关键词</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">高频关键词</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.keywords.map((k: string) => (
                    <span key={k} className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning font-medium">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 对标内容生成弹窗 */}
      <Dialog open={copyOpen} onOpenChange={v => { if (!v) { setCopyOpen(false); setCopyResult(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              对标内容生成
            </DialogTitle>
            <DialogDescription>基于竞品爆款特征，AI生成可复用的内容方案</DialogDescription>
          </DialogHeader>
          {copyLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI正在生成对标内容…</p>
            </div>
          ) : copyResult ? (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">建议标题</p>
                <div className="rounded-lg bg-muted/40 p-3 text-sm font-medium">{copyResult.title}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">脚本框架</p>
                <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-line leading-relaxed">{copyResult.script}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">推荐钩子</p>
                  <Badge variant="secondary" className="text-xs">{copyResult.hook}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">建议时长</p>
                  <span className="text-sm font-medium">{copyResult.suggestedDuration}s</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">推荐标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {copyResult.tags.map((t: string) => (
                    <Badge key={t} className="text-[10px] bg-primary/10 text-primary">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => {
                  navigator.clipboard.writeText(`${copyResult.title}\n\n${copyResult.script}`);
                  toast.success('对标方案已复制到剪贴板！');
                }}>
                  <Copy className="w-4 h-4" />复制完整方案
                </Button>
                <Button className="flex-1 gap-1.5 bg-primary text-primary-foreground" onClick={() => {
                  setCopyOpen(false);
                  navigate('/script', { state: { competitorScript: copyResult.script, prompt: `${copyResult.title}\n${copyResult.script}` } });
                  toast.success('已携带竞品对标方案进入带货脚本生成器！');
                }}>
                  <Wand2 className="w-4 h-4" />带入脚本创作
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 添加竞品弹窗 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>添加竞品账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal">平台</label>
              <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">账号ID / 主页链接</label>
              <Input placeholder="例：ms123456789" value={form.account_id} onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">账号名称</label>
              <Input placeholder="例：美妆达人小李" value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">品类（选填）</label>
              <Input placeholder="例：美妆、食品、数码…" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleAdd} disabled={adding}>
              {adding ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {adding ? '添加中…' : '确认添加'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 账号详情弹窗 */}
      <Dialog open={!!detailAccount} onOpenChange={v => !v && setDetailAccount(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <Sparkles className="w-4 h-4 text-primary" />
              {detailAccount?.account_name} · 视频分析
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {detailSnaps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无视频数据，请先点击「立即更新」</p>
            ) : (
              detailSnaps.map(snap => (
                <div key={snap.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60">
                  {snap.is_trending && <Flame className="w-4 h-4 text-destructive shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{snap.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {snap.style_tags?.map(t => (
                        <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmt(snap.play_count)}</span>
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{fmt(snap.like_count)}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{fmt(snap.comment_count)}</span>
                    <span className="flex items-center gap-0.5"><Share2 className="w-3 h-3" />{fmt(snap.share_count)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
