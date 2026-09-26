import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BookOpen, Sparkles, Star, Search, Plus, Copy, Eye, Check,
  Zap, Code, Layers, FileText, Trash2, Wand2, Filter, Share2, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PromptCardItem {
  id: string;
  title: string;
  category: '短视频脚本' | '爆款文案' | '数字人口播' | '视觉画面' | '转化引导' | '自定义整合';
  tags: string[];
  summary: string;
  content: string;
  variables: string[];
  usage_count: number;
  quality_score: number;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '短视频脚本': { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  '爆款文案':   { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
  '数字人口播': { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-500/30' },
  '视觉画面':   { bg: 'bg-emerald-500/10',text: 'text-emerald-600 dark:text-emerald-400',border: 'border-emerald-500/30' },
  '转化引导':   { bg: 'bg-rose-500/10',   text: 'text-rose-600 dark:text-rose-400',   border: 'border-rose-500/30' },
  '自定义整合': { bg: 'bg-cyan-500/10',   text: 'text-cyan-600 dark:text-cyan-400',   border: 'border-cyan-500/30' },
};

const DEFAULT_PROMPTS: PromptCardItem[] = [
  {
    id: 'pr-001',
    title: '黄金三段式爆款带货脚本 Prompt',
    category: '短视频脚本',
    tags: ['带货', '三段式', '爆款'],
    summary: '千万级带货编剧创作公式，涵盖3秒Hook、产品优势及限时诱惑',
    content: `你是一位全网千万级爆款带货短视频编剧。请根据以下信息撰写黄金三段式脚本：\n1. 【黄金3秒Hook】：用令人意想不到的痛点或悬念直击【{目标人群}】，引起好奇；\n2. 【核心卖点呈现】：突出【{商品名称}】的【{核心优势}】，真实对比传统方案的尴尬；\n3. 【结尾引导下单】：给出限时福利【{促销活动}】，建立购买紧迫感。`,
    variables: ['{目标人群}', '{商品名称}', '{核心优势}', '{促销活动}'],
    usage_count: 1280,
    quality_score: 5,
    created_at: '2026-08-15T10:00:00Z',
  },
  {
    id: 'pr-002',
    title: '痛点共鸣型种草 Hook 提炼 Prompt',
    category: '爆款文案',
    tags: ['痛点', '开场白', '种草'],
    summary: '针对用户真实痛点打造5种高吸引力开场白，大幅提升前3秒完播率',
    content: `请为【{品类名称}】编写5个高吸引力的短视频开场白（Hook）。要求：\n1. 涵盖【{核心痛点}】，采用“场景代入 + 情绪反差”结构；\n2. 语言口语化、接地气，无硬广痕迹；\n3. 每一个Hook控制在 15-20 字以内，适合前3秒字幕高亮显示。`,
    variables: ['{品类名称}', '{核心痛点}'],
    usage_count: 940,
    quality_score: 5,
    created_at: '2026-08-16T14:20:00Z',
  },
  {
    id: 'pr-003',
    title: '数字人主播自然亲切口播 Prompt',
    category: '数字人口播',
    tags: ['数字人', '口播', '亲切自然'],
    summary: '适配数字人语音合成合成的60秒极简口播，带气口与重音提示',
    content: `你是一位顶级电商主播。请为【{商品名称}】生成一段60秒数字人专属口播文案：\n- 语气要求：亲切自然、充满信赖感；\n- 句式要求：短句为主，单句不超过15字；\n- 语音提示：在需要停顿处添加 [pause] 标记，关键卖点后添加 [emphasis] 强调符号。`,
    variables: ['{商品名称}'],
    usage_count: 810,
    quality_score: 4,
    created_at: '2026-08-17T09:15:00Z',
  },
  {
    id: 'pr-004',
    title: 'AI 视频画面分镜 Prompt',
    category: '视觉画面',
    tags: ['分镜', '画面提示词', 'AI绘图'],
    summary: '电影级短视频特写分镜 Prompt，支持8K渲染与产品细节特写',
    content: `请根据脚本段落生成AI视频画面的详细描述：\nClose-up shot of 【{商品特征}】, cinematic lighting, highly detailed texture, 8k resolution, vibrant studio lighting, photorealistic, 60fps smooth motion, shallow depth of field.`,
    variables: ['{商品特征}'],
    usage_count: 670,
    quality_score: 5,
    created_at: '2026-08-18T11:00:00Z',
  },
  {
    id: 'pr-005',
    title: '美妆护肤体验评测解说 Prompt',
    category: '爆款文案',
    tags: ['美妆', '评测', '真实体验'],
    summary: '以真实试用视角展示肤质改善前后对比，构建极高信赖感',
    content: `请写一段【{护肤品类}】的真实测评解说词：\n1. 【使用前】：描述【{皮肤问题}】带来的烦恼；\n2. 【使用中】：形容【{质地吸收}】的爽肤感受；\n3. 【使用后】：展示持续使用后的【{改善效果}】，引导领券体验。`,
    variables: ['{护肤品类}', '{皮肤问题}', '{质地吸收}', '{改善效果}'],
    usage_count: 530,
    quality_score: 4,
    created_at: '2026-08-18T16:30:00Z',
  },
  {
    id: 'pr-006',
    title: '私域复购专享关怀话术 Prompt',
    category: '转化引导',
    tags: ['私域', '老客复购', '关怀话术'],
    summary: '真诚老客关怀与专属优惠组合拳，提升复购转化与客户粘性',
    content: `请为【{品牌名称}】设计一段老客户专属复购关怀文案：\n尊敬的【{客户昵称}】，感谢您购买【{历史产品}】！为您准备了专属复购特权【{优惠福利}】，点击链接即可一键兑换，祝您生活愉快！`,
    variables: ['{品牌名称}', '{客户昵称}', '{历史产品}', '{优惠福利}'],
    usage_count: 420,
    quality_score: 4,
    created_at: '2026-08-19T08:45:00Z',
  },
  {
    id: 'pr-007',
    title: '美食探店食欲暴击 Prompt',
    category: '爆款文案',
    tags: ['美食', '食欲', '吃播解说'],
    summary: '运用感官动词描写拉丝、爆浆与酥脆，令观众秒看秒流口水',
    content: `请为【{美食名称}】撰写一段令人垂涎三尺的短视频解说：\n重点描写【{口感描述}】（如咬下去咔嚓一声、爆汁拉丝），配合【{酱料特写}】，结尾直接引导“点击左下角同款美食套餐”。`,
    variables: ['{美食名称}', '{口感描述}', '{酱料特写}'],
    usage_count: 610,
    quality_score: 5,
    created_at: '2026-08-19T13:10:00Z',
  },
  {
    id: 'pr-008',
    title: '数码家电硬核痛点对比 Prompt',
    category: '短视频脚本',
    tags: ['数码家电', '硬核对比', '测评'],
    summary: '传统尴尬痛点 vs 现代科技解决方案，直观展现性价比优势',
    content: `请编写【{数码产品}】的硬核测评对比脚本：\n1. 【痛点吐槽】：传统【{旧产品}】的【{痛点缺点}】；\n2. 【黑科技亮相】：介绍【{数码产品}】的【{核心突破}】；\n3. 【实测验证】：用简单直观的测试数据证明性能。`,
    variables: ['{数码产品}', '{旧产品}', '{痛点缺点}', '{核心突破}'],
    usage_count: 750,
    quality_score: 5,
    created_at: '2026-08-19T15:20:00Z',
  },
];

export default function KnowledgePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptCardItem[]>(DEFAULT_PROMPTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [activePrompt, setActivePrompt] = useState<PromptCardItem | null>(null);

  // Prompt 整合相关状态
  const [rawInputText, setRawInputText] = useState<string>('');
  const [integrateCategory, setIntegrateCategory] = useState<PromptCardItem['category']>('短视频脚本');
  const [isIntegrating, setIsIntegrating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 从 Supabase 加载自定义 Prompt
  useEffect(() => {
    async function loadUserPrompts() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('prompt_knowledge')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data && data.length > 0 && !error) {
          const userPrompts: PromptCardItem[] = data.map((d: any) => ({
            id: d.id,
            title: d.title || '自定义整合 Prompt',
            category: d.category || '自定义整合',
            tags: d.tags || ['自定义'],
            summary: d.summary || d.content.slice(0, 40) + '...',
            content: d.content,
            variables: d.variables || [],
            usage_count: d.usage_count || 1,
            quality_score: d.quality_score || 5,
            created_at: d.created_at,
          }));
          setPrompts([...userPrompts, ...DEFAULT_PROMPTS]);
        }
      } catch (err) {
        console.log('Using default prompts:', err);
      }
    }
    loadUserPrompts();
  }, [user]);

  // 过滤后的 Prompt 列表
  const filteredPrompts = useMemo(() => {
    return prompts.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch = !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [prompts, selectedCategory, searchQuery]);

  // 快捷复制
  const handleCopy = (prompt: PromptCardItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    toast.success('Prompt 内容已复制到剪贴板！');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // AI 智能整合提示词
  const handleIntegratePrompt = async () => {
    if (!rawInputText.trim()) {
      toast.error('请先输入需要整合的提示词或需求片段');
      return;
    }
    setIsIntegrating(true);
    await new Promise(r => setTimeout(r, 1000));

    // 简单自动抓取动态变量 {变量}
    const varMatches = rawInputText.match(/\{[^}]+\}/g) || [];
    const extractedVars = Array.from(new Set(varMatches));
    if (extractedVars.length === 0) {
      extractedVars.push('{核心需求}', '{商品名称}');
    }

    const lines = rawInputText.trim().split('\n').filter(Boolean);
    const generatedTitle = lines[0]?.slice(0, 20) ? `整合Prompt：${lines[0].slice(0, 16)}` : 'AI 智能整合 Prompt';

    const newPrompt: PromptCardItem = {
      id: `custom-${Date.now()}`,
      title: generatedTitle,
      category: integrateCategory,
      tags: ['智能整合', integrateCategory],
      summary: `根据用户输入的 ${rawInputText.length} 字片段AI整合提炼，结构清晰且易于扩展`,
      content: `你是一位专业AI创作助手。请根据以下要求执行：\n\n${rawInputText}\n\n关键变量说明：${extractedVars.join(', ')}`,
      variables: extractedVars,
      usage_count: 1,
      quality_score: 5,
      created_at: new Date().toISOString(),
    };

    setPrompts(prev => [newPrompt, ...prev]);
    setRawInputText('');
    setIsIntegrating(false);
    toast.success('Prompt 已成功整合并存入知识库！');

    // 如果已登录，回写数据库
    if (user) {
      await supabase.from('prompt_knowledge').insert({
        user_id: user.id,
        title: newPrompt.title,
        category: newPrompt.category,
        tags: newPrompt.tags,
        summary: newPrompt.summary,
        content: newPrompt.content,
        variables: newPrompt.variables,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 顶部 Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-border/50">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Prompt 知识库
                <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 border-teal-500/30">
                  {prompts.length} 条已整理 Prompt
                </Badge>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                智能整合与沉淀爆款Prompt，支持自定义输入提炼、一键聚合优化与快捷复用
              </p>
            </div>
          </div>
        </div>

        {/* 顶部统计小标 */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border bg-card/60 px-3.5 py-2 text-center shadow-2xs">
            <p className="text-xs text-muted-foreground">总复用次数</p>
            <p className="text-base font-bold text-foreground mt-0.5">5,970+</p>
          </div>
          <div className="rounded-xl border bg-card/60 px-3.5 py-2 text-center shadow-2xs">
            <p className="text-xs text-muted-foreground">优质好评率</p>
            <p className="text-base font-bold text-teal-600 dark:text-teal-400 mt-0.5">99.4%</p>
          </div>
        </div>
      </div>

      {/* Prompt 智能整合 Panel */}
      <Card className="border-teal-500/20 bg-linear-to-r from-teal-500/5 via-background to-blue-500/5 overflow-hidden shadow-xs">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-foreground">AI 智能 Prompt 整合面板</h2>
              <span className="text-xs text-muted-foreground">粘贴散乱需求或提示词片段，一键规范化整合存库</span>
            </div>
            <div className="w-36">
              <Select value={integrateCategory} onValueChange={(v: any) => setIntegrateCategory(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="短视频脚本">短视频脚本</SelectItem>
                  <SelectItem value="爆款文案">爆款文案</SelectItem>
                  <SelectItem value="数字人口播">数字人口播</SelectItem>
                  <SelectItem value="视觉画面">视觉画面</SelectItem>
                  <SelectItem value="转化引导">转化引导</SelectItem>
                  <SelectItem value="自定义整合">自定义整合</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            placeholder="在此时粘贴或输入您的提示词片段，例如：'想做一款护肤面膜，突出补水提亮、敏感肌可用，结尾要有买一送一活动...'"
            value={rawInputText}
            onChange={e => setRawInputText(e.target.value)}
            className="min-h-[70px] text-xs bg-background/80 resize-none border-border/60 focus-visible:ring-teal-500/40"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>提示：支持包含 {"{商品名}"} 等变量标记，系统会自动提取变量说明</span>
            </div>
            <Button
              size="sm"
              onClick={handleIntegratePrompt}
              disabled={isIntegrating || !rawInputText.trim()}
              className="h-8 px-4 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs gap-1.5"
            >
              {isIntegrating ? (
                <>
                  <Wand2 className="w-3.5 h-3.5 animate-spin" />
                  AI 正在整合中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  一键 AI 整合入库
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 搜索与分类 Tab */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* 分类 Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto w-full sm:w-auto">
          {[
            { key: 'all', label: '全部' },
            { key: '短视频脚本', label: '短视频脚本' },
            { key: '爆款文案', label: '爆款文案' },
            { key: '数字人口播', label: '数字人口播' },
            { key: '视觉画面', label: '视觉画面' },
            { key: '转化引导', label: '转化引导' },
            { key: '自定义整合', label: '自定义整合' },
          ].map(cat => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                'h-8 px-3 text-xs font-medium rounded-lg transition-all shrink-0',
                selectedCategory === cat.key
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索 Prompt 标题 / 标签..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* 4卡片一行 Grid 展示区域 (4-column responsive grid) */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/20">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">暂无符合条件的 Prompt</p>
          <p className="text-xs text-muted-foreground mt-1">请尝试更换搜索关键词或使用上方的 AI 整合面板添加新 Prompt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredPrompts.map(item => {
            const style = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['自定义整合'];
            return (
              <div
                key={item.id}
                onClick={() => {
                  setActivePrompt(item);
                  setDetailModalOpen(true);
                }}
                className="group relative rounded-2xl border border-border/70 bg-card p-4 space-y-3 flex flex-col justify-between transition-all duration-200 hover:border-teal-500/50 hover:shadow-md cursor-pointer"
              >
                <div className="space-y-2.5">
                  {/* Badge 与 Rating */}
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md border', style.bg, style.text, style.border)}>
                      {item.category}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <span className="font-semibold text-[11px]">{item.quality_score}.0</span>
                    </div>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {item.title}
                  </h3>

                  {/* 描述简述 */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Prompt Preview Block */}
                  <div className="rounded-lg bg-muted/60 p-2.5 border border-border/40 font-mono text-[11px] text-muted-foreground/90 line-clamp-3 leading-relaxed">
                    {item.content}
                  </div>

                  {/* 变量标签列表 */}
                  {item.variables && item.variables.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {item.variables.slice(0, 3).map((v, i) => (
                        <span key={i} className="text-[10px] font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                          {v}
                        </span>
                      ))}
                      {item.variables.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{item.variables.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 底部按钮栏 */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-[11px]">{item.usage_count} 次使用</span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleCopy(item, e)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-teal-600 gap-1"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          复制
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActivePrompt(item);
                        setDetailModalOpen(true);
                      }}
                      className="h-7 px-2 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 gap-0.5"
                    >
                      <Eye className="w-3 h-3" />
                      查看
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prompt 详情与完整内容查看 Modal (Dialog) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              {activePrompt && (
                <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-md border', CATEGORY_COLORS[activePrompt.category]?.bg, CATEGORY_COLORS[activePrompt.category]?.text, CATEGORY_COLORS[activePrompt.category]?.border)}>
                  {activePrompt.category}
                </span>
              )}
              <DialogTitle className="text-lg font-bold">{activePrompt?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {activePrompt?.summary}
            </DialogDescription>
          </DialogHeader>

          {activePrompt && (
            <div className="space-y-4 py-2">
              {/* 动态变量说明 */}
              {activePrompt.variables && activePrompt.variables.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-teal-500" /> 包含了以下动态模版变量：
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {activePrompt.variables.map((v, i) => (
                      <span key={i} className="text-xs font-mono font-semibold bg-teal-500/15 text-teal-600 dark:text-teal-300 px-2 py-0.5 rounded-md border border-teal-500/20">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 完整 Prompt 内容区域 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-teal-500" /> 完整 Prompt 内容：
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(activePrompt)}
                    className="h-7 text-xs gap-1 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                  >
                    <Copy className="w-3 h-3" />
                    一键复制完整 Prompt
                  </Button>
                </div>

                <div className="rounded-xl bg-muted/80 p-4 border border-border/60 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto">
                  {activePrompt.content}
                </div>
              </div>

              {/* 标签与使用说明 */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <div className="flex items-center gap-1">
                  <span>标签：</span>
                  {activePrompt.tags.map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px] font-normal">
                      #{t}
                    </Badge>
                  ))}
                </div>
                <span>已被复用 {activePrompt.usage_count} 次</span>
              </div>

              {/* 快捷创作联动按钮 */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  onClick={() => {
                    setDetailModalOpen(false);
                    navigate('/script', { state: { prompt: activePrompt.content, category: activePrompt.category } });
                    toast.success('已将当前 Prompt 带入商品带货脚本创作！');
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  带入带货脚本创作
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    setDetailModalOpen(false);
                    navigate('/video/create', { state: { prompt: activePrompt.content } });
                    toast.success('已将当前 Prompt 带入 AI 视频工作台！');
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  带入工作台生成视频
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
