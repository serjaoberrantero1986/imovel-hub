import { createClient } from '@supabase/supabase-js';
import { buildGeckoPayload, auditLocation, responseEnvelope, PORTALS } from '../lib/geckoContracts.mjs';

// Vercel serverless function. Nunca enviar o token da GeckoAPI para o navegador.
// Cada requisição pesquisa SOMENTE uma fonte e uma página, após autorização.
const attempts=new Map();
const json=(res,status,data)=>res.status(status)
  .setHeader('Cache-Control','no-store')
  .setHeader('X-Content-Type-Options','nosniff')
  .json(data);
const hasId=value=>typeof value==='string'&&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);

function propertySearchType(raw){
  const map={
    house:'house',condo_house:'house',two_story_house:'two_story_house',
    apartment:'apartment',land:'land',chacara:'farm',farm:'farm',
    penthouse:'penthouse',flat:'flat',kitnet:'kitnet',
    commercial:'commercial_room',commercial_room:'commercial_room',
    warehouse:'warehouse',commercial_point:'commercial_point'
  };
  return map[raw]||null;
}
export function proposalForProperty(property,location,target,page=1,imovelwebUrl=''){
  if(!property||!location||!PORTALS[target])throw Error('Fonte de consulta inválida.');
  const city=String(location.city||'').trim();
  const state=String(location.state||'').trim();
  if(city.length<2||!state)throw Error('O endereço cadastrado não possui cidade e UF válidas.');
  if(!Number.isInteger(page)||page<1||page>3)throw Error('Escolha uma página entre 1 e 3.');
  if(property.purpose!=='sale'&&property.purpose!=='rent')
    throw Error('A pesquisa automática está disponível inicialmente para venda e locação mensal.');
  const kind=propertySearchType(property.type);
  if(!kind)throw Error('Esta tipologia exige uma pesquisa configurada manualmente; não foi cobrada nenhuma consulta.');
  const args={target,type:'plp',page,city,state,propertyType:kind,
    businessType:property.purpose};
  if(target==='imovelweb.com.br')args.url=imovelwebUrl;
  // Busca ampla com filtros estruturados adequados ao portal. O motor de
  // triagem filtrará metragem e outras diferenças localmente sem presumi-las.
  return buildGeckoPayload(args);
}
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Método não permitido.'});
  const token=process.env.GECKO_API_TOKEN;
  const supabaseUrl=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const publicKey=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
  if(!token||!supabaseUrl||!publicKey)return json(res,503,{
    error:'A pesquisa automática ainda não está configurada neste ambiente. O administrador precisa habilitar a integração.'
  });
  const auth=String(req.headers.authorization||'');
  if(!/^Bearer [A-Za-z0-9._~-]+$/.test(auth))
    return json(res,401,{error:'Entre em sua conta profissional para pesquisar.'});
  const bearer=auth.slice(7);
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))
    return json(res,400,{error:'Parâmetros da consulta inválidos.'});
  const {propertyId,assessmentId,target,page=1,imovelwebUrl=''}=req.body;
  if(!hasId(propertyId)||!hasId(assessmentId)||typeof target!=='string'||!PORTALS[target]||
     !Number.isInteger(page)||page<1||page>3||
     typeof imovelwebUrl!=='string'||imovelwebUrl.length>2300)
    return json(res,400,{error:'Imóvel, portal ou página inválidos.'});
  const client=createClient(supabaseUrl,publicKey,{
    auth:{autoRefreshToken:false,persistSession:false},
    global:{headers:{Authorization:'Bearer '+bearer}}
  });
  let user;
  try{
    const {data,error}=await client.auth.getUser(bearer);
    if(error||!data?.user)return json(res,401,{error:'Sua sessão expirou. Entre novamente.'});
    user=data.user;
    const {data:allowed,error:authError}=await client.rpc('can_manage_my_valuations',{p_owner_id:user.id});
    if(authError||allowed!==true)
      return json(res,403,{error:'A pesquisa exige perfil profissional autorizado e autenticação válida.'});
  }catch{
    return json(res,503,{error:'Não foi possível validar sua sessão com segurança.'});
  }
  const now=Date.now();
  const rateKey=user.id;
  const prev=attempts.get(rateKey)||{start:now,count:0};
  if(now-prev.start>=60000){prev.start=now;prev.count=0;}
  prev.count++;attempts.set(rateKey,prev);
  if(attempts.size>2000)attempts.clear();
  if(prev.count>7)return json(res,429,{error:'Limite temporário de consultas. Aguarde antes de pesquisar novamente.'});
  let payload,referenceLocation;
  try{
    const [{data:listing,error:propertyError},{data:assessment,error:assessmentError}]=await Promise.all([
      client.from('properties')
        .select('id,user_id,purpose,type').eq('id',propertyId).eq('user_id',user.id).single(),
      client.from('valuation_assessments')
        .select('id,owner_id,source_property_id,property_type,city,state,property_snapshot')
        .eq('id',assessmentId).eq('owner_id',user.id)
        .eq('source_property_id',propertyId).single()
    ]);
    if(propertyError||assessmentError||!listing||!assessment)
      return json(res,403,{error:'A avaliação não pertence ao titular ou não está vinculada a este imóvel.'});
    // Pesquisar com os mesmos atributos congelados na data de abertura
    // da avaliação, evitando misturar dados atuais com histórico antigo.
    const snap=assessment.property_snapshot||{};
    const propertyForSearch={type:assessment.property_type,purpose:snap.purpose||listing.purpose};
    referenceLocation={city:assessment.city,state:assessment.state};
    payload=proposalForProperty(propertyForSearch,referenceLocation,target,page,imovelwebUrl);
  }catch(e){return json(res,400,{error:e.message||'Não foi possível preparar a pesquisa.'});}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),26000);
  try{
    const response=await fetch('https://api.geckoapi.com.br/v1/extract',{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload),signal:controller.signal
    });
    if(!response.ok)return json(res,response.status===429?429:502,{
      error:response.status===429?'A fonte atingiu o limite de consultas.':
        'O provedor não concluiu a pesquisa. Verifique o saldo e tente novamente.',
      providerStatus:response.status
    });
    const raw=await response.text();
    if(raw.length>5000000)return json(res,502,{error:'A fonte enviou um volume inesperado de dados.'});
    let data;try{data=responseEnvelope(JSON.parse(raw));}catch{data=null;}
    if(!data||typeof data!=='object'||!data.data||typeof data.data!=='object')
      return json(res,502,{error:'O formato da resposta do portal não pôde ser validado.'});
    const body=data.data;
    if(!Array.isArray(body.items))
      return json(res,502,{error:'A fonte não retornou uma lista de anúncios válida.'});
    // Auditoria informativa: NÃO descartar respostas antes de o corretor
    // poder analisar e corrigir informações ausentes ou regiões divergentes.
    const checked=auditLocation(body,referenceLocation.city,referenceLocation.state);
    const maxItems=300;
    return json(res,200,{
      source:target,
      retrievedAt:new Date().toISOString(),
      requestId:typeof data.requestId==='string'?data.requestId:null,
      audit:checked.audit,
      providerItems:body.items.length,
      items:body.items.slice(0,maxItems),
      limited:body.items.length>maxItems
    });
  }catch(e){return json(res,502,{error:e?.name==='AbortError'?
    'O portal demorou demais para responder. As outras fontes continuam disponíveis.':
    'Não foi possível consultar este portal no momento.'});
  }finally{clearTimeout(timeout);}
}
