import { supabase } from './supabaseClient';

export type ResponsibleParty = 'captor' | 'partner' | 'both';
export type PartnershipNegotiationStatus = 'proposed' | 'countered' | 'preliminarily_accepted' | 'declined' | 'cancelled' | 'awaiting_contract' | 'active';
export type PartnershipResponsibilityKey =
  | 'owner_relationship' | 'buyer_relationship' | 'visit_scheduling' | 'visit_accompaniment'
  | 'proposal_receipt' | 'proposal_presentation' | 'negotiation' | 'document_review'
  | 'transaction_instrument' | 'signature_closing' | 'key_delivery' | 'honorarium_accountability';

export const PARTNERSHIP_RESPONSIBILITIES: Array<{ key: PartnershipResponsibilityKey; label: string }> = [
  { key: 'owner_relationship', label: 'Relacionamento com o proprietário' },
  { key: 'buyer_relationship', label: 'Relacionamento com comprador ou locatário' },
  { key: 'visit_scheduling', label: 'Agendamento de visitas' },
  { key: 'visit_accompaniment', label: 'Acompanhamento das visitas' },
  { key: 'proposal_receipt', label: 'Recebimento de propostas' },
  { key: 'proposal_presentation', label: 'Apresentação da proposta ao proprietário' },
  { key: 'negotiation', label: 'Negociação' },
  { key: 'document_review', label: 'Coleta e conferência documental' },
  { key: 'transaction_instrument', label: 'Instrumento da transação' },
  { key: 'signature_closing', label: 'Assinatura e fechamento' },
  { key: 'key_delivery', label: 'Entrega de chaves' },
  { key: 'honorarium_accountability', label: 'Prestação de contas dos honorários' },
];

export interface PartnershipTerms {
  id?: string;
  version_number?: number;
  proposed_by?: string;
  captor_share: number;
  partner_share: number;
  duration_kind: 'fixed' | 'indefinite';
  valid_from: string;
  valid_until: string | null;
  termination_notice_days: number;
  original_authorization_exclusive: boolean;
  partnership_exclusive: boolean;
  honorarium_receiver: ResponsibleParty;
  contract_preparer: ResponsibleParty;
  territory_description: string;
  allow_partner_portal: boolean;
  allow_social_media: boolean;
  allow_paid_ads: boolean;
  allow_external_portals: boolean;
  allow_material_adaptation: boolean;
  additional_terms: string | null;
  responsibilities: Record<PartnershipResponsibilityKey, ResponsibleParty>;
}

export interface PartnershipAvailablePartner {
  profile_id: string;
  name: string;
  avatar_url: string | null;
  creci: string;
  creci_uf: 'SP';
  portal_title: string;
  portal_slug: string | null;
  regions: Array<{ city: string; neighborhood: string | null }>;
}

export interface PropertyPartnershipNegotiation {
  id: string;
  partner_id: string;
  status: PartnershipNegotiationStatus;
  current_version_id: string;
  accepted_version_id: string | null;
  updated_at: string;
  partner: { name: string; avatar_url: string | null; creci: string; creci_uf: 'SP' };
  current_terms: PartnershipTerms;
}

export interface PropertyPartnershipWorkspace {
  property: { id: string; code: string; title: string; purpose: string; status: string; is_exclusive: boolean };
  offer: { id: string; status: 'open' | 'closed' | 'cancelled'; partner_limit: number } | null;
  available_partners: PartnershipAvailablePartner[];
  negotiations: PropertyPartnershipNegotiation[];
}

export interface IncomingPartnershipOffer {
  negotiation_id: string;
  status: PartnershipNegotiationStatus;
  updated_at: string;
  offer_id: string;
  partner_limit: number;
  property: { id: string; code: string; title: string; purpose: string; price: number; status: string };
  captor: { profile_id: string; name: string; avatar_url: string | null; creci: string; creci_uf: 'SP' };
  current_terms: PartnershipTerms;
}

export const defaultPartnershipTerms = (exclusive = false): PartnershipTerms => ({
  captor_share: 50,
  partner_share: 50,
  duration_kind: 'indefinite',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: null,
  termination_notice_days: 7,
  original_authorization_exclusive: exclusive,
  partnership_exclusive: false,
  honorarium_receiver: 'captor',
  contract_preparer: 'captor',
  territory_description: 'Estado de São Paulo',
  allow_partner_portal: true,
  allow_social_media: false,
  allow_paid_ads: false,
  allow_external_portals: false,
  allow_material_adaptation: false,
  additional_terms: null,
  responsibilities: Object.fromEntries(PARTNERSHIP_RESPONSIBILITIES.map(item => [item.key, 'both'])) as Record<PartnershipResponsibilityKey, ResponsibleParty>,
});

const requireClient = () => {
  if (!supabase) throw new Error('Supabase unavailable');
  return supabase;
};

export async function getPropertyPartnershipWorkspace(propertyId: string): Promise<PropertyPartnershipWorkspace> {
  const { data, error } = await requireClient().rpc('get_property_partnership_workspace', { p_property_id: propertyId });
  if (error) throw error;
  return data as unknown as PropertyPartnershipWorkspace;
}

export async function savePropertyPartnershipOffer(input: { propertyId: string; partnerIds: string[]; partnerLimit: number; terms: PartnershipTerms }): Promise<PropertyPartnershipWorkspace> {
  const { data, error } = await requireClient().rpc('save_property_partnership_offer', {
    p_property_id: input.propertyId,
    p_partner_ids: input.partnerIds,
    p_partner_limit: input.partnerLimit,
    p_terms: input.terms,
  });
  if (error) throw error;
  return data as unknown as PropertyPartnershipWorkspace;
}

export async function getMyIncomingPartnershipOffers(): Promise<IncomingPartnershipOffer[]> {
  const { data, error } = await requireClient().rpc('get_my_incoming_partnership_offers');
  if (error) throw error;
  return (data || []) as unknown as IncomingPartnershipOffer[];
}

export async function cancelPropertyPartnershipOffer(offerId: string): Promise<void> {
  const { error } = await requireClient().rpc('cancel_property_partnership_offer', { p_offer_id: offerId });
  if (error) throw error;
}

export async function respondPropertyPartnershipNegotiation(input: {
  negotiationId: string;
  expectedVersion: number;
  decision: 'accept' | 'decline' | 'counter';
  counterTerms?: PartnershipTerms | null;
}): Promise<void> {
  const { error } = await requireClient().rpc('respond_property_partnership_negotiation', {
    p_negotiation_id: input.negotiationId,
    p_expected_version: input.expectedVersion,
    p_decision: input.decision,
    p_counter_terms: input.counterTerms || null,
  });
  if (error) throw error;
}

export function propertyPartnershipErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message || '');
  if (/AAL2 required/i.test(message)) return 'Confirme o código do aplicativo autenticador antes de negociar termos de parceria.';
  if (/Only properties in SP/i.test(message)) return 'Somente imóveis localizados no estado de São Paulo podem participar desta primeira etapa.';
  if (/Property status does not allow/i.test(message)) return 'Imóveis vendidos, alugados ou arquivados não podem receber novas ofertas.';
  if (/Eligible CRECI-SP/i.test(message)) return 'Esta operação exige CRECI-SP aprovado e válido.';
  if (/Partner region or purpose does not match/i.test(message)) return 'O parceiro precisa atender a cidade ou o bairro do imóvel e aceitar essa finalidade de negócio.';
  if (/Negotiation version changed/i.test(message)) return 'Os termos foram alterados por outra parte. Recarregue antes de responder.';
  if (/Partner limit reached/i.test(message)) return 'O limite de parceiros aceitos para este imóvel foi atingido.';
  if (/shares must total 100/i.test(message)) return 'Os percentuais do captador e do parceiro devem totalizar 100%.';
  return 'Não foi possível concluir a operação. Confira os dados e tente novamente.';
}
