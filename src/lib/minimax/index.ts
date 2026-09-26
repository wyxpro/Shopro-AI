/**
 * MiniMax H3 Max 视频生成模型对接 (Tokendance Gateway)
 * Base URL: https://tokendance.space (Dev Proxy: /tokendance-api)
 * 采用 MiniMax 视频 V2 异步协议：
 *   - 提交任务: POST /gateway/minimax/v2/video_generation  -> { task_id }
 *   - 查询任务: GET  /gateway/minimax/v2/query/video_generation/{task_id} -> { task: { status, content: { url } } }
 * task.status 取值: queued / running / succeeded / failed / cancelled / expired
 * 任务成功后 task.content.url 为视频下载链接 (有效期 24 小时)。
 * 注意: API Key 仅通过 .env (VITE_MINIMAX_API_KEY) 注入，禁止在前端源码硬编码。
 */

const DEFAULT_MINIMAX_BASE_URL = 'https://tokendance.space';

/** 读取 MiniMax 网关密钥（优先专用变量，回退通用命名） */
function getApiKey(): string {
  return (
    import.meta.env.VITE_MINIMAX_API_KEY ||
    import.meta.env.VITE_MINIMAX_GATEWAY_API_KEY ||
    ''
  );
}

/** 候选基础地址：代理前缀优先，最后回退直连，兼容开发/生产环境 */
function getCandidateBaseUrls(): string[] {
  const envUrl = import.meta.env.VITE_MINIMAX_BASE_URL;
  const urls: string[] = [];
  if (envUrl) urls.push(envUrl.replace(/\/+$/, ''));
  urls.push('/tokendance-api');
  urls.push(DEFAULT_MINIMAX_BASE_URL);
  return Array.from(new Set(urls));
}

export interface MiniMaxContentItem {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
  role?: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';
}

export interface MiniMaxVideoPayload {
  /** 画面描述提示词 */
  prompt: string;
  /** 视频时长（秒），文档示例支持 6 / 8 等 */
  duration?: number;
  /** 分辨率，例如 768P */
  resolution?: string;
  /** 宽高比，纯文生视频必填且不能为 adaptive */
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

export interface MiniMaxSubmitResult {
  task_id: string;
}

export type MiniMaxQueryStatus = 'success' | 'processing' | 'queued' | 'failed';

export interface MiniMaxQueryResult {
  status: MiniMaxQueryStatus;
  video_url?: string;
  error?: string;
  progress?: number;
  outcome?: { video_url?: string; thumbnail_image_url?: string };
}

/** MiniMax 支持的关键帧/参考素材清晰度守卫：确保纯文生视频时 ratio 必填 */
function buildContent(payload: MiniMaxVideoPayload): {
  content: MiniMaxContentItem[];
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

  const content: MiniMaxContentItem[] = [];
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
 * 提交 MiniMax H3 Max 视频生成任务，带多端点回退。
 * 文生视频场景 ratio 必填且不能为 adaptive；含图片时宽高比由图片决定，无需传 ratio。
 */
export async function submitMiniMaxVideo(
  payload: MiniMaxVideoPayload,
): Promise<MiniMaxSubmitResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 MiniMax API Key (VITE_MINIMAX_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();
  const { content, hasVisualRef } = buildContent(payload);

  const requestBody: Record<string, unknown> = {
    model: 'minimax-h3-max',
    // 实测该网关模型仅配置了 768P 规格价格，传入 720P/1080P 会返回 HTTP 400，
    // 因此统一收敛到受支持的 768P，确保提交稳定生效。
    resolution: '768P',
    duration: Number(payload.duration) || 6,
    content,
  };

  // 仅在纯文生视频（无图片参考）时传 ratio，且必须为具体比例
  if (!hasVisualRef) {
    const ratio = payload.ratio && payload.ratio !== 'adaptive' ? payload.ratio : '16:9';
    requestBody.ratio = ratio;
  }

  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/gateway/minimax/v2/video_generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const isLastCandidate = candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1;

      // 405 / 404 表示该代理端点不支持此路径，尝试下一个候选地址
      if ((response.status === 405 || response.status === 404) && !isLastCandidate) {
        console.warn(`[MiniMax] Base URL ${baseUrl} returned ${response.status}, trying fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`MiniMax H3 Max API HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const taskId = resData?.task_id || resData?.id || resData?.data?.task_id;

      if (!taskId) {
        throw new Error(`MiniMax 提交响应无效: ${JSON.stringify(resData)}`);
      }

      return { task_id: taskId };
    } catch (err) {
      lastError = err as Error;
      if (candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1) {
        throw err;
      }
    }
  }

  throw lastError || new Error('MiniMax H3 Max 视频提交失败（所有端点均不可用）。');
}

/** 将 MiniMax 原始状态映射为内部统一状态 */
function mapStatus(raw: string): MiniMaxQueryStatus {
  switch ((raw || '').toLowerCase()) {
    case 'succeeded':
    case 'success':
      return 'success';
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'failed';
    case 'queued':
      return 'queued';
    default:
      return 'processing';
  }
}

/**
 * 查询 MiniMax H3 Max 视频生成任务状态，带多端点回退。
 * 成功时返回 video_url 与缩略图（复用首帧），供工作台轮询与存档使用。
 */
export async function queryMiniMaxVideo(taskId: string): Promise<MiniMaxQueryResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 MiniMax API Key (VITE_MINIMAX_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(
        `${baseUrl}/gateway/minimax/v2/query/video_generation/${taskId}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );

      const isLastCandidate = candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1;

      if ((response.status === 405 || response.status === 404) && !isLastCandidate) {
        console.warn(`[MiniMax] Query Base URL ${baseUrl} returned ${response.status}, trying fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`MiniMax 查询失败 HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const task = resData?.task || resData?.data || resData;
      const status = mapStatus(task?.status);

      if (status === 'success') {
        const videoUrl = task?.content?.url || task?.video_url || task?.result_url;
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
          error: task?.fail_reason || task?.error_message || 'MiniMax 视频生成任务失败',
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

  throw lastError || new Error('MiniMax H3 Max 视频查询失败（所有端点均不可用）。');
}
