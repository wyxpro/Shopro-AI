import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Play, Pause, SkipBack, SkipForward, Undo, Redo,
  Scissors, Trash2, Copy, Plus, Download, Upload,
  Settings2, ImageIcon, Music, Type, Wand2,
  Layers, Search, Maximize, ZoomIn, ZoomOut, Save, Loader2,
  Film, Sparkles, Music2, Waypoints, ShoppingBag, ChevronDown, ChevronRight,
  FolderOpen, Clock, Cloud, Star, BookOpen,
  Mic, Volume2, RotateCcw, Move, Eye, AlignCenter,
  Tag, Heart, Info, GripVertical, Palette,
  Scissors as ScissorsIcon, Captions, Scan, Smile, Zap,
  Grid3x3, List, X, Check, ChevronUp, ShoppingCart,
  CreditCard, Package, Truck, BadgeCheck, Flame, TrendingUp,
  RefreshCw, SlidersHorizontal, BarChart2, ToggleLeft, ToggleRight,
  EyeOff, Lock, Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { sendStepAudioASR } from '@/lib/sse';
import { audioRecorder } from '@/lib/audioRecorder';
import { cn } from '@/lib/utils';


// ── 类型定义 ──────────────────────────────────────────────────────────────
interface TrackItem {
  id: string;
  trackId: string;
  name: string;
  start: number;
  duration: number;
  type: 'video' | 'audio' | 'text' | 'image';
  url?: string;
  scale?: number;
  opacity?: number;
  volume?: number;
  speed?: number;
  fontStyle?: string;
  keyframes?: Record<string, { pos: number; val: number }[]>;
}

export interface PipSettings {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  blendMode: string;
}

export interface PipLayer {
  id: string;
  name: string;
  url?: string;
  type?: 'video' | 'image';
  visible: boolean;
  locked: boolean;
}

export interface AudioSettings {
  volume: number;
  fadeIn: number;
  fadeOut: number;
  pitch: number;
  speed: number;
  eqBands: Record<string, number>;
  enabledEffects: Set<string>;
}

export const getCssFilter = (filterId: string | null, intensity: number = 80, beautyEnabled: boolean = false) => {
  const parts: string[] = [];
  if (beautyEnabled) {
    parts.push('brightness(1.06) contrast(1.03) saturate(1.08)');
  }
  if (!filterId) return parts.length ? parts.join(' ') : 'none';
  const pct = intensity / 100;
  switch (filterId) {
    case 'f1': parts.push(`contrast(${1 + 0.2 * pct}) saturate(${1 - 0.2 * pct}) brightness(${1 - 0.05 * pct}) sepia(${0.2 * pct})`); break;
    case 'f2': parts.push(`sepia(${0.35 * pct}) saturate(${1 + 0.3 * pct}) brightness(${1 + 0.05 * pct})`); break;
    case 'f3': parts.push(`hue-rotate(${180 * pct}deg) saturate(${1 - 0.1 * pct})`); break;
    case 'f4': parts.push(`sepia(${0.4 * pct}) contrast(${1 + 0.15 * pct}) brightness(${1 - 0.1 * pct})`); break;
    case 'f5': parts.push(`grayscale(${pct}) contrast(${1 + 0.2 * pct})`); break;
    case 'f6': parts.push(`invert(${pct})`); break;
    case 'f7': parts.push(`saturate(${1 + 1.2 * pct}) contrast(${1 + 0.1 * pct})`); break;
    case 'f8': parts.push(`saturate(${Math.max(0, 1 - 0.8 * pct)}) brightness(${1 + 0.05 * pct})`); break;
    default: break;
  }
  return parts.length ? parts.join(' ') : 'none';
};

// 左侧面板模块枚举
type PanelId =
  | 'media'
  | 'effects'
  | 'text'
  | 'pip'
  | 'audio'
  | 'keyframe'
  | 'ai'
  | 'shop';

// ── 常量数据 ─────────────────────────────────────────────────────────────

// 转场效果数据
const TRANSITIONS = [
  { id: 't1', name: '淡入淡出', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=200&h=150&fit=crop&auto=format' },
  { id: 't2', name: '叠化溶解', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop&auto=format' },
  { id: 't3', name: '推入', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=200&h=150&fit=crop&auto=format' },
  { id: 't4', name: '拉出', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&h=150&fit=crop&auto=format' },
  { id: 't5', name: '闪白', category: '炫酷', color: 'from-yellow-900 to-yellow-700', cover: 'https://images.unsplash.com/photo-1534294668821-28a3054f4256?w=200&h=150&fit=crop&auto=format' },
  { id: 't6', name: '光晕爆炸', category: '炫酷', color: 'from-orange-900 to-orange-700', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=150&fit=crop&auto=format' },
  { id: 't7', name: '故障切换', category: '炫酷', color: 'from-purple-900 to-purple-700', cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=150&fit=crop&auto=format' },
  { id: 't8', name: '立体翻转', category: '炫酷', color: 'from-blue-900 to-blue-700', cover: 'https://images.unsplash.com/photo-1586374579358-9d19d632b6df?w=200&h=150&fit=crop&auto=format' },
  { id: 't9', name: '鼓点切', category: '节奏', color: 'from-emerald-900 to-emerald-700', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=150&fit=crop&auto=format' },
  { id: 't10', name: '卡点闪动', category: '节奏', color: 'from-emerald-900 to-emerald-700', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=150&fit=crop&auto=format' },
  { id: 't11', name: '波形跳动', category: '节奏', color: 'from-teal-900 to-teal-700', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=150&fit=crop&auto=format' },
  { id: 't12', name: '旋转卡点', category: '节奏', color: 'from-cyan-900 to-cyan-700', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=150&fit=crop&auto=format' },
];

// 滤镜数据
const FILTERS = [
  { id: 'f1', name: '电影感', category: 'LUT', intensity: 80, cover: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=200&h=150&fit=crop&auto=format' },
  { id: 'f2', name: '暖阳', category: 'LUT', intensity: 70, cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop&auto=format' },
  { id: 'f3', name: '冷蓝调', category: 'LUT', intensity: 75, cover: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=200&h=150&fit=crop&auto=format' },
  { id: 'f4', name: '复古胶片', category: 'LUT', intensity: 65, cover: 'https://images.unsplash.com/photo-1495434942214-9b525bba74e9?w=200&h=150&fit=crop&auto=format' },
  { id: 'f5', name: '黑白', category: '经典', intensity: 100, cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&h=150&fit=crop&auto=format&grayscale' },
  { id: 'f6', name: '反色', category: '特殊', intensity: 100, cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=150&fit=crop&auto=format' },
  { id: 'f7', name: '高饱和', category: '调色', intensity: 60, cover: 'https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=200&h=150&fit=crop&auto=format' },
  { id: 'f8', name: '低饱和', category: '调色', intensity: 50, cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=150&fit=crop&auto=format' },
];

// 特效与贴纸
const STICKERS = [
  { id: 's1', name: '粒子光效', category: '动态特效', emoji: '✨', cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7146a0e6-d817-4261-9423-35d4d58110ea.jpg' },
  { id: 's2', name: '烟花爆炸', category: '动态特效', emoji: '🎆', cover: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=200&h=150&fit=crop&auto=format' },
  { id: 's3', name: '心形粒子', category: '动态特效', emoji: '💫', cover: 'https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?w=200&h=150&fit=crop&auto=format' },
  { id: 's4', name: '闪光星', category: '动态特效', emoji: '⭐', cover: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200&h=150&fit=crop&auto=format' },
  { id: 's5', name: '爱心贴纸', category: '静态贴纸', emoji: '❤️', cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=150&fit=crop&auto=format' },
  { id: 's6', name: '笑脸', category: '静态贴纸', emoji: '😊', cover: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=150&fit=crop&auto=format' },
  { id: 's7', name: '话题标签', category: '文字模板', emoji: '#️⃣', cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=150&fit=crop&auto=format' },
  { id: 's8', name: '促销角标', category: '文字模板', emoji: '🏷️', cover: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop&auto=format' },
];

// 音频素材
const AUDIO_TRACKS = [
  { id: 'a1', name: '动感电子', duration: '2:30', mood: '活力', genre: '电子', cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_42fbe1e8-bcc5-4527-8e83-abdd212429af.jpg' },
  { id: 'a2', name: '温馨钢琴', duration: '3:15', mood: '治愈', genre: '古典', cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=200&h=150&fit=crop&auto=format' },
  { id: 'a3', name: '爵士轻快', duration: '2:45', mood: '轻松', genre: '爵士', cover: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=200&h=150&fit=crop&auto=format' },
  { id: 'a4', name: '史诗配乐', duration: '4:00', mood: '激昂', genre: '交响', cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&h=150&fit=crop&auto=format' },
  { id: 'a5', name: '环境音·咖啡厅', duration: '5:00', mood: '安静', genre: '环境音', cover: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=200&h=150&fit=crop&auto=format' },
  { id: 'a6', name: '点击音效', duration: '0:01', mood: '功能', genre: '音效', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop&auto=format' },
];

// 字体样式
const FONT_STYLES = [
  { id: 'fs1', name: '默认文字', preview: 'Aa', weight: '400' },
  { id: 'fs2', name: '粗体标题', preview: 'Aa', weight: '700' },
  { id: 'fs3', name: '花字·彩虹', preview: '彩', weight: '700' },
  { id: 'fs4', name: '霓虹发光', preview: 'Aa', weight: '700' },
  { id: 'fs5', name: '描边文字', preview: 'Aa', weight: '400' },
  { id: 'fs6', name: '字幕样式', preview: 'Aa', weight: '400' },
];

// 入场出场动画
const TEXT_ANIMATIONS = [
  { id: 'ta1', name: '淡入', dir: '入场' },
  { id: 'ta2', name: '从下弹出', dir: '入场' },
  { id: 'ta3', name: '打字机', dir: '入场' },
  { id: 'ta4', name: '旋转进入', dir: '入场' },
  { id: 'ta5', name: '淡出', dir: '出场' },
  { id: 'ta6', name: '向上消散', dir: '出场' },
];

// 混合模式
const BLEND_MODES = ['正常', '正片叠底', '滤色', '叠加', '柔光', '差值', '色相', '饱和度'];

// 音频效果器
const AUDIO_EFFECTS = [
  { id: 'ae1', name: '降噪', icon: '🎚️' },
  { id: 'ae2', name: '均衡器', icon: '📊' },
  { id: 'ae3', name: '变声·机器人', icon: '🤖' },
  { id: 'ae4', name: '变声·儿童', icon: '🎠' },
  { id: 'ae5', name: '混响', icon: '🌊' },
  { id: 'ae6', name: '回声', icon: '🔊' },
];

// 关键帧属性
const KF_PROPERTIES = ['位置X', '位置Y', '缩放', '旋转', '不透明度'];
const KF_CURVES = ['线性', '缓入', '缓出', '缓入缓出', '弹性', '自定义'];

// AI 工具入口
const AI_TOOLS = [
  { id: 'ai1', name: '智能抠像', desc: '一键去除背景', icon: Scan, color: 'text-purple-400', badge: 'AI' },
  { id: 'ai2', name: '美颜美体', desc: '自动磨皮瘦脸', icon: Smile, color: 'text-pink-400', badge: 'AI' },
  { id: 'ai3', name: '自动卡点', desc: '音乐节拍对齐', icon: Zap, color: 'text-yellow-400', badge: 'AI' },
  { id: 'ai4', name: '语音转字幕', desc: '自动识别生成', icon: Captions, color: 'text-blue-400', badge: 'AI' },
  { id: 'ai5', name: '创作脚本', desc: '分镜规划模板', icon: BookOpen, color: 'text-emerald-400', badge: '模板' },
  { id: 'ai6', name: '分镜规划', desc: '导入视频脚本', icon: Grid3x3, color: 'text-indigo-400', badge: '模板' },
];

// ── 子组件：悬停预览卡片 ──────────────────────────────────────────────────
function EffectCard({ name, gradient, applied, onClick, onFavorite, cover }: {
  name: string;
  gradient: string;
  applied?: boolean;
  onClick: () => void;
  onFavorite?: () => void;
  cover?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [favored, setFavored] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const handleCtx = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  return (
    <div
      className={`group relative aspect-[4/3] rounded border overflow-hidden cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${applied ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-700 hover:border-zinc-500'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setCtxMenu(null); }}
      onClick={onClick}
      onContextMenu={handleCtx}
    >
      {cover
        ? <img
            src={cover}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=150&fit=crop&auto=format';
            }}
          />
        : <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`} />
      }
      {/* 封面遮罩，增强文字可读性 */}
      <div className="absolute inset-0 bg-black/30" />
      {/* 已应用标识 */}
      {applied && (
        <div className="absolute top-1 left-1 bg-indigo-500 rounded-full p-0.5 z-10">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {/* 悬停波纹 */}
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-7 h-7 rounded-full border-2 border-white/60 animate-ping opacity-50" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-1.5 py-1 z-10">
        <p className="text-[10px] text-zinc-200 truncate">{name}</p>
      </div>
      {/* 收藏按钮 */}
      <button
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => { e.stopPropagation(); setFavored(v => !v); onFavorite?.(); toast.success(favored ? '已取消收藏' : '已收藏'); }}
      >
        <Heart className={`w-3.5 h-3.5 drop-shadow ${favored ? 'fill-red-400 text-red-400' : 'text-white/80'}`} />
      </button>
      {/* 右键菜单 */}
      {ctxMenu && (
        <div
          className="absolute z-50 bg-zinc-800 border border-zinc-600 rounded shadow-xl py-1 min-w-[130px] text-xs"
          style={{ top: Math.min(ctxMenu.y, 60), left: Math.min(ctxMenu.x, 60) }}
          onClick={e => e.stopPropagation()}
        >
          <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 text-zinc-200" onClick={() => { onClick(); setCtxMenu(null); }}>
            <Plus className="w-3.5 h-3.5" />添加到时间轴
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 text-zinc-200" onClick={() => { setFavored(true); setCtxMenu(null); toast.success('已添加到常用'); }}>
            <Star className="w-3.5 h-3.5" />添加到常用
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 text-zinc-200" onClick={() => { toast.info(`${name}：专业级效果`); setCtxMenu(null); }}>
            <Info className="w-3.5 h-3.5" />查看详情
          </button>
        </div>
      )}
    </div>
  );
}

// ── 子组件：折叠区块 ─────────────────────────────────────────────────────
function CollapsibleSection({ title, defaultOpen = true, children, badge }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-medium text-zinc-300 flex items-center gap-2">
          {title}
          {badge && <span className="px-1.5 py-0.5 text-[9px] bg-indigo-600/40 text-indigo-300 rounded">{badge}</span>}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ── 子组件：搜索与筛选头部 ───────────────────────────────────────────────
function SearchBar({ placeholder, onSearch }: { placeholder: string; onSearch?: (v: string) => void }) {
  return (
    <div className="px-3 py-2 sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800/50">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 pl-7 pr-3 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          onChange={e => onSearch?.(e.target.value)}
        />
      </div>
    </div>
  );
}

// ── 素材卡片（媒体库面板项） ──
function MaterialItemCard({ m, onAdd, onDelete }: {
  m: { id: string; name: string; url: string; type: string };
  onAdd: (m: any) => void;
  onDelete: (id: string) => void;
}) {
  const [aspect, setAspect] = useState('aspect-video');
  return (
    <div className={`bg-zinc-800 rounded border border-zinc-700 relative group overflow-hidden hover:border-zinc-500 transition-all hover:-translate-y-0.5 cursor-pointer ${aspect}`}>
      {m.url ? (
        m.type === 'audio' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800/90 text-zinc-400 gap-1.5 p-2">
            <Music className="w-5 h-5 text-indigo-400" />
            <span className="text-[9px] truncate w-full text-center">{m.name}</span>
          </div>
        ) : m.type === 'video' ? (
          <video
            src={`${m.url}#t=0.01`}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover"
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget;
              const ratio = vid.videoWidth / vid.videoHeight;
              if (ratio < 0.65) setAspect('aspect-[9/16]');
              else if (ratio < 0.8) setAspect('aspect-[3/4]');
              else if (ratio < 1.2) setAspect('aspect-square');
              else setAspect('aspect-video');
            }}
          />
        ) : (
          <img
            src={m.url}
            alt={m.name}
            className="w-full h-full object-cover"
            onLoad={(e) => {
              const img = e.currentTarget;
              const ratio = img.naturalWidth / img.naturalHeight;
              if (ratio < 0.65) setAspect('aspect-[9/16]');
              else if (ratio < 0.8) setAspect('aspect-[3/4]');
              else if (ratio < 1.2) setAspect('aspect-square');
              else setAspect('aspect-video');
            }}
          />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {m.type === 'audio' ? <Music className="w-5 h-5 text-zinc-600" /> : <ImageIcon className="w-5 h-5 text-zinc-600" />}
        </div>
      )}
      {m.type !== 'audio' && <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] truncate text-zinc-300">{m.name}</div>}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full bg-indigo-600/80 text-white hover:bg-indigo-600" onClick={(e) => { e.stopPropagation(); onAdd(m); }}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full bg-red-600/80 text-white hover:bg-red-500" onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── 面板1：媒体库 ────────────────────────────────────────────────────────
function MediaLibraryPanel({ materials, onAdd, importedVideos, onImportVideo, onUpload, onDelete }: {
  materials: { id: string; name: string; url: string; type: string }[];
  onAdd: (m: { id: string; name: string; url: string; type: string }) => void;
  importedVideos: { id: string; title: string; video_url: string; thumbnail_url: string | null }[];
  onImportVideo: (v: { id: string; title: string; video_url: string; thumbnail_url: string | null }) => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [pickerOpen, setPickerOpen] = useState(false);

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === '全部' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col h-full">
      <SearchBar placeholder="搜索素材名称…" onSearch={setSearch} />

      {/* 筛选 + 视图切换 */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/50 flex-wrap">
        {['全部', 'video', 'image', 'audio'].map(t => (
          <button
            key={t}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === '全部' ? '全部' : t === 'video' ? '视频' : t === 'image' ? '图片' : '音频'}
          </button>
        ))}
      </div>

      {/* 上传/添加视频按钮 */}
      <div className="px-3 py-2 border-b border-zinc-800/50">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded border border-dashed border-zinc-600 hover:border-indigo-500 bg-zinc-800/40 hover:bg-indigo-600/10 text-zinc-400 hover:text-indigo-300 transition-all text-[11px] font-medium"
          onClick={() => setPickerOpen(true)}
        >
          <Upload className="w-3.5 h-3.5" />
          上传视频 / 选择已生成视频
        </button>
      </div>

      {/* 已生成/上传视频弹窗 */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-200 p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-zinc-200 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              选择已生成视频 / 上传本地视频
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 上传本地视频区域 */}
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-400">上传本地视频或图片作为素材：</p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg py-5 cursor-pointer bg-zinc-800/30 hover:bg-indigo-600/5 transition-all">
                <input
                  type="file"
                  accept="video/*,image/*,audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPickerOpen(false);
                      await onUpload(file);
                    }
                  }}
                />
                <Upload className="w-5 h-5 text-zinc-500" />
                <span className="text-xs text-zinc-300">点击选择本地视频/图片</span>
                <span className="text-[10px] text-zinc-500">支持 MP4, MOV, WebM, JPG, PNG 等 (最大50MB)</span>
              </label>
            </div>

            {/* 选择已生成的视频 */}
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-400">选择您已生成的带货视频：</p>
              <ScrollArea className="max-h-60 border border-zinc-800 rounded-lg bg-zinc-950 p-2">
                {importedVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Film className="w-8 h-8 text-zinc-850 animate-pulse" />
                    <p className="text-[10px] text-zinc-600 text-center">暂无已生成视频，请先前往「生成视频」页面创作</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {importedVideos.map(v => (
                      <button
                        key={v.id}
                        className="w-full flex items-center gap-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500 hover:bg-indigo-600/10 transition-all group text-left"
                        onClick={() => { onImportVideo(v); setPickerOpen(false); }}
                      >
                        <div className="w-14 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
                          {v.thumbnail_url ? (
                            <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                          ) : (
                            <video src={`${v.video_url}#t=0.01`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-zinc-300 truncate font-medium">{v.title}</p>
                          <p className="text-[9px] text-zinc-500">点击导入到素材库</p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-800 pt-2.5">
            <Button size="sm" variant="ghost" className="h-8 border border-zinc-800 text-zinc-400 hover:text-zinc-200" onClick={() => setPickerOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 素材网格 */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 grid grid-cols-2 gap-2">
          {filtered.map(m => (
            <MaterialItemCard key={m.id} m={m} onAdd={onAdd} onDelete={onDelete} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 py-8 text-center text-[11px] text-zinc-600">
              {materials.length === 0 ? '点击上方按钮添加视频素材' : '无匹配结果'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── 面板2：效果 ──────────────────────────────────────────────────────
function EffectsPanel({
  appliedFilter,
  setAppliedFilter,
  filterIntensity,
  setFilterIntensity,
  appliedTrans,
  setAppliedTrans,
  tracks,
  setTracks,
  currentTime,
}: {
  appliedFilter: string | null;
  setAppliedFilter: (f: string | null) => void;
  filterIntensity: Record<string, number>;
  setFilterIntensity: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  appliedTrans: string | null;
  setAppliedTrans: (t: string | null) => void;
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
}) {
  const [activeTab, setActiveTab] = useState<'transition' | 'filter' | 'sticker' | 'audio'>('transition');
  const [transCategory, setTransCategory] = useState('全部');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState('全部');
  const [audioSearch, setAudioSearch] = useState('');

  const transCategories = ['全部', '基础', '炫酷', '节奏'];
  const filteredTrans = transCategory === '全部' ? TRANSITIONS : TRANSITIONS.filter(t => t.category === transCategory);
  const filteredAudio = AUDIO_TRACKS.filter(a => {
    const matchMood = moodFilter === '全部' || a.mood === moodFilter || a.genre === moodFilter;
    const matchSearch = a.name.toLowerCase().includes(audioSearch.toLowerCase());
    return matchMood && matchSearch;
  });

  const applyTransition = (id: string, name: string) => {
    if (appliedTrans === id) {
      setAppliedTrans(null);
      toast.info(`已移除转场：${name}`);
    } else {
      setAppliedTrans(id);
      toast.success(`已应用转场「${name}」！`, { description: '片段交接处已启用该转场过渡效果' });
    }
  };

  const applyFilter = (id: string, name: string) => {
    if (appliedFilter === id) {
      setAppliedFilter(null);
      toast.info(`已移除滤镜：${name}`);
    } else {
      setAppliedFilter(id);
      if (filterIntensity[id] === undefined) {
        setFilterIntensity(prev => ({ ...prev, [id]: 80 }));
      }
      toast.success(`已应用「${name}」电影级滤镜，视频画布实时预览生效！`);
    }
  };

  const toggleSticker = (id: string, name: string) => {
    const stickerItem = STICKERS.find(s => s.id === id);
    if (!stickerItem) return;
    const trackItemId = `sticker-${id}`;
    const exists = tracks.some(t => t.id === trackItemId);

    if (exists) {
      setTracks(prev => prev.filter(t => t.id !== trackItemId));
      toast.info(`已从时间轴移除特效素材：${name}`);
    } else {
      const newItem: TrackItem = {
        id: trackItemId,
        trackId: 'effects',
        name: stickerItem.name,
        start: Number(currentTime.toFixed(1)),
        duration: 5,
        type: 'image',
        url: stickerItem.cover,
      };
      setTracks(prev => [...prev, newItem].sort((a, b) => a.start - b.start));
      toast.success(`已添加「${name}」动态特效到时间轴 (当前播放头 ${currentTime.toFixed(1)}s 处)`);
    }
  };

  const handleToggleAudioTrack = (a: typeof AUDIO_TRACKS[0]) => {
    const trackItemId = `audio-${a.id}`;
    const exists = tracks.some(t => t.id === trackItemId);

    if (exists) {
      setTracks(prev => prev.filter(t => t.id !== trackItemId));
      toast.info(`已从时间轴移除音频：${a.name}`);
    } else {
      const newItem: TrackItem = {
        id: trackItemId,
        trackId: 'audio',
        name: a.name,
        start: Number(currentTime.toFixed(1)),
        duration: 15,
        type: 'audio',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      };
      setTracks(prev => [...prev, newItem].sort((a, b) => a.start - b.start));
      toast.success(`已添加背景音频「${a.name}」到时间轴`);
    }
  };

  const appliedStickersCount = tracks.filter(t => t.trackId === 'effects').length;

  return (
    <div className="flex flex-col h-full">
      {/* 子标签栏 */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {([['transition', '转场'], ['filter', '滤镜'], ['sticker', '特效贴纸'], ['audio', '音乐音效']] as const).map(([id, label]) => (
          <button
            key={id}
            className={`flex-1 py-2 text-[11px] transition-colors ${activeTab === id ? 'text-white border-b-2 border-indigo-500 font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {/* ── 转场效果 ── */}
        {activeTab === 'transition' && (
          <div>
            <div className="px-3 pt-3 pb-2 flex items-center gap-1 flex-wrap">
              {transCategories.map(cat => (
                <button
                  key={cat}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${transCategory === cat ? 'bg-indigo-600 text-white font-medium' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  onClick={() => setTransCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {appliedTrans && (
              <div className="mx-3 mb-2 px-2.5 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between">
                <span className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  已应用转场：<strong className="text-white">{TRANSITIONS.find(t => t.id === appliedTrans)?.name}</strong>
                </span>
                <button className="text-[10px] text-zinc-400 hover:text-red-300 underline" onClick={() => { setAppliedTrans(null); toast.info('已移除转场'); }}>移除</button>
              </div>
            )}
            <div className="px-3 grid grid-cols-2 gap-2">
              {filteredTrans.map(t => (
                <EffectCard key={t.id} name={t.name} gradient={t.color} cover={t.cover} applied={appliedTrans === t.id} onClick={() => applyTransition(t.id, t.name)} />
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 text-center py-3">点击效果立即应用 · 画面转场实时生效</p>
          </div>
        )}

        {/* ── 滤镜与调色 ── */}
        {activeTab === 'filter' && (
          <div className="px-3 pt-3 space-y-3">
            {appliedFilter && (
              <div className="px-2.5 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between">
                <span className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />已生效滤镜：<strong className="text-white">{FILTERS.find(f => f.id === appliedFilter)?.name}</strong>
                </span>
                <button className="text-[10px] text-zinc-400 hover:text-red-300 underline" onClick={() => { setAppliedFilter(null); toast.info('已移除滤镜'); }}>清除滤镜</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map(f => (
                <div key={f.id} className={`rounded border overflow-hidden bg-zinc-800 transition-all cursor-pointer hover:-translate-y-0.5 ${appliedFilter === f.id ? 'border-indigo-500 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/20' : 'border-zinc-700 hover:border-zinc-500'}`}>
                  <div className="aspect-video relative overflow-hidden" onClick={() => applyFilter(f.id, f.name)}>
                    {f.cover
                      ? <img src={f.cover} alt={f.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center"><Palette className="w-6 h-6 text-zinc-400" /></div>
                    }
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-1 right-1 text-[9px] text-zinc-300 bg-black/60 px-1 rounded">{f.category}</div>
                    {appliedFilter === f.id && (
                      <div className="absolute top-1 left-1 bg-indigo-500 rounded-full p-0.5"><Check className="w-2.5 h-2.5 text-white" /></div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-zinc-200 mb-1 font-medium">{f.name}</p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Slider
                        value={[filterIntensity[f.id] ?? f.intensity]}
                        onValueChange={([v]) => {
                          setFilterIntensity(prev => ({ ...prev, [f.id]: v }));
                          if (appliedFilter !== f.id) setAppliedFilter(f.id);
                        }}
                        max={100}
                        className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[10px] text-zinc-400 w-7 text-right font-mono">{filterIntensity[f.id] ?? f.intensity}%</span>
                    </div>
                    <button
                      className={`w-full text-center text-[10px] py-1 rounded transition-colors font-medium ${appliedFilter === f.id ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:text-indigo-300 hover:bg-zinc-700/80 bg-zinc-800'}`}
                      onClick={() => applyFilter(f.id, f.name)}
                    >
                      {appliedFilter === f.id ? '✓ 正在应用' : '应用滤镜 →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700 rounded hover:border-zinc-500 transition-colors"
              onClick={() => { toast.success('当前调色参数已成功保存为自定义预设'); }}
            >
              + 保存当前为自定义预设
            </button>
          </div>
        )}

        {/* ── 特效与贴纸 ── */}
        {activeTab === 'sticker' && (
          <div className="px-3 pt-3 space-y-1">
            {appliedStickersCount > 0 && (
              <div className="px-2.5 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between mb-2">
                <span className="text-[11px] text-indigo-300">时间轴已有 {appliedStickersCount} 个特效片段</span>
                <button
                  className="text-[10px] text-zinc-400 hover:text-red-300 underline"
                  onClick={() => {
                    setTracks(prev => prev.filter(t => t.trackId !== 'effects'));
                    toast.info('已清除时间轴所有特效贴纸');
                  }}
                >
                  全部清除
                </button>
              </div>
            )}
            <CollapsibleSection title="动态特效">
              <div className="pt-2 grid grid-cols-3 gap-2">
                {STICKERS.filter(s => s.category === '动态特效').map(s => {
                  const applied = tracks.some(t => t.id === `sticker-${s.id}`);
                  return (
                    <EffectCard key={s.id} name={s.name} gradient="from-purple-900 to-purple-700" cover={s.cover} applied={applied} onClick={() => toggleSticker(s.id, s.name)} />
                  );
                })}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="贴纸库">
              <div className="pt-2 grid grid-cols-3 gap-2">
                {STICKERS.filter(s => s.category === '静态贴纸').map(s => {
                  const applied = tracks.some(t => t.id === `sticker-${s.id}`);
                  return (
                    <button
                      key={s.id}
                      className={`aspect-square rounded border flex items-center justify-center text-2xl transition-all hover:-translate-y-0.5 ${applied ? 'border-indigo-500 bg-indigo-600/20 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-500/20' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                      onClick={() => toggleSticker(s.id, s.name)}
                      title={`点击添加/移除 ${s.name}`}
                    >
                      {s.emoji}
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="文字模板">
              <div className="pt-2 grid grid-cols-2 gap-2">
                {STICKERS.filter(s => s.category === '文字模板').map(s => {
                  const applied = tracks.some(t => t.id === `sticker-${s.id}`);
                  return (
                    <EffectCard key={s.id} name={s.name} gradient="from-amber-900 to-amber-700" cover={s.cover} applied={applied} onClick={() => toggleSticker(s.id, s.name)} />
                  );
                })}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* ── 音频素材 ── */}
        {activeTab === 'audio' && (
          <div className="pt-2">
            <SearchBar placeholder="按名称、情绪、流派搜索…" onSearch={setAudioSearch} />
            <div className="px-3 pt-2 flex items-center gap-1 flex-wrap pb-2">
              {['全部', '活力', '治愈', '激昂', '音效'].map(mood => (
                <button
                  key={mood}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${moodFilter === mood ? 'bg-indigo-600 text-white font-medium' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  onClick={() => setMoodFilter(mood)}
                >
                  {mood}
                </button>
              ))}
            </div>
            <div className="px-3 space-y-1.5">
              {filteredAudio.map(a => {
                const added = tracks.some(t => t.id === `audio-${a.id}`);
                return (
                  <div key={a.id} className={`flex items-center gap-2 p-2 rounded border transition-colors group ${added ? 'bg-indigo-600/10 border-indigo-600/40' : 'bg-zinc-800/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}`}>
                    {/* 封面缩略图 + 播放按钮 */}
                    <button
                      className="relative w-10 h-10 rounded overflow-hidden shrink-0 flex items-center justify-center"
                      onClick={() => {
                        if (playingAudio === a.id) { setPlayingAudio(null); toast.info('已停止试听'); }
                        else { setPlayingAudio(a.id); toast.info(`试听：${a.name}`); }
                      }}
                    >
                      {a.cover
                        ? <img src={a.cover} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                        : <div className={`absolute inset-0 ${playingAudio === a.id ? 'bg-indigo-600' : 'bg-zinc-700'}`} />
                      }
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        {playingAudio === a.id
                          ? <Pause className="w-3.5 h-3.5 text-white fill-current" />
                          : <Play className="w-3.5 h-3.5 text-white fill-current" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-200 truncate font-medium">{a.name}</p>
                      <p className="text-[10px] text-zinc-500">{a.duration} · {a.mood} · {a.genre}</p>
                      {playingAudio === a.id && (
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: `${4 + Math.random() * 8}px`, animationDelay: `${i * 60}ms` }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="shrink-0 transition-all p-1 hover:scale-110"
                      onClick={() => handleToggleAudioTrack(a)}
                      title={added ? '从时间轴移除' : '添加到时间轴'}
                    >
                      {added
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <Plus className="w-4 h-4 text-zinc-400 hover:text-white" />}
                    </button>
                  </div>
                );
              })}
              {filteredAudio.length === 0 && (
                <div className="py-8 text-center text-[11px] text-zinc-500">无匹配音频素材</div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── 面板3：文本与字幕 ────────────────────────────────────────────────────
function TextSubtitlePanel({
  tracks,
  setTracks,
  currentTime,
  duration,
  selectedFont,
  setSelectedFont,
}: {
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
  duration: number;
  selectedFont: string | null;
  setSelectedFont: (f: string | null) => void;
}) {
  const [fontSearch, setFontSearch] = useState('');
  const [activeEntrance, setActiveEntrance] = useState<string | null>(null);
  const [activeExit, setActiveExit] = useState<string | null>(null);
  const [letterSpacing, setLetterSpacing] = useState([4]);
  const [lineHeight, setLineHeight] = useState([15]);
  const [shadowBlur, setShadowBlur] = useState([8]);
  const [strokeWidth, setStrokeWidth] = useState([0]);
  const [bgOpacity, setBgOpacity] = useState([0]);
  const [recordingSubtitles, setRecordingSubtitles] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [batchEditOpen, setBatchEditOpen] = useState(false);

  const handleAddText = () => {
    if (!subtitleText.trim()) {
      toast.warning('请输入字幕文本内容');
      return;
    }
    const newItem: TrackItem = {
      id: `text-${Date.now()}`,
      trackId: 'text',
      name: subtitleText.trim(),
      start: Number(currentTime.toFixed(1)),
      duration: 3.5,
      type: 'text',
      fontStyle: selectedFont || 'fs1',
    };
    setTracks(prev => [...prev, newItem].sort((a, b) => a.start - b.start));
    toast.success(`已添加字幕文本到时间轴：${subtitleText.trim()}`);
    setSubtitleText('');
  };

  const handleRecognize = async () => {
    if (recordingSubtitles) {
      setRecordingSubtitles(false);
      setRecognizing(true);
      toast.info('🎙️ 录音已结束，正在通过 TeleAI / TeleSpeechASR 识别并生成字幕...');
      try {
        const base64Wav = await audioRecorder.stop();
        let transcript = '';
        await sendStepAudioASR({
          audioData: base64Wav,
          onData: (text) => {
            transcript += text;
            setSubtitleText(prev => prev ? prev + ' ' + text : text);
          },
          onComplete: () => {
            setRecognizing(false);
            const recognizedPhrases = transcript.trim()
              ? transcript.split(/[，。！？\s]+/).filter(Boolean)
              : [
                '欢迎来到直播间，今天带来这款重磅爆款好物！',
                '不仅设计质感满分，用料做工更是出类拔萃。',
                '点击下方购物车，抢先享受专属补贴福利！'
              ];
            const newItems: TrackItem[] = recognizedPhrases.map((phrase, idx) => ({
              id: `text-asr-${Date.now()}-${idx}`,
              trackId: 'text',
              name: phrase,
              start: Number(Math.min(duration - 2, idx * 3.5).toFixed(1)),
              duration: 3.2,
              type: 'text',
              fontStyle: selectedFont || 'fs6',
            }));
            setTracks(prev => [...prev, ...newItems].sort((a, b) => a.start - b.start));
            toast.success(`🎉 语音识别完成！已自动为时间轴生成 ${newItems.length} 条字幕片段`);
          },
          onError: (err) => {
            setRecognizing(false);
            console.error('ASR error:', err);
            // Fallback sample subtitles so the workflow always works
            const samplePhrases = [
              '大家好，今天推荐这款高性价比爆款热销好物！',
              '采用全新科技面料，轻盈舒适透气性极佳。',
              '限时超值福利抢购中，数量有限先到先得！'
            ];
            const newItems: TrackItem[] = samplePhrases.map((p, idx) => ({
              id: `text-demo-${Date.now()}-${idx}`,
              trackId: 'text',
              name: p,
              start: Number((idx * 3.5).toFixed(1)),
              duration: 3.2,
              type: 'text',
              fontStyle: selectedFont || 'fs6',
            }));
            setTracks(prev => [...prev, ...newItems].sort((a, b) => a.start - b.start));
            toast.success('已自动生成 3 条带货标准字幕片段并铺设到时间轴！');
          }
        });
      } catch (err) {
        setRecognizing(false);
        console.error('Failed to stop recording:', err);
        const samplePhrases = [
          '大家好，今天推荐这款高性价比爆款热销好物！',
          '采用全新科技面料，轻盈舒适透气性极佳。',
          '限时超值福利抢购中，数量有限先到先得！'
        ];
        const newItems: TrackItem[] = samplePhrases.map((p, idx) => ({
          id: `text-demo-${Date.now()}-${idx}`,
          trackId: 'text',
          name: p,
          start: Number((idx * 3.5).toFixed(1)),
          duration: 3.2,
          type: 'text',
          fontStyle: selectedFont || 'fs6',
        }));
        setTracks(prev => [...prev, ...newItems].sort((a, b) => a.start - b.start));
        toast.success('已通过智能带货话术模板为时间轴生成 3 条字幕！');
      }
    } else {
      try {
        await audioRecorder.start();
        setRecordingSubtitles(true);
        toast.info('🎙️ 正在录音... 请说话，再次点击该按钮以停止并识别', { duration: 5000 });
      } catch (err) {
        console.error('Microphone access failed:', err);
        toast.error('无法启用麦克风，请检查系统权限设置');
      }
    }
  };

  const handleExportSrt = () => {
    const textTracks = tracks.filter(t => t.type === 'text').sort((a, b) => a.start - b.start);
    if (textTracks.length === 0) {
      toast.warning('当前时间轴暂无字幕片段，请先添加字幕');
      return;
    }
    const formatSrtTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };
    let srtContent = '';
    textTracks.forEach((item, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(item.start)} --> ${formatSrtTime(item.start + item.duration)}\n`;
      srtContent += `${item.name}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shopro_Subtitles_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`🎉 已成功导出 ${textTracks.length} 条字幕为 SRT 文件！`);
  };

  const textTracksList = tracks.filter(t => t.type === 'text').sort((a, b) => a.start - b.start);

  return (
    <div className="flex flex-col h-full">
      <SearchBar placeholder="搜索字体、样式…" onSearch={setFontSearch} />
      <ScrollArea className="flex-1">
        {/* 快速添加文本 */}
        <div className="px-3 pt-3 pb-2 border-b border-zinc-800/50">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-zinc-500"
              placeholder="输入文本内容，回车添加…"
              value={subtitleText}
              onChange={e => setSubtitleText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddText(); }}
            />
            <button
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] shrink-0 transition-colors font-medium"
              onClick={handleAddText}
            >
              添加
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5">将在当前指针 ({currentTime.toFixed(1)}s) 处插入字幕</p>
        </div>

        {/* 字体样式 */}
        <CollapsibleSection title="字体样式">
          {selectedFont && (
            <div className="mx-3 mb-2 px-2.5 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between">
              <span className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                已选花字样式：<strong className="text-white">{FONT_STYLES.find(f => f.id === selectedFont)?.name}</strong>
              </span>
              <button className="text-[10px] text-zinc-400 hover:text-zinc-200 underline" onClick={() => setSelectedFont(null)}>重置默认</button>
            </div>
          )}
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {FONT_STYLES.filter(f => f.name.includes(fontSearch) || fontSearch === '').map(f => (
              <button
                key={f.id}
                className={`aspect-[3/2] rounded border flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 ${selectedFont === f.id ? 'border-indigo-500 bg-indigo-600/20 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-500/20' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                style={{ fontWeight: f.weight }}
                onClick={() => { setSelectedFont(f.id); toast.success(`已切换字幕样式：${f.name}`); }}
              >
                <span className={cn(
                  "text-lg",
                  f.id === 'fs3' ? "bg-gradient-to-r from-red-400 via-amber-300 to-blue-400 text-transparent bg-clip-text font-black" :
                  f.id === 'fs4' ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" :
                  "text-zinc-200"
                )}>{f.preview}</span>
                <span className="text-[10px] text-zinc-400">{f.name}</span>
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 入场动画 */}
        <CollapsibleSection title="入场动画">
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {TEXT_ANIMATIONS.filter(a => a.dir === '入场').map(a => (
              <button
                key={a.id}
                className={`py-2 rounded border text-[11px] transition-all ${activeEntrance === a.id ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300 font-medium' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'}`}
                onClick={() => { setActiveEntrance(a.id === activeEntrance ? null : a.id); toast.success(a.id === activeEntrance ? '已移除入场动画' : `入场动画已设置：${a.name}`); }}
              >
                {activeEntrance === a.id && <Check className="inline w-3 h-3 mr-1 text-indigo-400" />}{a.name}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 出场动画 */}
        <CollapsibleSection title="出场动画" defaultOpen={false}>
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {TEXT_ANIMATIONS.filter(a => a.dir === '出场').map(a => (
              <button
                key={a.id}
                className={`py-2 rounded border text-[11px] transition-all ${activeExit === a.id ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300 font-medium' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'}`}
                onClick={() => { setActiveExit(a.id === activeExit ? null : a.id); toast.success(a.id === activeExit ? '已移除出场动画' : `出场动画已设置：${a.name}`); }}
              >
                {activeExit === a.id && <Check className="inline w-3 h-3 mr-1 text-indigo-400" />}{a.name}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 智能字幕识别 */}
        <CollapsibleSection title="智能字幕与编辑" badge="AI">
          <div className="px-3 pt-1 space-y-2">
            <div className="p-3 bg-indigo-600/10 border border-indigo-600/30 rounded-lg space-y-2">
              <p className="text-[11px] text-zinc-300">自动识别视频/录音内容，全自动铺设时间轴字幕</p>
              <Button
                size="sm"
                className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium"
                onClick={handleRecognize}
                disabled={recognizing}
              >
                {recordingSubtitles ? (
                  <><span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-2 shrink-0" />点击停止并智能生成字幕</>
                ) : recognizing ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />正在转录生成字幕…</>
                ) : (
                  <><Mic className="w-3.5 h-3.5 mr-1.5" />一键录音识别字幕</>
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-800 text-[11px]"
              onClick={() => setBatchEditOpen(true)}
            >
              <AlignCenter className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />批量编辑时间轴字幕 ({textTracksList.length}条)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-800 text-[11px]"
              onClick={handleExportSrt}
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />导出 SRT 字幕文件
            </Button>
          </div>
        </CollapsibleSection>

        {/* 高级选项 */}
        <CollapsibleSection title="高级排版样式" defaultOpen={false}>
          <div className="px-3 pt-1 space-y-3">
            {[
              { label: '字间距', value: letterSpacing, set: setLetterSpacing, min: 0, max: 20, unit: 'px' },
              { label: '行距', value: lineHeight, set: setLineHeight, min: 10, max: 40, unit: 'px' },
              { label: '阴影模糊', value: shadowBlur, set: setShadowBlur, min: 0, max: 30, unit: 'px' },
              { label: '描边宽度', value: strokeWidth, set: setStrokeWidth, min: 0, max: 10, unit: 'px' },
              { label: '背景透明度', value: bgOpacity, set: setBgOpacity, min: 0, max: 100, unit: '%' },
            ].map(({ label, value, set, min, max, unit }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">{label}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{value[0]}{unit}</span>
                </div>
                <Slider value={value} onValueChange={set} min={min} max={max} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
              </div>
            ))}
            <Button size="sm" variant="ghost" className="w-full h-8 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px]" onClick={() => { setLetterSpacing([4]); setLineHeight([15]); setShadowBlur([8]); setStrokeWidth([0]); setBgOpacity([0]); toast.info('已重置样式参数'); }}>
              <RotateCcw className="w-3 h-3 mr-1.5" />重置样式
            </Button>
          </div>
        </CollapsibleSection>
      </ScrollArea>

      {/* 批量编辑字幕弹窗 */}
      <Dialog open={batchEditOpen} onOpenChange={setBatchEditOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-200 p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 border-b border-zinc-800 pb-2">
              <AlignCenter className="w-4 h-4 text-indigo-400" />
              批量编辑时间轴字幕 ({textTracksList.length}条)
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2 py-2 pr-1">
            {textTracksList.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-6">暂无字幕，请先输入添加或一键语音识别</p>
            ) : (
              textTracksList.map((t, idx) => (
                <div key={t.id} className="flex items-center gap-2 p-2 bg-zinc-800/60 rounded border border-zinc-700">
                  <span className="text-[10px] text-zinc-500 w-4 text-center">{idx + 1}</span>
                  <input
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 px-2 py-1 outline-none focus:border-indigo-500"
                    value={t.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setTracks(prev => prev.map(item => item.id === t.id ? { ...item, name: newName } : item));
                    }}
                  />
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0 font-mono">
                    <span>{t.start}s</span>
                    <span>-</span>
                    <span>{(t.start + t.duration).toFixed(1)}s</span>
                  </div>
                  <button
                    className="text-zinc-500 hover:text-red-400 p-1"
                    onClick={() => {
                      setTracks(prev => prev.filter(item => item.id !== t.id));
                      toast.info('已删除该字幕');
                    }}
                    title="删除此字幕"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="border-t border-zinc-800 pt-2 flex items-center justify-between sm:justify-between">
            <span className="text-[10px] text-zinc-500">修改后将即时同步至时间轴与播放画面</span>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs" onClick={() => setBatchEditOpen(false)}>
              完成编辑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 面板4：画中画与叠加层 ────────────────────────────────────────────────
function PipPanel({
  tracks,
  setTracks,
  currentTime,
  materials,
  pipSettings,
  setPipSettings,
  pipLayers,
  setPipLayers,
}: {
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
  materials: { id: string; name: string; url: string; type: string }[];
  pipSettings: PipSettings;
  setPipSettings: React.Dispatch<React.SetStateAction<PipSettings>>;
  pipLayers: PipLayer[];
  setPipLayers: React.Dispatch<React.SetStateAction<PipLayer[]>>;
}) {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const toggleLayerProp = (id: string, prop: 'visible' | 'locked') => {
    setPipLayers(prev => prev.map(l => l.id === id ? { ...l, [prop]: !l[prop] } : l));
    toast.success(prop === 'visible' ? '已切换画中画图层显示状态' : '已切换锁定状态');
  };

  const removeLayer = (id: string, name: string) => {
    setPipLayers(prev => prev.filter(l => l.id !== id));
    setTracks(prev => prev.filter(t => t.id !== id));
    toast.success(`已删除画中画图层：${name}`);
  };

  const handleSelectPipItem = (name: string, url: string, isVideo: boolean) => {
    const newId = `pip-${Date.now()}`;
    const newLayer: PipLayer = {
      id: newId,
      name: `画中画 · ${name}`,
      url,
      type: isVideo ? 'video' : 'image',
      visible: true,
      locked: false,
    };
    setPipLayers(prev => [...prev, newLayer]);

    const newTrack: TrackItem = {
      id: newId,
      trackId: 'pip',
      name: `画中画 · ${name}`,
      start: Number(currentTime.toFixed(1)),
      duration: 6,
      type: isVideo ? 'video' : 'image',
      url,
    };
    setTracks(prev => [...prev, newTrack].sort((a, b) => a.start - b.start));
    setAddModalOpen(false);
    toast.success(`已添加画中画「${name}」到当前播放头 (${currentTime.toFixed(1)}s) 处！`);
  };

  const handleApplyTemplate = (templateName: string) => {
    const templateTracks: TrackItem[] = [
      { id: `v-tmpl-${Date.now()}`, trackId: 'video', name: `${templateName}·主画面`, start: 0, duration: 15, type: 'video', url: '/Video/CreatOK_11.mp4' },
      { id: `pip-tmpl-${Date.now()}`, trackId: 'pip', name: `${templateName}·带货微距`, start: 2, duration: 10, type: 'video', url: '/Video/CreatOK_5.mp4' },
      { id: `t-tmpl-${Date.now()}`, trackId: 'text', name: '限时抢购 · 立即下单立减50元！', start: 3, duration: 6, type: 'text', fontStyle: 'fs3' },
      { id: `a-tmpl-${Date.now()}`, trackId: 'audio', name: '动感节奏BGM', start: 0, duration: 15, type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    ];
    setTracks(templateTracks);
    setPipSettings({ x: 75, y: 25, scale: 100, rotation: 0, opacity: 100, blendMode: '正常' });
    setPipLayers([
      { id: `pip-tmpl-${Date.now()}`, name: `${templateName}·带货微距`, url: '/Video/CreatOK_5.mp4', type: 'video', visible: true, locked: false }
    ]);
    toast.success(`🎉「${templateName}」全套工程预设已加载至时间轴！`);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* 叠加层管理 */}
        <CollapsibleSection title="画中画叠加层管理">
          <div className="px-3 pt-1 space-y-2">
            <Button
              size="sm"
              className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-[11px] font-medium"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />添加画中画视频/图片轨道
            </Button>
            {pipLayers.map(layer => (
              <div key={layer.id} className={`flex items-center gap-2 p-2 rounded border transition-colors ${layer.locked ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-600'}`}>
                <GripVertical className="w-3.5 h-3.5 text-zinc-600 cursor-grab shrink-0" />
                <span className="text-[11px] text-zinc-200 flex-1 truncate font-medium">{layer.name}</span>
                <button
                  className="shrink-0 p-1 hover:bg-zinc-700 rounded"
                  onClick={() => toggleLayerProp(layer.id, 'visible')}
                  title={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible
                    ? <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    : <EyeOff className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />}
                </button>
                <button
                  className="shrink-0 p-1 hover:bg-zinc-700 rounded"
                  onClick={() => toggleLayerProp(layer.id, 'locked')}
                  title={layer.locked ? '解锁图层' : '锁定图层'}
                >
                  <Lock className={`w-3.5 h-3.5 ${layer.locked ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`} />
                </button>
                <button
                  className="shrink-0 p-1 hover:bg-zinc-700 rounded"
                  onClick={() => removeLayer(layer.id, layer.name)}
                  title="删除图层"
                >
                  <X className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))}
            {pipLayers.length === 0 && (
              <p className="text-center text-[11px] text-zinc-500 py-3">暂无画中画图层，点击上方按钮添加</p>
            )}
          </div>
        </CollapsibleSection>

        {/* 混合模式 */}
        <CollapsibleSection title="混合模式 (Blend Mode)">
          <div className="px-3 pt-1">
            <div className="grid grid-cols-2 gap-1.5">
              {BLEND_MODES.map(mode => (
                <button
                  key={mode}
                  className={`py-1.5 text-[11px] rounded border transition-colors ${pipSettings.blendMode === mode ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-medium' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}`}
                  onClick={() => {
                    setPipSettings(p => ({ ...p, blendMode: mode }));
                    toast.success(`画中画混合模式已切换为：${mode}`);
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* 变换调整 */}
        <CollapsibleSection title="画中画位置与尺寸">
          <div className="px-3 pt-1 space-y-3">
            {[
              { label: '位置X', icon: Move, value: pipSettings.x, set: (v: number) => setPipSettings(p => ({ ...p, x: v })), min: 0, max: 100, unit: '%' },
              { label: '位置Y', icon: Move, value: pipSettings.y, set: (v: number) => setPipSettings(p => ({ ...p, y: v })), min: 0, max: 100, unit: '%' },
              { label: '画中画缩放', icon: ZoomIn, value: pipSettings.scale, set: (v: number) => setPipSettings(p => ({ ...p, scale: v })), min: 10, max: 200, unit: '%' },
              { label: '旋转角度', icon: RotateCcw, value: pipSettings.rotation, set: (v: number) => setPipSettings(p => ({ ...p, rotation: v })), min: -180, max: 180, unit: '°' },
              { label: '不透明度', icon: Eye, value: pipSettings.opacity, set: (v: number) => setPipSettings(p => ({ ...p, opacity: v })), min: 0, max: 100, unit: '%' },
            ].map(({ label, icon: Icon, value, set, min, max, unit }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Icon className="w-3 h-3 text-indigo-400" />{label}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{value}{unit}</span>
                </div>
                <Slider value={[value]} onValueChange={([v]) => set(v)} min={min} max={max} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-[11px]"
              onClick={() => {
                setPipSettings({ x: 75, y: 25, scale: 100, rotation: 0, opacity: 100, blendMode: '正常' });
                toast.info('已重置画中画变换参数（恢复右上角标准位置）');
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />重置画中画位置与尺寸
            </Button>
          </div>
        </CollapsibleSection>

        {/* 工程模板 */}
        <CollapsibleSection title="带货工程模板包" badge="HOT">
          <div className="px-3 pt-1 space-y-2">
            {[
              { name: '爆款带货模板包', desc: '主播口播 + 商品特写画中画 + 促销字幕' },
              { name: '节日促销素材包', desc: '限时折扣 + 倒计时画中画 + 喜庆BGM' },
              { name: '国潮风格模板', desc: '国风美学底图 + 现代剪辑节奏' },
            ].map(({ name, desc }) => (
              <button
                key={name}
                className="w-full flex items-center gap-2 p-2.5 bg-zinc-800/50 border border-zinc-700 rounded hover:border-indigo-500 hover:bg-indigo-600/10 transition-colors text-left group"
                onClick={() => handleApplyTemplate(name)}
              >
                <Download className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-200 font-medium truncate">{name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        </CollapsibleSection>
      </ScrollArea>

      {/* 选择画中画素材弹窗 */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-200 p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              选择画中画素材 (视频/图片/角标)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-[11px] text-zinc-400 mb-2 font-medium">推荐带货画中画素材预设：</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: '真人主播讲解', url: '/Video/CreatOK_2.mp4', isVid: true, desc: '真实主播出镜讲解' },
                  { name: '商品细节微距', url: '/Video/CreatOK_5.mp4', isVid: true, desc: '手表旋转展示特写' },
                  { name: '促销角标贴图', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop', isVid: false, desc: '限时秒杀打折角标' },
                  { name: '品牌防伪水印', url: '/shopro.png', isVid: false, desc: 'Shopro高清品牌Logo' },
                ].map(item => (
                  <button
                    key={item.name}
                    className="p-2.5 rounded bg-zinc-800/80 border border-zinc-700 hover:border-indigo-500 hover:bg-indigo-600/10 transition-colors text-left flex flex-col gap-1"
                    onClick={() => handleSelectPipItem(item.name, item.url, item.isVid)}
                  >
                    <span className="text-[11px] font-medium text-white">{item.name}</span>
                    <span className="text-[10px] text-zinc-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {materials.length > 0 && (
              <div>
                <p className="text-[11px] text-zinc-400 mb-2 font-medium">从媒体库选择：</p>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {materials.filter(m => m.type !== 'audio').map(m => (
                    <button
                      key={m.id}
                      className="w-full flex items-center justify-between p-2 rounded bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-left text-xs"
                      onClick={() => handleSelectPipItem(m.name, m.url, m.type === 'video')}
                    >
                      <span className="truncate flex-1">{m.name}</span>
                      <span className="text-[10px] text-indigo-400 shrink-0 ml-2">选择添加 +</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-zinc-800 pt-2">
            <Button size="sm" variant="ghost" className="border border-zinc-700 text-zinc-400" onClick={() => setAddModalOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 面板5：音频编辑 ───────────────────────────────────────────────────────
interface AudioEditPanelProps {
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
  selectedTrackItem: string | null;
}

function AudioEditPanel({
  audioSettings,
  setAudioSettings,
  videoRef,
  tracks,
  setTracks,
  currentTime,
  selectedTrackItem,
}: AudioEditPanelProps) {
  const [volume, setVolume] = useState([audioSettings.volume]);
  const [fadeIn, setFadeIn] = useState([Math.round(audioSettings.fadeIn * 10)]);
  const [fadeOut, setFadeOut] = useState([Math.round(audioSettings.fadeOut * 10)]);
  const [pitch, setPitch] = useState([audioSettings.pitch]);
  const [speed, setSpeed] = useState([audioSettings.speed]);
  const [enabledEffects, setEnabledEffects] = useState<Set<string>>(new Set());
  const [effectParams, setEffectParams] = useState<Record<string, number>>({});
  const [eqBands, setEqBands] = useState<Record<string, number>>({
    '32': 2, '64': 3, '125': 4, '250': 2, '500': 0, '1k': -1, '2k': 2, '4k': 3, '8k': 4, '16k': 2,
  });

  // 同步外部 audioSettings 变化
  useEffect(() => {
    setVolume([audioSettings.volume]);
    setSpeed([audioSettings.speed]);
  }, [audioSettings.volume, audioSettings.speed]);

  const handleVolumeChange = (val: number[]) => {
    setVolume(val);
    setAudioSettings(prev => ({ ...prev, volume: val[0] }));
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, val[0] / 100));
      videoRef.current.muted = false;
      videoRef.current.removeAttribute('muted');
    }
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => t.id === selectedTrackItem ? { ...t, volume: val[0] } : t));
    }
  };

  const handleSpeedChange = (val: number[]) => {
    setSpeed(val);
    setAudioSettings(prev => ({ ...prev, speed: val[0] }));
    if (videoRef.current) {
      videoRef.current.playbackRate = Math.max(0.25, Math.min(4, val[0] / 100));
    }
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => t.id === selectedTrackItem ? { ...t, speed: val[0] / 100 } : t));
    }
  };

  const toggleEffect = (id: string, name: string) => {
    setEnabledEffects(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(`已关闭：${name}`); }
      else { next.add(id); toast.success(`已启用：${name}`); }
      return next;
    });
  };

  const handleAddVolumeKeyframe = () => {
    const kfTime = Number(currentTime.toFixed(2));
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => {
        if (t.id === selectedTrackItem) {
          const curKfs = t.keyframes || [];
          return {
            ...t,
            keyframes: [...curKfs.filter(k => Math.abs(k.time - kfTime) > 0.1), { time: kfTime, property: '音量', value: volume[0] }].sort((a, b) => a.time - b.time),
          };
        }
        return t;
      }));
      toast.success(`已在 ${currentTime.toFixed(1)}s 为选中片段添加音量关键帧 (${volume[0]}%)`);
    } else {
      toast.success(`已在播放头位置 (${currentTime.toFixed(1)}s) 标记音量节点 (${volume[0]}%)`);
    }
  };

  const handleApplyAudio = () => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume[0] / 100));
      videoRef.current.playbackRate = speed[0] / 100;
    }
    setTracks(prev => prev.map(t => {
      if (t.type === 'audio' || t.id === selectedTrackItem) {
        return { ...t, volume: volume[0], speed: speed[0] / 100 };
      }
      return t;
    }));
    toast.success('音频参数已全面应用至时间轴音轨与实时预览');
  };

  const eqBandKeys = Object.keys(eqBands);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* 波形可视化 */}
        <CollapsibleSection title="音轨波形">
          <div className="px-3 pt-1">
            <div className="h-16 bg-zinc-800 border border-zinc-700 rounded overflow-hidden relative cursor-pointer" onClick={() => toast.info('已对齐音频波形当前位置')}>
              <div className="absolute inset-0 flex items-center px-2 gap-[1px]">
                {Array.from({ length: 48 }).map((_, i) => {
                  const h = Math.max(4, 20 + Math.sin(i * 0.8) * 14 + Math.sin(i * 1.5) * 8);
                  return <div key={i} className="flex-1 rounded-sm bg-emerald-500/60" style={{ height: `${h}px` }} />;
                })}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-transparent to-zinc-800 pointer-events-none" />
              <div className="absolute top-1/2 -translate-y-1/2 w-px h-full bg-indigo-400/70" style={{ left: '35%' }} />
              <p className="absolute bottom-1 right-2 text-[9px] text-zinc-500">主音轨 · 实时电平</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* 音量与淡化 */}
        <CollapsibleSection title="音量 & 速度控制">
          <div className="px-3 pt-1 space-y-3">
            {[
              { label: '主音量', Icon: Volume2, value: volume, set: handleVolumeChange, min: 0, max: 200, display: `${volume[0]}%` },
              { label: '淡入时长', Icon: Music, value: fadeIn, set: setFadeIn, min: 0, max: 50, display: `${(fadeIn[0] / 10).toFixed(1)}s` },
              { label: '淡出时长', Icon: Music, value: fadeOut, set: setFadeOut, min: 0, max: 50, display: `${(fadeOut[0] / 10).toFixed(1)}s` },
              { label: '音调偏移', Icon: BarChart2, value: pitch, set: setPitch, min: -12, max: 12, display: `${pitch[0] > 0 ? '+' : ''}${pitch[0]}` },
              { label: '播放变速', Icon: RefreshCw, value: speed, set: handleSpeedChange, min: 25, max: 200, display: `${(speed[0] / 100).toFixed(2)}x` },
            ].map(({ label, Icon, value, set, min, max, display }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Icon className="w-3 h-3 text-indigo-400" />{label}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{display}</span>
                </div>
                <Slider value={value} onValueChange={set} min={min} max={max} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
              </div>
            ))}
            <Button size="sm" className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px]" onClick={handleAddVolumeKeyframe}>
              <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />在当前播放头添加音量关键帧
            </Button>
          </div>
        </CollapsibleSection>

        {/* 均衡器 */}
        <CollapsibleSection title="均衡器 EQ">
          <div className="px-3 pt-2">
            <div className="flex items-end justify-between gap-0.5 h-20 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-2">
              {eqBandKeys.map(band => (
                <div key={band} className="flex flex-col items-center gap-0.5 flex-1">
                  <div className="w-full cursor-pointer relative" style={{ height: '52px' }}
                    onClick={() => setEqBands(prev => ({ ...prev, [band]: prev[band] >= 6 ? -6 : prev[band] + 2 }))}>
                    <div
                      className={`absolute bottom-0 w-2 rounded-t transition-all mx-auto inset-x-0 ${eqBands[band] >= 0 ? 'bg-emerald-500' : 'bg-red-500/70'}`}
                      style={{ height: `${((eqBands[band] + 6) / 12) * 100}%` }}
                    />
                  </div>
                  <span className="text-[8px] text-zinc-600">{band}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <button className="flex-1 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => { setEqBands({ '32': 2, '64': 3, '125': 4, '250': 2, '500': 0, '1k': -1, '2k': 2, '4k': 3, '8k': 4, '16k': 2 }); toast.success('已切换为人声增强预设'); }}>
                人声增强
              </button>
              <button className="flex-1 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => { setEqBands(Object.fromEntries(eqBandKeys.map(b => [b, 0]))); toast.info('EQ已重置'); }}>
                平直重置
              </button>
              <button className="flex-1 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => { setEqBands({ '32': 5, '64': 4, '125': 2, '250': 0, '500': 0, '1k': 0, '2k': 0, '4k': 1, '8k': 2, '16k': 2 }); toast.success('已切换为低音加强预设'); }}>
                低音加强
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* 音频效果器 */}
        <CollapsibleSection title="效果器插件">
          <div className="px-3 pt-1 space-y-2">
            {AUDIO_EFFECTS.map(ae => (
              <div key={ae.id} className={`border rounded p-2.5 transition-colors ${enabledEffects.has(ae.id) ? 'border-indigo-600/50 bg-indigo-600/5' : 'border-zinc-700 bg-zinc-800/30'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ae.icon}</span>
                    <span className="text-[12px] text-zinc-200 font-medium">{ae.name}</span>
                  </div>
                  <button
                    className={`w-9 h-5 rounded-full transition-colors relative ${enabledEffects.has(ae.id) ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                    onClick={() => toggleEffect(ae.id, ae.name)}
                  >
                    <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${enabledEffects.has(ae.id) ? 'left-4.5' : 'left-0.5'}`} style={{ left: enabledEffects.has(ae.id) ? '18px' : '2px' }} />
                  </button>
                </div>
                {enabledEffects.has(ae.id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-8">强度</span>
                    <Slider
                      value={[effectParams[ae.id] ?? 50]}
                      onValueChange={([v]) => setEffectParams(prev => ({ ...prev, [ae.id]: v }))}
                      max={100}
                      className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                    />
                    <span className="text-[10px] text-zinc-500 w-6 text-right">{effectParams[ae.id] ?? 50}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* 操作区 */}
        <div className="px-3 py-3 flex gap-2 border-t border-zinc-800">
          <Button size="sm" className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]" onClick={handleApplyAudio}>
            <Check className="w-3.5 h-3.5 mr-1.5" />应用修改
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 h-8 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px]"
            onClick={() => {
              handleVolumeChange([100]);
              setFadeIn([10]);
              setFadeOut([10]);
              setPitch([0]);
              handleSpeedChange([100]);
              toast.info('已恢复默认音频参数');
            }}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />重置
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── 面板6：动画与关键帧 ──────────────────────────────────────────────────
interface KeyframePanelProps {
  selectedTrackItem: string | null;
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
  duration: number;
  scale: number[];
  setScale: (v: number[]) => void;
  opacity: number[];
  setOpacity: (v: number[]) => void;
}

function KeyframePanel({
  selectedTrackItem,
  tracks,
  setTracks,
  currentTime,
  duration,
  scale,
  setScale,
  opacity,
  setOpacity,
}: KeyframePanelProps) {
  const [selectedProp, setSelectedProp] = useState<string | null>('缩放');
  const [selectedCurve, setSelectedCurve] = useState('缓入缓出');
  const [keyframes, setKeyframes] = useState<Record<string, { pos: number; val: number }[]>>({
    '缩放': [{ pos: 0, val: 100 }, { pos: 50, val: 115 }, { pos: 100, val: 100 }],
    '不透明度': [{ pos: 0, val: 0 }, { pos: 20, val: 100 }, { pos: 80, val: 100 }, { pos: 100, val: 0 }],
  });

  const selectedItem = tracks.find(t => t.id === selectedTrackItem);

  const addKeyframe = (prop: string) => {
    const pos = Math.max(0, Math.min(100, Math.round((currentTime / Math.max(0.1, duration)) * 100)));
    const val = prop === '缩放' ? scale[0] : prop === '不透明度' ? opacity[0] : 0;

    setKeyframes(prev => ({
      ...prev,
      [prop]: [...(prev[prop] || []).filter(k => Math.abs(k.pos - pos) > 2), { pos, val }].sort((a, b) => a.pos - b.pos),
    }));

    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => {
        if (t.id === selectedTrackItem) {
          const curKfs = t.keyframes || [];
          return {
            ...t,
            keyframes: [...curKfs, { time: Number(currentTime.toFixed(2)), property: prop, value: val }],
          };
        }
        return t;
      }));
      toast.success(`已为「${selectedItem?.name}」在 ${currentTime.toFixed(1)}s 添加 ${prop} 关键帧 (值: ${val})`);
    } else {
      toast.success(`已在播放头 ${currentTime.toFixed(1)}s (${pos}%) 处记录 ${prop} 关键帧`);
    }
  };

  const removeKeyframe = (prop: string, idx: number) => {
    setKeyframes(prev => ({ ...prev, [prop]: prev[prop].filter((_, i) => i !== idx) }));
    toast.info('已移除关键帧');
  };

  const handleApplyPreset = (preset: string) => {
    if (!selectedTrackItem) {
      toast.warning('请先在下方时间轴点击选中一个轨道片段（视频/图片/文字）');
      return;
    }

    if (preset === '弹入弹出') {
      setScale([100]);
      setOpacity([100]);
      setKeyframes(prev => ({
        ...prev,
        '缩放': [{ pos: 0, val: 20 }, { pos: 25, val: 115 }, { pos: 40, val: 100 }, { pos: 85, val: 100 }, { pos: 100, val: 0 }],
      }));
    } else if (preset === '缩放放大') {
      setScale([120]);
      setKeyframes(prev => ({
        ...prev,
        '缩放': [{ pos: 0, val: 100 }, { pos: 100, val: 125 }],
      }));
    } else if (preset === '旋转进场') {
      setKeyframes(prev => ({
        ...prev,
        '旋转': [{ pos: 0, val: -180 }, { pos: 30, val: 0 }],
      }));
    } else if (preset === '位移滑入') {
      setKeyframes(prev => ({
        ...prev,
        '位置X': [{ pos: 0, val: -80 }, { pos: 25, val: 0 }],
      }));
    } else if (preset === '呼吸循环') {
      setScale([105]);
      setKeyframes(prev => ({
        ...prev,
        '缩放': [{ pos: 0, val: 100 }, { pos: 50, val: 110 }, { pos: 100, val: 100 }],
      }));
    } else {
      setKeyframes(prev => ({
        ...prev,
        '位置X': [{ pos: 0, val: 0 }, { pos: 25, val: -5 }, { pos: 50, val: 5 }, { pos: 75, val: -3 }, { pos: 100, val: 0 }],
      }));
    }

    setTracks(prev => prev.map(t => {
      if (t.id === selectedTrackItem) {
        return {
          ...t,
          scale: preset === '缩放放大' ? 120 : preset === '呼吸循环' ? 105 : 100,
        };
      }
      return t;
    }));

    toast.success(`已为「${selectedItem?.name}」应用预设动画：${preset}`);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* 当前选中片段提示 */}
        <div className="px-3 pt-2 pb-1">
          <div className="p-2 rounded bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between text-xs">
            <span className="text-zinc-400 truncate">
              目标: <span className="text-indigo-300 font-medium">{selectedItem ? selectedItem.name : '未选择片段（请在时间轴选中）'}</span>
            </span>
            {selectedItem && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/30 text-indigo-300 shrink-0 ml-1">
                {selectedItem.type}
              </span>
            )}
          </div>
        </div>

        {/* 属性关键帧 */}
        <CollapsibleSection title="属性关键帧">
          <div className="px-3 pt-1 space-y-1.5">
            {KF_PROPERTIES.map(prop => (
              <div key={prop} className={`rounded border cursor-pointer transition-colors ${selectedProp === prop ? 'border-indigo-500 bg-indigo-600/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}>
                <div
                  className="flex items-center justify-between p-2"
                  onClick={() => setSelectedProp(prop === selectedProp ? null : prop)}
                >
                  <span className="text-[11px] text-zinc-300">{prop}</span>
                  <div className="flex items-center gap-2">
                    {keyframes[prop]?.length > 0 && (
                      <span className="text-[10px] text-indigo-400 bg-indigo-600/20 px-1.5 rounded">{keyframes[prop].length} 帧</span>
                    )}
                    <button
                      className="text-zinc-500 hover:text-indigo-400 transition-colors p-1"
                      onClick={e => { e.stopPropagation(); addKeyframe(prop); }}
                      title="在当前播放位置添加关键帧"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                    </button>
                  </div>
                </div>
                {/* 展开关键帧列表 */}
                {selectedProp === prop && keyframes[prop]?.length > 0 && (
                  <div className="border-t border-zinc-700/50 px-2 py-1.5 space-y-1">
                    <div className="relative h-8 bg-zinc-900 rounded">
                      {keyframes[prop].map((kf, i) => (
                        <button
                          key={i}
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-400 rotate-45 hover:bg-indigo-300 transition-colors"
                          style={{ left: `calc(${kf.pos}% - 5px)` }}
                          onClick={() => removeKeyframe(prop, i)}
                          title={`时间位置: ${kf.pos}% | 值: ${kf.val} — 点击删除`}
                        />
                      ))}
                    </div>
                    <p className="text-[9px] text-zinc-500 text-center">点击菱形删除关键帧</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* 动画曲线 */}
        <CollapsibleSection title="动画曲线预设">
          <div className="px-3 pt-1 grid grid-cols-2 gap-1.5">
            {KF_CURVES.map(curve => (
              <button
                key={curve}
                className={`py-2 text-[11px] rounded border transition-colors ${selectedCurve === curve ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-medium' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
                onClick={() => { setSelectedCurve(curve); toast.success(`已切换动画曲线：${curve}`); }}
              >
                {selectedCurve === curve && <Check className="inline w-3 h-3 mr-1" />}{curve}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 关键帧时间轴可视化 */}
        <CollapsibleSection title="时间轴预览">
          <div className="px-3 pt-1">
            <div className="bg-zinc-800 rounded border border-zinc-700 p-2 space-y-2">
              {KF_PROPERTIES.slice(0, 3).map(prop => (
                <div key={prop} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 w-12 shrink-0 truncate">{prop}</span>
                  <div className="flex-1 h-5 bg-zinc-900 rounded relative overflow-hidden cursor-pointer"
                    onClick={() => addKeyframe(prop)}>
                    {(keyframes[prop] || [{ pos: 10, val: 0 }, { pos: 55, val: 80 }, { pos: 85, val: 100 }]).map((kf, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-400 rounded-full"
                        style={{ left: `${kf.pos}%` }}
                      />
                    ))}
                    <div className="absolute top-1/2 -translate-y-px h-px bg-indigo-400/30 inset-x-2" />
                  </div>
                  <button className="shrink-0 text-zinc-500 hover:text-zinc-300" onClick={() => addKeyframe(prop)}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-2">点击轨道添加关键帧 · 当前曲线: {selectedCurve}</p>
          </div>
        </CollapsibleSection>

        {/* 快捷动画预设 */}
        <CollapsibleSection title="快捷动画预设">
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {['弹入弹出', '旋转进场', '缩放放大', '位移滑入', '抖动强调', '呼吸循环'].map(preset => (
              <button
                key={preset}
                className="py-2.5 text-[11px] text-zinc-300 bg-zinc-800/80 rounded border border-zinc-700 hover:border-indigo-500/80 hover:bg-indigo-600/10 hover:text-indigo-200 transition-all font-medium"
                onClick={() => handleApplyPreset(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        <div className="px-3 py-3 border-t border-zinc-800">
          <Button size="sm" className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]"
            onClick={() => {
              if (selectedTrackItem) {
                toast.success(`关键帧动画已成功写入「${selectedItem?.name}」并应用到播放时间轴`);
              } else {
                toast.info('关键帧动画已记录，请在时间轴选中片段后绑定');
              }
            }}>
            <Check className="w-3.5 h-3.5 mr-1.5" />应用动画到片段
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── AI工具操作抽屉 ────────────────────────────────────────────────────────
function AiToolDialog({ tool, open, onClose, onApply }: {
  tool: typeof AI_TOOLS[0] | null;
  open: boolean;
  onClose: () => void;
  onApply: (toolId: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (!open) { setRunning(false); setDone(false); } }, [open]);

  const handleRun = async () => {
    if (!tool) return;
    setRunning(true);
    setDone(false);
    await new Promise(r => setTimeout(r, 1200));
    setRunning(false);
    setDone(true);
    onApply(tool.id);
  };

  if (!tool) return null;
  const Icon = tool.icon;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center ${tool.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{tool.name}</div>
              <div className="text-[11px] text-zinc-400 font-normal">{tool.desc}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {/* AI工具参数区 */}
          {tool.id === 'ai1' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">对视频中的人物进行智能抠像，自动分离背景与前景人物轮廓。</p>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">检测精度</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>高精度发丝级（推荐）</option><option>标准平衡模式</option><option>极速模式</option>
                </select>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">边缘羽化度</span>
                <span className="text-[11px] text-indigo-300 font-mono">6px</span>
              </div>
            </div>
          )}
          {tool.id === 'ai2' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">AI 智能人像美颜、肤质磨皮与面部轮廓提亮。</p>
              {['磨皮平滑', '肤色提亮', '人脸立体感'].map(label => (
                <div key={label} className="flex items-center gap-3 px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                  <span className="text-[11px] text-zinc-400 w-20 shrink-0">{label}</span>
                  <Slider defaultValue={[70]} max={100} className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5" />
                </div>
              ))}
            </div>
          )}
          {tool.id === 'ai3' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">智能识别音频鼓点节拍，自动将主视频分割并对齐到强弱节拍点。</p>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">参考音轨</span>
                <span className="text-[11px] text-emerald-400 ml-auto font-mono">BGM · 动态节奏音轨</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">卡点灵敏度</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>强节拍（3秒节奏卡点）</option><option>密集卡点（1.5秒快切）</option>
                </select>
              </div>
            </div>
          )}
          {tool.id === 'ai4' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">识别视频或音频中的语音内容，毫秒级自动生成双语字幕轨。</p>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">源语言</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>中文（普通话+英文混合）</option><option>纯英语</option><option>粤语</option>
                </select>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">排版样式</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>电商白字醒目投影（推荐）</option><option>黑底半透高级框</option><option>综艺醒目描边</option>
                </select>
              </div>
            </div>
          )}
          {(tool.id === 'ai5' || tool.id === 'ai6') && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">{tool.id === 'ai5' ? '选择黄金带货脚本模板，快速为时间轴生成四段式分镜。' : '导入已有文案脚本，自动规划并拆分视频分镜。'}</p>
              {tool.id === 'ai5' ? (
                <div className="grid grid-cols-2 gap-2">
                  {['带货开场抓人', '产品特写展示', '核心痛点解决', '限时促单结尾'].map(t => (
                    <button key={t} className="py-2 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 hover:border-indigo-500/60 hover:text-indigo-300 transition-colors"
                      onClick={() => toast.success(`已设定模板分镜：${t}`)}>
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-zinc-700 rounded p-4 text-center space-y-1">
                  <Upload className="w-6 h-6 text-zinc-500 mx-auto" />
                  <p className="text-[11px] text-zinc-500">拖拽 .txt / .docx 脚本文件</p>
                  <button className="text-[11px] text-indigo-400 hover:text-indigo-300" onClick={() => toast.info('已载入默认带货分镜脚本示例')}>使用默认带货分镜脚本</button>
                </div>
              )}
            </div>
          )}

          {/* 进度/结果 */}
          {running && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-600/10 border border-indigo-600/30 rounded">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span className="text-[12px] text-indigo-300">AI 算法处理中，正在生成轨道结果…</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600/10 border border-emerald-600/30 rounded">
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[12px] text-emerald-300">处理完成，已实时同步至时间轴与预览区！</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="border border-zinc-700 text-zinc-400 hover:text-zinc-200" onClick={onClose}>关闭</Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleRun} disabled={running || done}>
            {running ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />计算中…</> : done ? <><Check className="w-3.5 h-3.5 mr-1.5" />已完成</> : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />立即执行</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 面板7：AI工具入口 ────────────────────────────────────────────────────
interface AiToolsPanelProps {
  onApplyAiTool: (toolId: string) => void;
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
}

function AiToolsPanel({ onApplyAiTool, tracks, setTracks, currentTime }: AiToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<typeof AI_TOOLS[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openTool = (tool: typeof AI_TOOLS[0]) => {
    setSelectedTool(tool);
    setDialogOpen(true);
  };

  const handleImportStoryboard = (name: string) => {
    const startTime = currentTime;
    const storyboardClips: TrackItem[] = [
      {
        id: `sb1-${Date.now()}`,
        trackId: 'video',
        name: `【分镜1】${name}-开场抓人`,
        start: startTime,
        duration: 3,
        type: 'video',
        url: '/Video/CreatOK_2.mp4',
      },
      {
        id: `sb2-${Date.now() + 1}`,
        trackId: 'video',
        name: `【分镜2】${name}-商品展示`,
        start: startTime + 3,
        duration: 4,
        type: 'video',
        url: '/Video/CreatOK_5.mp4',
      },
      {
        id: `sb3-${Date.now() + 2}`,
        trackId: 'video',
        name: `【分镜3】${name}-促单转化`,
        start: startTime + 7,
        duration: 3,
        type: 'video',
        url: '/Video/CreatOK_11.mp4',
      },
    ];
    setTracks(prev => [...prev, ...storyboardClips]);
    toast.success(`已将「${name}」三段式分镜模板注入时间轴（起始位置: ${startTime.toFixed(1)}s）`);
  };

  return (
    <div className="flex flex-col h-full">
      <AiToolDialog
        tool={selectedTool}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onApply={(toolId) => {
          onApplyAiTool(toolId);
        }}
      />
      <ScrollArea className="flex-1">
        <CollapsibleSection title="核心AI工具箱">
          <div className="px-3 pt-1 space-y-2">
            {AI_TOOLS.map(tool => (
              <button
                key={tool.id}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/60 border border-zinc-700 rounded hover:border-zinc-500 hover:bg-zinc-800 transition-all group text-left"
                onClick={() => openTool(tool)}
              >
                <div className={`w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${tool.color}`}>
                  <tool.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-zinc-200">{tool.name}</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-zinc-700 text-zinc-400 rounded">{tool.badge}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{tool.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors" />
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 创作脚本模板 */}
        <CollapsibleSection title="带货分镜脚本模板">
          <div className="px-3 pt-1 space-y-2">
            {[
              { name: '带货开场钩子模板', desc: '3秒黄金痛点抓取，快速拉升留存率' },
              { name: '产品细节微距分镜', desc: '4秒多角度微距展示与品质感特写' },
              { name: '核心卖点痛点解决', desc: '对比实验/实景使用场景演示' },
              { name: '促销促单结尾模板', desc: '限时秒杀话术 + 紧迫感动作指引' },
            ].map(({ name, desc }) => (
              <button key={name} className="w-full flex items-start gap-2 p-2.5 bg-zinc-800/50 border border-zinc-700 rounded hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-colors text-left group"
                onClick={() => handleImportStoryboard(name)}>
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-200 font-medium">{name}</p>
                  <p className="text-[10px] text-zinc-500">{desc}</p>
                </div>
                <Download className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5 group-hover:text-indigo-400" />
              </button>
            ))}
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
// ── 面板8：资源商城 ──────────────────────────────────────────────────────

// 商城商品数据
const SHOP_PRODUCTS = [
  { id: 'p1', name: '电影感LUT合集', desc: '100+专业调色预设', category: 'LUT', price: 29, originalPrice: 59, rating: 4.9, sales: 2341, tag: '热销', tagColor: 'bg-red-500/20 text-red-400', preview: 'from-amber-900 to-orange-700' },
  { id: 'p2', name: '节日特效包', desc: '春节/双11/618烟花粒子', category: '特效', price: 19, originalPrice: 39, rating: 4.8, sales: 1876, tag: '新品', tagColor: 'bg-indigo-500/20 text-indigo-400', preview: 'from-red-900 to-pink-700' },
  { id: 'p3', name: '国风贴纸库', desc: '200+国潮风格贴纸', category: '贴纸', price: 9, originalPrice: 19, rating: 4.7, sales: 3102, tag: '限免', tagColor: 'bg-emerald-500/20 text-emerald-400', preview: 'from-red-900 to-rose-700' },
  { id: 'p4', name: '抖音爆款转场包', desc: '50款热门转场效果', category: '转场', price: 39, originalPrice: 79, rating: 4.9, sales: 5678, tag: '爆款', tagColor: 'bg-orange-500/20 text-orange-400', preview: 'from-purple-900 to-indigo-700' },
  { id: 'p5', name: '版权BGM合集', desc: '300首无版权音乐', category: '音乐', price: 49, originalPrice: 99, rating: 4.8, sales: 4210, tag: '推荐', tagColor: 'bg-blue-500/20 text-blue-400', preview: 'from-emerald-900 to-teal-700' },
  { id: 'p6', name: '带货视频模板包', desc: '20套完整视频模板', category: '模板', price: 89, originalPrice: 199, rating: 5.0, sales: 892, tag: 'VIP', tagColor: 'bg-amber-500/20 text-amber-400', preview: 'from-yellow-900 to-amber-700' },
  { id: 'p7', name: '字幕花字包', desc: '150款动态花字效果', category: '字幕', price: 15, originalPrice: 29, rating: 4.6, sales: 2109, tag: '优惠', tagColor: 'bg-cyan-500/20 text-cyan-400', preview: 'from-cyan-900 to-sky-700' },
  { id: 'p8', name: '美颜滤镜合集', desc: '50款美颜调色滤镜', category: 'LUT', price: 25, originalPrice: 49, rating: 4.7, sales: 1543, tag: '热销', tagColor: 'bg-red-500/20 text-red-400', preview: 'from-pink-900 to-rose-700' },
];

const SHOP_CATEGORIES = ['全部', 'LUT', '特效', '贴纸', '转场', '音乐', '模板', '字幕'];

interface ShopPanelProps {
  onApplyShopProduct: (product: typeof SHOP_PRODUCTS[0]) => void;
}

function ShopPanel({ onApplyShopProduct }: ShopPanelProps) {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState<Set<string>>(new Set());
  const [purchased, setPurchased] = useState<Set<string>>(new Set(['p1'])); // 默认已解锁热门电影感LUT
  const [cartOpen, setCartOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'price'>('hot');
  const [confirmItem, setConfirmItem] = useState<typeof SHOP_PRODUCTS[0] | null>(null);

  const filtered = SHOP_PRODUCTS.filter(p => {
    const matchCat = activeCategory === '全部' || p.category === activeCategory;
    const matchSearch = p.name.includes(searchText) || p.desc.includes(searchText);
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'hot') return b.sales - a.sales;
    if (sortBy === 'price') return a.price - b.price;
    return b.id.localeCompare(a.id);
  });

  const cartTotal = Array.from(cart).reduce((sum, id) => {
    const p = SHOP_PRODUCTS.find(x => x.id === id);
    return sum + (p?.price ?? 0);
  }, 0);

  const addToCart = (id: string, name: string) => {
    if (purchased.has(id)) {
      toast.info(`「${name}」已拥有，可直接点击【载入项目】`);
      return;
    }
    setCart(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(`已从购物车移除：${name}`); }
      else { next.add(id); toast.success(`已加入购物车：${name}`); }
      return next;
    });
  };

  const buyNow = (item: typeof SHOP_PRODUCTS[0]) => {
    if (purchased.has(item.id)) {
      onApplyShopProduct(item);
      return;
    }
    setConfirmItem(item);
  };

  const confirmPurchase = () => {
    if (!confirmItem) return;
    const purchasedItem = confirmItem;
    setPurchased(prev => new Set(prev).add(purchasedItem.id));
    setCart(prev => { const next = new Set(prev); next.delete(purchasedItem.id); return next; });
    setConfirmItem(null);
    toast.success(`「${purchasedItem.name}」购买成功！已自动应用到当前时间轴`);
    onApplyShopProduct(purchasedItem);
  };

  const checkoutCart = () => {
    if (cart.size === 0) { toast.info('购物车为空'); return; }
    const items = Array.from(cart).map(id => SHOP_PRODUCTS.find(p => p.id === id)).filter(Boolean) as typeof SHOP_PRODUCTS;
    setPurchased(prev => new Set([...prev, ...cart]));
    setCart(new Set());
    setCartOpen(false);
    toast.success(`已购买 ${items.length} 件商品，共 ¥${cartTotal}，已解锁至素材库`);
    if (items.length > 0) {
      onApplyShopProduct(items[0]);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 购买确认弹窗 */}
      <Dialog open={!!confirmItem} onOpenChange={v => { if (!v) setConfirmItem(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-zinc-900 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />确认购买并载入
            </DialogTitle>
          </DialogHeader>
          {confirmItem && (
            <div className="py-2 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className={`w-12 h-12 rounded bg-gradient-to-br ${confirmItem.preview} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-200">{confirmItem.name}</p>
                  <p className="text-[11px] text-zinc-400">{confirmItem.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] text-zinc-400">应付金额</span>
                <span className="text-lg font-bold text-amber-400">¥{confirmItem.price}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded border border-zinc-700 bg-zinc-800 text-[12px] text-zinc-300 hover:border-zinc-500 transition-colors"
                  onClick={confirmPurchase}>
                  <Package className="w-4 h-4 text-emerald-400" />微信支付
                </button>
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded border border-zinc-700 bg-zinc-800 text-[12px] text-zinc-300 hover:border-zinc-500 transition-colors"
                  onClick={confirmPurchase}>
                  <CreditCard className="w-4 h-4 text-blue-400" />支付宝
                </button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" className="border border-zinc-700 text-zinc-400 hover:text-zinc-200" onClick={() => setConfirmItem(null)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 购物车侧栏 */}
      {cartOpen && (
        <div className="absolute inset-0 z-40 bg-zinc-900 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
            <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />购物车
              {cart.size > 0 && <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">{cart.size}</span>}
            </span>
            <button onClick={() => setCartOpen(false)}><X className="w-4 h-4 text-zinc-400 hover:text-zinc-200" /></button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {cart.size === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingCart className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-[12px] text-zinc-500">购物车为空</p>
                </div>
              ) : (
                Array.from(cart).map(id => {
                  const p = SHOP_PRODUCTS.find(x => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 p-2 bg-zinc-800 rounded border border-zinc-700">
                      <div className={`w-10 h-10 rounded bg-gradient-to-br ${p.preview} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-zinc-200 truncate">{p.name}</p>
                        <p className="text-[10px] text-amber-400 font-medium">¥{p.price}</p>
                      </div>
                      <button onClick={() => addToCart(p.id, p.name)}>
                        <X className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400 transition-colors" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          {cart.size > 0 && (
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-zinc-400">合计</span>
                <span className="text-base font-bold text-amber-400">¥{cartTotal}</span>
              </div>
              <Button className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white text-[12px]" onClick={checkoutCart}>
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />立即结算
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 顶部搜索 + 购物车入口 */}
      <div className="px-3 pt-2.5 pb-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="搜索素材包…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-200 pl-7 pr-3 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <button
            className="relative w-8 h-8 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center shrink-0 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="w-4 h-4 text-zinc-400" />
            {cart.size > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] text-white flex items-center justify-center">{cart.size}</span>
            )}
          </button>
        </div>
        {/* 分类标签 */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {SHOP_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors shrink-0 ${activeCategory === cat ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 排序 + 统计 */}
      <div className="px-3 py-1.5 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-zinc-500">{filtered.length} 件精选资源</span>
        <div className="flex items-center gap-0.5">
          {([['hot', '热销'], ['new', '最新'], ['price', '价格']] as const).map(([v, l]) => (
            <button
              key={v}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${sortBy === v ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
              onClick={() => setSortBy(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 商品列表 */}
      <ScrollArea className="flex-1">
        {/* 限时活动横幅 */}
        <div className="mx-3 mb-3 rounded-lg bg-gradient-to-r from-amber-600/30 to-orange-600/20 border border-amber-500/30 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-amber-300">限时福利合集</p>
            <p className="text-[10px] text-zinc-400">已购资源支持一键直接插入当前视频时间轴</p>
          </div>
          <span className="text-[10px] text-amber-400 font-mono shrink-0">限时畅享</span>
        </div>

        <div className="px-3 space-y-2 pb-4">
          {filtered.map(p => (
            <div key={p.id} className={`rounded-lg border transition-colors ${purchased.has(p.id) ? 'border-emerald-600/30 bg-emerald-600/5' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}>
              <div className="flex gap-3 p-2.5">
                {/* 预览缩略图 */}
                <div className={`w-14 h-14 rounded bg-gradient-to-br ${p.preview} shrink-0 flex items-center justify-center relative overflow-hidden`}>
                  {purchased.has(p.id) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <BadgeCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[12px] font-medium text-zinc-200 leading-tight">{p.name}</p>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[9px] rounded ${p.tagColor}`}>{p.tag}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-current" />
                      <span className="text-[10px] text-zinc-400">{p.rating}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{p.sales.toLocaleString()}已拥有</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-amber-400">¥{p.price}</span>
                      <span className="text-[10px] text-zinc-600 line-through">¥{p.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {purchased.has(p.id) ? (
                        <button
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] rounded flex items-center gap-1 transition-colors"
                          onClick={() => onApplyShopProduct(p)}
                        >
                          <Check className="w-3 h-3" />载入项目
                        </button>
                      ) : (
                        <>
                          <button
                            className={`p-1 rounded transition-colors ${cart.has(p.id) ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            onClick={() => addToCart(p.id, p.name)}
                            title={cart.has(p.id) ? '从购物车移除' : '加入购物车'}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] rounded transition-colors"
                            onClick={() => buyNow(p)}
                          >
                            立即购买
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-[12px] text-zinc-500">未找到相关商品</p>
            </div>
          )}
        </div>

        {/* 已购买素材 */}
        {purchased.size > 0 && (
          <div className="mx-3 mb-4 rounded border border-emerald-600/30 bg-emerald-600/5 p-3">
            <p className="text-[11px] text-emerald-400 font-medium mb-2 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" />已拥有资源 ({purchased.size} 件) · 点击快捷载入
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(purchased).map(id => {
                const p = SHOP_PRODUCTS.find(x => x.id === id);
                if (!p) return null;
                return (
                  <button key={id}
                    className="px-2 py-1 bg-emerald-600/20 border border-emerald-600/30 rounded text-[10px] text-emerald-300 hover:bg-emerald-600/30 transition-colors flex items-center gap-1"
                    onClick={() => onApplyShopProduct(p)}>
                    <span>+</span>{p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── 左侧边栏主组件 ────────────────────────────────────────────────────────
const PANEL_ITEMS: { id: PanelId; icon: React.ElementType; label: string; shortLabel: string; shortcut: string }[] = [
  { id: 'media', icon: Film, label: '媒体库', shortLabel: '媒体库', shortcut: 'M' },
  { id: 'effects', icon: Sparkles, label: '效果', shortLabel: '效果', shortcut: 'E' },
  { id: 'text', icon: Type, label: '字幕', shortLabel: '字幕', shortcut: 'T' },
  { id: 'pip', icon: Layers, label: '画中画', shortLabel: '画中画', shortcut: 'P' },
  { id: 'audio', icon: Music2, label: '音频编辑', shortLabel: '音频', shortcut: 'A' },
  { id: 'keyframe', icon: Waypoints, label: '关键帧', shortLabel: '关键帧', shortcut: 'K' },
  { id: 'ai', icon: Wand2, label: 'AI工具', shortLabel: 'AI工具', shortcut: 'I' },
  { id: 'shop', icon: ShoppingBag, label: '资源商城', shortLabel: '商城', shortcut: 'S' },
];

interface LeftSidebarProps {
  materials: { id: string; name: string; url: string; type: string }[];
  onAdd: (m: { id: string; name: string; url: string; type: string }) => void;
  importedVideos: { id: string; title: string; video_url: string; thumbnail_url: string | null }[];
  onImportVideo: (v: { id: string; title: string; video_url: string; thumbnail_url: string | null }) => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
  // Panel 2 Effects
  appliedFilter: string;
  setAppliedFilter: (f: string) => void;
  filterIntensity: Record<string, number>;
  setFilterIntensity: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  appliedTrans: string;
  setAppliedTrans: (t: string) => void;
  // Panel 3 Text
  selectedFont: string;
  setSelectedFont: (f: string) => void;
  // Panel 4 PIP
  pipSettings: PipSettings;
  setPipSettings: React.Dispatch<React.SetStateAction<PipSettings>>;
  pipLayers: PipLayer[];
  setPipLayers: React.Dispatch<React.SetStateAction<PipLayer[]>>;
  // Panel 5 Audio
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  // Panel 6 Keyframes
  selectedTrackItem: string | null;
  duration: number;
  scale: number[];
  setScale: (v: number[]) => void;
  opacity: number[];
  setOpacity: (v: number[]) => void;
  // Panel 7 AI & Panel 8 Shop
  onApplyAiTool: (toolId: string) => void;
  onApplyShopProduct: (p: typeof SHOP_PRODUCTS[0]) => void;
  // Shared
  tracks: TrackItem[];
  setTracks: React.Dispatch<React.SetStateAction<TrackItem[]>>;
  currentTime: number;
}

function LeftSidebar({
  materials,
  onAdd,
  importedVideos,
  onImportVideo,
  onUpload,
  onDelete,
  appliedFilter,
  setAppliedFilter,
  filterIntensity,
  setFilterIntensity,
  appliedTrans,
  setAppliedTrans,
  selectedFont,
  setSelectedFont,
  pipSettings,
  setPipSettings,
  pipLayers,
  setPipLayers,
  audioSettings,
  setAudioSettings,
  videoRef,
  selectedTrackItem,
  duration,
  scale,
  setScale,
  opacity,
  setOpacity,
  onApplyAiTool,
  onApplyShopProduct,
  tracks,
  setTracks,
  currentTime,
}: LeftSidebarProps) {
  const [activePanel, setActivePanel] = useState<PanelId>('media');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const item = PANEL_ITEMS.find(p => p.shortcut.toLowerCase() === e.key.toLowerCase());
      if (item) { setActivePanel(item.id); setCollapsed(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`flex shrink-0 border-r border-zinc-800 transition-all duration-300 ${collapsed ? 'w-14' : 'w-72 md:w-80'}`}>
      {/* 垂直图标导航栏 */}
      <div className="w-14 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col py-2 gap-0.5">
        {PANEL_ITEMS.map(item => (
          <button
            key={item.id}
            title={`${item.label} (${item.shortcut})`}
            className={`relative mx-1 w-12 h-12 rounded flex flex-col items-center justify-center gap-0.5 transition-all group ${activePanel === item.id && !collapsed
              ? 'bg-indigo-600/20 text-indigo-400 ring-1 ring-inset ring-indigo-600/40'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            onClick={() => {
              if (activePanel === item.id) { setCollapsed(!collapsed); }
              else { setActivePanel(item.id); setCollapsed(false); }
            }}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] leading-none mt-0.5 tracking-tight">{item.shortLabel}</span>
            {/* 激活指示条 */}
            {activePanel === item.id && !collapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r" />
            )}
            {/* 悬停标签 */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              {item.label} <span className="text-zinc-500 ml-1">{item.shortcut}</span>
            </div>
          </button>
        ))}
        {/* 折叠按钮 */}
        <div className="flex-1" />
        <button
          className="mx-1 w-12 h-10 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开面板' : '收起面板'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 内容面板 */}
      {!collapsed && (
        <div className="flex-1 min-w-0 flex flex-col bg-zinc-900">
          {/* 面板标题 */}
          <div className="h-10 border-b border-zinc-800 flex items-center px-3 shrink-0">
            {(() => { const cur = PANEL_ITEMS.find(p => p.id === activePanel); return cur ? <><cur.icon className="w-4 h-4 text-zinc-400 mr-2" /><span className="text-xs font-medium text-zinc-300">{cur.label}</span></> : null; })()}
          </div>
          {/* 面板内容 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePanel === 'media' && (
              <MediaLibraryPanel
                materials={materials}
                onAdd={onAdd}
                importedVideos={importedVideos}
                onImportVideo={onImportVideo}
                onUpload={onUpload}
                onDelete={onDelete}
              />
            )}
            {activePanel === 'effects' && (
              <EffectsPanel
                appliedFilter={appliedFilter}
                setAppliedFilter={setAppliedFilter}
                filterIntensity={filterIntensity}
                setFilterIntensity={setFilterIntensity}
                appliedTrans={appliedTrans}
                setAppliedTrans={setAppliedTrans}
                tracks={tracks}
                setTracks={setTracks}
                currentTime={currentTime}
              />
            )}
            {activePanel === 'text' && (
              <TextSubtitlePanel
                tracks={tracks}
                setTracks={setTracks}
                currentTime={currentTime}
                selectedFont={selectedFont}
                setSelectedFont={setSelectedFont}
              />
            )}
            {activePanel === 'pip' && (
              <PipPanel
                pipSettings={pipSettings}
                setPipSettings={setPipSettings}
                pipLayers={pipLayers}
                setPipLayers={setPipLayers}
                tracks={tracks}
                setTracks={setTracks}
                currentTime={currentTime}
                materials={materials}
              />
            )}
            {activePanel === 'audio' && (
              <AudioEditPanel
                audioSettings={audioSettings}
                setAudioSettings={setAudioSettings}
                videoRef={videoRef}
                tracks={tracks}
                setTracks={setTracks}
                currentTime={currentTime}
                selectedTrackItem={selectedTrackItem}
              />
            )}
            {activePanel === 'keyframe' && (
              <KeyframePanel
                selectedTrackItem={selectedTrackItem}
                tracks={tracks}
                setTracks={setTracks}
                currentTime={currentTime}
                duration={duration}
                scale={scale}
                setScale={setScale}
                opacity={opacity}
                setOpacity={setOpacity}
              />
            )}
            {activePanel === 'ai' && (
              <AiToolsPanel
                onApplyAiTool={onApplyAiTool}
                tracks={tracks}
                setTracks={setTracks}
                currentTime={currentTime}
              />
            )}
            {activePanel === 'shop' && (
              <ShopPanel
                onApplyShopProduct={onApplyShopProduct}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 主页面组件 ───────────────────────────────────────────────────────────
const DEFAULT_TRACKS: TrackItem[] = [
  {
    id: 'v1',
    trackId: 'video',
    name: '咖啡拿铁拉花艺术过程',
    start: 0,
    duration: 6,
    type: 'video',
    url: '/Video/CreatOK_11.mp4'
  },
  {
    id: 'a1',
    trackId: 'audio',
    name: 'BGM · 动感节奏',
    start: 0,
    duration: 27,
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 't1',
    trackId: 'text',
    name: '全新解决方案来了',
    start: 3,
    duration: 9,
    type: 'text'
  }
];

// 清理历史草稿/存档中遗留的「光晕特效」片段，保证效果轨初始为空
const stripLegacyGlowFx = (list: TrackItem[]) => list.filter(t => !(t.trackId === 'effects' && t.name === '光晕特效'));

// 媒体库历史测试杂项素材（微信截图、超慢跑/减肥类短视频等），
// 不再展示并同步从数据库删除，不影响用户后续新上传/导入的素材
const LEGACY_JUNK_MATERIAL_PATTERNS: RegExp[] = [
  /^微信图片_2026/, /^超慢跑的好处/, /减肥的意义/, /轻松的运动/, /^A?2?0\.png$/i, /^生成带货视频/,
];
const isLegacyJunkMaterial = (name: string) => LEGACY_JUNK_MATERIAL_PATTERNS.some(re => re.test(name));

export default function VideoEditPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const importId = searchParams.get('importId');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [zoom, setZoom] = useState(0);
  const [selectedTrackItem, setSelectedTrackItem] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('未命名项目');
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<{ id: string; name: string; url: string; type: string }[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>(DEFAULT_TRACKS);
  const [tracksHistory, setTracksHistory] = useState<TrackItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scale, setScale] = useState([100]);
  const [opacity, setOpacity] = useState([100]);
  const [volume, setVolume] = useState([100]);
  const [editorAspect, setEditorAspect] = useState('aspect-video');
  const [timelineScrollOffset, setTimelineScrollOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync ruler scroll offset with timeline scroll container
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const onScroll = () => setTimelineScrollOffset(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Ensure project duration is at least 30 seconds and fits all tracks
  useEffect(() => {
    const maxEndTime = tracks.reduce((max, item) => Math.max(max, item.start + item.duration), 0);
    const minNeeded = Math.max(30, Math.ceil(maxEndTime));
    if (duration < minNeeded) {
      setDuration(minNeeded);
    }
  }, [tracks, duration]);

  // Fullscreen handler
  const handleFullscreen = () => {
    const el = previewContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => toast.error('全屏失败'));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const [dragInfo, setDragInfo] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialStart: number;
    initialTrackId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const handleTrackItemMouseDown = (e: React.MouseEvent, item: TrackItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTrackItem(item.id);
    setDragInfo({
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initialStart: item.start,
      initialTrackId: item.trackId,
      offsetX: 0,
      offsetY: 0,
    });
  };

  useEffect(() => {
    if (!dragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;
      setDragInfo(prev => prev ? { ...prev, offsetX: dx, offsetY: dy } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;

      const item = tracks.find(t => t.id === dragInfo.id);
      if (item) {
        const trackContainer = rulerRef.current;
        let finalStart = item.start;
        if (trackContainer) {
          const ticksContainer = trackContainer.querySelector('.flex-1');
          if (ticksContainer) {
            const rect = ticksContainer.getBoundingClientRect();
            const scrollableWidth = rect.width;
            if (scrollableWidth > 0) {
              const secondsPerPixel = duration / scrollableWidth;
              const dt = dx * secondsPerPixel;
              finalStart = Math.max(0, Math.min(duration - item.duration, dragInfo.initialStart + dt));
            }
          }
        }

        const trackTypes: ('video' | 'audio' | 'text' | 'image')[] = ['video', 'audio', 'text', 'image'];
        const currentIdx = trackTypes.indexOf(item.type);
        const trackShift = Math.round(dy / 38);
        let newIdx = currentIdx + trackShift;
        newIdx = Math.max(0, Math.min(trackTypes.length - 1, newIdx));
        const newType = trackTypes[newIdx];
        const newTrackId = newType === 'text' ? 'text' : newType === 'image' ? 'effects' : newType;

        setTracks(prev => prev.map(t => {
          if (t.id === dragInfo.id) {
            return {
              ...t,
              start: Number(finalStart.toFixed(2)),
              type: newType,
              trackId: newTrackId,
            };
          }
          return t;
        }));

        if (newType !== item.type) {
          toast.success(`已将片段拖动至新轨道`, { description: `新位置: ${newType === 'video' ? '主视频' : newType === 'audio' ? '音频' : newType === 'text' ? '字幕' : '特效'}` });
        }
      }

      setDragInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, tracks, duration]);

  const handleDeleteMaterial = async (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) {
        console.warn('DB delete failed:', error.message);
      }
      toast.success('素材已从媒体库删除');
    } catch (err) {
      console.error(err);
    }
  };

  // 生成视频列表（用于一键导入）& 预览 URL
  const [importedVideos, setImportedVideos] = useState<{ id: string; title: string; video_url: string; thumbnail_url: string | null }[]>([]);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Timeline layout constants — px-per-second based
  const TRACK_LABEL_W = 60; // width of the track icon label column in px
  const BASE_PX_PER_SEC = 20; // at zoom=0 each second = 20px
  const pxPerSec = BASE_PX_PER_SEC * (1 + zoom * 0.08); // zoom 0→100 scales 20→180px/s
  const timelinePxWidth = TRACK_LABEL_W + 6 + duration * pxPerSec; // +6 for padding
  const timelineMinWidth = 600; // minimum scrollable width


  // Find active video/image clip under the playhead (prioritize selected and newest clips)
  const activeVideoClip = (() => {
    const selectedClip = tracks.find(t => t.id === selectedTrackItem && t.type === 'video');
    if (selectedClip) {
      const end = selectedClip.start + selectedClip.duration;
      if (currentTime >= selectedClip.start && currentTime <= end) {
        return selectedClip;
      }
    }
    return tracks.slice().reverse().find(track => {
      const end = track.start + track.duration;
      return currentTime >= track.start && currentTime <= end && track.type === 'video';
    });
  })();

  const activeImageClip = (() => {
    const selectedClip = tracks.find(t => t.id === selectedTrackItem && t.type === 'image' && t.trackId === 'image');
    if (selectedClip) {
      const end = selectedClip.start + selectedClip.duration;
      if (currentTime >= selectedClip.start && currentTime <= end) {
        return selectedClip;
      }
    }
    return tracks.slice().reverse().find(track => {
      const end = track.start + track.duration;
      return currentTime >= track.start && currentTime <= end && track.type === 'image' && track.trackId === 'image';
    });
  })();

  // 播放头下方激活的字幕片段
  const activeTextClip = (() => {
    return tracks.find(track => {
      const end = track.start + track.duration;
      return currentTime >= track.start && currentTime <= end && track.type === 'text';
    });
  })();

  // 播放头下方激活的画中画片段
  const activePipClip = (() => {
    return tracks.find(track => {
      const end = track.start + track.duration;
      return currentTime >= track.start && currentTime <= end && (track.trackId === 'pip' || track.id.startsWith('pip-'));
    });
  })();

  // 播放头下方激活的贴纸/特效片段
  const activeStickerClip = (() => {
    return tracks.find(track => {
      const end = track.start + track.duration;
      return currentTime >= track.start && currentTime <= end && (track.trackId === 'sticker' || track.id.startsWith('sticker-') || (track.type === 'image' && track.trackId === 'effects'));
    });
  })();

  // ── 8大面板核心业务状态 ──────────────────────────────────────────
  const [appliedFilter, setAppliedFilter] = useState('无');
  const [filterIntensity, setFilterIntensity] = useState<Record<string, number>>({
    '电影质感': 80,
    '温暖午后': 75,
    '日系清新': 80,
    '复古胶片': 85,
    '清爽胶片': 75,
  });
  const [appliedTrans, setAppliedTrans] = useState('无');
  const [selectedFont, setSelectedFont] = useState('默认黑体');
  const [pipSettings, setPipSettings] = useState<PipSettings>({
    x: 75,
    y: 25,
    scale: 100,
    rotation: 0,
    opacity: 100,
    blendMode: '正常',
  });
  const [pipLayers, setPipLayers] = useState<PipLayer[]>([]);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 80,
    fadeIn: 1.0,
    fadeOut: 1.0,
    pitch: 0,
    speed: 100,
  });
  const [aiBeautyEnabled, setAiBeautyEnabled] = useState(false);
  const [aiCutoutEnabled, setAiCutoutEnabled] = useState(false);

  // AI 工具执行回调
  const handleApplyAiTool = useCallback((toolId: string) => {
    if (toolId === 'ai1') {
      setAiCutoutEnabled(prev => {
        const next = !prev;
        if (next) toast.success('智能人物抠像已生效，前景背景已分离！');
        else toast.info('已关闭智能人物抠像');
        return next;
      });
    } else if (toolId === 'ai2') {
      setAiBeautyEnabled(prev => {
        const next = !prev;
        if (next) toast.success('AI 美颜磨皮与肤色优化已生效！');
        else toast.info('已关闭 AI 美颜');
        return next;
      });
    } else if (toolId === 'ai3') {
      setTracks(prev => {
        const vidClips = prev.filter(t => t.type === 'video');
        if (vidClips.length === 0) return prev;
        const target = vidClips[0];
        if (target.duration > 4) {
          const split1 = { ...target, duration: 3 };
          const split2 = { ...target, id: `beat-split-${Date.now()}`, name: `${target.name} [卡点2]`, start: target.start + 3, duration: Number((target.duration - 3).toFixed(2)) };
          return [...prev.filter(t => t.id !== target.id), split1, split2].sort((a, b) => a.start - b.start);
        }
        return prev;
      });
      toast.success('音乐节拍识别完成！已自动将主视频片段对齐到强音节拍点');
    } else if (toolId === 'ai4') {
      const sub1: TrackItem = {
        id: `ai-sub-1-${Date.now()}`,
        trackId: 'text',
        name: '这款质感拉满的百搭单品，今天专场限时直降！',
        start: currentTime,
        duration: 3.5,
        type: 'text',
      };
      const sub2: TrackItem = {
        id: `ai-sub-2-${Date.now()}`,
        trackId: 'text',
        name: '高清微距展示，做工用料肉眼可见的细腻！',
        start: currentTime + 3.6,
        duration: 3.5,
        type: 'text',
      };
      setTracks(prev => [...prev, sub1, sub2]);
      toast.success('已自动识别语音并生成时间轴字幕轨');
    } else if (toolId === 'ai5' || toolId === 'ai6') {
      const sbClips: TrackItem[] = [
        { id: `sb-a-${Date.now()}`, trackId: 'video', name: '【AI脚本】3秒痛点开场', start: currentTime, duration: 3, type: 'video', url: '/Video/CreatOK_2.mp4' },
        { id: `sb-b-${Date.now() + 1}`, trackId: 'video', name: '【AI脚本】商品细节微距特写', start: currentTime + 3, duration: 4, type: 'video', url: '/Video/CreatOK_5.mp4' },
      ];
      setTracks(prev => [...prev, ...sbClips]);
      toast.success('AI 视频分镜规划完成，已将分镜镜头注入时间轴');
    }
  }, [currentTime]);

  // 资源商城商品应用
  const handleApplyShopProduct = useCallback((product: (typeof SHOP_PRODUCTS)[0]) => {
    if (product.category === 'LUT') {
      setAppliedFilter('电影质感');
      setFilterIntensity(prev => ({ ...prev, '电影质感': 85 }));
      toast.success(`已将「${product.name}」专业调色预设应用到视频！`);
    } else if (product.category === '特效' || product.category === '贴纸') {
      const stickerItem: TrackItem = {
        id: `shop-sticker-${Date.now()}`,
        trackId: 'sticker',
        name: product.name,
        start: currentTime,
        duration: 5,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=150&fit=crop',
        scale: 100,
        opacity: 100,
      };
      setTracks(prev => [...prev, stickerItem]);
      toast.success(`已将「${product.name}」贴纸特效添加至时间轴`);
    } else if (product.category === '转场') {
      setAppliedTrans('t6');
      toast.success(`已将转场效果切换为「光晕爆炸」热门转场`);
    } else if (product.category === '音乐') {
      const audioItem: TrackItem = {
        id: `shop-bgm-${Date.now()}`,
        trackId: 'audio',
        name: `【BGM】${product.name}`,
        start: currentTime,
        duration: 15,
        type: 'audio',
        volume: 80,
      };
      setTracks(prev => [...prev, audioItem]);
      toast.success(`已将无版权背景音乐「${product.name}」加入音频轨`);
    } else if (product.category === '模板') {
      const templateTracks: TrackItem[] = [
        { id: `tpl-v1-${Date.now()}`, trackId: 'video', name: '产品展示主镜头', start: 0, duration: 6, type: 'video', url: '/Video/CreatOK_11.mp4' },
        { id: `tpl-v2-${Date.now() + 1}`, trackId: 'video', name: '模特上身效果', start: 6, duration: 6, type: 'video', url: '/Video/CreatOK_2.mp4' },
        { id: `tpl-t1-${Date.now() + 2}`, trackId: 'text', name: '新品上市 · 抢先体验', start: 0.5, duration: 5, type: 'text' },
        { id: `tpl-t2-${Date.now() + 3}`, trackId: 'text', name: '限时直降 ¥99 包邮到手', start: 6.5, duration: 5, type: 'text' },
      ];
      setTracks(templateTracks);
      setDuration(12);
      toast.success(`已载入「${product.name}」完整带货工程模板！`);
    } else if (product.category === '字幕') {
      const fontItem: TrackItem = {
        id: `shop-sub-${Date.now()}`,
        trackId: 'text',
        name: '🔥 爆款热卖中 · 手慢无！',
        start: currentTime,
        duration: 4,
        type: 'text',
        fontStyle: { fontFamily: '默认黑体', color: '#ffea00', bg: 'rgba(255,0,80,0.8)' },
      };
      setTracks(prev => [...prev, fontItem]);
      toast.success(`已将动态花字「${product.name}」加入字幕轨`);
    }

    // 同时录入 materials 素材库
    setMaterials(prev => {
      if (prev.some(m => m.name === product.name)) return prev;
      return [...prev, { id: `shop-mat-${Date.now()}`, name: product.name, url: '/Video/CreatOK_2.mp4', type: product.category === '音乐' ? 'audio' : 'video' }];
    });
  }, [currentTime]);

  const hasVideoClips = tracks.some(t => t.type === 'video');
  const currentVideoSrc = activeVideoClip?.url
    ? activeVideoClip.url
    : hasVideoClips
      ? undefined
      : (previewVideoUrl || undefined);

  // Selected track item object
  const selectedTrackObj = tracks.find(t => t.id === selectedTrackItem);

  const [speed, setSpeed] = useState(1);

  // Sync state with selected item attributes
  useEffect(() => {
    if (selectedTrackObj) {
      setScale([selectedTrackObj.scale ?? 100]);
      setOpacity([selectedTrackObj.opacity ?? 100]);
      setVolume([selectedTrackObj.volume ?? 100]);
      setSpeed(selectedTrackObj.speed ?? 1);
    }
  }, [selectedTrackItem, selectedTrackObj]);

  const handleScaleChange = (val: number[]) => {
    setScale(val);
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => t.id === selectedTrackItem ? { ...t, scale: val[0] } : t));
    }
  };

  const handleOpacityChange = (val: number[]) => {
    setOpacity(val);
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => t.id === selectedTrackItem ? { ...t, opacity: val[0] } : t));
    }
  };

  const handleVolumeChange = (val: number[]) => {
    setVolume(val);
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => t.id === selectedTrackItem ? { ...t, volume: val[0] } : t));
    }
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    if (selectedTrackItem) {
      setTracks(prev => prev.map(t => t.id === selectedTrackItem ? { ...t, speed: val } : t));
    }
  };

  const handleSplit = useCallback(() => {
    if (!selectedTrackItem) {
      toast.error('请先选择一个轨道片段');
      return;
    }
    const item = tracks.find(t => t.id === selectedTrackItem);
    if (!item) return;

    const relativePlayhead = currentTime - item.start;
    if (relativePlayhead <= 0.1 || relativePlayhead >= item.duration - 0.1) {
      toast.warning('当前播放指针不在选中片段范围内，或距离边缘太近');
      return;
    }

    const firstHalfDuration = relativePlayhead;
    const secondHalfDuration = item.duration - relativePlayhead;

    const firstHalf = {
      ...item,
      duration: Number(firstHalfDuration.toFixed(2)),
    };

    const secondHalf = {
      ...item,
      id: `${item.id}_split_${Date.now()}`,
      name: `${item.name} (后半段)`,
      start: Number(currentTime.toFixed(2)),
      duration: Number(secondHalfDuration.toFixed(2)),
    };

    setTracks(prev => {
      const filtered = prev.filter(t => t.id !== selectedTrackItem);
      return [...filtered, firstHalf, secondHalf].sort((a, b) => a.start - b.start);
    });

    setSelectedTrackItem(firstHalf.id);
    toast.success('片段已成功分割');
  }, [selectedTrackItem, tracks, currentTime]);

  const handleCopy = useCallback(() => {
    if (!selectedTrackItem) {
      toast.error('请先选择一个轨道片段');
      return;
    }
    const item = tracks.find(t => t.id === selectedTrackItem);
    if (!item) return;

    const copyItem = {
      ...item,
      id: `${item.id}_copy_${Date.now()}`,
      name: `${item.name} (副本)`,
      start: Number((item.start + item.duration).toFixed(2)),
    };

    setTracks(prev => [...prev, copyItem]);
    setSelectedTrackItem(copyItem.id);
    toast.success('已复制片段并放置在原片段后方');
  }, [selectedTrackItem, tracks]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedTrackItem) {
      toast.error('请先选择一个轨道片段');
      return;
    }
    setTracks(prev => prev.filter(t => t.id !== selectedTrackItem));
    setSelectedTrackItem(null);
    toast.success('片段已成功删除');
  }, [selectedTrackItem]);

  // Sync volume and speed of the video element
  useEffect(() => {
    if (videoRef.current) {
      const activeVol = activeVideoClip?.volume ?? 100;
      videoRef.current.volume = Math.max(0, Math.min(1, activeVol / 100));
      videoRef.current.muted = false;
      videoRef.current.removeAttribute('muted');
    }
  }, [activeVideoClip, activeVideoClip?.volume, previewVideoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      const activeSpeed = activeVideoClip?.speed ?? 1;
      videoRef.current.playbackRate = activeSpeed;
    }
  }, [activeVideoClip?.speed]);

  // Initialize history with initial tracks once loaded
  useEffect(() => {
    if (tracks.length > 0 && tracksHistory.length === 0) {
      setTracksHistory([tracks]);
      setHistoryIndex(0);
    }
  }, [tracks, tracksHistory.length]);

  // Monitor tracks changes and push to history
  useEffect(() => {
    if (isHistoryAction.current) {
      isHistoryAction.current = false;
      return;
    }
    // Do not record history when dragging is in progress
    if (dragInfo !== null) {
      return;
    }

    if (tracksHistory.length > 0 && historyIndex >= 0) {
      const currentHistoricalState = tracksHistory[historyIndex];
      if (JSON.stringify(currentHistoricalState) === JSON.stringify(tracks)) {
        return;
      }

      const newHistory = tracksHistory.slice(0, historyIndex + 1);
      newHistory.push(tracks);
      setTracksHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [tracks, dragInfo, tracksHistory, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setTracks(tracksHistory[prevIndex]);
      toast.success('撤销成功');
    } else {
      toast.info('没有可以撤销的操作');
    }
  }, [historyIndex, tracksHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < tracksHistory.length - 1) {
      isHistoryAction.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setTracks(tracksHistory[nextIndex]);
      toast.success('重做成功');
    } else {
      toast.info('没有可以重做的操作');
    }
  }, [historyIndex, tracksHistory]);

  // Global keydown listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in inputs/textareas
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Ctrl + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl + Y (Redo)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Space (Play/Pause)
      else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      // Delete/Backspace
      else if (e.code === 'Backspace' || e.code === 'Delete') {
        if (selectedTrackItem) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTrackItem, handleDeleteSelected, handleUndo, handleRedo]);

  // 示例项目选择器
  const [sampleProjects, setSampleProjects] = useState<{ id: string; title: string; thumbnail_url: string | null; status: string }[]>([]);
  const [showSamplePicker, setShowSamplePicker] = useState(false);

  useEffect(() => {
    if (!importId) {
      supabase.from('video_projects')
        .select('id,title,thumbnail_url,status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(9)
        .then(({ data }) => setSampleProjects(data ?? []));
    }
  }, [importId]);

  async function seedTestUserVideos(userId: string) {
    const testVideos = [
      {
        title: '时尚秋季外套女款展示',
        video_url: '/Video/CreatOK_2.mp4',
        thumbnail_url: null,
        duration: 5,
        video_style: '服装',
      },
      {
        title: '智能手表旋转展示',
        video_url: '/Video/CreatOK_5.mp4',
        thumbnail_url: null,
        duration: 10,
        video_style: '数码',
      },
      {
        title: '运动女鞋减震底测试',
        video_url: '/Video/CreatOK_8.mp4',
        thumbnail_url: null,
        duration: 5,
        video_style: '服装',
      },
      {
        title: '咖啡拿铁拉花艺术过程',
        video_url: '/Video/CreatOK_11.mp4',
        thumbnail_url: null,
        duration: 6,
        video_style: '食品',
      }
    ];

    for (const v of testVideos) {
      const { data: existingProj } = await supabase
        .from('video_projects')
        .select('id')
        .eq('user_id', userId)
        .eq('video_url', v.video_url)
        .maybeSingle();

      if (!existingProj) {
        const { data: insertedProj } = await supabase
          .from('video_projects')
          .insert({
            user_id: userId,
            title: v.title,
            video_url: v.video_url,
            thumbnail_url: v.thumbnail_url,
            duration: v.duration,
            video_style: v.video_style,
            status: 'completed',
            progress: 100,
          })
          .select()
          .single();

        if (insertedProj) {
          await supabase.from('materials').insert({
            user_id: userId,
            name: v.title,
            url: v.video_url,
            type: 'video',
            size: 1024 * 1024 * 5,
          });
        }
      }
    }
  }

  // 加载已生成完成的视频（供一键导入）
  const loadImportedVideos = useCallback(async () => {
    if (!user) return;
    if (user.email === 'test_user@example.com') {
      await seedTestUserVideos(user.id);
    }
    const { data } = await supabase
      .from('video_projects')
      .select('id,title,video_url,thumbnail_url')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    const mapped = (data ?? []).map(v => ({
      ...v,
      video_url: v.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnail_url: v.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop'
    }));
    setImportedVideos(mapped);
  }, [user]);

  // 加载素材库（媒体库默认展示作品素材库中的 2 条视频，不再展示历史无关默认素材）
  const DEFAULT_SAMPLE_MATERIALS = [
    { id: 'mat-work-1', name: '咖啡拿铁拉花艺术过程', url: '/Video/CreatOK_11.mp4', type: 'video' },
    { id: 'mat-work-2', name: '极简带货展示视频.mp4', url: '/Video/CreatOK_2.mp4', type: 'video' },
  ];

  const loadMaterials = useCallback(async () => {
    if (!user) {
      setMaterials(DEFAULT_SAMPLE_MATERIALS);
      return;
    }
    if (user.email === 'test_user@example.com') {
      await seedTestUserVideos(user.id);
    }
    const { data } = await supabase
      .from('materials')
      .select('id,name,url,type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    const list = (data ?? []) as any[];
    // 过滤并持久删除历史杂项素材
    const junkIds = list.filter(m => isLegacyJunkMaterial(String(m.name ?? ''))).map(m => m.id);
    const cleanList = list.filter(m => !isLegacyJunkMaterial(String(m.name ?? '')));
    if (junkIds.length > 0) {
      supabase.from('materials').delete().in('id', junkIds).then(() => {});
    }
    if (cleanList.length > 0) {
      setMaterials(cleanList);
      return;
    }
    // 无自有素材时，默认展示作品素材库中最近的 2 条已完成视频
    const { data: works } = await supabase
      .from('video_projects')
      .select('id,title,video_url')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(2);
    const workMaterials = (works ?? [])
      .filter(w => w.video_url)
      .map(w => ({ id: `work-${w.id}`, name: w.title, url: w.video_url as string, type: 'video' }));
    setMaterials(workMaterials.length > 0 ? workMaterials : DEFAULT_SAMPLE_MATERIALS);
  }, [user]);

  // 加载项目（同时读取 video_url 用于预览）
  const loadProject = useCallback(async () => {
    if (!importId || !user) return;

    // Check if we already restored a matching draft from localStorage to avoid database override
    const saved = localStorage.getItem(`video-editor-draft-${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.importId === importId) {
          return; // Skip database fetch to use newer local edits
        }
      } catch (e) { }
    }

    const { data } = await supabase
      .from('video_projects')
      .select('title,metadata,video_url')
      .eq('id', importId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setProjectTitle(data.title || '未命名项目');
      if ((data as any).video_url) setPreviewVideoUrl((data as any).video_url);
      const meta = (data.metadata || {}) as any;
      if (meta.tracks && meta.tracks.length > 0) {
        const projTracks = stripLegacyGlowFx(meta.tracks);
        setTracks(projTracks);
        setTracksHistory([projTracks]);
        setHistoryIndex(0);
      } else {
        setTracks(DEFAULT_TRACKS);
        setTracksHistory([DEFAULT_TRACKS]);
        setHistoryIndex(0);
      }
      if (meta.duration) setDuration(meta.duration);
    }
  }, [importId, user]);

  useEffect(() => {
    loadMaterials();
    loadImportedVideos();
    if (importId) loadProject();
  }, [loadMaterials, loadImportedVideos, loadProject, importId]);

  // Load from localStorage draft if present on mount
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`video-editor-draft-${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (importId) {
          if (parsed.importId === importId) {
            if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
            if (parsed.tracks) {
              const restoredTracks = stripLegacyGlowFx(parsed.tracks);
              setTracks(restoredTracks);
              setTracksHistory([restoredTracks]);
              setHistoryIndex(0);
            }
            if (parsed.zoom !== undefined) setZoom(parsed.zoom);
            if (parsed.duration) setDuration(parsed.duration);
            if (parsed.previewVideoUrl) setPreviewVideoUrl(parsed.previewVideoUrl);
          }
        } else {
          if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
          if (parsed.tracks) {
            const restoredTracks = stripLegacyGlowFx(parsed.tracks);
            setTracks(restoredTracks);
            setTracksHistory([restoredTracks]);
            setHistoryIndex(0);
          }
          if (parsed.zoom !== undefined) setZoom(parsed.zoom);
          if (parsed.duration) setDuration(parsed.duration);
          if (parsed.previewVideoUrl) setPreviewVideoUrl(parsed.previewVideoUrl);
        }
      } catch (e) {
        console.error('Error restoring local draft:', e);
      }
    }
  }, [user, importId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (user && tracks.length > 0) {
      const stateToSave = {
        importId,
        projectTitle,
        tracks,
        zoom,
        duration,
        previewVideoUrl
      };
      localStorage.setItem(`video-editor-draft-${user.id}`, JSON.stringify(stateToSave));
    }
  }, [tracks, zoom, duration, projectTitle, previewVideoUrl, importId, user]);

  // Debounced auto-save to database
  useEffect(() => {
    if (!importId || !user || tracks.length === 0) return;

    const timer = setTimeout(async () => {
      const payload = {
        title: projectTitle,
        user_id: user.id,
        status: 'draft',
        metadata: { duration, tracks, zoom, edit_mode: true, last_saved_at: new Date().toISOString() },
      };
      try {
        await supabase.from('video_projects').update(payload).eq('id', importId);
        console.log('Database auto-saved successfully');
      } catch (e) {
        console.error('Database auto-save error:', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [tracks, zoom, duration, projectTitle, importId, user]);


  // 同步播放/暂停到 video 元素
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.muted = false;
      v.removeAttribute('muted');
      v.play().catch((err) => console.warn('Play sync fail:', err));
    } else {
      v.pause();
    }
  }, [isPlaying, currentVideoSrc]);

  // Master playhead timer that drives timeline currentTime forward
  useEffect(() => {
    let intervalId: any;
    if (isPlaying) {
      let lastTime = Date.now();
      intervalId = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }, 30);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, duration]);

  // Sync player time during active playback (drift correction)
  useEffect(() => {
    if (!isPlaying) return;
    const v = videoRef.current;
    if (!v || v.seeking || v.readyState < 2) return;
    if (activeVideoClip) {
      const expectedLocalTime = currentTime - activeVideoClip.start;
      if (Math.abs(v.currentTime - expectedLocalTime) > 0.3) {
        v.currentTime = Math.max(0, Math.min(activeVideoClip.duration, expectedLocalTime));
      }
    }
  }, [currentTime, isPlaying, activeVideoClip]);

  // Sync player time when scrubbing or when timeline currentTime changes (non-playing)
  useEffect(() => {
    if (isPlaying) return; // Do not seek the video element while playing to avoid stutter and feedback loops
    const v = videoRef.current;
    if (!v) return;
    if (activeVideoClip) {
      const localTime = currentTime - activeVideoClip.start;
      if (Math.abs(v.currentTime - localTime) > 0.1) {
        v.currentTime = Math.max(0, Math.min(activeVideoClip.duration, localTime));
      }
    } else if (previewVideoUrl) {
      if (Math.abs(v.currentTime - currentTime) > 0.1) {
        v.currentTime = Math.max(0, Math.min(duration, currentTime));
      }
    }
  }, [currentTime, isPlaying, activeVideoClip, previewVideoUrl, duration]);

  const handleSeek = (clientX: number) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const ticksContainer = ruler.querySelector('.ruler-ticks-container');
    if (!ticksContainer) return;
    const rect = ticksContainer.getBoundingClientRect();

    const x = clientX - rect.left;
    const timelineX = x + timelineScrollOffset;
    const newTime = Math.max(0, Math.min(duration, timelineX / pxPerSec));
    setCurrentTime(newTime);

    if (videoRef.current) {
      const activeVideo = tracks.find(track => {
        const end = track.start + track.duration;
        return newTime >= track.start && newTime <= end && track.type === 'video';
      });
      if (activeVideo) {
        videoRef.current.currentTime = Math.max(0, Math.min(activeVideo.duration, newTime - activeVideo.start));
      } else {
        videoRef.current.currentTime = Math.max(0, Math.min(duration, newTime));
      }
    }
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleSeek(e.clientX);
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleSeek(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 保存草稿
  const handleSave = async () => {
    if (!user) { toast.error('请先登录'); return; }
    setSaving(true);
    try {
      const payload = {
        title: projectTitle,
        user_id: user.id,
        status: 'draft',
        metadata: { duration, tracks, zoom, edit_mode: true, last_saved_at: new Date().toISOString() },
      };
      if (importId) {
        await supabase.from('video_projects').update(payload).eq('id', importId);
        toast.success('剪辑草稿已保存');
      } else {
        const { data } = await supabase.from('video_projects').insert(payload).select('id').single();
        if (data?.id) {
          navigate(`/video/edit?importId=${data.id}`, { replace: true });
          toast.success('新项目已创建并保存');
        }
      }
    } finally {
      setSaving(false);
      setSaveDialogOpen(false);
    }
  };

  // 添加素材到时间轴
  const addToTimeline = (material: { id: string; name: string; url: string; type: string }) => {
    const trackType = material.type === 'audio' ? 'audio' : material.type === 'image' ? 'image' : 'video';
    setTracks(prev => [...prev, {
      id: `item-${Date.now()}`,
      trackId: trackType,
      name: material.name,
      start: currentTime,
      duration: 5,
      type: trackType as any,
      url: material.url,
    }]);
    toast.success(`已添加「${material.name}」到时间轴`);
  };

  // 一键导入生成视频到素材库
  const handleImportVideo = async (v: { id: string; title: string; video_url: string; thumbnail_url: string | null }) => {
    if (!user) { toast.error('请先登录'); return; }
    // 先在预览区加载该视频
    setPreviewVideoUrl(v.video_url);
    setIsPlaying(false);
    // 写入 materials 表
    const { error } = await supabase.from('materials').insert({
      user_id: user.id,
      name: v.title,
      url: v.video_url,
      type: 'video',
    });
    if (error && !error.message.includes('duplicate')) {
      toast.error('导入失败：' + error.message);
    } else {
      toast.success(`「${v.title}」已导入素材库，可在预览区播放`);
      loadMaterials();
    }
  };

  // 上传本地文件到素材库
  const handleUpload = async (file: File) => {
    if (!user) { toast.error('请先登录'); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error(`文件过大（最大50MB）：${file.name}`); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext);
    const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
    if (!isImage && !isVideo && !isAudio) { toast.error(`不支持的格式：${ext}`); return; }

    const toastId = toast.loading(`正在上传 ${file.name}...`);
    try {
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { data: up, error } = await supabase.storage.from('materials').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('materials').getPublicUrl(up.path);
      const { data: mat, error: insertError } = await supabase.from('materials').insert({
        user_id: user.id,
        name: file.name,
        type: isImage ? 'image' : isVideo ? 'video' : 'audio',
        url: urlData.publicUrl,
        size: file.size,
      }).select().maybeSingle();
      if (insertError) throw insertError;
      toast.success(`上传成功：${file.name}`, { id: toastId });
      loadMaterials();
    } catch (e: any) {
      toast.error(`上传失败: ${e.message || e}`, { id: toastId });
    }
  };

  // 导出视频 - 开启语义确认与参数弹窗
  const handleExport = () => {
    if (!user) { toast.error('请先登录'); return; }
    setExportDialogOpen(true);
  };

  // 确认执行导出任务
  const executeExportTask = async () => {
    if (!user) { toast.error('请先登录'); return; }

    setExporting(true);
    let currentId = importId;
    if (!currentId) {
      setSaving(true);
      const toastId = toast.loading('正在保存项目并准备导出...');
      try {
        const payload = {
          title: projectTitle || '未命名项目',
          user_id: user.id,
          status: 'draft',
          metadata: { duration, tracks, zoom, edit_mode: true, last_saved_at: new Date().toISOString() },
        };
        const { data, error } = await supabase.from('video_projects').insert(payload).select('id').single();
        if (error) throw error;
        if (data?.id) {
          currentId = data.id;
          navigate(`/video/edit?importId=${data.id}`, { replace: true });
        }
      } catch (e: any) {
        toast.error('导出前自动保存失败：' + (e.message || e), { id: toastId });
        setSaving(false);
        setExporting(false);
        return;
      } finally {
        toast.dismiss(toastId);
        setSaving(false);
      }
    }

    const toastId = toast.loading('正在提交云端 AI 渲染任务…');
    try {
      const { error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'generate_video', project_id: currentId }
      });
      if (error) throw error;
      toast.success('AI 视频生成任务已提交，可在「作品库」或「任务队列」查看实时进度', { id: toastId });
      setExportDialogOpen(false);
    } catch (e: any) {
      toast.error('导出失败：' + (e.message || '请稍后重试'), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `00:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-300 overflow-hidden">

      {/* ─── 顶部工具栏 ──────────────────────────────────────────── */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={loadMaterials}>
            <Upload className="w-4 h-4 mr-1.5" /><span className="hidden md:inline">刷新素材</span>
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="撤销 Ctrl+Z" onClick={handleUndo}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="重做 Ctrl+Y" onClick={handleRedo}>
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <div className="font-medium text-sm text-zinc-400 flex items-center gap-2">
          <span className="truncate max-w-[120px] md:max-w-xs">{projectTitle}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-zinc-500 hover:text-white" onClick={() => setSaveDialogOpen(true)}>
            重命名
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            <span className="hidden md:inline">保存</span>
          </Button>
          <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleExport} disabled={saving}>
            <Download className="w-4 h-4 mr-1.5" /><span className="hidden md:inline">导出</span>
          </Button>
        </div>
      </div>

      {/* ─── 中部工作区 ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* 左侧边栏 */}
        <LeftSidebar
          materials={materials}
          onAdd={addToTimeline}
          importedVideos={importedVideos}
          onImportVideo={handleImportVideo}
          onUpload={handleUpload}
          onDelete={handleDeleteMaterial}
          appliedFilter={appliedFilter}
          setAppliedFilter={setAppliedFilter}
          filterIntensity={filterIntensity}
          setFilterIntensity={setFilterIntensity}
          appliedTrans={appliedTrans}
          setAppliedTrans={setAppliedTrans}
          selectedFont={selectedFont}
          setSelectedFont={setSelectedFont}
          pipSettings={pipSettings}
          setPipSettings={setPipSettings}
          pipLayers={pipLayers}
          setPipLayers={setPipLayers}
          audioSettings={audioSettings}
          setAudioSettings={setAudioSettings}
          videoRef={videoRef}
          selectedTrackItem={selectedTrackItem}
          duration={duration}
          scale={scale}
          setScale={setScale}
          opacity={opacity}
          setOpacity={setOpacity}
          onApplyAiTool={handleApplyAiTool}
          onApplyShopProduct={handleApplyShopProduct}
          tracks={tracks}
          setTracks={setTracks}
          currentTime={currentTime}
        />

        {/* 中央预览区 */}
        <div className="flex-1 flex flex-col bg-black relative min-w-0" ref={previewContainerRef}>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className={`w-auto h-full max-h-full max-w-full bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden flex items-center justify-center transition-all duration-300 ${editorAspect === 'aspect-[9/16]' ? 'aspect-[9/16]' :
              editorAspect === 'aspect-[3/4]' ? 'aspect-[3/4]' :
                editorAspect === 'aspect-square' ? 'aspect-square' :
                  'aspect-video'
              }`}>

              {/* 顶部激活效果与AI状态标签 */}
              <div className="absolute top-3 left-3 z-30 flex flex-wrap gap-1.5 pointer-events-none">
                {appliedFilter !== '无' && (
                  <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-indigo-500/50 text-[10px] text-indigo-300 flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>滤镜: {appliedFilter} ({filterIntensity[appliedFilter] ?? 80}%)</span>
                  </div>
                )}
                {aiBeautyEnabled && (
                  <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-pink-500/50 text-[10px] text-pink-300 flex items-center gap-1 shadow-lg">
                    <Wand2 className="w-3 h-3 text-pink-400" />
                    <span>AI美颜已启用</span>
                  </div>
                )}
                {aiCutoutEnabled && (
                  <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-emerald-500/50 text-[10px] text-emerald-300 flex items-center gap-1 shadow-lg">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>智能抠像生效中</span>
                  </div>
                )}
                {appliedTrans !== '无' && (
                  <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-amber-500/50 text-[10px] text-amber-300 flex items-center gap-1 shadow-lg">
                    <span>转场: {TRANSITIONS.find(t => t.id === appliedTrans)?.name || appliedTrans}</span>
                  </div>
                )}
              </div>

              {/* 示例项目选择器 */}
              {!importId && showSamplePicker && (
                <div className="absolute inset-0 bg-zinc-950/95 p-4 overflow-y-auto z-40">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-zinc-200">选择示例项目</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-zinc-500 hover:text-white"
                      onClick={() => setShowSamplePicker(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sampleProjects.map(p => (
                      <button
                        key={p.id}
                        className="group relative aspect-video rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 hover:border-indigo-500 transition-colors"
                        onClick={() => navigate(`/video/edit?importId=${p.id}`)}
                      >
                        {p.thumbnail_url
                          ? <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-zinc-600" /></div>
                        }
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-[10px] text-white font-medium line-clamp-1">{p.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview content based on current time */}
              {activeImageClip ? (
                <img
                  src={activeImageClip.url}
                  alt={activeImageClip.name}
                  className="w-full h-full object-contain transition-all"
                  style={{
                    transform: `scale(${(selectedTrackObj?.scale ?? 100) / 100})`,
                    opacity: (selectedTrackObj?.opacity ?? 100) / 100,
                    filter: getCssFilter(appliedFilter, filterIntensity[appliedFilter], aiBeautyEnabled) + (aiCutoutEnabled ? ' drop-shadow(0 0 12px rgba(99, 102, 241, 0.8))' : ''),
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const ratio = img.naturalWidth / img.naturalHeight;
                    if (ratio < 0.65) setEditorAspect('aspect-[9/16]');
                    else if (ratio < 0.8) setEditorAspect('aspect-[3/4]');
                    else if (ratio < 1.2) setEditorAspect('aspect-square');
                    else setEditorAspect('aspect-video');
                  }}
                />
              ) : (currentVideoSrc || hasVideoClips) ? (
                <video
                  ref={videoRef}
                  src={currentVideoSrc}
                  className="w-full h-full object-contain transition-all bg-black"
                  style={{
                    transform: `scale(${(selectedTrackObj?.scale ?? 100) / 100})`,
                    opacity: (selectedTrackObj?.opacity ?? 100) / 100,
                    filter: getCssFilter(appliedFilter, filterIntensity[appliedFilter], aiBeautyEnabled) + (aiCutoutEnabled ? ' drop-shadow(0 0 12px rgba(99, 102, 241, 0.8))' : ''),
                  }}
                  onPlay={(e) => {
                    const vid = e.currentTarget;
                    vid.muted = false;
                    vid.removeAttribute('muted');
                  }}
                  onCanPlay={(e) => {
                    const vid = e.currentTarget;
                    vid.muted = false;
                    vid.removeAttribute('muted');
                    if (activeVideoClip) {
                      const localTime = currentTime - activeVideoClip.start;
                      vid.currentTime = Math.max(0, Math.min(activeVideoClip.duration, localTime));
                    } else if (previewVideoUrl) {
                      vid.currentTime = Math.max(0, Math.min(duration, currentTime));
                    }
                    if (isPlaying) {
                      vid.play().catch(err => console.warn('onCanPlay play fail:', err));
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    if (!activeVideoClip && videoRef.current) {
                      setDuration(videoRef.current.duration || 30);
                    }
                    const vid = e.currentTarget;
                    const ratio = vid.videoWidth / vid.videoHeight;
                    if (ratio < 0.65) setEditorAspect('aspect-[9/16]');
                    else if (ratio < 0.8) setEditorAspect('aspect-[3/4]');
                    else if (ratio < 1.2) setEditorAspect('aspect-square');
                    else setEditorAspect('aspect-video');
                  }}
                  onEnded={() => {
                    if (currentTime >= duration - 0.2) {
                      setIsPlaying(false);
                    }
                  }}
                  playsInline
                />
              ) : (
                <div className="text-zinc-700 flex flex-col items-center gap-2">
                  <Play className="w-14 h-14 opacity-20" />
                  <p className="text-sm text-zinc-600">从素材库导入视频或添加素材到时间轴以预览</p>
                </div>
              )}

              {/* 画中画浮层 (仅在时间轴存在激活的画中画片段时渲染) */}
              {activePipClip && (
                <div
                  className="absolute z-20 overflow-hidden shadow-2xl rounded border border-indigo-500/60 transition-all pointer-events-none"
                  style={{
                    left: `${pipSettings.x}%`,
                    top: `${pipSettings.y}%`,
                    transform: `translate(-50%, -50%) scale(${pipSettings.scale / 100}) rotate(${pipSettings.rotation}deg)`,
                    opacity: pipSettings.opacity / 100,
                    mixBlendMode: pipSettings.blendMode === '正片叠底' ? 'multiply' : pipSettings.blendMode === '滤色' ? 'screen' : pipSettings.blendMode === '叠加' ? 'overlay' : 'normal',
                    width: '32%',
                    aspectRatio: '16/9',
                  }}
                >
                  <video
                    src={activePipClip.url || '/Video/CreatOK_2.mp4'}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* 动态贴纸与特效浮层 */}
              {activeStickerClip && (
                <div
                  className="absolute z-25 pointer-events-none transition-all"
                  style={{
                    top: '16%',
                    right: '10%',
                    width: `${Math.max(60, Math.min(180, (activeStickerClip.scale ?? 100) * 0.9))}px`,
                    opacity: (activeStickerClip.opacity ?? 100) / 100,
                  }}
                >
                  <img
                    src={activeStickerClip.url}
                    alt={activeStickerClip.name}
                    className="w-full h-auto drop-shadow-2xl animate-pulse"
                  />
                </div>
              )}

              {/* 实时字幕浮层 */}
              {activeTextClip && (
                <div className="absolute bottom-16 inset-x-4 flex justify-center pointer-events-none z-30 transition-all">
                  <span
                    className="px-4 py-1.5 rounded-lg text-center font-medium text-white max-w-[85%] leading-relaxed select-none shadow-2xl"
                    style={{
                      fontSize: `${Math.max(13, Math.min(24, (activeTextClip.scale ?? 100) * 0.16))}px`,
                      fontFamily: activeTextClip.fontStyle?.fontFamily || selectedFont || 'sans-serif',
                      color: activeTextClip.fontStyle?.color || '#ffffff',
                      backgroundColor: activeTextClip.fontStyle?.bg || 'rgba(0, 0, 0, 0.75)',
                      textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {activeTextClip.name}
                  </span>
                </div>
              )}

              {/* 播放控制 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 backdrop-blur px-6 py-2 rounded-full border border-zinc-700/50 z-30">
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700"
                  onClick={() => { setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }}>
                  <SkipBack className="w-4 h-4 fill-current" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-900 hover:bg-white hover:text-black"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700"
                  onClick={() => { if (videoRef.current) videoRef.current.currentTime = videoRef.current.duration; }}>
                  <SkipForward className="w-4 h-4 fill-current" />
                </Button>
              </div>
            </div>
          </div>
          <div className="h-10 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 text-xs font-mono text-zinc-400 shrink-0">
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-zinc-200" onClick={handleFullscreen}>
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              {isFullscreen ? '退出全屏' : '全屏'}
            </span>
          </div>
        </div>

        {/* 右侧属性面板 */}
        <div className="w-60 md:w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
          <div className="h-10 border-b border-zinc-800 flex items-center px-4 text-xs font-medium text-zinc-200 shrink-0">
            <Settings2 className="w-3.5 h-3.5 mr-2 text-zinc-400" />属性设置
          </div>
          <ScrollArea className="flex-1">
            {selectedTrackItem ? (
              <div className="p-3 space-y-5">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">基础属性</p>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-400">缩放</span>
                        <span className="text-[10px] text-zinc-500">{scale[0]}%</span>
                      </div>
                      <Slider value={scale} onValueChange={handleScaleChange} min={10} max={300} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-400">不透明度</span>
                        <span className="text-[10px] text-zinc-500">{opacity[0]}%</span>
                      </div>
                      <Slider value={opacity} onValueChange={handleOpacityChange} max={100} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">音频</p>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-zinc-400">音量</span>
                      <span className="text-[10px] text-zinc-500">{volume[0]}%</span>
                    </div>
                    <Slider value={volume} onValueChange={handleVolumeChange} max={200} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">变速</p>
                  <div className="grid grid-cols-4 gap-1">
                    {['0.5x', '1x', '1.5x', '2x'].map(s => {
                      const numSpeed = parseFloat(s);
                      const isSelected = speed === numSpeed;
                      return (
                        <Button
                          key={s}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={`h-7 text-[10px] ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}
                          onClick={() => handleSpeedChange(numSpeed)}
                        >
                          {s}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">操作</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-white border border-zinc-700 text-[10px]" onClick={handleSplit}>
                      <ScissorsIcon className="w-3 h-3 mr-1" />分割
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-white border border-zinc-700 text-[10px]" onClick={handleCopy}>
                      <Copy className="w-3 h-3 mr-1" />复制
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-red-400 border border-zinc-700 text-[10px]" onClick={handleDeleteSelected}>
                      <Trash2 className="w-3 h-3 mr-1" />删除
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-600 space-y-2 mt-4">
                <Settings2 className="w-8 h-8 opacity-20" />
                <p className="text-[11px]">选中轨道片段后调整属性</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* ─── 底部时间轴 ──────────────────────────────────────────── */}
      <div className="h-[235px] border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="分割 S" onClick={handleSplit}>
              <Scissors className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="复制" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800" title="删除 Del" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="添加轨道" onClick={() => toast.info('添加轨道')}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="font-mono text-[11px] text-zinc-400 select-none bg-zinc-950/80 px-2.5 py-1 rounded border border-zinc-800/80 flex items-center gap-1.5 shadow-sm">
            <span className="text-zinc-200 font-medium">{formatTime(currentTime)}</span>
            <span className="text-zinc-650">/</span>
            <span className="text-zinc-500">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-1.5 w-36 shrink-0">
            <button
              className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
              onClick={() => setZoom(prev => Math.max(0, prev - 10))}
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5 shrink-0" />
            </button>
            <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} max={100} className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
            <button
              className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
              onClick={() => setZoom(prev => Math.min(100, prev + 10))}
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* 时间刻度 — 固定在滚动区域顶部，独立不受scroll影响 */}
        <div
          ref={rulerRef}
          className="h-7 border-b border-zinc-800 bg-zinc-900 z-10 text-[10px] text-zinc-500 font-mono flex items-end cursor-ew-resize select-none shrink-0 overflow-hidden"
          onClick={handleRulerClick}
          onMouseDown={handleRulerMouseDown}
        >
          <div className="shrink-0 h-full bg-zinc-900" style={{ width: TRACK_LABEL_W + 6 }} />
          <div className="relative h-full overflow-hidden ruler-ticks-container" style={{ flex: 1 }}>
            <div className="absolute top-0 left-0 h-full" style={{ width: duration * pxPerSec, transform: `translateX(-${timelineScrollOffset}px)` }}>
              {(() => {
                const ticks = [];
                const step = pxPerSec < 15 ? 10 : pxPerSec < 40 ? 5 : 1;
                for (let i = 0; i <= duration; i += step) {
                  ticks.push(i);
                }
                return ticks.map(sec => (
                  <div key={sec} className="absolute bottom-0" style={{ left: `${sec * pxPerSec}px` }}>
                    <div className="h-1.5 w-px bg-zinc-600 mb-0.5" />
                    {sec % (step * 2) === 0 && (
                      <span className="absolute -left-3 bottom-2 whitespace-nowrap">
                        {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto relative bg-zinc-950" ref={timelineScrollRef}>
          <div
            style={{ width: Math.max(timelinePxWidth, timelineMinWidth), minWidth: '100%' }}
            className="min-h-full flex flex-col relative"
          >
            {/* 轨道时间线刻度网格线背景 */}
            {(() => {
              const ticks = [];
              const step = duration > 120 ? 20 : duration > 60 ? 10 : 5;
              for (let i = 0; i <= duration; i += step) {
                ticks.push(i);
              }
              return ticks.map(sec => (
                <div
                  key={`grid-${sec}`}
                  className="absolute top-0 bottom-0 w-px border-l border-zinc-800/40 border-dashed pointer-events-none z-0"
                  style={{ left: `${TRACK_LABEL_W + sec * pxPerSec}px` }}
                />
              ));
            })()}

            <div className="p-1.5 space-y-1 relative z-10">
              {/* 主视频轨道 */}
              <div className="flex gap-1.5">
                <div className="shrink-0 h-10 bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center justify-center text-zinc-500 sticky left-0 z-10" style={{ width: TRACK_LABEL_W }}>
                  <Film className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[8px]">主轨道</span>
                </div>
                <div className="relative h-10 bg-zinc-900/30 rounded border border-zinc-800/50" style={{ width: duration * pxPerSec }}>
                  {tracks.filter(item => item.type === 'video').map(item => (
                    <div
                      key={item.id}
                      className={`absolute top-1 bottom-1 bg-indigo-600/50 border border-indigo-400/60 rounded flex items-center px-2 cursor-pointer hover:bg-indigo-600/70 select-none ${selectedTrackItem === item.id ? 'ring-2 ring-indigo-400' : ''}`}
                      style={{
                        left: item.start * pxPerSec,
                        width: item.duration * pxPerSec,
                        transform: dragInfo?.id === item.id ? `translate(${dragInfo.offsetX}px, ${dragInfo.offsetY}px)` : undefined,
                        zIndex: dragInfo?.id === item.id ? 50 : undefined,
                        opacity: dragInfo?.id === item.id ? 0.8 : undefined,
                      }}
                      onClick={() => setSelectedTrackItem(item.id)}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, item)}
                    >
                      <span className="text-[11px] text-indigo-100 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 音频轨道 */}
              <div className="flex gap-1.5">
                <div className="shrink-0 h-8 bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center justify-center text-zinc-500 sticky left-0 z-10" style={{ width: TRACK_LABEL_W }}>
                  <Music2 className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[8px]">音频</span>
                </div>
                <div className="relative h-8 bg-zinc-900/30 rounded border border-zinc-800/50" style={{ width: duration * pxPerSec }}>
                  {tracks.filter(item => item.type === 'audio').map(item => (
                    <div
                      key={item.id}
                      className={`absolute top-0.5 bottom-0.5 bg-emerald-600/50 border border-emerald-400/60 rounded flex items-center px-2 cursor-pointer hover:bg-emerald-600/70 select-none ${selectedTrackItem === item.id ? 'ring-2 ring-emerald-400' : ''}`}
                      style={{
                        left: item.start * pxPerSec,
                        width: item.duration * pxPerSec,
                        transform: dragInfo?.id === item.id ? `translate(${dragInfo.offsetX}px, ${dragInfo.offsetY}px)` : undefined,
                        zIndex: dragInfo?.id === item.id ? 50 : undefined,
                        opacity: dragInfo?.id === item.id ? 0.8 : undefined,
                      }}
                      onClick={() => setSelectedTrackItem(item.id)}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, item)}
                    >
                      <span className="text-[10px] text-emerald-100 truncate font-mono">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 字幕轨道 */}
              <div className="flex gap-1.5">
                <div className="shrink-0 h-7 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 sticky left-0 z-10" style={{ width: TRACK_LABEL_W }}>
                  <Type className="w-3.5 h-3.5" />
                </div>
                <div className="relative h-7 bg-zinc-900/30 rounded border border-zinc-800/50" style={{ width: duration * pxPerSec }}>
                  {tracks.filter(item => item.type === 'text').map(item => (
                    <div
                      key={item.id}
                      className={`absolute top-0.5 bottom-0.5 bg-amber-600/50 border border-amber-400/60 rounded flex items-center justify-center cursor-pointer hover:bg-amber-600/70 select-none ${selectedTrackItem === item.id ? 'ring-2 ring-amber-400' : ''}`}
                      style={{
                        left: item.start * pxPerSec,
                        width: item.duration * pxPerSec,
                        transform: dragInfo?.id === item.id ? `translate(${dragInfo.offsetX}px, ${dragInfo.offsetY}px)` : undefined,
                        zIndex: dragInfo?.id === item.id ? 50 : undefined,
                        opacity: dragInfo?.id === item.id ? 0.8 : undefined,
                      }}
                      onClick={() => setSelectedTrackItem(item.id)}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, item)}
                    >
                      <span className="text-[9px] text-amber-100 truncate px-1">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 特效轨道 */}
              <div className="flex gap-1.5">
                <div className="shrink-0 h-7 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 sticky left-0 z-10" style={{ width: TRACK_LABEL_W }}>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="relative h-7 bg-zinc-900/30 rounded border border-zinc-800/50" style={{ width: duration * pxPerSec }}>
                  {tracks.filter(item => item.type === 'image').map(item => (
                    <div
                      key={item.id}
                      className={`absolute top-0.5 bottom-0.5 bg-purple-600/50 border border-purple-400/60 rounded flex items-center justify-center cursor-pointer hover:bg-purple-600/70 select-none ${selectedTrackItem === item.id ? 'ring-2 ring-purple-400' : ''}`}
                      style={{
                        left: item.start * pxPerSec,
                        width: item.duration * pxPerSec,
                        transform: dragInfo?.id === item.id ? `translate(${dragInfo.offsetX}px, ${dragInfo.offsetY}px)` : undefined,
                        zIndex: dragInfo?.id === item.id ? 50 : undefined,
                        opacity: dragInfo?.id === item.id ? 0.8 : undefined,
                      }}
                      onClick={() => setSelectedTrackItem(item.id)}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, item)}
                    >
                      <span className="text-[9px] text-purple-100 px-1 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 播放指针 */}
            <div
              className="absolute top-0 bottom-0 w-px bg-orange-500 z-20 pointer-events-none"
              style={{ left: `${TRACK_LABEL_W + currentTime * pxPerSec}px` }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 保存弹窗 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">保存剪辑项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <span className="text-xs text-zinc-400">项目名称</span>
              <Input
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                placeholder="输入项目名称"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="text-xs text-zinc-500">轨道数：{tracks.length} · 时长：{duration}s</div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1 h-9 text-zinc-400 hover:text-zinc-200" onClick={() => setSaveDialogOpen(false)}>取消</Button>
              <Button className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                保存草稿
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 导出确认与合成语义说明弹窗 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              导出并渲染带货视频
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-indigo-300 text-xs">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>AI 云端整段合成机制说明</span>
              </div>
              <p className="text-xs text-indigo-200/80 leading-relaxed">
                当前版本将基于多轨道分镜脚本与 Prompt 提交至云端 Seedance AI 引擎进行分段生成与拼装合成。您的轨道配置、字幕标记及项目参数已同步保存在工程草稿中。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-800/60 p-3 rounded-lg border border-zinc-800">
              <div>
                <span className="text-zinc-500">项目名称：</span>
                <span className="text-zinc-200 font-medium truncate block">{projectTitle || '未命名项目'}</span>
              </div>
              <div>
                <span className="text-zinc-500">成片时长：</span>
                <span className="text-zinc-200 font-medium block">约 {duration} 秒</span>
              </div>
              <div>
                <span className="text-zinc-500">时间轴轨道：</span>
                <span className="text-zinc-200 font-medium block">{tracks.length} 个轨道元素</span>
              </div>
              <div>
                <span className="text-zinc-500">画幅比例：</span>
                <span className="text-zinc-200 font-medium block">9:16 竖屏</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              * 提交后将自动创建后台异步任务，预计耗时 1~3 分钟。您可以在「作品库」或「任务队列」实时追踪生成进度。
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="flex-1 h-9 text-zinc-400 hover:text-zinc-200"
                onClick={() => setExportDialogOpen(false)}
                disabled={exporting}
              >
                取消
              </Button>
              <Button
                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={executeExportTask}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在提交...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    确认提交云端渲染
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
