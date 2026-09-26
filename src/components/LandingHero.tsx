import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Play, ArrowRight, Check,
  Video, Flame,
  Volume2, Heart, MessageCircle, Bookmark, Share2,
  ExternalLink, ShoppingBag, X, Gift, Smile, UserPlus,
  Send, Sparkles, Trophy, Tag, CheckCircle2, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingHeroProps {
  onGoToApp: () => void;
  onScrollToPromo?: () => void;
}

// ── 粒子微光背景 ──────────────────────────────────────────────────────────
function HeroParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 26 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      delay: Math.random() * 6,
      duration: Math.random() * 8 + 8,
      color: i % 3 === 0 ? '#FF6B00' : i % 3 === 1 ? '#00E599' : '#00B4D8',
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-0"
          style={{
            left: `${p.x}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            animation: `particle-drift ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── 轮播电商爆款商品数据（引用 public/shop 下的高清极速 WebP 及 JPG 备份） ─────────────
const shopProducts = [
  {
    id: 1,
    image: '/shop/phone_slide_1.webp',
    fallbackImage: '/shop/phone_slide_1.jpg',
    title: '01 Pro Max 智能降噪蓝牙耳机',
    price: '299',
    originalPrice: '599',
    sales: '18,520+',
    hook: '戴上瞬间噪音全消，地铁通勤降噪黑科技！',
    coupon: '单件返50元',
    fullReduction: '满1200减240',
    hotCount: '热卖×36',
    isLowest: '近30天低价',
  },
  {
    id: 2,
    image: '/shop/phone_slide_2.webp',
    fallbackImage: '/shop/phone_slide_2.jpg',
    title: '02 极光高定轻奢智能焕肤仪',
    price: '389',
    originalPrice: '799',
    sales: '12,410+',
    hook: '7天改善暗沉，宅家畅享院线级SPA！',
    coupon: '单件返80元',
    fullReduction: '满1200减240',
    hotCount: '热卖×28',
    isLowest: '近30天低价',
  },
  {
    id: 3,
    image: '/shop/phone_slide_3.webp',
    fallbackImage: '/shop/phone_slide_3.jpg',
    title: '03 潮流极简防泼水机能双肩包',
    price: '199',
    originalPrice: '399',
    sales: '25,600+',
    hook: '超轻减负分区仓位，雨天出行无忧！',
    coupon: '单件返30元',
    fullReduction: '满1200减240',
    hotCount: '热卖×24',
    isLowest: '近30天低价',
  },
  {
    id: 4,
    image: '/shop/phone_slide_4.webp',
    fallbackImage: '/shop/phone_slide_4.jpg',
    title: '04 4K超清电子防抖户外运动相机',
    price: '699',
    originalPrice: '1299',
    sales: '9,340+',
    hook: '剧烈颠簸依然丝滑，第一视角记录高光！',
    coupon: '单件返100元',
    fullReduction: '满1200减240',
    hotCount: '热卖×42',
    isLowest: '近30天低价',
  },
  {
    id: 5,
    image: '/shop/phone_slide_5.webp',
    fallbackImage: '/shop/phone_slide_5.jpg',
    title: '05 智能恒温双层便携随行咖啡杯',
    price: '149',
    originalPrice: '299',
    sales: '31,200+',
    hook: '6小时长效锁温锁鲜，口口都是现磨风味！',
    coupon: '单件返20元',
    fullReduction: '满1200减240',
    hotCount: '热卖×58',
    isLowest: '近30天低价',
  },
  {
    id: 6,
    image: '/shop/phone_slide_6.webp',
    fallbackImage: '/shop/phone_slide_6.jpg',
    title: '06 复古极光氛围感蓝牙黑胶立体声',
    price: '259',
    originalPrice: '499',
    sales: '15,800+',
    hook: '360°环绕澎湃重低音，卧室秒变音乐现场！',
    coupon: '单件返40元',
    fullReduction: '满1200减240',
    hotCount: '热卖×19',
    isLowest: '近30天低价',
  },
];

// ── 真实抖音直播弹幕互动库 ────────────────────────────────────────────────
interface DanmakuItem {
  id: number;
  badge: string;
  badgeBg: string;
  user: string;
  text: string;
  color: string;
  timestamp?: number;
}

const danmakuPool: DanmakuItem[] = [
  { id: 1, badge: '🛒 正在购买', badgeBg: 'bg-orange-500/90', user: '用户***8392', text: '刚拍下1号链接，求快发货！', color: '#ffb020' },
  { id: 2, badge: '💖 铁粉LV.8', badgeBg: 'bg-pink-500/90', user: '跨境小陈', text: 'AI分镜做出来的视频播放直接破10万了🔥', color: '#38bdf8' },
  { id: 3, badge: '🔥 助理播报', badgeBg: 'bg-red-500/90', user: '官方管家', text: '单件返50元！满1200再减240，先到先得！', color: '#f43f5e' },
  { id: 4, badge: '👑 榜一大哥', badgeBg: 'bg-amber-500/90', user: '欧美精品馆', text: '昨晚用Shopro批量出了30条带货视频，转化翻倍！', color: '#fbbf24' },
  { id: 5, badge: '✨ 新进直播', badgeBg: 'bg-emerald-500/90', user: '出海卖家Linda', text: '进入了带货直播间', color: '#34d399' },
  { id: 6, badge: '🛒 正在购买', badgeBg: 'bg-orange-500/90', user: 'TikTok大卖Jack', text: '已拼单，多语言自动翻译太给力了！', color: '#ff8a00' },
];

export default function LandingHero({ onGoToApp, onScrollToPromo }: LandingHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // 点赞动效
  const [likeCount, setLikeCount] = useState(38620);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number }[]>([]);

  // 关注状态
  const [isFollowed, setIsFollowed] = useState(false);
  // 收藏状态
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 抖音式轻提示 Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 弹窗状态管理
  const [showCartDrawer, setShowCartDrawer] = useState(false); // 小黄车货架/商品详情抽屉
  const [showCommentsModal, setShowCommentsModal] = useState(false); // 评论列表
  const [showShareModal, setShowShareModal] = useState(false); // 分享弹窗
  const [showGiftModal, setShowGiftModal] = useState(false); // 礼物面板
  const [showHostModal, setShowHostModal] = useState(false); // 主播名片
  const [showAudienceModal, setShowAudienceModal] = useState(false); // 在线观众榜

  // 快速评论输入
  const [commentInput, setCommentInput] = useState('');

  // 动态滚动弹幕列表
  const [activeDanmaku, setActiveDanmaku] = useState<DanmakuItem[]>(() => danmakuPool.slice(0, 3));
  const poolIndexRef = useRef(3);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2200);
  };

  // ── 轮播图极速预加载池：全量 WebP 内存预载，实现秒开与切换零卡顿 ──
  const [_loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    shopProducts.forEach((p, idx) => {
      const img = new Image();
      img.src = p.image;
      img.onload = () => {
        setLoadedImages(prev => ({ ...prev, [idx]: true }));
      };
      if (p.fallbackImage) {
        const fallback = new Image();
        fallback.src = p.fallbackImage;
      }
    });
  }, []);

  // 移动端侦测与适配
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 商品图片自动平滑轮播（纯自动轮播，去除多余点击切换小部件）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % shopProducts.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  // 抖音直播弹幕动态自下而上推移更新（每 2.2 秒推进一条新消息）
  useEffect(() => {
    const dTimer = setInterval(() => {
      const nextItem = danmakuPool[poolIndexRef.current % danmakuPool.length];
      poolIndexRef.current += 1;
      setActiveDanmaku(prev => {
        return [...prev.slice(1), { ...nextItem, timestamp: Date.now() }];
      });
    }, 2200);
    return () => clearInterval(dTimer);
  }, []);

  // 鼠标 3D 视差倾斜计算
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setRotate({
      x: -y * 10,
      y: x * 12,
    });
  }, [isMobile]);

  const handleMouseEnter = () => {
    if (!isMobile) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      setRotate({ x: 0, y: 0 });
    }
  };

  // 点赞粒子动效
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeCount(prev => prev + 1);
    const newHeart = { id: Date.now() + Math.random(), left: Math.floor(Math.random() * 20) - 10 };
    setFloatingHearts(prev => [...prev.slice(-6), newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);
  };

  // 发送用户自定义弹幕
  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;
    const newDanmaku: DanmakuItem = {
      id: Date.now(),
      badge: '💬 我说',
      badgeBg: 'bg-emerald-500/90',
      user: '我',
      text: commentInput.trim(),
      color: '#00E599',
      timestamp: Date.now(),
    };
    setActiveDanmaku(prev => [...prev.slice(1), newDanmaku]);
    setCommentInput('');
    setShowCommentsModal(false);
    showToast('弹幕发送成功！');
  };

  const currentProduct = shopProducts[currentIdx];

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative min-h-[92vh] lg:min-h-screen flex flex-col justify-center overflow-hidden landing-hero-bg pt-20 pb-12 sm:pt-24 sm:pb-16 touch-manipulation',
        // 移动端保留文本选择能力，避免部分触屏浏览器 user-select:none 吞掉首击
        !isMobile && 'select-none'
      )}
    >
      {/* ── 背景网格与光晕层 ── */}
      <div className="absolute inset-0 hero-cyber-grid opacity-70 pointer-events-none" />
      <HeroParticles />

      {/* 动态径向主光晕 */}
      <div
        className="absolute top-10 left-1/4 w-[420px] h-[420px] md:w-[600px] md:h-[600px] rounded-full pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,0,0.22) 0%, rgba(255,107,0,0.06) 45%, transparent 75%)',
          filter: 'blur(55px)',
          transform: `translate(${rotate.y * 3}px, ${rotate.x * 3}px)`,
        }}
      />
      <div
        className="absolute bottom-10 right-1/6 w-[360px] h-[360px] md:w-[520px] md:h-[520px] rounded-full pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(0,229,153,0.18) 0%, rgba(0,180,216,0.06) 50%, transparent 80%)',
          filter: 'blur(55px)',
          transform: `translate(${-rotate.y * 2.5}px, ${-rotate.x * 2.5}px)`,
        }}
      />

      {/* ── 核心内容容器 ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

          {/* ════════════════════════════════════════════════════
              左侧文案与转化引导（CTA）- 移动端置于手机壳下方 (order-2 lg:order-1)
          ════════════════════════════════════════════════════ */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left pt-2 lg:pt-0">

            {/* 顶部标签胶囊 */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 backdrop-blur-md text-xs font-semibold mb-6 tracking-wide shadow-[0_0_20px_rgba(255,107,0,0.15)] group hover:border-orange-500/70 transition-all cursor-default">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[#FF6B00] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-current text-[#FF6B00]" />
                2026 电商 AIGC 爆款带货短视频引擎 4.0
              </span>
              <span className="hidden sm:inline-block text-white/30">|</span>
              <span className="hidden sm:inline-block text-white/70">跨境出海首选</span>
            </div>

            {/* 主标题 */}
            <h1 className="font-black tracking-tight mb-6 flex flex-col items-center lg:items-start gap-3 sm:gap-4 lg:gap-5">
              <span className="text-3xl sm:text-5xl lg:text-6xl text-white drop-shadow-sm leading-tight">
                让全球生意更简单！
              </span>
              <span className="landing-gradient-text drop-shadow-[0_4px_30px_rgba(255,107,0,0.35)] whitespace-nowrap text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-[42px] xl:text-5xl 2xl:text-6xl leading-tight lg:-ml-10 xl:-ml-16 2xl:-ml-[88px]">
                跨境电商AIGC带货视频生成
              </span>
            </h1>

            {/* 副标题：严格按要求更新核心文案 */}
            <p className="text-base sm:text-lg text-white/70 max-w-xl mb-6 leading-relaxed text-pretty font-normal">
              粘贴商品链接或上传图片，AI全自动提取带货、撰写爆款脚本、合成真实数字人出镜。
              <span className="text-[#00E599] font-medium ml-1">无需专业摄影与剪辑</span>，1分钟低成本规模化产出！
            </p>

            {/* 出海电商平台生态背书 */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-7 text-xs text-white/60">
              <span className="text-white/40 text-[11px] mr-1">支持全平台电商出海：</span>
              {['TikTok Shop', 'Amazon', 'Shopee', 'Shopify', 'Temu', 'Lazada'].map((platform, idx) => (
                <span
                  key={platform}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
                    idx === 0
                      ? 'bg-orange-500/15 border-orange-500/35 text-orange-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/25 hover:text-white'
                  )}
                >
                  {platform}
                </span>
              ))}
            </div>

            {/* 核心 CTA 行动组 */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center lg:justify-start items-center mb-8">
              {/* 主 CTA 按钮 */}
              <button
                onClick={onGoToApp}
                className="group relative w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-bold text-white overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-[0_8px_32px_rgba(255,107,0,0.45)] hover:shadow-[0_12px_45px_rgba(255,107,0,0.6)] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #ff8c00 50%, #ff5500 100%)' }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 fill-white" />
                  立即免费生成带货视频
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
                </span>
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                    animation: 'scan-line 1.2s ease infinite',
                  }}
                />
              </button>

              {/* 演示视频快速入口 */}
              {onScrollToPromo && (
                <button
                  onClick={onScrollToPromo}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white/85 border border-white/15 hover:border-orange-500/40 hover:text-white transition-all duration-200 bg-white/4 hover:bg-orange-500/8 backdrop-blur-md cursor-pointer"
                >
                  <Video className="w-4 h-4 text-[#FF6B00]" />
                  观看实操演示
                </button>
              )}

              {/* 开源文档按钮 */}
              <a
                href="https://my.feishu.cn/wiki/FF9KwlgBQihnK5kkzT5c6lI5nub?from=from_copylink"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-sm font-medium text-white/60 hover:text-white/95 border border-white/10 hover:border-white/20 transition-all duration-200 bg-white/2 hover:bg-white/5 backdrop-blur-sm"
              >
                <span>飞书手册</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>

            {/* 信任信号背书 */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-white/45">
              {[
                '免费体验 5 个视频',
                '无需绑定信用卡',
                '1 分钟极速出片',
                '支持 1080P 高清导出',
              ].map(item => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#00E599]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════
              右侧 3D 手机抖音/TikTok真实直播带货终端 - 移动端置顶 (order-1 lg:order-2)
          ════════════════════════════════════════════════════ */}
          <div className="order-1 lg:order-2 lg:col-span-5 relative flex items-center justify-center mb-6 lg:mb-0 mt-2 lg:mt-0">

            {/* 3D 透视舞台容器 */}
            <div
              className={cn(
                'relative w-full max-w-[290px] xs:max-w-[320px] sm:max-w-[360px] lg:max-w-[380px] aspect-[9/18.5] max-h-[580px] sm:max-h-[640px] lg:max-h-[680px] transition-transform duration-300 ease-out preserve-3d',
                isHovered ? 'shadow-[0_25px_90px_rgba(255,107,0,0.35)]' : 'shadow-[0_20px_70px_rgba(0,0,0,0.85)]'
              )}
              style={{
                // 移动端关闭 3D 透视与倾斜变换：避免触屏命中检测偏移导致屏幕内组件点击失效
                perspective: isMobile ? undefined : '1200px',
                transform: isMobile
                  ? 'none'
                  : `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(10px)`,
                touchAction: 'manipulation',
              }}
            >
              {/* 3D 地盘全息投影基座 */}
              <div
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-80 h-20 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(255,107,0,0.6) 0%, rgba(0,229,153,0.25) 50%, transparent 75%)',
                  transform: 'rotateX(75deg) translateZ(-40px)',
                  filter: 'blur(12px)',
                }}
              />

              {/* ── 手机外围柔和流动炫光光晕（Soft Glare Ambient Glow） ── */}
              <div className="absolute -inset-3 sm:-inset-4 rounded-[48px] pointer-events-none overflow-hidden opacity-30 blur-2xl animate-flare-pulse">
                <div
                  className="w-[200%] h-[200%] -top-[50%] -left-[50%] absolute animate-spin-glow"
                  style={{
                    background: 'conic-gradient(from 0deg, #FF6B00 0deg, #ff007f 75deg, #a855f7 150deg, #00E599 220deg, #00B4D8 290deg, #FF6B00 360deg)',
                    animationDuration: '10s',
                  }}
                />
              </div>

              {/* ── 手机外壳紧密流光描边环（Refined Neon Edge Shimmer） ── */}
              <div className="absolute -inset-[2px] rounded-[44px] pointer-events-none p-[1.5px] overflow-hidden opacity-60">
                <div
                  className="w-[200%] h-[200%] -top-1/2 -left-1/2 absolute animate-spin-glow"
                  style={{
                    background: 'conic-gradient(from 180deg, rgba(255,107,0,0.8) 0deg, rgba(255,0,128,0.7) 90deg, rgba(0,229,153,0.8) 180deg, rgba(0,180,216,0.8) 270deg, rgba(255,107,0,0.8) 360deg)',
                    animationDuration: '7s',
                  }}
                />
              </div>

              {/* ────────────────────────────────────────────────
                  真实感手机机身（Smartphone Live Body）
              ──────────────────────────────────────────────── */}
              <div className="relative w-full h-full rounded-[42px] p-2.5 bg-gradient-to-b from-[#242836] via-[#141720] to-[#0c0e14] border-2 border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_0_35px_rgba(255,107,0,0.2)] flex flex-col overflow-hidden group/device">

                {/* 金属边框高光 */}
                <div className="absolute inset-0 rounded-[40px] border border-orange-500/25 pointer-events-none" />

                {/* 屏幕内芯：抖音/TikTok 直播全屏视窗（touch-manipulation 去除移动端 300ms 点击延迟） */}
                <div className="relative w-full h-full rounded-[32px] bg-black overflow-hidden flex flex-col border border-white/10 select-none touch-manipulation">

                  {/* ── 轮播商品主图（极速预加载、WebP+JPG 双通道、硬件加速防卡顿） ── */}
                  <div className="absolute inset-0 z-0 bg-neutral-950 overflow-hidden">
                    {shopProducts.map((p, idx) => {
                      const isActive = idx === currentIdx;
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            'absolute inset-0 transition-all duration-700 ease-in-out will-change-[opacity,transform]',
                            isActive
                              ? 'opacity-100 scale-100 z-10'
                              : 'opacity-0 scale-105 pointer-events-none z-0'
                          )}
                          style={{ transform: 'translateZ(0)' }}
                        >
                          <picture>
                            <source srcSet={p.image} type="image/webp" />
                            <img
                              src={p.fallbackImage || p.image}
                              alt={p.title}
                              loading={idx === 0 ? 'eager' : 'lazy'}
                              fetchPriority={idx === 0 ? 'high' : 'auto'}
                              decoding={idx === 0 ? 'sync' : 'async'}
                              className="w-full h-full object-cover object-center filter brightness-[1.0] contrast-[1.03]"
                            />
                          </picture>
                          {/* 仅在顶部与底部保留轻量渐变，保证文字易读的同时中间主体完全通透 */}
                          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/55 via-black/15 to-transparent pointer-events-none" />
                          <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
                        </div>
                      );
                    })}
                  </div>

                  {/* ────────────────────────────────────────────
                      1. 顶部状态栏与灵动岛
                  ──────────────────────────────────────────── */}
                  <div className="relative z-30 flex items-center justify-between px-4 pt-2 text-[10px] text-white/80">
                    <span className="font-mono font-medium">9:41</span>
                    {/* 灵动岛药丸 */}
                    <div className="w-20 h-4 bg-black/90 rounded-full flex items-center justify-center gap-1.5 px-2 border border-white/15 shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[8px] text-white/80 font-mono tracking-tight">AI 4.0</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3 h-3 text-orange-400" />
                      <span className="text-[8px] text-[#00E599] font-mono font-bold">5G</span>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────
                      2. 抖音直播间顶部：主播胶囊与在线观众
                  ──────────────────────────────────────────── */}
                  <div className="relative z-30 flex items-center justify-between px-3 pt-2">
                    {/* 主播信息胶囊（点击查看主播名片） */}
                    <div
                      onClick={() => setShowHostModal(true)}
                      className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 cursor-pointer hover:bg-black/75 transition-colors"
                    >
                      {/* 头像 */}
                      <div className="relative w-7 h-7 rounded-full overflow-hidden border border-orange-500 bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5">
                        <img
                          src="/shopro.png"
                          alt="Shopro"
                          className="w-full h-full object-contain rounded-full bg-black"
                        />
                      </div>
                      <div className="leading-none text-left">
                        <p className="text-[10px] font-bold text-white flex items-center gap-1">
                          Shopro带货官
                          <span className="text-[8px] px-1 py-0.2 rounded bg-orange-500 text-white font-mono">LIVE</span>
                        </p>
                        <p className="text-[8px] text-white/60 font-mono mt-0.5">🔥 带货总榜 No.1</p>
                      </div>
                      {/* 关注按钮（点击即刻关注交互） */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFollowed(!isFollowed);
                          showToast(isFollowed ? '已取消关注' : '已关注主播！开播即刻提醒');
                        }}
                        className={cn(
                          'ml-1 px-1.5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-md',
                          isFollowed
                            ? 'bg-white/20 text-white/80'
                            : 'bg-gradient-to-r from-[#FF6B00] to-[#ff2e63] text-white hover:scale-105 active:scale-95'
                        )}
                      >
                        {isFollowed ? '已关注' : '+关注'}
                      </button>
                    </div>

                    {/* 在线观众席与关闭（点击查看观众榜单） */}
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => setShowAudienceModal(true)}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                      >
                        <div className="flex items-center -space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/80 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">
                            A
                          </div>
                          <div className="w-5 h-5 rounded-full bg-emerald-500/80 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">
                            B
                          </div>
                          <div className="w-5 h-5 rounded-full bg-amber-500/80 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">
                            C
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-semibold text-white/90 bg-black/45 px-1.5 py-0.5 rounded-full border border-white/10">
                          2.4万
                        </span>
                      </div>
                      <div
                        onClick={() => showToast('当前为演示直播间')}
                        className="w-5 h-5 rounded-full bg-black/45 flex items-center justify-center text-white/70 border border-white/10 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────
                      3. 画面中部：AI 实时分镜状态与电商满减横幅
                  ──────────────────────────────────────────── */}
                  <div className="relative z-20 flex-1 flex flex-col justify-between p-3 pointer-events-none">
                    <div className="flex items-center justify-between pointer-events-auto">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-orange-500/40 text-[9px] text-white shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span className="font-bold text-red-400">TikTok Shop</span>
                        <span className="text-white/40">|</span>
                        <span>AI 实时生成分镜 0{currentIdx + 1}</span>
                      </div>
                      {/* 抖音直播优惠标签 */}
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-500/30 border border-red-500/50 text-red-300 backdrop-blur-md flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {currentProduct.coupon}
                      </span>
                    </div>

                    {/* 直播间热卖氛围贴纸 */}
                    <div className="flex justify-end pointer-events-auto">
                      <div className="px-2 py-1 rounded-lg bg-black/55 backdrop-blur-md border border-amber-500/40 text-[9px] text-amber-300 font-mono shadow flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span>{currentProduct.hotCount}</span>
                        <span className="text-white/50">|</span>
                        <span className="text-emerald-400">{currentProduct.isLowest}</span>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────
                      4. 画面底部：抖音弹幕流、小黄车与点赞互动
                  ──────────────────────────────────────────── */}
                  <div className="relative z-30 p-3 pt-0 flex flex-col gap-2">

                    {/* 主互动区：左侧（动态上滑弹幕 + 小黄车商品卡片）+ 右侧（点赞转发互动柱） */}
                    <div className="flex items-end justify-between gap-2.5">

                      {/* 左侧内容区 */}
                      <div className="flex-1 space-y-2 min-w-0">

                        {/* ── 真实抖音直播动态滚动弹幕流 ── */}
                        <div
                          onClick={() => setShowCommentsModal(true)}
                          className="flex flex-col gap-1.5 overflow-hidden min-h-[72px] justify-end cursor-pointer hover:opacity-95"
                        >
                          {activeDanmaku.map((item, idx) => (
                            <div
                              key={`${item.id}-${idx}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[9px] max-w-[210px] transition-all duration-500 animate-fade-in shadow-md"
                            >
                              <span className={cn('text-[8px] font-bold text-white px-1 py-0.2 rounded shrink-0 leading-tight', item.badgeBg)}>
                                {item.badge}
                              </span>
                              <span className="font-bold shrink-0 truncate max-w-[55px]" style={{ color: item.color }}>
                                {item.user}:
                              </span>
                              <span className="text-white/95 truncate">
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* ── 抖音小黄车商品卡片（点击弹出小黄车详情抽屉） ── */}
                        <div
                          onClick={() => setShowCartDrawer(true)}
                          className="p-2 rounded-2xl bg-[#0f1118]/94 backdrop-blur-xl border border-orange-500/60 shadow-[0_8px_25px_rgba(0,0,0,0.85)] flex items-center gap-2 cursor-pointer hover:border-orange-500 transition-colors group/card"
                        >
                          {/* 商品主图缩略图 */}
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black">
                            <img
                              src={currentProduct.image}
                              alt={currentProduct.title}
                              className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute top-0 left-0 bg-[#FF6B00] text-white text-[7px] font-black px-1 rounded-br">
                              0{currentProduct.id}
                            </div>
                          </div>

                          {/* 商品标题、标签与价格 */}
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] px-1 py-0.2 rounded bg-red-500/20 text-red-400 font-mono border border-red-500/30">
                                {currentProduct.coupon}
                              </span>
                              <span className="text-[7px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                {currentProduct.fullReduction}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-white truncate leading-tight mt-0.5">
                              {currentProduct.title}
                            </p>
                            <p className="text-[8px] text-[#00E599] font-mono truncate">
                              {currentProduct.hook}
                            </p>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-xs font-black text-[#FF6B00] font-mono leading-none">
                                ¥{currentProduct.price}
                              </span>
                              <span className="text-[8px] text-white/40 line-through font-mono">
                                ¥{currentProduct.originalPrice}
                              </span>
                              <span className="text-[8px] text-orange-300 font-mono ml-auto">
                                已抢 {currentProduct.sales}
                              </span>
                            </div>
                          </div>

                          {/* 立即加购 / 抢购按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCartDrawer(true);
                            }}
                            className="shrink-0 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#ff2a5f] text-white font-black text-[9px] shadow-[0_2px_10px_rgba(255,107,0,0.5)] hover:scale-105 active:scale-95 transition-transform"
                          >
                            抢购
                          </button>
                        </div>
                      </div>

                      {/* 右侧：抖音直播纵向互动点赞柱 */}
                      <div className="flex flex-col items-center gap-2.5 pb-0.5 text-white shrink-0">
                        {/* 漂浮点赞小爱心动效 */}
                        <div className="relative">
                          {floatingHearts.map(h => (
                            <div
                              key={h.id}
                              className="absolute -top-10 text-red-500 animate-ping pointer-events-none"
                              style={{ left: `${h.left}px` }}
                            >
                              ❤️
                            </div>
                          ))}
                          <button
                            onClick={handleLike}
                            className="flex flex-col items-center group/like cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md group-hover/like:scale-110 active:scale-90 transition-transform">
                              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                            </div>
                            <span className="text-[8px] font-mono text-white/80 mt-0.5">
                              {(likeCount / 1000).toFixed(1)}K
                            </span>
                          </button>
                        </div>

                        {/* 评论（点击打开评论弹窗） */}
                        <div
                          onClick={() => setShowCommentsModal(true)}
                          className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        >
                          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                            <MessageCircle className="w-4 h-4 text-white/90" />
                          </div>
                          <span className="text-[8px] font-mono text-white/80 mt-0.5">4.2K</span>
                        </div>

                        {/* 收藏（点击切换收藏并提示） */}
                        <div
                          onClick={() => {
                            setIsBookmarked(!isBookmarked);
                            showToast(isBookmarked ? '已移出收藏' : '已收藏到“我的喜欢”');
                          }}
                          className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        >
                          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                            <Bookmark className={cn('w-4 h-4 transition-colors', isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-white/80')} />
                          </div>
                          <span className="text-[8px] font-mono text-white/80 mt-0.5">18K</span>
                        </div>

                        {/* 分享（点击打开分享面板） */}
                        <div
                          onClick={() => setShowShareModal(true)}
                          className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        >
                          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                            <Share2 className="w-4 h-4 text-white/90" />
                          </div>
                          <span className="text-[8px] font-mono text-white/80 mt-0.5">分享</span>
                        </div>

                        {/* 小黄车入口图标（点击打开货架抽屉） */}
                        <div
                          className="relative mt-1 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setShowCartDrawer(true)}
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-[#FF6B00] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,107,0,0.6)] animate-bounce">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[8px] font-bold flex items-center justify-center border border-white shadow">
                            6
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 底部输入框与互动图标栏 */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                      <div
                        onClick={() => setShowCommentsModal(true)}
                        className="flex-1 h-7 rounded-full bg-white/10 backdrop-blur-md px-3 flex items-center gap-1.5 text-[9px] text-white/60 border border-white/10 cursor-pointer hover:bg-white/15 transition-colors"
                      >
                        <Smile className="w-3.5 h-3.5 text-white/50" />
                        <span>说点什么参与带货互动...</span>
                      </div>
                      {/* 礼物按钮（点击打开送礼面板） */}
                      <button
                        onClick={() => setShowGiftModal(true)}
                        className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-400 border border-white/10 hover:scale-105 transition-transform"
                      >
                        <Gift className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* ────────────────────────────────────────────
                      5. 沉浸式抖音交互弹窗系统（全仿真抽屉）
                  ──────────────────────────────────────────── */}

                  {/* 轻提示 Toast */}
                  {toastMessage && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white text-[10px] font-medium shadow-2xl flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="w-3 h-3 text-[#00E599]" />
                      <span>{toastMessage}</span>
                    </div>
                  )}

                  {/* 弹窗 A: 抖音小黄车商品详情/货架抽屉 */}
                  {showCartDrawer && (
                    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                      <div className="bg-[#121520] border-t border-white/20 rounded-t-3xl p-3.5 flex flex-col max-h-[82%] shadow-2xl text-left">
                        {/* 抽屉头部 */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-orange-400" />
                            <span className="font-bold text-xs text-white">直播间带货专享货架</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-mono">共 6 款爆品</span>
                          </div>
                          <button
                            onClick={() => setShowCartDrawer(false)}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 满减优惠通知 */}
                        <div className="my-2 p-2 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-between text-[9px]">
                          <span className="text-orange-300 font-medium">🧧 单件返50元 · 满1200减240</span>
                          <span className="text-emerald-400 font-bold">已自动领券</span>
                        </div>

                        {/* 商品大卡片展示 */}
                        <div className="flex gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10 my-1">
                          <img
                            src={currentProduct.image}
                            alt={currentProduct.title}
                            className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white truncate">{currentProduct.title}</p>
                            <p className="text-[9px] text-[#00E599] font-mono mt-0.5">{currentProduct.hook}</p>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-sm font-black text-orange-400 font-mono">¥{currentProduct.price}</span>
                              <span className="text-[9px] text-white/40 line-through font-mono">¥{currentProduct.originalPrice}</span>
                              <span className="text-[8px] text-amber-300 font-mono ml-auto">{currentProduct.isLowest}</span>
                            </div>
                          </div>
                        </div>

                        {/* 商品列表预览 */}
                        <div className="space-y-1.5 overflow-y-auto max-h-36 pr-1 scrollbar-none my-1">
                          {shopProducts.map(p => (
                            <div
                              key={p.id}
                              onClick={() => setCurrentIdx(p.id - 1)}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg text-[10px] cursor-pointer transition-colors',
                                p.id === currentProduct.id
                                  ? 'bg-orange-500/15 border border-orange-500/40 text-orange-300'
                                  : 'bg-white/3 border border-white/5 text-white/70 hover:bg-white/6'
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-white/40">0{p.id}</span>
                                <span className="truncate">{p.title}</span>
                              </div>
                              <span className="font-bold font-mono shrink-0 ml-2">¥{p.price}</span>
                            </div>
                          ))}
                        </div>

                        {/* 底部购买 CTA */}
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setShowCartDrawer(false);
                              onGoToApp();
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#ff2a5f] text-white font-bold text-xs shadow-lg hover:opacity-95"
                          >
                            立即领券抢购 (¥{currentProduct.price})
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 弹窗 B: 抖音直播评论与弹幕互动面板 */}
                  {showCommentsModal && (
                    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                      <div className="bg-[#121520] border-t border-white/20 rounded-t-3xl p-3.5 flex flex-col max-h-[75%] shadow-2xl text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
                            <span className="font-bold text-xs text-white">直播间热聊 (4.2K+)</span>
                          </div>
                          <button
                            onClick={() => setShowCommentsModal(false)}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 弹幕流列表 */}
                        <div className="space-y-2 overflow-y-auto max-h-44 py-2 scrollbar-none text-[10px]">
                          {activeDanmaku.map((m, i) => (
                            <div key={i} className="flex items-start gap-1.5 leading-snug">
                              <span className={cn('text-[8px] font-bold text-white px-1 py-0.2 rounded shrink-0', m.badgeBg)}>
                                {m.badge}
                              </span>
                              <span className="font-bold shrink-0" style={{ color: m.color }}>{m.user}:</span>
                              <span className="text-white/85">{m.text}</span>
                            </div>
                          ))}
                        </div>

                        {/* 快捷发送常用词 */}
                        <div className="flex items-center gap-1.5 py-1.5 overflow-x-auto scrollbar-none">
                          {['好划算！', '已拍加急', 'AI脚本绝了', '求加库存'].map(w => (
                            <button
                              key={w}
                              onClick={() => {
                                setCommentInput(w);
                              }}
                              className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/70 shrink-0 hover:border-orange-500/40"
                            >
                              {w}
                            </button>
                          ))}
                        </div>

                        {/* 输入框表单 */}
                        <form onSubmit={handleSendComment} className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            value={commentInput}
                            onChange={e => setCommentInput(e.target.value)}
                            placeholder="发条弹幕互动一下..."
                            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            发送
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* 弹窗 C: 抖音分享面板 */}
                  {showShareModal && (
                    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                      <div className="bg-[#121520] border-t border-white/20 rounded-t-3xl p-3.5 flex flex-col shadow-2xl text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <span className="font-bold text-xs text-white">分享到</span>
                          <button
                            onClick={() => setShowShareModal(false)}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 py-3 text-center">
                          {[
                            { name: '微信好友', icon: '💬', color: 'bg-emerald-500/20' },
                            { name: '朋友圈', icon: '🌐', color: 'bg-green-500/20' },
                            { name: '生成海报', icon: '🖼️', color: 'bg-orange-500/20' },
                            { name: '复制链接', icon: '🔗', color: 'bg-cyan-500/20' },
                          ].map(item => (
                            <button
                              key={item.name}
                              onClick={() => {
                                setShowShareModal(false);
                                showToast(`已生成 ${item.name} 分享口令！`);
                              }}
                              className="flex flex-col items-center gap-1 group"
                            >
                              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center text-lg border border-white/10', item.color)}>
                                {item.icon}
                              </div>
                              <span className="text-[9px] text-white/70">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 弹窗 D: 抖音送礼面板 */}
                  {showGiftModal && (
                    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                      <div className="bg-[#121520] border-t border-white/20 rounded-t-3xl p-3.5 flex flex-col shadow-2xl text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold text-xs text-white">带货粉丝礼物箱</span>
                          </div>
                          <button
                            onClick={() => setShowGiftModal(false)}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 py-3 text-center">
                          {[
                            { name: '小心心', cost: '1 抖币', icon: '❤️' },
                            { name: '点赞棒', cost: '10 抖币', icon: '👍' },
                            { name: '加特林', cost: '520 抖币', icon: '🚀' },
                            { name: '嘉年华', cost: '3000 抖币', icon: '🎡' },
                          ].map(g => (
                            <button
                              key={g.name}
                              onClick={() => {
                                setShowGiftModal(false);
                                setLikeCount(prev => prev + 99);
                                showToast(`送出了专属礼物【${g.name}】！`);
                              }}
                              className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/50"
                            >
                              <span className="text-xl">{g.icon}</span>
                              <span className="text-[10px] font-bold text-white">{g.name}</span>
                              <span className="text-[8px] text-amber-400 font-mono">{g.cost}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 弹窗 E: 主播名片卡 */}
                  {showHostModal && (
                    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-center items-center p-4 animate-fade-in">
                      <div className="bg-[#121520] border border-white/20 rounded-2xl p-4 w-full max-w-[240px] text-center shadow-2xl relative">
                        <button
                          onClick={() => setShowHostModal(false)}
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <img
                          src="/shopro.png"
                          alt="Shopro"
                          className="w-12 h-12 rounded-full mx-auto p-1 bg-black border-2 border-orange-500 mb-2"
                        />
                        <p className="font-bold text-sm text-white">Shopro 官方带货官</p>
                        <p className="text-[9px] text-[#00E599] font-mono mt-0.5">🔥 2026 电商AIGC 官方认证</p>
                        <div className="grid grid-cols-2 gap-2 my-3 p-2 rounded-xl bg-white/5 text-[10px]">
                          <div>
                            <p className="font-black text-white font-mono">128.5W</p>
                            <p className="text-white/40 text-[8px]">粉丝量</p>
                          </div>
                          <div>
                            <p className="font-black text-orange-400 font-mono">342.8W</p>
                            <p className="text-white/40 text-[8px]">本场获赞</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsFollowed(!isFollowed);
                            setShowHostModal(false);
                            showToast(isFollowed ? '已取消关注' : '已成功关注主播！');
                          }}
                          className="w-full py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-xs"
                        >
                          {isFollowed ? '已关注' : '+ 关注主播'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 弹窗 F: 在线观众榜单 */}
                  {showAudienceModal && (
                    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                      <div className="bg-[#121520] border-t border-white/20 rounded-t-3xl p-3.5 flex flex-col shadow-2xl text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold text-xs text-white">本场带货贡献榜 (2.4W人在线)</span>
                          </div>
                          <button
                            onClick={() => setShowAudienceModal(false)}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-2 py-2.5 text-[10px]">
                          {[
                            { rank: '🥇', name: '欧美大卖Alex', contribution: '已抢购 12 件 · 贡献 No.1' },
                            { rank: '🥈', name: '跨境选品王', contribution: '已抢购 8 件 · 贡献 No.2' },
                            { rank: '🥉', name: '东南亚女装馆', contribution: '已抢购 5 件 · 贡献 No.3' },
                          ].map(item => (
                            <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{item.rank}</span>
                                <span className="font-bold text-white">{item.name}</span>
                              </div>
                              <span className="text-amber-400 font-mono text-[9px]">{item.contribution}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
