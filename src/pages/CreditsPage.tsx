import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plan, UserPlan, CreditLog } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CreditCard, Zap, Star, Building2, CheckCircle2, ArrowUpCircle,
  Loader2, TrendingDown, TrendingUp, AlertCircle, Calendar,
  PackagePlus, Wallet, ClipboardList, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PaymentDialog from '@/components/common/PaymentDialog';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import InvitePage from '@/pages/InvitePage';

// ── 常量 ──────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  video_generate:   { label: '视频生成',   cls: 'bg-primary/10 text-primary' },
  template_download:{ label: '模板下载',   cls: 'bg-info/10 text-info' },
  material_upload:  { label: '素材上传',   cls: 'bg-warning/10 text-warning' },
  purchase:         { label: '套餐购买',   cls: 'bg-success/10 text-success' },
  plan_purchase:    { label: '套餐开通',   cls: 'bg-success/10 text-success' },
  booster_purchase: { label: '加油包购买', cls: 'bg-success/10 text-success' },
  refund:           { label: '退款',       cls: 'bg-success/10 text-success' },
  bonus:            { label: '赠送积分',   cls: 'bg-success/10 text-success' },
  deduct:           { label: '扣除',       cls: 'bg-destructive/10 text-destructive' },
};

const PLAN_ICONS = [Zap, Star, ArrowUpCircle, Building2];
const PLAN_COLORS = [
  'border-border',
  'border-info/50 bg-info/5',
  'border-primary/60 bg-primary/5',
  'border-warning/50 bg-warning/5',
];

// ── 格式化时间 ────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  try { return format(new Date(d), 'MM-dd HH:mm', { locale: zhCN }); } catch { return d; }
}

// ── 套餐卡片 ─────────────────────────────────────────────────────────────
function PlanCard({ plan, isCurrent, onSelect, idx }: {
  plan: Plan; isCurrent: boolean; onSelect: (p: Plan) => void; idx: number;
}) {
  const Icon = PLAN_ICONS[idx % 4];
  const colorCls = PLAN_COLORS[idx % 4];
  return (
    <Card className={cn('h-full flex flex-col relative overflow-hidden border-2 transition-all hover:-translate-y-1 hover:shadow-lg',
      isCurrent ? 'border-primary shadow-md' : colorCls,
      plan.is_popular && !isCurrent && 'border-primary/60'
    )}>
      {plan.is_popular && (
        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-1 font-semibold tracking-wider">
          🔥 最受欢迎
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-3 right-3">
          <Badge variant="default" className="text-xs bg-success text-success-foreground hover:bg-success">当前生效</Badge>
        </div>
      )}
      <CardHeader className={cn('pb-4', plan.is_popular && 'pt-8')}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
              isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              <Icon className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 pb-4">
        <div className="mb-6">
          <div className="flex items-end gap-1">
            {plan.price === 0
              ? <span className="text-4xl font-extrabold tracking-tight">免费</span>
              : <>
                  <span className="text-2xl font-semibold text-muted-foreground pb-1">¥</span>
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-base font-normal text-muted-foreground pb-1">/月</span>
                </>
            }
          </div>
          <p className="text-sm font-medium text-primary mt-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 每月 {plan.credits.toLocaleString()} 积分</p>
        </div>

        <div className="space-y-3 flex-1 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">核心权益</p>
          <ul className="space-y-2.5">
            {(plan.features as string[]).map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="pt-0 mt-auto">
        <Button
          className={cn('w-full h-11 font-semibold rounded-lg', isCurrent ? 'opacity-60 cursor-not-allowed' : '')}
          variant={isCurrent ? 'outline' : plan.is_popular ? 'default' : 'secondary'}
          disabled={isCurrent}
          onClick={() => !isCurrent && onSelect(plan)}
        >
          {isCurrent ? '当前使用中' : plan.price === 0 ? '降级至免费版' : '立即升级'}
        </Button>
      </CardFooter>
    </Card>
  );
}

const MOCK_LOGS: CreditLog[] = [
  {
    id: 'mock-1',
    user_id: 'mock-user',
    type: 'bonus',
    amount: 100,
    credits_after: 100,
    description: '新用户注册，系统赠送免费版初始积分',
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-2',
    user_id: 'mock-user',
    type: 'material_upload',
    amount: 10,
    credits_after: 110,
    description: '完成首次头像及个人资料完善奖励',
    created_at: new Date(Date.now() - 1.5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-3',
    user_id: 'mock-user',
    type: 'video_generate',
    amount: -10,
    credits_after: 100,
    description: '生成智能带货视频《智能空气炸锅宣传片V1》',
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-4',
    user_id: 'mock-user',
    type: 'template_download',
    amount: -5,
    credits_after: 95,
    description: '下载《爆款服装带货转场模板》',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-5',
    user_id: 'mock-user',
    type: 'material_upload',
    amount: 5,
    credits_after: 100,
    description: '上传商超果蔬背景空镜素材奖励',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  }
];

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function CreditsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const initialTab = query.get('tab') || 'plans';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('tab');
    if (t && ['plans', 'overview', 'invite', 'logs'].includes(t)) {
      setActiveTab(t);
    }
  }, [window.location.search]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    navigate(`/credits?tab=${val}`, { replace: true });
  };

  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [boosters, setBoosters] = useState<Plan[]>([]);
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logType, setLogType] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const isMockLogs = logs.length === 0;
  const displayLogs = isMockLogs
    ? MOCK_LOGS.filter(log => logType === 'all' || log.type === logType)
    : logs;

  // 支付相关
  const [payOpen, setPayOpen] = useState(false);
  const [payingObj, setPayingObj] = useState<Plan | null>(null);
  const [payStatus, setPayStatus] = useState<'idle'|'creating'|'polling'|'success'|'error'>('idle');
  const [payUrl, setPayUrl] = useState('');
  const [payOrderNo, setPayOrderNo] = useState('');

  // 加载套餐
  const loadPlan = useCallback(async () => {
    if (!user) return;
    setLoadingPlan(true);
    try {
      const [{ data: upData }, { data: plData }] = await Promise.all([
        supabase.from('user_plans').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('plans').select('*').order('level', { ascending: true }),
      ]);
      const pl = Array.isArray(plData) ? plData : [];
      setPlans(pl.filter(p => p.level >= 0));
      setBoosters(pl.filter(p => p.level < 0));
      if (upData) {
        const plan = pl.find(p => p.id === upData.plan_id);
        setUserPlan({ ...upData, plan });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  }, [user]);

  // 加载积分记录
  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      let q = supabase
        .from('credit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (logType !== 'all') q = q.eq('type', logType);
      const { data } = await q;
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, [user, logType, page]);

  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    const handleChanged = () => { loadPlan(); loadLogs(); };
    window.addEventListener('credits_changed', handleChanged);
    return () => window.removeEventListener('credits_changed', handleChanged);
  }, [loadPlan, loadLogs]);


  // 轮询订单状态
  useEffect(() => {
    let timer: any;
    if (payStatus === 'polling' && payOrderNo) {
      timer = setInterval(async () => {
        const { data } = await supabase.from('orders').select('status').eq('order_no', payOrderNo).maybeSingle();
        if (data?.status === 'paid') {
          setPayStatus('success');
          toast.success('支付成功！');
          loadPlan();
          loadLogs();
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [payStatus, payOrderNo, loadPlan, loadLogs]);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayPkg, setSelectedPayPkg] = useState({ name: '专业版', price: '299', credits: '1000' });

  const handleSelectPlan = (plan: Plan | any) => {
    if (plan.price === 0) {
      toast.info('您当前已在享有体验权益');
      return;
    }
    setSelectedPayPkg({
      name: plan.name,
      price: String(plan.price),
      credits: String(plan.credits || '500'),
    });
    setPayModalOpen(true);
  };

  // 积分使用率
  const usagePercent = userPlan?.plan
    ? Math.min(100, Math.round((userPlan.credits_used / Math.max(userPlan.plan.credits, 1)) * 100))
    : 0;
  // TODO: Fix the formula? user_plans now uses credits_total and credits_used.
  const creditsLeft = userPlan ? userPlan.credits_total - userPlan.credits_used : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
          <CreditCard className="w-5 h-5 text-primary" />积分与套餐
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理您的套餐订阅和积分使用情况</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full max-w-5xl bg-transparent h-auto p-0 mb-6">
          <TabsTrigger
            value="invite"
            className="h-12 rounded-full font-semibold text-xs sm:text-sm md:text-base px-2 sm:px-4 transition-all duration-300 gap-1.5 sm:gap-2 flex items-center justify-center border
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFB706] data-[state=active]:to-[#FF5E03] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 data-[state=active]:border-transparent
              data-[state=inactive]:bg-orange-50/40 data-[state=inactive]:text-orange-950/80 data-[state=inactive]:border-orange-100/60 data-[state=inactive]:hover:bg-orange-50"
          >
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-500 data-[state=active]:text-white" />
            <span className="truncate">邀请有礼 · 赚取积分</span>
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            id="tab-plans"
            className="h-12 rounded-full font-semibold text-xs sm:text-sm md:text-base px-2 sm:px-4 transition-all duration-300 gap-1.5 sm:gap-2 flex items-center justify-center border
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFB706] data-[state=active]:to-[#FF5E03] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 data-[state=active]:border-transparent
              data-[state=inactive]:bg-orange-50/40 data-[state=inactive]:text-orange-950/80 data-[state=inactive]:border-orange-100/60 data-[state=inactive]:hover:bg-orange-50"
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">套餐对比 · 尊享特权</span>
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className="h-12 rounded-full font-semibold text-xs sm:text-sm md:text-base px-2 sm:px-4 transition-all duration-300 gap-1.5 sm:gap-2 flex items-center justify-center border
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFB706] data-[state=active]:to-[#FF5E03] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 data-[state=active]:border-transparent
              data-[state=inactive]:bg-orange-50/40 data-[state=inactive]:text-orange-950/80 data-[state=inactive]:border-orange-100/60 data-[state=inactive]:hover:bg-orange-50"
          >
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">套餐概览 · 我的资产</span>
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="h-12 rounded-full font-semibold text-xs sm:text-sm md:text-base px-2 sm:px-4 transition-all duration-300 gap-1.5 sm:gap-2 flex items-center justify-center border
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFB706] data-[state=active]:to-[#FF5E03] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 data-[state=active]:border-transparent
              data-[state=inactive]:bg-orange-50/40 data-[state=inactive]:text-orange-950/80 data-[state=inactive]:border-orange-100/60 data-[state=inactive]:hover:bg-orange-50"
          >
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">积分记录 · 收支明细</span>
          </TabsTrigger>
        </TabsList>

        {/* ── 概览 Tab ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {loadingPlan ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : !userPlan ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">暂无套餐信息</p>
            </div>
          ) : (
            <>
              {/* 当前套餐卡片 */}
              <Card className="border-primary/30 bg-primary/5/30 overflow-hidden shadow-none">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* 第一行：标题 + 套餐状态 & 升级套餐按钮 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base">当前套餐：{userPlan.plan?.name ?? '未知套餐'}</span>
                          <Badge className="text-[10px] px-1.5 py-0 bg-success/20 text-success hover:bg-success/20 border-none shrink-0">{userPlan.status === 'active' ? '生效中' : '已过期'}</Badge>
                        </div>
                        {/* 周期信息小字 */}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          计费周期：{format(new Date(userPlan.cycle_start), 'yyyy/MM/dd')} ~ {format(new Date(userPlan.cycle_end), 'yyyy/MM/dd')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => document.getElementById('tab-plans')?.click()} className="h-8 text-xs font-medium rounded-full bg-gradient-to-r from-[#FFB706] to-[#FF5E03] hover:brightness-110 border-none shrink-0 self-start sm:self-center">
                      <ArrowUpCircle className="w-3.5 h-3.5 mr-1" />升级套餐
                    </Button>
                  </div>

                  {/* 第二行：积分使用情况进度条 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground font-medium">积分使用情况</span>
                      <span className="font-semibold text-muted-foreground">
                        <span className="text-foreground text-sm font-bold">{userPlan.credits_used.toLocaleString()}</span> / {userPlan.credits_total.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">已使用 {usagePercent}%</span>
                      <span className={cn('font-semibold', creditsLeft < 50 ? 'text-destructive' : 'text-success')}>
                        剩余 {creditsLeft.toLocaleString()} 积分
                      </span>
                    </div>
                  </div>

                  {creditsLeft < 100 && (
                    <div className="flex items-center gap-1.5 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                      <p className="text-[11px] text-warning-foreground leading-none">积分余量不足，建议升级套餐或购买加油包</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 快速统计 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '总积分', value: (userPlan.plan?.credits || 0).toLocaleString(), icon: Zap, color: 'text-primary' },
                  { label: '已使用', value: userPlan.credits_used.toLocaleString(), icon: TrendingDown, color: 'text-destructive' },
                  { label: '剩余积分', value: creditsLeft.toLocaleString(), icon: TrendingUp, color: 'text-success' },
                  { label: '使用率', value: `${usagePercent}%`, icon: CreditCard, color: 'text-info' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="h-full">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0')}>
                        <Icon className={cn('w-5 h-5', color)} />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 流量加油包 (交叉销售) */}
              <div className="mt-8">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <PackagePlus className="w-5 h-5 text-primary" />流量加油包
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {boosters.map(b => (
                    <Card key={b.id} className="border border-border hover:border-primary/50 transition-all hover:-translate-y-1">
                      <CardHeader className="pb-3 text-center">
                        <CardTitle className="text-base">{b.name}</CardTitle>
                        <div className="mt-2 text-3xl font-bold text-primary">
                          <span className="text-lg">¥</span>{b.price}
                        </div>
                        <CardDescription>直接获得 {b.credits} 积分</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                          {Array.isArray(b.features) && b.features.map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" variant="outline" onClick={() => handleSelectPlan(b)}>购买加油包</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── 套餐对比 Tab ── */}
        <TabsContent value="plans" className="mt-4">
          {loadingPlan ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, idx) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  idx={idx}
                  isCurrent={userPlan?.plan_id === plan.id}
                  onSelect={handleSelectPlan}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── 邀请有礼 Tab ── */}
        <TabsContent value="invite" className="mt-4 animate-in fade-in-50 duration-300">
          <InvitePage embedded />
        </TabsContent>

        {/* ── 积分记录 Tab ── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {/* 筛选 */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={logType} onValueChange={v => { setLogType(v); setPage(0); }}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="消费类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="video_generate">视频生成</SelectItem>
                <SelectItem value="template_download">模板下载</SelectItem>
                <SelectItem value="material_upload">素材上传</SelectItem>
                <SelectItem value="purchase">套餐购买</SelectItem>
                <SelectItem value="bonus">赠送积分</SelectItem>
                <SelectItem value="deduct">扣除</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">共 {isMockLogs ? displayLogs.length : logs.length} 条记录 {isMockLogs && '(演示示例)'}</p>
          </div>

          {/* 表格 */}
          {loadingLogs ? (
            <Card>
              <div className="overflow-x-auto w-full max-w-full">
                <Table className="[&>div]:max-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">时间</TableHead>
                      <TableHead className="whitespace-nowrap">事项描述</TableHead>
                      <TableHead className="whitespace-nowrap">类型</TableHead>
                      <TableHead className="whitespace-nowrap text-right">积分变动</TableHead>
                      <TableHead className="whitespace-nowrap text-right">剩余积分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="whitespace-nowrap"><div className="h-4 bg-muted-foreground/10 rounded w-24"></div></TableCell>
                        <TableCell className="whitespace-nowrap"><div className="h-4 bg-muted-foreground/10 rounded w-40"></div></TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="h-5 bg-muted-foreground/10 rounded-full w-16"></div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="h-4 bg-muted-foreground/10 rounded w-12 ml-auto"></div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="h-4 bg-muted-foreground/10 rounded w-16 ml-auto"></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : displayLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CreditCard className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">暂无积分记录</p>
            </div>
          ) : (
            <>
              <Card className="relative overflow-hidden border border-border/60">
                {isMockLogs && (
                  <div className="absolute top-2 right-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    系统初始演示记录
                  </div>
                )}
                <div className="overflow-x-auto w-full max-w-full">
                  <Table className="[&>div]:max-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">时间</TableHead>
                        <TableHead className="whitespace-nowrap">事项描述</TableHead>
                        <TableHead className="whitespace-nowrap">类型</TableHead>
                        <TableHead className="whitespace-nowrap text-right">积分变动</TableHead>
                        <TableHead className="whitespace-nowrap text-right">剩余积分</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayLogs.map(log => {
                        const typeInfo = TYPE_LABELS[log.type] ?? { label: log.type, cls: 'bg-muted text-muted-foreground' };
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDate(log.created_at)}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm max-w-[200px]">
                              <span className="truncate block">{log.description}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeInfo.cls)}>
                                {typeInfo.label}
                              </span>
                            </TableCell>
                            <TableCell className={cn('whitespace-nowrap text-sm font-semibold text-right',
                              log.amount > 0 ? 'text-success' : 'text-destructive')}>
                              {log.amount > 0 ? `+${log.amount}` : log.amount}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-right font-medium">
                              {log.credits_after.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* 分页 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">第 {page + 1} 页</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    上一页
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" disabled={isMockLogs || logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 微信支付弹窗 */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="w-[90vw] max-w-[380px] max-h-[85vh] p-4 sm:p-6 overflow-y-auto rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">微信支付</DialogTitle>
            <DialogDescription className="text-xs">购买 {payingObj?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-2.5 sm:py-4 gap-2.5 sm:gap-3">
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-0.5">
              <span className="text-base sm:text-lg">¥</span>{payingObj?.price}
            </div>
            
            {payStatus === 'creating' ? (
              <div className="flex flex-col items-center justify-center p-6 gap-2 bg-muted/30 rounded-xl w-36 h-36 sm:w-44 sm:h-44 border border-border">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">正在生成支付码...</span>
              </div>
            ) : payStatus === 'polling' && payUrl ? (
              <div className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm border border-border">
                <QRCodeDataUrl value={payUrl} size={150} />
                <p className="text-xs text-gray-800 mt-2.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />请使用微信扫码支付
                </p>
              </div>
            ) : payStatus === 'success' ? (
              <div className="flex flex-col items-center justify-center p-6 gap-2 bg-success/10 rounded-xl w-36 h-36 sm:w-44 sm:h-44 border border-success/30 text-success">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
                <span className="font-medium text-xs sm:text-sm">支付成功！</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 gap-2 bg-destructive/10 rounded-xl w-36 h-36 sm:w-44 sm:h-44 border border-destructive/30 text-destructive">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-xs">网络错误或支付失败</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSelectPlan(payingObj!)}>重试</Button>
              </div>
            )}
            
            <p className="text-[11px] text-muted-foreground mt-2 text-center">支付成功后将自动到账<br/>如遇问题请联系客服微信：wyx200265</p>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={payModalOpen}
        onOpenChange={setPayModalOpen}
        pkgName={selectedPayPkg.name}
        price={selectedPayPkg.price}
        credits={selectedPayPkg.credits}
      />
    </div>
  );
}
