// @ts-nocheck — executado no runtime Deno do Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    if(body.action==='status')return reply({configured:Boolean(resendKey&&from)});
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
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json','Idempotency-Key':'visit-'+visitId+'-'+hash},
      signal:AbortSignal.timeout(15000),body:JSON.stringify({from,to:[recipient.email],subject:'Confirme sua presença na visita — '+String(recipient.brand||'Web Imóveis').replace(/[\r\n]/g,' ').slice(0,100),
        text:'Seu código é '+code+'. Válido por 10 minutos, com até cinco tentativas. Use-o somente se estiver presente no imóvel. Não compartilhe o código. Entre na sua própria conta em '+String(recipient.origin||'https://www.webimoveis.site')+'/?visit='+visitId+' para confirmar a presença. Se não solicitou esta visita, ignore este e-mail.'})});
    const {error:finishError}=await admin.rpc('finish_property_visit_code_delivery',{p_visit_id:visitId,p_hash:hash,p_sent:response.ok});
    if(!response.ok||finishError)return reply({error:'VISIT_EMAIL_UNAVAILABLE'},502);
    return reply({sent:true});
  } catch {
    if(admin&&visitId&&hash)await admin.rpc('finish_property_visit_code_delivery',{p_visit_id:visitId,p_hash:hash,p_sent:false});
    return reply({error:'VISIT_EMAIL_UNAVAILABLE'},503);
  }
});
