import { handleCorsPreflight, getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';

// 手机号频控存储（内存级频控，防止短信轰炸与资费盗刷）
const smsRateLimitMap = new Map<string, { lastSentAt: number; countToday: number; dayString: string }>();

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  let mobile: string;
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    mobile = (body.mobile || '').trim();
    if (!mobile) throw new Error("Missing mobile");
    sessionId = body.sessionId;
  } catch {
    return errorResponse("Invalid request body, mobile is required", 400, 400, req);
  }

  // 1. 严格校验手机号格式（中国大陆 11 位合法手机号）
  if (!/^1[3-9]\d{9}$/.test(mobile)) {
    return errorResponse("请输入有效的 11 位中国大陆手机号码", 400, 4001, req);
  }

  // 2. 频控限制：60 秒冷却时间 & 单日最多 10 次
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const record = smsRateLimitMap.get(mobile) || { lastSentAt: 0, countToday: 0, dayString: todayStr };

  if (record.dayString !== todayStr) {
    record.dayString = todayStr;
    record.countToday = 0;
  }

  if (now - record.lastSentAt < 60000) {
    const waitSec = Math.ceil((60000 - (now - record.lastSentAt)) / 1000);
    return errorResponse(`发送过于频繁，请等待 ${waitSec} 秒后重试`, 429, 4290, req);
  }

  if (record.countToday >= 10) {
    return errorResponse("该手机号今日验证码发送次数已达上限（10次），请明日再试", 429, 4291, req);
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestBody: Record<string, string> = { mobile };
  if (sessionId) requestBody.sessionId = sessionId;

  const upstream = await fetch(
    "https://app-bnjgmg2jpu6a-api-W9z3M74x6ZNL-gateway.appmiaoda.com/v1/code/send_message",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `Upstream error: ${upstream.status}` }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await upstream.json();

  // 更新频控成功计数
  record.lastSentAt = now;
  record.countToday += 1;
  smsRateLimitMap.set(mobile, record);

  return new Response(JSON.stringify(data), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
