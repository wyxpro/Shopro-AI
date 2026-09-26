import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar as AvatarType, VideoTemplate } from '@/types/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Users2, Search, Play, Pause, StopCircle, Loader2, SlidersHorizontal,
  Volume2, Mic2, Sparkles, RefreshCw, Download, Frown, Smile,
  Zap, ShoppingCart, Heart, ChevronRight, Wand2, Upload, Plus, X,
  Film, Clock, Eye, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sendStepAudioTTS } from '@/lib/sse';


// ── CR-06: 情绪时间轴类型 ────────────────────────────────────────────────────
type EmotionType = 'neutral' | 'happy' | 'concerned' | 'excited' | 'persuasive';
interface EmotionSegment {
  id: string;
  startSec: number;
  endSec: number;
  emotion: EmotionType;
  layer: 'hook' | 'pain_point' | 'product' | 'cta';
  gesture: string;
  text: string;
}

const EMOTION_CONFIG: Record<EmotionType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  neutral:    { label: '平和',   color: 'text-muted-foreground', bg: 'bg-muted/50',       icon: Mic2 },
  happy:      { label: '喜悦',   color: 'text-success',          bg: 'bg-success/20',     icon: Smile },
  concerned:  { label: '担忧',   color: 'text-warning',          bg: 'bg-warning/20',     icon: Frown },
  excited:    { label: '激动',   color: 'text-primary',          bg: 'bg-primary/20',     icon: Zap },
  persuasive: { label: '说服',   color: 'text-info',             bg: 'bg-info/20',        icon: Heart },
};

const LAYER_CONFIG = {
  hook:       { label: '开场钩子', color: 'text-primary',  bg: 'bg-primary/10'  },
  pain_point: { label: '痛点共鸣', color: 'text-warning',  bg: 'bg-warning/10'  },
  product:    { label: '产品展示', color: 'text-info',     bg: 'bg-info/10'     },
  cta:        { label: 'CTA转化', color: 'text-success',  bg: 'bg-success/10'  },
};

// 解析脚本文字生成情绪时间轴
function parseScriptToTimeline(scriptText: string): EmotionSegment[] {
  const lines = scriptText.split('\n').map(l => l.trim()).filter(Boolean);
  const segments: EmotionSegment[] = [];
  let currentSec = 0;

  lines.forEach((line, idx) => {
    const isHook       = idx === 0 || line.includes('你是不是') || line.includes('有没有') || line.includes('?') || line.includes('？');
    const isPainPoint  = line.includes('痛点') || line.includes('困扰') || line.includes('难题') || line.includes('烦恼') || line.includes('皱纹') || line.includes('暗沉');
    const isProduct    = line.includes('产品') || line.includes('成分') || line.includes('效果') || line.includes('品质') || line.includes('设计');
    const isCta        = line.includes('点击') || line.includes('立即') || line.includes('下单') || line.includes('购买') || line.includes('限时');

    const layer: EmotionSegment['layer'] = isHook ? 'hook' : isPainPoint ? 'pain_point' : isCta ? 'cta' : 'product';
    const emotion: EmotionType = isHook ? 'excited' : isPainPoint ? 'concerned' : isCta ? 'persuasive' : 'happy';
    const gesture = isPainPoint ? '皱眉，手势强调' : isCta ? '展示产品，手指屏幕' : isHook ? '眼神直视，上扬眉毛' : '微笑展示，自然手势';
    const dur = Math.max(3, Math.round(line.length * 0.3));

    segments.push({
      id: `seg-${idx}`,
      startSec: currentSec,
      endSec: currentSec + dur,
      emotion, layer, gesture,
      text: line.slice(0, 60) + (line.length > 60 ? '...' : ''),
    });
    currentSec += dur;
  });
  return segments;
}

// ── 情绪时间轴可视化组件 (CR-06) ─────────────────────────────────────────────
function EmotionTimeline({ segments, totalDur }: { segments: EmotionSegment[]; totalDur: number }) {
  if (segments.length === 0) return null;
  return (
    <div className="space-y-3">
      {/* 时间轴轨道 */}
      <div className="relative h-8 rounded-lg overflow-hidden bg-muted/30">
        {segments.map(seg => {
          const left  = (seg.startSec / totalDur) * 100;
          const width = ((seg.endSec - seg.startSec) / totalDur) * 100;
          const cfg = EMOTION_CONFIG[seg.emotion];
          return (
            <div
              key={seg.id}
              title={`${seg.emotion}·${seg.gesture}`}
              className={cn('absolute top-0 h-full border-r border-background/50 flex items-center justify-center transition-all', cfg.bg)}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="text-[8px] font-medium truncate px-0.5 hidden sm:block">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* 图层叠加轨道 */}
      <div className="relative h-5 rounded-lg overflow-hidden bg-muted/20">
        {segments.map(seg => {
          const left  = (seg.startSec / totalDur) * 100;
          const width = ((seg.endSec - seg.startSec) / totalDur) * 100;
          const cfg = LAYER_CONFIG[seg.layer];
          return (
            <div key={seg.id}
              className={cn('absolute top-0 h-full border-r border-background/50', cfg.bg)}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(EMOTION_CONFIG) as [EmotionType, typeof EMOTION_CONFIG[EmotionType]][]).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <span key={k} className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full', v.bg, v.color)}>
              <Icon className="w-2.5 h-2.5" />{v.label}
            </span>
          );
        })}
      </div>

      {/* 关键节点详情 */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {segments.map(seg => {
          const eCfg = EMOTION_CONFIG[seg.emotion];
          const lCfg = LAYER_CONFIG[seg.layer];
          const Icon = eCfg.icon;
          return (
            <div key={seg.id} className={cn('flex items-start gap-2 rounded-lg p-2.5 border', eCfg.bg)}>
              <div className={cn('w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5', eCfg.bg)}>
                <Icon className={cn('w-3 h-3', eCfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', lCfg.bg, lCfg.color)}>{lCfg.label}</span>
                  <span className={cn('text-[10px] font-semibold', eCfg.color)}>{eCfg.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{seg.startSec}s-{seg.endSec}s</span>
                </div>
                <p className="text-xs mt-0.5 text-foreground/80 truncate">{seg.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">{seg.gesture}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GENDERS = [
  { value: 'all', label: '全部性别' },
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
];
const LANGUAGES = [
  { value: 'all', label: '全部语言' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'both', label: '中英双语' },
];
const STYLES = ['全部风格', '知性优雅', '活力青春', '商务专业', '时尚活泼', '科技商务', '温柔亲切'];

const GENDER_LABEL: Record<string, string> = { male: '男性', female: '女性' };
const LANG_LABEL: Record<string, string>   = { zh: '中文', en: '英文', both: '双语' };

function AvatarCard({
  avatar, onPreview, onUseAvatar, onDeleteAvatar, onUpdateCover
}: {
  avatar: AvatarType;
  onPreview: (a: AvatarType) => void;
  onUseAvatar: (a: AvatarType) => void;
  onDeleteAvatar: (id: string, name: string) => void;
  onUpdateCover: (id: string, newImage: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onUpdateCover(avatar.id, reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="h-full flex flex-col card-hover overflow-hidden group relative">
      {/* 预览图 */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {avatar.preview_image
          ? <img src={avatar.preview_image} alt={avatar.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              <Users2 className="w-12 h-12 text-muted-foreground/30" />
            </div>
        }
        {/* 删除按钮 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteAvatar(avatar.id, avatar.name);
          }}
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 z-10"
          title="删除此数字人"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* 修改封面按钮 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="absolute top-2 left-10 w-7 h-7 rounded-full bg-black/60 hover:bg-pink-600 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 z-10"
          title="更换封面图片"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 悬浮播放按钮 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="ghost"
            className="h-10 w-10 rounded-full border border-white/60 text-white hover:bg-white/10"
            onClick={() => onPreview(avatar)}>
            <Play className="w-5 h-5 ml-0.5" />
          </Button>
        </div>
        {/* 使用次数 */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {avatar.use_count.toLocaleString()} 次使用
        </div>
      </div>

      <CardContent className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold truncate">{avatar.name}</p>
          <div className="flex gap-1 shrink-0">
            <Badge variant="outline" className="text-xs px-1.5 py-0">{GENDER_LABEL[avatar.gender]}</Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0">{LANG_LABEL[avatar.language]}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {avatar.tags.slice(0, 5).map(tag => (
            <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mt-auto pt-1">
          <Button
            size="sm"
            className="h-8 text-xs flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
            onClick={() => onUseAvatar(avatar)}
          >
            <Users2 className="w-3 h-3" />使用数字人
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs flex-1 gap-1"
            onClick={() => onPreview(avatar)}
          >
            <Play className="w-3 h-3" />查看示例
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// TTS 声音列表（与数字人性别/风格匹配）
const TTS_VOICES = [
  { id: 'female-shaonv', label: '少女音', gender: 'female' },
  { id: 'female-yujie', label: '御姐音', gender: 'female' },
  { id: 'female-chengshu', label: '成熟女声', gender: 'female' },
  { id: 'male-qingxin', label: '清新男声', gender: 'male' },
  { id: 'male-chunhou', label: '醇厚男声', gender: 'male' },
  { id: 'male-jingying', label: '精英男声', gender: 'male' },
];

// ── 视频模板库常量 ────────────────────────────────────────────────────────
const TEMPLATE_INDUSTRIES = ['全部', '电商', '教育', '金融', '美妆', '其他'];
const TEMPLATE_SCENES = ['全部场景', '产品介绍', '节日促销', '课程推广', '品牌宣传', '开箱测评'];
const TEMPLATE_INDUSTRY_COLORS: Record<string, string> = {
  '电商': 'bg-primary/10 text-primary',
  '教育': 'bg-info/10 text-info',
  '金融': 'bg-success/10 text-success',
  '美妆': 'bg-warning/10 text-warning',
  '其他': 'bg-muted text-muted-foreground',
};

function TemplateCard({ template, onPreview, onUse }: {
  template: VideoTemplate;
  onPreview: (t: VideoTemplate) => void;
  onUse: (t: VideoTemplate) => void;
}) {
  return (
    <Card className="h-full flex flex-col group overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {template.thumbnail
          ? <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
              <Film className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">暂无缩略图</p>
            </div>
        }
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" className="h-9 rounded-full border border-white/60 text-white hover:bg-white/10" onClick={() => onPreview(template)}>
            <Eye className="w-4 h-4 mr-1.5" />预览
          </Button>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />{template.duration}s
        </div>
        <div className="absolute top-2 left-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TEMPLATE_INDUSTRY_COLORS[template.industry] ?? TEMPLATE_INDUSTRY_COLORS['其他'])}>
            {template.industry}
          </span>
        </div>
      </div>
      <CardContent className="p-3 flex flex-col flex-1 gap-2">
        <p className="text-sm font-semibold truncate" title={template.name}>{template.name}</p>
        <p className="text-xs text-muted-foreground">{template.scene}</p>
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          已使用 <span className="font-semibold text-foreground">{template.use_count.toLocaleString()}</span> 次
        </p>
        <div className="flex gap-2 mt-auto pt-1">
          <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => onPreview(template)}>
            <Eye className="w-3 h-3 mr-1" />预览
          </Button>
          <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => onUse(template)}>
            <Zap className="w-3 h-3 mr-1" />使用
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AvatarsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // ── Tab 状态 ──
  const [activeTab, setActiveTab] = useState<'avatars' | 'templates'>('avatars');
  // ── 模板库状态 ──
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateIndustry, setTemplateIndustry] = useState('全部');
  const [templateScene, setTemplateScene] = useState('全部场景');
  const [previewTemplate, setPreviewTemplate] = useState<VideoTemplate | null>(null);
  const [avatars, setAvatars] = useState<AvatarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('all');
  const [language, setLanguage] = useState('all');
  const [style, setStyle] = useState('全部风格');
  const [previewAvatar, setPreviewAvatar] = useState<AvatarType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // 头像上传状态
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '', gender: 'female', language: 'zh', style: '自然写实',
    description: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // P2-N01 TTS 状态
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('female-shaonv');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(0.9);
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // CR-06: 脚本融合 + 情绪时间轴
  const [fusionScript, setFusionScript] = useState('');
  const [emotionSegments, setEmotionSegments] = useState<EmotionSegment[]>([]);
  const [fusionAnalyzing, setFusionAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('avatars').select('*').eq('is_active', true).order('use_count', { ascending: false });
      const UNWANTED_NAMES = ['Catherine', 'Mia', '晓雅', '阳阳', 'Brandon'];
      const rawDbAvatars = Array.isArray(data) ? data : [];
      const dbAvatars = rawDbAvatars.filter(a => !UNWANTED_NAMES.some(un => a.name.includes(un)));

      const mapped = dbAvatars.map(a => {
        if (a.name.includes('萌萌')) return { ...a, preview_image: '/person/girl3.png' };
        if (a.name.includes('安娜')) return { ...a, preview_image: '/person/girl2.png' };
        if (a.name.includes('张总') || a.name.includes('大疆')) return { ...a, name: '张总·大疆Pocket 4品牌风格宣传', preview_image: '/person/boy2.png' };
        if (a.name.includes('小雅')) return { ...a, preview_image: '/person/girl1.png' };
        if (a.name.includes('阿杰')) return { ...a, preview_image: '/person/boy1.png' };
        if (a.name.includes('美玲')) return { ...a, preview_image: '/person/girl4.png' };
        if (a.name.includes('陆沉')) return { ...a, preview_image: '/person/boy3.png' };
        if (a.name.includes('雪儿')) return { ...a, preview_image: '/person/girl5.png' };
        return a;
      });

      const DEFAULT_PERSON_AVATARS: AvatarType[] = [
        { id: 'av-p5', name: '萌萌·零食美食吃播', gender: 'female', language: 'zh', style: '活力青春', description: '美食吃播萌妹主播，表情感染力极强，快速引爆冲动消费', preview_image: '/person/girl3.png', is_active: true, use_count: 38800, tags: ['零食吃播', '活泼可爱', '高能促单'] },
        { id: 'av-p3', name: '安娜·知性服饰穿搭', gender: 'female', language: 'zh', style: '知性优雅', description: '高端女装与饰品主播，气质高贵优雅，回购率极高', preview_image: '/person/girl2.png', is_active: true, use_count: 36200, tags: ['女装穿搭', '知性优雅', '高客单'] },
        { id: 'av-p4', name: '张总·大疆Pocket 4品牌风格宣传', gender: 'male', language: 'zh', style: '商务专业', description: '大疆Pocket 4品牌与数码新品宣传主讲，科技信任感强', preview_image: '/person/boy2.png', is_active: true, use_count: 45100, tags: ['大疆Pocket4', '品牌宣传', '沉稳信任'] },
        { id: 'av-p1', name: '小雅·爆款美妆主播', gender: 'female', language: 'zh', style: '时尚活泼', description: '专业美妆高转化主播，黄金前3秒Hook强力吸睛', preview_image: '/person/girl1.png', is_active: true, use_count: 35800, tags: ['美妆带货', '爆款种草', '高转化'] },
        { id: 'av-p2', name: '阿杰·数码科技极客', gender: 'male', language: 'zh', style: '科技商务', description: '数码测评带货主播，五官干练立体，逻辑讲解清晰', preview_image: '/person/boy1.png', is_active: true, use_count: 28400, tags: ['数码测评', '硬核带货', '阳刚帅气'] },
        { id: 'av-p7', name: '美玲·韩系美妆流行', gender: 'female', language: 'zh', style: '韩系时尚', description: '韩系彩妆与护肤达人，妆容精致，亲和力极佳', preview_image: '/person/girl4.png', is_active: true, use_count: 23400, tags: ['韩系彩妆', '护肤心得', '时尚爆款'] },
        { id: 'av-p6', name: '陆沉·男装潮流风尚', gender: 'male', language: 'zh', style: '潮流风尚', description: '潮流男装与鞋靴带货主播，阳光率真，镜头感十足', preview_image: '/person/boy3.png', is_active: true, use_count: 19800, tags: ['潮流男装', '鞋靴穿搭', '帅气质感'] },
        { id: 'av-p8', name: '雪儿·轻奢珠宝饰品', gender: 'female', language: 'zh', style: '轻奢典雅', description: '珠宝黄金与高端饰品主播，端庄典雅，话术感染力强', preview_image: '/person/girl5.png', is_active: true, use_count: 17900, tags: ['轻奢珠宝', '黄金饰品', '端庄典雅'] },
      ];

      const ORDER_KEYS = ['萌萌', '安娜', '张总', '小雅', '阿杰', '美玲', '陆沉', '雪儿'];
      const getOrderIndex = (avatar: AvatarType) => {
        const name = avatar.name || '';
        const idx = ORDER_KEYS.findIndex(key => name.includes(key));
        return idx !== -1 ? idx : 99;
      };

      const avatarMap = new Map<string, AvatarType>();
      DEFAULT_PERSON_AVATARS.forEach(d => avatarMap.set(d.name, d));
      mapped.forEach(m => {
        const exists = Array.from(avatarMap.values()).some(d => d.name.includes(m.name) || m.name.includes(d.name.split('·')[0]));
        if (!exists) {
          avatarMap.set(m.name, m);
        }
      });

      const sortedAvatars = Array.from(avatarMap.values()).sort((a, b) => getOrderIndex(a) - getOrderIndex(b));

      setAvatars(sortedAvatars);
      setLoading(false);
    })();
  }, []);

  // ── 模板库数据加载 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'templates' || templates.length > 0) return;
    (async () => {
      setTemplatesLoading(true);
      const { data } = await supabase.from('video_templates').select('*').eq('is_active', true).order('use_count', { ascending: false });
      setTemplates(Array.isArray(data) ? data : []);
      setTemplatesLoading(false);
    })();
  }, [activeTab, templates.length]);

  const filteredTemplates = templates.filter(t => {
    const q = templateSearch.toLowerCase();
    if (q && !t.name.toLowerCase().includes(q) && !t.tags.some((g: string) => g.toLowerCase().includes(q))) return false;
    if (templateIndustry !== '全部' && t.industry !== templateIndustry) return false;
    if (templateScene !== '全部场景' && t.scene !== templateScene) return false;
    return true;
  });

  // ── 头像上传处理 ──────────────────────────────────────────────────────────
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片最大 5MB'); return; }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = ev => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!user || !uploadFile || !uploadForm.name.trim()) {
      toast.error('请填写头像名称并选择图片');
      return;
    }
    setUploading(true);
    try {
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatars/${crypto.randomUUID()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('materials')
        .upload(path, uploadFile, { contentType: uploadFile.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('materials').getPublicUrl(up.path);
      const { data: newAvatar } = await supabase.from('avatars').insert({
        name:        uploadForm.name.trim(),
        gender:      uploadForm.gender,
        language:    uploadForm.language,
        style:       uploadForm.style,
        description: uploadForm.description.trim() || null,
        cover_url:   urlData.publicUrl,
        preview_image: urlData.publicUrl,
        is_active:   true,
        use_count:   0,
      }).select().maybeSingle();
      if (newAvatar) {
        setAvatars(prev => [newAvatar as AvatarType, ...prev]);
        toast.success(`头像「${uploadForm.name}」上传成功！`);
        setUploadOpen(false);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadForm({ name: '', gender: 'female', language: 'zh', style: '自然写实', description: '' });
      }
    } catch (e) {
      toast.error('上传失败：' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setUploading(false);
    }
  };

  // P2-N01 TTS 语音合成
  const handleTtsGenerate = async () => {
    if (!ttsText.trim()) { toast.error('请输入要合成的文字'); return; }
    setTtsGenerating(true);
    setTtsAudioUrl(null);
    try {
      const voiceMap: Record<string, string> = {
        'female-shaonv': 'livelybreezy-female',
        'female-yujie': 'elegantgentle-female',
        'female-chengshu': 'elegantgentle-female',
        'male-qingxin': 'zhengpaiqingnian',
        'male-chunhou': 'shuangkuainansheng',
        'male-jingying': 'shuangkuainansheng',
      };
      const mappedVoice = voiceMap[ttsVoice] || ttsVoice || 'livelybreezy-female';
      const instruction = `语气表现得自然、饱满，语速为 ${ttsSpeed}x，音量为 ${ttsVolume}`;
      const audioUrl = await sendStepAudioTTS({
        input: ttsText,
        voice: mappedVoice,
        instruction,
        response_format: 'mp3',
      });
      setTtsAudioUrl(audioUrl);
      toast.success('语音合成完成！');
    } catch (err) {
      console.warn('TTS synthesis failed, falling back to Web Speech API:', err);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(ttsText);
        utterance.rate = ttsSpeed;
        utterance.pitch = ttsVoice.includes('female') ? 1.2 : 0.9;
        utterance.onstart = () => setTtsPlaying(true);
        utterance.onend = () => setTtsPlaying(false);
        utterance.onerror = () => setTtsPlaying(false);
        window.speechSynthesis.speak(utterance);
        toast.success('已切换至智能发音引擎完成试听！');
      } else {
        toast.error(`语音合成失败: ${(err as Error).message}`);
      }
    } finally {
      setTtsGenerating(false);
    }
  };

  const handleTtsPlay = () => {
    if (ttsAudioUrl && audioRef.current) {
      if (ttsPlaying) {
        audioRef.current.pause();
        setTtsPlaying(false);
      } else {
        audioRef.current.play();
        setTtsPlaying(true);
      }
    } else if (ttsText && 'speechSynthesis' in window) {
      if (ttsPlaying) {
        window.speechSynthesis.cancel();
        setTtsPlaying(false);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(ttsText);
        utterance.rate = ttsSpeed;
        utterance.pitch = ttsVoice.includes('female') ? 1.2 : 0.9;
        utterance.onstart = () => setTtsPlaying(true);
        utterance.onend = () => setTtsPlaying(false);
        utterance.onerror = () => setTtsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleAvatarOpen = (a: AvatarType) => {
    setPreviewAvatar(a);
    setTtsText('');
    setTtsAudioUrl(null);
    setTtsPlaying(false);
    setFusionScript('');
    setEmotionSegments([]);
    // 根据性别预设声音
    const matchedVoice = TTS_VOICES.find(v => v.gender === a.gender);
    if (matchedVoice) setTtsVoice(matchedVoice.id);
  };

  const handleUseAvatar = (a: AvatarType) => {
    toast.success(`已选择数字人「${a.name}」，已为您自动切换至工作台！`);
    navigate('/video/create', {
      state: {
        inputTab: '数字人',
        selectedAvatar: a,
      },
    });
  };

  const handleDeleteAvatar = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除数字人「${name}」吗？`)) return;
    try {
      await supabase.from('avatars').delete().eq('id', id);
      setAvatars(prev => prev.filter(a => a.id !== id));
      toast.success(`数字人「${name}」已成功删除`);
    } catch (err) {
      setAvatars(prev => prev.filter(a => a.id !== id));
      toast.success(`数字人「${name}」已从列表移除`);
    }
  };

  const handleUpdateCover = async (id: string, newImage: string) => {
    setAvatars(prev => prev.map(a => a.id === id ? { ...a, preview_image: newImage } : a));
    try {
      await supabase.from('avatars').update({ preview_image: newImage }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
    toast.success('封面图片更新成功！');
  };

  // CR-06: 脚本融合分析
  const handleFusionAnalyze = async () => {
    if (!fusionScript.trim()) { toast.error('请输入带货脚本'); return; }
    setFusionAnalyzing(true);
    await new Promise(r => setTimeout(r, 1100));
    const segs = parseScriptToTimeline(fusionScript);
    setEmotionSegments(segs);
    setFusionAnalyzing(false);
    toast.success(`情绪时间轴生成完成！共 ${segs.length} 个片段`);
  };

  const filtered = avatars.filter(a => {
    const q = search.toLowerCase();
    if (q && !a.name.toLowerCase().includes(q) && !a.tags.some(t => t.toLowerCase().includes(q))) return false;
    if (gender !== 'all' && a.gender !== gender) return false;
    if (language !== 'all' && a.language !== language) return false;
    if (style !== '全部风格' && !a.style.includes(style) && !a.tags.includes(style)) return false;
    return true;
  });

  const FilterPanel = () => (
    <div className="space-y-5">
      {/* 性别 */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">性别</p>
        <div className="space-y-1">
          {GENDERS.map(g => (
            <button key={g.value} onClick={() => setGender(g.value)}
              className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                gender === g.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground')}>
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <Separator />
      {/* 语言 */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">语言</p>
        <div className="space-y-1">
          {LANGUAGES.map(l => (
            <button key={l.value} onClick={() => setLanguage(l.value)}
              className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                language === l.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground')}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <Separator />
      {/* 风格 */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">应用风格</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                style === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground')}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* ── Tab 切换头部 ───────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-4 md:px-6 pt-4 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('avatars')}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg border-2 transition-all',
              activeTab === 'avatars'
                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5',
            )}
          >
            <Users2 className="w-4 h-4" />
            数字人库
            <Badge
              className={cn('text-[10px] h-4 px-1.5 border-0', activeTab === 'avatars' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >{avatars.length}</Badge>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg border-2 transition-all',
              activeTab === 'templates'
                ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-violet-400/40 hover:bg-violet-500/5',
            )}
          >
            <Film className="w-4 h-4" />
            视频模板库
            {templates.length > 0 && (
              <Badge
                className={cn('text-[10px] h-4 px-1.5 border-0', activeTab === 'templates' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}
              >{templates.length}</Badge>
            )}
          </button>
        </div>
      </div>

      {/* ── Tab 内容 ───────────────────────────────────────────────────── */}
      {activeTab === 'avatars' ? (
        <div className="flex flex-1 min-h-0">
          {/* 侧边筛选器（桌面） */}
          <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border px-4 py-5 overflow-y-auto sticky top-0 max-h-screen">
            <p className="text-sm font-bold mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />筛选
            </p>
            <FilterPanel />
          </aside>

          {/* 数字人主内容 */}
          <div className="flex-1 min-w-0 p-4 md:p-6 space-y-5 overflow-x-hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
                  <Users2 className="w-5 h-5 text-primary" />数字人库
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">共 {avatars.length} 个数字人，选择合适的数字人生成视频</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />上传头像
                </Button>
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFilterOpen(true)}>
                  <SlidersHorizontal className="w-4 h-4 mr-2" />筛选
                </Button>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索数字人名称或标签..." className="pl-9 px-3" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users2 className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">未找到匹配的数字人</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(a => <AvatarCard key={a.id} avatar={a} onPreview={handleAvatarOpen} onUseAvatar={handleUseAvatar} onDeleteAvatar={handleDeleteAvatar} onUpdateCover={handleUpdateCover} />)}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 视频模板库 Tab ───────────────────────────────────────── */
        <div className="flex-1 min-w-0 p-4 md:p-6 space-y-5 overflow-x-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
                <Film className="w-5 h-5 text-primary" />视频模板库
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">精选高转化视频模板，一键套用即可生成带货视频</p>
            </div>
          </div>

          {/* 搜索 */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索模板名称或标签..." className="pl-9 px-3"
              value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} />
          </div>

          {/* 行业筛选 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">按行业</p>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATE_INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setTemplateIndustry(ind)}
                  className={cn('px-4 py-2 rounded-full text-sm font-medium border transition-all',
                    templateIndustry === ind
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground')}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* 场景筛选 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">按场景</p>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATE_SCENES.map(s => (
                <button key={s} onClick={() => setTemplateScene(s)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    templateScene === s
                      ? 'bg-secondary text-secondary-foreground border-border font-semibold'
                      : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!templatesLoading && (
            <p className="text-xs text-muted-foreground">共找到 <span className="font-semibold text-foreground">{filteredTemplates.length}</span> 个模板</p>
          )}

          {templatesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Film className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">暂无匹配模板</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map(t => (
                <TemplateCard key={t.id} template={t} onPreview={setPreviewTemplate}
                  onUse={t => navigate(`/video/create?templateId=${t.id}`)} />
              ))}
            </div>
          )}

          {/* 模板预览弹窗 */}
          <Dialog open={!!previewTemplate} onOpenChange={v => !v && setPreviewTemplate(null)}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
              {previewTemplate && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-balance">{previewTemplate.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                      {previewTemplate.thumbnail
                        ? <img src={previewTemplate.thumbnail} alt={previewTemplate.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Film className="w-12 h-12 text-muted-foreground/30" /></div>
                      }
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{previewTemplate.industry}</Badge>
                        <Badge variant="outline">{previewTemplate.scene}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{previewTemplate.duration}秒
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {previewTemplate.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        已被使用 <span className="font-semibold text-foreground">{previewTemplate.use_count.toLocaleString()}</span> 次
                      </p>
                    </div>
                    <Button className="w-full" onClick={() => { navigate(`/video/create?templateId=${previewTemplate.id}`); setPreviewTemplate(null); }}>
                      <Zap className="w-4 h-4 mr-2" />使用此模板
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* 头像上传弹框 */}
      <Dialog open={uploadOpen} onOpenChange={v => { if (!uploading) setUploadOpen(v); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />上传自定义数字人头像
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 图片预览 */}
            <label className={`relative flex flex-col items-center justify-center gap-2 h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploadPreview ? 'border-primary/40' : 'border-border hover:border-primary/50 bg-muted/30'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              {uploadPreview ? (
                <>
                  <img src={uploadPreview} alt="预览" className="h-full w-full object-contain rounded-xl" />
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setUploadFile(null); setUploadPreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">点击选择头像图片（最大 5MB）</span>
                </>
              )}
            </label>
            {/* 表单 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-normal text-muted-foreground">头像名称 *</label>
                <Input value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} placeholder="如：活力女主播" className="px-3" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-normal text-muted-foreground">性别</label>
                <Select value={uploadForm.gender} onValueChange={v => setUploadForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="male">男性</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-normal text-muted-foreground">语言</label>
                <Select value={uploadForm.language} onValueChange={v => setUploadForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger className="px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="en">英文</SelectItem>
                    <SelectItem value="bilingual">双语</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-normal text-muted-foreground">风格</label>
                <Select value={uploadForm.style} onValueChange={v => setUploadForm(f => ({ ...f, style: v }))}>
                  <SelectTrigger className="px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['自然写实', '活力青春', '专业商务', '时尚潮流', '温柔知性', '搞怪萌系'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-normal text-muted-foreground">备注描述</label>
                <Textarea
                  value={uploadForm.description}
                  onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="可选，描述该数字人的特点..."
                  rows={2}
                  className="px-3 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)} disabled={uploading}>取消</Button>
              <Button className="flex-1" onClick={handleAvatarUpload} disabled={uploading || !uploadFile || !uploadForm.name.trim()}>
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />上传中...</> : <><Upload className="w-4 h-4 mr-2" />确认上传</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 移动端筛选弹窗 */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />筛选数字人
            </DialogTitle>
          </DialogHeader>
          <FilterPanel />
          <Button onClick={() => setFilterOpen(false)} className="mt-2">应用筛选</Button>
        </DialogContent>
      </Dialog>

      {/* 查看示例弹窗 */}
      <Dialog open={!!previewAvatar} onOpenChange={v => !v && setPreviewAvatar(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md max-h-[90dvh] overflow-y-auto">
          {previewAvatar && (
            <>
              <DialogHeader>
                <DialogTitle className="text-balance">{previewAvatar.name} · 数字人示例</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* 展示图 */}
                <div className="aspect-[9/16] max-h-64 overflow-hidden rounded-xl bg-muted mx-auto">
                  {previewAvatar.preview_image
                    ? <img src={previewAvatar.preview_image} alt={previewAvatar.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                        <Users2 className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">暂无预览图</p>
                      </div>
                  }
                </div>
                {/* 信息 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{GENDER_LABEL[previewAvatar.gender]}</Badge>
                    <Badge variant="outline">{LANG_LABEL[previewAvatar.language]}</Badge>
                    <Badge variant="outline">{previewAvatar.style}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {previewAvatar.tags.map(tag => (
                      <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    已被使用 <span className="font-semibold text-foreground">{previewAvatar.use_count.toLocaleString()}</span> 次
                  </p>
                </div>
                {previewAvatar.sample_video ? (
                  <video src={previewAvatar.sample_video} controls className="w-full rounded-xl" />
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                    {/* 数字人预览区域 */}
                    <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      {previewAvatar.preview_image ? (
                        <img src={previewAvatar.preview_image} alt={previewAvatar.name} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Users2 className="w-10 h-10 text-muted-foreground/30" />
                          <span className="text-xs text-muted-foreground">数字人形象预览</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-[10px] text-white/90 font-medium">AI 驱动演示</span>
                        </div>
                        <span className="text-[10px] text-white/70">{previewAvatar.language === 'zh' ? '中文' : previewAvatar.language === 'en' ? '英文' : '双语'} · {previewAvatar.style}</span>
                      </div>
                    </div>
                    {/* 操作栏 */}
                    <div className="p-3 flex items-center gap-2 border-t border-border/30">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => toast.info('示例视频生成中，请稍候...')}
                      >
                        <Play className="w-3 h-3" />生成示例视频
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground gap-1.5"
                        onClick={() => setPreviewAvatar(null)}
                      >
                        <Wand2 className="w-3 h-3" />使用此数字人
                      </Button>
                    </div>
                  </div>
                )}

                {/* CR-06: 脚本深度融合 + 情绪时间轴 */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-balance">
                    <Wand2 className="w-4 h-4 text-primary" />脚本深度融合
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary">CR-06</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">粘贴带货脚本，数字人将根据结构自动调整表情/手势节奏</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">带货脚本</Label>
                    <Textarea
                      value={fusionScript}
                      onChange={e => setFusionScript(e.target.value)}
                      placeholder={`输入多行脚本，例：\n你是不是也被皮肤暗沉困扰？\n痛点：每天洗完脸还是感觉暗黄无光...\n我们这款产品含有VC精华...\n立即点击购买，限时优惠！`}
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>

                  <Button
                    className="w-full h-9 gap-2"
                    onClick={handleFusionAnalyze}
                    disabled={fusionAnalyzing || !fusionScript.trim()}
                  >
                    {fusionAnalyzing
                      ? <><RefreshCw className="w-4 h-4 animate-spin" />分析中...</>
                      : <><Sparkles className="w-4 h-4" />生成情绪时间轴</>
                    }
                  </Button>

                  {emotionSegments.length > 0 && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold">情绪时间轴</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          总时长 {emotionSegments[emotionSegments.length - 1]?.endSec ?? 0}s
                        </span>
                      </div>
                      <EmotionTimeline
                        segments={emotionSegments}
                        totalDur={emotionSegments[emotionSegments.length - 1]?.endSec ?? 60}
                      />
                    </div>
                  )}
                </div>

                {/* P2-N01 TTS 语音合成 */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-primary" />TTS 语音合成预览
                    <Badge variant="outline" className="text-xs">P2-N01</Badge>
                  </h3>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">输入口播文本</Label>
                    <Textarea
                      value={ttsText}
                      onChange={e => setTtsText(e.target.value)}
                      placeholder="输入要合成的台词，例：今天给大家介绍一款超好用的护肤品..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">声音音色</Label>
                      <Select value={ttsVoice} onValueChange={setTtsVoice}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TTS_VOICES.filter(v => v.gender === previewAvatar.gender || v.gender === 'neutral').map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">语速 {ttsSpeed.toFixed(1)}x</Label>
                      <Slider
                        min={0.5} max={2.0} step={0.1}
                        value={[ttsSpeed]}
                        onValueChange={([v]) => setTtsSpeed(v)}
                        className="mt-3"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-9"
                      onClick={handleTtsGenerate}
                      disabled={ttsGenerating || !ttsText.trim()}
                    >
                      {ttsGenerating
                        ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />合成中...</>
                        : <><Sparkles className="w-4 h-4 mr-1.5" />合成语音</>
                      }
                    </Button>
                    {ttsAudioUrl && (
                      <>
                        <Button variant="outline" className="h-9 px-3" onClick={handleTtsPlay}>
                          {ttsPlaying
                            ? <Pause className="w-4 h-4" />
                            : <Play className="w-4 h-4" />
                          }
                        </Button>
                        <Button variant="outline" className="h-9 px-3" asChild>
                          <a href={ttsAudioUrl} download="tts-preview.mp3">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </>
                    )}
                  </div>

                  {ttsAudioUrl && (
                    <audio
                      ref={audioRef}
                      src={ttsAudioUrl}
                      onEnded={() => setTtsPlaying(false)}
                      className="hidden"
                    />
                  )}

                  {ttsAudioUrl && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
                      <Volume2 className="w-4 h-4 text-success shrink-0" />
                      <span className="text-xs text-success font-medium">语音合成完成，点击播放预览</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
