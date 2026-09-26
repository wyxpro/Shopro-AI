import { createClient } from 'npm:@supabase/supabase-js@2';
import { Aes } from 'npm:wechatpay-axios-plugin';
import { handleCorsPreflight, getCorsHeaders } from '../_shared/cors.ts';

async function decryptTradeState(
  MCH_API_V3_KEY: string,
  associatedData: string,
  nonce: string,
  ciphertext: string,
): Promise<{ status: string; order_no: string }> {
  const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associatedData);
  const obj = JSON.parse(plaintext);
  return {
    status: (obj.trade_state ?? '').toString() === 'SUCCESS' ? 'SUCCESS' : 'OTHERS',
    order_no: obj.out_trade_no ?? '',
  };
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  // 1. 微信支付头部校验与防重放窗口（5分钟）
  const timestamp = req.headers.get('wechatpay-timestamp') || '';
  const nonce = req.headers.get('wechatpay-nonce') || '';
  const signature = req.headers.get('wechatpay-signature') || '';
  const serial = req.headers.get('wechatpay-serial') || '';

  if (!timestamp || !nonce || !signature) {
    console.error('[webhook] 缺少微信支付签名头 (timestamp/nonce/signature)');
    return new Response(JSON.stringify({ code: 'FAIL', message: 'Missing WechatPay security headers' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const reqSec = Number(timestamp);
  if (Number.isNaN(reqSec) || Math.abs(nowSec - reqSec) > 300) {
    console.error(`[webhook] 时间戳校验失败防重放拦截: reqTimestamp=${timestamp}, now=${nowSec}`);
    return new Response(JSON.stringify({ code: 'FAIL', message: 'Timestamp replay attack window expired' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ code: 'FAIL', message: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { resource } = body as {
      resource: { algorithm: string; associated_data: string; nonce: string; ciphertext: string };
    };

    if (!resource || !resource.ciphertext) {
      return new Response(JSON.stringify({ code: 'FAIL', message: 'Missing resource ciphertext' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const MCH_API_V3_KEY = Deno.env.get('MCH_API_V3_KEY');
    if (!MCH_API_V3_KEY) {
      console.error('[webhook] MCH_API_V3_KEY 未配置');
      return new Response(JSON.stringify({ code: 'FAIL', message: 'MCH_API_V3_KEY unconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { status, order_no } = await decryptTradeState(
      MCH_API_V3_KEY,
      resource.associated_data,
      resource.nonce,
      resource.ciphertext,
    );

    if (status !== 'SUCCESS' || !order_no) {
      return new Response('ok', { status: 200 });
    }

    // 乐观锁：只有 pending 状态才处理（防重放）
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('order_no', order_no)
      .eq('status', 'pending')
      .select('id, user_id, plan_id, total_amount')
      .maybeSingle();

    if (error || !updated) {
      console.log(`[webhook] 订单 ${order_no} 已处理或不存在，跳过`);
      return new Response('ok', { status: 200 });
    }

    console.log(`[webhook] 订单 ${order_no} 支付成功，开通套餐`);

    // 查询套餐详情
    const { data: plan } = await supabase
      .from('plans')
      .select('id, credits, name, level')
      .eq('id', updated.plan_id)
      .maybeSingle();

    if (plan && updated.user_id) {
      if (plan.level < 0) {
        // 流量加油包逻辑：仅增加积分
        const { data: currentPlan } = await supabase
          .from('user_plans')
          .select('credits_total, plan_id, status')
          .eq('user_id', updated.user_id)
          .maybeSingle();

        const currentCreditsTotal = currentPlan?.credits_total || 0;
        
        await supabase.from('user_plans').upsert({
          user_id: updated.user_id,
          credits_total: currentCreditsTotal + plan.credits,
          // 如果没有套餐，默认给个状态
          status: currentPlan?.status || 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // 写入积分日志
        await supabase.from('credit_logs').insert({
          user_id: updated.user_id,
          action: 'booster_purchase',
          amount: plan.credits,
          balance_after: currentCreditsTotal + plan.credits,
        });
      } else {
        // 更新 user_plans：开通套餐 + 重置积分
        const now = new Date();
        const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

        await supabase.from('user_plans').upsert({
          user_id: updated.user_id,
          plan_id: plan.id,
          credits_total: plan.credits,
          credits_used: 0,
          expires_at: expiresAt,
          status: 'active',
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' });

        // 写入积分日志
        await supabase.from('credit_logs').insert({
          user_id: updated.user_id,
          action: 'plan_purchase',
          amount: plan.credits,
          balance_after: plan.credits,
        });
      }
    }

    return new Response(JSON.stringify({ code: 'SUCCESS', message: '成功' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[webhook] error:', e instanceof Error ? e.message : e);
    // 微信支付官方规范：业务内部异常返回 500 以便微信发起重试，避免静默失败
    return new Response(JSON.stringify({ code: 'FAIL', message: e instanceof Error ? e.message : 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
