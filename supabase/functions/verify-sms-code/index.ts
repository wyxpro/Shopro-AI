import { handleCorsPreflight, getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  let sessionId: string, code: string, mobile: string;
  try {
    const body = await req.json();
    sessionId = (body.sessionId || '').trim();
    code = (body.code || '').trim();
    mobile = (body.mobile || '').trim();
    if (!sessionId || !code || !mobile) throw new Error("Missing required fields");
  } catch {
    return errorResponse("Invalid request body: sessionId, code, mobile required", 400, 400, req);
  }

  if (!/^1[3-9]\d{9}$/.test(mobile)) {
    return errorResponse("请输入有效的 11 位中国大陆手机号码", 400, 4001, req);
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    "https://app-bnjgmg2jpu6a-api-Xa6JZxjyqK0a-gateway.appmiaoda.com/v1/code/verify_message_code",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ sessionId, code, mobile }),
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
  return new Response(JSON.stringify(data), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
