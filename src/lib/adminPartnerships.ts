import {supabase} from './supabaseClient';
export interface AdminPartnershipItem{id:string;status:string;captorName:string;captorSlug?:string;partnerName:string;partnerSlug?:string;propertyTitle:string;propertyStatus:string;startedAt:string;endsAt?:string;leadsCount:number;visitsCount:number;}
export interface AdminPartnershipOverview{partnerships:number;properties:number;active:number;leads:number;visits:number;items:AdminPartnershipItem[];}
export async function getAdminPartnershipOverview():Promise<AdminPartnershipOverview>{if(!supabase)throw new Error('Serviço indisponível.');const {data,error}=await (supabase as any).rpc('get_admin_partnership_overview');if(error)throw error;const s=data?.summary||{};return {partnerships:Number(s.partnerships||0),properties:Number(s.properties||0),active:Number(s.active||0),leads:Number(s.leads||0),visits:Number(s.visits||0),items:(data?.items||[]).map((r:any)=>({id:String(r.id),status:String(r.status),captorName:String(r.captor_name||''),captorSlug:r.captor_slug||undefined,partnerName:String(r.partner_name||''),partnerSlug:r.partner_slug||undefined,propertyTitle:String(r.property_title||'Imóvel'),propertyStatus:String(r.property_status||''),startedAt:String(r.started_at||''),endsAt:r.ends_at||undefined,leadsCount:Number(r.leads_count||0),visitsCount:Number(r.visits_count||0)}))};}

export interface AdminPartnershipContractReview {
  id: string;
  status: 'awaiting_verification';
  instrument_kind: 'individual' | 'portfolio_contract' | 'property_addendum' | 'fee_replacement';
  created_at: string;
  canonical_sha256: string;
  captor: { name: string; creci: string; creci_uf: string };
  partner: { name: string; creci: string; creci_uf: string };
  captor_share: string;
  partner_share: string;
  properties: Array<{ code: string; title: string; original_sgr_contract_number: string }>;
  documents: Array<{ id: string; document_kind: 'signed_contract' | 'sgr_receipt'; storage_path: string; original_name: string; sha256: string }>;
  sgr_submissions: Array<{ party_role: 'captor' | 'partner'; sgr_contract_number: string; cf_ledger_hash: string; blockchain_hash: string | null; verification_url: string | null; submitted_at: string }>;
}

export async function getAdminPartnershipContractReviews(): Promise<AdminPartnershipContractReview[]> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.rpc('get_admin_partnership_contract_reviews');
  if (error) throw error;
  return (data || []) as AdminPartnershipContractReview[];
}

export async function reviewAdminPartnershipContract(
  contractId: string,
  decision: 'verified' | 'rejected',
  note: string,
): Promise<void> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { error } = await supabase.rpc('review_partnership_contract', {
    p_contract_id: contractId,
    p_expected_status: 'awaiting_verification',
    p_decision: decision,
    p_note: note.trim(),
  });
  if (error) throw error;
}
