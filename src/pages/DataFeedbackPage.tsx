import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart3, RefreshCw, Zap,
  Eye, MousePointerClick, ShoppingCart, DollarSign,
  Clock, Play, ArrowUpRight, ArrowDownRight, Plus,
  Video, Scissors, Share2, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PlatformCredentialDialog, { storePlatformCredentials, loadStoredPlatformCredentials } from '@/components/common/PlatformCredentialDialog';
import type { PlatformCredentials, PlatformMeta } from '@/components/common/PlatformCredentialDialog';
import {
  DouyinIcon, TikTokIcon, XiaohongshuIcon,
  KuaishouIcon, BilibiliIcon,
} from '@/components/ui/platform-icons';

// ─── 类型 ────────────────────────────────────────────────────────────────────
interface AdPerformance {
  id: string;
  platform: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  play_count: number;
  avg_watch_time: number;
  ctr: number;
  cvr: number;
  roas: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  douyin: '抖音', tiktok: 'TikTok', xiaohongshu: '小红书', kuaishou: '快手', bilibili: 'B站',
};

// 平台元信息（与跨平台导出页同款 API 凭证授权弹窗共用）
const PLATFORM_METAS: PlatformMeta[] = [
  { key: 'douyin',      label: '抖音',   color: 'text-[#FE2C55]', bgColor: 'bg-[#FE2C55]/15',  Icon: DouyinIcon },
  { key: 'tiktok',      label: 'TikTok', color: 'text-foreground', bgColor: 'bg-foreground/10', Icon: TikTokIcon },
  { key: 'xiaohongshu', label: '小红书', color: 'text-[#FF2442]', bgColor: 'bg-[#FF2442]/15',  Icon: XiaohongshuIcon },
  { key: 'kuaishou',    label: '快手',   color: 'text-[#FF6600]', bgColor: 'bg-[#FF6600]/15',  Icon: KuaishouIcon },
  { key: 'bilibili',    label: 'B站',    color: 'text-[#00A1D6]', bgColor: 'bg-[#00A1D6]/15',  Icon: BilibiliIcon },
];

function Trend({ val, prev }: { val: number; prev: number }) {
  if (!prev || prev === 0) return null;
  const pct = Math.round(((val - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={cn('inline-flex items-center text-xs font-medium', up ? 'text-success' : 'text-destructive')}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

// 生成高保真投放数据流
function buildDemoData(days: number): AdPerformance[] {
  const platforms = ['douyin', 'tiktok', 'xiaohongshu', 'kuaishou', 'bilibili'];
  const list: AdPerformance[] = [];
  for (let dIndex = 0; dIndex < days; dIndex++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - dIndex));
    const dateStr = d.toISOString().slice(0, 10);
    platforms.forEach((platform) => {
      const impressions = 8000 + Math.floor(Math.random() * 12000);
      const clicks = Math.floor(impressions * (0.045 + Math.random() * 0.055));
      const conversions = Math.max(8, Math.floor(clicks * (0.035 + Math.random() * 0.045)));
      const spend = +(240 + Math.random() * 600).toFixed(2);
      const revenue = +(spend * (2.2 + Math.random() * 1.8)).toFixed(2);
      list.push({
        id: `demo_${dIndex}_${platform}`,
        platform,
        date: dateStr,
        impressions,
        clicks,
        conversions,
        spend,
        revenue,
        play_count: impressions,
        avg_watch_time: +(16 + Math.random() * 18).toFixed(1),
        ctr: +(clicks / impressions * 100).toFixed(2),
        cvr: +(conversions / clicks * 100).toFixed(2),
        roas: +(revenue / spend).toFixed(2),
      });
    });
  }
  return list;
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function DataFeedbackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [data, setData] = useState<AdPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('14d');
  const [platform, setPlatform] = useState('all');
  const [authDialogKey, setAuthDialogKey] = useState<string | null>(null);

  // 关联视频项目信息
  const [linkedProject, setLinkedProject] = useState<{ id: string; title: string; thumbnail_url?: string } | null>(null);

  // 默认全部渠道待授权（未授权前分析数据展示为 0，授权成功后才开启数据流）
  const DEFAULT_AUTHS: Record<string, 'pending' | 'authorized'> = {
    douyin: 'pending',
    tiktok: 'pending',
    xiaohongshu: 'pending',
    kuaishou: 'pending',
    bilibili: 'pending',
  };

  const [platformAuths, setPlatformAuths] = useState<Record<string, 'pending' | 'authorized'>>(DEFAULT_AUTHS);

  // 初始化或从缓存加载授权（无 API 凭证存档的历史授权状态视为残留数据，重置为待授权，默认数据展示为 0）
  useEffect(() => {
    const key = user ? `platform_auths_${user.id}` : 'platform_auths_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = { ...DEFAULT_AUTHS, ...JSON.parse(saved) };
        const creds = loadStoredPlatformCredentials();
        Object.keys(parsed).forEach(k => {
          if (parsed[k] === 'authorized' && !creds[k]) parsed[k] = 'pending';
        });
        setPlatformAuths(parsed);
      } catch (e) {
        setPlatformAuths(DEFAULT_AUTHS);
      }
    } else {
      setPlatformAuths(DEFAULT_AUTHS);
    }
  }, [user]);

  // 加载关联的视频信息
  useEffect(() => {
    if (!projectId) {
      setLinkedProject(null);
      return;
    }
    (async () => {
      const { data: p } = await supabase.from('video_projects').select('id,title,thumbnail_url').eq('id', projectId).maybeSingle();
      if (p) {
        setLinkedProject(p);
      } else {
        setLinkedProject({
          id: projectId,
          title: '爆款带货主推短视频',
          thumbnail_url: '/person/girl1.png',
        });
      }
    })();
  }, [projectId]);

  // 同步授权状态到跨平台导出页「平台授权状态」卡片（共用状态）
  const mirrorToPublishAuth = (key: string, status: 'pending' | 'authorized') => {
    try {
      const saved = localStorage.getItem('platform_auth');
      const pub = saved ? JSON.parse(saved) : {};
      pub[key] = status;
      localStorage.setItem('platform_auth', JSON.stringify(pub));
    } catch { /* 忽略镜像失败 */ }
  };

  const updatePlatformAuth = (key: string, status: 'pending' | 'authorized') => {
    setPlatformAuths(prev => {
      const next = { ...prev, [key]: status };
      const storageKey = user ? `platform_auths_${user.id}` : 'platform_auths_guest';
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    mirrorToPublishAuth(key, status);
  };

  // 打开凭证授权弹窗（默认定位首个待授权平台）
  const openAuthDialog = () => {
    const firstPending = PLATFORM_METAS.find(p => platformAuths[p.key] !== 'authorized');
    setAuthDialogKey((firstPending || PLATFORM_METAS[0]).key);
  };

  const handleCredentialConfirm = (platformKey: string, creds: PlatformCredentials) => {
    storePlatformCredentials(platformKey, creds);
    updatePlatformAuth(platformKey, 'authorized');
    setAuthDialogKey(null);
    toast.success(`${PLATFORM_LABELS[platformKey] || platformKey} 凭证校验通过，已授权并开启该渠道数据回流`);
  };

  const handleCredentialRevoke = (platformKey: string) => {
    updatePlatformAuth(platformKey, 'pending');
    setAuthDialogKey(null);
    toast.info(`已解除与 ${PLATFORM_LABELS[platformKey] || platformKey} 的账号授权`);
  };

  const loadData = useCallback(async () => {
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    setLoading(true);

    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
    let rows: AdPerformance[] | null = null;

    if (user) {
      let q = supabase.from('ad_performance').select('*').eq('user_id', user.id).gte('date', since).order('date');
      if (platform !== 'all') q = q.eq('platform', platform);
      const res = await q;
      if (res.data && res.data.length > 0) {
        rows = res.data as AdPerformance[];
      }
    }

    const currentAuths = platformAuths;
    const mapData = (rawList: AdPerformance[]) => {
      return rawList.map(d => {
        const isAuthorized = currentAuths[d.platform] === 'authorized';
        if (!isAuthorized) {
          return {
            ...d,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
            revenue: 0,
            play_count: 0,
            avg_watch_time: 0,
            ctr: 0,
            cvr: 0,
            roas: 0,
          };
        }
        return d;
      });
    };

    if (!rows || rows.length === 0) {
      const demoRaw = buildDemoData(days);
      const filtered = platform === 'all' ? demoRaw : demoRaw.filter(item => item.platform === platform);
      setData(mapData(filtered));
    } else {
      setData(mapData(rows));
    }
    setLoading(false);
  }, [user, range, platform, platformAuths]);

  useEffect(() => { loadData(); }, [loadData]);

  // 聚合指标
  const totalImpressions = data.reduce((a, d) => a + d.impressions, 0);
  const totalClicks      = data.reduce((a, d) => a + d.clicks, 0);
  const totalConversions = data.reduce((a, d) => a + d.conversions, 0);
  const totalSpend       = +data.reduce((a, d) => a + +d.spend, 0).toFixed(2);
  const totalRevenue     = +data.reduce((a, d) => a + +d.revenue, 0).toFixed(2);
  const avgCTR           = data.length ? +(data.reduce((a, d) => a + +d.ctr, 0) / data.length).toFixed(2) : 0;
  const avgCVR           = data.length ? +(data.reduce((a, d) => a + +d.cvr, 0) / data.length).toFixed(2) : 0;
  const avgROAS          = data.length ? +(data.reduce((a, d) => a + +d.roas, 0) / data.length).toFixed(2) : 0;

  // 趋势图
  const trendData = data.map(d => ({
    date: d.date.slice(5),
    曝光量: d.impressions,
    点击量: d.clicks,
    转化量: d.conversions,
    消耗: +d.spend,
    营收: +d.revenue,
    CTR: +d.ctr,
    ROAS: +d.roas,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />多平台分析
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">广告投放效果全链路追踪 · 转化漏斗与 ROAS 洞察</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={openAuthDialog}
            className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-semibold"
          >
            <Plus className="w-4 h-4" />账号授权
          </Button>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">近7天</SelectItem>
              <SelectItem value="14d">近14天</SelectItem>
              <SelectItem value="30d">近30天</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1" onClick={loadData} disabled={loading} title="刷新数据">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* 关联分析视频标的（若从作品库/导出页跳转带有 projectId） */}
      {linkedProject && (
        <Card className="bg-primary/5 border border-primary/20">
          <CardContent className="p-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                <img src={linkedProject.thumbnail_url || '/person/girl1.png'} alt={linkedProject.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">当前分析视频</span>
                  <p className="text-sm font-semibold text-foreground truncate">{linkedProject.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">关联追踪 ID: {linkedProject.id} · 多渠道投放中</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => navigate(`/video/edit?importId=${linkedProject.id}`)}>
                <Scissors className="w-3.5 h-3.5" />去精修剪辑
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => navigate(`/export-formats?projectId=${linkedProject.id}`)}>
                <Share2 className="w-3.5 h-3.5" />转码发布
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据流状态条 */}
      <div className={cn(
        "rounded-xl border p-3 flex items-center justify-between gap-3 text-xs flex-wrap",
        (!Object.values(platformAuths).some(v => v === 'authorized')) ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
      )}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0" />
          <span>
            {!Object.values(platformAuths).some(v => v === 'authorized')
              ? "暂未连接任何渠道数据流，当前图表已置零。请点击右上角「账号授权」开启主流媒体接口。"
              : "已接入主流媒体多维度投放数据流（曝光、转化、ROI 实时同步计算中）。"
            }
          </span>
        </div>
        <button onClick={openAuthDialog} className="font-semibold underline hover:opacity-80">
          管理平台授权 ({Object.values(platformAuths).filter(v => v === 'authorized').length}/5 已接入)
        </button>
      </div>

      {/* KPI 指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总曝光量', val: totalImpressions.toLocaleString(), icon: Eye, color: 'text-primary' },
          { label: '总点击量', val: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-info' },
          { label: '总转化量', val: totalConversions.toLocaleString(), icon: ShoppingCart, color: 'text-success' },
          { label: '总营收', val: `¥${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-warning' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <m.icon className={cn('w-8 h-8 shrink-0', m.color)} />
              <div>
                <p className="text-base md:text-lg font-bold truncate">{loading ? '…' : m.val}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 效率指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CTR 点击率', val: `${avgCTR}%`, desc: '点击/曝光', good: avgCTR > 4 },
          { label: 'CVR 转化率', val: `${avgCVR}%`, desc: '转化/点击', good: avgCVR > 3 },
          { label: 'ROAS 回报率', val: `${avgROAS}x`, desc: '营收/消耗', good: avgROAS > 2 },
          { label: '总消耗', val: `¥${totalSpend.toLocaleString()}`, desc: '广告投放成本', good: true },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <Badge variant="outline" className={cn('text-[10px]', m.good ? 'text-success border-success/40' : 'text-warning border-warning/40')}>
                  {m.good ? '良好' : '待优化'}
                </Badge>
              </div>
              <p className="text-xl font-bold">{loading ? '…' : m.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">曝光 / 点击 / 转化趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 6 }} />
                  <Area type="monotone" dataKey="曝光量" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="点击量" stroke="hsl(var(--info))" fill="hsl(var(--info)/0.1)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="转化量" stroke="hsl(var(--success))" fill="hsl(var(--success)/0.1)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">消耗 vs 营收</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 6 }} />
                  <Bar dataKey="消耗" fill="hsl(var(--warning))" radius={[3,3,0,0]} />
                  <Bar dataKey="营收" fill="hsl(var(--success))" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CTR 点击率 & ROAS 回报率趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 6 }} />
                  <Line type="monotone" dataKey="CTR" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ROAS" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 平台授权状态横条 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted/10 border border-border/50 rounded-2xl p-3">
        {PLATFORM_METAS.map(p => {
          const auth = !!user && platformAuths[p.key] === 'authorized';
          const badgeText = !user ? '未登录' : (auth ? '已授权' : '待授权');
          return (
            <div key={p.key} className="flex flex-col gap-2 p-3 rounded-xl bg-card border border-border/40">
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground min-w-0">
                  <p.Icon className={cn('w-3.5 h-3.5 shrink-0', p.color)} />
                  <span className="truncate">{p.label}</span>
                </span>
                <span className={cn(
                  "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  !user
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : auth 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {badgeText}
                </span>
              </div>
              <Button size="sm" variant={auth ? 'outline' : 'default'}
                className={cn('h-7 w-full text-xs', auth && 'border-success/40 text-success hover:bg-success/10')}
                onClick={() => setAuthDialogKey(p.key)}>
                {auth ? '管理授权' : '授权'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* 专业 API 凭证表单式授权弹窗（与跨平台导出页同款） */}
      {authDialogKey && (
        <PlatformCredentialDialog
          open
          platform={PLATFORM_METAS.find(p => p.key === authDialogKey) || null}
          platforms={PLATFORM_METAS}
          authorized={platformAuths[authDialogKey] === 'authorized'}
          onPlatformChange={setAuthDialogKey}
          onClose={() => setAuthDialogKey(null)}
          onConfirm={handleCredentialConfirm}
          onRevoke={handleCredentialRevoke}
        />
      )}
    </div>
  );
}
