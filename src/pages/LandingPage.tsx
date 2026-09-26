import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Wand2, Copy, BarChart3, BookOpen, Users2, Film,
  Zap, Star, ChevronLeft, ChevronRight, Check, ArrowRight,
  Sparkles, TrendingUp, Shield, Video, Play, Pause, Volume2, VolumeX, Maximize, Menu, X,
  CheckCircle2, XCircle, Award, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PaymentDialog from '@/components/common/PaymentDialog';
import LandingHero from '@/components/LandingHero';

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

// ── 特色功能数据（配对应封面图） ─────────────────────────────────────────
const features = [
  {
    icon: Wand2,
    title: 'AI 智能脚本生成',
    desc: '输入商品名称和卖点，AI 自动生成结构化分镜脚本与 Prompt 文案，省去 90% 策划时间。',
    color: '#FF6B00',
    glow: 'rgba(255,107,0,0.2)',
    image: '/index/AI 智能脚本生成.png',
  },
  {
    icon: Copy,
    title: '爆款风格复刻',
    desc: '上传参考视频，AI 提取节奏、转场、字幕风格并完整复刻，让每条视频都有爆款潜力。',
    color: '#00E599',
    glow: 'rgba(0,229,153,0.2)',
    image: '/index/爆款风格复刻.png',
  },
  {
    icon: BarChart3,
    title: '流量预测分析',
    desc: '基于视频特征预测完播率与互动率，提供精准优化建议，支持一键重新生成。',
    color: '#00B4D8',
    glow: 'rgba(0,180,216,0.2)',
    image: '/index/流量预测分析.png',
  },
  {
    icon: BookOpen,
    title: '知识库自进化',
    desc: '持续收集你的编辑行为与反馈，AI 越用越了解你的风格偏好，生成质量持续提升。',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
    image: '/index/知识库自进化.png',
  },
  {
    icon: Users2,
    title: '数字人库',
    desc: '内置多风格数字人，支持中英双语，让带货主播直接出镜，提升视频专业度与信任感。',
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.2)',
    image: '/index/数字人库.png',
  },
  {
    icon: Film,
    title: '视频模板库',
    desc: '覆盖多种带货场景的专业模板，开箱测评、痛点解决、限时促销，一键调用即刻出片。',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.2)',
    image: '/index/视频模板库.png',
  },
];

// ── 用户画像数据（配对应封面图） ─────────────────────────────────────────
const personas = [
  {
    emoji: '🛒',
    role: '跨境电商卖家',
    color: '#FF6B00',
    tags: ['频繁上新', '多平台运营', '成本敏感'],
    needs: '快速产出高质量带货视频，无需雇佣专业剪辑团队',
    pain: '视频制作周期长、成本高，跟不上平台流量热点',
    gain: '每月节省 ¥8,000+ 制作成本，出片速度提升 10x',
    image: '/index/跨境电商.png',
  },
  {
    emoji: '🎬',
    role: 'MCN 内容机构',
    color: '#00E599',
    tags: ['多账号管理', '数据驱动', '追求爆款'],
    needs: '批量生成高转化视频内容，统一管理多个账号',
    pain: '创作团队产能有限，难以规模化复制爆款内容',
    gain: '单人管理 10+ 账号，内容产出效率翻 5 倍',
    image: '/index/mcn.png',
  },
  {
    emoji: '✨',
    role: 'OPC带货个体',
    color: '#a78bfa',
    tags: ['个人运营', '零剪辑基础', '学习爆款'],
    needs: '低门槛制作专业视频，快速学习爆款创作技巧',
    pain: '缺乏专业技能，无法低成本制作高质量内容',
    gain: '从零基础到第一条破万播放，平均 3 天',
    image: '/index/opc超级个体.png',
  },
];

// ── 竞品对比六维矩阵深度调研数据 ─────────────────────────────────────────
interface ComparisonRow {
  dimension: string;
  dimDesc: string;
  icon: any;
  ourProduct: {
    title: string;
    details: string;
    highlight: string;
  };
  generalAi: {
    title: string;
    details: string;
  };
  avatarTool: {
    title: string;
    details: string;
  };
  traditionalMcn: {
    title: string;
    details: string;
  };
}

const comparisonRows: ComparisonRow[] = [
  {
    dimension: '电商爆款脚本策划',
    dimDesc: '卖点挖掘与黄金Hook',
    icon: Wand2,
    ourProduct: {
      title: 'AI 自动提炼核心卖点',
      details: '痛点拆解 + 黄金前3秒Hook · 内置上万套实战带货分镜',
      highlight: '3秒完播率提升 61%',
    },
    generalAi: {
      title: '需手工调试英文Prompt',
      details: '无电商货盘认知 · 无法直接生成带货逻辑',
    },
    avatarTool: {
      title: '仅提供通用企业讲稿',
      details: '缺乏促单逻辑 · 需人工逐字撰写繁杂台词',
    },
    traditionalMcn: {
      title: '编导团队人工策划',
      details: '单条耗时 2~3 天 · 水准不稳定且成本高',
    },
  },
  {
    dimension: '拟真带货数字人',
    dimDesc: '口型表现与多语种出海',
    icon: Users2,
    ourProduct: {
      title: '超拟真带货主播阵列',
      details: '手势与口型精准对齐 · 28+出海本土口音俚语',
      highlight: '28+国出海语种全覆盖',
    },
    generalAi: {
      title: '无专属带货主播',
      details: '画面随机生成 · 面容与口型无法稳定保持',
    },
    avatarTool: {
      title: '机械生硬站桩播报',
      details: '多为企业宣讲会议形象 · 缺乏带货激情',
    },
    traditionalMcn: {
      title: '高薪雇佣外模/真人',
      details: '外模 ¥2,000+/场 · 跨国排期长沟通繁琐',
    },
  },
  {
    dimension: '分镜混剪与商品特写',
    dimDesc: '多机位卡点与特效渲染',
    icon: Film,
    ourProduct: {
      title: '全自动多机位分镜合成',
      details: '手持特写与痛点场景混剪 · 智能卡点BGM花字',
      highlight: '多机位智能卡点出片',
    },
    generalAi: {
      title: '单段随机 5 秒画面',
      details: '仅生成单一镜头短片 · 无法识别商品特写混剪',
    },
    avatarTool: {
      title: '单一机位站桩播报',
      details: '无商品特写分镜与转场切片 · 视觉枯燥易跳出',
    },
    traditionalMcn: {
      title: '后期逐帧人工剪辑',
      details: '依赖专业摄影棚拍摄 · 剪辑后期周期长成本高',
    },
  },
  {
    dimension: '带货促单营销组件',
    dimDesc: '小黄车与优惠券ROI闭环',
    icon: Zap,
    ourProduct: {
      title: '原生带货促单营销挂件',
      details: '内置小黄车/立减券/买家动态弹幕/热卖角标',
      highlight: '带货 ROI 提升 4.8x',
    },
    generalAi: {
      title: '零电商转化组件',
      details: '纯影视短片 · 无法挂载任何电商促单营销挂件',
    },
    avatarTool: {
      title: '仅支持基础静态字幕',
      details: '无营销浮层与互动组件 · 转化率极低',
    },
    traditionalMcn: {
      title: '美工额外包装贴片',
      details: '需平面美工单独设计贴片 · 增加协作链条',
    },
  },
  {
    dimension: '生成效率与矩阵铺量',
    dimDesc: '极速出片与批量高并发',
    icon: Sparkles,
    ourProduct: {
      title: '48 秒极速出片 · 批量矩阵',
      details: '平均 48 秒/条 · 一键批量生成 100+ 组多语言带货切片',
      highlight: '48秒极速生成 · 规模化',
    },
    generalAi: {
      title: '排队 3~10 分钟/条',
      details: '生成耗时漫长且偶发失败 · 难以批量高并发测款',
    },
    avatarTool: {
      title: '单条渲染 5~15 分钟',
      details: '逐条排队合成 · 缺乏针对电商快速批量测款能力',
    },
    traditionalMcn: {
      title: '制作周期 3~7 天/条',
      details: '流程笨重缓慢 · 容易错失爆款热点流量',
    },
  },
  {
    dimension: '单条综合制作成本',
    dimDesc: '综合成本与试错门槛',
    icon: TrendingUp,
    ourProduct: {
      title: '低至 ¥0.5 / 条（降本99%）',
      details: '单条低至几毛钱 · 极低试错成本撬动海量自然与付费流',
      highlight: '低至 ¥0.5/条 · 首批免费',
    },
    generalAi: {
      title: '约 ¥15 ~ ¥30 / 条',
      details: '算力扣点昂贵 · 废片率高实际单条成本不可控',
    },
    avatarTool: {
      title: '约 ¥10 ~ ¥50 / 条',
      details: '采用按分钟的高额订阅制 · 批量制作成本压力大',
    },
    traditionalMcn: {
      title: '¥800 ~ ¥3,000 / 条',
      details: '场地设备与主播人工薪酬高 · 中小团队无力承担',
    },
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
          HERO 区 (3D & 电商 AIGC 视觉沉浸优化)
      ══════════════════════════════════════════════════════ */}
      <LandingHero
        onGoToApp={goToApp}
        onScrollToPromo={() => {
          document.getElementById('功能')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

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
          <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible pb-6 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 gap-6 snap-x snap-mandatory scrollbar-none items-stretch">
            {personas.map((p, i) => {
              const { ref, inView } = useInView(0.15);
              return (
                <div key={p.role} ref={ref}
                  className={cn(
                    'transition-all duration-700 w-[82vw] sm:w-[350px] md:w-auto shrink-0 snap-center flex flex-col self-stretch min-h-[510px] md:min-h-0',
                    inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  )}
                  style={{ transitionDelay: `${i * 120}ms` }}>
                  <TiltCard className="h-full flex-1 flex flex-col self-stretch">
                    <div className="rounded-2xl p-5 h-full landing-card-dark transition-all duration-300 hover:shadow-2xl flex flex-col justify-between flex-1 self-stretch"
                      style={{ '--hover-glow': p.color } as React.CSSProperties}>
                      
                      {/* 人物画像对应真实头像/形象图 */}
                      <div className="relative w-full h-44 rounded-xl overflow-hidden mb-4 border border-white/10 group bg-black/40 shrink-0">
                        <img
                          src={p.image}
                          alt={p.role}
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#10131a] via-[#10131a]/30 to-transparent" />
                        <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                          <span className="text-2xl drop-shadow">{p.emoji}</span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/15">
                            {p.role}
                          </span>
                        </div>
                      </div>

                      {/* 标签列表 */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4 shrink-0 min-h-[30px]">
                        {p.tags.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* 三联核心内容块（等高自适应） */}
                      <div className="space-y-3 text-sm flex-1 flex flex-col justify-between">
                        <div className="p-3 rounded-xl min-h-[70px] flex flex-col justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-white/40 text-xs mb-1">核心需求</p>
                          <p className="text-white/75 text-pretty leading-relaxed text-xs sm:text-sm">{p.needs}</p>
                        </div>
                        <div className="p-3 rounded-xl min-h-[70px] flex flex-col justify-center" style={{ background: 'rgba(255,60,60,0.05)', border: '1px solid rgba(255,60,60,0.1)' }}>
                          <p className="text-red-400/60 text-xs mb-1">痛点</p>
                          <p className="text-white/60 text-pretty leading-relaxed text-xs sm:text-sm">{p.pain}</p>
                        </div>
                        <div className="p-3 rounded-xl min-h-[70px] flex flex-col justify-center" style={{ background: `${p.color}08`, border: `1px solid ${p.color}20` }}>
                          <p className="text-xs mb-1" style={{ color: `${p.color}99` }}>使用后收益</p>
                          <p className="font-semibold text-pretty leading-relaxed text-xs sm:text-sm" style={{ color: p.color }}>{p.gain}</p>
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
                    <div className="rounded-2xl p-3.5 sm:p-5 h-full group cursor-default landing-card-dark transition-all duration-300 hover:shadow-xl flex flex-col"
                      style={{ '--glow': f.glow } as React.CSSProperties}>
                      
                      {/* 核心功能对应图片展示（高度按图片真实比例放大，确保封面完整显示） */}
                      <div className="relative w-full aspect-[1504/1046] rounded-xl overflow-hidden mb-3.5 border border-white/10 bg-black/40 group-hover:border-white/25 transition-colors">
                        <img
                          src={f.image}
                          alt={f.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-[0.88]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1118] via-[#0e1118]/25 to-transparent" />
                        <div
                          className="absolute top-2.5 left-2.5 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md"
                          style={{ background: `${f.color}30`, border: `1px solid ${f.color}60` }}
                        >
                          <f.icon className="w-4 h-4" style={{ color: f.color }} />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1.5 text-balance">{f.title}</h3>
                      <p className="text-xs sm:text-sm text-white/50 leading-relaxed text-pretty flex-1">{f.desc}</p>

                      {/* 底部装饰线 */}
                      <div className="mt-3 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
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
          竞品分析（重磅全新设计：六维带货竞品全面对比表格）
      ══════════════════════════════════════════════════════ */}
      <section id="竞品对比" className="py-24 landing-section-dark relative overflow-hidden">
        {/* 背景微弱环境辉光 */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[350px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <SectionTitle
            tag="竞品对比"
            title={<>为什么选择<br /><span style={{ color: '#00E599' }}>电商AIGC</span>？</>}
            sub="与传统视频制作和基础AI工具的六维全面对比"
          />

          {/* ════════ 全新六维矩阵对比表格（突出本项目位于对比左侧首列） ════════ */}
          <div
            ref={radarRef}
            className={cn(
              'transition-all duration-1000',
              radarInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            )}
          >
            {/* 表格容器 */}
            <div className="rounded-2xl border border-white/10 bg-[#0f1219]/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      {/* 维度列 */}
                      <th className="py-5 px-5 text-sm font-semibold text-white/50 w-[18%]">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-white/40" />
                          <span>六大对比维度</span>
                        </div>
                      </th>

                      {/* 🌟 核心高亮：Shopro 电商AIGC (本项目 - 位于表格左侧第一列) */}
                      <th className="py-5 px-5 w-[30%] bg-gradient-to-b from-orange-500/15 via-orange-500/8 to-transparent border-x-2 border-t-2 border-orange-500/60 relative">
                        <div className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-md bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] font-extrabold text-white tracking-wider uppercase shadow-md flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          TOP 推荐 · 电商爆款首选
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <div>
                            <span className="text-base font-black text-white flex items-center gap-1.5">
                              Shopro 电商AIGC
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-[#FF6B00] border border-orange-500/40 font-mono">
                                4.0
                              </span>
                            </span>
                            <p className="text-xs text-[#00E599] font-medium mt-0.5">全流程带货闭环 · 产出即爆单</p>
                          </div>
                          <span className="text-xl">🚀</span>
                        </div>
                      </th>

                      {/* 竞品 1：通用视频 AI 大模型 */}
                      <th className="py-5 px-4 text-xs font-semibold text-white/70 w-[18%] border-r border-white/5 bg-white/[0.01]">
                        <p className="text-sm font-bold text-white/90">通用视频 AI</p>
                        <p className="text-[11px] text-white/40 font-normal mt-0.5">Sora / Runway / Kling 等</p>
                      </th>

                      {/* 竞品 2：基础数字人软件 */}
                      <th className="py-5 px-4 text-xs font-semibold text-white/70 w-[17%] border-r border-white/5 bg-white/[0.01]">
                        <p className="text-sm font-bold text-white/90">基础数字人工具</p>
                        <p className="text-[11px] text-white/40 font-normal mt-0.5">HeyGen / 剪映数字人等</p>
                      </th>

                      {/* 竞品 3：传统人工拍摄与MCN */}
                      <th className="py-5 px-4 text-xs font-semibold text-white/70 w-[17%] bg-white/[0.01]">
                        <p className="text-sm font-bold text-white/90">传统实拍与MCN</p>
                        <p className="text-[11px] text-white/40 font-normal mt-0.5">外包拍摄团队 / 摄影棚</p>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5 text-xs">
                    {comparisonRows.map((row, idx) => {
                      const IconComponent = row.icon;
                      return (
                        <tr key={row.dimension} className="hover:bg-white/[0.015] transition-colors group">
                          {/* 维度描述 */}
                          <td className="py-4 px-5 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 rounded-lg bg-white/5 text-orange-400 group-hover:bg-orange-500/15 transition-colors shrink-0 mt-0.5">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm leading-snug">{row.dimension}</p>
                                <p className="text-[11px] text-white/40 mt-0.5">{row.dimDesc}</p>
                              </div>
                            </div>
                          </td>

                          {/* 🌟 我们的产品 (高亮第一列) */}
                          <td className="py-4 px-5 align-top bg-gradient-to-b from-orange-500/[0.06] to-transparent border-x-2 border-orange-500/40 relative">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[#00E599] font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4 shrink-0 fill-[#00E599]/20" />
                                <span>{row.ourProduct.title}</span>
                              </div>
                              <p className="text-white/75 text-[11px] leading-relaxed text-pretty">
                                {row.ourProduct.details}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-medium text-orange-300">
                                <span>✨</span>
                                <span>{row.ourProduct.highlight}</span>
                              </div>
                            </div>
                          </td>

                          {/* 通用视频AI */}
                          <td className="py-4 px-4 align-top text-white/55 border-r border-white/5">
                            <div className="space-y-1">
                              <p className="font-semibold text-white/80 flex items-center gap-1 text-[11px]">
                                <XCircle className="w-3.5 h-3.5 text-red-400/80 shrink-0" />
                                {row.generalAi.title}
                              </p>
                              <p className="text-[11px] text-white/40 leading-relaxed text-pretty">
                                {row.generalAi.details}
                              </p>
                            </div>
                          </td>

                          {/* 基础数字人 */}
                          <td className="py-4 px-4 align-top text-white/55 border-r border-white/5">
                            <div className="space-y-1">
                              <p className="font-semibold text-white/80 flex items-center gap-1 text-[11px]">
                                <XCircle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                                {row.avatarTool.title}
                              </p>
                              <p className="text-[11px] text-white/40 leading-relaxed text-pretty">
                                {row.avatarTool.details}
                              </p>
                            </div>
                          </td>

                          {/* 传统实拍与MCN */}
                          <td className="py-4 px-4 align-top text-white/55">
                            <div className="space-y-1">
                              <p className="font-semibold text-white/80 flex items-center gap-1 text-[11px]">
                                <XCircle className="w-3.5 h-3.5 text-red-400/80 shrink-0" />
                                {row.traditionalMcn.title}
                              </p>
                              <p className="text-[11px] text-white/40 leading-relaxed text-pretty">
                                {row.traditionalMcn.details}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 底部保障与行动通栏 */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500/10 via-emerald-500/5 to-transparent border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/70">
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <Check className="w-4 h-4 text-[#00E599]" />
                    专注电商短视频转化
                  </span>
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <Check className="w-4 h-4 text-[#00E599]" />
                    全自动分镜+出海多语言
                  </span>
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <Check className="w-4 h-4 text-[#00E599]" />
                    低至 ¥0.5/条，注册即享 5 个免费名额
                  </span>
                </div>

                <button
                  onClick={goToApp}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all shadow-[0_0_20px_rgba(255,107,0,0.35)] hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  立即体验 Shopro 电商AIGC
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
