import { editUserImage } from './editUserImage';
import { computeFileHash } from './imageProcessing';
import { supabase } from './supabaseClient';
import { PartnershipTerms } from './propertyPartnerships';

export type ContractStatus = 'awaiting_acknowledgements' | 'awaiting_sgr' | 'awaiting_verification' | 'verified' | 'rejected' | 'superseded';
export type ContractPartyRole = 'captor' | 'partner' | 'administrator';
export type ContractDocumentKind = 'signed_contract' | 'sgr_receipt';

export interface PartnershipContractDocument {
  id: string;
  document_kind: ContractDocumentKind;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
}

export interface PartnershipContractWorkspace {
  negotiation_id: string;
  negotiation_status: string;
  party_role: ContractPartyRole;
  accepted_term_version: number | null;
  contract: null | {
    id: string;
    version_number: number;
    status: ContractStatus;
    canonical_sha256: string;
    original_sgr_contract_number: string;
    canonical_terms: Record<string, unknown>;
    portfolio_agreement_id?: string | null;
    instrument_kind?: 'individual' | 'portfolio_contract' | 'property_addendum' | 'fee_replacement';
    properties?: Array<{ negotiation_id: string; property_id: string; code: string; title: string; original_sgr_contract_number: string }>;
    created_at: string;
  };
  acknowledgements: Array<{ party_role: 'captor' | 'partner'; acknowledged_at: string; terms_sha256: string }>;
  documents: PartnershipContractDocument[];
  sgr_submissions: Array<{
    party_role: 'captor' | 'partner'; submission_version: number; sgr_contract_number: string;
    cf_ledger_hash: string; blockchain_hash: string | null; verification_url: string | null; submitted_at: string;
  }>;
  review: null | { decision: 'verified' | 'rejected'; note: string; created_at: string };
}

export interface PropertyPartnershipLifecycle {
  id: string;
  status: 'active' | 'suspended' | 'expired' | 'ended' | 'disputed';
  contract_version_id: string;
  starts_at: string;
  ends_at: string | null;
  updated_at: string;
  termination_requested_by: string | null;
  termination_requested_at: string | null;
  termination_reason: string | null;
  status_reason: string | null;
  events: Array<{ id: string; event_type: string; details: Record<string, unknown>; actor: Record<string, unknown>; created_at: string }>;
}

const BUCKET = 'partnership-contracts';
const MAX_SIZE = 15 * 1024 * 1024;
const client = () => {
  if (!supabase) throw new Error('Serviço indisponível.');
  return supabase;
};

export async function getPartnershipContractWorkspace(negotiationId: string): Promise<PartnershipContractWorkspace> {
  const { data, error } = await client().rpc('get_partnership_contract_workspace', { p_negotiation_id: negotiationId });
  if (error) throw error;
  return data as unknown as PartnershipContractWorkspace;
}

export async function createPartnershipContractDraft(negotiationId: string, expectedTermVersion: number, originalSgrContractNumber: string): Promise<void> {
  const { error } = await client().rpc('create_partnership_contract_draft', {
    p_negotiation_id: negotiationId,
    p_expected_term_version: expectedTermVersion,
    p_original_sgr_contract_number: originalSgrContractNumber.trim(),
  });
  if (error) throw error;
}

export interface PortfolioContractCandidate {
  negotiation_id: string;
  property_id: string;
  code: string;
  title: string;
  version_number: number;
  captor_share: number;
  partner_share: number;
}

export async function getPortfolioContractCandidates(negotiationId: string): Promise<PortfolioContractCandidate[]> {
  const { data, error } = await client().rpc('get_portfolio_contract_candidates', { p_negotiation_id: negotiationId });
  if (error) throw error;
  return (data || []) as PortfolioContractCandidate[];
}

export async function createPortfolioPartnershipContractDraft(
  negotiationId: string,
  expectedTermVersion: number,
  properties: Array<{ negotiation_id: string; original_sgr_contract_number: string }>,
): Promise<void> {
  const { error } = await client().rpc('create_portfolio_partnership_contract_draft', {
    p_anchor_negotiation_id: negotiationId,
    p_expected_term_version: expectedTermVersion,
    p_properties: properties.map(item => ({
      negotiation_id: item.negotiation_id,
      original_sgr_contract_number: item.original_sgr_contract_number.trim(),
    })),
  });
  if (error) throw error;
}

export async function createPortfolioContractRevision(input: {
  agreementId: string;
  expectedContractId: string;
  kind: 'property_addendum' | 'fee_replacement';
  properties: Array<{ negotiation_id: string; original_sgr_contract_number: string }>;
  terms?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await client().rpc('create_portfolio_contract_revision', {
    p_agreement_id: input.agreementId,
    p_expected_contract_id: input.expectedContractId,
    p_kind: input.kind,
    p_properties: input.properties,
    p_terms: input.terms || null,
  });
  if (error) throw error;
}

export async function acknowledgePartnershipContract(contractId: string, expectedSha256: string): Promise<void> {
  const { error } = await client().rpc('acknowledge_partnership_contract', { p_contract_id: contractId, p_expected_sha256: expectedSha256 });
  if (error) throw error;
}

const inspectFile = async (file: File): Promise<'application/pdf' | 'image/jpeg' | 'image/png'> => {
  if (file.size < 1 || file.size > MAX_SIZE) throw new Error('O documento deve ter no máximo 15 MB após a otimização.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!pdf && !jpeg && !png) throw new Error('Envie somente um arquivo PDF, JPEG ou PNG válido.');
  return pdf ? 'application/pdf' : jpeg ? 'image/jpeg' : 'image/png';
};

export async function uploadPartnershipContractDocument(contractId: string, kind: ContractDocumentKind, source: File): Promise<void> {
  const api = client();
  let file = source;
  let mimeType = await inspectFile(source);
  if (kind === 'signed_contract' && mimeType !== 'application/pdf') throw new Error('O contrato assinado deve ser enviado em PDF.');
  if (mimeType !== 'application/pdf') {
    const result = await editUserImage(source, 'document', 2560);
    if (!result) throw new Error('Edição do documento cancelada.');
    const extension = result.mimeType === 'image/png' ? 'png' : 'jpg';
    file = new File([result.blob], `${source.name.replace(/\.[^.]+$/, '')}.${extension}`, { type: result.mimeType });
    mimeType = await inspectFile(file);
  }
  if (file.size > MAX_SIZE) throw new Error('O documento otimizado deve ter no máximo 15 MB.');
  const { data: auth } = await api.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
  const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${contractId}/${userId}/${crypto.randomUUID()}.${extension}`;
  const sha256 = await computeFileHash(file);
  const { error: uploadError } = await api.storage.from(BUCKET).upload(path, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await api.rpc('register_partnership_contract_document', {
    p_contract_id: contractId, p_document_kind: kind, p_storage_path: path,
    p_original_name: file.name.slice(0, 255), p_mime_type: mimeType,
    p_size_bytes: file.size, p_sha256: sha256,
  });
  if (error) {
    await api.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function createPartnershipContractDocumentUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error || new Error('Documento indisponível.');
  return data.signedUrl;
}

export async function submitPartnershipSgrEvidence(input: { contractId: string; sgrContractNumber: string; cfLedgerHash: string; blockchainHash?: string; verificationUrl?: string }): Promise<void> {
  const { error } = await client().rpc('submit_partnership_sgr_evidence', {
    p_contract_id: input.contractId, p_sgr_contract_number: input.sgrContractNumber.trim(),
    p_cf_ledger_hash: input.cfLedgerHash.trim(), p_blockchain_hash: input.blockchainHash?.trim() || null,
    p_verification_url: input.verificationUrl?.trim() || null,
  });
  if (error) throw error;
}

export async function getPropertyPartnershipLifecycle(negotiationId: string): Promise<PropertyPartnershipLifecycle | null> {
  const { data, error } = await client().rpc('get_property_partnership_lifecycle', { p_negotiation_id: negotiationId });
  if (error) throw error;
  return data as unknown as PropertyPartnershipLifecycle | null;
}

export async function proposePropertyPartnershipAmendment(input: { negotiationId: string; expectedContractId: string; terms: PartnershipTerms }): Promise<void> {
  const { error } = await client().rpc('propose_property_partnership_amendment', {
    p_negotiation_id: input.negotiationId,
    p_expected_contract_id: input.expectedContractId,
    p_terms: input.terms,
  });
  if (error) throw error;
}

export async function schedulePropertyPartnershipTermination(input: { partnershipId: string; expectedUpdatedAt: string; reason: string }): Promise<PropertyPartnershipLifecycle> {
  const { data, error } = await client().rpc('schedule_property_partnership_termination', {
    p_partnership_id: input.partnershipId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_reason: input.reason.trim(),
  });
  if (error) throw error;
  return data as unknown as PropertyPartnershipLifecycle;
}

export async function reportOutdatedPartnerListing(partnershipId: string, reason: string): Promise<void> {
  const { error } = await client().rpc('report_outdated_partner_listing', { p_partnership_id: partnershipId, p_reason: reason.trim() });
  if (error) throw error;
}

export function partnershipContractErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message || '');
  if (/AAL2 required/i.test(message)) return 'Confirme o código do aplicativo autenticador antes de continuar.';
  if (/Accepted terms version changed|Contract review changed/i.test(message)) return 'O contrato foi atualizado por outra pessoa. Recarregue os dados antes de continuar.';
  if (/already acknowledged/i.test(message)) return 'Você já confirmou esta versão dos termos.';
  if (/Signed contract and SGR receipt required/i.test(message)) return 'Anexe o contrato assinado e o comprovante do SGR antes de registrar os identificadores.';
  if (/Invalid SGR verification URL/i.test(message)) return 'Use somente o endereço oficial de consulta do SGR/COFECI.';
  if (/Edição do documento cancelada/i.test(message)) return message;
  if (/Active contract changed|Partnership changed|Amendment already in progress/i.test(message)) return 'A parceria foi atualizada. Recarregue os dados antes de continuar.';
  if (/Portfolio contract changed|Another portfolio revision is in progress/i.test(message)) return 'O contrato de carteira mudou ou já tem uma revisão em andamento. Atualize a página.';
  if (/Selected properties must have the same accepted terms|New property requires matching accepted terms/i.test(message)) return 'Os imóveis selecionados precisam ter os mesmos termos preliminares aceitos pelas duas partes.';
  if (/Property already has a contract/i.test(message)) return 'Um dos imóveis já está vinculado a um contrato em andamento ou verificado.';
  if (/Property addendum has no changes/i.test(message)) return 'Altere a seleção de imóveis antes de preparar o aditivo.';
  if (/Fee replacement must change only the fee split|Fee replacement cannot change property scope/i.test(message)) return 'O novo contrato deve manter os mesmos imóveis e alterar somente a divisão dos honorários.';
  if (/Incomplete contract evidence/i.test(message)) return 'Antes de aprovar, confira a ciência das duas partes, o contrato assinado, o comprovante e os registros coincidentes do SGR.';
  if (/Termination reason required/i.test(message)) return 'Informe um motivo com pelo menos 10 caracteres para o encerramento.';
  if (/Report reason required/i.test(message)) return 'Descreva o que precisa ser conferido usando pelo menos 10 caracteres.';
  if (/Parties cannot report their own listing/i.test(message)) return 'Captador e parceiro devem corrigir o anúncio diretamente, sem abrir um relato sobre a própria parceria.';
  if (message) console.error('Erro na etapa contratual:', error);
  return 'Não foi possível concluir a etapa contratual. Atualize a página e tente novamente.';
}
