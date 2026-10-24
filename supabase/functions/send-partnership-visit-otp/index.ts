// @ts-nocheck — executado no runtime Deno do Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]||char));
Deno.serve(async request => {
  const origin=request.headers.get('Origin');
  const cors={'Access-Control-Allow-Origin':origin&&/^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(origin)?origin:'https://www.webimoveis.site',
    'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(request.method==='OPTIONS')return reply({});
  if(request.method!=='POST')return reply({error:'VISIT_METHOD'},405);
  let admin,visitId,hash;
  try {
    const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization=request.headers.get('Authorization');
    if(!url||!key||!serviceKey||!authorization?.startsWith('Bearer '))return reply({error:'VISIT_AUTH'},401);
    const client=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const token=authorization.slice(7);
    const {data:userData,error:userError}=await client.auth.getUser(token);
    const {data:claimData,error:claimError}=await client.auth.getClaims(token);
    if(userError||claimError||!userData.user||claimData?.claims?.sub!==userData.user.id)return reply({error:'VISIT_AUTH'},401);
    const body=await request.json();
    const resendKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('PARTNERSHIP_OTP_FROM_EMAIL');
    if(body.action==='status'){
      if(!resendKey||!from)console.warn('visit_email_configuration_incomplete',{resend:Boolean(resendKey),sender:Boolean(from)});
      return reply({configured:Boolean(resendKey&&from)});
    }
    if(!resendKey||!from)return reply({error:'VISIT_EMAIL_UNAVAILABLE'},503);
    visitId=body.visitId;
    if(typeof visitId!=='string'||!uuid.test(visitId))return reply({error:'VISIT_ACCESS'},400);
    // Rejection sampling, sem devolver ou registrar o segredo.
    const bytes=new Uint32Array(1);let random;
    do{crypto.getRandomValues(bytes);random=bytes[0];}while(random>=4294000000);
    const code=String(random%1000000).padStart(6,'0');
    hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),b=>b.toString(16).padStart(2,'0')).join('');
    admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:recipient,error}=await admin.rpc('prepare_property_visit_code',{p_visit_id:visitId,p_actor:userData.user.id,p_aal:claimData.claims.aal||'aal1',p_hash:hash});
    if(error)return reply({error:/^VISIT_[A-Z_]+$/.test(error.message)?error.message:'VISIT_ACCESS'},400);
    const brand=String(recipient.brand||'Web Imóveis').replace(/[\r\n]/g,' ').slice(0,100);
    const origin=String(recipient.origin||'https://www.webimoveis.site').replace(/\/$/,'');
    const confirmationUrl=origin+'/?visit='+visitId;
    const date=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'full',timeStyle:'short'}).format(new Date(recipient.scheduled_at));
    const html=`<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden"><tr><td style="height:8px;background:linear-gradient(90deg,#f00038,#ff7a00)"></td></tr><tr><td style="padding:32px"><p style="margin:0 0 8px;color:#e00038;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(brand)}</p><h1 style="margin:0 0 20px;font-size:26px;line-height:1.2">Confirme sua presença</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.6">Olá, ${escapeHtml(recipient.attendee_name||'cliente')}.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6">Use o código abaixo para confirmar sua presença na visita ao imóvel <strong>${escapeHtml(recipient.property_title||'Imóvel')}</strong>, marcada para <strong>${escapeHtml(date)} (Brasília)</strong>.</p><div style="margin:24px 0;padding:20px;text-align:center;background:#fff1f4;border:1px solid #fecdd6;border-radius:18px"><span style="display:block;margin-bottom:8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase">Código de confirmação</span><strong style="font-size:36px;letter-spacing:8px;color:#d90032">${code}</strong></div><p style="margin:0 0 24px;color:#64748b;font-size:13px;line-height:1.6">Válido por 10 minutos e por uma única confirmação. Use-o somente se estiver presente no imóvel e não compartilhe com terceiros.</p><p style="text-align:center;margin:0 0 24px"><a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;background:#f00038;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px">Abrir minha visita</a></p><p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5">Se você não reconhece este agendamento, ignore esta mensagem. Nenhuma presença é registrada apenas pelo recebimento deste e-mail.</p></td></tr></table></td></tr></table></body></html>`;
    const text='Olá, '+String(recipient.attendee_name||'cliente')+'. Seu código para confirmar a visita a '+String(recipient.property_title||'Imóvel')+' em '+date+' (Brasília) é '+code+'. Válido por 10 minutos e por uma única confirmação. Abra '+confirmationUrl+' para confirmar. Se não reconhece este agendamento, ignore esta mensagem.';
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json','Idempotency-Key':'visit-'+visitId+'-'+hash},
      signal:AbortSignal.timeout(15000),body:JSON.stringify({from,to:[recipient.email],subject:'Confirme sua presença na visita — '+brand,html,text})});
    const {error:finishError}=await admin.rpc('finish_property_visit_code_delivery',{p_visit_id:visitId,p_hash:hash,p_sent:response.ok});
    if(!response.ok||finishError)return reply({error:'VISIT_EMAIL_UNAVAILABLE'},502);
    return reply({sent:true});
  } catch {
    if(admin&&visitId&&hash)await admin.rpc('finish_property_visit_code_delivery',{p_visit_id:visitId,p_hash:hash,p_sent:false});
    return reply({error:'VISIT_EMAIL_UNAVAILABLE'},503);
  }
});
