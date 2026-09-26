/**
 * ByteDance Seedance 2.0 Mini 视频生成模型对接 (Tokendance Gateway / Volcengine Ark v3)
 * Base URL: https://tokendance.space (Dev Proxy: /tokendance-api)
 * 采用异步协议（Ark v3 generations/tasks）：
 *   - 提交任务: POST /gateway/ark/v3/generations/tasks  -> { id }
 *   - 查询任务: GET  /gateway/ark/v3/generations/tasks/{task_id} -> { status, content: { video_url } }
 * status 取值: queued / running / succeeded / failed / cancelled / expired
 * 任务成功后 content.video_url 为视频下载链接 (有效期 24 小时)。
 *
 * 实测参数规格守卫（避免 400 "未配置该请求规格的价格 / duration not valid"）：
 *   - resolution 仅受支持 480p / 720p，1080p 及以上会被拒绝 -> 收敛到 720p
 *   - duration 有效区间 [4, 15]（3 会被拒绝）-> 夹取到 [4, 15]
 * 注意: API Key 仅通过 .env (VITE_SEEDANCE_MINI_API_KEY) 注入，禁止在前端源码硬编码。
 */

const DEFAULT_SEEDANCE_MINI_BASE_URL = 'https://tokendance.space';

/** 读取 Seedance Mini 网关密钥（优先专用变量，回退同网关其它变量） */
function getApiKey(): string {
  return (
    import.meta.env.VITE_SEEDANCE_MINI_API_KEY ||
    import.meta.env.VITE_WAN3_API_KEY ||
    import.meta.env.VITE_MINIMAX_API_KEY ||
    ''
  );
}

/** 候选基础地址：代理前缀优先，最后回退直连，兼容开发/生产环境 */
function getCandidateBaseUrls(): string[] {
  const envUrl = import.meta.env.VITE_SEEDANCE_MINI_BASE_URL;
  const urls: string[] = [];
  if (envUrl) urls.push(envUrl.replace(/\/+$/, ''));
  urls.push('/tokendance-api');
  urls.push(DEFAULT_SEEDANCE_MINI_BASE_URL);
  return Array.from(new Set(urls));
}

export interface SeedanceMiniContentItem {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
  role?: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';
}

export interface SeedanceMiniVideoPayload {
  /** 画面描述提示词 */
  prompt: string;
  /** 视频时长（秒），有效区间 [4, 15] */
  duration?: number;
  /** 分辨率，受支持 480p / 720p（更高会被收敛到 720p） */
  resolution?: string;
  /** 宽高比，例如 16:9 / 9:16 / 1:1 / adaptive */
  ratio?: string;
  /** 首帧图片 URL */
  first_frame?: string;
  /** 尾帧图片 URL */
  last_frame?: string;
  /** 参考图片 URL 列表 */
  reference_images?: string[];
  /** 参考视频 URL 列表 */
  reference_videos?: string[];
  /** 参考音频 URL 列表 */
  reference_audios?: string[];
}

export interface SeedanceMiniSubmitResult {
  task_id: string;
}

export type SeedanceMiniQueryStatus = 'success' | 'processing' | 'queued' | 'failed';

export interface SeedanceMiniQueryResult {
  status: SeedanceMiniQueryStatus;
  video_url?: string;
  error?: string;
  progress?: number;
  outcome?: { video_url?: string; thumbnail_image_url?: string };
}

/** 分辨率守卫：仅 480p/720p 有规格价格，其余（如 1080p/4K）收敛到 720p */
function normalizeResolution(raw?: string): string {
  const r = (raw || '720p').toLowerCase();
  return r === '480p' ? '480p' : '720p';
}

/** 时长守卫：夹取到模型支持的 [4, 15] 秒 */
function clampDuration(raw?: number): number {
  const d = Number(raw) || 5;
  if (d < 4) return 4;
  if (d > 15) return 15;
  return Math.round(d);
}

/** 组装 Ark v3 多模态 content 数组 */
function buildContent(payload: SeedanceMiniVideoPayload): {
  content: SeedanceMiniContentItem[];
  hasVisualRef: boolean;
} {
  const {
    prompt,
    first_frame,
    last_frame,
    reference_images = [],
    reference_videos = [],
    reference_audios = [],
  } = payload;

  const content: SeedanceMiniContentItem[] = [];
  content.push({ type: 'text', text: prompt || '生成一段精致带货短视频' });

  let hasVisualRef = false;

  if (first_frame) {
    content.push({ type: 'image_url', image_url: { url: first_frame }, role: 'first_frame' });
    hasVisualRef = true;
  }
  if (last_frame) {
    content.push({ type: 'image_url', image_url: { url: last_frame }, role: 'last_frame' });
    hasVisualRef = true;
  }
  reference_images.forEach((url) => {
    if (url && url !== first_frame && url !== last_frame) {
      content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' });
      hasVisualRef = true;
    }
  });
  reference_videos.forEach((url) => {
    if (url) {
      content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
      hasVisualRef = true;
    }
  });
  reference_audios.forEach((url) => {
    if (url) {
      content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' });
    }
  });

  return { content, hasVisualRef };
}

/**
 * 提交 Seedance 2.0 Mini 视频生成任务，带多端点回退。
 */
export async function submitSeedanceMiniVideo(
  payload: SeedanceMiniVideoPayload,
): Promise<SeedanceMiniSubmitResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 Seedance 2.0 Mini API Key (VITE_SEEDANCE_MINI_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();
  const { content, hasVisualRef } = buildContent(payload);

  const requestBody: Record<string, unknown> = {
    model: 'seedance-2.0-mini',
    content,
    resolution: normalizeResolution(payload.resolution),
    duration: clampDuration(payload.duration),
    ratio: hasVisualRef
      ? (payload.ratio && payload.ratio !== '16:9' ? payload.ratio : 'adaptive')
      : (payload.ratio && payload.ratio !== 'adaptive' ? payload.ratio : '16:9'),
  };

  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/gateway/ark/v3/generations/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const isLastCandidate = candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1;

      if ((response.status === 405 || response.status === 404) && !isLastCandidate) {
        console.warn(`[SeedanceMini] Base URL ${baseUrl} returned ${response.status}, trying fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Seedance 2.0 Mini API HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const taskId = resData?.id || resData?.task_id || resData?.data?.id || resData?.data?.task_id;

      if (!taskId) {
        throw new Error(`Seedance 2.0 Mini 提交响应无效: ${JSON.stringify(resData)}`);
      }

      return { task_id: taskId };
    } catch (err) {
      lastError = err as Error;
      if (candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Seedance 2.0 Mini 视频提交失败（所有端点均不可用）。');
}

/** 将 Ark 原始状态映射为内部统一状态 */
function mapStatus(raw: string): SeedanceMiniQueryStatus {
  switch ((raw || '').toLowerCase()) {
    case 'succeeded':
    case 'success':
      return 'success';
    case 'failed':
    case 'cancelled':
    case 'canceled':
    case 'expired':
      return 'failed';
    case 'queued':
    case 'pending':
      return 'queued';
    default:
      return 'processing';
  }
}

/**
 * 查询 Seedance 2.0 Mini 视频生成任务状态，带多端点回退。
 * 成功时读取顶层 content.video_url 并映射为统一结构。
 */
export async function querySeedanceMiniVideo(taskId: string): Promise<SeedanceMiniQueryResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 Seedance 2.0 Mini API Key (VITE_SEEDANCE_MINI_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/gateway/ark/v3/generations/tasks/${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const isLastCandidate = candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1;

      if ((response.status === 405 || response.status === 404) && !isLastCandidate) {
        console.warn(`[SeedanceMini] Query Base URL ${baseUrl} returned ${response.status}, trying fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Seedance 2.0 Mini 查询失败 HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const task = resData?.data || resData;
      const status = mapStatus(task?.status);

      if (status === 'success') {
        const videoUrl = task?.content?.video_url || task?.video_url || task?.result_url;
        return {
          status: 'success',
          video_url: videoUrl,
          outcome: {
            video_url: videoUrl,
            thumbnail_image_url: videoUrl ? `${videoUrl}?vframe/jpg/offset/1` : undefined,
          },
        };
      }

      if (status === 'failed') {
        return {
          status: 'failed',
          error: task?.error?.message || task?.fail_reason || 'Seedance 2.0 Mini 视频生成任务失败',
        };
      }

      return { status, progress: status === 'queued' ? 5 : 10 };
    } catch (err) {
      lastError = err as Error;
      if (candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Seedance 2.0 Mini 视频查询失败（所有端点均不可用）。');
}
