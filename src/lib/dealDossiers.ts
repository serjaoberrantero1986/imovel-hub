import { supabase } from './supabaseClient';

export type DealStage = 'inherited_data' | 'negotiation' | 'participants' | 'personal_documents' | 'property_documents' | 'certificates' | 'review' | 'contract' | 'signatures' | 'completed';

export interface DealParticipant {
  id: string;
  dossierId: string;
  profileId?: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  status: string;
  source: string;
}

export interface DealDossier {
  id: string;
  leadId: string;
  propertyId?: string;
  ownerId: string;
  businessType: 'sale' | 'rent' | 'other';
  status: string;
  currentStage: DealStage;
  progress: number;
  inheritedSnapshot: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  propertyLegalRegime: 'unknown' | 'registered' | 'possessory_rights';
  jurisdiction: { country?: string; state?: string; city?: string };
  participants: DealParticipant[];
  requestCount: number;
  pendingDocumentCount: number;
  documentRequests: DealDocumentRequest[];
}

export interface DealDocumentFile { id:string; name:string; mimeType:string; size:number; version:number; storagePath:string; createdAt:string }
export interface DealDocumentRequestItem { id:string; label:string; description:string; category:string; required:boolean; status:string; decisionNote?:string; validUntil?:string; weight:number; files:DealDocumentFile[] }
export interface DealDocumentRequest { id:string; participantId:string; status:string; sentAt?:string; expiresAt?:string; items:DealDocumentRequestItem[] }
export interface DealFinding {id:string;dossierId:string;requestItemId?:string;kind:'data_difference'|'blocking'|'reservation';fieldName?:string;registeredValue?:string;documentValue?:string;description:string;status:string;resolutionNote?:string;createdAt:string}
export interface DealContractTemplate{id:string;key:string;version:number;businessType:string;name:string;description:string}
export interface DealContractClause{id:string;key:string;version:number;title:string;explanation:string;body:string;category:string;required:boolean;defaultEnabled:boolean;dependencies:string[];incompatibilities:string[];sortOrder:number}
export interface DealContractVersion{id:string;version:number;status:'preliminary'|'ready'|'final';variables:Record<string,string>;content:any;contentHash:string;createdAt:string}
export interface DealNegotiationVersion{id:string;version:number;kind:'proposal'|'counterproposal'|'consolidated_terms';status:string;title:string;terms:Record<string,string>;notes?:string;contentHash:string;createdAt:string}
export interface DealCertificateSource{id:string;key:string;label:string;description:string;officialUrl:string;authorityName:string;scope:string;stateCode?:string;cityName?:string;appliesTo:string[];documentCatalogKey?:string;conditionalRule?:string;verifiedAt:string;sourceNotes?:string;active?:boolean}

export interface DealDocumentCatalogItem {
  key: string;
  label: string;
  description: string;
  category: string;
  acceptedRoles: string[];
  allowsMultiple: boolean;
}

const mapParticipant = (row: any): DealParticipant => ({
  id: row.id,
  dossierId: row.dossier_id,
  profileId: row.profile_id || undefined,
  role: row.role,
  name: row.name,
  email: row.email || undefined,
  phone: row.phone || undefined,
  isPrimary: Boolean(row.is_primary),
  status: row.status,
  source: row.source
});

export async function loadDealDossier(leadId: string): Promise<DealDossier | null> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data: dossier, error } = await supabase.from('deal_dossiers').select('*').eq('lead_id', leadId).maybeSingle();
  if (error) throw error;
  if (!dossier) return null;
  const [{ data: participants, error: participantError }, { data: requests, error: requestError }] = await Promise.all([
    supabase.from('deal_participants').select('*').eq('dossier_id', dossier.id).order('created_at'),
    supabase.from('deal_document_requests').select('id,participant_id,status,sent_at,token_expires_at,deal_document_request_items(id,label,description,category,required,status,decision_note,valid_until,weight,deal_documents(id,original_name,mime_type,file_size,version,storage_path,created_at,is_current))').eq('dossier_id', dossier.id).order('created_at', { ascending: false })
  ]);
  if (participantError) throw participantError;
  if (requestError) throw requestError;
  const requestRows = requests || [];
  return {
    id: dossier.id,
    leadId: dossier.lead_id,
    propertyId: dossier.property_id || undefined,
    ownerId: dossier.owner_id,
    businessType: dossier.business_type,
    status: dossier.status,
    currentStage: dossier.current_stage,
    progress: dossier.progress,
    inheritedSnapshot: dossier.inherited_snapshot || {},
    createdAt: dossier.created_at,
    updatedAt: dossier.updated_at,
    propertyLegalRegime: dossier.property_legal_regime || 'unknown',
    jurisdiction: dossier.jurisdiction || {},
    participants: (participants || []).map(mapParticipant),
    requestCount: requestRows.length,
    pendingDocumentCount: requestRows.flatMap((request: any) => request.deal_document_request_items || []).filter((item: any) => !['approved','not_applicable'].includes(item.status)).length,
    documentRequests: requestRows.map((request:any)=>({
      id:request.id,participantId:request.participant_id,status:request.status,sentAt:request.sent_at||undefined,expiresAt:request.token_expires_at||undefined,
      items:(request.deal_document_request_items||[]).map((item:any)=>({id:item.id,label:item.label,description:item.description,category:item.category||'other',required:item.required,status:item.status,decisionNote:item.decision_note||undefined,validUntil:item.valid_until||undefined,weight:item.weight||1,
        files:(item.deal_documents||[]).filter((file:any)=>file.is_current).map((file:any)=>({id:file.id,name:file.original_name,mimeType:file.mime_type,size:file.file_size,version:file.version,storagePath:file.storage_path,createdAt:file.created_at}))
      }))
    }))
  };
}

export async function loadDealNegotiation(dossierId:string):Promise<DealNegotiationVersion[]>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.from('deal_negotiation_versions').select('*').eq('dossier_id',dossierId).order('version',{ascending:false});if(error)throw error;return(data||[]).map((r:any)=>({id:r.id,version:r.version,kind:r.kind,status:r.status,title:r.title,terms:r.terms||{},notes:r.notes||undefined,contentHash:r.content_hash,createdAt:r.created_at}));}
export async function loadDealNotificationCount():Promise<number>{if(!supabase)return 0;const{data,error}=await supabase.rpc('get_my_deal_notification_count');if(error)throw error;return Number(data||0)}
export async function markDealNotificationsRead(dossierId:string):Promise<void>{if(!supabase)return;const{error}=await supabase.rpc('mark_my_deal_notifications_read',{p_dossier_id:dossierId});if(error)throw error;window.dispatchEvent(new Event('deal-notifications-changed'))}
export async function createDealNegotiationVersion(input:{dossierId:string;kind:DealNegotiationVersion['kind'];title:string;terms:Record<string,string>;notes?:string;status:'draft'|'presented'}):Promise<string>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.rpc('create_deal_negotiation_version',{p_dossier_id:input.dossierId,p_kind:input.kind,p_title:input.title,p_terms:input.terms,p_notes:input.notes?.trim()||null,p_status:input.status});if(error)throw error;return String(data);}
export async function startDealNegotiationReview(negotiationVersionId:string,participantIds:string[]):Promise<{reviewers:number;failed:number}>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.functions.invoke('deal-negotiation-review',{body:{action:'create',negotiationVersionId,participantIds,validDays:7}});if(error)throw error;if(data?.error)throw new Error(data.error);return{reviewers:Number(data.reviewers||0),failed:Number(data.failed||0)}}
export async function loadDealNegotiationReviews(dossierId:string):Promise<any[]>{if(!supabase)throw new Error('Serviço indisponível.');const{data:versions,error:ve}=await supabase.from('deal_negotiation_versions').select('id,version').eq('dossier_id',dossierId);if(ve)throw ve;const ids=(versions||[]).map(v=>v.id);if(!ids.length)return[];const{data:rounds,error:re}=await supabase.from('deal_negotiation_review_rounds').select('id,negotiation_version_id,status,expires_at,created_at').in('negotiation_version_id',ids).order('created_at',{ascending:false});if(re)throw re;const roundIds=(rounds||[]).map(r=>r.id);if(!roundIds.length)return[];const{data:reviewers,error:rve}=await supabase.from('deal_negotiation_reviewers').select('id,round_id,participant_id,status,comment,last_accessed_at,decided_at,deal_participants(name,role)').in('round_id',roundIds);if(rve)throw rve;return(rounds||[]).map(round=>({...round,version:(versions||[]).find(v=>v.id===round.negotiation_version_id)?.version,reviewers:(reviewers||[]).filter(v=>v.round_id===round.id)}))}
export async function configureDealLegalContext(input:{dossierId:string;regime:DealDossier['propertyLegalRegime'];state:string;city:string}):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const{error}=await supabase.rpc('configure_deal_legal_context',{p_dossier_id:input.dossierId,p_regime:input.regime,p_state:input.state,p_city:input.city});if(error)throw error;}
export async function loadDealCertificateSources(input:{state?:string;city?:string}):Promise<DealCertificateSource[]>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.from('deal_certificate_sources').select('*').eq('active',true).order('geographic_scope').order('label');if(error)throw error;const state=input.state?.trim().toUpperCase(),city=input.city?.trim().toLocaleLowerCase('pt-BR');return(data||[]).filter((r:any)=>(!r.state_code||r.state_code===state)&&(!r.city_name||r.city_name.toLocaleLowerCase('pt-BR')===city)).map((r:any)=>({id:r.id,key:r.key,label:r.label,description:r.description,officialUrl:r.official_url,authorityName:r.authority_name,scope:r.geographic_scope,stateCode:r.state_code||undefined,cityName:r.city_name||undefined,appliesTo:r.applies_to||[],documentCatalogKey:r.document_catalog_key||undefined,conditionalRule:r.conditional_rule||undefined,verifiedAt:r.verified_at,sourceNotes:r.source_notes||undefined}));}

export async function startDealDossier(leadId: string): Promise<string> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.rpc('start_deal_dossier', { p_lead_id: leadId });
  if (error) throw error;
  if (!data) throw new Error('O banco não confirmou a criação do dossiê.');
  return String(data);
}

export async function addDealParticipant(dossierId: string, actorId: string, input: { role: string; name: string; email?: string; phone?: string }): Promise<void> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { error } = await supabase.from('deal_participants').insert({
    id: crypto.randomUUID(), dossier_id: dossierId, role: input.role, name: input.name.trim(),
    email: input.email?.trim().toLowerCase() || null, phone: input.phone?.trim() || null,
    source: 'manual', created_by: actorId, status: 'confirmed'
  });
  if (error) throw error;
}

export async function moveDealDossierStage(dossierId:string,direction:'previous'|'next'):Promise<DealStage>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.rpc('move_deal_dossier_stage',{p_dossier_id:dossierId,p_direction:direction});if(error)throw error;return String(data) as DealStage;}

export async function loadDealDocumentCatalog(role: string, legalRegime: DealDossier['propertyLegalRegime'] = 'unknown'): Promise<DealDocumentCatalogItem[]> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.from('deal_document_catalog').select('*').eq('active', true).order('sort_order');
  if (error) throw error;
  const possessoryKeys=new Set(['possession_chain','possession_declaration','survey_plan','master_registration','access_easement']);
  return (data || []).filter((row: any) => row.accepted_roles?.includes(role)&&(legalRegime==='possessory_rights'||!possessoryKeys.has(row.key))).map((row: any) => ({
    key: row.key, label: row.label, description: row.description, category: row.category,
    acceptedRoles: row.accepted_roles || [], allowsMultiple: Boolean(row.allows_multiple)
  }));
}

export async function sendDealDocumentRequest(input: { participantId: string; items: { key: string; required: boolean }[]; instructions?: string; validDays?: number }): Promise<void> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.functions.invoke('deal-document-request', { body: { action: 'create', ...input } });
  if (error) throw error;
  if(data?.error)throw new Error(data.error);
}

export async function openDealDocument(storagePath:string):Promise<void>{
  if(!supabase)throw new Error('Serviço indisponível.');
  const {data,error}=await supabase.storage.from('deal-documents').createSignedUrl(storagePath,300);
  if(error||!data?.signedUrl)throw error||new Error('Documento indisponível.');
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
}

export async function getDealDocumentUrl(storagePath:string):Promise<string>{
  if(!supabase)throw new Error('Serviço indisponível.');
  const {data,error}=await supabase.storage.from('deal-documents').createSignedUrl(storagePath,300);
  if(error||!data?.signedUrl)throw error||new Error('Documento indisponível.');
  return data.signedUrl;
}

export async function reviewDealDocument(itemId:string,decision:'approve'|'request_correction',note?:string):Promise<void>{
  if(!supabase)throw new Error('Serviço indisponível.');
  const {error}=await supabase.rpc('review_and_recalculate_deal_document_item',{p_item_id:itemId,p_decision:decision,p_note:note?.trim()||null});
  if(error)throw error;
}

export async function loadAllDealCertificateSources():Promise<DealCertificateSource[]>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.from('deal_certificate_sources').select('*').order('active',{ascending:false}).order('label');if(error)throw error;return(data||[]).map((r:any)=>({id:r.id,key:r.key,label:r.label,description:r.description,officialUrl:r.official_url,authorityName:r.authority_name,scope:r.geographic_scope,stateCode:r.state_code||undefined,cityName:r.city_name||undefined,appliesTo:r.applies_to||[],documentCatalogKey:r.document_catalog_key||undefined,conditionalRule:r.conditional_rule||undefined,verifiedAt:r.verified_at,sourceNotes:r.source_notes||undefined,active:r.active}));}
export async function saveDealCertificateSource(source:DealCertificateSource&{active?:boolean}):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const payload={id:source.id||crypto.randomUUID(),key:source.key.trim(),label:source.label.trim(),description:source.description.trim(),official_url:source.officialUrl.trim(),authority_name:source.authorityName.trim(),geographic_scope:source.scope,state_code:source.stateCode?.trim().toUpperCase()||null,city_name:source.cityName?.trim()||null,applies_to:source.appliesTo,document_catalog_key:source.documentCatalogKey?.trim()||null,conditional_rule:source.conditionalRule?.trim()||null,verified_at:source.verifiedAt||new Date().toISOString().slice(0,10),source_notes:source.sourceNotes?.trim()||null,active:source.active!==false,updated_at:new Date().toISOString()};const{error}=await supabase.from('deal_certificate_sources').upsert(payload);if(error)throw error;}
export async function deactivateDealCertificateSource(id:string):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const{error}=await supabase.from('deal_certificate_sources').update({active:false,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}

export async function loadDealFindings(dossierId:string):Promise<DealFinding[]>{
  if(!supabase)throw new Error('Serviço indisponível.');
  const {data,error}=await supabase.from('deal_review_findings').select('*').eq('dossier_id',dossierId).order('created_at',{ascending:false});if(error)throw error;
  return (data||[]).map((row:any)=>({id:row.id,dossierId:row.dossier_id,requestItemId:row.request_item_id||undefined,kind:row.kind,fieldName:row.field_name||undefined,registeredValue:row.registered_value||undefined,documentValue:row.document_value||undefined,description:row.description,status:row.status,resolutionNote:row.resolution_note||undefined,createdAt:row.created_at}));
}
export async function addDealFinding(dossierId:string,actorId:string,input:Omit<DealFinding,'id'|'dossierId'|'status'|'createdAt'>):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const {error}=await supabase.from('deal_review_findings').insert({dossier_id:dossierId,request_item_id:input.requestItemId||null,kind:input.kind,field_name:input.fieldName||null,registered_value:input.registeredValue||null,document_value:input.documentValue||null,description:input.description.trim(),created_by:actorId});if(error)throw error;}
export async function resolveDealFinding(id:string,note:string):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('deal_review_findings').update({status:'resolved',resolution_note:note.trim(),resolved_by:user?.id,resolved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}
export async function updateDealDocumentRequirement(itemId:string,input:{validUntil?:string|null}):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const {error}=await supabase.from('deal_document_request_items').update({valid_until:input.validUntil,updated_at:new Date().toISOString()}).eq('id',itemId);if(error)throw error;}
export async function setDealDocumentApplicability(itemId:string,applicable:boolean,reason?:string):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const{error}=await supabase.rpc('set_deal_document_applicability',{p_item_id:itemId,p_applicable:applicable,p_reason:reason?.trim()||null});if(error)throw error;}
export async function recalculateDealDossier(dossierId:string):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const {error}=await supabase.rpc('recalculate_deal_dossier',{p_dossier_id:dossierId});if(error)throw error;}
export async function createDealDossierSnapshot(dossierId:string):Promise<string>{if(!supabase)throw new Error('Serviço indisponível.');const {data,error}=await supabase.rpc('create_deal_dossier_snapshot',{p_dossier_id:dossierId});if(error)throw error;return String(data);}
export async function refreshDealDocumentDeadlines(dossierId:string):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const{error}=await supabase.rpc('refresh_deal_document_deadlines',{p_dossier_id:dossierId});if(error)throw error;}
export async function exportLatestDealDossier(dossierId:string):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.from('deal_dossier_snapshots').select('version,content_hash,content,created_at').eq('dossier_id',dossierId).order('version',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data)throw new Error('DEAL_SNAPSHOT_REQUIRED');const c:any=data.content||{},docs:any[]=c.documents||[],parts:any[]=c.participants||[];const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]!));const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Índice do dossiê</title><style>body{font-family:Arial;color:#172033;margin:40px}h1{color:#e00038}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}.meta{color:#64748b;font-size:11px;word-break:break-all}@media print{button{display:none}}</style></head><body><button onclick="print()">Imprimir ou salvar em PDF</button><h1>Índice do dossiê documental</h1><p>Versão ${data.version} · ${new Date(data.created_at).toLocaleString('pt-BR')}</p><h2>Participantes</h2><table><tr><th>Nome</th><th>Papel</th><th>Situação</th></tr>${parts.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(p.status)}</td></tr>`).join('')}</table><h2>Documentos</h2><table><tr><th>Categoria</th><th>Documento</th><th>Versão</th><th>Validade</th><th>Situação</th></tr>${docs.map(d=>`<tr><td>${esc(d.category)}</td><td>${esc(d.label)}</td><td>${esc(d.version||'—')}</td><td>${esc(d.valid_until||'—')}</td><td>${esc(d.status)}</td></tr>`).join('')}</table><p class="meta"><strong>Hash de integridade:</strong> ${esc(data.content_hash)}</p><p class="meta">Este índice não contém links públicos para os arquivos privados.</p></body></html>`;const win=window.open('','_blank');if(win)win.opener=null;if(!win)throw new Error('Permita a abertura da janela de exportação.');win.document.write(html);win.document.close();}

export async function loadDealContractBuilder(dossierId:string,businessType:string):Promise<{templates:DealContractTemplate[];clauses:DealContractClause[];versions:DealContractVersion[]}>{if(!supabase)throw new Error('Serviço indisponível.');const[{data:templates,error:te},{data:clauses,error:ce},{data:contract,error:co}]=await Promise.all([supabase.from('deal_contract_templates').select('*').eq('business_type',businessType).eq('active',true).order('version',{ascending:false}),supabase.from('deal_contract_clauses').select('*').contains('business_types',[businessType]).eq('active',true).order('sort_order'),supabase.from('deal_contracts').select('id').eq('dossier_id',dossierId).maybeSingle()]);if(te||ce||co)throw te||ce||co;let versions:any[]=[];if(contract){const{data,error}=await supabase.from('deal_contract_versions').select('*').eq('contract_id',contract.id).order('version',{ascending:false});if(error)throw error;versions=data||[];}return{templates:(templates||[]).map((r:any)=>({id:r.id,key:r.key,version:r.version,businessType:r.business_type,name:r.name,description:r.description})),clauses:(clauses||[]).map((r:any)=>({id:r.id,key:r.key,version:r.version,title:r.title,explanation:r.explanation,body:r.body,category:r.category,required:r.required,defaultEnabled:r.default_enabled,dependencies:r.dependencies||[],incompatibilities:r.incompatibilities||[],sortOrder:r.sort_order})),versions:versions.map((r:any)=>({id:r.id,version:r.version,status:r.status,variables:r.variables||{},content:r.content||{},contentHash:r.content_hash,createdAt:r.created_at}))};}
export async function createDealContractVersion(input:{dossierId:string;templateId:string;clauseKeys:string[];variables:Record<string,string>;ready:boolean}):Promise<string>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.rpc('create_deal_contract_version',{p_dossier_id:input.dossierId,p_template_id:input.templateId,p_clause_keys:input.clauseKeys,p_variables:input.variables,p_ready:input.ready});if(error)throw error;return String(data);}
export async function startDealContractReview(contractVersionId:string):Promise<{reviewers:number;failed:number}>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.functions.invoke('deal-contract-review',{body:{action:'create',contractVersionId,validDays:10}});if(error)throw error;if(data?.error)throw new Error(data.error);return{reviewers:Number(data.reviewers||0),failed:Number(data.failed||0)};}
export async function loadDealContractReviews(dossierId:string):Promise<any[]>{if(!supabase)throw new Error('Serviço indisponível.');const{data:contract,error:ce}=await supabase.from('deal_contracts').select('id').eq('dossier_id',dossierId).maybeSingle();if(ce)throw ce;if(!contract)return[];const{data:versions,error:ve}=await supabase.from('deal_contract_versions').select('id,version').eq('contract_id',contract.id);if(ve)throw ve;const ids=(versions||[]).map(v=>v.id);if(!ids.length)return[];const{data:rounds,error:re}=await supabase.from('deal_contract_review_rounds').select('id,contract_version_id,status,pdf_hash,expires_at,created_at').in('contract_version_id',ids).order('created_at',{ascending:false});if(re)throw re;const roundIds=(rounds||[]).map(r=>r.id);if(!roundIds.length)return[];const{data:reviewers,error:rve}=await supabase.from('deal_contract_reviewers').select('id,round_id,participant_id,status,general_comment,last_accessed_at,decided_at,deal_participants(name,role),deal_contract_annotations(id,page,kind,comment,status,x,y,width,height,created_at)').in('round_id',roundIds);if(rve)throw rve;return(rounds||[]).map(round=>({...round,version:(versions||[]).find(v=>v.id===round.contract_version_id)?.version,reviewers:(reviewers||[]).filter(v=>v.round_id===round.id)}));}
export async function resolveDealContractAnnotation(annotationId:string,status:'accepted'|'partially_accepted'|'rejected'|'resolved'):Promise<void>{if(!supabase)throw new Error('Serviço indisponível.');const{error}=await supabase.from('deal_contract_annotations').update({status,updated_at:new Date().toISOString()}).eq('id',annotationId);if(error)throw error;}
export async function checkSuperSignSandbox():Promise<any>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.functions.invoke('deal-supersign',{body:{action:'account'}});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
export async function createSuperSignSandboxEnvelope(dossierId:string,contractVersionId:string):Promise<any>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.functions.invoke('deal-supersign',{body:{action:'create',dossierId,contractVersionId}});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
export async function refreshSuperSignSandboxEnvelope(dossierId:string):Promise<any>{if(!supabase)throw new Error('Serviço indisponível.');const{data,error}=await supabase.functions.invoke('deal-supersign',{body:{action:'status',dossierId}});if(error)throw error;if(data?.error)throw new Error(data.error);return data}

export function dealDossierErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  if (message.includes('DEAL_STAGE_REQUIRED')) return 'Mova o lead para Fechamento e documental antes de iniciar o dossiê.';
  if (message.includes('DEAL_ACCESS_DENIED')) return 'Você não possui acesso a esta negociação.';
  if (message.includes('DEAL_AUTH_REQUIRED')) return 'Confirme sua sessão para acessar documentos privados.';
  if (message.includes('DEAL_PARTICIPANT_EMAIL_REQUIRED')) return 'Informe o e-mail do participante antes de solicitar documentos.';
  if (message.includes('DEAL_DOCUMENTS_REQUIRED')) return 'Selecione ao menos um documento.';
  if (message.includes('DEAL_DOCUMENT_REQUIRED')) return 'Nenhum arquivo foi recebido para este item.';
  if (message.includes('DEAL_NOTE_REQUIRED')) return 'Informe o motivo da correção com pelo menos 3 caracteres.';
  if (message.includes('DEAL_DOSSIER_NOT_READY')) return 'Aprove todos os documentos obrigatórios e resolva as pendências impeditivas antes de congelar o dossiê.';
  if (message.includes('DEAL_ITEM_HAS_DOCUMENT')) return 'Um item que já possui arquivo não pode ser marcado como não aplicável.';
  if (message.includes('DEAL_SNAPSHOT_REQUIRED')) return 'Congele uma versão íntegra do dossiê antes de exportar.';
  if (message.includes('DEAL_REQUIRED_CLAUSE')) return 'Uma cláusula obrigatória não pode ser removida.';
  if (message.includes('DEAL_CLAUSE_CONFLICT')) return 'Existem cláusulas incompatíveis ou com dependências ausentes.';
  if (message.includes('DEAL_CONTRACT_FIELDS_REQUIRED')) return 'Preencha valor, pagamento, prazo, entrega da posse e cidade do foro antes de liberar a minuta.';
  if (message.includes('DEAL_NEGOTIATION_INVALID')) return 'Revise o título e as condições desta versão da negociação.';
  if (message.includes('DEAL_NEGOTIATION_REVIEW_UNAVAILABLE')) return 'Esta versão já foi concluída ou substituída e não pode gerar uma nova rodada.';
  if (message.includes('DEAL_REVIEWERS_EMAIL_REQUIRED')) return 'Informe o e-mail de todas as partes antes de enviar a proposta.';
  if (message.includes('DEAL_REVIEWERS_REQUIRED')) return 'Cadastre as partes da negociação antes de enviar a proposta.';
  if (message.includes('DEAL_LEGAL_CONTEXT_INVALID')) return 'Revise o tipo jurídico do imóvel e a jurisdição informada.';
  if (message.includes('SUPERSIGN_SANDBOX_NOT_CONFIGURED')) return 'Cadastre a secret SUPERSIGN_SANDBOX_API_KEY antes de testar a assinatura.';
  if (message.includes('DEAL_FINAL_CONTRACT_REQUIRED')) return 'A assinatura só é liberada depois da concordância unânime com a minuta final.';
  if (message.includes('DEAL_SIGNERS_EMAIL_REQUIRED')) return 'Todos os signatários precisam ter e-mail válido antes do envio.';
  return 'Não foi possível carregar o dossiê. Tente novamente em instantes.';
}
