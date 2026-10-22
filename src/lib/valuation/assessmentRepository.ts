import type { Property } from '../../types';
import { supabase } from '../supabaseClient';

export type ValuationPropertyType = string;
export type ValuationSourceType = 'olx' | 'facebook_marketplace' | 'real_estate_agency' | 'portal' | 'other';
export type ValuationCoordinateQuality = 'property' | 'street' | 'neighborhood' | 'city' | 'unknown';

export interface ValuationAssessment {
  id: string;
  owner_id: string;
  source_property_id: string | null;
  property_snapshot: Record<string, unknown>;
  advertised_price: number | null;
  title: string;
  property_type: ValuationPropertyType;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  street_number: string;
  land_area: number | null;
  built_area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  condominium: boolean;
  latitude: number | null;
  longitude: number | null;
  coordinate_quality: 'property' | 'unknown';
  notes: string;
  status: 'draft' | 'under_review' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ValuationComparable {
  id: string;
  assessment_id: string;
  owner_id: string;
  source_type: ValuationSourceType;
  source_name: string;
  listing_url: string;
  listing_reference: string | null;
  property_type: ValuationPropertyType;
  asking_price: number;
  land_area: number | null;
  built_area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  condominium: boolean | null;
  latitude: number | null;
  longitude: number | null;
  coordinate_quality: ValuationCoordinateQuality;
  availability: 'active' | 'unknown' | 'sold' | 'withdrawn';
  market_zone_verified: boolean;
  reviewed_by_broker: boolean;
  conflicting_data: boolean;
  multi_unit: boolean;
  unfinished: boolean;
  notes: string;
  usable_area?: number | null;
  total_area?: number | null;
  listing_title?: string;
  listing_city?: string;
  listing_state?: string;
  listing_neighborhood?: string;
  offer_purpose?: 'sale' | 'rent' | 'unknown';
  excluded_by_broker?: boolean;
  exclusion_reason?: string;
  collected_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ValuationAssessmentInput = Pick<ValuationAssessment,
  'title' | 'property_type' | 'state' | 'city' | 'neighborhood' | 'street' | 'street_number' |
  'land_area' | 'built_area' | 'bedrooms' | 'suites' | 'bathrooms' | 'parking_spots' | 'condominium' |
  'latitude' | 'longitude' | 'coordinate_quality' | 'notes'
>;

export type ValuationComparableInput = Pick<ValuationComparable,
  'source_type' | 'source_name' | 'listing_url' | 'listing_reference' | 'property_type' |
  'asking_price' | 'land_area' | 'built_area' | 'bedrooms' | 'suites' | 'bathrooms' | 'parking_spots' |
  'condominium' | 'latitude' | 'longitude' | 'coordinate_quality' | 'availability' |
  'market_zone_verified' | 'reviewed_by_broker' | 'conflicting_data' | 'multi_unit' |
  'unfinished' | 'notes'
> & Partial<Pick<ValuationComparable,
  'usable_area' | 'total_area' | 'listing_title' | 'listing_city' | 'listing_state' |
  'listing_neighborhood' | 'offer_purpose' | 'excluded_by_broker' | 'exclusion_reason' | 'collected_at'
>>;

const requireClient = () => {
  if (!supabase) throw new Error('O serviço de avaliações está indisponível.');
  return supabase;
};

async function requireProfessionalOwner(): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Entre com sua conta profissional para continuar.');
  // Permissões definitivas são aplicadas também pelas políticas RLS no Supabase.
  return data.user.id;
}

export function validateListingUrl(raw: string): string {
  const value = raw.trim();
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || value.length > 2000) {
      throw new Error('Informe um link HTTPS válido, sem credenciais.');
    }
    return url.toString();
  } catch {
    throw new Error('Informe um link HTTPS válido para o anúncio.');
  }
}

export async function listMyValuations(): Promise<ValuationAssessment[]> {
  const owner = await requireProfessionalOwner();
  const { data, error } = await requireClient().from('valuation_assessments')
    .select('*').eq('owner_id', owner).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ValuationAssessment[];
}

export async function createValuation(input: ValuationAssessmentInput): Promise<ValuationAssessment> {
  const owner_id = await requireProfessionalOwner();
  const { data, error } = await requireClient().from('valuation_assessments')
    .insert({ ...input, owner_id }).select('*').single();
  if (error) throw error;
  return data as ValuationAssessment;
}

export async function listValuationComparables(assessmentId: string): Promise<ValuationComparable[]> {
  const owner = await requireProfessionalOwner();
  const { data, error } = await requireClient().from('valuation_comparables')
    .select('*').eq('assessment_id', assessmentId).eq('owner_id', owner)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ValuationComparable[];
}

export async function addValuationComparable(assessmentId: string, input: ValuationComparableInput): Promise<ValuationComparable> {
  const owner_id = await requireProfessionalOwner();
  const { data, error } = await requireClient().from('valuation_comparables')
    .insert({ ...input, listing_url: validateListingUrl(input.listing_url), assessment_id: assessmentId, owner_id })
    .select('*').single();
  if (error) throw error;
  return data as ValuationComparable;
}

export async function updateValuationComparable(
  assessmentId: string, id: string, changes: Partial<ValuationComparableInput>,
): Promise<ValuationComparable> {
  const owner = await requireProfessionalOwner();
  const updates = { ...changes };
  if (changes.listing_url !== undefined) updates.listing_url = validateListingUrl(changes.listing_url);
  const { data, error } = await requireClient().from('valuation_comparables')
    .update(updates).eq('id', id).eq('assessment_id', assessmentId).eq('owner_id', owner)
    .select('*').single();
  if (error) throw error;
  return data as ValuationComparable;
}

/** Histórico exclusivamente do anúncio pertencente ao profissional autenticado. */
export async function listValuationsForProperty(propertyId: string): Promise<ValuationAssessment[]> {
  const owner = await requireProfessionalOwner();
  const { data, error } = await requireClient().from('valuation_assessments')
    .select('*').eq('owner_id', owner).eq('source_property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ValuationAssessment[];
}

/** Captura dados e mídias do anúncio, sem alterar preço, status ou conteúdo publicado. */
export async function createValuationForProperty(property: Property): Promise<ValuationAssessment> {
  const owner = await requireProfessionalOwner();
  if (property.userId !== owner) throw new Error('Somente o responsável pelo anúncio pode avaliá-lo.');
  const snapshot = {
    code: property.code, description: property.description, purpose: property.purpose,
    zipCode: property.zipCode, condoName: property.condoName ?? '',
    features: property.amenities ?? [], media: (property.media ?? [])
      .filter(m => /^https:\/\//i.test(m.url)) // Não duplicar imagens base64 em JSON.
      .map(m => ({
      id:m.id,url:m.url,thumbnailUrl:m.thumbnailUrl,caption:m.caption,mediaType:m.mediaType,
      category:m.category,isCover:m.isCover,order:m.order,
    })),
    videoUrl: property.videoUrl ?? '', totalArea: property.totalArea,
    usefulArea: property.usefulArea, builtArea: property.builtArea ?? null,
    suites: property.suites, condoFee:property.condoFee,
    iptuFee:property.iptuFee, solarOrientation:property.solarOrientation,
    acceptsFinancing:property.acceptsFinancing, acceptsExchange:property.acceptsExchange,
    observedAt: new Date().toISOString(),
  };
  const hasPosition = property.coordinateQuality === 'property' &&
    Number.isFinite(property.latitude) && Number.isFinite(property.longitude);
  const {data,error} = await requireClient().from('valuation_assessments').insert({
    owner_id: owner, source_property_id: property.id, property_snapshot: snapshot,
    advertised_price: property.price >= 0 ? property.price : null,
    title: (property.title || property.code || 'Imóvel em avaliação').slice(0,180),
    property_type: property.type, state: property.state, city: property.city,
    neighborhood: property.neighborhood, street: property.addressStreet,
    street_number: property.addressNumber || '', land_area: property.totalArea || null,
    built_area: property.builtArea || null, bedrooms:property.bedrooms,
    suites:property.suites,bathrooms:property.bathrooms,parking_spots:property.parkingSpots,
    condominium:property.type==='condo_house' || Boolean(property.condoName),
    latitude:hasPosition?property.latitude:null,longitude:hasPosition?property.longitude:null,
    coordinate_quality:hasPosition?'property':'unknown',
    notes:'Avaliação criada a partir do anúncio existente.',
  }).select('*').single();
  if(error)throw error;
  return data as ValuationAssessment;
}


/**
 * Lotes capturados em fontes públicas. Só persistem ofertas com URL HTTPS e
 * preço positivo. Os demais registros são relatados ao operador como descartados,
 * não transformados em ofertas artificiais para satisfazer campos NOT NULL.
 */
export async function addComparablesFromSearch(
  assessmentId: string, proposals: ValuationComparableInput[],
): Promise<{saved:ValuationComparable[];duplicates:number}> {
  const owner_id=await requireProfessionalOwner();
  const client=requireClient();
  const existing=await listValuationComparables(assessmentId);
  const seen=new Set(existing.map(x=>x.listing_url));
  const rows:Record<string,unknown>[]=[];
  let duplicates=0;
  for(const p of proposals){
    const url=validateListingUrl(p.listing_url);
    if(seen.has(url)){duplicates++;continue;}
    if(!Number.isFinite(p.asking_price)||p.asking_price<=0)
      throw new Error('Preço inválido em oferta selecionada para persistência.');
    seen.add(url);
    rows.push({...p,assessment_id:assessmentId,owner_id,listing_url:url});
  }
  const saved:ValuationComparable[]=[];
  for(let i=0;i<rows.length;i+=40){
    const {data,error}=await client.from('valuation_comparables')
      .insert(rows.slice(i,i+40)).select('*');
    if(error)throw new Error('Não foi possível salvar parte dos anúncios da pesquisa: '+error.message);
    saved.push(...(data||[]) as ValuationComparable[]);
  }
  return {saved,duplicates};
}

export async function setComparableExclusion(
  assessmentId:string,id:string,excluded:boolean,reason='',
):Promise<ValuationComparable>{
  if(excluded&&reason.trim().length<8)
    throw new Error('Informe brevemente por que decidiu excluir este anúncio.');
  return updateValuationComparable(assessmentId,id,{
    excluded_by_broker:excluded,
    exclusion_reason:excluded?reason.trim().slice(0,500):''
  });
}

/** Captura primária: qualquer anúncio, com ou sem preço ou endereço verificável. */
export interface ValuationCandidate {
  id:string; assessment_id:string; owner_id:string; source_name:string; source_key:string;
  listing_url:string|null; listing_title:string; normalized_data:Record<string,any>;
  captured_data:Record<string,any>; reviewed_by_broker:boolean; review_note:string;
  excluded_by_broker:boolean; exclusion_reason:string; collected_at:string;
}
export type ValuationCandidateInput=Pick<ValuationCandidate,
  'source_name'|'source_key'|'listing_url'|'listing_title'|'normalized_data'|'captured_data'|'collected_at'>;

export async function listValuationCandidates(assessmentId:string):Promise<ValuationCandidate[]>{
  const owner=await requireProfessionalOwner();
  const {data,error}=await requireClient().from('valuation_candidates').select('*')
    .eq('assessment_id',assessmentId).eq('owner_id',owner)
    .order('collected_at',{ascending:false}).limit(2000);
  if(error)throw error;
  return (data||[]) as ValuationCandidate[];
}
export async function addValuationCandidatesFromSearch(
  assessmentId:string,items:ValuationCandidateInput[]
):Promise<{saved:ValuationCandidate[];alreadyPresent:number}>{
  const owner_id=await requireProfessionalOwner();
  const existing=await listValuationCandidates(assessmentId);
  const seen=new Set(existing.map(x=>x.source_name+'|'+x.source_key));
  const unique:Record<string,unknown>[]=[];
  let alreadyPresent=0;
  for(const item of items){
    const key=item.source_name+'|'+item.source_key;
    if(seen.has(key)){alreadyPresent++;continue;}
    seen.add(key);
    unique.push({...item,owner_id,assessment_id:assessmentId});
  }
  const saved:ValuationCandidate[]=[];
  for(let i=0;i<unique.length;i+=25){
    const {data,error}=await requireClient().from('valuation_candidates')
      .insert(unique.slice(i,i+25)).select('*');
    if(error)throw new Error('Não foi possível preservar os anúncios: '+error.message);
    saved.push(...(data||[]) as ValuationCandidate[]);
  }
  return {saved,alreadyPresent};
}
export async function updateValuationCandidate(
  assessmentId:string,id:string,
  changes:Partial<Pick<ValuationCandidate,
    'normalized_data'|'reviewed_by_broker'|'review_note'|'listing_url'|
    'excluded_by_broker'|'exclusion_reason'>>
):Promise<ValuationCandidate>{
  const owner=await requireProfessionalOwner();
  if(changes.listing_url)validateListingUrl(changes.listing_url);
  const {data,error}=await requireClient().from('valuation_candidates')
    .update({...changes,updated_at:new Date().toISOString()})
    .eq('id',id).eq('assessment_id',assessmentId).eq('owner_id',owner).select('*').single();
  if(error)throw error;
  return data as ValuationCandidate;
}
