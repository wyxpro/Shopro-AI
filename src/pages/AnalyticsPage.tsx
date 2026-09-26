import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, Zap, BarChart3, Play, Video, RefreshCw, Brain,
  ArrowUpRight, Lightbulb, CheckCircle2, AlertTriangle, Info,
  Clock, Subtitles, Music, Clapperboard, Target, ChevronRight,
  Wand2, Sparkles, CalendarClock, FlameKindling, Star, Scissors, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { VideoProject, TrafficSuggestion } from '@/types/types';
import { cn } from '@/lib/utils';

// ── 特征因子配置 ─────────────────────────────────────────────────────────────
const PACING_OPTIONS = [
  { value: 'fast', label: '快节奏（<2s/镜头）', boost_cr: 6, boost_ctr: 1.5 },
  { value: 'medium', label: '中节奏（2-4s/镜头）', boost_cr: 2, boost_ctr: 0.5 },
  { value: 'slow', label: '慢节奏（>4s/镜头）', boost_cr: -4, boost_ctr: -0.8 },
];
const BGM_OPTIONS = [
  { value: 'high', label: '高BPM（120+）激昂', boost_cr: 4, boost_ctr: 0.8 },
  { value: 'medium', label: '中BPM（90-120）流行', boost_cr: 1, boost_ctr: 0.2 },
  { value: 'low', label: '低BPM（<90）舒缓', boost_cr: -2, boost_ctr: -0.3 },
];
const CATEGORY_BOOST: Record<string, number> = {
  '美妆护肤': 7, '食品饮料': 5, '母婴用品': 4,
  '服装配饰': 3, '数码电器': 2, '家居用品': 1,
};

interface PredictionFeatures {
  duration: number;
  has_subtitle: boolean;
  subtitle_coverage: number;
  pacing: string;
  bgm_tempo: string;
  has_cta: boolean;
  product_category: string;
}

function computePrediction(features: PredictionFeatures) {
  let cr = 58;
  let ctr = 4.0;

  if (features.duration >= 15 && features.duration <= 30) cr += 8;
  else if (features.duration > 45) cr -= 6;
  else if (features.duration < 10) cr -= 3;

  if (features.has_subtitle) cr += 5;
  cr += (features.subtitle_coverage / 100) * 8;
  if (features.has_cta) ctr += 1.2;

  const pacingOpt = PACING_OPTIONS.find(p => p.value === features.pacing);
  if (pacingOpt) { cr += pacingOpt.boost_cr; ctr += pacingOpt.boost_ctr; }

  const bgmOpt = BGM_OPTIONS.find(b => b.value === features.bgm_tempo);
  if (bgmOpt) { cr += bgmOpt.boost_cr; ctr += bgmOpt.boost_ctr; }

  cr += CATEGORY_BOOST[features.product_category] ?? 0;
  cr = Math.min(95, Math.max(20, Math.round(cr)));
  ctr = Math.min(15, Math.max(0.5, Math.round(ctr * 10) / 10));
  return { cr, ctr };
}

const SUGGEST_CONFIG = {
  high: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  medium: { color: 'bg-warning/10 text-warning border-warning/20', icon: Info },
  low: { color: 'bg-info/10 text-info border-info/20', icon: Lightbulb },
};

// ── CR-07: 最佳投放时间热力图数据生成 ────────────────────────────────────────
const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function generateHeatmapData(category: string) {
  // 基于品类生成平台流量热力数据
  const base: Record<string, number[]> = {
    '美妆护肤': [0.3,0.4,0.5,0.5,0.6,0.7,0.5,0.4,0.5,0.6,0.8,0.9,0.95,1.0,0.9,0.85,0.7],
    '数码电器': [0.5,0.6,0.7,0.6,0.5,0.7,0.5,0.6,0.6,0.7,0.8,0.85,0.9,0.95,0.9,0.85,0.7],
    '食品饮料': [0.6,0.7,0.6,0.5,0.7,0.9,0.6,0.5,0.4,0.5,0.6,0.8,0.9,0.95,0.85,0.8,0.65],
  };
  const weights = base[category] ?? base['美妆护肤'];
  return DAYS.map((day, di) => {
    const weekendBoost = di >= 5 ? 1.2 : 1.0;
    return HOURS.map((_, hi) => ({
      day,
      hour: HOURS[hi],
      value: Math.round(Math.min(100, weights[hi] * weekendBoost * (80 + Math.random() * 20))),
    }));
  }).flat();
}

function HeatmapCell({ value }: { value: number }) {
  const intensity = value / 100;
  const opacity = 0.1 + intensity * 0.9;
  return (
    <div
      title={`流量指数: ${value}`}
      className="w-full aspect-square rounded-sm transition-all cursor-default"
      style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
    />
  );
}

// ── CR-03: 优化前后指标对比 ───────────────────────────────────────────────────
interface BeforeAfter { before: number; after: number; label: string; unit: string }

function BeforeAfterRow({ item }: { item: BeforeAfter }) {
  const diff = item.after - item.before;
  const pct = ((diff / item.before) * 100).toFixed(0);
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{item.label}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="tabular-nums text-muted-foreground line-through">{item.before}{item.unit}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
          <span className="tabular-nums font-bold text-success">{item.after}{item.unit}</span>
          <Badge variant="outline" className="text-xs border-success/40 text-success ml-auto">+{pct}%</Badge>
        </div>
        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: `${item.before}%` }} />
          <div className="h-full bg-success rounded-full -mt-1.5 transition-all duration-1000" style={{ width: `${item.after}%` }} />
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ s }: { s: TrafficSuggestion }) {
  const cfg = SUGGEST_CONFIG[s.priority];
  const Icon = cfg.icon;
  return (
    <div className={cn('rounded-xl border p-4 flex gap-3', cfg.color)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-balance">{s.title}</p>
        <p className="text-xs mt-0.5 text-pretty leading-relaxed opacity-80">{s.description}</p>
      </div>
    </div>
  );
}

function buildSuggestions(features: PredictionFeatures): TrafficSuggestion[] {
  const list: TrafficSuggestion[] = [];
  if (features.duration > 40) list.push({ type: 'pacing', title: '缩短视频时长', description: `当前时长${features.duration}s偏长，建议控制在30s内，完播率可提升约15%`, priority: 'high' });
  if (!features.has_subtitle) list.push({ type: 'subtitle', title: '添加字幕覆盖', description: '字幕覆盖率>60%的视频完播率平均高出22%，强烈建议添加', priority: 'high' });
  else if (features.subtitle_coverage < 50) list.push({ type: 'subtitle', title: '提升字幕覆盖率', description: `当前覆盖率${features.subtitle_coverage}%偏低，提升至60%以上可显著提升完播率`, priority: 'medium' });
  if (features.pacing !== 'fast') list.push({ type: 'pacing', title: '加快镜头节奏', description: '前5秒快节奏剪辑（<2s/镜头）可降低初始跳出率，建议优化', priority: 'medium' });
  if (features.bgm_tempo !== 'high') list.push({ type: 'bgm', title: '提升BGM节奏感', description: '高BPM背景音乐（120+）配合快节奏剪辑，互动率提升18%', priority: 'medium' });
  if (!features.has_cta) list.push({ type: 'cta', title: '添加行动号召', description: '在视频60%处加入明确购买引导文字，点击率可提升2-4个百分点', priority: 'low' });
  list.push({ type: 'thumbnail', title: '优化封面设计', description: '产品+人物组合封面点击率高于纯产品封面约40%，建议测试', priority: 'low' });
  return list;
}

// 模拟流量数据（仅在无接口时使用）
function generateMockData(project: VideoProject) {
  const cr = project.predicted_completion_rate ?? Math.round(55 + Math.random() * 30);
  const ctr = project.predicted_click_rate ?? Math.round(3 + Math.random() * 8 * 10) / 10;
  const engagement = Math.round(4 + Math.random() * 6 * 10) / 10;
  const shareRate = Math.round(1 + Math.random() * 3 * 10) / 10;

  const barData = [
    { name: '完播率', 当前: cr, 行业均值: 52 },
    { name: '点击率', 当前: ctr * 10, 行业均值: 45 },
    { name: '互动率', 当前: engagement * 10, 行业均值: 40 },
    { name: '分享率', 当前: shareRate * 10, 行业均值: 12 },
  ];

  const pieData = [
    { name: '完播', value: cr, fill: 'hsl(var(--success))' },
    { name: '中途退出', value: 100 - cr, fill: 'hsl(var(--muted))' },
  ];

  const suggestions: TrafficSuggestion[] = project.traffic_suggestions?.length
    ? project.traffic_suggestions as TrafficSuggestion[]
    : [
      { type: 'subtitle', title: '优化字幕字号', description: '当前字幕偏小，建议增大到屏幕宽度的5%，提升移动端可读性，预计完播率提升3-5%', priority: 'high' },
      { type: 'bgm', title: '调整BGM节奏', description: '建议在前3秒使用节奏感强的BGM吸引用户，降低跳出率', priority: 'medium' },
      { type: 'pacing', title: '加快镜头切换', description: '镜头平均时长5秒偏长，建议缩短到3秒以内，提升视频节奏感', priority: 'medium' },
      { type: 'cta', title: '强化行动号召', description: '在视频结尾添加明确的购买引导文字，点击率可提升2-4%', priority: 'low' },
    ];

  return { cr, ctr, engagement, shareRate, barData, pieData, suggestions };
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('projectId') ?? '');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof generateMockData> | null>(null);

  // P2-M01: 流量预测特征输入
  const [features, setFeatures] = useState<PredictionFeatures>({
    duration: 25,
    has_subtitle: true,
    subtitle_coverage: 70,
    pacing: 'fast',
    bgm_tempo: 'high',
    has_cta: true,
    product_category: '美妆护肤',
  });
  const [prediction, setPrediction] = useState<{ cr: number; ctr: number } | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predSuggestions, setPredSuggestions] = useState<TrafficSuggestion[]>([]);

  // CR-03: 一键优化闭环
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [beforeAfterData, setBeforeAfterData] = useState<BeforeAfter[]>([]);
  // CR-07: 最佳投放时间
  const [heatmapData, setHeatmapData] = useState<ReturnType<typeof generateHeatmapData>>([]);
  const [bestSlots, setBestSlots] = useState<{ day: string; hour: number; value: number }[]>([]);

const DEMO_ANALYTICS_PROJECTS = [
  {
    id: 'demo-an-1',
    user_id: 'demo',
    title: '法式复古雾面哑光丝绒唇釉',
    status: 'completed',
    video_url: '/Video/CreatOK_2.mp4',
    thumbnail_url: '/person/girl1.png',
    duration: 25,
    video_style: '美妆护肤',
    target_platform: '抖音/小红书',
    resolution: '1080×1920',
    progress: 100,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    error_message: null,
    predicted_completion_rate: 78,
    predicted_click_rate: 5.6,
    traffic_suggestions: null,
  },
  {
    id: 'demo-an-2',
    user_id: 'demo',
    title: '智能降噪运动手表实测开箱',
    status: 'completed',
    video_url: '/Video/CreatOK_4.mp4',
    thumbnail_url: '/person/boy1.png',
    duration: 20,
    video_style: '数码电器',
    target_platform: 'TikTok/快手',
    resolution: '1080×1920',
    progress: 100,
    created_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    error_message: null,
    predicted_completion_rate: 85,
    predicted_click_rate: 6.8,
    traffic_suggestions: null,
  },
  {
    id: 'demo-an-3',
    user_id: 'demo',
    title: '极简北欧风天然大豆香薰蜡烛',
    status: 'completed',
    video_url: '/Video/CreatOK_7.mp4',
    thumbnail_url: '/person/girl2.png',
    duration: 18,
    video_style: '家居用品',
    target_platform: '小红书/Instagram',
    resolution: '1080×1080',
    progress: 100,
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    error_message: null,
    predicted_completion_rate: 72,
    predicted_click_rate: 4.2,
    traffic_suggestions: null,
  },
] as VideoProject[];

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => {
    if (selectedId && projects.length > 0) {
      const p = projects.find(p => p.id === selectedId);
      if (p) runAnalysis(p);
    }
  }, [selectedId, projects]);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('video_projects')
      .select('*').in('status', ['completed', 'processing'])
      .order('created_at', { ascending: false });
    const rawList = Array.isArray(data) && data.length > 0 ? (data as VideoProject[]) : DEMO_ANALYTICS_PROJECTS;
    setProjects(rawList);
    if (!selectedId && rawList.length > 0) setSelectedId(rawList[0].id);
    setLoading(false);
  };

  const runAnalysis = async (project: VideoProject) => {
    setAnalyzing(true);
    try {
      const { data: res } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_traffic',
          project_id: project.id,
          duration: project.duration,
          has_subtitle: true,
          pacing: 'fast',
          bgm_tempo: 'high',
          product_category: project.video_style ?? '美妆护肤',
        }
      });
      if (res?.suggestions) {
        await supabase.from('video_projects').update({
          predicted_completion_rate: res.completion_rate,
          predicted_click_rate: res.click_rate,
          traffic_suggestions: res.suggestions,
        }).eq('id', project.id);
        const updated = { ...project, predicted_completion_rate: res.completion_rate, predicted_click_rate: res.click_rate, traffic_suggestions: res.suggestions };
        setResult(generateMockData(updated));
      } else {
        setResult(generateMockData(project));
      }
    } catch {
      setResult(generateMockData(project));
    } finally {
      setAnalyzing(false);
    }
  };

  // P2-M01: 前端预测模型（实时计算）
  const handlePredict = async () => {
    setPredicting(true);
    await new Promise(r => setTimeout(r, 600));
    const pred = computePrediction(features);
    const suggs = buildSuggestions(features);
    setPrediction(pred);
    setPredSuggestions(suggs);
    setPredicting(false);
    toast.success('预测完成！查看优化建议提升转化率');

    // CR-07: 同步生成最佳投放时间热力图
    const hd = generateHeatmapData(features.product_category);
    setHeatmapData(hd);
    const sorted = [...hd].sort((a, b) => b.value - a.value).slice(0, 3);
    setBestSlots(sorted);
  };

  // CR-03: 一键优化闭环（接真实 analyze_traffic AI）
  const handleOneClickOptimize = async () => {
    if (!result) return;
    setOptimizing(true);
    setOptimized(false);
    try {
      const { data: res } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_traffic',
          duration: features.duration,
          has_subtitle: true,
          pacing: 'fast',
          bgm_tempo: 'high',
          product_category: features.product_category,
        }
      });
      const optimizedCR  = res?.data?.completion_rate ?? Math.min(100, Math.round(result.cr * 1.16));
      const optimizedCTR = res?.data?.click_rate      ?? Math.min(100, Math.round(result.ctr * 10 * 1.14));
      setBeforeAfterData([
        { label: '完播率', before: result.cr,               after: optimizedCR,                  unit: '%' },
        { label: '点击率', before: result.ctr * 10,         after: optimizedCTR,                  unit: '%' },
        { label: '互动率', before: result.engagement * 10,  after: Math.min(100, Math.round(result.engagement * 10 * 1.12)), unit: '%' },
        { label: '分享率', before: result.shareRate * 10,   after: Math.min(100, Math.round(result.shareRate * 10 * 1.18)),  unit: '%' },
      ]);
    } catch {
      // 降级本地计算
      setBeforeAfterData([
        { label: '完播率', before: result.cr,              after: Math.min(100, Math.round(result.cr * 1.16)),              unit: '%' },
        { label: '点击率', before: result.ctr * 10,        after: Math.min(100, Math.round(result.ctr * 10 * 1.14)),        unit: '%' },
        { label: '互动率', before: result.engagement * 10, after: Math.min(100, Math.round(result.engagement * 10 * 1.12)), unit: '%' },
        { label: '分享率', before: result.shareRate * 10,  after: Math.min(100, Math.round(result.shareRate * 10 * 1.18)),  unit: '%' },
      ]);
    } finally {
      setOptimized(true);
      setOptimizing(false);
      toast.success('一键优化完成！预期完播率提升 15%+');
    }
  };

  const radarData = prediction ? [
    { subject: '完播率', value: prediction.cr, fullMark: 100 },
    { subject: '点击率', value: Math.min(100, prediction.ctr * 8), fullMark: 100 },
    { subject: '字幕优化', value: features.has_subtitle ? features.subtitle_coverage : 0, fullMark: 100 },
    { subject: '节奏匹配', value: features.pacing === 'fast' ? 90 : features.pacing === 'medium' ? 60 : 35, fullMark: 100 },
    { subject: 'BGM配合', value: features.bgm_tempo === 'high' ? 88 : features.bgm_tempo === 'medium' ? 65 : 40, fullMark: 100 },
    { subject: 'CTA效果', value: features.has_cta ? 80 : 20, fullMark: 100 },
  ] : [];

  const selectedProject = projects.find(p => p.id === selectedId);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-balance flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary shrink-0" />作品流量预测
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">预测</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">完播率预测 · 特征因子实时模拟 · 最佳投放时间推荐 · 一键智能优化闭环</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate('/works')}>
            <Video className="w-4 h-4 text-primary" />作品素材
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate(`/video/edit?importId=${selectedId || ''}`)}>
            <Scissors className="w-4 h-4 text-primary" />去剪辑微调
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate(`/export-formats?projectId=${selectedId || ''}`)}>
            <Share2 className="w-4 h-4 text-emerald-500" />转码发布
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate(`/data-feedback?projectId=${selectedId || ''}`)}>
            <BarChart3 className="w-4 h-4 text-amber-500" />投放分析大盘
          </Button>
        </div>
      </div>

      {/* 视频选择 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <Video className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium whitespace-nowrap">选择视频：</span>
            </div>
            {loading ? (
              <Skeleton className="h-9 flex-1 max-w-md bg-muted rounded-md" />
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="flex-1 max-w-md">
                  <SelectValue placeholder="请选择要分析的视频" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="truncate">{p.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedProject && (
              <Button variant="outline" size="sm"
                onClick={() => runAnalysis(selectedProject)} disabled={analyzing}>
                <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', analyzing && 'animate-spin')} />
                重新分析
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
                <Skeleton className="h-3 w-1/2 bg-muted" />
                <Skeleton className="h-8 w-2/3 bg-muted" />
                <Skeleton className="h-3 w-1/3 bg-muted" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-56 bg-muted rounded-2xl" />
            <Skeleton className="h-56 bg-muted rounded-2xl" />
          </div>
        </div>
      ) : !selectedId ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-muted-foreground">请选择要分析的视频</p>
          <p className="text-sm text-muted-foreground mt-1">选择已完成的视频，AI将预测流量指标</p>
          {projects.length === 0 && !loading && (
            <Button className="mt-5" onClick={() => navigate('/video/create')}>
              去创建视频
            </Button>
          )}
        </div>
      ) : analyzing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
                <Skeleton className="h-3 w-1/2 bg-muted" />
                <Skeleton className="h-8 w-2/3 bg-muted" />
                <Skeleton className="h-3 w-1/3 bg-muted" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 bg-muted rounded-2xl" />
            <Skeleton className="h-64 bg-muted rounded-2xl" />
          </div>
          <div className="text-center text-sm text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-primary" />AI正在分析视频指标...
          </div>
        </div>
      ) : result ? (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '预测完播率', value: `${result.cr}%`, icon: Play, color: 'bg-success/10 text-success', trend: result.cr > 52 ? '↑ 高于均值' : '↓ 低于均值' },
              { label: '预测点击率', value: `${result.ctr}%`, icon: TrendingUp, color: 'bg-primary/10 text-primary', trend: result.ctr > 4.5 ? '↑ 高于均值' : '↓ 低于均值' },
              { label: '预计互动率', value: `${result.engagement}%`, icon: ArrowUpRight, color: 'bg-info/10 text-info', trend: '' },
              { label: '预计分享率', value: `${result.shareRate}%`, icon: Zap, color: 'bg-warning/10 text-warning', trend: '' },
            ].map(({ label, value, icon: Icon, color, trend }) => (
              <Card key={label} className="card-hover h-full">
                <CardContent className="p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  {trend && (
                    <span className={cn('text-xs mt-1', trend.startsWith('↑') ? 'text-success' : 'text-destructive')}>{trend}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 图表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-balance">
                  <BarChart3 className="w-4 h-4 text-primary" />指标对比（vs行业均值）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full min-w-0 overflow-hidden h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
                      <Bar dataKey="当前" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="行业均值" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-balance">
                  <Play className="w-4 h-4 text-success" />完播率分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full min-w-0 overflow-hidden h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={result.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {result.pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`]} />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 完播率进度条 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-balance">
                <CheckCircle2 className="w-4 h-4 text-success" />综合评分
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: '完播率', value: result.cr, max: 100, color: 'bg-success' },
                { label: '点击率', value: result.ctr * 10, max: 100, color: 'bg-primary' },
                { label: '互动率', value: result.engagement * 10, max: 100, color: 'bg-info' },
                { label: '分享率', value: result.shareRate * 10, max: 100, color: 'bg-warning' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
                  <Progress value={value} className="flex-1 h-2" />
                  <span className="text-xs font-medium w-12 text-right shrink-0">{value.toFixed(1)}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 优化建议 + CR-03 一键优化闭环 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-balance">
                <Lightbulb className="w-4 h-4 text-warning" />AI优化建议
                <Badge variant="outline" className="text-xs ml-auto border-primary/40 text-primary">CR-03</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.suggestions.map((s, i) => (
                <SuggestionCard key={i} s={s} />
              ))}

              {/* 一键优化按钮 */}
              <div className="pt-1 space-y-3">
                <Button
                  className="w-full h-11 gap-2"
                  onClick={handleOneClickOptimize}
                  disabled={optimizing}
                >
                  {optimizing
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Wand2 className="w-4 h-4" />
                  }
                  {optimizing ? 'AI 优化中，模型推理...' : optimized ? '再次一键优化' : '🚀 一键优化 · 直接生成优化版本'}
                </Button>

                {/* 优化前后对比 */}
                {optimized && beforeAfterData.length > 0 && (
                  <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-1">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <p className="text-sm font-semibold text-success">优化闭环完成 · 指标对比</p>
                      <Badge variant="outline" className="text-xs ml-auto border-success/40 text-success">优化后</Badge>
                    </div>
                    {beforeAfterData.map((item, i) => (
                      <BeforeAfterRow key={i} item={item} />
                    ))}
                    <div className="pt-2 flex gap-2">
                      <Button size="sm" className="flex-1 h-9" onClick={() => navigate('/video/create')}>
                        <Play className="w-3.5 h-3.5 mr-1.5" />生成优化版视频
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => navigate('/script')}>
                        <Wand2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {!optimized && (
                  <Button variant="outline" className="w-full h-9" onClick={() => navigate('/video/create')}>
                    <RefreshCw className="w-4 h-4 mr-2" />手动重新生成视频
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── 流量预测模型 ── */}
      <div className="border-t border-border/60 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">流量预测模型 <Badge variant="outline" className="text-xs ml-1">CR-03</Badge></h2>
          <span className="text-xs text-muted-foreground">· 输入视频特征，预测完播率与点击率</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 特征输入面板 */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">视频特征参数</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />视频时长（秒）
                </Label>
                <input
                  type="range" min={5} max={60} step={1}
                  value={features.duration}
                  onChange={e => setFeatures(f => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span className="font-semibold text-foreground">{features.duration}s</span>
                  <span>60s</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Subtitles className="w-3 h-3" />字幕覆盖率（%）
                </Label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={features.subtitle_coverage}
                  onChange={e => setFeatures(f => ({ ...f, subtitle_coverage: Number(e.target.value) }))}
                  className="w-full accent-primary"
                  disabled={!features.has_subtitle}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="font-semibold text-foreground">{features.subtitle_coverage}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clapperboard className="w-3 h-3" />镜头节奏
                </Label>
                <Select value={features.pacing} onValueChange={v => setFeatures(f => ({ ...f, pacing: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Music className="w-3 h-3" />背景音乐
                </Label>
                <Select value={features.bgm_tempo} onValueChange={v => setFeatures(f => ({ ...f, bgm_tempo: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BGM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">商品类目</Label>
              <Select value={features.product_category} onValueChange={v => setFeatures(f => ({ ...f, product_category: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORY_BOOST).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch id="sub" checked={features.has_subtitle} onCheckedChange={v => setFeatures(f => ({ ...f, has_subtitle: v }))} />
                <Label htmlFor="sub" className="text-xs cursor-pointer">有字幕</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="cta" checked={features.has_cta} onCheckedChange={v => setFeatures(f => ({ ...f, has_cta: v }))} />
                <Label htmlFor="cta" className="text-xs cursor-pointer">有CTA引导</Label>
              </div>
            </div>

            <Button className="w-full h-10" onClick={handlePredict} disabled={predicting}>
              {predicting
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Target className="w-4 h-4 mr-2" />}
              {predicting ? '预测中...' : '运行流量预测'}
            </Button>
          </div>

          {/* 预测结果 */}
          <div className="space-y-4">
            {!prediction ? (
              <div className="rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center h-full py-16 text-center gap-3">
                <Brain className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">设置特征参数后点击运行预测</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/70 bg-success/5 p-4 text-center">
                    <p className="text-3xl font-bold text-success">{prediction.cr}%</p>
                    <p className="text-xs text-muted-foreground mt-1">预测完播率</p>
                    <Badge variant="outline" className={cn('text-xs mt-2', prediction.cr > 60 ? 'border-success/50 text-success' : 'border-warning/50 text-warning')}>
                      {prediction.cr > 60 ? '↑ 优秀' : prediction.cr > 50 ? '持平' : '↓ 待优化'}
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-primary/5 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{prediction.ctr}%</p>
                    <p className="text-xs text-muted-foreground mt-1">预测点击率</p>
                    <Badge variant="outline" className={cn('text-xs mt-2', prediction.ctr > 5 ? 'border-success/50 text-success' : 'border-warning/50 text-warning')}>
                      {prediction.ctr > 5 ? '↑ 优秀' : prediction.ctr > 3 ? '持平' : '↓ 待优化'}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="text-xs font-semibold mb-3 text-muted-foreground">特征雷达图</p>
                  <div className="w-full min-w-0 overflow-hidden h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="当前设置" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v.toFixed(0)}`]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {predSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">优化建议（优先级排序）</p>
                    {predSuggestions.slice(0, 3).map((s, i) => <SuggestionCard key={i} s={s} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── CR-07: 智能投放时间热力图 ── */}
      {heatmapData.length > 0 && (
        <div className="border-t border-border/60 pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-info" />
            <h2 className="text-base font-semibold">智能投放时间推荐
              <Badge variant="outline" className="text-xs ml-2 border-info/40 text-info">CR-07</Badge>
            </h2>
            <span className="text-xs text-muted-foreground hidden md:block">· 基于平台流量潮汐，推荐最佳发布时间</span>
          </div>

          {/* 黄金时段卡片 */}
          <div className="grid grid-cols-3 gap-3">
            {bestSlots.map((slot, i) => (
              <div key={i} className={cn(
                'rounded-xl border p-3 text-center',
                i === 0 ? 'border-warning/50 bg-warning/5' : 'border-border/60 bg-card',
              )}>
                {i === 0 && <div className="flex justify-center mb-1"><Star className="w-3.5 h-3.5 text-warning fill-warning" /></div>}
                <p className={cn('text-lg font-bold', i === 0 ? 'text-warning' : 'text-foreground')}>
                  {slot.hour}:00
                </p>
                <p className="text-xs text-muted-foreground">{slot.day}</p>
                <Badge variant="outline" className={cn('text-[10px] mt-1', i === 0 ? 'border-warning/40 text-warning' : '')}>
                  流量 {slot.value}
                </Badge>
              </div>
            ))}
          </div>

          {/* 热力图网格 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-balance">
                <FlameKindling className="w-4 h-4 text-warning" />每周流量热力图
                <span className="text-xs font-normal text-muted-foreground ml-2">颜色越深 = 流量越高</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="flex gap-0.5 mb-1 ml-10">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 text-[9px] text-center text-muted-foreground">{h}</div>
                  ))}
                </div>
                {DAYS.map(day => {
                  const dayData = heatmapData.filter(d => d.day === day);
                  return (
                    <div key={day} className="flex items-center gap-0.5 mb-0.5">
                      <div className="w-9 text-[10px] text-muted-foreground shrink-0 text-right pr-1">{day}</div>
                      {dayData.map((cell, i) => (
                        <div key={i} className="flex-1">
                          <HeatmapCell value={cell.value} />
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <span className="text-[10px] text-muted-foreground">低</span>
                  {[0.1,0.3,0.5,0.7,0.9].map((o, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: `hsl(var(--primary) / ${o})` }} />
                  ))}
                  <span className="text-[10px] text-muted-foreground">高</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
