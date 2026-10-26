import { supabase, supabaseUrl } from './supabaseClient';
import type { MortgageRate } from './mortgageCalculator';

const n=(value:unknown)=>Number(value)||0;
export async function loadMortgageRates():Promise<MortgageRate[]>{
  if(!supabase)return [];
  const {data,error}=await supabase.rpc('get_public_mortgage_rates');
  if(error)throw error;
  return (Array.isArray(data)?data:[]).map((row:any)=>({institutionId:row.institution_id,institution:row.institution,institutionSlug:row.institution_slug,
    productId:row.product_id,product:row.product,audience:row.audience,indexer:row.indexer,amortizationSystems:row.amortization_systems||[],maxLtv:n(row.max_ltv),incomeCommitment:n(row.income_commitment),minTermMonths:n(row.min_term_months),maxTermMonths:n(row.max_term_months),annualRate:n(row.annual_rate),rateKind:row.rate_kind,verifiedAt:row.verified_at,effectiveFrom:row.effective_from,sourceName:row.source_name,sourceUrl:row.source_url}));
}
export async function loadMortgageAdminData(){
  if(!supabase)throw new Error('Serviço de dados indisponível.');
  const [institutions,products,sources,rates,runs]=await Promise.all([
    supabase.from('mortgage_institutions').select('*').order('display_order'),supabase.from('mortgage_products').select('*,mortgage_institutions(name)').order('name'),
    supabase.from('mortgage_rate_sources').select('*,mortgage_products(name,mortgage_institutions(name))').order('priority'),supabase.from('mortgage_rate_versions').select('*,mortgage_products(name,mortgage_institutions(name)),mortgage_rate_sources(name,url)').order('created_at',{ascending:false}).limit(100),
    supabase.from('mortgage_rate_sync_runs').select('*').order('started_at',{ascending:false}).limit(30)
  ]);
  for(const result of [institutions,products,sources,rates,runs])if(result.error)throw result.error;
  return {institutions:institutions.data||[],products:products.data||[],sources:sources.data||[],rates:rates.data||[],runs:runs.data||[]};
}
export async function saveMortgageSource(source:any){
  if(!supabase)throw new Error('Serviço de dados indisponível.');
  const payload={product_id:source.product_id,name:String(source.name).trim(),source_type:source.source_type,url:String(source.url).trim(),priority:Number(source.priority)||100,automatic:Boolean(source.automatic),active:Boolean(source.active),parser_config:source.parser_config||{}};
  const query=source.id?supabase.from('mortgage_rate_sources').update(payload).eq('id',source.id):supabase.from('mortgage_rate_sources').insert(payload);
  const {error}=await query;if(error)throw error;
}
export async function updateMortgageRates(sourceId?:string){
  if(!supabase)throw new Error('Serviço de dados indisponível.');
  const {data:session}=await supabase.auth.getSession(),token=session.session?.access_token;
  if(!token)throw new Error('Sua sessão expirou. Entre novamente.');
  const response=await fetch(`${supabaseUrl}/functions/v1/update-mortgage-rates`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(sourceId?{sourceId}:{})});
  const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Não foi possível atualizar as taxas.');return body;
}
