// SiliconFlow Audio Edge Function (JWT Protected)
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // 统一 JWT 鉴权
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );
  const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
  if (authErr || !authData?.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'tts'; // 'asr' or 'tts'

  const apiKey = Deno.env.get('SILICONFLOW_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing SILICONFLOW_API_KEY in environment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const baseUrl = Deno.env.get('SILICONFLOW_BASE_URL') || 'https://api.siliconflow.cn/v1';

  try {
    if (action === 'asr') {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'Missing file in formData' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const upstreamFormData = new FormData();
      upstreamFormData.append('file', file);
      upstreamFormData.append('model', 'TeleAI/TeleSpeechASR');

      const upstream = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: upstreamFormData,
      });

      const data = await upstream.text();
      return new Response(data, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const body = await req.json();
      const { input, voice = 'fnlp/MOSS-TTSD-v0.5:alex', response_format = 'mp3' } = body;

      if (!input) {
        return new Response(
          JSON.stringify({ error: 'Missing input text' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const upstream = await fetch(`${baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'FunAudioLLM/CosyVoice2-0.5B',
          input,
          voice,
          response_format,
          stream: false,
        }),
      });

      if (!upstream.ok) {
        const errText = await upstream.text();
        return new Response(errText, {
          status: upstream.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const audioBuffer = await upstream.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
