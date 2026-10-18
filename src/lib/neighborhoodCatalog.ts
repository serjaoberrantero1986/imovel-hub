import { supabase } from './supabaseClient';
import { getOfficialSpNeighborhoods, getSpMunicipalities } from './partnershipLocations';

/** Catálogo colaborativo: origem oficial separada de sugestões de corretores e ViaCEP. */
export const normalizeNeighborhood = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('pt-BR').replace(/\bjd[.]?\b/g,'jardim')
  .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const comparisonKey=(value:string)=>normalizeNeighborhood(value)
  .replace(/^(jardim|vila|bairro|residencial)\s+/,'');
const editDistance=(a:string,b:string)=>{
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const next=[i];
    for(let j=1;j<=b.length;j++){
      next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    previous=next;
  }
  return previous[b.length];
};
export function searchSimilarNeighborhoods(items:string[],typed:string,limit=15):string[]{
  const query=comparisonKey(typed);
  if(!query)return items.slice(0,limit);
  const ranked=items.map(name=>{
    const target=comparisonKey(name);
    const distance=editDistance(query,target);
    let score=target===query?0:target.startsWith(query)?0.1:target.includes(query)?0.3:distance;
    return {name,score,distance};
  }).filter(row=>row.score<1 || (query.length>=3 && row.distance<=Math.max(2,Math.floor(query.length*0.28))))
    .sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name,'pt-BR'));
  return ranked.slice(0,limit).map(row=>row.name);
}
export async function getAllKnownSpNeighborhoods(municipalityId:number):Promise<string[]>{
  const official=await getOfficialSpNeighborhoods(municipalityId).catch(()=>[] as string[]);
  let added:string[]=[];
  if(supabase){
    const {data,error}=await supabase.from('community_neighborhoods').select('name')
      .eq('municipality_ibge_id',municipalityId).eq('status','active').order('name').limit(3000);
    if(!error) added=(data||[]).map(row=>String(row.name));
  }
  const unique=new Map<string,string>();
  // O nome oficial prevalece quando a mesma grafia normalizada aparece nas duas fontes.
  for(const name of [...added,...official]){
    const key=normalizeNeighborhood(name);
    if(key)unique.set(key,name);
  }
  return [...unique.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
export async function registerNeighborhoodFromInput(
  city:string,state:string,name:string,source:'broker'|'cep'='broker'
):Promise<boolean>{
  if(!supabase||state.toUpperCase()!=='SP'||normalizeNeighborhood(name).length<2)return false;
  const municipalities=await getSpMunicipalities();
  const municipality=municipalities.find(x=>normalizeNeighborhood(x.name)===normalizeNeighborhood(city));
  if(!municipality)return false;
  const existing=await getAllKnownSpNeighborhoods(municipality.id);
  if(existing.some(x=>normalizeNeighborhood(x)===normalizeNeighborhood(name)))return true;
  const {error}=await supabase.rpc('register_community_neighborhood',{
    p_municipality_ibge_id:municipality.id,p_name:name.trim(),p_source:source
  });
  if(error)throw error;
  return true;
}
