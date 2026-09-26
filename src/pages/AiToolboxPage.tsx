import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy, BarChart3, BookOpen, Globe, Scissors,
  Wand2, Heart, TrendingUp, Brain,
  ArrowRight, Sparkles, Zap, Search,
  FileText, Languages, Users, ShoppingBag,
  Cpu, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 工具数据 ──────────────────────────────────────────────────────────────
const AI_TOOLS = [
  {
    id: 'knowledge',
    path: '/knowledge',
    label: 'Prompt知识库',
    desc: '海量爆款电商带货 Prompt 资产沉淀，一键带入脚本创作与视频生产',
    icon: BookOpen,
    from: '#10b981', to: '#84cc16',
    shadow: 'rgba(16,185,129,0.45)',
    badge: 'Prompt',
    badgeFrom: '#10b981', badgeTo: '#84cc16',
    category: '知识管理',
  },
  {
    id: 'ai-script',
    path: '/script',
    label: '商品带货脚本',
    desc: '智能生成高转化率爆款电商带货分镜脚本，支持外部 DNA 与竞品脚本一键载入',
    icon: FileText,
    from: '#ec4899', to: '#8b5cf6',
    shadow: 'rgba(236,72,153,0.45)',
    badge: '脚本',
    badgeFrom: '#ec4899', badgeTo: '#8b5cf6',
    category: '内容创作',
  },
  {
    id: 'style-copy',
    path: '/style-copy',
    label: '爆款风格复刻',
    desc: '深度解析爆款视频多模态 DNA 指纹，一键将高转化风格复刻至脚本与剪辑工程',
    icon: Copy,
    from: '#f43f5e', to: '#ec4899',
    shadow: 'rgba(244,63,94,0.45)',
    badge: '热门',
    badgeFrom: '#f43f5e', badgeTo: '#ec4899',
    category: '内容创作',
  },
  {
    id: 'live-highlight',
    path: '/live-highlight',
    label: '直播高光切片',
    desc: 'AI 自动侦测直播热度波峰与转化黄金时段，智能切片并无缝推入视频剪辑器',
    icon: Scissors,
    from: '#ef4444', to: '#f97316',
    shadow: 'rgba(239,68,68,0.45)',
    badge: 'NEW',
    badgeFrom: '#ef4444', badgeTo: '#f97316',
    category: '内容创作',
  },
  {
    id: 'emotion-analysis',
    path: '/emotion-analysis',
    label: '口播台词优化',
    desc: 'NLP 智能分析文案表达与情绪起伏，输出黄金 Hook、痛点重音并一键直连数字人',
    icon: Heart,
    from: '#ec4899', to: '#f43f5e',
    shadow: 'rgba(236,72,153,0.45)',
    badge: '口播',
    badgeFrom: '#ec4899', badgeTo: '#f43f5e',
    category: '数据洞察',
  },
  {
    id: 'competitor',
    path: '/competitor',
    label: '竞品爆款分析',
    desc: '24小时实时抓取类目竞品对标视频策略，拆解破局点并一键派生对标带货脚本',
    icon: Globe,
    from: '#f97316', to: '#f59e0b',
    shadow: 'rgba(249,115,22,0.45)',
    badge: '24h',
    badgeFrom: '#f97316', badgeTo: '#f59e0b',
    category: '市场情报',
  },
  {
    id: 'analytics',
    path: '/analytics',
    label: '作品流量预测',
    desc: '多维度预测视频完播率与转化漏斗，结合高转化作品提供数据化优化建议',
    icon: BarChart3,
    from: '#0ea5e9', to: '#6366f1',
    shadow: 'rgba(14,165,233,0.45)',
    badge: '预测',
    badgeFrom: '#0ea5e9', badgeTo: '#6366f1',
    category: '数据洞察',
  },
  {
    id: 'video-create',
    path: '/video/create',
    label: 'AI 视频一键生成',
    desc: '四层流水线自动生成带货分镜脚本与 Prompt 文案',
    icon: Wand2,
    from: '#6366f1', to: '#8b5cf6',
    shadow: 'rgba(99,102,241,0.45)',
    badge: '核心',
    badgeFrom: '#6366f1', badgeTo: '#8b5cf6',
    category: '内容创作',
  },
  {
    id: 'avatars',
    path: '/avatars',
    label: '数字人克隆',
    desc: '上传照片/视频一键克隆专属数字人主播',
    icon: Users,
    from: '#8b5cf6', to: '#ec4899',
    shadow: 'rgba(139,92,246,0.45)',
    badge: 'AI',
    badgeFrom: '#8b5cf6', badgeTo: '#ec4899',
    category: '创作提效',
  },
  {
    id: 'translate',
    path: '/multilang',
    label: '多语言翻译',
    desc: '一键将视频文案翻译为英/日/韩/泰等多国语言',
    icon: Languages,
    from: '#10b981', to: '#06b6d4',
    shadow: 'rgba(16,185,129,0.45)',
    badge: '多语种',
    badgeFrom: '#10b981', badgeTo: '#06b6d4',
    category: '内容创作',
  },
  {
    id: 'products-ai',
    path: '/products',
    label: 'AI 卖点提炼',
    desc: '输入商品链接，AI 自动提炼核心卖点与 Prompt',
    icon: ShoppingBag,
    from: '#f97316', to: '#fbbf24',
    shadow: 'rgba(249,115,22,0.45)',
    badge: '一键',
    badgeFrom: '#f97316', badgeTo: '#fbbf24',
    category: '创作提效',
  },
  {
    id: 'batch-generate',
    path: '/batch-create',
    label: '批量生成工作台',
    desc: '批量导入商品，一次性产出多套带货视频',
    icon: Cpu,
    from: '#6366f1', to: '#0ea5e9',
    shadow: 'rgba(99,102,241,0.45)',
    badge: '批量',
    badgeFrom: '#6366f1', badgeTo: '#0ea5e9',
    category: '创作提效',
  },
  {
    id: 'publish',
    path: '/export-formats',
    label: '跨平台一键发布',
    desc: '抖音/快手/小红书/TikTok 多平台同步分发',
    icon: Megaphone,
    from: '#10b981', to: '#0ea5e9',
    shadow: 'rgba(16,185,129,0.45)',
    badge: '4平台',
    badgeFrom: '#10b981', badgeTo: '#0ea5e9',
    category: '市场情报',
  },
];

const CATEGORIES = ['全部', '内容创作', '数据洞察', '知识管理', '市场情报', '创作提效'];

// ── 工具卡片 ──────────────────────────────────────────────────────────────
function ToolCard({ tool, index }: { tool: typeof AI_TOOLS[0]; index: number }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const Icon = tool.icon;

  return (
    <button
      className={cn(
        'group relative w-full text-left rounded-2xl border border-border/60 bg-card',
        'transition-all duration-300 overflow-hidden',
        hovered && 'border-transparent -translate-y-1',
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        boxShadow: hovered ? `0 16px 40px -8px ${tool.shadow}, 0 4px 12px -4px ${tool.shadow}` : undefined,
      }}
      onClick={() => navigate(tool.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 卡片顶部彩色渐变条 */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${tool.from}, ${tool.to})` }}
      />

      {/* 悬停背景光晕 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${tool.from}, ${tool.to})` }}
      />

      <div className="relative p-5">
        {/* 图标 + badge */}
        <div className="flex items-start justify-between mb-4">
          {/* 彩色渐变图标框 */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 shrink-0"
            style={{ background: `linear-gradient(135deg, ${tool.from}, ${tool.to})` }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>

          {/* badge */}
          <span
            className="px-2 py-0.5 text-[10px] font-semibold rounded-full text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${tool.badgeFrom}, ${tool.badgeTo})` }}
          >
            {tool.badge}
          </span>
        </div>

        {/* 文字 */}
        <h3 className="text-sm font-semibold text-foreground mb-1.5 text-balance">{tool.label}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed text-pretty line-clamp-2">{tool.desc}</p>

        {/* 底部分类 + 箭头 */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
            {tool.category}
          </span>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">立即进入</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── 统计卡片 ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, from, to }: { label: string; value: string; sub: string; from: string; to: string }) {
  return (
    <div className="relative rounded-xl border border-border/60 bg-card p-4 overflow-hidden">
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      />
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function AiToolboxPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [search, setSearch] = useState('');

  const filtered = AI_TOOLS.filter(t => {
    const matchCat = activeCategory === '全部' || t.category === activeCategory;
    const matchSearch = t.label.includes(search) || t.desc.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-full bg-background">
      {/* ── 顶部 Hero Banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-violet-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-48 translate-x-48 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-500/8 to-transparent rounded-full translate-y-32 -translate-x-32 pointer-events-none" />

        <div className="relative px-6 py-8 md:py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">AI工具箱</h1>
                <span className="hidden md:inline px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                  {AI_TOOLS.length} 个工具
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-pretty">全方位 AI 智能工具，驱动带货内容增长</p>
            </div>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <StatCard label="AI 工具数量" value={String(AI_TOOLS.length)} sub="持续新增中" from="#6366f1" to="#8b5cf6" />
            <StatCard label="累计使用次数" value="24.8万" sub="本月增长 +18%" from="#0ea5e9" to="#6366f1" />
            <StatCard label="平均提效" value="3.2×" sub="内容产出效率" from="#10b981" to="#06b6d4" />
            <StatCard label="用户好评率" value="98.6%" sub="基于真实反馈" from="#f59e0b" to="#ef4444" />
          </div>
        </div>
      </div>

      {/* ── 筛选 & 搜索 ────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 shrink-0',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="搜索工具…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── 工具网格 ───────────────────────────────────────────────────── */}
      <div className="px-6 py-6">
        {filtered.length < AI_TOOLS.length && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            找到 <span className="font-semibold text-foreground">{filtered.length}</span> 个工具
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">未找到相关工具</p>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => { setSearch(''); setActiveCategory('全部'); }}
            >
              清除筛选条件
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} index={i} />
            ))}
          </div>
        )}

        {/* 底部说明 */}
        <div className="mt-8 rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">更多 AI 能力持续上线中</h4>
              <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                工具箱将持续集成最新 AI 模型与电商增长工具。关注版本更新，第一时间体验新功能。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
