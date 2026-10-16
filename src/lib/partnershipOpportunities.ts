import { supabase } from './supabaseClient';

export interface PartnershipOpportunity {
  offer_id: string;
  property_id: string | null;
  property: Record<string, unknown>;
  captor: Record<string, unknown>;
  city: string;
  neighborhood: string | null;
  created_at: string;
}

export async function listPartnershipOpportunities(filters?: { city?: string; neighborhood?: string; purpose?: string }): Promise<PartnershipOpportunity[]> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.rpc('get_partnership_opportunities', {
    p_city: filters?.city?.trim() || null,
    p_neighborhood: filters?.neighborhood?.trim() || null,
    p_purpose: filters?.purpose || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data as PartnershipOpportunity[] : [];
}
