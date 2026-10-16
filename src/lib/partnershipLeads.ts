import { supabase } from './supabaseClient';

export interface PartnershipLeadSummary {
  attribution_id: string;
  property: { id?: string; code?: string; title?: string };
  partner: { profile_id?: string; name?: string; creci?: string; creci_uf?: string };
  origin: { origin?: string; contract_version_id?: string };
  attributed_at: string;
  duplicate_possible: boolean;
  access_status: 'not_requested'|'pending'|'approved'|'rejected'|'revoked';
  access_request_id: string|null;
}

export interface PartnershipLeadAccessRequest {
  request_id: string;attribution_id:string;status:'pending';requested_fields:string[];purpose:string;requested_at:string;
  captor:{name?:string;creci?:string};property:{code?:string;title?:string};
}

const client=()=>{if(!supabase)throw new Error('Serviço indisponível.');return supabase;};
export async function listPartnershipLeadSummaries():Promise<PartnershipLeadSummary[]>{const{data,error}=await client().rpc('get_my_partnership_lead_summaries',{p_limit:50,p_offset:0});if(error)throw error;return(data||[]) as PartnershipLeadSummary[];}
export async function listPartnershipLeadAccessRequests():Promise<PartnershipLeadAccessRequest[]>{const{data,error}=await client().rpc('get_my_partnership_lead_access_requests');if(error)throw error;return(data||[]) as PartnershipLeadAccessRequest[];}
export async function requestPartnershipLeadAccess(attributionId:string,fields:string[],purpose:string):Promise<void>{const{error}=await client().rpc('request_partnership_lead_access',{p_attribution_id:attributionId,p_fields:fields,p_purpose:purpose.trim()});if(error)throw error;}
export async function decidePartnershipLeadAccess(requestId:string,approve:boolean,reason:string):Promise<void>{const{error}=await client().rpc('decide_partnership_lead_access',{p_request_id:requestId,p_approve:approve,p_reason:reason.trim()});if(error)throw error;}
export async function getAuthorizedPartnershipLeadDetails(requestId:string):Promise<Record<string,string>>{const{data,error}=await client().rpc('get_authorized_partnership_lead_details',{p_request_id:requestId});if(error)throw error;return(data||{}) as Record<string,string>;}

export function partnershipLeadErrorMessage(error:unknown):string{const message=error instanceof Error?error.message:String((error as{message?:string}|null)?.message||'');if(/AAL2 required/i.test(message))return'Confirme o código do aplicativo autenticador antes de acessar dados pessoais.';if(/already pending/i.test(message))return'Já existe uma solicitação aguardando decisão.';if(/purpose required/i.test(message))return'Explique a finalidade do acesso usando pelo menos 10 caracteres.';if(/decision reason required/i.test(message))return'Informe uma justificativa com pelo menos 10 caracteres.';return'Não foi possível concluir a operação de acesso ao lead.';}
