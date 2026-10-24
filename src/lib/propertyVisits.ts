import { supabase } from './supabaseClient';
export { formatVisitDate, VISIT_STATUS, visitInterval, visitLocalDate, visitLocalTime } from './visitSchedule.mjs';

export interface PropertyVisit {
  id: string; property_id: string; lead_id: string | null; property_title: string; attendee_name: string; is_administrator: boolean;
  attendee_profile_id: string | null; responsible_id: string; responsible_name: string; is_professional: boolean;
  scheduled_at: string; scheduled_end: string | null; status: string; revision: number; source_origin: string | null;
  broker_confirmed_at: string | null; buyer_confirmed_at: string | null; buyer_presence_at: string | null;
  check_in_at: string | null; check_out_at: string | null; manual_confirmation_reason: string | null; attendance_method: string | null;
  declaration_text: string | null; receipt_snapshot: Record<string, unknown> | null; receipt_hash: string | null; dispute_count: number;
  can_send_code: boolean; code_available_at: string; code_expires_at: string;
  can_check_in: boolean; check_in_available_at: string; check_in_expires_at: string;
  can_mark_no_show: boolean; no_show_available_at: string; no_show_expires_at: string;
}
export interface VisitHistory {
  events: { id: string; event: string; created_at: string; actor_snapshot: { name?: string }; evidence: Record<string, unknown> }[];
  disputes: { id: string; statement: string; opened_at: string; status: string; resolution_reason: string | null; responses: { id: string; statement: string; created_at: string }[] }[];
}
const errors: Record<string, string> = {
  VISIT_DAILY_LIMIT: 'O limite diário de solicitações foi atingido. Consulte suas visitas antes de solicitar outra.',
  VISIT_PORTAL: 'Solicite a visita pelo portal responsável por este imóvel.',
  VISIT_EMAIL_UNAVAILABLE: 'O envio por e-mail está indisponível. Nenhuma confirmação de presença foi registrada. Tente novamente mais tarde.',
  VISIT_AUTH: 'Entre na sua conta para continuar.', VISIT_ACCESS: 'Esta visita não está disponível para sua conta.',
  VISIT_MFA: 'Confirme a autenticação em duas etapas para continuar.',
  VISIT_TIME: 'Escolha um horário futuro e uma duração entre 15 minutos e 4 horas.',
  VISIT_CONFLICT: 'O profissional ou interessado já tem uma visita confirmada nesse horário. Escolha outro horário.',
  VISIT_STALE: 'Esta visita mudou. Atualize a lista e confira os dados antes de tentar novamente.',
  VISIT_STATE: 'Esta ação não está disponível na situação ou no horário atual da visita.',
  VISIT_REASON: 'Informe um motivo com 3 a 1.000 caracteres.',
  VISIT_STATEMENT: 'Descreva a contestação ou resposta com 20 a 4.000 caracteres.',
  VISIT_CODE: 'Código inválido, expirado ou sem tentativas disponíveis. Solicite outro código.',
  VISIT_RATE: 'Aguarde 60 segundos entre envios. O limite é de cinco códigos por visita em uma hora.',
  VISIT_VERIFIED_EMAIL: 'O interessado precisa confirmar o e-mail da própria conta antes de receber um código.',
  VISIT_BUYER_PRESENCE: 'Aguarde a confirmação de presença pelo interessado na própria conta.',
  VISIT_LOCATION: 'A localização recebida é inválida. Tente novamente ou informe o motivo para registrar sem GPS.',
  VISIT_LEAD: 'Escolha um atendimento do profissional vinculado a este imóvel.',
  VISIT_PROPERTY: 'Este imóvel não está disponível para agendamento.', VISIT_PARTNERSHIP: 'A parceria precisa estar ativa e com contrato verificado.',
  VISIT_DISPUTE_EXISTS: 'Você já tem uma contestação aberta nesta visita. Acrescente uma resposta ao histórico.',
};
export function visitError(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (message.includes('AAL2')) return errors.VISIT_MFA;
  const code = Object.keys(errors).find(key => message.includes(key));
  return code ? errors[code] : 'Não foi possível concluir. Confira sua conexão e tente novamente. Seus dados permanecem no formulário.';
}
async function rpc<T>(name: string, params?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('VISIT_AUTH');
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data as T;
}
export const loadPropertyVisits = () => rpc<PropertyVisit[]>('get_my_property_visits');
export interface VisitNotice { id: string; title: string; message: string; created_at: string; visit_id: string; }
export const loadVisitNotices = () => rpc<VisitNotice[]>('get_my_visit_notices');
export const markVisitNoticeRead = (id: string) => rpc<boolean>('mark_my_visit_notice_read', { p_id: id });
export const resolveVisitDispute = (id: string, reason: string) => rpc<boolean>('resolve_property_visit_dispute', { p_dispute_id: id, p_reason: reason });
export const loadVisitHistory = (id: string) => rpc<VisitHistory>('get_property_visit_history', { p_visit_id: id });
export const schedulePropertyVisit = (propertyId: string, start: string, end: string, requestKey: string, leadId?: string, partnershipId?: string) =>
  rpc<string>('schedule_property_visit', { p_property_id: propertyId, p_start: start, p_end: end, p_request_key: requestKey, p_lead_id: leadId || null, p_partnership_id: partnershipId || null, p_origin: window.location.origin });
export const updatePropertyVisit = (visit: PropertyVisit, action: string, fields: Record<string, unknown> = {}) =>
  rpc<boolean>('update_property_visit', { p_visit_id: visit.id, p_revision: visit.revision, p_action: action, ...fields });
export const disputePropertyVisit = (id: string, statement: string, disputeId?: string) =>
  rpc<string>('dispute_property_visit', { p_visit_id: id, p_statement: statement, p_dispute_id: disputeId || null });
export async function verifyVisitPresence(id: string, code: string) {
  const result = await rpc<{ ok: boolean; error?: string }>('verify_property_visit_presence', { p_visit_id: id, p_code: code.trim() });
  if (!result.ok) throw new Error(result.error);
}
export async function visitEmailService(visitId?: string): Promise<boolean> {
  if (!supabase) throw new Error('VISIT_AUTH');
  const { data, error } = await supabase.functions.invoke('send-partnership-visit-otp', { body: visitId ? { visitId } : { action: 'status' } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || 'VISIT_EMAIL_UNAVAILABLE');
  }
  if (data?.error) throw new Error(data.error);
  return visitId ? data?.sent === true : data?.configured === true;
}
export async function captureVisitLocation() {
  if (!navigator.geolocation) throw new Error('VISIT_LOCATION');
  return new Promise<{ p_lat: number; p_lng: number; p_accuracy: number }>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(p => resolve({ p_lat: p.coords.latitude, p_lng: p.coords.longitude, p_accuracy: p.coords.accuracy }),
      () => reject(new Error('VISIT_LOCATION')), { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }));
}
