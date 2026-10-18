import { supabase } from '../supabaseClient';

export type ValuationPropertyType = 'house' | 'apartment' | 'land' | 'commercial' | 'other';
export type ValuationSourceType = 'olx' | 'facebook_marketplace' | 'real_estate_agency' | 'portal' | 'other';
export type ValuationCoordinateQuality = 'property' | 'street' | 'neighborhood' | 'city' | 'unknown';

export interface ValuationAssessment {
  id: string;
  owner_id: string;
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
>;

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
