/**
 * 自定义模型配置弹窗（工作台 视频生成 / 图片生成 共用）
 * 填写兼容 OpenAI Chat Completions API 的自定义服务端点、模型 ID 与 API 密钥，
 * 通过连接测试验证后方可保存启用，保存后即可在模型列表中真实调用该模型
 * 注意：本弹窗使用 createPortal 挂载到 document.body 最末端的 fixed 顶层模态层
 * （z-index 2147483000、零 CSS 动画），彻底规避页面堆叠上下文遮挡与后台窗口动画冻结
 * 导致的"弹窗不显示"问题；居中显示并带全屏遮罩，不再与页面内容重叠
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Loader2, PlugZap, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  OPENAI_CHAT_FORMAT, chatCompletionsUrl, isValidEndpoint,
  loadCustomModels, saveCustomModel, removeCustomModel, testCustomModelConnection,
} from '@/lib/customModel';
import type { CustomModelConfig, CustomModelKind } from '@/lib/customModel';

interface Props {
  open: boolean;
  kind: CustomModelKind;
  /** 传入已存在的自定义模型 key 进入编辑模式 */
  editKey?: string | null;
  onClose: () => void;
  onSaved: (cfg: CustomModelConfig) => void;
}

const KIND_LABEL: Record<CustomModelKind, string> = { video: '视频生成', image: '图片生成' };

/** 弹窗统一深色输入样式（覆盖 shadcn 浅色默认值） */
const fieldCls =
  'h-10 w-full rounded-xl border border-white/10 bg-[#131120] px-3.5 text-sm text-white placeholder:text-white/30 transition-colors focus-visible:border-violet-400/60 focus-visible:ring-2 focus-visible:ring-violet-500/25';

export default function CustomModelDialog({ open, kind, editKey, onClose, onSaved }: Props) {
  const [apiFormat, setApiFormat] = useState(OPENAI_CHAT_FORMAT);
  const [endpoint, setEndpoint] = useState('');
  const [modelId, setModelId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'passed'>('idle');
  const [submitting, setSubmitting] = useState(false);

  // 打开/切换时重置或回填已有配置
  useEffect(() => {
    if (!open) return;
    setTestState('idle');
    const existing = editKey ? loadCustomModels(kind).find(m => m.key === editKey) : null;
    if (existing) {
      setApiFormat(existing.apiFormat || OPENAI_CHAT_FORMAT);
      setEndpoint(existing.endpoint);
      setModelId(existing.modelId);
      setDisplayName(existing.displayName);
      setApiKey(existing.apiKey);
    } else {
      setApiFormat(OPENAI_CHAT_FORMAT);
      setEndpoint(''); setModelId(''); setDisplayName(''); setApiKey('');
    }
  }, [open, kind, editKey]);

  // Esc 关闭 + 打开期间锁定页面滚动
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const endpointValid = isValidEndpoint(endpoint);
  const formValid = endpointValid && modelId.trim().length > 0 && apiKey.trim().length > 0;
  const submitHint = !formValid
    ? '请先完整填写带 * 的必填项，且请求地址需为 http(s) 完整 URL、不以斜杠结尾'
    : testState !== 'passed'
      ? '请先点击「连接测试」，校验通过后方可保存启用该模型'
      : '';

  const buildCfg = (): CustomModelConfig => ({
    key: editKey || `custom-${Date.now()}`,
    displayName: displayName.trim() || modelId.trim(),
    modelId: modelId.trim(),
    endpoint: endpoint.trim(),
    apiKey: apiKey.trim(),
    apiFormat,
    createdAt: new Date().toISOString(),
  });

  const handleTest = async () => {
    if (!formValid) { toast.error('请先填写完整的端点地址 / 模型 ID / API 密钥'); return; }
    setTestState('testing');
    try {
      const reply = await testCustomModelConnection(buildCfg());
      setTestState('passed');
      toast.success(`连接测试通过！模型响应：${reply.slice(0, 40)}`);
    } catch (e: any) {
      setTestState('idle');
      toast.error(`连接测试失败：${e?.message || '无法访问该端点（请检查网络 / CORS / 密钥）'}`, { duration: 5000 });
    }
  };

  const handleSave = () => {
    if (!formValid || testState !== 'passed') return;
    setSubmitting(true);
    const cfg = buildCfg();
    saveCustomModel(kind, cfg);
    setSubmitting(false);
    onSaved(cfg);
  };

  const handleDelete = () => {
    if (!editKey) return;
    removeCustomModel(kind, editKey);
    toast.info('已删除该自定义模型');
    onClose();
  };

  if (!open) return null;

  // 顶层 Portal 模态：全屏遮罩 + 居中面板，零动画（渲染即最终态，不受窗口节流影响）
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="自定义模型"
      className="dark fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] w-[500px] max-w-full flex-col overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-b from-[#1d1b2f] via-[#171525] to-[#121019] text-white shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(139,92,246,0.16)]"
      >
        {/* 顶部渐变饰条 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent" />
        {/* 背景光晕装饰 */}
        <div className="pointer-events-none absolute -top-24 right-[-80px] h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-[-90px] h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />

        {/* 头部 */}
        <div className="relative flex items-start justify-between gap-3 px-6 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_4px_16px_rgba(168,85,247,0.4)]">
              <PlugZap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-none tracking-tight">自定义模型</h2>
                <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium leading-none text-violet-300">
                  {KIND_LABEL[kind]}专用
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                接入兼容 OpenAI API 的第三方服务端点，保存并选中后即可在「{KIND_LABEL[kind]}」中真实调用该模型生成。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 表单主体（可滚动） */}
        <div className="relative flex-1 space-y-4 overflow-y-auto border-t border-white/[0.06] px-6 py-5">
          {/* API 格式 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/75"><span className="text-fuchsia-400">*</span> API 格式</Label>
            <Select value={apiFormat} onValueChange={setApiFormat}>
              <SelectTrigger className={cn(fieldCls, 'text-white')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[2147483001] dark border-white/10 bg-[#1d1b2f]">
                <SelectItem value={OPENAI_CHAT_FORMAT}>{OPENAI_CHAT_FORMAT}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 自定义请求地址 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
              <span className="text-fuchsia-400">*</span> 自定义请求地址
              <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-normal leading-none text-white/55">完整 URL</span>
            </Label>
            <Input
              value={endpoint}
              onChange={(e) => { setEndpoint(e.target.value); setTestState('idle'); }}
              placeholder="请填写兼容 OpenAI API 的服务端点地址，不要以斜杠结尾"
              className={cn(fieldCls, endpoint && !endpointValid && 'border-red-400/60 focus-visible:border-red-400/60 focus-visible:ring-red-500/25')}
            />
            <p className="text-[11px] leading-relaxed text-white/40">
              <code className="rounded bg-white/10 px-1 py-0.5 text-white/60">/chat/completions</code> 将会被补充到你填写的地址末尾。
              例如 <code className="rounded bg-white/10 px-1 py-0.5 text-white/60">https://api.openai.com/v1</code>
              {endpoint && endpointValid && (
                <span className="mt-0.5 block truncate font-mono text-emerald-400">→ {chatCompletionsUrl(endpoint)}</span>
              )}
            </p>
            {endpoint && !endpointValid && (
              <p className="text-[11px] text-red-400">地址须为 http(s) 开头的完整 URL，且不能以斜杠「/」结尾</p>
            )}
          </div>

          {/* 模型 ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/75"><span className="text-fuchsia-400">*</span> 模型 ID</Label>
            <Input
              value={modelId}
              onChange={(e) => { setModelId(e.target.value); setTestState('idle'); }}
              placeholder="输入模型 ID"
              className={fieldCls}
            />
          </div>

          {/* 模型展示名称 */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between text-xs font-semibold text-white/75">
              <span>模型展示名称</span>
              <span className="text-[10px] font-normal text-white/35">{displayName.length}/64</span>
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 64))}
              placeholder="请输入模型展示名称"
              className={fieldCls}
            />
            <p className="text-[11px] text-white/40">在模型列表中展示的名称，未设置时默认显示 Model ID。</p>
          </div>

          {/* API 密钥 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/75"><span className="text-fuchsia-400">*</span> API 密钥</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestState('idle'); }}
              placeholder="请输入 API Key"
              autoComplete="off"
              className={fieldCls}
            />
          </div>

          {/* 校验/测试提示 */}
          {submitHint && (
            <div className="rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-300/90">
              {submitHint}
            </div>
          )}
          {testState === 'passed' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5 text-[11px] text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> 端点连通性与密钥校验已通过，可保存启用
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="relative flex items-center justify-between gap-2 border-t border-white/[0.06] bg-white/[0.02] px-6 py-4">
          <div>
            {editKey && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />删除模型
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!formValid || testState === 'testing'}
              onClick={handleTest}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 text-xs font-semibold text-violet-300 transition-all hover:border-violet-400/60 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testState === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
              {testState === 'testing' ? '测试中…' : testState === 'passed' ? '重新测试' : '连接测试'}
            </button>
            <button
              type="button"
              disabled={!formValid || testState !== 'passed' || submitting}
              onClick={handleSave}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-xs font-semibold text-white shadow-[0_4px_18px_rgba(168,85,247,0.35)] transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              保存并启用
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
