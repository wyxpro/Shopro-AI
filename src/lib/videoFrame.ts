/**
 * Video First-Frame Snapshot Extractor
 * Captures first frame (t=0.1s) from video URL using HTML5 Canvas
 */
export async function extractVideoFirstFrame(videoUrl: string): Promise<string> {
  const meta = await extractVideoMeta(videoUrl);
  return meta ? meta.frame : '';
}

/**
 * 提取视频首帧与真实分辨率元数据（用于素材列表封面/分辨率精准对齐）
 */
export async function extractVideoMeta(videoUrl: string): Promise<{ frame: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!videoUrl) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const timer = setTimeout(() => {
      video.remove();
      resolve(null);
    }, 3500);

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const meta = { frame: dataUrl, width: video.videoWidth || canvas.width, height: video.videoHeight || canvas.height };
          video.remove();
          resolve(meta);
          return;
        }
      } catch (err) {
        console.warn('Canvas first frame extraction failed:', err);
      }
      video.remove();
      resolve(null);
    };

    video.onerror = () => {
      clearTimeout(timer);
      video.remove();
      resolve(null);
    };

    video.src = videoUrl;
  });
}

// 视频与本地真实首帧封面映射字典 (完美匹配真实第一帧图片，数据库刷新永远有效)
export const VIDEO_COVER_MAP: Record<string, string> = {
  '/Video/CreatOK_2.mp4': '/person/girl1.png',
  '/Video/CreatOK_4.mp4': '/person/boy1.png',
  '/Video/CreatOK_7.mp4': '/person/girl2.png',
  '/Video/CreatOK_8.mp4': '/person/boy2.png',
  '/Video/CreatOK_10.mp4': '/person/girl3.png',
  '/Video/CreatOK_6.mp4': '/person/boy3.png',
  '/Video/CreatOK_9.mp4': '/person/girl4.png',
  '/Video/CreatOK_11.mp4': '/person/girl5.png',
  '/Video/CreatOK_5.mp4': '/person/girl1.png',
};

export async function getVideoCoverImage(videoUrl: string, avatarImage?: string, firstFrame?: string): Promise<string> {
  // 1. 首选：直接从成片 Canvas 抽取真实第一帧（保证封面就是视频本身画面）
  const extracted = await extractVideoFirstFrame(videoUrl);
  if (extracted && extracted.startsWith('data:image')) {
    return extracted;
  }

  // 2. 用户在工作台上传的首帧图：它本身就是成片的起始画面，等价于真实首帧
  if (firstFrame && firstFrame.startsWith('data:image')) return firstFrame;

  // 3. 本地演示视频与真实首帧画面的映射兼容（Canvas 因浏览器安全策略提取失败时的等效画面）
  if (videoUrl && VIDEO_COVER_MAP[videoUrl]) {
    return VIDEO_COVER_MAP[videoUrl];
  }

  // 4. 数字人头像兜底（头像即视频主体形象），并确保永远是合法 image 绝非 .mp4 视频文件
  return avatarImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
}
