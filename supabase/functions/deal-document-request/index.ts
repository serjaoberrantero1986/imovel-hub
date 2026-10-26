// @ts-nocheck — executado no runtime Deno do Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]||char));
const allowedOrigin=(origin:string|null)=>origin&&/^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(origin)?origin:'https://www.webimoveis.site';
const detectFileType=(bytes:Uint8Array)=>{
  if(bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46)return 'application/pdf';
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
  if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a)return 'image/png';
  return null;
};

Deno.serve(async request => {
  const origin=allowedOrigin(request.headers.get('Origin'));
  const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'};
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(request.method==='OPTIONS')return reply({});
  if(request.method!=='POST')return reply({error:'DEAL_METHOD_NOT_ALLOWED'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL'),anonKey=Deno.env.get('SUPABASE_ANON_KEY'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anonKey||!serviceKey)return reply({error:'DEAL_SERVICE_UNAVAILABLE'},503);
    const body=await request.json();
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    if(body.action==='view'){
      const {data,error}=await admin.rpc('get_public_deal_document_request',{p_token:String(body.token||'')});
      if(error)return reply({error:'DEAL_LINK_INVALID'},404);
      return reply(data);
    }
    if(body.action==='upload-url'){
      const {data:requestData,error:requestError}=await admin.rpc('get_public_deal_document_request',{p_token:String(body.token||'')});
      if(requestError)return reply({error:'DEAL_LINK_INVALID'},404);
      const item=(requestData.items||[]).find((entry:any)=>entry.id===body.itemId);
      if(!item||['approved','not_applicable'].includes(item.status))return reply({error:'DEAL_ITEM_INVALID'},400);
      const mime=String(body.mimeType||'');
      const extension=mime==='application/pdf'?'pdf':mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'';
      if(!extension)return reply({error:'DEAL_FILE_INVALID'},400);
      const path=`${requestData.dossier_id}/${item.id}/${crypto.randomUUID()}.${extension}`;
      const {data:signed,error:signedError}=await admin.storage.from('deal-documents').createSignedUploadUrl(path);
      if(signedError||!signed)return reply({error:'DEAL_UPLOAD_UNAVAILABLE'},503);
      return reply({path,token:signed.token});
    }
    if(body.action==='complete-upload'){
      const path=String(body.path||'');
      const {data:file,error:fileError}=await admin.storage.from('deal-documents').download(path);
      if(fileError||!file)return reply({error:'DEAL_UPLOAD_FAILED'},400);
      if(file.size<1||file.size>15*1024*1024){await admin.storage.from('deal-documents').remove([path]);return reply({error:'DEAL_FILE_INVALID'},400);}
      const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
      const detectedMime=detectFileType(bytes);
      if(!detectedMime){await admin.storage.from('deal-documents').remove([path]);return reply({error:'DEAL_FILE_INVALID'},400);}
      const {data,error}=await admin.rpc('complete_public_deal_document_upload',{p_token:String(body.token||''),p_item_id:body.itemId,p_storage_path:path,p_original_name:body.originalName,p_mime_type:detectedMime,p_file_size:file.size});
      if(error){await admin.storage.from('deal-documents').remove([path]);return reply({error:/^DEAL_[A-Z_]+$/.test(error.message)?error.message:'DEAL_UPLOAD_FAILED'},400);}
      return reply({documentId:data});
    }
    if(body.action!=='create')return reply({error:'DEAL_ACTION_INVALID'},400);
    const authorization=request.headers.get('Authorization');
    if(!authorization?.startsWith('Bearer '))return reply({error:'DEAL_AUTH_REQUIRED'},401);
    const client=createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const token=authorization.slice(7);
    const [{data:userData,error:userError},{data:claimData,error:claimError}]=await Promise.all([client.auth.getUser(token),client.auth.getClaims(token)]);
    if(userError||claimError||!userData.user||claimData?.claims?.sub!==userData.user.id)return reply({error:'DEAL_AUTH_REQUIRED'},401);
    const {data:prepared,error:prepareError}=await admin.rpc('prepare_deal_document_request',{
      p_actor:userData.user.id,p_participant_id:body.participantId,p_items:body.items,
      p_instructions:body.instructions||null,p_valid_days:Number(body.validDays||7)
    });
    if(prepareError)return reply({error:/^DEAL_[A-Z_]+$/.test(prepareError.message)?prepareError.message:'DEAL_REQUEST_FAILED'},400);
    const resendKey=Deno.env.get('RESEND_API_KEY');
    const from=Deno.env.get('DOCUMENT_REQUEST_FROM_EMAIL')||Deno.env.get('PARTNERSHIP_OTP_FROM_EMAIL');
    if(!resendKey||!from){await admin.rpc('finish_deal_document_request_delivery',{p_request_id:prepared.request_id,p_sent:false});return reply({error:'DEAL_EMAIL_UNAVAILABLE'},503);}
    const publicUrl=`${origin}/#document_request=${encodeURIComponent(prepared.token)}`;
    const expiry=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'}).format(new Date(prepared.expires_at));
    const html=`<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden"><tr><td style="height:8px;background:linear-gradient(90deg,#f00038,#ff7a00)"></td></tr><tr><td style="padding:32px"><p style="margin:0 0 8px;color:#e00038;font-size:13px;font-weight:700;text-transform:uppercase">Web Imóveis</p><h1 style="margin:0 0 20px;font-size:26px">Documentos solicitados</h1><p style="font-size:16px;line-height:1.6">Olá, ${escapeHtml(prepared.recipient_name)}.</p><p style="font-size:15px;line-height:1.6">Existem documentos pendentes para a negociação do imóvel <strong>${escapeHtml(prepared.property_title)}</strong>. Use o botão abaixo para consultar a lista e anexar os arquivos solicitados.</p><p style="text-align:center;margin:28px 0"><a href="${escapeHtml(publicUrl)}" style="display:inline-block;background:#f00038;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px">Enviar documentos</a></p><p style="color:#64748b;font-size:13px;line-height:1.6">O link é pessoal e válido até ${escapeHtml(expiry)} (Brasília). Não o encaminhe a terceiros.</p></td></tr></table></td></tr></table></body></html>`;
    const emailResponse=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json','Idempotency-Key':`deal-documents-${prepared.request_id}`},signal:AbortSignal.timeout(15000),body:JSON.stringify({from,to:[prepared.recipient_email],subject:`Documentos solicitados — ${prepared.property_title}`,html,text:`Olá, ${prepared.recipient_name}. Acesse ${publicUrl} para enviar os documentos solicitados para ${prepared.property_title}. Link válido até ${expiry} (Brasília). Não encaminhe a terceiros.`})});
    await admin.rpc('finish_deal_document_request_delivery',{p_request_id:prepared.request_id,p_sent:emailResponse.ok});
    if(!emailResponse.ok)return reply({error:'DEAL_EMAIL_UNAVAILABLE'},502);
    return reply({sent:true,requestId:prepared.request_id});
  }catch{return reply({error:'DEAL_SERVICE_UNAVAILABLE'},503);}
});
