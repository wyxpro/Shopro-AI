/**
 * Qwen Wan3.0 Prime 视频生成模型对接 (Tokendance Gateway / Alibaba Wan3)
 * Base URL: https://tokendance.space (Dev Proxy: /tokendance-api)
 * 采用异步协议（DashScope 风格请求体）：
 *   - 提交任务: POST /gateway/alibaba/wan3/v1/video-synthesis  -> { output: { task_id } }
 *   - 查询任务: GET  /gateway/alibaba/wan3/v1/tasks/{task_id}   -> { output: { task_status, video_url } }
 * output.task_status 取值: PENDING / RUNNING / SUCCEEDED / FAILED / CANCELED
 * 任务成功后 output.video_url 为带签名的视频下载地址 (有效期 24 小时)。
 * 重要: 创建接口无客户端幂等键，网络超时后禁止自动重试 POST，否则可能重复创建并计费。
 * 注意: API Key 仅通过 .env (VITE_WAN3_API_KEY) 注入，禁止在前端源码硬编码。
 */

const DEFAULT_WAN3_BASE_URL = 'https://tokendance.space';

/** 读取 Wan3 网关密钥（优先专用变量，回退同网关 MiniMax 变量） */
function getApiKey(): string {
  return (
    import.meta.env.VITE_WAN3_API_KEY ||
    import.meta.env.VITE_MINIMAX_API_KEY ||
    ''
  );
}

/** 候选基础地址：代理前缀优先，最后回退直连，兼容开发/生产环境 */
function getCandidateBaseUrls(): string[] {
  const envUrl = import.meta.env.VITE_WAN3_BASE_URL;
  const urls: string[] = [];
  if (envUrl) urls.push(envUrl.replace(/\/+$/, ''));
  urls.push('/tokendance-api');
  urls.push(DEFAULT_WAN3_BASE_URL);
  return Array.from(new Set(urls));
}

export interface Wan3VideoPayload {
  /** 画面描述提示词 */
  prompt: string;
  /** 负向提示词（可选） */
  negative_prompt?: string;
  /** 视频时长（秒），实测支持 2~15 */
  duration?: number;
  /** 分辨率，实测支持 480P / 720P / 1080P */
  resolution?: string;
  /** 宽高比，例如 16:9 / 9:16 / 1:1 / 4:3 */
  ratio?: string;
  /** 是否生成音频 */
  audio?: boolean;
  /** 是否添加水印 */
  watermark?: boolean;
  /** 首帧图片 URL（图生视频场景，可选） */
  first_frame?: string;
}

export interface Wan3SubmitResult {
  task_id: string;
}

export type Wan3QueryStatus = 'success' | 'processing' | 'queued' | 'failed';

export interface Wan3QueryResult {
  status: Wan3QueryStatus;
  video_url?: string;
  error?: string;
  progress?: number;
  outcome?: { video_url?: string; thumbnail_image_url?: string };
}

/**
 * 提交 Wan3.0 Prime 视频生成任务。
 * 遵循文档幂等性告警：仅在端点未路由 (404/405) 时切换候选地址，
 * 网络异常或超时不自动重试 POST，避免重复创建计费。
 */
export async function submitWan3Video(payload: Wan3VideoPayload): Promise<Wan3SubmitResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 Wan3 API Key (VITE_WAN3_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();

  const requestBody = {
    model: 'wan3.0-video-prime',
    input: {
      prompt: payload.prompt || '生成一段精致带货短视频',
      ...(payload.negative_prompt ? { negative_prompt: payload.negative_prompt } : {}),
      ...(payload.first_frame
        ? { media: [{ type: 'first_frame', url: payload.first_frame }] }
        : {}),
    },
    parameters: {
      resolution: payload.resolution || '720P',
      ratio: payload.ratio && payload.ratio !== 'adaptive' ? payload.ratio : '16:9',
      duration: Number(payload.duration) || 5,
      audio: Boolean(payload.audio),
      watermark: Boolean(payload.watermark),
    },
  };

  for (let i = 0; i < candidateUrls.length; i++) {
    const baseUrl = candidateUrls[i];
    const isLastCandidate = i === candidateUrls.length - 1;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/gateway/alibaba/wan3/v1/video-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      // 网络异常/超时可能已在服务端创建任务，禁止重试 POST，直接抛出避免重复计费
      throw new Error(
        `Wan3.0 Prime 提交网络异常（为避免重复计费不自动重试）：${(err as Error).message}`,
      );
    }

    // 端点未路由（404/405）说明该候选地址不可用，可安全切换下一个（未创建任务）
    if ((response.status === 404 || response.status === 405) && !isLastCandidate) {
      console.warn(`[Wan3] Base URL ${baseUrl} returned ${response.status}, trying fallback endpoint...`);
      continue;
    }

    const resData = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = resData?.output?.message || resData?.message || JSON.stringify(resData || '');
      throw new Error(`Wan3.0 Prime API HTTP ${response.status}: ${detail}`);
    }

    const taskId = resData?.output?.task_id || resData?.task_id;
    if (!taskId) {
      throw new Error(`Wan3.0 Prime 提交响应无效: ${JSON.stringify(resData)}`);
    }

    return { task_id: taskId };
  }

  throw new Error('Wan3.0 Prime 视频提交失败（所有端点均不可用）。');
}

/** 将 Wan3 原始状态映射为内部统一状态 */
function mapStatus(raw: string): Wan3QueryStatus {
  switch ((raw || '').toUpperCase()) {
    case 'SUCCEEDED':
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
    case 'CANCELED':
    case 'CANCELLED':
    case 'UNKNOWN':
      return 'failed';
    case 'PENDING':
      return 'queued';
    default:
      return 'processing';
  }
}

/**
 * 查询 Wan3.0 Prime 视频生成任务状态（GET 幂等，可安全多端点回退）。
 * 成功时返回 video_url 与缩略图，供工作台轮询与存档使用。
 */
export async function queryWan3Video(taskId: string): Promise<Wan3QueryResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 Wan3 API Key (VITE_WAN3_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/gateway/alibaba/wan3/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const isLastCandidate = candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1;

      if ((response.status === 405 || response.status === 404) && !isLastCandidate) {
        console.warn(`[Wan3] Query Base URL ${baseUrl} returned ${response.status}, trying fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Wan3 查询失败 HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const output = resData?.output || resData?.data || resData;
      const status = mapStatus(output?.task_status);

      if (status === 'success') {
        const videoUrl = output?.video_url || output?.results?.[0]?.url;
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
          error: output?.message || output?.code || 'Wan3.0 Prime 视频生成任务失败',
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

  throw lastError || new Error('Wan3.0 Prime 视频查询失败（所有端点均不可用）。');
}
