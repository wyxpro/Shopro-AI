import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Video, Download, Trash2, Play, Search, Plus,
  Clock, CheckCircle2, AlertCircle, FileVideo, BarChart3, RefreshCw,
  Sparkles, ImagePlus, FlipHorizontal, Trophy, TrendingUp,
  Zap, Target, Activity, Scissors, Upload, ImageIcon, Edit2,
  CheckSquare, Square, Check, Share2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { extractVideoMeta } from '@/lib/videoFrame';
import type { VideoProject, Material } from '@/types/types';
import { cn } from '@/lib/utils';
import CoverCandidates from '@/components/CoverCandidates';

// ── 状态配置 ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:      { label: '草稿',   Icon: FileVideo,     pill: 'bg-muted text-muted-foreground' },
  processing: { label: '生成中', Icon: Clock,         pill: 'bg-warning/20 text-warning' },
  completed:  { label: '已完成', Icon: CheckCircle2,  pill: 'bg-success/20 text-success' },
  failed:     { label: '失败',   Icon: AlertCircle,   pill: 'bg-destructive/20 text-destructive' },
};

const STATUS_TABS = [
  { value: 'all',        label: '全部' },
  { value: 'completed',  label: '已完成' },
  { value: 'processing', label: '生成中' },
  { value: 'draft',      label: '草稿' },
  { value: 'failed',     label: '失败' },
];

// 判断封面是否为真实图片（AI 视频首帧截图或用户上传封面），
// person 占位图与 unsplash 网图占位一律视为无效，由原始视频首帧提取接替
function isRealThumbnail(thumb: string | null | undefined): thumb is string {
  if (!thumb) return false;
  if (thumb.startsWith('data:image')) return true;
  return thumb.startsWith('http') && !thumb.endsWith('.mp4') && !thumb.includes('unsplash.com') && !thumb.includes('images.unsplash');
}

function getValidWorkThumbnail(project: VideoProject): string | null {
  return isRealThumbnail(project.thumbnail_url) ? project.thumbnail_url : null;
}

// ── 作品卡片 ─────────────────────────────────────────────────────────────
function WorkCard({
  project, onPreview, onDelete, onAnalyze, onRetry, onReload,
  selectMode, isSelected, onToggleSelect,
}: {
  project: VideoProject;
  onPreview: (p: VideoProject) => void;
  onDelete:  (id: string) => void;
  onAnalyze: (id: string) => void;
  onRetry:   (p: VideoProject) => void;
  onReload:  () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[project.status];
  const StatusIcon = cfg.Icon;
  const date = new Date(project.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const canPlay = project.status === 'completed';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updatingCover, setUpdatingCover] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(project.title);

  useEffect(() => {
    setTitleVal(project.title);
  }, [project.title]);

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (!titleVal.trim() || titleVal.trim() === project.title) {
      setTitleVal(project.title);
      return;
    }
    try {
      const { error } = await supabase
        .from('video_projects')
        .update({ title: titleVal.trim() })
        .eq('id', project.id);
      if (error) throw error;
      toast.success('标题修改成功');
      onReload();
    } catch (err: any) {
      toast.error('修改标题失败: ' + (err.message || err));
      setTitleVal(project.title);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdatingCover(true);
    const toastId = toast.loading('正在上传新封面...');
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `covers/${project.id}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('materials').upload(path, file);
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('materials').getPublicUrl(data.path);
      
      const { error: dbError } = await supabase
        .from('video_projects')
        .update({ thumbnail_url: urlData.publicUrl })
        .eq('id', project.id);
        
      if (dbError) throw dbError;
      
      toast.success('封面更新成功', { id: toastId });
      onReload();
    } catch (err: any) {
      toast.error('修改封面失败: ' + (err.message || err), { id: toastId });
    } finally {
      setUpdatingCover(false);
    }
  };

  const [aspect, setAspect] = useState(() => {
    if (project.video_style === '服装') return 'aspect-[9/16]';
    return 'aspect-video';
  });

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden flex flex-col bg-[hsl(var(--card))] border transition-all hover:shadow-lg group relative",
        selectMode ? "cursor-pointer hover:border-primary/60" : "hover:-translate-y-1 shadow-sm",
        isSelected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border/60"
      )}
      onClick={() => {
        if (selectMode) {
          onToggleSelect?.(project.id);
        }
      }}
    >
      {/* 多选勾选图标 */}
      {selectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(project.id);
          }}
          className={cn(
            "absolute top-2.5 right-2.5 z-30 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur",
            isSelected ? "bg-primary text-primary-foreground scale-105" : "bg-black/60 border border-white/40 text-transparent hover:border-white/80"
          )}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      )}

      {/* ── 预览区（点击封面弹窗预览） ── */}
      <div
        className={cn(
          'relative bg-muted overflow-hidden cursor-pointer max-h-[220px]',
          aspect
        )}
        onClick={(e) => {
          if (selectMode) {
            e.stopPropagation();
            onToggleSelect?.(project.id);
          } else if (canPlay) {
            onPreview(project);
          }
        }}
      >
        {getValidWorkThumbnail(project) ? (
          <img
            src={getValidWorkThumbnail(project) ?? undefined}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={(e) => {
              const img = e.currentTarget;
              const ratio = img.naturalWidth / img.naturalHeight;
              if (ratio < 0.65) setAspect('aspect-[9/16]');
              else if (ratio < 0.8) setAspect('aspect-[3/4]');
              else if (ratio < 1.2) setAspect('aspect-square');
              else setAspect('aspect-video');
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
            }}
          />
        ) : project.video_url ? (
          <video
            src={`${project.video_url}#t=0.01`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            preload="metadata"
            muted
            playsInline
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted">
            <Video className="w-10 h-10 text-muted-foreground/40" />
            {project.status === 'processing' && (
              <div className="absolute inset-x-6 bottom-5 space-y-1">
                <Progress value={project.progress} className="h-1" />
                <p className="text-xs text-center text-muted-foreground">{project.progress}%</p>
              </div>
            )}
          </div>
        )}

        {/* 播放按钮悬浮层 */}
        {canPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
            </div>
          </div>
        )}

        {/* 修改封面按钮 */}
        {(project.status === 'completed' || project.status === 'draft') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={updatingCover}
            className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-lg px-2 py-1 text-[11px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/10"
          >
            {updatingCover ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            修改封面
          </button>
        )}

        {/* 失败状态重试覆盖层 */}
        {project.status === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-white/10 hover:bg-white/20 text-white border border-white/30"
              onClick={e => { e.stopPropagation(); onRetry(project); }}
            >
              <RefreshCw className="w-3 h-3" />重新生成
            </Button>
          </div>
        )}

        {/* 状态角标 */}
        <div className="absolute top-2.5 left-2.5">
          <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full', cfg.pill)}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* 隐藏的 file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />

      {/* ── 信息区 ── */}
      <div className="px-4 pt-3 pb-1 flex-1 min-w-0">
        {isEditingTitle ? (
          <Input
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setIsEditingTitle(false);
                setTitleVal(project.title);
              }
            }}
            autoFocus
            className="h-7 text-xs py-0.5 px-2 font-medium bg-zinc-800/80 border-zinc-700 text-zinc-100 focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
        ) : (
          <div className="flex items-center gap-1.5 group/title">
            <p className="text-sm font-semibold truncate text-balance flex-1" title={project.title}>
              {project.title}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted opacity-0 group-hover/title:opacity-100 transition-all shrink-0"
              title="编辑标题"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {project.video_style && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              {project.video_style}
            </span>
          )}
          {project.duration > 0 && (
            <span className="text-xs text-muted-foreground">{project.duration}s</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{date}</span>
        </div>
      </div>

      {/* ── 操作按钮区（4列：剪辑 / 导出 / 分析 / 下载+删除） ── */}
      <div className="grid grid-cols-4 border-t border-border/60 mt-3 text-xs">
        {/* 导入剪辑 */}
        <button
          onClick={() => { if (canPlay) navigate(`/video/edit?importId=${project.id}`); }}
          disabled={!canPlay}
          className={cn(
            'flex items-center justify-center gap-1 py-2.5 font-medium transition-colors',
            canPlay
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'text-muted-foreground/30 cursor-not-allowed',
          )}
          title="在专业编辑器中精修"
        >
          <Scissors className="w-3.5 h-3.5" />剪辑
        </button>

        {/* 跨平台导出 */}
        <button
          onClick={() => { if (canPlay) navigate(`/export-formats?projectId=${project.id}`); }}
          disabled={!canPlay}
          className={cn(
            'flex items-center justify-center gap-1 py-2.5 font-medium transition-colors border-l border-border/60',
            canPlay
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'text-muted-foreground/30 cursor-not-allowed',
          )}
          title="转码导出多规格格式并一键分发"
        >
          <Share2 className="w-3.5 h-3.5" />导出
        </button>

        {/* 分析 */}
        <button
          onClick={() => navigate(`/data-feedback?projectId=${project.id}`)}
          className="flex items-center justify-center gap-1 py-2.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border/60"
          title="查看投放转化与ROAS"
        >
          <BarChart3 className="w-3.5 h-3.5" />分析
        </button>

        {/* 下载 + 删除（横向排列） */}
        <div className="flex border-l border-border/60">
          {/* 下载 */}
          {project.status === 'failed' ? (
            <button
              onClick={() => onRetry(project)}
              className="flex-1 flex items-center justify-center py-2.5 font-medium text-destructive hover:bg-destructive/10 transition-colors"
              title="重试生成"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          ) : canPlay ? (
            <a
              href={project.video_url || '/Video/CreatOK_2.mp4'}
              download
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center py-2.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="下载视频"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="flex-1 flex items-center justify-center py-2.5 font-medium text-muted-foreground/30 cursor-not-allowed">
              <Download className="w-3.5 h-3.5" />
            </span>
          )}
          {/* 删除 */}
          <button
            onClick={() => onDelete(project.id)}
            className="flex items-center justify-center px-2 py-2.5 font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors border-l border-border/60"
            title="删除作品"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CR-08: A/B测试变体管理面板 ─────────────────────────────────────────────
type ABStatus = 'running' | 'paused' | 'completed';
interface ABVariant {
  id: string;
  label: string;
  title: string;
  coverStyle: string;
  ctaText: string;
  hookStyle: string;
  impressions: number;
  clicks: number;
  conversions: number;
  status: ABStatus;
}

function generateABVariants(project: VideoProject): ABVariant[] {
  return [
    {
      id: 'A', label: '版本 A', title: project.title,
      coverStyle: '产品主图 + 红底文字',
      ctaText: '立即购买享折扣',
      hookStyle: '直接展示产品',
      impressions: 5820, clicks: 312, conversions: 47,
      status: 'running',
    },
    {
      id: 'B', label: '版本 B', title: project.title + ' · 真实体验版',
      coverStyle: '真人使用场景 + 白底文字',
      ctaText: '点击查看使用效果',
      hookStyle: '用户痛点引导',
      impressions: 5820, clicks: 441, conversions: 68,
      status: 'running',
    },
    {
      id: 'C', label: '版本 C', title: project.title + ' · 悬念开场版',
      coverStyle: '悬念封面 + 动态字幕',
      ctaText: '揭开秘密→立即抢购',
      hookStyle: '悬念式3秒钩子',
      impressions: 2100, clicks: 189, conversions: 31,
      status: 'running',
    },
  ];
}

// 迷你趋势 sparkline
function MiniSparkline({ color }: { color: string }) {
  const pts = [30, 45, 38, 60, 55, 72, 68, 85].map((v, i) => `${i * 14},${100 - v}`).join(' ');
  return (
    <svg viewBox="0 0 98 100" className="w-16 h-6" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── 工具函数（素材库） ───────────────────────────────────────────────────────
function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch { return iso; }
}

// ── 素材卡片 ─────────────────────────────────────────────────────────────
function MaterialCard({
  material, onPreview, onDownload, onDelete,
  selectMode, isSelected, onToggleSelect,
}: {
  material: Material;
  onPreview:  (m: Material) => void;
  onDownload: (m: Material) => void;
  onDelete:   (id: string) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const isImage = material.type === 'image';
  const [aspect, setAspect] = useState('aspect-[4/3]');

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden flex flex-col bg-card border transition-all shadow-sm hover:shadow-md relative",
        selectMode ? "cursor-pointer hover:border-primary/60" : "",
        isSelected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border/60"
      )}
      onClick={() => {
        if (selectMode) {
          onToggleSelect?.(material.id);
        }
      }}
    >
      {/* 多选勾选图标 */}
      {selectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(material.id);
          }}
          className={cn(
            "absolute top-2.5 right-2.5 z-30 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur",
            isSelected ? "bg-primary text-primary-foreground scale-105" : "bg-black/60 border border-white/40 text-transparent hover:border-white/80"
          )}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      )}

      <div
        className={cn("relative cursor-pointer group bg-muted overflow-hidden max-h-[220px]", aspect)}
        onClick={(e) => {
          if (selectMode) {
            e.stopPropagation();
            onToggleSelect?.(material.id);
          } else {
            onPreview(material);
          }
        }}
      >
        {isImage ? (
          <img src={material.url} alt={material.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            onLoad={(e) => {
              const img = e.currentTarget;
              const ratio = img.naturalWidth / img.naturalHeight;
              if (ratio < 0.65) setAspect('aspect-[9/16]');
              else if (ratio < 0.8) setAspect('aspect-[3/4]');
              else if (ratio < 1.2) setAspect('aspect-square');
              else setAspect('aspect-video');
            }}
          />
        ) : (
          <video
            src={`${material.url}#t=0.01`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget;
              const ratio = vid.videoWidth / vid.videoHeight;
              if (ratio < 0.65) setAspect('aspect-[9/16]');
              else if (ratio < 0.8) setAspect('aspect-[3/4]');
              else if (ratio < 1.2) setAspect('aspect-square');
              else setAspect('aspect-video');
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      <div className="px-3.5 pt-3 pb-2">
        <p className="text-sm font-semibold truncate text-balance" title={material.name}>{material.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded',
            isImage ? 'bg-info/15 text-info' : 'bg-primary/15 text-primary')}>
            {isImage ? '图片' : '视频'}
          </span>
          <span className="text-xs text-muted-foreground">{formatSize(material.size)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{formatDateShort(material.created_at)}</p>
      </div>
      <div className="grid grid-cols-2 border-t border-border/60 mt-1">
        <button onClick={() => onDownload(material)}
          className="flex items-center justify-center py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors gap-1.5">
          <Download className="w-4 h-4" /><span className="text-xs font-medium">下载</span>
        </button>
        <button onClick={() => onDelete(material.id)}
          className="flex items-center justify-center py-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors gap-1.5 border-l border-border/60">
          <Trash2 className="w-4 h-4" /><span className="text-xs font-medium">删除</span>
        </button>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function WorksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<'works' | 'materials'>('works');

  // ── 多选与批量删除 state ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // ── 作品管理 state ──
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewProject, setPreviewProject] = useState<VideoProject | null>(null);

  // ── 素材库 state ──
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matLoading, setMatLoading] = useState(false);
  const [matLoaded, setMatLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [matSearch, setMatSearch] = useState('');
  const [matTab, setMatTab] = useState<'all' | 'image' | 'video'>('all');
  const [matDeleteId, setMatDeleteId] = useState<string | null>(null);
  const [matDeleting, setMatDeleting] = useState(false);
  const [matPreview, setMatPreview] = useState<Material | null>(null);

  // P2-N03 智能封面生成（使用 CoverCandidates 组件）
  const [coverProject, setCoverProject] = useState<VideoProject | null>(null);

  const [previewAspect, setPreviewAspect] = useState('aspect-video');
  const [matPreviewAspect, setMatPreviewAspect] = useState('aspect-video');

  useEffect(() => {
    if (previewProject) {
      setPreviewAspect('aspect-video');
    }
  }, [previewProject]);

  useEffect(() => {
    if (matPreview) {
      setMatPreviewAspect('aspect-video');
    }
  }, [matPreview]);

  // P2-N05 A/B 测试面板
  const [abProject, setAbProject] = useState<VideoProject | null>(null);
  const [abVariants, setAbVariants] = useState<ABVariant[]>([]);
  const [abLive, setAbLive] = useState(false);
  const abTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAbLive = useCallback(() => {
    setAbLive(true);
    abTickRef.current = setInterval(() => {
      setAbVariants(prev => prev.map(v =>
        v.status === 'running'
          ? { ...v,
              impressions: v.impressions + Math.floor(Math.random() * 40 + 5),
              clicks: v.clicks + Math.floor(Math.random() * 8),
              conversions: v.conversions + (Math.random() > 0.6 ? 1 : 0),
            }
          : v
      ));
    }, 2000);
  }, []);

  const stopAbLive = useCallback(() => {
    setAbLive(false);
    if (abTickRef.current) { clearInterval(abTickRef.current); abTickRef.current = null; }
  }, []);

async function seedTestUserVideos(userId: string) {
  // 种子作品不再写入占位封面，由页面加载时自动提取原始 AI 视频首帧
  const testVideos = [
    {
      title: '时尚秋季外套女款展示',
      video_url: '/Video/CreatOK_2.mp4',
      duration: 5,
      video_style: '服装',
    },
    {
      title: '智能手表旋转展示',
      video_url: '/Video/CreatOK_5.mp4',
      duration: 10,
      video_style: '数码',
    },
    {
      title: '运动女鞋减震底测试',
      video_url: '/Video/CreatOK_8.mp4',
      duration: 5,
      video_style: '服装',
    },
    {
      title: '咖啡拿铁拉花艺术过程',
      video_url: '/Video/CreatOK_11.mp4',
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
          thumbnail_url: null,
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

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('video_projects').select('*').order('created_at', { ascending: false });
    const formattedData = (data ?? [])
      .map((p: any) => ({
        ...p,
        // 标题优先展示生成时对应的提示词
        title: (p.prompt_text && String(p.prompt_text).trim()) ? String(p.prompt_text).trim() : p.title,
        // 封面只保留真实帧（首帧截图/用户上传），占位图一律清空待异步首帧提取
        thumbnail_url: isRealThumbnail(p.thumbnail_url) ? p.thumbnail_url : null,
      })) as VideoProject[];
    setProjects(formattedData);
    setLoading(false);
    // 异步提取原始 AI 视频第一帧作为封面，并回写数据库保证后续加载一致
    formattedData.forEach(prj => {
      if (!prj.thumbnail_url && prj.video_url) {
        extractVideoMeta(prj.video_url).then(meta => {
          if (meta?.frame) {
            setProjects(prev => prev.map(x => x.id === prj.id ? { ...x, thumbnail_url: meta.frame } : x));
            supabase.from('video_projects').update({ thumbnail_url: meta.frame }).eq('id', prj.id).then(() => {});
          }
        });
      }
    });
  };

  useEffect(() => { loadProjects(); }, []);

  // ── 素材库加载（切到素材Tab时懒加载）──
  const loadMaterials = useCallback(async () => {
    setMatLoading(true);
    if (user?.email === 'test_user@example.com') {
      await seedTestUserVideos(user.id);
    }
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    setMaterials((data ?? []) as Material[]);
    setMatLoading(false);
    setMatLoaded(true);
  }, [user]);

  useEffect(() => {
    if (mainTab === 'materials' && !matLoaded) { loadMaterials(); }
  }, [mainTab, matLoaded, loadMaterials]);

  // ── 素材上传 ──
  const uploadFile = async (file: File) => {
    if (!user) return;
    if (file.size > 50 * 1024 * 1024) { toast.error(`文件过大（最大50MB）：${file.name}`); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext);
    if (!isImage && !isVideo) { toast.error(`不支持的格式：${ext}`); return; }
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { data: up, error } = await supabase.storage.from('materials').upload(path, file);
    if (error) { toast.error(`上传失败：${file.name}`); return; }
    const { data: urlData } = supabase.storage.from('materials').getPublicUrl(up.path);
    const { data: mat } = await supabase.from('materials').insert({
      user_id: user.id, name: file.name, type: isImage ? 'image' : 'video',
      url: urlData.publicUrl, size: file.size,
    }).select().maybeSingle();
    if (mat) setMaterials(prev => [mat as Material, ...prev]);
  };

  const handleMatFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const total = files.length;
    for (let i = 0; i < total; i++) {
      setUploadProgress({ current: i + 1, total, name: files[i].name });
      await uploadFile(files[i]);
    }
    setUploading(false);
    setUploadProgress(null);
    toast.success(`已上传 ${total} 个素材`);
  };

  const handleMatDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); handleMatFiles(e.dataTransfer.files);
  }, []);

  // ── 素材删除 ──
  const handleMatDelete = async () => {
    if (!matDeleteId) return;
    setMatDeleting(true);
    const mat = materials.find(m => m.id === matDeleteId);
    if (mat) {
      const path = mat.url.split('/materials/')[1];
      if (path) await supabase.storage.from('materials').remove([path]);
    }
    const { error } = await supabase.from('materials').delete().eq('id', matDeleteId);
    if (error) toast.error('删除失败');
    else { setMaterials(prev => prev.filter(m => m.id !== matDeleteId)); toast.success('已删除'); }
    setMatDeleting(false);
    setMatDeleteId(null);
  };

  const handleMatDownload = (m: Material) => {
    const a = document.createElement('a'); a.href = m.url; a.download = m.name;
    a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
  };

  const filteredMaterials = materials.filter(m => {
    const matchSearch = !matSearch || m.name.toLowerCase().includes(matSearch.toLowerCase());
    const matchTab = matTab === 'all' || m.type === matTab;
    return matchSearch && matchTab;
  });

  const matStats = {
    total: materials.length,
    images: materials.filter(m => m.type === 'image').length,
    videos: materials.filter(m => m.type === 'video').length,
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusTab === 'all' || p.status === statusTab;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('video_projects').delete().eq('id', deleteId);
    if (error) toast.error('删除失败');
    else {
      setProjects(p => p.filter(v => v.id !== deleteId));
      toast.success('已删除');
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (mainTab === 'works') {
      const allFilteredIds = filtered.map(p => p.id);
      const isAll = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
      if (isAll) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(allFilteredIds));
      }
    } else {
      const allMatIds = filteredMaterials.map(m => m.id);
      const isAll = allMatIds.length > 0 && allMatIds.every(id => selectedIds.has(id));
      if (isAll) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(allMatIds));
      }
    }
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      if (mainTab === 'works') {
        const { error } = await supabase.from('video_projects').delete().in('id', idsArray);
        if (error) throw error;
        setProjects(prev => prev.filter(p => !selectedIds.has(p.id)));
        toast.success(`已成功删除 ${idsArray.length} 个作品`);
      } else {
        const matsToDelete = materials.filter(m => selectedIds.has(m.id));
        const paths = matsToDelete.map(m => m.url.split('/materials/')[1]).filter(Boolean);
        if (paths.length) {
          await supabase.storage.from('materials').remove(paths);
        }
        const { error } = await supabase.from('materials').delete().in('id', idsArray);
        if (error) throw error;
        setMaterials(prev => prev.filter(m => !selectedIds.has(m.id)));
        toast.success(`已成功删除 ${idsArray.length} 个素材`);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (err: any) {
      toast.error(`批量删除失败: ${err.message || err}`);
    } finally {
      setBatchDeleting(false);
      setIsBatchDeleteOpen(false);
    }
  };

  // P1-N06 失败重试：调用 EF retryVideoJob action + 重置项目状态
  const [retrying, setRetrying] = useState<string | null>(null);
  const handleRetry = async (project: VideoProject) => {
    if (retrying) return;
    setRetrying(project.id);
    try {
      // 先将项目状态重置为 processing
      await supabase
        .from('video_projects')
        .update({ status: 'processing', progress: 0 })
        .eq('id', project.id);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'processing', progress: 0 } : p
      ));
      // 触发 EF 重试（找到关联 video_job 并重置）
      const { error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'retry_video_job', project_id: project.id },
      });
      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(msg || error.message);
      }
      toast.success('已重新提交生成任务，请稍候…');
    } catch (err) {
      toast.error(`重试失败：${err instanceof Error ? err.message : '未知错误'}`);
      // 回滚至 failed
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'failed' } : p
      ));
    } finally {
      setRetrying(null);
    }
  };

  // P2-N03 封面生成已移至 CoverCandidates 组件

  const handleOpenAB = (project: VideoProject) => {
    setAbProject(project);
    setAbVariants(generateABVariants(project));
    stopAbLive();
  };

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    processing: projects.filter(p => p.status === 'processing').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── 页头 ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-balance">作品素材</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mainTab === 'works'
              ? <>共 {stats.total} 个作品 · {stats.completed} 个已完成{stats.processing > 0 && <span className="text-warning ml-1">· {stats.processing} 个生成中</span>}</>
              : <>共 {matStats.total} 个素材 · 图片 {matStats.images} · 视频 {matStats.videos}</>
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant={selectMode ? "secondary" : "outline"}
            size="sm"
            className={cn("h-9 gap-1.5", selectMode && "border-primary text-primary font-semibold bg-primary/10")}
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedIds(new Set());
            }}
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? '退出多选' : '多选操作'}
          </Button>
          {mainTab === 'works' ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={loadProjects} title="刷新">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button className="h-9" onClick={() => navigate('/video/create')}>
                <Plus className="w-4 h-4 mr-1.5" />新建视频
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => loadMaterials()} title="刷新">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <label className="shrink-0 cursor-pointer">
                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleMatFiles(e.target.files)} />
                <Button asChild className="h-9 pointer-events-none">
                  <span><Upload className="w-4 h-4 mr-1.5" />上传素材</span>
                </Button>
              </label>
            </>
          )}
        </div>
      </div>

      {/* ── 主 Tab 切换 ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border/60 w-fit">
        {[
          { value: 'works' as const,     label: '视频作品', icon: Video },
          { value: 'materials' as const, label: '素材库',   icon: ImageIcon },
        ].map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => { setMainTab(value); setSelectedIds(new Set()); }}
            className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              mainTab === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── 多选批量操作控制栏 ── */}
      {selectMode && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              已选择 <span className="text-primary font-bold text-base px-1">{selectedIds.size}</span> 项
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleSelectAll}
            >
              {((mainTab === 'works' && filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))) ||
                (mainTab === 'materials' && filteredMaterials.length > 0 && filteredMaterials.every(m => selectedIds.has(m.id))))
                  ? '取消全选' : '全选本页'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setIsBatchDeleteOpen(true)}
              className="h-8 text-xs gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除 ({selectedIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="h-8 text-xs"
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ 视频作品 Tab ══════════════ */}
      {mainTab === 'works' && (
        <>
          {/* ── 搜索栏 ── */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索作品名称..." className="pl-9 px-3 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* ── 状态标签切换 ── */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_TABS.map(tab => {
              const cnt = tab.value === 'all' ? projects.length : projects.filter(p => p.status === tab.value).length;
              return (
                <button key={tab.value} onClick={() => setStatusTab(tab.value)}
                  className={cn('px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border',
                    statusTab === tab.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40')}>
                  {tab.label}
                  <span className={cn('ml-1.5 text-xs', statusTab === tab.value ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* ── 内容区 ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border/60 bg-card flex flex-col h-full">
                  <Skeleton className="aspect-video w-full bg-muted" />
                  <div className="p-4 space-y-2.5 flex-1">
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                    <Skeleton className="h-3 w-1/2 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(p => (
                  <WorkCard key={p.id} project={p} onPreview={setPreviewProject} onDelete={setDeleteId}
                    onAnalyze={id => navigate(`/data-feedback?projectId=${id}`)} onRetry={handleRetry} onReload={loadProjects}
                    selectMode={selectMode} isSelected={selectedIds.has(p.id)} onToggleSelect={toggleSelectItem} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">
                {search || statusTab !== 'all' ? '没有找到匹配的作品' : '还没有视频作品'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusTab !== 'all' ? '尝试修改搜索条件或切换标签' : '点击「新建视频」开始创作'}
              </p>
              {!search && statusTab === 'all' && (
                <Button className="mt-5" onClick={() => navigate('/video/create')}>
                  <Plus className="w-4 h-4 mr-1.5" />立即创建
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════ 素材库 Tab ══════════════ */}
      {mainTab === 'materials' && (
        <>
          {/* 拖拽上传区 */}
          <label
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleMatDrop}
            className={cn('relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-6 cursor-pointer transition-all duration-200',
              dragging ? 'border-primary bg-primary/5 scale-[1.005]' : 'border-border hover:border-primary/50 hover:bg-muted/30')}>
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleMatFiles(e.target.files)} />
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center transition-colors', uploading ? 'bg-primary/20' : 'bg-muted')}>
              <Upload className={cn('w-5 h-5', uploading ? 'text-primary animate-bounce' : 'text-muted-foreground')} />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {uploading && uploadProgress
                ? `正在上传 ${uploadProgress.current}/${uploadProgress.total}：${uploadProgress.name.slice(0, 20)}`
                : uploading ? '上传中，请稍候...' : '拖拽素材至此，或点击选择文件'}
            </p>
            <p className="text-xs text-muted-foreground/70">支持 JPG / PNG / MP4 / MOV，单文件最大 50MB</p>
            {uploading && uploadProgress && (
              <div className="w-full max-w-xs">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </p>
              </div>
            )}
          </label>

          {/* 类型标签 + 搜索 */}
          <div className="flex flex-row items-center gap-3 flex-wrap">
            <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border/60 shrink-0">
              {([['all', '全部'], ['image', '图片'], ['video', '视频']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setMatTab(val)}
                  className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                    matTab === val ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {lbl}
                  <span className={cn('ml-1.5 text-xs', matTab === val ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {val === 'all' ? matStats.total : val === 'image' ? matStats.images : matStats.videos}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索素材名称..." className="pl-9 px-3 h-9" value={matSearch} onChange={e => setMatSearch(e.target.value)} />
            </div>
          </div>

          {/* 素材网格 */}
          {matLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border/60 bg-card flex flex-col h-full">
                  <Skeleton className="aspect-[4/3] w-full bg-muted" />
                  <div className="p-3 space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                    <Skeleton className="h-3 w-1/2 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMaterials.map(m => (
                <MaterialCard key={m.id} material={m} onPreview={setMatPreview} onDownload={handleMatDownload} onDelete={setMatDeleteId}
                  selectMode={selectMode} isSelected={selectedIds.has(m.id)} onToggleSelect={toggleSelectItem} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">
                {matSearch || matTab !== 'all' ? '没有找到匹配的素材' : '素材库为空'}
              </p>
              <p className="text-sm text-muted-foreground">
                {matSearch || matTab !== 'all' ? '尝试修改搜索条件' : '上传商品图片或视频素材'}
              </p>
            </div>
          )}

          {/* 素材预览弹窗 */}
          <Dialog open={!!matPreview} onOpenChange={v => !v && setMatPreview(null)}>
            {matPreview && (() => {
              const isVertical = matPreviewAspect === 'aspect-[9/16]' || matPreviewAspect === 'aspect-[3/4]';
              const isSquare = matPreviewAspect === 'aspect-square';
              return (
                <DialogContent className={cn(
                  "max-w-[calc(100%-2rem)]",
                  isVertical ? "md:max-w-[380px]" : isSquare ? "md:max-w-md" : "md:max-w-3xl"
                )}>
                  <DialogHeader>
                    <DialogTitle className="truncate text-balance pr-6">{matPreview.name}</DialogTitle>
                  </DialogHeader>
                  <div className={cn("rounded-xl overflow-hidden bg-black relative flex items-center justify-center", matPreviewAspect)}>
                    {matPreview.type === 'image' ? (
                      <img
                        src={matPreview.url}
                        alt={matPreview.name}
                        className="w-full h-full object-contain"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const ratio = img.naturalWidth / img.naturalHeight;
                          if (ratio < 0.65) setMatPreviewAspect('aspect-[9/16]');
                          else if (ratio < 0.8) setMatPreviewAspect('aspect-[3/4]');
                          else if (ratio < 1.2) setMatPreviewAspect('aspect-square');
                          else setMatPreviewAspect('aspect-video');
                        }}
                      />
                    ) : (
                      <video
                        src={matPreview.url}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        onLoadedMetadata={(e) => {
                          const vid = e.currentTarget;
                          const ratio = vid.videoWidth / vid.videoHeight;
                          if (ratio < 0.65) setMatPreviewAspect('aspect-[9/16]');
                          else if (ratio < 0.8) setMatPreviewAspect('aspect-[3/4]');
                          else if (ratio < 1.2) setMatPreviewAspect('aspect-square');
                          else setMatPreviewAspect('aspect-video');
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded',
                      matPreview.type === 'image' ? 'bg-info/15 text-info' : 'bg-primary/15 text-primary')}>
                      {matPreview.type === 'image' ? '图片' : '视频'}
                    </span>
                    {matPreview.size && <span>大小：{formatSize(matPreview.size)}</span>}
                    <span className="ml-auto">{formatDateShort(matPreview.created_at)}</span>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleMatDownload(matPreview)}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />下载
                    </Button>
                  </div>
                </DialogContent>
              );
            })()}
          </Dialog>

          {/* 素材删除确认 */}
          <AlertDialog open={!!matDeleteId} onOpenChange={v => !v && setMatDeleteId(null)}>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>删除后文件将从存储中移除，无法恢复。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleMatDelete} disabled={matDeleting}>
                  {matDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* ── 预览弹窗（作品）── */}
      <Dialog open={!!previewProject} onOpenChange={v => !v && setPreviewProject(null)}>
        {previewProject && (() => {
          const isVertical = previewAspect === 'aspect-[9/16]' || previewAspect === 'aspect-[3/4]';
          const isSquare = previewAspect === 'aspect-square';
          return (
            <DialogContent className={cn(
              "max-w-[calc(100%-2rem)]",
              isVertical ? "md:max-w-[380px]" : isSquare ? "md:max-w-md" : "md:max-w-3xl"
            )}>
              <DialogHeader>
                <DialogTitle className="truncate text-balance pr-6">{previewProject.title}</DialogTitle>
              </DialogHeader>
              <div className={cn("rounded-xl overflow-hidden bg-black relative flex items-center justify-center", previewAspect)}>
                {(previewProject.video_url || previewProject.status === 'completed') ? (
                  <video
                    src={previewProject.video_url || '/Video/CreatOK_2.mp4'}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    onLoadedMetadata={(e) => {
                      const vid = e.currentTarget;
                      const ratio = vid.videoWidth / vid.videoHeight;
                      if (ratio < 0.65) setPreviewAspect('aspect-[9/16]');
                      else if (ratio < 0.8) setPreviewAspect('aspect-[3/4]');
                      else if (ratio < 1.2) setPreviewAspect('aspect-square');
                      else setPreviewAspect('aspect-video');
                    }}
                  />
                ) : previewProject.thumbnail_url ? (
                  <img
                    src={previewProject.thumbnail_url}
                    alt={previewProject.title}
                    className="w-full h-full object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const ratio = img.naturalWidth / img.naturalHeight;
                      if (ratio < 0.65) setPreviewAspect('aspect-[9/16]');
                      else if (ratio < 0.8) setPreviewAspect('aspect-[3/4]');
                      else if (ratio < 1.2) setPreviewAspect('aspect-square');
                      else setPreviewAspect('aspect-video');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {previewProject.video_style && <span>风格：{previewProject.video_style}</span>}
                {previewProject.duration > 0 && <span>时长：{previewProject.duration}s</span>}
                <span className="ml-auto">{new Date(previewProject.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* ── 删除确认（作品）── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，确定要删除这个视频项目吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── P2-N03 智能封面生成 ── */}
      <Dialog open={!!coverProject} onOpenChange={v => !v && setCoverProject(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <ImagePlus className="w-5 h-5 text-primary" />智能封面生成
              <Badge variant="outline" className="text-xs">P2-N03</Badge>
            </DialogTitle>
          </DialogHeader>
          {coverProject && <CoverCandidates projectId={coverProject.id} projectTitle={coverProject.title} />}
        </DialogContent>
      </Dialog>

      {/* ── CR-08: A/B测试变体管理面板 ── */}
      <Dialog open={!!abProject} onOpenChange={v => { if (!v) { stopAbLive(); setAbProject(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <FlipHorizontal className="w-5 h-5 text-primary" />A/B 测试变体管理
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">CR-08</Badge>
              {abLive && (
                <span className="flex items-center gap-1 text-xs font-medium text-success ml-auto">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />实时更新中
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {abProject && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  《<strong className="text-foreground">{abProject.title}</strong>》· {abVariants.length} 个测试变体
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                    onClick={() => abLive ? stopAbLive() : startAbLive()}>
                    {abLive ? <><Activity className="w-3.5 h-3.5 text-success" />暂停实时</> : <><Activity className="w-3.5 h-3.5" />实时追踪</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                    onClick={() => setAbVariants(generateABVariants(abProject))}>
                    <RefreshCw className="w-3.5 h-3.5" />重置数据
                  </Button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {abVariants.map((v, idx) => {
                  const ctr = v.impressions > 0 ? (v.clicks / v.impressions * 100) : 0;
                  const cvr = v.clicks > 0 ? (v.conversions / v.clicks * 100) : 0;
                  const maxCtr = Math.max(...abVariants.map(x => x.impressions > 0 ? x.clicks / x.impressions * 100 : 0));
                  const isWinner = ctr === maxCtr && idx > 0;
                  const sparkColors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))'];
                  return (
                    <div key={v.id} className={cn('rounded-xl border p-4 space-y-3 relative',
                      isWinner ? 'border-success/40 bg-success/5' : 'border-border/70 bg-card')}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                          idx === 0 ? 'bg-primary/10 text-primary' : idx === 1 ? 'bg-success/10 text-success' : 'bg-info/10 text-info')}>{v.id}</span>
                        <span className="text-sm font-semibold flex-1">{v.label}</span>
                        {isWinner && <Trophy className="w-4 h-4 text-warning fill-warning shrink-0" />}
                      </div>
                      <div className="space-y-1 text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                        <div className="flex gap-1.5"><span className="shrink-0">封面:</span><span className="text-foreground">{v.coverStyle}</span></div>
                        <div className="flex gap-1.5"><span className="shrink-0">钩子:</span><span className="text-foreground">{v.hookStyle}</span></div>
                        <div className="flex gap-1.5"><span className="shrink-0">CTA:</span><span className="text-foreground">{v.ctaText}</span></div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-muted/40 rounded-lg py-2">
                          <p className="text-sm font-bold tabular-nums">{(v.impressions / 1000).toFixed(1)}k</p>
                          <p className="text-[10px] text-muted-foreground">曝光</p>
                        </div>
                        <div className="bg-muted/40 rounded-lg py-2">
                          <p className={cn('text-sm font-bold tabular-nums', isWinner ? 'text-success' : '')}>{ctr.toFixed(1)}%</p>
                          <p className="text-[10px] text-muted-foreground">点击率</p>
                        </div>
                        <div className="bg-muted/40 rounded-lg py-2">
                          <p className={cn('text-sm font-bold tabular-nums', isWinner ? 'text-success' : '')}>{cvr.toFixed(1)}%</p>
                          <p className="text-[10px] text-muted-foreground">转化率</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">点击率趋势</span>
                          <MiniSparkline color={sparkColors[idx]} />
                        </div>
                        <Progress value={Math.min(ctr * 10, 100)} className="h-1.5" />
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setAbVariants(prev => prev.map(x => x.id === v.id ? { ...x, status: x.status === 'running' ? 'paused' : 'running' } : x))}
                          className={cn('flex-1 text-[10px] py-1 rounded-md font-medium border transition-colors',
                            v.status === 'running'
                              ? 'bg-success/10 border-success/30 text-success hover:bg-success/20'
                              : 'bg-muted/50 border-border/60 text-muted-foreground hover:bg-muted')}>
                          {v.status === 'running' ? '● 投放中' : '⏸ 已暂停'}
                        </button>
                        {isWinner && (
                          <button
                            onClick={() => { toast.success(`已将版本 ${v.id} 设为正式投放版本`); stopAbLive(); setAbProject(null); }}
                            className="flex-1 text-[10px] py-1 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            设为正式版
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />AI 策略建议
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  {(() => {
                    const winner = abVariants.reduce((best, v) =>
                      (v.clicks / Math.max(v.impressions, 1)) > (best.clicks / Math.max(best.impressions, 1)) ? v : best);
                    const improvement = winner.id !== 'A'
                      ? Math.round((winner.clicks / Math.max(winner.impressions, 1) - abVariants[0].clicks / Math.max(abVariants[0].impressions, 1))
                          / Math.max(abVariants[0].clicks / Math.max(abVariants[0].impressions, 1), 0.001) * 100)
                      : 0;
                    return [
                      { icon: '✓', color: 'bg-success/20 text-success', text: `版本 ${winner.id} 点击率最高，${improvement > 0 ? `领先 A 版本 ${improvement}%，` : ''}建议设为正式版` },
                      { icon: '→', color: 'bg-primary/20 text-primary', text: `"${winner.ctaText}" 文案表现最佳，建议在其他变体中测试该文案` },
                      { icon: 'i', color: 'bg-info/20 text-info', text: '建议在版本 C 数据积累后再做决策，当前样本量偏小（< 5k 曝光）' },
                    ];
                  })().map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5', item.color)}>{item.icon}</span>
                      <span dangerouslySetInnerHTML={{ __html: item.text.replace(/(\d+%)/g, '<strong class="text-foreground">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 批量删除确认弹窗 ── */}
      <AlertDialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除选中的 {selectedIds.size} 个{mainTab === 'works' ? '视频作品' : '素材文件'}吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDeleteConfirm}
              disabled={batchDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchDeleting ? '正在删除...' : '确定删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
