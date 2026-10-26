// @ts-nocheck — runtime Deno do Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const corsHeaders=(origin:string|null)=>({
  'Access-Control-Allow-Origin':origin&&/^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(origin)?origin:'https://www.webimoveis.site',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-mortgage-cron-secret',
  'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'
});
const clean=(value:unknown)=>String(value??'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const rate=(value:unknown)=>{const n=Number(String(value).replace(',','.'));return Number.isFinite(n)&&n>=0&&n<=100?n/100:null;};
const message=(error:unknown)=>error instanceof Error?error.message:'Falha inesperada';

async function authenticate(request:Request,admin:any){
  const cronSecret=Deno.env.get('MORTGAGE_RATE_SYNC_SECRET');
  if(cronSecret&&request.headers.get('x-mortgage-cron-secret')===cronSecret)return {trigger:'scheduled',userId:null};
  const databaseCronSecret=request.headers.get('x-mortgage-cron-secret');
  if(databaseCronSecret){
    const {data:valid}=await admin.rpc('verify_mortgage_rate_sync_secret',{candidate:databaseCronSecret});
    if(valid)return {trigger:'scheduled',userId:null};
  }
  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))throw new Error('RATE_SYNC_AUTH');
  const token=authorization.slice(7);
  if(token===Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))return {trigger:'scheduled',userId:null};
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw new Error('RATE_SYNC_AUTH');
  const {data:profile}=await admin.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
  if(profile?.role!=='admin')throw new Error('RATE_SYNC_ADMIN');
  return {trigger:'manual',userId:data.user.id};
}

async function readBcb(source:any){
  const config=source.parser_config||{},filter=[
    config.cnpj8?`cnpj8 eq '${String(config.cnpj8).replaceAll("'","''")}'`:null,
    config.modality_match?`Modalidade eq '${String(config.modality_match).replaceAll("'","''")}'`:null
  ].filter(Boolean).join(' and ');
  const join=source.url.includes('?')?'&':'?';
  const url=source.url+join+'%24format=json&%24orderby=anoMes%20desc&%24top=12'+(filter?'&%24filter='+encodeURIComponent(filter):'');
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Fonte respondeu HTTP ${response.status}`);
  const body=await response.json(),rows=Array.isArray(body?.value)?body.value:[];
  const wanted=String(config.institution_match||'').toUpperCase();
  const row=rows.find((item:any)=>!wanted||String(item.InstituicaoFinanceira||item.instituicaoFinanceira||item.Instituicao||'').toUpperCase().includes(wanted));
  if(!row)throw new Error('Instituição não encontrada na resposta do Banco Central');
  const raw=row.TaxaJurosAoAno??row.taxaJurosAoAno??row.TaxaAnual??row.taxaAnual;
  const annual=rate(raw);
  if(annual===null)throw new Error('Taxa anual não identificada na resposta do Banco Central');
  return {annualRate:annual,snapshot:{reference:row.anoMes||row.Mes||null,modality:row.Modalidade||null,institution:row.InstituicaoFinanceira||wanted,raw_rate:raw}};
}

async function readOfficialPage(source:any){
  const response=await fetch(source.url,{headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'WebImoveisRateMonitor/1.0 (+https://www.webimoveis.site)'},redirect:'follow',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Fonte respondeu HTTP ${response.status}`);
  const html=await response.text(),text=clean(html).slice(0,500000),config=source.parser_config||{};
  for(const required of config.required||[])if(!text.toLocaleLowerCase('pt-BR').includes(String(required).toLocaleLowerCase('pt-BR')))throw new Error(`Conteúdo esperado não encontrado: ${required}`);
  if(!config.rate_regex)throw new Error('Regra de leitura não configurada');
  const match=text.match(new RegExp(config.rate_regex,'i')),annual=rate(match?.[1]);
  if(annual===null)throw new Error('Taxa não localizada na página oficial');
  return {annualRate:annual,snapshot:{matched_text:match?.[0]?.slice(0,240),final_url:response.url}};
}

Deno.serve(async request=>{
  const headers=corsHeaders(request.headers.get('Origin')),reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return reply({});
  if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!serviceKey)return reply({error:'Serviço de atualização não configurado.'},503);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  let auth;
  try{auth=await authenticate(request,admin);}catch(error){return reply({error:message(error)},403);}
  let body:any={};try{body=await request.json();}catch{}
  const trigger=body.sourceId?'single_source':auth.trigger;
  const {data:run,error:runError}=await admin.from('mortgage_rate_sync_runs').insert({trigger_type:trigger,requested_by:auth.userId}).select('id').single();
  if(runError)return reply({error:'Não foi possível iniciar a atualização.'},500);
  try{
    let query=admin.from('mortgage_rate_sources').select('*, mortgage_products!inner(id,name,mortgage_institutions!inner(name))').eq('active',true).order('priority');
    query=body.sourceId?query.eq('id',body.sourceId):query.eq('automatic',true);
    const {data:sources,error}=await query;if(error)throw error;
    const results=[];
    for(const source of sources||[]){
      const checkedAt=new Date().toISOString();
      try{
        const extracted=source.source_type==='bcb_odata'?await readBcb(source):await readOfficialPage(source);
        const previous=source.last_value===null||source.last_value===undefined?Number.NaN:Number(source.last_value);
        const delta=Number.isFinite(previous)?Math.abs(extracted.annualRate-previous):0;
        const suspicious=extracted.annualRate<.01||extracted.annualRate>.30||delta>.03;
        if(suspicious){
          await admin.from('mortgage_rate_sources').update({last_checked_at:checkedAt,last_status:'review',last_message:'Variação ou valor fora da faixa automática. Revisão necessária.'}).eq('id',source.id);
          results.push({sourceId:source.id,institution:source.mortgage_products.mortgage_institutions.name,status:'review'});continue;
        }
        const kind=source.source_type==='bcb_odata'?'market_average':'advertised';
        const {data:current}=await admin.from('mortgage_rate_versions').select('id,annual_rate').eq('product_id',source.product_id).eq('rate_kind',kind).eq('status','published').maybeSingle();
        const unchanged=current&&Math.abs(Number(current.annual_rate)-extracted.annualRate)<.000001;
        if(!unchanged){
          if(current)await admin.from('mortgage_rate_versions').update({status:'superseded'}).eq('id',current.id);
          const {error:insertError}=await admin.from('mortgage_rate_versions').insert({product_id:source.product_id,source_id:source.id,annual_rate:extracted.annualRate,rate_kind:kind,status:'published',published_at:checkedAt,verified_at:checkedAt,source_snapshot:extracted.snapshot,created_by:auth.userId});
          if(insertError)throw insertError;
        }
        await admin.from('mortgage_rate_sources').update({last_checked_at:checkedAt,last_success_at:checkedAt,last_status:unchanged?'unchanged':'success',last_message:unchanged?'Fonte consultada; taxa sem alteração.':'Nova taxa publicada.',last_value:extracted.annualRate}).eq('id',source.id);
        results.push({sourceId:source.id,institution:source.mortgage_products.mortgage_institutions.name,status:unchanged?'unchanged':'updated',annualRate:extracted.annualRate});
      }catch(error){
        await admin.from('mortgage_rate_sources').update({last_checked_at:checkedAt,last_status:'failed',last_message:message(error).slice(0,500)}).eq('id',source.id);
        results.push({sourceId:source.id,institution:source.mortgage_products.mortgage_institutions.name,status:'failed',message:message(error)});
      }
    }
    const failed=results.filter(item=>item.status==='failed'||item.status==='review').length,status=failed===0?'success':failed===results.length?'failed':'partial';
    const summary={total:results.length,updated:results.filter(item=>item.status==='updated').length,unchanged:results.filter(item=>item.status==='unchanged').length,failed,results};
    await admin.from('mortgage_rate_sync_runs').update({status,finished_at:new Date().toISOString(),summary}).eq('id',run.id);
    return reply({runId:run.id,status,...summary});
  }catch(error){
    await admin.from('mortgage_rate_sync_runs').update({status:'failed',finished_at:new Date().toISOString(),summary:{error:message(error)}}).eq('id',run.id);
    return reply({error:'Não foi possível concluir a atualização.'},500);
  }
});
