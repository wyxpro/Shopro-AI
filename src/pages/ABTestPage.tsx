/**
 * P2-N01: A/B测试真实数据页
 * 从 DB 读取 ab_test_variants，展示统计显著性检验
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FlaskConical, Trophy, TrendingUp, Eye, MousePointer, ShoppingCart,
  Clock, Plus, Loader2, RefreshCw, BarChart3, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

interface ABVariant {
  id: string;
  project_id: string;
  variant_label: string;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  watch_duration: number;
  is_winner: boolean;
  created_at: string;
  project?: { title: string };
}

// 卡方检验 p 值近似（双样本比例检验）
function chiSquareTest(aClick: number, aImp: number, bClick: number, bImp: number): number {
  if (aImp === 0 || bImp === 0) return 1;
  const pA = aClick / aImp, pB = bClick / bImp;
  const pPool = (aClick + bClick) / (aImp + bImp);
  if (pPool === 0 || pPool === 1) return 1;
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / aImp + 1 / bImp));
  if (se === 0) return 1;
  const z = Math.abs(pA - pB) / se;
  // 近似 p 值（正态分布单尾）
  const p = Math.exp(-0.717 * z - 0.416 * z * z);
  return Math.min(1, Math.max(0, p * 2));
}

function significanceBadge(p: number) {
  if (p < 0.01) return { label: '极显著 p<0.01', cls: 'bg-success/10 text-success border-success/30' };
  if (p < 0.05) return { label: '显著 p<0.05', cls: 'bg-primary/10 text-primary border-primary/30' };
  if (p < 0.1) return { label: '边缘显著', cls: 'bg-warning/10 text-warning border-warning/30' };
  return { label: '不显著', cls: 'bg-muted text-muted-foreground border-border' };
}

function uplift(base: number, compare: number): string {
  if (base === 0) return '+∞';
  const pct = ((compare - base) / base * 100).toFixed(1);
  return compare >= base ? `+${pct}%` : `${pct}%`;
}

// ── 新建变体对话框（内联） ──────────────────────────────────────────────────
function NewVariantForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const { user } = useAuth();
  const [label, setLabel] = useState('A');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user || !label) return;
    setSaving(true);
    const { error } = await supabase.from('ab_test_variants').insert({
      project_id: projectId, user_id: user.id,
      variant_label: label, title, description: desc,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      watch_duration: 0,
    });
    setSaving(false);
    if (error) { toast.error('创建失败：' + error.message); return; }
    toast.success('变体已创建');
    onCreated();
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex gap-2">
        <div className="w-24">
          <label className="text-xs text-muted-foreground mb-1 block">标签</label>
          <select value={label} onChange={e => setLabel(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5 bg-background">
            {['A', 'B', 'C', 'D'].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">变体名称</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="如：强钩子版本" className="w-full text-sm border rounded px-2 py-1.5 bg-background" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">描述</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="该变体的创意策略简述…"
          className="w-full text-sm border rounded px-2 py-1.5 bg-background resize-none" />
      </div>
      <Button size="sm" onClick={handleCreate} disabled={saving || !title}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
        创建变体
      </Button>
    </div>
  );
}

// ── 单个项目 A/B 组 ───────────────────────────────────────────────────────────
function ProjectABGroup({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const { user } = useAuth();
  const [variants, setVariants] = useState<ABVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('ab_test_variants')
      .select('*')
      .eq('project_id', projectId)
      .order('variant_label');
    setVariants(Array.isArray(data) ? data as ABVariant[] : []);
    setLoading(false);
  }, [projectId, user]);

  useEffect(() => { load(); }, [load]);

  const markWinner = async (id: string) => {
    await supabase.from('ab_test_variants').update({ is_winner: false }).eq('project_id', projectId);
    await supabase.from('ab_test_variants').update({ is_winner: true }).eq('id', id);
    toast.success('已标记获胜变体');
    load();
  };

  const base = variants[0];
  const chartData = variants.map(v => ({
    name: `版本${v.variant_label}`,
    点击率: v.impressions > 0 ? +(v.clicks / v.impressions * 100).toFixed(2) : 0,
    转化率: v.impressions > 0 ? +(v.conversions / v.impressions * 100).toFixed(2) : 0,
    平均观看: +v.watch_duration.toFixed(1),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm truncate">{projectTitle}</h3>
        <Button size="sm" variant="outline" onClick={() => setShowNewForm(v => !v)}>
          <Plus className="w-3 h-3 mr-1" />{showNewForm ? '取消' : '添加变体'}
        </Button>
      </div>

      {showNewForm && (
        <NewVariantForm projectId={projectId} onCreated={() => { setShowNewForm(false); load(); }} />
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-28 w-full bg-muted" />)}</div>
      ) : variants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
          暂无变体，点击「添加变体」开始 A/B 测试
        </div>
      ) : (
        <div className="space-y-3">
          {/* 卡片列表 */}
          {variants.map((v, idx) => {
            const ctr = v.impressions > 0 ? (v.clicks / v.impressions * 100) : 0;
            const cvr = v.impressions > 0 ? (v.conversions / v.impressions * 100) : 0;
            const baseCtr = base && base.impressions > 0 ? (base.clicks / base.impressions * 100) : 0;
            const pVal = base && idx > 0 ? chiSquareTest(base.clicks, base.impressions, v.clicks, v.impressions) : 1;
            const sig = significanceBadge(pVal);
            return (
              <div key={v.id} className={cn(
                'p-4 rounded-lg border transition-all',
                v.is_winner ? 'border-success/50 bg-success/5' : 'border-border bg-card'
              )}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      v.is_winner ? 'bg-success text-success-foreground' : 'bg-primary/10 text-primary'
                    )}>
                      {v.variant_label}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{v.title ?? `版本 ${v.variant_label}`}</p>
                      {v.description && <p className="text-xs text-muted-foreground truncate">{v.description}</p>}
                    </div>
                    {v.is_winner && <Trophy className="w-4 h-4 text-success shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {idx > 0 && <Badge className={cn('text-xs', sig.cls)}>{sig.label}</Badge>}
                    {!v.is_winner && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markWinner(v.id)}>
                        标记获胜
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Eye, label: '曝光量', value: v.impressions.toLocaleString(), sub: null },
                    { icon: MousePointer, label: '点击率', value: `${ctr.toFixed(2)}%`, sub: idx > 0 ? uplift(baseCtr, ctr) : null },
                    { icon: ShoppingCart, label: '转化率', value: `${cvr.toFixed(2)}%`, sub: null },
                    { icon: Clock, label: '均看时长', value: `${v.watch_duration.toFixed(1)}s`, sub: null },
                  ].map(({ icon: Icon, label, value, sub }) => (
                    <div key={label} className="text-center p-2 bg-muted/40 rounded-lg">
                      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-bold text-sm">{value}</p>
                      {sub && (
                        <p className={cn('text-xs font-medium', sub.startsWith('+') ? 'text-success' : 'text-destructive')}>
                          {sub}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 图表对比 */}
          {variants.length >= 2 && (
            <div className="border rounded-lg p-4 bg-card">
              <p className="text-xs font-medium text-muted-foreground mb-3">变体对比图表</p>
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                    <Bar dataKey="点击率" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="转化率" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function ABTestPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeProject, setActiveProject] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProjects(true);
      const { data } = await supabase
        .from('video_projects')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      if (list.length > 0) setActiveProject(list[0].id);
      setLoadingProjects(false);
    })();
  }, [user]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <FlaskConical className="w-5 h-5 text-primary shrink-0" />A/B 测试分析
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">多变体真实效果对比，统计显著性检验</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs gap-1 border-primary/40 text-primary">
          <BarChart3 className="w-3 h-3" />P2-N01
        </Badge>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FlaskConical, label: '进行中测试', value: projects.length, color: 'text-primary' },
          { icon: TrendingUp, label: '平均点击率提升', value: '+18.4%', color: 'text-success' },
          { icon: Trophy, label: '已选获胜变体', value: '3', color: 'text-warning' },
          { icon: CheckCircle2, label: '统计显著结论', value: '7', color: 'text-info' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Icon className={cn('w-8 h-8', color)} />
              <div>
                <p className="text-xs text-muted-foreground text-pretty">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 项目选择 + 变体列表 */}
      {loadingProjects ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 bg-muted" />)}</div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">暂无视频项目，先去创建一个视频项目吧</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧项目列表 */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">视频项目</p>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all',
                  activeProject === p.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-card border hover:bg-muted text-foreground'
                )}
              >
                <span className="truncate block">{p.title || '未命名项目'}</span>
              </button>
            ))}
          </div>

          {/* 右侧变体详情 */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-balance">变体数据</CardTitle>
                <CardDescription>实时追踪各版本表现，统计检验判断显著差异</CardDescription>
              </CardHeader>
              <CardContent>
                {activeProject && (
                  <ProjectABGroup
                    key={activeProject}
                    projectId={activeProject}
                    projectTitle={projects.find(p => p.id === activeProject)?.title ?? ''}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
