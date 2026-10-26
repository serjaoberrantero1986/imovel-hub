import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, ChevronDown, ChevronUp, ExternalLink, FileCheck2, FolderLock, Loader2, Mail, Plus, RefreshCw, RotateCcw, Send, Users, X } from 'lucide-react';
import { Lead, Property } from '../../types';
import { addDealParticipant, DealDocumentCatalogItem, DealDocumentFile, DealDossier, dealDossierErrorMessage, getDealDocumentUrl, loadDealDocumentCatalog, loadDealDossier, markDealNotificationsRead, moveDealDossierStage, openDealDocument, reviewDealDocument, sendDealDocumentRequest, startDealDossier } from '../../lib/dealDossiers';
import { Toast } from '../../context/appTypes';
import { useApp } from '../../context/AppContext';
import { formatPersonName, formatPhoneInput, isValidEmail, isValidPhone, normalizeEmailInput } from '../../lib/formInput';
import { DealDossierReviewSummary } from './DealDossierReviewSummary';
import { DealContractBuilder } from './DealContractBuilder';
import { DealContractReviewStatus } from './DealContractReviewStatus';
import { DealNegotiationPanel } from './DealNegotiationPanel';
import { DealSignaturePanel } from './DealSignaturePanel';

interface Props {
  lead: Lead;
  property?: Property;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const stages = [
  ['inherited_data', 'Dados'], ['negotiation', 'Negociação'], ['participants', 'Partes'], ['personal_documents', 'Pessoais'],
  ['property_documents', 'Imóvel'], ['certificates', 'Certidões'], ['review', 'Conferência'],
  ['contract', 'Contrato'], ['signatures', 'Assinaturas'], ['completed', 'Concluído']
] as const;

const roleLabel: Record<string, string> = {
  owner: 'Proprietário', co_owner: 'Coproprietário', buyer: 'Comprador', tenant: 'Locatário', spouse: 'Cônjuge',
  guarantor: 'Fiador', representative: 'Representante', captor: 'Corretor captador', partner_broker: 'Corretor parceiro', agency: 'Imobiliária', other: 'Participante'
};

export const DealDossierPanel: React.FC<Props> = ({ lead, property, addToast }) => {
  const { currentUser } = useApp();
  const [dossier, setDossier] = useState<DealDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [participantOpen, setParticipantOpen] = useState(false);
  const [requestParticipantId, setRequestParticipantId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<DealDocumentCatalogItem[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [requestInstructions, setRequestInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [correctionItemId, setCorrectionItemId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [participantForm, setParticipantForm] = useState({ role: 'owner', name: '', email: '', phone: '' });
  const activeIndex = useMemo(() => Math.max(0, stages.findIndex(([key]) => key === dossier?.currentStage)), [dossier?.currentStage]);

  const refresh = async () => {
    setLoading(true);
    try { const loaded=await loadDealDossier(lead.id);setDossier(loaded);if(loaded)void markDealNotificationsRead(loaded.id).catch(()=>undefined); }
    catch (error) { addToast({ type: 'error', title: 'Dossiê indisponível', message: dealDossierErrorMessage(error) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [lead.id]);

  const handleStart = async () => {
    setCreating(true);
    try {
      await startDealDossier(lead.id);
      await refresh();
      addToast({ type: 'success', title: 'Dossiê iniciado', message: 'Os dados já existentes do lead e do imóvel foram aproveitados.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Dossiê não iniciado', message: dealDossierErrorMessage(error) });
    } finally { setCreating(false); }
  };

  const handleAddParticipant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dossier || !currentUser || participantForm.name.trim().length < 2) return;
    if(participantForm.email&&!isValidEmail(participantForm.email)){addToast({type:'warning',title:'E-mail inválido',message:'Confira o endereço usado para a solicitação de documentos.'});return;}
    if(participantForm.phone&&!isValidPhone(participantForm.phone)){addToast({type:'warning',title:'Telefone inválido',message:'Informe o DDD e o número completo.'});return;}
    setSaving(true);
    try {
      await addDealParticipant(dossier.id, currentUser.id, participantForm);
      setParticipantForm({ role: 'owner', name: '', email: '', phone: '' });
      setParticipantOpen(false);
      await refresh();
      addToast({ type: 'success', title: 'Participante adicionado', message: 'A pessoa já pode receber solicitações desta negociação.' });
    } catch (error) { addToast({ type: 'error', title: 'Participante não adicionado', message: dealDossierErrorMessage(error) }); }
    finally { setSaving(false); }
  };

  const openDocumentRequest = async (participantId: string) => {
    setSaving(true);
    try { setCatalog(await loadDealDocumentCatalog(dossier.propertyLegalRegime)); setSelectedDocuments([]); setRequestInstructions(''); setRequestParticipantId(participantId); }
    catch (error) { addToast({ type: 'error', title: 'Lista indisponível', message: dealDossierErrorMessage(error) }); }
    finally { setSaving(false); }
  };

  const handleSendRequest = async () => {
    if (!requestParticipantId || selectedDocuments.length === 0) { addToast({ type: 'warning', title: 'Selecione os documentos', message: 'Marque ao menos um item para enviar a solicitação.' }); return; }
    setSaving(true);
    try {
      await sendDealDocumentRequest({ participantId: requestParticipantId, items: selectedDocuments.map(key => ({ key, required: true })), instructions: requestInstructions, validDays: 7 });
      setRequestParticipantId(null);
      await refresh();
      addToast({ type: 'success', title: 'Solicitação enviada', message: 'O participante recebeu um link pessoal e temporário por e-mail.' });
    } catch (error) { addToast({ type: 'error', title: 'Solicitação não enviada', message: dealDossierErrorMessage(error) }); }
    finally { setSaving(false); }
  };

  const handleReview = async (itemId:string,decision:'approve'|'request_correction')=>{
    if(decision==='request_correction'&&correctionNote.trim().length<3){addToast({type:'warning',title:'Informe o motivo',message:'Descreva a correção necessária com pelo menos 3 caracteres.'});return;}
    setSaving(true);
    try{await reviewDealDocument(itemId,decision,decision==='request_correction'?correctionNote:undefined);setCorrectionItemId(null);setCorrectionNote('');await refresh();addToast({type:'success',title:decision==='approve'?'Documento aprovado':'Correção solicitada',message:decision==='approve'?'A aprovação e o progresso do dossiê foram atualizados.':'O motivo ficou registrado e o link permite uma nova versão.'});}
    catch(error){addToast({type:'error',title:'Conferência não salva',message:dealDossierErrorMessage(error)});}finally{setSaving(false);}
  };

  const handleMoveStage=async(direction:'previous'|'next')=>{if(!dossier)return;setSaving(true);try{await moveDealDossierStage(dossier.id,direction);await refresh();}catch(error){addToast({type:'error',title:'Etapa não alterada',message:dealDossierErrorMessage(error)});}finally{setSaving(false);}};

  if (loading) return <div className="flex min-h-52 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-rose-600" /> Carregando negociação...</div>;

  if (!dossier) return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 dark:border-cyan-900 dark:bg-cyan-950/20">
        <div className="flex items-start gap-3"><FolderLock className="mt-0.5 h-6 w-6 shrink-0 text-cyan-600" /><div><h3 className="font-['Outfit'] text-lg font-black text-slate-900 dark:text-white">Iniciar dossiê documental</h3><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">O sistema aproveitará o anúncio, o imóvel, o interessado e o profissional responsável. As perguntas seguintes tratarão somente das informações que ainda não constam no portal.</p></div></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="text-[10px] font-bold uppercase text-slate-400">Imóvel</p><p className="mt-1 font-bold">{property?.title || lead.propertyTitle}</p><p className="text-xs text-slate-500">Código {property?.code || lead.propertyCode}</p></div>
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="text-[10px] font-bold uppercase text-slate-400">Interessado</p><p className="mt-1 font-bold">{lead.buyerName}</p><p className="text-xs text-slate-500">{lead.buyerEmail || lead.buyerPhone || 'Contato ainda incompleto'}</p></div>
      </div>
      {lead.status !== 'documentation' ? <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Para liberar o dossiê, altere o estágio do lead para <strong>Fechamento e documental</strong>.</span></div> : <button type="button" disabled={creating} onClick={() => void handleStart()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition-colors hover:bg-rose-700 disabled:opacity-50">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Iniciar dossiê desta negociação</button>}
    </div>
  );

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Negociação e documentos</p><h3 className="font-['Outfit'] text-xl font-black text-slate-900 dark:text-white">Dossiê de {property?.title || lead.propertyTitle}</h3><p className="text-xs text-slate-500">Os dados herdados permanecem registrados sem alterar o anúncio.</p></div><button type="button" onClick={() => void refresh()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"><RefreshCw className="h-4 w-4" /> Atualizar</button></div>
    <div className="overflow-x-auto pb-2"><div className="flex min-w-[760px] items-start">{stages.map(([key,label],index) => { const done=index<activeIndex || dossier.currentStage==='completed'; const active=index===activeIndex; return <React.Fragment key={key}><div className="flex w-20 shrink-0 flex-col items-center text-center"><div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${done?'border-emerald-500 bg-emerald-500 text-white':active?'border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-600/25':'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'}`}>{done?<Check className="h-4 w-4"/>:<span className="text-xs font-black">{index+1}</span>}</div><span className={`mt-2 text-[10px] font-bold ${active?'text-rose-600':'text-slate-500'}`}>{label}</span></div>{index<stages.length-1&&<div className={`mt-4 h-1 flex-1 rounded-full ${index<activeIndex?'bg-emerald-500':'bg-slate-200 dark:bg-slate-800'}`} />}</React.Fragment>; })}</div></div>
    <div className="flex items-center justify-between gap-3"><button type="button" disabled={saving||activeIndex===0} onClick={()=>void handleMoveStage('previous')} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"><ArrowLeft className="h-4 w-4"/> Voltar</button><p className="text-center text-[10px] text-slate-500">Etapa {activeIndex+1} de {stages.length}</p><button type="button" disabled={saving||activeIndex===stages.length-1} onClick={()=>void handleMoveStage('next')} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Avançar <ArrowRight className="h-4 w-4"/></button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="flex items-center gap-2 text-xs font-bold"><Users className="h-4 w-4 text-cyan-600"/> Participantes</p><p className="mt-2 text-2xl font-black">{dossier.participants.length}</p></div><div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="flex items-center gap-2 text-xs font-bold"><FileCheck2 className="h-4 w-4 text-violet-600"/> Solicitações</p><p className="mt-2 text-2xl font-black">{dossier.requestCount}</p></div><div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="flex items-center gap-2 text-xs font-bold"><Building2 className="h-4 w-4 text-rose-600"/> Progresso</p><p className="mt-2 text-2xl font-black">{dossier.progress}%</p></div></div>
    <DealNegotiationPanel dossier={dossier} refresh={refresh} addToast={addToast}/>
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black">Partes já identificadas</h4><button type="button" onClick={()=>setParticipantOpen(value=>!value)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"><Plus className="h-3.5 w-3.5"/> Adicionar parte</button></div>
    {participantOpen&&<form onSubmit={handleAddParticipant} className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-800/60"><select value={participantForm.role} onChange={e=>setParticipantForm({...participantForm,role:e.target.value})} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="owner">Proprietário</option><option value="co_owner">Coproprietário</option><option value="buyer">Comprador</option><option value="tenant">Locatário</option><option value="spouse">Cônjuge</option><option value="guarantor">Fiador</option><option value="representative">Representante</option><option value="other">Outro participante</option></select><input required minLength={2} value={participantForm.name} onChange={e=>setParticipantForm({...participantForm,name:formatPersonName(e.target.value)})} placeholder="Nome completo" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"/><input type="email" value={participantForm.email} onChange={e=>setParticipantForm({...participantForm,email:normalizeEmailInput(e.target.value)})} placeholder="E-mail para solicitações" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"/><input inputMode="tel" value={participantForm.phone} onChange={e=>setParticipantForm({...participantForm,phone:formatPhoneInput(e.target.value)})} placeholder="Telefone com DDD" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"/><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setParticipantOpen(false)} className="px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Salvar participante</button></div></form>}
    <div className="mt-3 space-y-2">{dossier.participants.map(participant=><div key={participant.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/60"><div><p className="text-xs font-bold">{participant.name}</p><p className="text-[10px] text-slate-500">{roleLabel[participant.role] || 'Participante'} · {participant.email || 'E-mail não informado'} · {participant.source==='lead'?'Importado do lead':'Cadastrado no dossiê'}</p></div><button type="button" disabled={!participant.email||saving} onClick={()=>void openDocumentRequest(participant.id)} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Mail className="h-3.5 w-3.5"/> Solicitar documentos</button></div>)}</div></div>
    {dossier.documentRequests.length>0&&<section className="space-y-3"><div><h4 className="text-sm font-black">Documentos recebidos e pendentes</h4><p className="mt-1 text-xs text-slate-500">Confira o arquivo atual. Aprovações e pedidos de correção ficam preservados no histórico.</p></div>{dossier.documentRequests.map(request=>{const participant=dossier.participants.find(item=>item.id===request.participantId);return <div key={request.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black">{participant?.name||'Participante'}</p><p className="text-[10px] text-slate-500">{roleLabel[participant?.role||'']||'Participante'} · solicitação {request.status==='completed'?'concluída':'em andamento'}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800">{request.items.filter(item=>item.status==='approved').length}/{request.items.length} aprovados</span></div><div className="space-y-2">{request.items.map(item=>{const file=item.files[0];return <div key={item.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold">{item.label}</p><p className="text-[10px] text-slate-500">{item.status==='approved'?'Aprovado':item.status==='correction_requested'?'Correção solicitada':file?`Recebido · versão ${file.version}`:'Aguardando envio'}</p>{item.decisionNote&&<p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">{item.decisionNote}</p>}</div><div className="flex flex-wrap gap-2">{file&&<DealDocumentPreview file={file} addToast={addToast}/>}{file&&item.status!=='approved'&&<><button type="button" disabled={saving} onClick={()=>void handleReview(item.id,'approve')} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5"/> Aprovar</button><button type="button" disabled={saving} onClick={()=>{setCorrectionItemId(item.id);setCorrectionNote('');}} className="flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-2 text-[10px] font-bold text-amber-700 dark:text-amber-300"><RotateCcw className="h-3.5 w-3.5"/> Pedir correção</button></>}</div></div>{correctionItemId===item.id&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20"><textarea autoFocus value={correctionNote} onChange={event=>setCorrectionNote(event.target.value)} minLength={3} maxLength={1000} rows={3} placeholder="Explique o que precisa ser corrigido" className="w-full rounded-xl border border-amber-200 bg-white p-3 text-xs dark:border-amber-800 dark:bg-slate-900"/><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={()=>setCorrectionItemId(null)} className="px-3 py-2 text-[10px] font-bold">Cancelar</button><button type="button" disabled={saving||correctionNote.trim().length<3} onClick={()=>void handleReview(item.id,'request_correction')} className="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Registrar correção</button></div></div>}</div>;})}</div></div>;})}</section>}
    {currentUser&&dossier.documentRequests.length>0&&<DealDossierReviewSummary dossier={dossier} actorId={currentUser.id} refresh={refresh} addToast={addToast}/>}
    {['ready_for_contract','contract_review','signing','completed'].includes(dossier.status)&&<DealContractBuilder dossier={dossier} refresh={refresh} addToast={addToast}/>}
    {['contract_review','signing','completed'].includes(dossier.status)&&<DealContractReviewStatus dossierId={dossier.id} addToast={addToast}/>}
    {['contract_review','signing','completed'].includes(dossier.status)&&<DealSignaturePanel dossier={dossier} addToast={addToast}/>} 
    {requestParticipantId&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"><div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800"><div><p className="text-[10px] font-bold uppercase text-cyan-600">Solicitação individual</p><h3 className="font-['Outfit'] text-xl font-black">Escolha os documentos</h3></div><button type="button" onClick={()=>setRequestParticipantId(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5"/></button></div><div className="space-y-4 overflow-y-auto p-5"><p className="text-sm text-slate-500">O destinatário receberá um link pessoal, sem código adicional, válido por sete dias.</p><div className="space-y-2">{catalog.map(item=><label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 hover:border-cyan-400 dark:border-slate-700"><input type="checkbox" checked={selectedDocuments.includes(item.key)} onChange={()=>setSelectedDocuments(current=>current.includes(item.key)?current.filter(key=>key!==item.key):[...current,item.key])} className="mt-1 h-4 w-4 accent-cyan-600"/><span><span className="block text-xs font-bold">{item.label}</span><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{item.description}</span></span></label>)}</div><textarea value={requestInstructions} onChange={e=>setRequestInstructions(e.target.value)} rows={3} maxLength={1000} placeholder="Orientações adicionais (opcional)" className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900"/></div><div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800"><button type="button" onClick={()=>setRequestParticipantId(null)} className="px-4 py-2 text-xs font-bold">Cancelar</button><button type="button" disabled={saving||selectedDocuments.length===0} onClick={()=>void handleSendRequest()} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>} Solicitar ao participante</button></div></div></div>}
  </div>;
};

const DealDocumentPreview:React.FC<{file:DealDocumentFile;addToast:(toast:Omit<Toast,'id'>)=>void}>=({file,addToast})=>{
  const[open,setOpen]=useState(false),[url,setUrl]=useState(''),[loading,setLoading]=useState(false);
  const toggle=async()=>{if(open){setOpen(false);return}setOpen(true);if(url)return;setLoading(true);try{setUrl(await getDealDocumentUrl(file.storagePath))}catch(error){setOpen(false);addToast({type:'error',title:'Documento indisponível',message:dealDossierErrorMessage(error)})}finally{setLoading(false)}};
  const image=file.mimeType.startsWith('image/'),pdf=file.mimeType==='application/pdf';
  return <div className="w-full sm:w-auto"><button type="button" onClick={()=>void toggle()} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold dark:border-slate-700">{open?<ChevronUp className="h-3.5 w-3.5"/>:<ChevronDown className="h-3.5 w-3.5"/>}{open?'Recolher':'Exibir documento'}</button>{open&&<div className="mt-3 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 sm:w-[32rem]">{loading?<div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-rose-600"/></div>:image?<img src={url} alt={file.name} className="max-h-[65vh] w-full object-contain"/>:pdf?<iframe src={url} title={file.name} className="h-[65vh] w-full rounded-lg"/>:<p className="p-5 text-xs text-slate-500">Prévia indisponível para este formato.</p>}<button type="button" onClick={()=>void openDealDocument(file.storagePath)} className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-600"><ExternalLink className="h-3.5 w-3.5"/> Abrir em nova guia</button></div>}</div>
};
