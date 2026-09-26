/**
 * 自定义模型（兼容 OpenAI Chat Completions API 的服务端点）
 * 配置持久化存储与真实调用工具函数，供工作台视频生成/图片生成使用
 */

export interface CustomModelConfig {
  /** 唯一标识，形如 custom-1690000000000，作为模型下拉的 id */
  key: string;
  /** 模型展示名称（未设置时默认显示 Model ID） */
  displayName: string;
  modelId: string;
  /** 完整 URL 服务端点，不以斜杠结尾，调用时自动补充 /chat/completions */
  endpoint: string;
  apiKey: string;
  apiFormat: string;
  createdAt: string;
}

export type CustomModelKind = 'video' | 'image';

export const OPENAI_CHAT_FORMAT = 'OpenAI Chat Completions 格式';

const storageKey = (kind: CustomModelKind) => `custom_models_${kind}`;

export function loadCustomModels(kind: CustomModelKind): CustomModelConfig[] {
  try {
    const saved = localStorage.getItem(storageKey(kind));
    const list = saved ? JSON.parse(saved) : [];
    return Array.isArray(list) ? (list as CustomModelConfig[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomModel(kind: CustomModelKind, cfg: CustomModelConfig): CustomModelConfig[] {
  const next = [...loadCustomModels(kind).filter(m => m.key !== cfg.key), cfg];
  localStorage.setItem(storageKey(kind), JSON.stringify(next));
  return next;
}

export function removeCustomModel(kind: CustomModelKind, key: string): CustomModelConfig[] {
  const next = loadCustomModels(kind).filter(m => m.key !== key);
  localStorage.setItem(storageKey(kind), JSON.stringify(next));
  return next;
}

/** 按模型下拉选中项的 id 查找自定义模型配置（非 custom- 前缀直接判空） */
export function findCustomModel(kind: CustomModelKind, id: string): CustomModelConfig | null {
  if (!id.startsWith('custom-')) return null;
  return loadCustomModels(kind).find(m => m.key === id) ?? null;
}

/** 端点校验：必须为 http(s) 完整 URL 且不以斜杠结尾 */
export function isValidEndpoint(url: string): boolean {
  return /^https?:\/\/[^\s/]+[^\s]*$/i.test(url.trim()) && !url.trim().endsWith('/');
}

export function chatCompletionsUrl(endpoint: string): string {
  return `${endpoint.trim().replace(/\/+$/, '')}/chat/completions`;
}

/** 真实调用自定义模型（OpenAI Chat Completions 兼容），返回 message content 文本 */
export async function invokeCustomChatModel(cfg: CustomModelConfig, prompt: string, systemHint?: string, maxTokens?: number): Promise<string> {
  const res = await fetch(chatCompletionsUrl(cfg.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.modelId,
      messages: [
        ...(systemHint ? [{ role: 'system', content: systemHint }] : []),
        { role: 'user', content: prompt },
      ],
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      stream: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${body.slice(0, 140)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('模型返回内容为空');
  return content.trim();
}

/** 连接测试：以最小请求验证端点 + 密钥 + 模型 ID 可用性 */
export async function testCustomModelConnection(cfg: CustomModelConfig): Promise<string> {
  return invokeCustomChatModel(cfg, '连接测试，请仅回复：OK', undefined, 8);
}

/** 从模型回复中提取第一个图片 URL（markdown 图片优先） */
export function extractImageUrl(content: string): string | null {
  const md = content.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+|data:image\/[^)\s]+)\)/);
  if (md) return md[1];
  const plain = content.match(/(https?:\/\/[^\s)"'<>，。]+|data:image\/[A-Za-z0-9+/=._-]+)/);
  if (plain && /\.(png|jpe?g|webp|gif)|image/i.test(plain[1])) return plain[1];
  return null;
}

/** 从模型回复中提取第一个视频 URL（markdown 链接或裸 URL） */
export function extractVideoUrl(content: string): string | null {
  const md = content.match(/\((https?:\/\/[^)\s]+\.(mp4|webm|mov)[^)]*)\)/);
  if (md) return md[1];
  const plain = content.match(/(https?:\/\/[^\s)"'<>，。]+\.(mp4|webm|mov)[^\s)"'<>，。]*)/);
  return plain ? plain[1] : null;
}
