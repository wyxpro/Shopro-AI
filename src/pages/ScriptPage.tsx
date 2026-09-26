import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDraft } from '@/hooks/useDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wand2, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Copy, CheckCircle2, BookOpen, Sparkles, Clock, Video,
  MessageSquare, Send, StopCircle, Loader2, Mic,
  Target, Heart, Zap, ShoppingCart, ChevronRight,
  AlertTriangle, Package, Info, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sendDeepSeekStreamRequest } from '@/lib/sse';
import type { ScriptScene, Script } from '@/types/types';

// ── 四层Prompt工程配置 ────────────────────────────────────────────────────────
const FOUR_LAYER_STEPS = [
  {
    key: 'selling_point',
    label: '卖点提炼',
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    desc: '从商品信息提取差异化核心卖点',
  },
  {
    key: 'pain_point',
    label: '痛点共鸣',
    icon: Heart,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    desc: '匹配目标用户的真实痛点与情感诉求',
  },
  {
    key: 'hook',
    label: '平台钩子',
    icon: Zap,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/30',
    desc: '设计抓人眼球的开场钩子与悬念结构',
  },
  {
    key: 'cta',
    label: 'CTA转化',
    icon: ShoppingCart,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    desc: '构建高转化行动召唤与限时紧迫感',
  },
];

const CATEGORIES = ['美妆护肤', '服装配饰', '家居用品', '数码电器', '食品饮料', '母婴用品', '运动户外', '其他'];
const PRICE_RANGES = ['¥0-50 平价', '¥50-200 中端', '¥200-500 中高端', '¥500-2000 高端', '¥2000+ 奢华'];
const CLASSIC_PAIN_POINTS: Record<string, string[]> = {
  '美妆护肤': ['肤色暗沉不均', '毛孔粗大油光', '干燥脱妆持久不住', '过敏刺激敏感'],
  '服装配饰': ['穿搭没搭配感', '版型不好显胖', '洗后变形掉色', '材质粗糙不舒适'],
  '家居用品': ['收纳凌乱空间小', '清洁费时费力', '产品易损坏不耐用', '安装复杂'],
  '数码电器': ['续航短频繁充电', '操作繁琐学习成本高', '信号不稳延迟高', '兼容性差'],
  '食品饮料': ['添加剂多不健康', '口感差难以坚持', '包装不环保', '价格偏高性价比低'],
  '母婴用品': ['材质安全担忧', '宝宝不愿配合使用', '收纳占地方', '性价比不高'],
  '运动户外': ['运动后恢复慢', '装备笨重不便携', '耐用性差易损', '不防水不防汗'],
  '其他': ['质量参差不齐', '售后服务差', '使用不方便', '价格虚高'],
};

// ── SSE 流式调用文心 ────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callLLMStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  await sendDeepSeekStreamRequest({
    messages,
    max_tokens: 2000,
    onData: (data) => {
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const chunk = parsed.choices?.[0]?.delta?.content ?? '';
        if (chunk) onChunk(chunk);
      } catch { /* skip */ }
    },
    onComplete: () => {},
    onError: (err) => { if (!signal.aborted) toast.error(`AI 生成失败：${err.message}`); },
    signal,
  });
}

// ── 对话消息类型 ─────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

// ── 四层流水线状态 ────────────────────────────────────────────────────────────
type LayerKey = 'selling_point' | 'pain_point' | 'hook' | 'cta';
type LayerStatus = 'idle' | 'processing' | 'done';
type LayerStatuses = Record<LayerKey, LayerStatus>;
// ── 四层流水线可视化组件 ──────────────────────────────────────────────────────
function FourLayerPipeline({ statuses, activeLayer }: {
  statuses: LayerStatuses;
  activeLayer: LayerKey | null;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />四层 Prompt 工程流水线
      </p>
      <div className="flex items-center gap-0">
        {FOUR_LAYER_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const status = statuses[step.key as LayerKey];
          const isActive = activeLayer === step.key;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className={cn(
                'flex-1 min-w-0 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-500',
                status === 'done' && step.bgColor,
                isActive && 'bg-primary/10 ring-1 ring-primary/40',
              )}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                  status === 'done' ? step.bgColor : 'bg-muted',
                  isActive && 'ring-2 ring-primary animate-pulse',
                )}>
                  {status === 'processing'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    : status === 'done'
                      ? <CheckCircle2 className={cn('w-3.5 h-3.5', step.color)} />
                      : <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </div>
                <span className={cn(
                  'text-[10px] font-medium text-center leading-tight',
                  status === 'done' ? step.color : 'text-muted-foreground',
                  isActive && 'text-primary',
                )}>
                  {step.label}
                </span>
              </div>
              {idx < FOUR_LAYER_STEPS.length - 1 && (
                <ChevronRight className={cn(
                  'w-3 h-3 shrink-0 transition-colors',
                  status === 'done' ? 'text-primary/60' : 'text-muted-foreground/30',
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 场景编辑器 ────────────────────────────────────────────────────────────
function SceneCard({
  scene, index, onUpdate, onDelete,
}: {
  scene: ScriptScene;
  index: number;
  onUpdate: (idx: number, patch: Partial<ScriptScene>) => void;
  onDelete: (idx: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      {/* 卡片头 */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}>
        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {scene.order}
        </div>
        <div className="flex-1 min-w-0">
          <Input
            value={scene.scene}
            onClick={e => e.stopPropagation()}
            onChange={e => onUpdate(index, { scene: e.target.value })}
            className="h-7 text-sm font-semibold bg-transparent border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="场景名称"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />{scene.duration}s
          </span>
          <button onClick={e => { e.stopPropagation(); onDelete(index); }}
            className="w-6 h-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">画面描述</Label>
              <Textarea rows={2} value={scene.visual}
                onChange={e => onUpdate(index, { visual: e.target.value })}
                className="text-sm resize-none" placeholder="画面描述..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mic className="w-3 h-3" />台词文案
              </Label>
              <Textarea rows={2} value={scene.dialogue}
                onChange={e => onUpdate(index, { dialogue: e.target.value })}
                className="text-sm resize-none" placeholder="台词文案..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />AIGC Prompt
              </Label>
              <Textarea rows={2} value={scene.prompt}
                onChange={e => onUpdate(index, { prompt: e.target.value })}
                className="text-sm resize-none font-mono" placeholder="AIGC Prompt..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />建议时长（秒）
              </Label>
              <Input type="number" min={1} max={30} value={scene.duration}
                onChange={e => onUpdate(index, { duration: Number(e.target.value) })}
                className="text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function ScriptPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // P1-N05 草稿自动保存
  type ScriptDraft = {
    productName: string; category: string; priceRange: string;
    sellingPoints: string[]; audience: string; platform: string; videoLength: number;
  };
  const { value: draft, save: saveDraft, clear: clearDraft, hasDraft } =
    useDraft<ScriptDraft>(`script-draft-${user?.id ?? 'anon'}`, {
      productName: '', category: '', priceRange: '',
      sellingPoints: [], audience: '', platform: 'douyin', videoLength: 25,
    });

  const [productName, setProductName]     = useState(draft.productName || '草本氨基酸水润洗面奶');
  const [category, setCategory]           = useState(draft.category || '美妆护肤');
  const [priceRange, setPriceRange]       = useState(draft.priceRange || '¥50-200 中端');
  const [sellingInput, setSellingInput]   = useState('');
  const [sellingPoints, setSellingPoints] = useState<string[]>(draft.sellingPoints?.length ? draft.sellingPoints : ['温和无刺激敏感肌可用', '微米级细腻泡沫深层清洁', '复配玻尿酸洗完不紧绷']);
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>(['肤色暗沉不均', '毛孔粗大油光']);
  const [audience, setAudience]           = useState(draft.audience || '18-30岁熬夜冒痘、出油敏感的年轻人');
  const [platform, setPlatform]           = useState(draft.platform || 'douyin');
  const [videoLength, setVideoLength]     = useState(draft.videoLength || 25);
  const [draftRestored, setDraftRestored] = useState(hasDraft);

  // 接收来自外部模块（Prompt知识库 / 风格复刻 / 竞品分析）传递的状态
  useEffect(() => {
    const state = location.state as any;
    if (state?.prompt) {
      setPromptText(state.prompt);
      toast.info('已自动载入外部优质 Prompt 模版！');
    }
    if (state?.productName) {
      setProductName(state.productName);
    }
    if (state?.category) {
      setCategory(state.category);
    }
    if (state?.styleReport) {
      toast.success(`已载入爆款风格 DNA: ${state.styleReport.dna_fingerprint}`);
    }
    if (state?.competitorScript) {
      toast.success('已载入竞品爆款对标脚本结构！');
    }
  }, [location.state]);

  // 生成结果默认展现预置示例
  const [scenes, setScenes]       = useState<ScriptScene[]>([
    { order: 1, scene: '镜头1：痛点特写 (前3秒Hook)', visual: '女主角对镜叹气，特写T区油光与暗沉粗大毛孔', audio: '天天熬夜加班，脸油得能炒菜，用普通洗面奶洗完紧绷脱皮？', duration: 3, notes: '字幕高亮【脸油紧绷】' },
    { order: 2, scene: '镜头2：产品亮相 (卖点展示)', visual: '极简白瓶洗面奶置于竹叶与微水流背景中，镜头推近特写细腻泡泡', audio: '试试这款草本氨基酸洗面奶！蕴含三重草本提取，微米级泡沫一冲即净。', duration: 5, notes: '展示泡沫绵密感' },
    { order: 3, scene: '镜头3：对比实验 (痛点解法)', visual: '左右对比测试：左边传统皂基pH呈强碱，右边本品pH呈弱酸温和亲肤', audio: '看！温和弱酸性，洗走油脂污垢的同时，牢牢锁住皮肤水分！', duration: 6, notes: '实验直观显色' },
    { order: 4, scene: '镜头4：使用后体验 (情感共鸣)', visual: '女主角洗完脸露出生机水润肌肤，满脸笑容摸脸特写', audio: '洗完摸上去嫩滑水润，完全不紧绷，连后续护肤品都好吸收了！', duration: 5, notes: '近景特写水润感' },
    { order: 5, scene: '镜头5：促销促单 (CTA转化)', visual: '手持产品展示，弹窗出现限时优惠买一送一及左下角小黄车箭头', audio: '官方旗舰店活动，今天下单直接买一发二！点击左下角赶紧抢吧！', duration: 6, notes: '闪烁提示左下角领券' },
  ]);
  const [promptText, setPromptText] = useState('你是一位全网千万级爆款带货短视频编剧。请根据以下信息撰写黄金三段式脚本：\n1. 【黄金3秒Hook】：用令人意想不到的痛点直击【18-30岁熬夜冒痘、出油敏感的年轻人】；\n2. 【核心卖点呈现】：突出【草本氨基酸水润洗面奶】的【温和无刺激敏感肌可用】；\n3. 【结尾引导下单】：给出限时福利【买一送一领券下单】。');
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generated, setGenerated]   = useState(true);
  const [saving, setSaving]         = useState(false);
  const [copied, setCopied]         = useState(false);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 四层流水线状态
  const [layerStatuses, setLayerStatuses] = useState<LayerStatuses>({
    selling_point: 'done', pain_point: 'done', hook: 'done', cta: 'done',
  });
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>(null);

  // 多轮对话优化
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 自动保存草稿（防抖 500ms）
  useEffect(() => {
    saveDraft({ productName, category, priceRange, sellingPoints, audience, platform, videoLength });
  }, [productName, category, priceRange, sellingPoints, audience, platform, videoLength, saveDraft]);

  // ── 痛点选择切换 ─────────────────────────────────────────────────────────
  const togglePainPoint = (pp: string) => {
    setSelectedPainPoints(prev =>
      prev.includes(pp) ? prev.filter(p => p !== pp) : prev.length < 3 ? [...prev, pp] : prev
    );
  };

  // ── 添加卖点 ───────────────────────────────────────────────────────────
  const addSellingPoint = () => {
    const val = sellingInput.trim();
    if (!val) return;
    if (sellingPoints.length >= 6) { toast.warning('最多添加6个卖点'); return; }
    setSellingPoints(p => [...p, val]);
    setSellingInput('');
  };

  const removeSellingPoint = (i: number) =>
    setSellingPoints(p => p.filter((_, idx) => idx !== i));

  // ── 模拟四层流水线动画 ─────────────────────────────────────────────────
  const runPipelineAnimation = async () => {
    const layers: LayerKey[] = ['selling_point', 'pain_point', 'hook', 'cta'];
    for (const layer of layers) {
      setActiveLayer(layer);
      setLayerStatuses(prev => ({ ...prev, [layer]: 'processing' }));
      await new Promise(r => setTimeout(r, 600));
      setLayerStatuses(prev => ({ ...prev, [layer]: 'done' }));
    }
    setActiveLayer(null);
  };

  // ── SSE 流式生成脚本 (CR-01 四层Prompt) ─────────────────────────────────
  const handleGenerate = async () => {
    if (!productName.trim()) { toast.error('请填写商品名称'); return; }
    if (sellingPoints.length === 0) { toast.error('请至少添加一个核心卖点'); return; }
    if (!audience.trim()) { toast.error('请填写目标用户'); return; }

    setGenerating(true);
    setGenerated(false);
    setStreamingText('');
    setChatMessages([]);
    setLayerStatuses({ selling_point: 'idle', pain_point: 'idle', hook: 'idle', cta: 'idle' });
    abortRef.current = new AbortController();

    // 并行启动四层动画
    runPipelineAnimation();

    // CR-01: 四层Prompt工程 — 卖点→痛点→平台钩子→CTA
    const systemPrompt = `你是专业的电商带货视频脚本策划师，精通抖音/TikTok短视频「四层结构」创作：
①卖点层：深度理解商品核心差异化价值
②痛点层：匹配目标用户真实痛点与情感共鸣
③钩子层：设计平台专属的开场钩子与悬念结构（前3秒留存）
④CTA层：构建紧迫感与高转化行动召唤`;

    const userPrompt = `请基于「四层Prompt工程」为以下商品生成完整带货视频脚本：

【商品基础信息】
- 商品名称：${productName}
- 商品品类：${category || '未指定'}
- 价格区间：${priceRange || '未指定'}
- 核心卖点：${sellingPoints.join('、')}

【目标用户与痛点】
- 目标用户：${audience}
- 核心痛点：${selectedPainPoints.length > 0 ? selectedPainPoints.join('、') : '待AI分析'}

【创作要求】
- 目标平台：${platform === 'tiktok' ? 'TikTok（英语用户，需要英文口播）' : '抖音（中文用户）'}
- 建议时长：${videoLength}秒
- 四层结构：①卖点提炼②痛点共鸣③平台钩子（前3秒强钩子）④CTA转化

请输出以下内容：

## 分镜脚本

生成5个场景的JSON数组（放在 \`\`\`json 代码块中）：
[
  {
    "order": 1,
    "scene": "场景名称（含四层标注）",
    "visual": "画面描述（15-30字）",
    "dialogue": "口播台词（20-40字，${platform === 'tiktok' ? '英文' : '中文'}）",
    "duration": 时长(秒，整数),
    "prompt": "英文AI生成Prompt（50-80词）",
    "layer": "selling_point|pain_point|hook|cta"
  }
]

## AIGC Prompt

生成整体视频的详细英文Prompt（150-200词），放在 \`\`\`prompt 代码块中。`;

    let fullText = '';
    try {
      await callLLMStream(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        (chunk) => {
          fullText += chunk;
          setStreamingText(fullText);
        },
        abortRef.current.signal,
      );

      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/);
      const promptMatch = fullText.match(/```prompt\s*([\s\S]*?)```/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim()) as ScriptScene[];
          setScenes(parsed);
        } catch { /* fallback */ }
      }
      if (promptMatch) {
        setPromptText(promptMatch[1].trim());
      } else {
        const promptSection = fullText.split('## AIGC Prompt')[1];
        if (promptSection) setPromptText(promptSection.replace(/```.*?```/gs, '').trim());
      }

      setGenerated(true);
      setStreamingText('');
      clearDraft(); // 生成成功后清除草稿
      setDraftRestored(false);
      setChatMessages([
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: fullText },
      ]);
      toast.success('脚本生成完成！四层Prompt工程已全部执行');
    } catch (err) {
      if (!abortRef.current.signal.aborted) toast.error('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleStopGenerate = () => {
    abortRef.current?.abort();
    setGenerating(false);
    if (streamingText) {
      setGenerated(true);
      setStreamingText('');
    }
  };

  // ── 场景编辑 ───────────────────────────────────────────────────────────
  const updateScene = (idx: number, patch: Partial<ScriptScene>) =>
    setScenes(s => s.map((sc, i) => i === idx ? { ...sc, ...patch } : sc));

  const deleteScene = (idx: number) =>
    setScenes(s => s.filter((_, i) => i !== idx).map((sc, i) => ({ ...sc, order: i + 1 })));

  const addScene = () => setScenes(s => [...s, {
    order: s.length + 1, scene: `场景 ${s.length + 1}`,
    visual: '', dialogue: '', duration: 5, prompt: '',
  }]);

  // ── P1-N02 多轮对话优化 ─────────────────────────────────────────────────
  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatStreaming) return;
    setChatInput('');
    setChatStreaming(true);

    const newHistory: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages([...newHistory, { role: 'assistant', content: '', streaming: true }]);

    chatAbortRef.current = new AbortController();
    let assistantText = '';

    try {
      await callLLMStream(
        [
          { role: 'system', content: '你是专业的电商带货视频脚本策划师，正在帮助用户优化已生成的脚本。请根据用户反馈直接修改或补充脚本内容。' },
          ...newHistory.map(m => ({ role: m.role, content: m.content })),
        ],
        (chunk) => {
          assistantText += chunk;
          setChatMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantText, streaming: true };
            return updated;
          });
        },
        chatAbortRef.current.signal,
      );

      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: assistantText, streaming: false };
        return updated;
      });

      // 尝试从回复中提取更新的场景 JSON
      const jsonMatch = assistantText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim()) as ScriptScene[];
          setScenes(parsed);
          toast.success('脚本已根据对话更新！');
        } catch { /* ignore */ }
      }
    } catch (err) {
      if (!chatAbortRef.current.signal.aborted) toast.error('优化失败，请重试');
    } finally {
      setChatStreaming(false);
    }
  };

  // ── 保存脚本（内部通用） ────────────────────────────────────────────────
  const saveScript = async (): Promise<Script | null> => {
    if (!user || !generated) return null;
    const { data: script, error } = await supabase.from('scripts').insert({
      user_id:         user.id,
      product_name:    productName,
      selling_points:  sellingPoints,
      target_audience: audience,
      platform,
      scenes,
      prompt_text:     promptText,
      edited_scenes:   null,
      edited_prompt:   null,
      status:          'done',
    }).select().maybeSingle();
    if (error || !script) return null;
    setSavedScriptId((script as Script).id);
    return script as Script;
  };

  // ── 应用到知识库 ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !generated) return;
    setSaving(true);
    try {
      let scriptId = savedScriptId;
      if (!scriptId) {
        const script = await saveScript();
        if (!script) { toast.error('保存失败，请重试'); return; }
        scriptId = script.id;
      }
      await supabase.from('knowledge_entries').insert({
        user_id:       user.id,
        source_type:   'script_edit',
        source_id:     scriptId,
        title:         `${productName} 脚本`,
        content:       { scenes, prompt_text: promptText, selling_points: sellingPoints },
        quality_score: 3,
      });
      toast.success('已保存并同步至知识库！AI 将在下次生成时学习该数据');
    } finally {
      setSaving(false);
    }
  };

  // ── 应用到视频生成 ───────────────────────────────────────────────────────
  const handleApplyToVideo = async () => {
    if (!generated) return;
    let scriptId = savedScriptId;
    if (!scriptId) {
      const script = await saveScript();
      scriptId = script?.id ?? null;
    }
    navigate('/video/create', {
      state: { from: 'script', scriptId, productName, sellingPoints, platform, promptText, scenes },
    });
    toast.success('已跳转至视频生成，脚本数据已预填');
  };

  // ── 复制 Prompt ────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── 草稿恢复提示 ── */}
      {draftRestored && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
          <Info className="w-4 h-4 text-warning shrink-0" />
          <span className="flex-1 text-warning">已恢复上次未完成的草稿</span>
          <button
            onClick={() => { clearDraft(); setDraftRestored(false); setProductName(''); setCategory(''); setPriceRange(''); setSellingPoints([]); setAudience(''); setPlatform('douyin'); setVideoLength(25); }}
            className="text-warning hover:text-warning/70 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* ── 页头 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <Wand2 className="w-5 h-5 text-primary shrink-0" />
            商品带货脚本
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            「卖点 → 痛点 → 平台钩子 → CTA」四层Prompt工程，自动生成高转化短视频分镜脚本
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setProductName('草本氨基酸水润洗面奶');
              setCategory('美妆护肤');
              setPriceRange('¥50-200 中端');
              setSellingPoints(['温和无刺激敏感肌可用', '微米级细腻泡沫深层清洁', '复配玻尿酸洗完不紧绷']);
              setAudience('18-30岁熬夜冒痘、出油敏感的年轻人');
              setSelectedPainPoints(['肤色暗沉不均', '毛孔粗大油光', '过敏刺激敏感']);
              setVideoLength(25);
              setPlatform('douyin');
              setPromptText(`你是一位全网千万级爆款带货短视频编剧。请根据以下信息撰写黄金三段式脚本：\n1. 【黄金3秒Hook】：用令人意想不到的痛点或悬念直击【18-30岁熬夜冒痘、出油敏感的年轻人】，引起好奇；\n2. 【核心卖点呈现】：突出【草本氨基酸水润洗面奶】的【温和无刺激敏感肌可用、微米级细腻泡沫深层清洁】，真实对比传统洗面奶的干燥紧绷；\n3. 【结尾引导下单】：给出限时福利【买一送一领券下单】，建立购买紧迫感。`);
              setScenes([
                { order: 1, scene: '镜头1：痛点特写 (前3秒Hook)', visual: '女主角对镜叹气，特写T区油光与暗沉粗大毛孔', audio: '天天熬夜加班，脸油得能炒菜，用普通洗面奶洗完紧绷脱皮？', duration: 3, notes: '字幕高亮【脸油紧绷】' },
                { order: 2, scene: '镜头2：产品亮相 (卖点展示)', visual: '极简白瓶洗面奶置于竹叶与微水流背景中，镜头推近特写细腻泡泡', audio: '试试这款草本氨基酸洗面奶！蕴含三重草本提取，微米级泡沫一冲即净。', duration: 5, notes: '展示泡沫绵密感' },
                { order: 3, scene: '镜头3：对比实验 (痛点解法)', visual: '左右对比测试：左边传统皂基pH呈强碱，右边本品pH呈弱酸温和亲肤', audio: '看！温和弱酸性，洗走油脂污垢的同时，牢牢锁住皮肤水分！', duration: 6, notes: '实验直观显色' },
                { order: 4, scene: '镜头4：使用后体验 (情感共鸣)', visual: '女主角洗完脸露出生机水润肌肤，满脸笑容摸脸特写', audio: '洗完摸上去嫩滑水润，完全不紧绷，连后续护肤品都好吸收了！', duration: 5, notes: '近景特写水润感' },
                { order: 5, scene: '镜头5：促销促单 (CTA转化)', visual: '手持产品展示，弹窗出现限时优惠买一送一及左下角小黄车箭头', audio: '官方旗舰店活动，今天下单直接买一发二！点击左下角赶紧抢吧！', duration: 6, notes: '闪烁提示左下角领券' },
              ]);
              setGenerated(true);
              setLayerStatuses({ selling_point: 'done', pain_point: 'done', hook: 'done', cta: 'done' });
              toast.success('已载入爆款商品带货脚本生成示例！');
            }}
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            一键载入示例脚本
          </Button>
          <Badge variant="outline" className="text-xs shrink-0 gap-1 border-primary/40 text-primary">
            <Sparkles className="w-3 h-3" />CR-01
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── 左侧：输入表单 ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs">1</span>
              商品基础信息
            </h2>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">商品名称 *</Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="例：无线降噪耳机 Pro" className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">商品品类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择品类" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">价格区间</Label>
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择价格" /></SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">核心卖点 * (最多6个)</Label>
              <div className="flex gap-2">
                <Input
                  value={sellingInput}
                  onChange={e => setSellingInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSellingPoint()}
                  placeholder="输入卖点后按 Enter"
                  className="h-9 flex-1"
                />
                <Button size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={addSellingPoint}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {sellingPoints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sellingPoints.map((sp, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                      {sp}
                      <button onClick={() => removeSellingPoint(i)}
                        className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">目标用户 *</Label>
              <Input value={audience} onChange={e => setAudience(e.target.value)}
                placeholder="例：18-35岁爱好音乐的都市白领" className="h-9" />
            </div>

            {/* 经典痛点快选 */}
            {category && CLASSIC_PAIN_POINTS[category] && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-warning" />
                  经典痛点快选（最多3个）
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {CLASSIC_PAIN_POINTS[category].map(pp => (
                    <button
                      key={pp}
                      onClick={() => togglePainPoint(pp)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-all',
                        selectedPainPoints.includes(pp)
                          ? 'bg-warning/15 border-warning/50 text-warning font-medium'
                          : 'border-border/60 text-muted-foreground hover:border-warning/40 hover:text-foreground',
                      )}
                    >
                      {pp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">目标平台</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="douyin">抖音</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">建议时长：{videoLength}s</Label>
                <Slider
                  min={10} max={60} step={5}
                  value={[videoLength]}
                  onValueChange={([v]) => setVideoLength(v)}
                  className="mt-3"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 h-10" onClick={handleGenerate} disabled={generating}>
                {generating
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Wand2 className="w-4 h-4 mr-2" />
                }
                {generating ? 'AI 生成中...' : (generated ? '重新生成' : 'AI 一键生成脚本')}
              </Button>
              {generating && (
                <Button variant="outline" className="h-10 px-3 shrink-0" onClick={handleStopGenerate}>
                  <StopCircle className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* 四层流水线 */}
            {(generating || generated) && (
              <FourLayerPipeline statuses={layerStatuses} activeLayer={activeLayer} />
            )}

            {generating && (
              <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">AI 正在流式输出脚本...</span>
                </div>
                {streamingText && (
                  <p className="text-xs text-foreground/80 line-clamp-3 font-mono">{streamingText.slice(-200)}</p>
                )}
              </div>
            )}
          </div>

          {/* 使用技巧 */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-primary">💡 四层引擎使用技巧</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong className="text-foreground">卖点层</strong>：填写具体功能优势，越差异化越好</li>
              <li>• <strong className="text-foreground">痛点层</strong>：选择品类经典痛点，增强情感共鸣</li>
              <li>• <strong className="text-foreground">钩子层</strong>：AI自动设计前3秒强钩子</li>
              <li>• <strong className="text-foreground">CTA层</strong>：修改后保存可同步至知识库进化</li>
            </ul>
          </div>
        </div>

        {/* ── 右侧：生成结果 ── */}
        <div className="lg:col-span-3 space-y-5">
          {!generated && !generating && (
            <div className="rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center py-24 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">填写商品信息后点击生成</p>
              <p className="text-sm text-muted-foreground">AI 将按「四层Prompt工程」流式输出脚本</p>
              <div className="flex items-center gap-2 mt-2">
                {FOUR_LAYER_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-center gap-1">
                      <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', step.bgColor, step.color)}>
                        <Icon className="w-3 h-3" />{step.label}
                      </span>
                      {i < FOUR_LAYER_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {generated && (
            <>
              {/* 分镜脚本 */}
              <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">分镜脚本</h2>
                    <Badge variant="secondary" className="text-xs">{scenes.length} 个场景</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />总时长 {totalDuration}s
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={addScene}>
                    <Plus className="w-3.5 h-3.5" />添加场景
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  {scenes.map((sc, i) => (
                    <SceneCard key={sc.order} scene={sc} index={i}
                      onUpdate={updateScene} onDelete={deleteScene} />
                  ))}
                </div>
              </div>

              <Separator />

              {/* Prompt 文案 */}
              <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold">AIGC Prompt 文案</h2>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
                    {copied
                      ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" />已复制</>
                      : <><Copy className="w-3.5 h-3.5" />复制</>
                    }
                  </Button>
                </div>
                <div className="p-4">
                  <Textarea
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    rows={8}
                    className="text-sm font-mono resize-none bg-muted/30"
                    placeholder="Prompt 文案..."
                  />
                </div>
              </div>

              {/* ── P1-N02 多轮对话优化 ── */}
              <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">多轮对话优化脚本</h2>
                  <Badge variant="outline" className="text-xs ml-auto">CR-01</Badge>
                </div>
                <div className="flex flex-col">
                  <ScrollArea className="h-52 px-4 py-3">
                    {chatMessages.filter(m => m.role === 'user' && chatMessages.indexOf(m) > 1).length === 0
                      && chatMessages.filter(m => m.streaming).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        在下方输入对脚本的修改要求，AI 会实时更新
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.slice(2).map((msg, i) => (
                          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'max-w-[85%] rounded-xl px-3 py-2 text-xs',
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground',
                            )}>
                              {msg.role === 'assistant' && msg.streaming ? (
                                <span>{msg.content}<span className="animate-pulse">▋</span></span>
                              ) : (
                                <span className="whitespace-pre-wrap">{msg.content.slice(0, 400)}{msg.content.length > 400 ? '...' : ''}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <div className="px-4 pb-4 border-t border-border/50 pt-3 flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                      placeholder="例：把第一个场景改为情感故事开场..."
                      className="h-9 text-sm"
                      disabled={chatStreaming}
                    />
                    <Button
                      size="sm"
                      className="h-9 px-3 shrink-0"
                      onClick={chatStreaming ? () => chatAbortRef.current?.abort() : handleChatSend}
                      disabled={!chatInput.trim() && !chatStreaming}
                    >
                      {chatStreaming
                        ? <StopCircle className="w-4 h-4" />
                        : <Send className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </div>
              </div>

              {/* 底部操作 */}
              <div className="flex flex-col gap-3">
                <Button className="w-full h-11" onClick={handleSave} disabled={saving}>
                  {saving
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <BookOpen className="w-4 h-4 mr-2" />
                  }
                  {saving ? '保存中...' : '保存并回写知识库'}
                </Button>
                <Button variant="outline" className="w-full h-11" onClick={handleApplyToVideo}>
                  <Video className="w-4 h-4 mr-2" />应用到视频生成
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
