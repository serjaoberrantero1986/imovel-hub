// @ts-nocheck — compilado pelo runtime Deno das Edge Functions do Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin=(origin:string|null)=>origin&&/^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(origin)?origin:'https://webimoveis.site';
const corsHeaders=(origin:string|null)=>({
  'Access-Control-Allow-Origin':allowedOrigin(origin),
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
});

Deno.serve(async request=>{
  const cors=corsHeaders(request.headers.get('Origin'));
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return new Response(JSON.stringify({error:'Método não permitido'}),{status:405,headers:{...cors,'Content-Type':'application/json'}});
  try{
    const auth=request.headers.get('Authorization');
    if(!auth?.startsWith('Bearer '))throw new Error('Autenticação necessária.');
    const body=await request.json();
    const visitId=typeof body?.visitId==='string'?body.visitId:'';
    if(!/^[0-9a-f-]{36}$/i.test(visitId))throw new Error('Visita inválida.');
    const url=Deno.env.get('SUPABASE_URL');const anon=Deno.env.get('SUPABASE_ANON_KEY');const resendKey=Deno.env.get('RESEND_API_KEY');const from=Deno.env.get('PARTNERSHIP_OTP_FROM_EMAIL');
    if(!url||!anon||!resendKey||!from)throw new Error('Canal de e-mail não configurado.');
    const supabase=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:code,error}=await supabase.rpc('issue_partnership_visit_otp',{p_visit_id:visitId});
    if(error)throw error;
    const {data:recipient,error:recipientError}=await supabase.rpc('get_partnership_visit_otp_recipient',{p_visit_id:visitId});
    if(recipientError||typeof recipient!=='string')throw recipientError||new Error('Destinatário sem e-mail configurado.');
    // A RPC entrega o código somente a esta função; ele nunca é persistido nem registrado em logs.
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[recipient],subject:'Código seguro para confirmar visita — Web Imóveis',text:`Seu código de confirmação de visita é ${String(code)}. Ele expira em 10 minutos e só pode ser usado uma vez.`,html:`<p>Seu código de confirmação de visita:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${String(code).replace(/[^0-9]/g,'')}</p><p>Expira em 10 minutos e só pode ser usado uma vez.</p>`})});
    if(!response.ok)throw new Error('Não foi possível enviar o e-mail de confirmação.');
    return new Response(JSON.stringify({sent:true}),{headers:{...cors,'Content-Type':'application/json'}});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'Não foi possível enviar o código.'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});}
});
