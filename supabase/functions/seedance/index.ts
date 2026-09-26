// Seedance Video Generation Edge Function (JWT Protected)
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

  // 1. 统一 JWT 身份校验，杜绝公网裸刷
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Missing Authorization Bearer token' }),
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
      JSON.stringify({ error: 'Unauthorized: Invalid or expired credentials' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Invalid JSON body: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { action } = body;
  if (!action || (action !== 'create' && action !== 'query')) {
    return new Response(
      JSON.stringify({ error: 'Action must be either "create" or "query"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = Deno.env.get('VECTRUST_API_KEY') || Deno.env.get('SEEDANCE_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing VECTRUST_API_KEY in environment secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (action === 'create') {
    const {
      prompt,
      first_frame,
      last_frame,
      duration = 8,
      resolution = '720p',
      ratio = '16:9',
      seed,
      watermark = false,
      generate_audio = true,
      web_search = false,
      reference_images = [],
      reference_videos = [],
      reference_audios = [],
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalPrompt = prompt;
    if (!finalPrompt.includes('--resolution')) {
      finalPrompt += ` --resolution ${resolution}`;
    }
    if (!finalPrompt.includes('--duration')) {
      finalPrompt += ` --duration ${duration}`;
    }
    if (!finalPrompt.includes('--aspect_ratio') && !finalPrompt.includes('--ratio')) {
      finalPrompt += ` --aspect_ratio ${ratio}`;
    }

    const requestBody: any = {
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: finalPrompt,
      watermark: Boolean(watermark),
    };

    if (first_frame) {
      requestBody.first_frame = first_frame;
    }
    if (last_frame) {
      requestBody.last_frame = last_frame;
    }
    if (reference_images && reference_images.length > 0) {
      requestBody.input_image_url = reference_images;
    }

    const upstream = await fetch(
      'https://draw.openai-next.com/v1/video/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status} - ${errText}` }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resData = await upstream.json();
    const requestId = resData.id || resData.task_id || resData.request_id;
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: `Invalid response from Vectrust upstream: ${JSON.stringify(resData)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ request_id: requestId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    // action === 'query'
    const { request_id } = body;
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing request_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const upstream = await fetch(
      `https://draw.openai-next.com/v1/tasks/${request_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status} - ${errText}` }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resData = await upstream.json();
    const status = resData.status;
    let mappedResponse: any = {};

    if (status === 'completed' || status === 'succeeded' || status === 'success') {
      const videoUrl = resData.result_url || resData.result?.data?.content?.video_url || resData.video_url;
      mappedResponse = {
        status: 'success',
        video_url: videoUrl,
        outcome: {
          video_url: videoUrl,
          thumbnail_image_url: resData.result?.data?.content?.thumbnail_image_url || resData.thumbnail_url || (videoUrl ? `${videoUrl}?vframe/jpg/offset/1` : ''),
        }
      };
    } else if (status === 'failed' || status === 'cancelled') {
      mappedResponse = {
        status: 'failed',
        error: resData.error_message || resData.error || 'Video generation task failed.',
      };
    } else {
      mappedResponse = {
        status: 'processing',
      };
    }

    return new Response(JSON.stringify(mappedResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
