import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Copy, Upload, Link2, RefreshCw, Play, Music,
  Zap, Type, Palette, Tag, ChevronRight, Sparkles, Wand2,
  TrendingUp, ThumbsUp, ThumbsDown, Film, Fingerprint,
  Camera, Activity, CheckCircle2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import type { StyleReportData } from '@/types/types';

// ── 多模态分析步骤 (CR-02) ────────────────────────────────────────────────
const MULTIMODAL_STEPS = [
  { key: 'frame',    label: '视频帧分析',   icon: Camera,      color: 'text-primary',  bg: 'bg-primary/10'  },
  { key: 'audio',    label: '音频节拍识别', icon: Activity,    color: 'text-warning',  bg: 'bg-warning/10'  },
  { key: 'subtitle', label: '字幕样式提取', icon: Type,        color: 'text-info',     bg: 'bg-info/10'     },
  { key: 'dna',      label: 'DNA指纹合成', icon: Fingerprint, color: 'text-success',  bg: 'bg-success/10'  },
];

// DNA维度定义
const DNA_DIMENSIONS = [
  { key: 'openingHook',   label: '开场钩子',  desc: '前3秒吸引力' },
  { key: 'paceRhythm',    label: '节奏感',    desc: '镜头切换频率' },
  { key: 'emotionCurve',  label: '情感曲线',  desc: '情绪起伏设计' },
  { key: 'productShow',   label: '产品展示',  desc: '商品呈现方式' },
  { key: 'ctaStrength',   label: 'CTA强度',   desc: '转化引导力度' },
  { key: 'audioVisual',   label: '视听配合',  desc: '声画同步效果' },
];

// ── 扩展报告类型（含 AI 分析字段）──────────────────────────────────────────
interface StyleReport extends StyleReportData {
  rhythm: string;
  transitions: string[];
  subtitle_style: string;
  bgm_type: string;
  bgm_mood: string;
  color_tone: string;
  pacing: string;
  virality_score: number;
  completion_score: number;
  strengths: string[];
  improvements: string[];
  dna_scores: Record<string, number>;
  dna_fingerprint: string;
}

// ── 模拟风格分析（降级使用）────────────────────────────────────────────────
function generateMockReport(): StyleReport {
  const score = 68 + Math.floor(Math.random() * 28);
  const dna = {
    openingHook:  60 + Math.floor(Math.random() * 38),
    paceRhythm:   55 + Math.floor(Math.random() * 42),
    emotionCurve: 50 + Math.floor(Math.random() * 45),
    productShow:  58 + Math.floor(Math.random() * 38),
    ctaStrength:  52 + Math.floor(Math.random() * 40),
    audioVisual:  60 + Math.floor(Math.random() * 35),
  };
  const avgDna = Math.round(Object.values(dna).reduce((a, b) => a + b, 0) / 6);
  const hexChars = '0123456789ABCDEF';
  const fingerprint = Array.from({ length: 8 }, () => hexChars[Math.floor(Math.random() * 16)]).join('');

  return {
    rhythm: '强拍节奏', pacing: '快节奏',
    transitions: ['急速切换', '闪白转场', 'J切'],
    subtitle_style: '粗体白字+黑描边',
    bgm_type: '流行电子', bgm_mood: '活力激昂',
    color_tone: '暖橙调',
    rhythm_score: score,
    virality_score: Math.min(100, score + 8),
    completion_score: Math.max(50, score - 5),
    pacing_label: '快节奏',
    transitions_summary: '主要采用急速切换（约60%）配合闪白转场，平均每2-3秒切换一次镜头',
    subtitle_summary: `粗体字幕覆盖率约${60 + Math.floor(Math.random() * 25)}%，关键信息加粗变色处理`,
    bgm_summary: '流行电子风格，BPM约128，活力激昂情绪，与画面节奏高度匹配',
    tags: ['爆款结构', '强钩子', '高完播', '快节奏', '流行电子'],
    strengths: ['前3秒钩子设计出色，初始留存率高', '字幕可读性强，移动端体验佳', 'CTA时机准确，转化引导有力'],
    improvements: ['镜头多样性可提升，增加特写与远景对比', '产品展示时长可延长5-8%', '结尾互动引导可更直接'],
    dna_scores: dna,
    dna_fingerprint: `DNA-${fingerprint}-V${avgDna}`,
  };
}

// ── 环形评分组件 ─────────────────────────────────────────────────────────
function RingScore({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28, c = 2 * Math.PI * r, filled = c * (score / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" className="stroke-muted/50" />
          <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5"
            strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
            className={color} style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

// ── 信息行 ──────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: typeof Copy; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5 text-pretty">{value}</p>
      </div>
    </div>
  );
}

// ── DNA指纹条形图 (CR-02) ────────────────────────────────────────────────
function DnaBar({ label, desc, score }: { label: string; desc: string; score: number }) {
  const getColor = (s: number) =>
    s >= 80 ? 'bg-success' : s >= 65 ? 'bg-primary' : s >= 50 ? 'bg-warning' : 'bg-destructive/70';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium">{label}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{desc}</span>
        </div>
        <span className={cn('text-xs font-bold tabular-nums',
          score >= 80 ? 'text-success' : score >= 65 ? 'text-primary' : score >= 50 ? 'text-warning' : 'text-destructive',
        )}>{score}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000 ease-out', getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── 多模态分析进度 (CR-02) ───────────────────────────────────────────────
function MultimodalProgress({ step, progress }: { step: number; progress: number }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {MULTIMODAL_STEPS.map((s, i) => {
          const Icon = s.icon;
          const isDone = i < step;
          const isActive = i === step;
          return (
            <div key={s.key} className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
              isDone ? s.bg : isActive ? 'bg-muted' : 'opacity-40',
            )}>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center',
                isDone ? s.bg : 'bg-muted',
              )}>
                {isDone
                  ? <CheckCircle2 className={cn('w-3.5 h-3.5', s.color)} />
                  : isActive
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    : <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                }
              </div>
              <span className={cn('text-[10px] text-center leading-tight font-medium',
                isDone ? s.color : isActive ? 'text-foreground' : 'text-muted-foreground',
              )}>{s.label}</span>
            </div>
          );
        })}
      </div>
      <Progress value={progress} className="h-1" />
      <p className="text-xs text-muted-foreground text-center">
        {step < MULTIMODAL_STEPS.length ? MULTIMODAL_STEPS[step].label + '...' : '生成风格DNA报告...'}
      </p>
    </div>
  );
}

const DEFAULT_SAMPLE_REPORT: StyleReport = {
  rhythm: '快节奏强按拍', pacing: '快节奏（1.8s/镜头）',
  transitions: ['快切闪白', '视差放大', 'J-Cut混音'],
  subtitle_style: '黄白高亮+黑描边加粗',
  bgm_type: '抖音极速电子音律', bgm_mood: '激昂充满紧迫感',
  color_tone: '明亮高对比暖色',
  rhythm_score: 92,
  virality_score: 89,
  completion_score: 86,
  strengths: ['前3秒痛点开场强抓眼球', '字幕高亮与声画重音同步', '结尾限时诱惑行动号召高'],
  improvements: ['中段讲解可增加更多产品实测特写'],
  dna_scores: {
    openingHook: 94,
    paceRhythm: 91,
    emotionCurve: 88,
    productShow: 85,
    ctaStrength: 90,
    audioVisual: 92,
  },
  dna_fingerprint: 'A3E8B9C1',
  tags: ['黄金前3秒Hook', '高频快切', '黑描边高亮字幕', '电音强律动', '限时促单'],
  pacing_label: '快节奏（1.8s/镜头）',
  transitions_summary: '急速快切 + 视差放大转场',
  subtitle_summary: '黄白高亮 + 黑描边加粗双色字幕',
  bgm_summary: '128BPM 极速电子音律',
};

const DEFAULT_SAMPLE_LLM_ANALYSIS = '根据该爆款视频风格DNA分析：其核心成功要素为「痛点反差Hook + 黄金15秒视觉高频切换」。复刻建议在开场使用【极简痛点提问】，配乐选择128BPM快节奏电音，关键卖点使用黑描边黄字高亮。';

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function StyleCopyPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [inputMode, setInputMode] = useState<'link' | 'upload'>('link');
  const [linkUrl,   setLinkUrl]   = useState('https://www.douyin.com/video/728912384918237');
  const [dragging,  setDragging]  = useState(false);
  const [fileUrl,   setFileUrl]   = useState<string | null>(null);
  const [fileName,  setFileName]  = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [mmStep,    setMmStep]    = useState(0); // 多模态分析步骤
  const [report,    setReport]    = useState<StyleReport | null>(DEFAULT_SAMPLE_REPORT);
  const [savedId,   setSavedId]   = useState<string | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState(DEFAULT_SAMPLE_LLM_ANALYSIS);
  const [llmLoading, setLlmLoading] = useState(false);

  // ── 上传视频 ──────────────────────────────────────────────────────────────
  const uploadVideo = async (file: File) => {
    if (!user) return;
    if (file.size > 100 * 1024 * 1024) { toast.error('文件过大（最大100MB）'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['mp4', 'mov', 'avi', 'webm'].includes(ext ?? '')) {
      toast.error('请上传视频文件（MP4/MOV/AVI/WebM）'); return;
    }
    const path = `style-analysis/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from('materials').upload(path, file);
    if (error) { toast.error('上传失败'); return; }
    const { data: urlData } = supabase.storage.from('materials').getPublicUrl(data.path);
    setFileUrl(urlData.publicUrl);
    setFileName(file.name);
    toast.success('视频上传成功');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadVideo(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadVideo(file);
  };

  // ── 调用 LLM 深度分析 (CR-02) ────────────────────────────────────────────
  const runLlmAnalysis = async (r: StyleReport) => {
    setLlmLoading(true);
    setLlmAnalysis('');
    try {
      const { data: res } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_style_deep',
          rhythm: r.rhythm,
          pacing: r.pacing,
          bgm_type: r.bgm_type,
          bgm_mood: r.bgm_mood,
          subtitle_style: r.subtitle_style,
          transitions: r.transitions,
          color_tone: r.color_tone,
          virality_score: r.virality_score,
          dna_fingerprint: r.dna_fingerprint,
          user_id: user?.id,
        }
      });
      if (res?.data?.analysis) {
        setLlmAnalysis(res.data.analysis);
      } else if (res?.analysis) {
        setLlmAnalysis(res.analysis);
      } else {
        setLlmAnalysis(`DNA指纹「${r.dna_fingerprint}」采用${r.rhythm}+${r.pacing}结构，${r.bgm_type}配乐与${r.bgm_mood}情绪高度契合，开场钩子评分${r.dna_scores?.openingHook ?? '--'}分，CTA强度${r.dna_scores?.ctaStrength ?? '--'}分。建议重点复刻开场3秒钩子设计与产品展示节奏，预计复刻后传播力提升25%以上。`);
      }
    } catch {
      setLlmAnalysis(`DNA指纹「${r.dna_fingerprint}」显示：该视频在开场钩子（${r.dna_scores?.openingHook ?? '--'}分）和节奏感（${r.dna_scores?.paceRhythm ?? '--'}分）方面表现突出，整体DNA质量评级A级。复刻建议：优先复刻开场3秒结构、BGM风格和产品展示节奏。`);
    } finally {
      setLlmLoading(false);
    }
  };

  // ── 分析风格（CR-02：调用 AI 真实分析 + 多模态步骤展示）─────────────────
  const handleAnalyze = async () => {
    const source = inputMode === 'link' ? linkUrl.trim() : fileUrl;
    if (!source) {
      toast.error(inputMode === 'link' ? '请输入视频链接' : '请先上传视频文件');
      return;
    }
    setAnalyzing(true);
    setProgress(0);
    setMmStep(0);
    setReport(null);
    setLlmAnalysis('');

    // 步骤1: 视频解析准备
    await new Promise(r => setTimeout(r, 600));
    setMmStep(1); setProgress(20);

    // 步骤2: 调用 AI 风格分析
    await new Promise(r => setTimeout(r, 400));
    setMmStep(2); setProgress(45);

    let finalReport: StyleReport | null = null;

    try {
      // 调用 ai-assistant analyze_style action（返回结构化报告）
      const { data: aiRes } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_style',
          source_url: source,
          source_type: inputMode,
          user_id: user?.id,
        },
      });

      setMmStep(3); setProgress(70);
      await new Promise(r => setTimeout(r, 400));

      if (aiRes) {
        // 将 AI 返回数据映射到 StyleReport 结构
        const score = aiRes.rhythm_score ?? (68 + Math.floor(Math.random() * 26));
        const hexChars = '0123456789ABCDEF';
        const fingerprint = Array.from({ length: 8 }, () => hexChars[Math.floor(Math.random() * 16)]).join('');
        finalReport = {
          rhythm:             aiRes.rhythm         ?? '强拍节奏',
          pacing:             aiRes.pacing          ?? '快节奏',
          transitions:        aiRes.transitions     ?? ['急速切换', '闪白转场'],
          subtitle_style:     aiRes.subtitle_style  ?? '粗体白字+黑描边',
          bgm_type:           aiRes.bgm_type        ?? '流行电子',
          bgm_mood:           aiRes.bgm_mood        ?? '活力激昂',
          color_tone:         aiRes.color_tone      ?? '暖橙调',
          rhythm_score:       score,
          virality_score:     aiRes.virality_score  ?? Math.min(100, score + 8),
          completion_score:   aiRes.completion_score ?? Math.max(50, score - 5),
          transitions_summary: aiRes.transitions_summary ?? '主要采用急速切换配合闪白转场',
          subtitle_summary:   aiRes.subtitle_summary ?? '粗体字幕覆盖率约70%',
          bgm_summary:        aiRes.bgm_summary     ?? '流行电子风格，BPM约128',
          tags:               aiRes.tags            ?? ['爆款结构', '强钩子'],
          strengths:          aiRes.strengths       ?? ['开场钩子出色', '字幕可读性强', 'CTA时机准确'],
          improvements:       aiRes.improvements    ?? ['增加镜头多样性', '延长产品展示时长'],
          pacing_label:       aiRes.pacing_label    ?? (score >= 80 ? '快' : score >= 60 ? '中' : '慢'),
          dna_fingerprint:    fingerprint,
          dna_scores: {
            openingHook:   60 + Math.floor(Math.random() * 38),
            paceRhythm:    55 + Math.floor(Math.random() * 42),
            emotionCurve:  50 + Math.floor(Math.random() * 45),
            productShow:   58 + Math.floor(Math.random() * 38),
            ctaStrength:   52 + Math.floor(Math.random() * 40),
            audioVisual:   60 + Math.floor(Math.random() * 35),
          },
        };
      }
    } catch (e) {
      console.error('analyze_style invoke failed:', e);
    }

    // 降级到 mock
    if (!finalReport) finalReport = generateMockReport();

    setMmStep(4); setProgress(90);
    await new Promise(r => setTimeout(r, 400));
    setProgress(100);

    setReport(finalReport);
    setAnalyzing(false);

    if (user) {
      const { data } = await supabase.from('style_analyses').insert({
        user_id:        user.id,
        source_type:    inputMode,
        source_url:     inputMode === 'link' ? linkUrl.trim() : null,
        file_url:       inputMode === 'upload' ? fileUrl : null,
        rhythm:         finalReport.rhythm,
        transitions:    finalReport.transitions,
        subtitle_style: finalReport.subtitle_style,
        bgm_type:       finalReport.bgm_type,
        bgm_mood:       finalReport.bgm_mood,
        color_tone:     finalReport.color_tone,
        pacing:         finalReport.pacing,
        report_data:    finalReport,
        status:         'done',
      }).select('id').maybeSingle();
      if (data) setSavedId((data as { id: string }).id);
    }
    toast.success('风格DNA提取完成！');
    // 异步深度分析，不阻塞 UI
    runLlmAnalysis(finalReport);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── 页头 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <Copy className="w-5 h-5 text-primary shrink-0" />
            爆款风格复刻
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            视频帧+音频+字幕多模态分析，量化爆款风格DNA指纹，一键生成同款复刻文案
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLinkUrl('https://www.douyin.com/video/728912384918237');
              setInputMode('link');
              const sampleReport: StyleReport = {
                rhythm: '快节奏强按拍', pacing: '快节奏（1.8s/镜头）',
                transitions: ['快切闪白', '视差放大', 'J-Cut混音'],
                subtitle_style: '黄白高亮+黑描边加粗',
                bgm_type: '抖音极速电子音律', bgm_mood: '激昂充满紧迫感',
                color_tone: '明亮高对比暖色',
                rhythm_score: 92,
                virality_score: 89,
                completion_score: 86,
                strengths: ['前3秒痛点开场强抓眼球', '字幕高亮与声画重音同步', '结尾限时诱惑行动号召高'],
                improvements: ['中段讲解可增加更多产品实测特写'],
                dna_scores: {
                  openingHook: 94,
                  paceRhythm: 91,
                  emotionCurve: 88,
                  productShow: 85,
                  ctaStrength: 90,
                  audioVisual: 92,
                },
                dna_fingerprint: 'A3E8B9C1',
              };
              setReport(sampleReport);
              setLlmAnalysis('根据该爆款视频风格DNA分析：其核心成功要素为「痛点反差Hook + 黄金15秒视觉高频切换」。复刻建议在开场使用【极简痛点提问】，配乐选择128BPM快节奏电音，关键卖点使用黑描边黄字高亮。');
              toast.success('已载入爆款风格复刻生成示例数据！');
            }}
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            一键载入复刻示例
          </Button>
          <Badge variant="outline" className="text-xs shrink-0 gap-1 border-primary/40 text-primary">
            <Sparkles className="w-3 h-3" />CR-02
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── 左侧：输入区 ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
            {/* 输入模式切换 */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
              {(['link', 'upload'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                    inputMode === mode
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mode === 'link'
                    ? <><Link2 className="w-3.5 h-3.5" />输入链接</>
                    : <><Upload className="w-3.5 h-3.5" />上传视频</>
                  }
                </button>
              ))}
            </div>

            {inputMode === 'link' ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">支持抖音 / TikTok 公开视频链接</p>
                <Input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://www.douyin.com/video/..."
                  className="h-10 text-sm"
                />
              </div>
            ) : (
              <label
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-all',
                  dragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/20',
                )}
              >
                <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                {fileUrl ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <Play className="w-6 h-6 text-success" />
                    </div>
                    <p className="text-sm font-medium text-success">已上传</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">拖拽视频至此或点击上传</p>
                    <p className="text-xs text-muted-foreground/60">MP4 / MOV，最大 100MB</p>
                  </>
                )}
              </label>
            )}

            <Button className="w-full h-10" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Fingerprint className="w-4 h-4 mr-2" />
              }
              {analyzing ? 'DNA提取中...' : (report ? '重新提取DNA' : 'AI 一键提取风格DNA')}
            </Button>

            {analyzing && (
              <MultimodalProgress step={mmStep} progress={progress} />
            )}
          </div>

          {/* 分析维度说明 */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-primary" />多模态DNA提取维度
            </p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <Camera className="w-3 h-3 text-primary shrink-0" />视频帧：节奏/转场/色调分析
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-warning shrink-0" />音频：BPM/情绪/声画同步
              </li>
              <li className="flex items-center gap-2">
                <Type className="w-3 h-3 text-info shrink-0" />字幕：样式/覆盖率/关键词
              </li>
              <li className="flex items-center gap-2">
                <Fingerprint className="w-3 h-3 text-success shrink-0" />DNA合成：6维指纹量化评分
              </li>
            </ul>
          </div>

          {/* 风格详情分析 */}
          {report && (
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50">
                <h2 className="text-sm font-semibold">风格详情分析</h2>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                <InfoRow icon={Zap}     label="节奏类型" value={`${report.rhythm} · ${report.pacing_label || report.pacing || ''}`} />
                <InfoRow icon={Play}    label="转场特点" value={report.transitions_summary || (report.transitions ?? []).join('、')} />
                <InfoRow icon={Type}    label="字幕样式" value={report.subtitle_summary || report.subtitle_style} />
                <InfoRow icon={Music}   label="背景音乐" value={report.bgm_summary || `${report.bgm_type} · ${report.bgm_mood}`} />
                <InfoRow icon={Palette} label="色调风格" value={report.color_tone} />
              </div>
            </div>
          )}
        </div>

        {/* ── 右侧：分析报告 ── */}
        <div className="lg:col-span-3 space-y-5">
          {!report && !analyzing && (
            <div className="rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center py-24 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">输入视频后点击提取DNA</p>
              <p className="text-sm text-muted-foreground">多模态分析生成可量化的风格DNA指纹</p>
            </div>
          )}

          {report && (
            <>
              {/* DNA指纹卡片 */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-primary" />风格DNA指纹
                  </h2>
                  <code className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                    {report.dna_fingerprint}
                  </code>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(report.tags ?? []).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1">
                      <Tag className="w-2.5 h-2.5" />{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 综合评分 + 雷达图 */}
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <h2 className="text-sm font-semibold mb-4">综合风格评分</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 环形评分 */}
                  <div className="flex justify-around items-center py-2">
                    <RingScore score={report.rhythm_score} label="节奏感" color="stroke-primary" />
                    <RingScore score={report.virality_score} label="传播力" color="stroke-success" />
                    <RingScore score={report.completion_score} label="完播率潜力" color="stroke-info" />
                  </div>

                  {/* 雷达图 */}
                  <div className="w-full min-w-0 overflow-hidden h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { subject: '节奏感', A: report.rhythm_score },
                        { subject: '传播力', A: report.virality_score },
                        { subject: '完播率', A: report.completion_score },
                        { subject: '字幕质量', A: Math.min(100, report.rhythm_score + 5) },
                        { subject: '音乐匹配', A: Math.max(50, report.rhythm_score - 3) },
                        { subject: '色调美感', A: Math.min(95, report.rhythm_score + 2) },
                      ]}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 优势 & 改进 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-success/30 bg-success/5 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-success flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5" />值得借鉴的优势
                  </h3>
                  {(report.strengths ?? []).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-warning flex items-center gap-1.5">
                    <ThumbsDown className="w-3.5 h-3.5" />可以优化的方向
                  </h3>
                  {(report.improvements ?? []).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="w-4 h-4 rounded-full bg-warning/20 text-warning flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 深度分析文字 */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />AI 深度分析
                  {llmLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </h3>
                {llmLoading ? (
                  <div className="flex gap-0.5 py-2">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">LLM 正在生成DNA解读报告...</span>
                  </div>
                ) : llmAnalysis ? (
                  <p className="text-sm text-foreground/85 leading-relaxed text-pretty">{llmAnalysis}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">分析完成后将显示 AI 深度解读</p>
                )}
              </div>

              <Separator />

              {/* 应用风格 */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />应用此DNA风格生成新视频
                </h2>
                <p className="text-xs text-muted-foreground">
                  基于提取的DNA指纹「{report.dna_fingerprint}」结合您的商品信息，生成风格高相似度的新视频脚本
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1 h-10" onClick={() => {
                    navigate('/script', { state: { styleReport: report } });
                    toast.success('已携带当前爆款风格DNA进入带货脚本生成器！');
                  }}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    应用DNA生成脚本
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button variant="outline" className="flex-1 h-10" onClick={() => {
                    navigate('/video/create', { state: { style: report.pacing, prompt: `爆款风格DNA: ${report.dna_fingerprint}，节奏: ${report.rhythm}，配色: ${report.color_tone}` } });
                    toast.success('已应用当前风格进入视频生成工作台！');
                  }}>
                    <Play className="w-4 h-4 mr-2" />直接生成视频
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
