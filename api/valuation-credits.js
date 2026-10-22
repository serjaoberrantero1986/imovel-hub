import { createClient } from '@supabase/supabase-js';

// A consulta de saldo não chama /extract e não consome créditos de pesquisa.
// O saldo pertence à conta Gecko compartilhada pela integração, NÃO ao corretor.
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Método não permitido.'});
  const token=process.env.GECKO_API_TOKEN;
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
  if(!token||!url||!key)return res.status(503).json({error:'Consulta de saldo indisponível.'});
  const auth=String(req.headers.authorization||'');
  if(!/^Bearer [A-Za-z0-9._~-]+$/.test(auth))
    return res.status(401).json({error:'Faça login para visualizar o saldo.'});
  const jwt=auth.slice(7);
  try{
    const client=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false},
      global:{headers:{Authorization:'Bearer '+jwt}}});
    const {data,error}=await client.auth.getUser(jwt);
    if(error||!data?.user)return res.status(401).json({error:'Sessão expirada.'});
    const {data:allowed,error:permissionError}=await client.rpc(
      'can_manage_my_valuations',{p_owner_id:data.user.id}
    );
    if(permissionError||allowed!==true)
      return res.status(403).json({error:'Apenas profissionais autorizados podem consultar o saldo.'});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    let upstream;
    try{
      upstream=await fetch('https://api.geckoapi.com.br/v1/me/credits',{
        method:'GET',headers:{Authorization:'Bearer '+token},signal:controller.signal
      });
    }finally{clearTimeout(timeout);}
    if(!upstream.ok)return res.status(502).json({error:'Não foi possível consultar o saldo no provedor.'});
    const raw=await upstream.json();
    const credits=Number(raw?.currentCredits);
    if(!Number.isFinite(credits)||credits<0)
      return res.status(502).json({error:'O provedor não retornou saldo válido.'});
    return res.status(200).json({
      currentCredits:credits,updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:null,
      sharedProviderAccount:true,
      // Estimativa inicial para PLP; somente Imovelweb confirma 1 crédito na documentação.
      // Os demais podem variar. Custo efetivo é apurado pelo saldo antes/depois.
      estimatedCreditsPerRequest:1,
      costsAreEstimates:true
    });
  }catch{
    return res.status(502).json({error:'Saldo temporariamente indisponível.'});
  }
}
