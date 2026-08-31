import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  Wand2, Copy, BarChart3, BookOpen, Users2, Film,
  Zap, Star, ChevronLeft, ChevronRight, Check, ArrowRight,
  Sparkles, TrendingUp, Shield, Video, Play, Pause, Volume2, VolumeX, Maximize, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PaymentDialog from '@/components/common/PaymentDialog';

// ── 型別 ─────────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

// ── 粒子背景 ──────────────────────────────────────────────────────────────
function ParticleField() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 8,
      duration: Math.random() * 8 + 8,
      color: Math.random() > 0.6 ? '#FF6B00' : Math.random() > 0.5 ? '#00E599' : '#ffffff',
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-0"
          style={{
            left: `${p.x}%`,
            bottom: '-4px',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `particle-drift ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── 滚动检测 Hook ─────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ── 3D 倾斜卡片 ───────────────────────────────────────────────────────────
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(8px)`;
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
  }, []);

  return (
    <div
      ref={ref}
      className={cn('transition-transform duration-200 ease-out will-change-transform cursor-default', className)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}

// ── 计数动画 ──────────────────────────────────────────────────────────────
function CountUp({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <div ref={ref} className={cn('transition-all duration-300', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
      <span>{prefix}{count.toLocaleString()}{suffix}</span>
    </div>
  );
}

// ── Section 标题 ──────────────────────────────────────────────────────────
function SectionTitle({ tag, title, sub }: { tag: string; title: React.ReactNode; sub: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={cn('text-center mb-12 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
      <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full border mb-4"
        style={{ borderColor: 'rgba(255,107,0,0.5)', color: '#FF6B00', background: 'rgba(255,107,0,0.08)' }}>
        {tag}
      </span>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-balance">{title}</h2>
      <p className="text-base text-white/50 max-w-xl mx-auto text-pretty">{sub}</p>
    </div>
  );
}

// ── 评价卡片组件 ──────────────────────────────────────────────────────────
type ReviewItem = {
  name: string; role: string; avatar: string; avatarColor: string;
  rating: number; text: string; tags: string[]; duration: string;
};
function ReviewCard({ r }: { r: ReviewItem }) {
  return (
    <div
      className="shrink-0 w-72 rounded-2xl p-5 flex flex-col gap-3 select-none"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: r.avatarColor + '33', color: r.avatarColor, border: `1.5px solid ${r.avatarColor}55` }}
          >
            {r.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{r.name}</p>
            <p className="text-xs text-white/45 leading-tight">{r.role}</p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {Array.from({ length: r.rating }).map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-current" style={{ color: '#FFB347' }} />
          ))}
        </div>
      </div>
      <p className="text-sm text-white/70 leading-relaxed text-pretty line-clamp-3">
        <span className="text-2xl leading-none mr-1 font-serif" style={{ color: '#FF6B00', opacity: 0.7 }}>"</span>
        {r.text}
      </p>
      <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-white/6">
        <div className="flex gap-1.5 flex-wrap">
          {r.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/7 text-white/50">{tag}</span>
          ))}
        </div>
        <span className="text-[10px] text-white/35 shrink-0">{r.duration}</span>
      </div>
    </div>
  );
}

// ── 雷达图数据 ────────────────────────────────────────────────────────────
const radarData = [
  { subject: '生成效率', 本产品: 95, 传统制作: 20, 基础AI工具: 60 },
  { subject: '内容质量', 本产品: 88, 传统制作: 90, 基础AI工具: 60 },
  { subject: '成本控制', 本产品: 92, 传统制作: 25, 基础AI工具: 70 },
  { subject: '平台适配', 本产品: 90, 传统制作: 55, 基础AI工具: 65 },
  { subject: '学习成本', 本产品: 85, 传统制作: 40, 基础AI工具: 72 },
  { subject: '转化效果', 本产品: 87, 传统制作: 65, 基础AI工具: 58 },
];

// ── 用户评价数据 ──────────────────────────────────────────────────────────
const reviews = [
  {
    name: '张磊',
    role: '跨境电商运营',
    avatar: 'ZL',
    avatarColor: '#f97316',
    rating: 5,
    text: '以前一条带货视频要花 2 天找剪辑师，现在 20 分钟搞定，效果还更好！复购率明显提升，简直不敢相信。',
    tags: ['效率工具', '视频生成'],
    duration: '使用 4 个月',
  },
  {
    name: '刘欣',
    role: 'MCN 内容负责人',
    avatar: 'LX',
    avatarColor: '#8b5cf6',
    rating: 5,
    text: 'AI 脚本生成太智能了，分镜结构直接能用，改改细节就出片。管理 10 个账号再也不崩溃了，效率翻了 5 倍。',
    tags: ['AI脚本', '批量生产'],
    duration: '使用 6 个月',
  },
  {
    name: '王浩',
    role: 'TikTok 个人卖家',
    avatar: 'WH',
    avatarColor: '#3b82f6',
    rating: 5,
    text: '爆款风格复刻功能是我用过最厉害的，把竞品爆款节奏和剪辑风格直接复刻，第一条视频播放量就破 10 万。',
    tags: ['爆款复刻', 'TikTok'],
    duration: '使用 3 个月',
  },
  {
    name: '陈雪',
    role: '品牌电商总监',
    avatar: 'CX',
    avatarColor: '#ec4899',
    rating: 5,
    text: '流量分析给了精准优化建议，完播率从 28% 提升到 61%，带货转化率也跟着涨了 40%，数据说话。',
    tags: ['数据分析', '转化率'],
    duration: '使用 8 个月',
  },
  {
    name: '李磊',
    role: '独立创作者',
    avatar: 'LL',
    avatarColor: '#22c55e',
    rating: 5,
    text: '零剪辑基础也能用，AI 帮我把商品卖点整理成完整脚本，知识库会记住我的风格偏好，越用越顺手。',
    tags: ['零基础', '个人卖家'],
    duration: '使用 2 个月',
  },
  {
    name: '赵阳',
    role: '服装品牌主理人',
    avatar: 'ZY',
    avatarColor: '#f59e0b',
    rating: 5,
    text: '换装试穿功能帮我们省了大量外拍预算，上新款直接 AI 试穿出效果图，客户转化率提升了将近一倍。',
    tags: ['换装试穿', '服装电商'],
    duration: '使用 5 个月',
  },
  {
    name: '孙婷',
    role: '美妆博主',
    avatar: 'ST',
    avatarColor: '#e11d48',
    rating: 5,
    text: '去字幕、画质提升这些小工具太实用了，配合 AI 配音一起用，内容质感直接提升一个档次。',
    tags: ['美妆', '内容创作'],
    duration: '使用 1 年',
  },
  {
    name: '吴鹏',
    role: '3C 数码运营',
    avatar: 'WP',
    avatarColor: '#0ea5e9',
    rating: 5,
    text: '商品套图一键生成，省掉了请摄影师的费用。A+ 详情图效果专业，上架转化比之前高出 35%。',
    tags: ['商品图', '3C数码'],
    duration: '使用 7 个月',
  },
  {
    name: '林佳',
    role: '直播带货负责人',
    avatar: 'LJ',
    avatarColor: '#10b981',
    rating: 5,
    text: '直播切片自动提取爆款片段，加上字幕和背景音乐，发出去的短视频播放量远超手动剪辑的版本。',
    tags: ['直播切片', '短视频'],
    duration: '使用 9 个月',
  },
  {
    name: '郑凯',
    role: '跨境品牌运营',
    avatar: 'ZK',
    avatarColor: '#6366f1',
    rating: 5,
    text: '多语言视频翻译功能帮我们快速进入海外市场，不同语种同步发布，运营效率提升了好几倍。',
    tags: ['跨境出海', '多语言'],
    duration: '使用 6 个月',
  },
];

// ── 会员数据 ──────────────────────────────────────────────────────────────
const plans = [
  {
    name: '免费版',
    price: '¥0',
    period: '永久免费',
    highlight: false,
    tag: '',
    color: '#ffffff',
    features: [
      '每月 5 个视频生成配额',
      '基础 AI 脚本生成',
      '3 款视频模板',
      '720P 视频导出',
      '社区支持',
    ],
    cta: '立即体验',
  },
  {
    name: '专业版',
    price: '¥299',
    period: '/ 月',
    highlight: true,
    tag: '最受欢迎',
    color: '#FF6B00',
    features: [
      '每月 100 个视频生成配额',
      '高级 AI 脚本 + Prompt 优化',
      '爆款风格复刻（无限次）',
      '全部视频模板 & 数字人库',
      '流量分析 & 一键优化',
      '1080P 高清导出',
      '优先客服支持',
    ],
    cta: '升级专业版',
  },
  {
    name: '企业版',
    price: '¥999',
    period: '/ 月',
    highlight: false,
    tag: '',
    color: '#00E599',
    features: [
      '无限视频生成配额',
      '企业级知识库 & AI 定制',
      '多账号团队协作',
      '专属数字人定制',
      'API 接口开放',
      '私有化部署方案',
      '专属客户成功经理',
    ],
    cta: '联系销售',
  },
];

// ── 特色功能数据 ──────────────────────────────────────────────────────────
const features = [
  {
    icon: Wand2,
    title: 'AI 智能脚本生成',
    desc: '输入商品名称和卖点，AI 自动生成结构化分镜脚本与 Prompt 文案，省去 90% 策划时间。',
    color: '#FF6B00',
    glow: 'rgba(255,107,0,0.2)',
  },
  {
    icon: Copy,
    title: '爆款风格复刻',
    desc: '上传参考视频，AI 提取节奏、转场、字幕风格并完整复刻，让每条视频都有爆款潜力。',
    color: '#00E599',
    glow: 'rgba(0,229,153,0.2)',
  },
  {
    icon: BarChart3,
    title: '流量预测分析',
    desc: '基于视频特征预测完播率与互动率，提供精准优化建议，支持一键重新生成。',
    color: '#00B4D8',
    glow: 'rgba(0,180,216,0.2)',
  },
  {
    icon: BookOpen,
    title: '知识库自进化',
    desc: '持续收集你的编辑行为与反馈，AI 越用越了解你的风格偏好，生成质量持续提升。',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
  },
  {
    icon: Users2,
    title: '数字人库',
    desc: '内置多风格数字人，支持中英双语，让带货主播直接出镜，提升视频专业度与信任感。',
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.2)',
  },
  {
    icon: Film,
    title: '视频模板库',
    desc: '覆盖多种带货场景的专业模板，开箱测评、痛点解决、限时促销，一键调用即刻出片。',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.2)',
  },
];

// ── 用户画像数据 ──────────────────────────────────────────────────────────
const personas = [
  {
    emoji: '🛒',
    role: '跨境电商卖家',
    color: '#FF6B00',
    tags: ['频繁上新', '多平台运营', '成本敏感'],
    needs: '快速产出高质量带货视频，无需雇佣专业剪辑团队',
    pain: '视频制作周期长、成本高，跟不上平台流量热点',
    gain: '每月节省 ¥8,000+ 制作成本，出片速度提升 10x',
  },
  {
    emoji: '🎬',
    role: 'MCN 内容机构',
    color: '#00E599',
    tags: ['多账号管理', '数据驱动', '追求爆款'],
    needs: '批量生成高转化视频内容，统一管理多个账号',
    pain: '创作团队产能有限，难以规模化复制爆款内容',
    gain: '单人管理 10+ 账号，内容产出效率翻 5 倍',
  },
  {
    emoji: '✨',
    role: 'OPC带货个体',
    color: '#a78bfa',
    tags: ['个人运营', '零剪辑基础', '学习爆款'],
    needs: '低门槛制作专业视频，快速学习爆款创作技巧',
    pain: '缺乏专业技能，无法低成本制作高质量内容',
    gain: '从零基础到第一条破万播放，平均 3 天',
  },
];

// ── 统计数据 ──────────────────────────────────────────────────────────────
const stats = [
  { value: 1798, suffix: '+', label: '已生成视频', icon: Video },
  { value: 169, suffix: '+', label: '服务商家', icon: Users2 },
  { value: 80, suffix: '%', label: '平均时间节省', icon: Zap },
  { value: 61, suffix: '%', label: '平均完播率提升', icon: TrendingUp },
];

// ── 宣传视频播放器组件 ───────────────────────────────────────────────────
function PromoVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('00:00');
  const [durationStr, setDurationStr] = useState('00:00');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    if (dur > 0) {
      setProgress((cur / dur) * 100);
      setCurrentTimeStr(formatTime(cur));
      setDurationStr(formatTime(dur));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const { ref, inView } = useInView(0.15);

  return (
    <div
      ref={ref}
      className={cn(
        'w-full max-w-5xl mx-auto mb-16 md:mb-20 transition-all duration-1000',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      )}
    >
      {/* 顶部视觉标题标签 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#FF6B00] animate-ping" />
          <span className="text-xs font-semibold tracking-wider text-[#FF6B00] uppercase">
            演示视频 · 核心爆款带货功能拆解
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Sparkles className="w-3.5 h-3.5 text-[#00E599]" />
          <span>Shopro AI 4.0 4K/1080P 超清示范</span>
        </div>
      </div>

      {/* 视频主容器卡片 */}
      <div
        className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/15 bg-[#0b0d12] shadow-[0_20px_80px_rgba(0,0,0,0.8)] group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* 光晕边缘背景 */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-30 blur-2xl pointer-events-none transition-opacity duration-500 group-hover:opacity-60"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,107,0,0.4), rgba(0,229,153,0.2) 70%, transparent 100%)',
          }}
        />

        {/* macOS-style 顶部控制条 */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-[#13161f]/90 backdrop-blur-md border-b border-white/10 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            <span className="ml-2 font-mono text-[11px] text-white/40 hidden sm:inline-block">Shopro.mp4</span>
          </div>
          <div className="font-medium text-white/90 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Shopro AI 电商带货视频实操演示</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-[#00E599]">
              HD 1080P
            </span>
          </div>
        </div>

        {/* 视频播放主体 */}
        <div className="relative aspect-video bg-black cursor-pointer overflow-hidden flex items-center justify-center" onClick={togglePlay}>
          <video
            ref={videoRef}
            src="/Shopro.mp4"
            preload="metadata"
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            playsInline
          />

          {/* 播放/暂停大控件遮罩 */}
          {(!isPlaying || showControls) && (
            <div className={cn(
              'absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px] transition-opacity duration-300',
              !isPlaying ? 'opacity-100' : showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}>
              <div className="relative group/btn">
                {!isPlaying && (
                  <div className="absolute -inset-4 rounded-full bg-[#FF6B00]/40 animate-ping pointer-events-none" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover/btn:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B00 0%, #ff8c00 100%)',
                    boxShadow: '0 0 50px rgba(255, 107, 0, 0.6)',
                  }}
                  aria-label={isPlaying ? '暂停' : '播放演示视频'}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />
                  )}
                </button>
              </div>

              {!isPlaying && (
                <div className="mt-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white tracking-wide shadow-lg animate-bounce">
                  ✨ 点击播放1分钟实操带货视频演示
                </div>
              )}
            </div>
          )}

          {/* 底部控制栏 */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 flex flex-col gap-2',
              showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 时间进度条 */}
            <div
              className="w-full h-2 bg-white/20 hover:h-3 rounded-full cursor-pointer transition-all relative overflow-hidden group/bar"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-gradient-to-r from-[#FF6B00] to-[#ff9500] rounded-full transition-all relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* 控制按钮与时长 */}
            <div className="flex items-center justify-between text-xs text-white/90">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="hover:text-[#FF6B00] transition-colors p-1"
                  aria-label={isPlaying ? '暂停' : '播放'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="hover:text-[#FF6B00] transition-colors p-1"
                  aria-label={isMuted ? '取消静音' : '静音'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-[11px] text-white/70">
                  {currentTimeStr} / {durationStr}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-[11px] text-white/50">Shopro AI 带货短视频引擎</span>
                <button
                  onClick={toggleFullscreen}
                  className="hover:text-[#FF6B00] transition-colors p-1"
                  aria-label="全屏播放"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payPkg, setPayPkg] = useState({ name: '专业版', price: '299', credits: '1,000' });

  // 导航栏滚动透明→不透明
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToApp = () => navigate('/login');

  const { ref: radarRef, inView: radarInView } = useInView(0.2);
  const { ref: statsRef, inView: statsInView } = useInView(0.2);

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#0a0c0f', color: '#fff' }}>

      {/* ── 顶部导航 ── */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-[#0a0c0f]/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/shopro.png" className="w-8 h-8 object-contain shrink-0" alt="Shopro Logo" />
            <span className="font-bold text-white text-sm md:text-base tracking-tight">
              Shopro-电商AIGC带货视频
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            {['功能', '竞品对比', '用户评价', '会员计划'].map(item => (
              <a key={item} href={`#${item}`}
                className="hover:text-white transition-colors cursor-pointer"
                onClick={e => {
                  e.preventDefault();
                  document.getElementById(item)?.scrollIntoView({ behavior: 'smooth' });
                }}>
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goToApp}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c00)' }}
            >
              立即使用 <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="md:hidden text-white/70 hover:text-white" onClick={() => setNavOpen(v => !v)}>
              {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* 移动端菜单 */}
        {navOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0d0f12]/98 backdrop-blur-md px-4 py-4 space-y-3">
            {['功能', '竞品对比', '用户评价', '会员计划'].map(item => (
              <a key={item} className="block text-white/70 hover:text-white py-2 text-sm cursor-pointer"
                onClick={() => { setNavOpen(false); document.getElementById(item)?.scrollIntoView({ behavior: 'smooth' }); }}>
                {item}
              </a>
            ))}
            <button onClick={goToApp}
              className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c00)' }}>
              立即使用
            </button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════
          HERO 区
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden landing-hero-bg pt-16">
        <ParticleField />

        {/* 光晕装饰 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none animate-glow-pulse"
          style={{ background: 'radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full pointer-events-none animate-glow-pulse"
          style={{ background: 'radial-gradient(circle, rgba(0,229,153,0.12) 0%, transparent 70%)', filter: 'blur(40px)', animationDelay: '1.5s' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 text-center py-20 md:py-32">
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold mb-8 tracking-wide"
            style={{ borderColor: 'rgba(255,107,0,0.4)', background: 'rgba(255,107,0,0.08)', color: '#FF6B00' }}>
            <Zap className="w-3 h-3" />
            AI 驱动 · 低成本 · 高转化
          </div>

          {/* 主标题 */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 text-balance">
            <span className="text-white">一键批量生成</span>
            <br />
            <span className="landing-gradient-text">TikTok跨境电商带货视频</span>
          </h1>

          <p className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            AI 全流程辅助 · 从商品信息到带货短视频
            <br className="hidden md:block" />
            无需专业剪辑，1分钟产出高转化内容
          </p>

          {/* CTA 按钮组 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={goToApp}
              className="group relative px-8 py-4 rounded-xl text-base font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-border-glow"
              style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #ff9500 100%)' }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Play className="w-4 h-4" />
                立即免费使用
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
              {/* 光晕扫描线 */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)', animation: 'scan-line 1s ease infinite' }} />
            </button>

            <a
              href="https://my.feishu.cn/wiki/FF9KwlgBQihnK5kkzT5c6lI5nub?from=from_copylink"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold text-white/80 border border-white/15 hover:border-white/35 hover:text-white transition-all duration-200 hover:bg-white/5 backdrop-blur-sm"
            >
              开源文档
            </a>
          </div>

          {/* 信任信号 */}
          <div className="flex flex-wrap gap-6 justify-center mt-12 text-sm text-white/35">
            {['无需信用卡', '免费开始', '5 分钟上手', '7 天无理由退款'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-400" />{t}
              </span>
            ))}
          </div>

          {/* 模拟截图光晕卡片 */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            <div className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: '0 0 80px rgba(255,107,0,0.15), 0 0 160px rgba(0,229,153,0.08)' }} />
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/3 backdrop-blur-sm p-6 md:p-8">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: '脚本生成中', val: '▓▓▓▓▓▓▓░░░', color: '#FF6B00' },
                  { label: '分镜解析', val: '▓▓▓▓▓▓▓▓▓░', color: '#00E599' },
                  { label: '视频合成', val: '▓▓▓▓▓░░░░░', color: '#00B4D8' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-lg p-3 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] text-white/40 mb-1">{label}</p>
                    <p className="text-xs font-mono" style={{ color }}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 text-left" style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.15)' }}>
                <p className="text-[10px] text-white/30 mb-2 font-mono">AI 生成脚本预览</p>
                <div className="space-y-1.5">
                  {[
                    '场景 01 | 开场钩子 | 3s | 镜头快速推进，展示产品特写...',
                    '场景 02 | 痛点共鸣 | 4s | 对比画面：使用前后场景切换...',
                    '场景 03 | 产品展示 | 6s | 多角度展示，突出核心功能...',
                  ].map((line, i) => (
                    <p key={i} className="text-xs font-mono text-white/50">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          统计数据
      ══════════════════════════════════════════════════════ */}
      <section ref={statsRef} className="py-16 border-y border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ value, suffix, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="flex justify-center mb-2">
                  <Icon className="w-5 h-5 text-white/30" />
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-white mb-1" style={{ color: '#FF6B00' }}>
                  {statsInView ? <CountUp target={value} suffix={suffix} /> : <span>0{suffix}</span>}
                </div>
                <p className="text-sm text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          宣传视频与用户画像
      ══════════════════════════════════════════════════════ */}
      <section id="功能" className="py-24 landing-section-dark">
        <div className="max-w-6xl mx-auto px-4 md:px-8">

          {/* 宣传视频播放组件 */}
          <PromoVideoPlayer />

          <SectionTitle
            tag="用户画像"
            title={<>谁在用 <span style={{ color: '#FF6B00' }}>电商AIGC</span>？</>}
            sub="我们服务各类电商从业者，帮助他们以最低成本产出最高转化内容"
          />
          <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible pb-6 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 gap-6 snap-x snap-mandatory scrollbar-none">
            {personas.map((p, i) => {
              const { ref, inView } = useInView(0.15);
              return (
                <div key={p.role} ref={ref}
                  className={cn('transition-all duration-700 w-[80vw] sm:w-[350px] md:w-auto shrink-0 snap-center', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
                  style={{ transitionDelay: `${i * 120}ms` }}>
                  <TiltCard>
                    <div className="rounded-2xl p-6 h-full landing-card-dark transition-all duration-300 hover:shadow-2xl"
                      style={{ '--hover-glow': p.color } as React.CSSProperties}>
                      <div className="text-4xl mb-4">{p.emoji}</div>
                      <h3 className="text-lg font-bold text-white mb-3 text-balance">{p.role}</h3>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {p.tags.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-white/40 text-xs mb-1">核心需求</p>
                          <p className="text-white/75 text-pretty">{p.needs}</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,60,60,0.05)', border: '1px solid rgba(255,60,60,0.1)' }}>
                          <p className="text-red-400/60 text-xs mb-1">痛点</p>
                          <p className="text-white/60 text-pretty">{p.pain}</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: `${p.color}08`, border: `1px solid ${p.color}20` }}>
                          <p className="text-xs mb-1" style={{ color: `${p.color}99` }}>使用后收益</p>
                          <p className="font-semibold text-pretty" style={{ color: p.color }}>{p.gain}</p>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          特色功能
      ══════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionTitle
            tag="核心功能"
            title={<>六大 AI 引擎<br /><span style={{ color: '#00E599' }}>全程护航你的视频</span></>}
            sub="从脚本策划到视频生成，AI 全流程辅助，每一步都有智能加持"
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {features.map((f, i) => {
              const { ref, inView } = useInView(0.1);
              return (
                <div key={f.title} ref={ref}
                  className={cn('transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
                  style={{ transitionDelay: `${i * 80}ms` }}>
                  <TiltCard className="h-full">
                    <div className="rounded-2xl p-4 sm:p-6 h-full group cursor-default landing-card-dark transition-all duration-300 hover:shadow-xl"
                      style={{ '--glow': f.glow } as React.CSSProperties}>
                      <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                        style={{ background: f.glow, border: `1px solid ${f.color}30` }}>
                        <f.icon className="w-6 h-6" style={{ color: f.color }} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 text-balance">{f.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed text-pretty">{f.desc}</p>

                      {/* 底部装饰线 */}
                      <div className="mt-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `linear-gradient(90deg, ${f.color}, transparent)` }} />
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          竞品分析（雷达图）
      ══════════════════════════════════════════════════════ */}
      <section id="竞品对比" className="py-24 landing-section-dark">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionTitle
            tag="竞品对比"
            title={<>为什么选择<br /><span style={{ color: '#00E599' }}>电商AIGC</span>？</>}
            sub="与传统视频制作和基础AI工具的六维全面对比"
          />

          <div ref={radarRef}
            className={cn('grid grid-cols-1 lg:grid-cols-2 gap-8 items-center transition-all duration-1000',
              radarInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12')}>
            {/* 雷达图 */}
            <div className="rounded-2xl p-6 landing-card-dark">
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, paddingTop: 16 }} />
                  <Radar name="本产品" dataKey="本产品" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.25} strokeWidth={2} dot={{ fill: '#FF6B00', r: 4 }} />
                  <Radar name="传统制作" dataKey="传统制作" stroke="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.05)" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Radar name="基础AI工具" dataKey="基础AI工具" stroke="#00E599" fill="#00E599" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="6 3" />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* 对比说明 */}
            <div className="space-y-4">
              {[
                { dim: '生成效率', our: 95, desc: '20 分钟完成传统制作 2 天的工作量', color: '#FF6B00' },
                { dim: '成本控制', our: 92, desc: '月均节省 ¥8,000+ 人力与制作成本', color: '#FF6B00' },
                { dim: '平台适配', our: 90, desc: '抖音/TikTok 双平台风格自动适配', color: '#00E599' },
                { dim: '转化效果', our: 87, desc: '基于爆款学习的高转化内容生成', color: '#00E599' },
              ].map(({ dim, our, desc, color }) => (
                <div key={dim} className="rounded-xl p-4 landing-card-dark">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{dim}</span>
                    <span className="text-sm font-bold" style={{ color }}>{our}分</span>
                  </div>
                  <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {radarInView && (
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${our}%`, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
                    )}
                  </div>
                  <p className="text-xs text-white/40 text-pretty">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          用户评价 – 双排无限滚动
      ══════════════════════════════════════════════════════ */}
      <section id="用户评价" className="py-24 overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 mb-12">
          <SectionTitle
            tag="用户评价"
            title={<>真实用户<br /><span style={{ color: '#FF6B00' }}>亲口说</span></>}
            sub="来自 8,500+ 真实商家的反馈，他们的成绩就是我们的骄傲"
          />
        </div>

        {/* 上排：向左滚动 */}
        <div className="relative mb-4">
          <div className="flex gap-4 animate-marquee-left" style={{ width: 'max-content' }}>
            {[...reviews.slice(0, 5), ...reviews.slice(0, 5)].map((r, i) => (
              <ReviewCard key={`top-${i}`} r={r} />
            ))}
          </div>
        </div>

        {/* 下排：向右滚动 */}
        <div className="relative">
          <div className="flex gap-4 animate-marquee-right" style={{ width: 'max-content' }}>
            {[...reviews.slice(5), ...reviews.slice(5)].map((r, i) => (
              <ReviewCard key={`bot-${i}`} r={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          会员计划
      ══════════════════════════════════════════════════════ */}
      <section id="会员计划" className="py-24 landing-section-dark">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionTitle
            tag="会员计划"
            title={<>选择适合你的<br /><span style={{ color: '#FF6B00' }}>成长方案</span></>}
            sub="从免费体验到企业定制，满足不同规模的电商团队需求"
          />

          <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible pb-6 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 gap-6 snap-x snap-mandatory scrollbar-none">
            {plans.map((plan, i) => {
              const { ref, inView } = useInView(0.1);
              return (
                <div key={plan.name} ref={ref}
                  className={cn('transition-all duration-700 w-[80vw] sm:w-[350px] md:w-auto shrink-0 snap-center', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
                  style={{ transitionDelay: `${i * 120}ms` }}>
                  <TiltCard className="h-full">
                    <div className={cn('rounded-2xl p-6 h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-2xl')}
                      style={{
                        background: plan.highlight ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${plan.highlight ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: plan.highlight ? '0 0 40px rgba(255,107,0,0.1)' : 'none',
                      }}>
                      {/* 热门标签 */}
                      {plan.tag && (
                        <div className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: '#FF6B00', color: '#fff' }}>
                          {plan.tag}
                        </div>
                      )}

                      {/* 计划名称 & 价格 */}
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white mb-1" style={{ color: plan.color }}>{plan.name}</h3>
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                          <span className="text-white/40 text-sm pb-1">{plan.period}</span>
                        </div>
                      </div>

                      {/* 权益列表 */}
                      <ul className="space-y-3 flex-1 mb-8">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${plan.color}20`, border: `1px solid ${plan.color}40` }}>
                              <Check className="w-2.5 h-2.5" style={{ color: plan.color }} />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA 按钮 */}
                      <button
                        onClick={() => {
                          if (plan.price === '¥0') {
                            goToApp();
                          } else {
                            setPayPkg({
                              name: plan.name,
                              price: plan.price.replace('¥', ''),
                              credits: plan.name.includes('专业') ? '1,000' : '5,000',
                            });
                            setPayDialogOpen(true);
                          }
                        }}
                        className={cn(
                          'w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
                          plan.highlight ? 'text-white animate-border-glow' : 'text-white/80 hover:text-white'
                        )}
                        style={plan.highlight
                          ? { background: 'linear-gradient(135deg, #FF6B00, #ff9500)' }
                          : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }
                        }
                      >
                        {plan.cta}
                      </button>
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>

          {/* 底部保障 */}
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/35">
            {[
              { icon: Shield, text: '7 天无理由退款' },
              { icon: Zap, text: '即开即用，无需安装' },
              { icon: Users2, text: '专属客服支持' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-green-400/60" />{text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          底部 CTA
      ══════════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'rgba(255,107,0,0.04)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full animate-glow-pulse"
            style={{ background: 'radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 text-balance">
            现在就开始<br />
            <span className="landing-gradient-text">AI 驱动带货之路</span>
          </h2>
          <p className="text-lg text-white/50 mb-10 text-pretty">
            免费注册，1 分钟内生成你的第一条带货视频
          </p>
          <button
            onClick={goToApp}
            className="group px-10 py-5 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-border-glow"
            style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #ff9500 100%)' }}
          >
            <span className="flex items-center gap-2">
              免费开始使用
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0a0c0f] text-white border-t border-white/5 pt-16 pb-12 font-sans select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-8 pb-12 text-center lg:text-left">
            {/* 左侧 Logo 和介绍 */}
            <div className="flex flex-col items-center lg:items-start space-y-4 max-w-xs">
              <div className="flex items-center gap-2.5">
                <img src="/shopro.png" className="w-8 h-8 object-contain shrink-0" alt="Shopro Logo" />
                <span className="text-lg font-bold text-white tracking-tight">
                  Shopro 电商AIGC
                </span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed text-pretty">
                AI 驱动的电商AIGC带货视频生成平台，让视频营销及商品管理更精准、更高效。
              </p>
            </div>

            {/* 右侧链接容器：移动端也是一排显示3列，完全不换行 */}
            <div className="grid grid-cols-3 gap-x-4 sm:gap-x-12 md:gap-x-16 justify-items-center w-full lg:w-auto">
              {/* 产品 */}
              <div className="flex flex-col items-center space-y-4">
                <h4 className="text-sm font-bold text-white tracking-wider">产品</h4>
                <ul className="space-y-2.5 text-xs text-white/40">
                  <li>
                    <a href="#功能" onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('功能')?.scrollIntoView({ behavior: 'smooth' });
                    }} className="hover:text-[#FF6B00] transition-colors">
                      功能介绍
                    </a>
                  </li>
                  <li>
                    <a href="#会员计划" onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('会员计划')?.scrollIntoView({ behavior: 'smooth' });
                    }} className="hover:text-[#FF6B00] transition-colors">
                      价格方案
                    </a>
                  </li>
                  <li>
                    <a href="#用户评价" onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('用户评价')?.scrollIntoView({ behavior: 'smooth' });
                    }} className="hover:text-[#FF6B00] transition-colors">
                      更新日志
                    </a>
                  </li>
                  <li>
                    <a href="/login" className="hover:text-[#FF6B00] transition-colors">
                      API 文档
                    </a>
                  </li>
                </ul>
              </div>

              {/* 公司 */}
              <div className="flex flex-col items-center space-y-4">
                <h4 className="text-sm font-bold text-white tracking-wider">公司</h4>
                <ul className="space-y-2.5 text-xs text-white/40">
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">关于我们</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">加入团队</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">合作伙伴</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">媒体资料</a></li>
                </ul>
              </div>

              {/* 支持 */}
              <div className="flex flex-col items-center space-y-4">
                <h4 className="text-sm font-bold text-white tracking-wider">支持</h4>
                <ul className="space-y-2.5 text-xs text-white/40">
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">帮助中心</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">联系客服</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">用户协议</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">隐私政策</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* 底部版权信息 */}
          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-white/30 tracking-wide">
              © 2026 Shopro 电商AIGC带货视频 · 保留所有权利
            </p>
          </div>
        </div>
      </footer>

      <PaymentDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        pkgName={payPkg.name}
        price={payPkg.price}
        credits={payPkg.credits}
      />
    </div>
  );
}
