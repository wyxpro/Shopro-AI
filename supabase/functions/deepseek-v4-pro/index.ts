import { handleCorsPreflight, getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { unauthorizedResponse, errorResponse } from '../_shared/errors.ts';

// 结构化容灾审计日志：记录命中的供应商、耗时与降级链路，供容灾审计
function logProviderSwitch(event: string, detail: Record<string, unknown>) {
  console.log(JSON.stringify({
    fn: 'deepseek-v4-pro',
    event,
    ts: new Date().toISOString(),
    ...detail,
  }));
}

function streamResponse(body: ReadableStream, provider: string, model: string, latencyMs: number, req?: Request): Response {
  return new Response(body, {
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'X-AI-Provider': provider,
      'X-AI-Model': model,
      'X-AI-Latency-Ms': String(latencyMs),
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // 强制 JWT 鉴权
  const auth = await authenticateRequest(req);
  if (auth.error) {
    return unauthorizedResponse(auth.error, req);
  }

  let messages: Array<{ role: string; content: string }>;
  let temperature = 0;
  let max_tokens = 1000;

  try {
    const body = await req.json();
    messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Missing or invalid messages');
    }
    if (body.temperature !== undefined) {
      temperature = Number(body.temperature);
    }
    if (body.max_tokens !== undefined) {
      max_tokens = Number(body.max_tokens);
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Invalid request body: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('API_KEY') || '';
  const baseUrl = Deno.env.get('DEEPSEEK_BASE_URL') || 'https://ai.dxkp.com/v1';
  const reqStart = Date.now();

  // 1. Try dxkp endpoint first
  if (apiKey) {
    const nodeStart = Date.now();
    try {
      const upstream = await fetch(
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'DeepSeek-V4-Flash',
            messages,
            temperature,
            max_tokens,
            stream: true,
          }),
        }
      );

      if (upstream.ok && upstream.body) {
        const latency = Date.now() - nodeStart;
        logProviderSwitch('provider_hit', { provider: 'dxkp', model: 'DeepSeek-V4-Flash', latency_ms: latency, total_ms: Date.now() - reqStart });
        return streamResponse(upstream.body, 'dxkp', 'DeepSeek-V4-Flash', latency);
      }

      logProviderSwitch('provider_fallback', { provider: 'dxkp', status: upstream.status, latency_ms: Date.now() - nodeStart, next: 'siliconflow' });
    } catch (dxkpErr) {
      logProviderSwitch('provider_error', { provider: 'dxkp', error: String(dxkpErr), latency_ms: Date.now() - nodeStart, next: 'siliconflow' });
    }
  } else {
    logProviderSwitch('provider_skipped', { provider: 'dxkp', reason: 'missing DEEPSEEK_API_KEY' });
  }

  // 2. SiliconFlow Fallback (High Availability Node) —— 密钥仅从 Deno secrets 读取，绝不硬编码兜底
  const siliconKey = Deno.env.get('SILICONFLOW_API_KEY') || '';
  if (!siliconKey) {
    logProviderSwitch('all_providers_unavailable', { reason: 'missing SILICONFLOW_API_KEY and DEEPSEEK_API_KEY', total_ms: Date.now() - reqStart });
    return new Response(
      JSON.stringify({ error: 'AI 服务未配置密钥，请在 Supabase Secrets 中配置 DEEPSEEK_API_KEY / SILICONFLOW_API_KEY。' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const siliconModels = ['deepseek-ai/DeepSeek-V4-Flash', 'deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct'];

  for (const modelName of siliconModels) {
    const nodeStart = Date.now();
    try {
      const sfUpstream = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${siliconKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature,
          max_tokens,
          stream: true,
        }),
      });

      if (sfUpstream.ok && sfUpstream.body) {
        const latency = Date.now() - nodeStart;
        logProviderSwitch('provider_hit', { provider: 'siliconflow', model: modelName, latency_ms: latency, total_ms: Date.now() - reqStart });
        return streamResponse(sfUpstream.body, 'siliconflow', modelName, latency);
      }
      logProviderSwitch('provider_fallback', { provider: 'siliconflow', model: modelName, status: sfUpstream.status, latency_ms: Date.now() - nodeStart });
    } catch (sfErr) {
      logProviderSwitch('provider_error', { provider: 'siliconflow', model: modelName, error: String(sfErr), latency_ms: Date.now() - nodeStart });
    }
  }

  logProviderSwitch('all_providers_failed', { total_ms: Date.now() - reqStart });
  return new Response(
    JSON.stringify({ error: 'DeepSeek service unavailable on all providers. Please try again later.' }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
