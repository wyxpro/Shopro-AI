/**
 * Alibaba HappyHorse 1.1 视频生成模型对接 (Tokendance Gateway / DashScope 异步协议)
 * Base URL: https://tokendance.space (Dev Proxy: /tokendance-api)
 * 协议要点：
 *   - 提交任务: POST /gateway/alibaba/happyhorse/v1/video-synthesis  (必须带 X-DashScope-Async: enable)
 *       body: { model: "happyhorse-1.1-t2v", input: {...}, parameters: { size, duration } }
 *       resp: { output: { task_id, task_status: "PENDING" } }
 *   - 查询任务: GET /gateway/alibaba/happyhorse/v1/tasks/{task_id}
 *       resp: { output: { task_status, video_url } }
 * output.task_status 取值: PENDING / RUNNING / SUCCEEDED / FAILED / CANCELED / UNKNOWN
 * 任务成功后 output.video_url 为带签名的视频下载地址 (有效期 24 小时)。
 * 重要: 创建接口无客户端幂等键，网络超时后禁止自动重试 POST，否则可能重复创建并计费。
 * 注意: API Key 仅通过 .env (VITE_HAPPYHORSE_API_KEY) 注入，禁止在前端源码硬编码。
 */

const DEFAULT_HAPPYHORSE_BASE_URL = 'https://tokendance.space';

/** 读取 HappyHorse 网关密钥（优先专用变量，回退同网关其它变量） */
function getApiKey(): string {
  return (
    import.meta.env.VITE_HAPPYHORSE_API_KEY ||
    import.meta.env.VITE_WAN3_API_KEY ||
    import.meta.env.VITE_MINIMAX_API_KEY ||
    ''
  );
}

/** 候选基础地址：代理前缀优先，最后回退直连，兼容开发/生产环境 */
function getCandidateBaseUrls(): string[] {
  const envUrl = import.meta.env.VITE_HAPPYHORSE_BASE_URL;
  const urls: string[] = [];
  if (envUrl) urls.push(envUrl.replace(/\/+$/, ''));
  urls.push('/tokendance-api');
  urls.push(DEFAULT_HAPPYHORSE_BASE_URL);
  return Array.from(new Set(urls));
}

export interface HappyHorseVideoPayload {
  /** 画面描述提示词 */
  prompt: string;
  /** 视频时长（秒），实测支持 3~15 */
  duration?: number;
  /** 分辨率档位（用于 size 映射），例如 720P / 1080P */
  resolution?: string;
  /** 宽高比（用于 size 映射），例如 16:9 / 9:16 / 1:1 / 4:3 / 3:4 */
  ratio?: string;
  /** 直接指定 size（形如 1280*720），优先级高于 resolution+ratio 映射 */
  size?: string;
  /** 图生视频：单张参考图 URL（对应 input.img_url） */
  img_url?: string;
  /** 参考生视频：多张参考图 URL 列表（对应 input.ref_images_url） */
  ref_images_url?: string[];
  /** 视频编辑：源视频 URL（对应 input.video_url） */
  video_url?: string;
}

export interface HappyHorseSubmitResult {
  task_id: string;
}

export type HappyHorseQueryStatus = 'success' | 'processing' | 'queued' | 'failed';

export interface HappyHorseQueryResult {
  status: HappyHorseQueryStatus;
  video_url?: string;
  error?: string;
  progress?: number;
  outcome?: { video_url?: string; thumbnail_image_url?: string };
}

/**
 * 将 UI 的「分辨率档位 + 宽高比」映射为 HappyHorse 的 size（宽*高）。
 * 实测受支持：720p/1080p × {16:9,9:16,1:1,4:3,3:4}，非法组合回退 1280*720。
 */
function mapSize(resolution: string | undefined, ratio: string | undefined): string {
  if (resolution === '1080P' || resolution === '1080p') {
    switch (ratio) {
      case '9:16': return '1080*1920';
      case '1:1': return '1080*1080';
      case '4:3': return '1440*1080';
      case '3:4': return '1080*1440';
      case '16:9':
      default: return '1920*1080';
    }
  }
  // 默认 720p 档
  switch (ratio) {
    case '9:16': return '720*1280';
    case '1:1': return '720*720';
    case '4:3': return '960*720';
    case '3:4': return '720*960';
    case '16:9':
    default: return '1280*720';
  }
}

/** 时长守卫：夹取到模型支持的 [3, 15] 秒 */
function clampDuration(raw?: number): number {
  const d = Number(raw) || 5;
  if (d < 3) return 3;
  if (d > 15) return 15;
  return Math.round(d);
}

/**
 * 提交 HappyHorse 1.1 视频生成任务。
 * 遵循文档幂等性告警：仅在端点未路由 (404/405) 时切换候选地址，
 * 网络异常或超时不自动重试 POST，避免重复创建计费。
 */
export async function submitHappyHorseVideo(
  payload: HappyHorseVideoPayload,
): Promise<HappyHorseSubmitResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 HappyHorse API Key (VITE_HAPPYHORSE_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();

  const size = payload.size && /^\d+\*\d+$/.test(payload.size)
    ? payload.size
    : mapSize(payload.resolution, payload.ratio);

  const input: Record<string, unknown> = {
    prompt: payload.prompt || '生成一段精致带货短视频',
  };
  if (payload.img_url) input.img_url = payload.img_url;
  if (payload.ref_images_url && payload.ref_images_url.length > 0) {
    input.ref_images_url = payload.ref_images_url;
  }
  if (payload.video_url) input.video_url = payload.video_url;

  const requestBody = {
    model: 'happyhorse-1.1-t2v',
    input,
    parameters: {
      size,
      duration: clampDuration(payload.duration),
    },
  };

  for (let i = 0; i < candidateUrls.length; i++) {
    const baseUrl = candidateUrls[i];
    const isLastCandidate = i === candidateUrls.length - 1;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/gateway/alibaba/happyhorse/v1/video-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // HappyHorse (DashScope) 异步协议要求显式声明异步头，否则可能同步阻塞或拒绝
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      // 网络异常/超时可能已在服务端创建任务，禁止重试 POST，直接抛出避免重复计费
      throw new Error(
        `HappyHorse 1.1 提交网络异常（为避免重复计费不自动重试）：${(err as Error).message}`,
      );
    }

    // 端点未路由（404/405）说明该候选地址不可用，可安全切换下一个（未创建任务）
    if ((response.status === 404 || response.status === 405) && !isLastCandidate) {
      console.warn(`[HappyHorse] Base URL ${baseUrl} returned ${response.status}, trying fallback endpoint...`);
      continue;
    }

    const resData = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = resData?.output?.message || resData?.message || resData?.code || JSON.stringify(resData || '');
      throw new Error(`HappyHorse 1.1 API HTTP ${response.status}: ${detail}`);
    }

    const taskId = resData?.output?.task_id || resData?.task_id;
    if (!taskId) {
      throw new Error(`HappyHorse 1.1 提交响应无效: ${JSON.stringify(resData)}`);
    }

    return { task_id: taskId };
  }

  throw new Error('HappyHorse 1.1 视频提交失败（所有端点均不可用）。');
}

/** 将 HappyHorse 原始状态映射为内部统一状态 */
function mapStatus(raw: string): HappyHorseQueryStatus {
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
 * 查询 HappyHorse 1.1 视频生成任务状态（GET 幂等，可安全多端点回退）。
 * 成功时读取 output.video_url 并映射为统一结构。
 */
export async function queryHappyHorseVideo(taskId: string): Promise<HappyHorseQueryResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 HappyHorse API Key (VITE_HAPPYHORSE_API_KEY)');

  const candidateUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/gateway/alibaba/happyhorse/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const isLastCandidate = candidateUrls.indexOf(baseUrl) === candidateUrls.length - 1;

      if ((response.status === 405 || response.status === 404) && !isLastCandidate) {
        console.warn(`[HappyHorse] Query Base URL ${baseUrl} returned ${response.status}, trying fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HappyHorse 查询失败 HTTP ${response.status}: ${errText}`);
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
          error: output?.message || output?.code || 'HappyHorse 1.1 视频生成任务失败',
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

  throw lastError || new Error('HappyHorse 1.1 视频查询失败（所有端点均不可用）。');
}
