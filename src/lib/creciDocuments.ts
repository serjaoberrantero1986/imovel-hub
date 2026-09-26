import { supabase } from './supabaseClient';

export type CreciDocumentKind = 'cirp' | 'regularity_certificate';

export interface CreciDocument {
  id: string;
  profileId: string;
  storagePath: string;
  documentKind: CreciDocumentKind;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface PendingCreciReview {
  profileId: string;
  name: string;
  email: string;
  creci: string;
  creciUf: string;
  requestedAt: string;
  documents: CreciDocument[];
}

const BUCKET = 'creci-verification';
const MAX_SIZE = 8 * 1024 * 1024;

const mapDocument = (row: any): CreciDocument => ({
  id: row.id,
  profileId: row.profile_id,
  storagePath: row.storage_path,
  documentKind: row.document_kind,
  originalName: row.original_name,
  mimeType: row.mime_type,
  fileSize: row.file_size,
  createdAt: row.created_at
});

async function inspectDocument(file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error('O documento deve ter no máximo 8 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPdf && !isJpeg && !isPng) throw new Error('Envie somente PDF, JPEG ou PNG válido.');
  return isPdf ? 'application/pdf' : isJpeg ? 'image/jpeg' : 'image/png';
}

export async function listMyCreciDocuments(): Promise<CreciDocument[]> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.from('creci_verification_documents').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDocument);
}

export async function uploadCreciDocument(profileId: string, file: File, kind: CreciDocumentKind): Promise<CreciDocument> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const mimeType = await inspectDocument(file);
  const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  const id = crypto.randomUUID();
  const storagePath = `${profileId}/${id}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from('creci_verification_documents').insert({
    id, profile_id: profileId, storage_path: storagePath, document_kind: kind,
    original_name: file.name.slice(0, 255), mime_type: mimeType, file_size: file.size
  }).select('*').single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return mapDocument(data);
}

export async function deleteCreciDocument(document: CreciDocument): Promise<void> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { error } = await supabase.from('creci_verification_documents').delete().eq('id', document.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([document.storagePath]);
}

export async function createCreciDocumentUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error || new Error('Documento indisponível.');
  return data.signedUrl;
}

export async function listPendingCreciReviews(): Promise<PendingCreciReview[]> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.rpc('get_pending_creci_reviews');
  if (error) throw error;
  return (data || []).map((row: any) => ({
    profileId: row.profile_id, name: row.name, email: row.email, creci: row.creci,
    creciUf: row.creci_uf, requestedAt: row.requested_at,
    documents: (row.documents || []).map(mapDocument)
  }));
}

export async function reviewCreciRequest(profileId: string, approved: boolean, note: string, expiresAt?: string): Promise<void> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { error } = await supabase.rpc('review_creci_request', {
    p_profile_id: profileId, p_approved: approved, p_note: note.trim() || null, p_expires_at: expiresAt || null
  });
  if (error) throw error;
}
