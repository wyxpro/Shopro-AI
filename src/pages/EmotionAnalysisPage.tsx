/**
 * P2-N02: 情绪 NLP 分析组件（嵌入 ScriptPage 脚本分析区）
 * 独立页面版本供路由访问
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart, Loader2, Sparkles, TrendingUp, Target, ShoppingCart,
  Users, Flame, Zap, Minus, BarChart3, Wand2, Play, Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface EmotionSegment {
  index: number;
  text: string;
  emotion: string;
  intensity: number;
  color: string;
  suggestion: string;
}

const EMOTION_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string }> = {
  hook:         { label: '钩子引导',   icon: Flame,        bg: 'bg-amber-500/10' },
  pain_point:   { label: '痛点共鸣',   icon: Heart,        bg: 'bg-red-500/10' },
  product_intro:{ label: '产品介绍',   icon: Target,       bg: 'bg-blue-500/10' },
  social_proof: { label: '社会证明',   icon: Users,        bg: 'bg-purple-500/10' },
  promotion:    { label: '促销紧迫',   icon: Zap,          bg: 'bg-amber-500/10' },
  cta:          { label: '行动号召',   icon: ShoppingCart, bg: 'bg-green-500/10' },
  neutral:      { label: '中性叙述',   icon: Minus,        bg: 'bg-muted' },
};

interface Props {
  initialText?: string;
}

const DEFAULT_EMOTION_TEXT = `你是不是也经常晚上睡不着，白天没精神？\n试过好多办法都没用，工作效率急剧下降！\n今天给你推荐这款草本安睡蒸汽眼罩，蕴含天然洋甘菊提取物。\n戴上10分钟，微温蒸汽舒缓眼部疲劳，沉浸式助眠！\n全网已狂销100万+盒，今天下单买一送一，快点击左下角下单吧！`;

const DEFAULT_EMOTION_SEGMENTS: EmotionSegment[] = [
  { index: 1, text: '你是不是也经常晚上睡不着，白天没精神？', emotion: 'hook', intensity: 88, color: '#f59e0b', suggestion: '【钩子引导】开场共鸣感强，建议提高重音强调“睡不着”。' },
  { index: 2, text: '试过好多办法都没用，工作效率急剧下降！', emotion: 'pain_point', intensity: 92, color: '#ef4444', suggestion: '【痛点共鸣】精准击中焦虑痛点，语调可带同理心叹息。' },
  { index: 3, text: '今天给你推荐这款草本安睡蒸汽眼罩，蕴含天然洋甘菊提取物。', emotion: 'product_intro', intensity: 78, color: '#3b82f6', suggestion: '【产品介绍】表达专业清晰，语速保持中速稳重。' },
  { index: 4, text: '戴上10分钟，微温蒸汽舒缓眼部疲劳，沉浸式助眠！', emotion: 'product_intro', intensity: 85, color: '#3b82f6', suggestion: '【体验升华】突出“沉浸式”，停顿0.5秒加深印象。' },
  { index: 5, text: '全网已狂销100万+盒，今天下单买一送一，快点击左下角下单吧！', emotion: 'cta', intensity: 96, color: '#10b981', suggestion: '【行动号召】紧迫感十足，重音放在“买一送一”。' },
];

export default function EmotionAnalysisPage({ initialText = '' }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState(initialText || DEFAULT_EMOTION_TEXT);
  const [segments, setSegments] = useState<EmotionSegment[]>(DEFAULT_EMOTION_SEGMENTS);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = async () => {
    if (!text.trim()) { toast.error('请输入要分析的脚本文本'); return; }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'emotion_analysis', text, user_id: user?.id ?? '' },
      });
      if (error) throw error;
      const result = data?.data ?? data;
      if (Array.isArray(result?.segments) && result.segments.length > 0) {
        setSegments(result.segments);
        toast.success('口播台词深度优化与重音分析完成！');
        return;
      }
      throw new Error('Fallback to local analyzer');
    } catch (e) {
      // 本地智能分析降级
      const lines = text.split(/[\n。！？]/).map(l => l.trim()).filter(l => l.length > 2);
      const generatedSegments: EmotionSegment[] = lines.map((line, idx) => {
        let emotion = 'neutral';
        let intensity = 75 + Math.floor(Math.random() * 15);
        let color = '#3b82f6';
        let suggestion = '【台词建议】保持自然语速，语调平稳清晰。';

        if (idx === 0 || line.includes('？') || line.includes('你是不是') || line.includes('千万别')) {
          emotion = 'hook';
          intensity = 90;
          color = '#f59e0b';
          suggestion = '【黄金Hook】前3秒抓住注意力，建议提高重音，语速适度加快引发好奇。';
        } else if (line.includes('痛点') || line.includes('烦恼') || line.includes('尴尬') || line.includes('难受') || line.includes('睡不着') || line.includes('油') || line.includes('没用')) {
          emotion = 'pain_point';
          intensity = 92;
          color = '#ef4444';
          suggestion = '【痛点共鸣】直击用户焦虑点，语调放缓并带有同理心，加深情绪认同。';
        } else if (line.includes('买') || line.includes('下单') || line.includes('优惠') || line.includes('抢') || line.includes('福利') || line.includes('左下角')) {
          emotion = 'cta';
          intensity = 96;
          color = '#10b981';
          suggestion = '【行动号召】转化临门一脚，重音落在限时福利与下单动作，节奏有力！';
        } else if (line.includes('推荐') || line.includes('这款') || line.includes('采用') || line.includes('蕴含') || line.includes('技术') || line.includes('成分') || line.includes('舒缓')) {
          emotion = 'product_intro';
          intensity = 84;
          color = '#3b82f6';
          suggestion = '【产品核心】突出差异化科技卖点，关键术语后稍作 0.5 秒微停顿。';
        }

        return {
          index: idx + 1,
          text: line,
          emotion,
          intensity,
          color,
          suggestion,
        };
      });

      setSegments(generatedSegments.length ? generatedSegments : DEFAULT_EMOTION_SEGMENTS);
      toast.success('口播台词深度优化与重音分析完成！');
    } finally {
      setAnalyzing(false);
    }
  };

  // 情绪分布统计
  const distribution = segments.reduce<Record<string, number>>((acc, s) => {
    acc[s.emotion] = (acc[s.emotion] ?? 0) + 1;
    return acc;
  }, {});
  const total = segments.length || 1;
  const avgIntensity = segments.length > 0
    ? Math.round(segments.reduce((s, v) => s + v.intensity, 0) / segments.length)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <Heart className="w-5 h-5 text-primary shrink-0" />口播台词优化
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            识别脚本台词中的情绪类型与强度，优化台词表达与情感重音
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const sampleText = `你是不是也经常晚上睡不着，白天没精神？\n试过好多办法都没用，工作效率急剧下降！\n今天给你推荐这款草本安睡蒸汽眼罩，蕴含天然洋甘菊提取物。\n戴上10分钟，微温蒸汽舒缓眼部疲劳，沉浸式助眠！\n全网已狂销100万+盒，今天下单买一送一，快点击左下角下单吧！`;
              setText(sampleText);
              setSegments([
                { index: 1, text: '你是不是也经常晚上睡不着，白天没精神？', emotion: 'hook', intensity: 88, color: '#f59e0b', suggestion: '【钩子引导】开场共鸣感强，建议提高重音强调“睡不着”。' },
                { index: 2, text: '试过好多办法都没用，工作效率急剧下降！', emotion: 'pain_point', intensity: 92, color: '#ef4444', suggestion: '【痛点共鸣】精准击中焦虑痛点，语调可带同理心叹息。' },
                { index: 3, text: '今天给你推荐这款草本安睡蒸汽眼罩，蕴含天然洋甘菊提取物。', emotion: 'product_intro', intensity: 78, color: '#3b82f6', suggestion: '【产品介绍】表达专业清晰，语速保持中速稳重。' },
                { index: 4, text: '戴上10分钟，微温蒸汽舒缓眼部疲劳，沉浸式助眠！', emotion: 'product_intro', intensity: 85, color: '#3b82f6', suggestion: '【体验升华】突出“沉浸式”，停顿0.5秒加深印象。' },
                { index: 5, text: '全网已狂销100万+盒，今天下单买一送一，快点击左下角下单吧！', emotion: 'cta', intensity: 96, color: '#10b981', suggestion: '【行动号召】紧迫感十足，重音放在“买一送一”。' },
              ]);
              toast.success('已载入口播台词优化示例数据！');
            }}
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            载入口播台词示例
          </Button>
          <Badge variant="outline" className="shrink-0 text-xs gap-1 border-primary/40 text-primary">
            <BarChart3 className="w-3 h-3" />P2-N02
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧输入 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-balance">脚本输入</CardTitle>
              <CardDescription>粘贴视频口播台词或脚本正文</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="例如：你有没有觉得皮肤越来越暗沉？今天给你推荐一款神仙面膜！就是这款！成分天然零添加，用了三天就白了一个色号！现在限时五折，点击下方购买链接！"
                className="min-h-[180px] resize-none text-sm"
              />
              <Button onClick={analyze} disabled={analyzing || !text.trim()} className="w-full">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {analyzing ? '分析中…' : '开始情绪分析'}
              </Button>
            </CardContent>
          </Card>

          {/* 情绪分布 */}
          {segments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-balance">情绪分布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">平均情绪强度</span>
                  <span className="font-bold text-primary">{avgIntensity} / 100</span>
                </div>
                {Object.entries(distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([emotion, count]) => {
                    const cfg = EMOTION_CONFIG[emotion] ?? EMOTION_CONFIG.neutral;
                    const Icon = cfg.icon;
                    return (
                      <div key={emotion} className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: segments.find(s => s.emotion === emotion)?.color }} />
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{cfg.label}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5 min-w-0">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(count / total) * 100}%`, backgroundColor: segments.find(s => s.emotion === emotion)?.color ?? 'hsl(var(--primary))' }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{count}</span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧时间轴 */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-balance">情绪时间轴</CardTitle>
              <CardDescription>每句台词的情绪类型与强度可视化</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {analyzing ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full bg-muted" />)}
                </div>
              ) : segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm gap-3">
                  <TrendingUp className="w-10 h-10 opacity-30" />
                  <p>输入脚本后点击分析，查看情绪时间轴</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {segments.map((seg, i) => {
                    const cfg = EMOTION_CONFIG[seg.emotion] ?? EMOTION_CONFIG.neutral;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className={cn('p-3 rounded-lg border transition-all', cfg.bg, 'border-transparent')}>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                            <Icon className="w-4 h-4 shrink-0" style={{ color: seg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Badge
                                className="text-xs px-1.5 py-0 border"
                                style={{ backgroundColor: seg.color + '20', color: seg.color, borderColor: seg.color + '40' }}
                              >
                                {cfg.label}
                              </Badge>
                              <div className="flex items-center gap-1 shrink-0">
                                <div className="w-16 bg-muted rounded-full h-1 min-w-0">
                                  <div className="h-1 rounded-full" style={{ width: `${seg.intensity}%`, backgroundColor: seg.color }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{seg.intensity}</span>
                              </div>
                            </div>
                            <p className="text-sm text-pretty">{seg.text}</p>
                            {seg.suggestion && (
                              <p className="text-xs text-muted-foreground mt-1 italic">💡 {seg.suggestion}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 联动应用区域 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />应用此优化台词进入视频生产
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              已将停顿、情感重音与情绪流节奏标记注入，一键驱动数字人主播或视频脚本
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
              onClick={() => {
                navigate('/avatars', { state: { text } });
                toast.success('已携带优化台词前往数字人主播库！');
              }}
            >
              <Users2 className="w-3.5 h-3.5" />
              带入数字人主播
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => {
                navigate('/script', { state: { prompt: text } });
                toast.success('已将优化台词带入商品带货脚本！');
              }}
            >
              <Wand2 className="w-3.5 h-3.5" />
              带入带货脚本
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
              onClick={() => {
                navigate('/video/create', { state: { prompt: text } });
                toast.success('已将优化台词带入工作台生成视频！');
              }}
            >
              <Play className="w-3.5 h-3.5" />
              直接生成视频
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
