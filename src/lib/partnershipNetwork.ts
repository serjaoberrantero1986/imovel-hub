import { supabase } from './supabaseClient';

export interface PartnershipRegion {
  id?: string;
  state: 'SP';
  city: string;
  neighborhood?: string | null;
}

export interface PartnershipMember {
  profile_id: string;
  status: 'active' | 'inactive' | 'suspended';
  accepts_sale: boolean;
  accepts_rent: boolean;
  accepts_launch: boolean;
  specialties: PartnershipSpecialty[];
  introduction: string | null;
  joined_at: string;
  updated_at: string;
  notify_opportunities: boolean;
}

export interface PartnershipProfessional {
  profile_id: string;
  name: string;
  avatar_url: string | null;
  creci: string;
  creci_uf: 'SP';
  portal_slug: string | null;
  portal_title: string;
  accepts_sale: boolean;
  accepts_rent: boolean;
  accepts_launch: boolean;
  specialties: PartnershipSpecialty[];
  introduction: string | null;
  regions: PartnershipRegion[];
  connection: { id: string; status: PartnershipConnection['status']; direction: PartnershipConnection['direction'] } | null;
}

export interface PartnershipConnection {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'blocked';
  direction: 'sent' | 'received';
  requested_at: string;
  responded_at: string | null;
  updated_at: string;
  partner: Pick<PartnershipProfessional, 'profile_id' | 'name' | 'avatar_url' | 'creci' | 'creci_uf' | 'portal_slug' | 'portal_title'>;
}

export interface PartnershipNetworkState {
  eligible: boolean;
  member: PartnershipMember | null;
  regions: PartnershipRegion[];
  connections: PartnershipConnection[];
}

export interface PartnershipMembershipInput {
  enabled: boolean;
  acceptsSale: boolean;
  acceptsRent: boolean;
  acceptsLaunch: boolean;
  specialties: PartnershipSpecialty[];
  introduction: string;
  regions: Array<Pick<PartnershipRegion, 'city' | 'neighborhood'>>;
  notifyOpportunities: boolean;
}

export type PartnershipSpecialty = 'capture' | 'marketing' | 'visits' | 'negotiation' | 'documents' | 'closing';

const requireClient = () => {
  if (!supabase) throw new Error('A conexão segura com o portal não está disponível.');
  return supabase;
};

export async function getMyPartnershipNetwork(): Promise<PartnershipNetworkState> {
  const { data, error } = await requireClient().rpc('get_my_partnership_network');
  if (error) throw error;
  return data as unknown as PartnershipNetworkState;
}

export async function saveMyPartnershipMembership(input: PartnershipMembershipInput): Promise<PartnershipNetworkState> {
  const { data, error } = await requireClient().rpc('save_my_partnership_membership', {
    p_enabled: input.enabled,
    p_accepts_sale: input.acceptsSale,
    p_accepts_rent: input.acceptsRent,
    p_accepts_launch: input.acceptsLaunch,
    p_specialties: input.specialties,
    p_introduction: input.introduction,
    p_regions: input.regions.map(region => ({
      state: 'SP',
      city: region.city.trim(),
      neighborhood: region.neighborhood?.trim() || null,
    })),
    p_notify_opportunities: input.notifyOpportunities,
  });
  if (error) throw error;
  return data as unknown as PartnershipNetworkState;
}

export async function searchPartnershipProfessionals(search = '', city = ''): Promise<PartnershipProfessional[]> {
  const { data, error } = await requireClient().rpc('search_partnership_professionals', {
    p_search: search.trim(),
    p_city: city.trim(),
    p_limit: 30,
    p_offset: 0,
  });
  if (error) throw error;
  return (data || []) as unknown as PartnershipProfessional[];
}

export async function requestPartnershipConnection(profileId: string): Promise<void> {
  const { error } = await requireClient().rpc('request_partnership_connection', { p_recipient_id: profileId });
  if (error) throw error;
}

export async function respondPartnershipConnection(connectionId: string, decision: 'accepted' | 'declined'): Promise<void> {
  const { error } = await requireClient().rpc('respond_partnership_connection', {
    p_connection_id: connectionId,
    p_decision: decision,
  });
  if (error) throw error;
}

export async function endPartnershipConnection(connectionId: string): Promise<void> {
  const { error } = await requireClient().rpc('end_partnership_connection', { p_connection_id: connectionId });
  if (error) throw error;
}

export async function blockPartnershipProfessional(profileId: string): Promise<void> {
  const { error } = await requireClient().rpc('block_partnership_professional', { p_profile_id: profileId });
  if (error) throw error;
}

export type PartnershipReportCategory = 'conduct' | 'spam' | 'misleading_profile' | 'unauthorized_contact' | 'other';

export async function reportPartnershipProfessional(input: {
  profileId: string;
  category: PartnershipReportCategory;
  details: string;
  block: boolean;
}): Promise<void> {
  const { error } = await requireClient().rpc('report_partnership_professional', {
    p_profile_id: input.profileId,
    p_category: input.category,
    p_details: input.details.trim(),
    p_block: input.block,
  });
  if (error) throw error;
}

export function partnershipErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message || '');
  if (/MFA verification required/i.test(message)) return 'Confirme a autenticação em duas etapas e tente novamente.';
  if (/Approved and valid CRECI-SP required|Eligible CRECI-SP/i.test(message)) return 'A rede exige CRECI-SP aprovado, válido e uma conta profissional ativa.';
  if (/between one and twenty regions/i.test(message)) return 'Informe entre uma e vinte regiões de atuação.';
  if (/Connection already exists/i.test(message)) return 'Já existe um convite ou uma conexão com este profissional.';
  if (/Active partnership membership required/i.test(message)) return 'Ative sua participação na rede antes de continuar.';
  if (/Invalid report details/i.test(message)) return 'Descreva o ocorrido usando entre 20 e 2.000 caracteres.';
  return 'Não foi possível concluir a operação. Tente novamente em instantes.';
}
