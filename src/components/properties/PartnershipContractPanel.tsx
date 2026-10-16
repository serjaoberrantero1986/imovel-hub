import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, FileCheck2, Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  acknowledgePartnershipContract,
  createPartnershipContractDocumentUrl,
  createPartnershipContractDraft,
  createPortfolioContractRevision,
  createPortfolioPartnershipContractDraft,
  getPartnershipContractWorkspace,
  getPortfolioContractCandidates,
  PortfolioContractCandidate,
  getPropertyPartnershipLifecycle,
  partnershipContractErrorMessage,
  PartnershipContractWorkspace,
  PropertyPartnershipLifecycle,
  proposePropertyPartnershipAmendment,
  schedulePropertyPartnershipTermination,
  submitPartnershipSgrEvidence,
  uploadPartnershipContractDocument,
} from '../../lib/partnershipContracts';
import { PartnershipTerms } from '../../lib/propertyPartnerships';

const FIELD = 'mt-1 w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

export const PartnershipContractPanel: React.FC<{ negotiationId: string; currentTerms: PartnershipTerms; renderTermsEditor: (value: PartnershipTerms, onChange: (value: PartnershipTerms) => void) => React.ReactNode }> = ({ negotiationId, currentTerms, renderTermsEditor }) => {
  const { addToast } = useApp();
  const [workspace, setWorkspace] = useState<PartnershipContractWorkspace | null>(null);
  const [lifecycle, setLifecycle] = useState<PropertyPartnershipLifecycle | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sgrModelNumber, setSgrModelNumber] = useState('');
  const [candidates, setCandidates] = useState<PortfolioContractCandidate[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([negotiationId]);
  const [sourceNumbers, setSourceNumbers] = useState<Record<string, string>>({});
  const [revisionKind, setRevisionKind] = useState<'property_addendum' | 'fee_replacement' | null>(null);
  const [newCaptorShare, setNewCaptorShare] = useState(50);
  const [confirmedTerms, setConfirmedTerms] = useState(false);
  const [sgrNumber, setSgrNumber] = useState('');
  const [ledgerHash, setLedgerHash] = useState('');
  const [blockchainHash, setBlockchainHash] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('https://sgr.cofeci.gov.br/pesquisar-contrato');
  const [amendmentTerms, setAmendmentTerms] = useState<PartnershipTerms | null>(null);
  const [terminationReason, setTerminationReason] = useState('');
  const [showTermination, setShowTermination] = useState(false);
  const contractInput = useRef<HTMLInputElement>(null);
  const receiptInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [contractValue,lifecycleValue]=await Promise.all([getPartnershipContractWorkspace(negotiationId),getPropertyPartnershipLifecycle(negotiationId)]);
      setWorkspace(contractValue);setLifecycle(lifecycleValue);
      if (contractValue.party_role==='captor' && (!contractValue.contract || contractValue.contract.status==='rejected')) {
        const available=await getPortfolioContractCandidates(negotiationId);
        setCandidates(available);
        setSelectedProperties(current => current.includes(negotiationId) ? current : [negotiationId]);
        if (contractValue.contract?.status==='rejected') {
          setSourceNumbers(Object.fromEntries((contractValue.contract.properties||[]).map(item=>[item.negotiation_id,item.original_sgr_contract_number])));
          setSgrModelNumber(contractValue.contract.original_sgr_contract_number);
        }
      } else if (contractValue.party_role==='captor' && contractValue.contract?.portfolio_agreement_id && lifecycleValue?.status==='active') {
        const available=await getPortfolioContractCandidates(negotiationId);
        setCandidates(available);
        const scope=contractValue.contract.properties||[];
        setSelectedProperties(scope.map(item=>item.negotiation_id));
        setSourceNumbers(Object.fromEntries(scope.map(item=>[item.negotiation_id,item.original_sgr_contract_number])));
        setNewCaptorShare(Number((contractValue.contract.canonical_terms.terms as Record<string,unknown>)?.captor_share||50));
      } else setCandidates([]);
    }
    catch (error) { addToast({ type: 'error', title: 'Contrato indisponível', message: partnershipContractErrorMessage(error) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [negotiationId]);

  const run = async (action: () => Promise<void>, title: string, message?: string) => {
    setBusy(true);
    try { await action(); await load(); addToast({ type: 'success', title, message }); }
    catch (error) { addToast({ type: 'error', title: 'Etapa não concluída', message: partnershipContractErrorMessage(error) }); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando área contratual...</div>;
  if (!workspace) return null;
  if (!workspace.contract) return workspace.party_role === 'captor' ? (
    <section className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
      <div><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Formalização da parceria</h4><p className="text-[11px] text-slate-500 mt-1">Crie uma versão imutável dos termos aceitos. O contrato deverá ser assinado externamente no SGR/COFECI.</p></div>
      <p className="text-[11px] text-slate-500">Selecione outros imóveis com aceite preliminar do mesmo parceiro. Os termos aceitos precisam ser iguais; cada imóvel exige o número de seu contrato de origem no SGR.</p>
      {candidates.length > 0 && <div className="space-y-2">{candidates.map(item => {
        const checked=selectedProperties.includes(item.negotiation_id);
        return <div key={item.negotiation_id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={checked} disabled={item.negotiation_id===negotiationId} onChange={event=>setSelectedProperties(current=>event.target.checked?[...current,item.negotiation_id]:current.filter(id=>id!==item.negotiation_id))} className="rounded text-indigo-600" /><span>{item.code} · {item.title}</span><span className="ml-auto text-slate-500 font-normal">{item.captor_share}% / {item.partner_share}%</span></label>
          {checked && <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">Contrato de origem no SGR<input value={item.negotiation_id===negotiationId?sgrModelNumber:sourceNumbers[item.negotiation_id]||''} maxLength={120} onChange={event=>item.negotiation_id===negotiationId?setSgrModelNumber(event.target.value):setSourceNumbers(current=>({...current,[item.negotiation_id]:event.target.value}))} className={FIELD} placeholder="Número do contrato deste imóvel" /></label>}
        </div>;
      })}</div>}
      {candidates.length===0 && <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Número do contrato-modelo original no SGR<input value={sgrModelNumber} maxLength={120} onChange={event => setSgrModelNumber(event.target.value)} className={FIELD} placeholder="Informe o número exibido pelo SGR" /></label>}
      <div className="flex flex-wrap justify-between gap-2"><a href="https://sgr.cofeci.gov.br/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">Abrir SGR/COFECI <ExternalLink className="w-3.5 h-3.5" /></a><button type="button" disabled={busy || sgrModelNumber.trim().length < 3 || !workspace.accepted_term_version || selectedProperties.some(id=>id!==negotiationId && (sourceNumbers[id]||'').trim().length<3)} onClick={() => void run(() => selectedProperties.length>1 ? createPortfolioPartnershipContractDraft(negotiationId,workspace.accepted_term_version||0,selectedProperties.map(id=>({negotiation_id:id,original_sgr_contract_number:id===negotiationId?sgrModelNumber:sourceNumbers[id]||''}))) : createPartnershipContractDraft(negotiationId,workspace.accepted_term_version||0,sgrModelNumber), 'Versão contratual criada', 'As duas partes já podem conferir e confirmar os mesmos termos.')} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">Criar {selectedProperties.length>1?'contrato de carteira':'versão contratual'}</button></div>
    </section>
  ) : <p className="text-xs text-slate-500">O captador ainda precisa gerar a versão contratual dos termos aceitos.</p>;

  const contract = workspace.contract;
  const myAcknowledgement = workspace.acknowledgements.some(item => item.party_role === workspace.party_role);
  const signedContract = workspace.documents.some(item => item.document_kind === 'signed_contract');
  const receipt = workspace.documents.some(item => item.document_kind === 'sgr_receipt');
  const mySubmission = workspace.sgr_submissions.find(item => item.party_role === workspace.party_role);
  const locked = ['awaiting_verification', 'verified', 'superseded', 'rejected'].includes(contract.status);
  const portfolioScope = contract.properties || [];
  const revisionCandidates = [...portfolioScope, ...candidates.filter(item => !portfolioScope.some(current => current.negotiation_id === item.negotiation_id))];
  const revisionProperties = revisionCandidates.filter(item => selectedProperties.includes(item.negotiation_id)).map(item => ({
    negotiation_id: item.negotiation_id,
    original_sgr_contract_number: sourceNumbers[item.negotiation_id] || '',
  }));
  const sharedTerms = (contract.canonical_terms.terms || {}) as Record<string, unknown>;

  const upload = async (kind: 'signed_contract' | 'sgr_receipt', file?: File) => {
    if (!file) return;
    await run(() => uploadPartnershipContractDocument(contract.id, kind, file), 'Documento anexado', 'O arquivo original e seu resumo criptográfico foram registrados.');
    if (contractInput.current) contractInput.current.value = '';
    if (receiptInput.current) receiptInput.current.value = '';
  };

  const viewDocument = async (path: string) => {
    const preview = window.open('about:blank', '_blank');
    try { const url = await createPartnershipContractDocumentUrl(path); if (preview) preview.location.href = url; else window.location.href = url; }
    catch (error) { preview?.close(); addToast({ type: 'error', title: 'Documento indisponível', message: partnershipContractErrorMessage(error) }); }
  };

  return <section className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Contrato de parceria · versão {contract.version_number}</h4><p className="text-[11px] text-slate-500 mt-1">Código de integridade: <span className="font-mono break-all">{contract.canonical_sha256}</span></p></div><Status status={contract.status} /></div>
    {contract.status==='rejected' && workspace.party_role==='captor' && <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-3 space-y-2 text-xs"><p>Esta versão foi recusada. Confira a justificativa abaixo e prepare outra versão após corrigir a pendência.</p><button type="button" disabled={busy || !workspace.accepted_term_version} onClick={()=>void run(()=>contract.instrument_kind==='portfolio_contract' && portfolioScope.length>1 ? createPortfolioPartnershipContractDraft(negotiationId,workspace.accepted_term_version||0,portfolioScope.map(item=>({negotiation_id:item.negotiation_id,original_sgr_contract_number:item.original_sgr_contract_number}))) : createPartnershipContractDraft(negotiationId,workspace.accepted_term_version||0,contract.original_sgr_contract_number),'Nova versão criada','As duas partes precisam conferir novamente o documento e as evidências.')} className="rounded-xl bg-indigo-600 px-3 py-2 font-bold text-white disabled:opacity-50">Criar nova versão</button></div>}
    {contract.properties && contract.properties.length>1 && <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3"><strong className="block text-xs mb-2">Imóveis abrangidos por esta versão</strong><ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">{contract.properties.map(item=><li key={item.negotiation_id}>{item.code} · {item.title} · Origem SGR {item.original_sgr_contract_number}</li>)}</ul></div>}
    {contract.portfolio_agreement_id && workspace.party_role==='captor' && contract.status==='verified' && lifecycle?.contract_version_id===contract.id && <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
      <strong className="block text-xs">Atualizar contrato de carteira</strong>
      <p className="text-[11px] text-slate-500">A inclusão ou exclusão de imóveis exige aditivo. Uma nova divisão dos honorários exige outro contrato. A versão atual continua em vigor até a conferência do novo documento.</p>
      {!revisionKind ? <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setRevisionKind('property_addendum')} className="px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 dark:text-indigo-300 text-xs font-bold">Preparar aditivo de imóveis</button><button type="button" onClick={()=>setRevisionKind('fee_replacement')} className="px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 dark:text-indigo-300 text-xs font-bold">Novo contrato de honorários</button></div> : <div className="space-y-3">
        <h6 className="text-xs font-bold">{revisionKind==='property_addendum'?'Imóveis do aditivo':'Nova divisão dos honorários'}</h6>
        {revisionKind==='property_addendum' ? <div className="space-y-2">{revisionCandidates.map(item=>{
          const existing=portfolioScope.some(current=>current.negotiation_id===item.negotiation_id);
          const checked=selectedProperties.includes(item.negotiation_id);
          return <div key={item.negotiation_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={checked} onChange={event=>setSelectedProperties(current=>event.target.checked?[...current,item.negotiation_id]:current.filter(id=>id!==item.negotiation_id))} className="rounded text-indigo-600" /><strong>{item.code} · {item.title}</strong><span className="ml-auto text-slate-500">{existing?'No contrato vigente':'Aceite preliminar'}</span></label>{checked && <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">Contrato de origem no SGR<input value={sourceNumbers[item.negotiation_id]||''} disabled={existing} maxLength={120} onChange={event=>setSourceNumbers(current=>({...current,[item.negotiation_id]:event.target.value}))} className={`${FIELD} disabled:opacity-60`} /></label>}</div>;
        })}<p className="text-[11px] text-slate-500">Os imóveis retirados permanecem no histórico. O aditivo precisa ser assinado e conferido antes de alterar a publicação.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="block text-xs font-bold">Captador (%)<input type="number" min={1} max={99} value={newCaptorShare} onChange={event=>setNewCaptorShare(Number(event.target.value))} className={FIELD} /></label><label className="block text-xs font-bold">Parceiro (%)<input type="number" readOnly value={100-newCaptorShare} className={FIELD} /></label></div>}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setRevisionKind(null)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button type="button" disabled={busy || revisionProperties.length===0 || revisionProperties.some(item=>item.original_sgr_contract_number.trim().length<3) || (revisionKind==='fee_replacement' && (!Number.isInteger(newCaptorShare) || newCaptorShare<=0 || newCaptorShare>=100 || newCaptorShare===Number(sharedTerms.captor_share)))} onClick={()=>void run(()=>createPortfolioContractRevision({agreementId:contract.portfolio_agreement_id!,expectedContractId:contract.id,kind:revisionKind,properties:revisionKind==='fee_replacement'?portfolioScope.map(item=>({negotiation_id:item.negotiation_id,original_sgr_contract_number:item.original_sgr_contract_number})):revisionProperties,terms:revisionKind==='fee_replacement'?{...sharedTerms,captor_share:newCaptorShare,partner_share:100-newCaptorShare}:undefined}),revisionKind==='fee_replacement'?'Novo contrato preparado':'Aditivo preparado','As partes deverão conferir e formalizar esta versão no SGR.').then(()=>setRevisionKind(null))} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">Criar {revisionKind==='fee_replacement'?'novo contrato':'aditivo'}</button></div>
      </div>}
    </div>}
    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-[11px] text-amber-900 dark:text-amber-200"><strong>Importante:</strong> esta confirmação registra ciência dos termos no Web Imóveis, mas não constitui a assinatura eletrônica formal. A formalização ocorre no SGR/COFECI, fora da plataforma.</div>

    <div className="space-y-2"><label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"><input type="checkbox" checked={confirmedTerms} disabled={myAcknowledgement || locked} onChange={event => setConfirmedTerms(event.target.checked)} className="mt-0.5 rounded text-indigo-600" /><span>Li a versão integral, conferi o código de integridade e reconheço que qualquer alteração exigirá nova versão e nova confirmação.</span></label><button type="button" disabled={busy || myAcknowledgement || !confirmedTerms || locked} onClick={() => void run(() => acknowledgePartnershipContract(contract.id, contract.canonical_sha256), 'Ciência dos termos registrada')} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-2">{myAcknowledgement ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />} {myAcknowledgement ? 'Você já confirmou esta versão' : 'Confirmar ciência dos termos'}</button></div>

    <div className="space-y-3"><div><h5 className="text-xs font-extrabold">Documentos privados</h5><p className="text-[11px] text-slate-500">Após as duas confirmações, envie o contrato assinado em PDF e o comprovante do SGR. Imagens de comprovante passam pelo editor documental sem cortes estéticos.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input ref={contractInput} type="file" accept=".pdf,application/pdf" className="hidden" onChange={event => void upload('signed_contract', event.target.files?.[0])} /><input ref={receiptInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={event => void upload('sgr_receipt', event.target.files?.[0])} /><UploadButton disabled={busy || contract.status === 'awaiting_acknowledgements' || locked} done={signedContract} label="Contrato assinado (PDF)" onClick={() => contractInput.current?.click()} /><UploadButton disabled={busy || contract.status === 'awaiting_acknowledgements' || locked} done={receipt} label="Comprovante do SGR" onClick={() => receiptInput.current?.click()} /></div>{workspace.documents.length > 0 && <div className="space-y-2">{workspace.documents.map(item => <button key={item.id} type="button" onClick={() => void viewDocument(item.storage_path)} className="w-full flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-left"><span className="min-w-0"><strong className="block text-xs truncate">{item.original_name}</strong><span className="text-[10px] text-slate-500">{item.document_kind === 'signed_contract' ? 'Contrato assinado' : 'Comprovante do SGR'} · {(item.size_bytes / 1024 / 1024).toFixed(2)} MB</span></span><Eye className="w-4 h-4 shrink-0" /></button>)}</div>}</div>

    <div className="space-y-3"><div><h5 className="text-xs font-extrabold">Identificadores do SGR</h5><p className="text-[11px] text-slate-500">Cada parte informa os identificadores vistos no mesmo registro. A análise administrativa só será liberada quando os dois envios coincidirem.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Número do contrato" value={sgrNumber} onChange={setSgrNumber} /><Field label="Hash do livro CF" value={ledgerHash} onChange={setLedgerHash} /><Field label="Hash blockchain (quando exibido)" value={blockchainHash} onChange={setBlockchainHash} /><Field label="Link oficial de consulta" value={verificationUrl} onChange={setVerificationUrl} /></div><div className="flex flex-wrap items-center justify-between gap-2">{mySubmission ? <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Seu envio está na versão {mySubmission.submission_version}</span> : <span className="text-[11px] text-slate-500">Ainda não enviado por você.</span>}<button type="button" disabled={busy || !signedContract || !receipt || sgrNumber.trim().length < 3 || ledgerHash.trim().length < 8 || locked} onClick={() => void run(() => submitPartnershipSgrEvidence({ contractId: contract.id, sgrContractNumber: sgrNumber, cfLedgerHash: ledgerHash, blockchainHash, verificationUrl }), 'Evidência do SGR registrada', 'O envio anterior, se houver, foi preservado no histórico.')} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">Registrar evidência</button></div></div>
    {workspace.review && <div className={`rounded-2xl p-3 text-xs border ${workspace.review.decision === 'verified' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}><strong className="block">{workspace.review.decision === 'verified' ? 'Contrato verificado' : 'Correção solicitada'}</strong>{workspace.review.note}</div>}
{lifecycle && <div className="border-t border-indigo-200 dark:border-indigo-900 pt-4 space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><h5 className="text-xs font-extrabold">Ciclo da parceria</h5><p className="text-[11px] text-slate-500">Alterações não substituem o contrato vigente até a nova versão ser formalizada e verificada.</p></div><Status status={lifecycle.status} /></div>{lifecycle.ends_at && <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-[11px] text-amber-800 dark:text-amber-200"><strong>Encerramento programado:</strong> {new Date(lifecycle.ends_at).toLocaleString('pt-BR')}. O histórico e as atribuições anteriores serão preservados.</div>}{amendmentTerms ? <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-4"><h5 className="text-xs font-extrabold">Propor aditivo</h5>{renderTermsEditor(amendmentTerms,setAmendmentTerms)}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setAmendmentTerms(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button type="button" disabled={busy} onClick={() => void run(() => proposePropertyPartnershipAmendment({ negotiationId,expectedContractId:lifecycle.contract_version_id,terms:amendmentTerms }), 'Aditivo proposto', 'O contrato atual permanece válido enquanto a outra parte analisa os novos termos.').then(() => setAmendmentTerms(null))} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Enviar proposta de aditivo</button></div></div> : showTermination ? <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 p-4 space-y-3"><label className="block text-xs font-bold">Motivo do encerramento<textarea rows={3} maxLength={2000} value={terminationReason} onChange={event => setTerminationReason(event.target.value)} className={FIELD} placeholder="Descreva objetivamente o motivo. A outra parte receberá esta informação." /></label><p className="text-[11px] text-slate-500">A data efetiva será calculada pelo servidor conforme o aviso prévio da versão contratual vigente.</p><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setShowTermination(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Voltar</button><button type="button" disabled={busy || terminationReason.trim().length < 10} onClick={() => void run(async () => { const value=await schedulePropertyPartnershipTermination({ partnershipId:lifecycle.id,expectedUpdatedAt:lifecycle.updated_at,reason:terminationReason });setLifecycle(value); }, 'Encerramento registrado', 'A data efetiva respeita o aviso prévio contratual e todo o histórico foi preservado.').then(() => setShowTermination(false))} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50">Confirmar encerramento</button></div></div> : <div className="flex flex-wrap justify-end gap-2">{!contract.portfolio_agreement_id && <button type="button" disabled={busy || lifecycle.status!=='active' || Boolean(lifecycle.ends_at) || workspace.negotiation_status!=='active'} onClick={() => setAmendmentTerms(structuredClone(currentTerms))} className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold disabled:opacity-50">Propor alteração</button>}<button type="button" disabled={busy || lifecycle.status!=='active' || Boolean(lifecycle.ends_at)} onClick={() => setShowTermination(true)} className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold disabled:opacity-50">Encerrar parceria</button></div>}</div>}
    <div className="flex justify-between gap-2 text-[11px]"><a href="https://sgr.cofeci.gov.br/pesquisar-contrato" target="_blank" rel="noreferrer" className="font-bold text-indigo-600 inline-flex items-center gap-1">Consultar no SGR <ExternalLink className="w-3.5 h-3.5" /></a><button type="button" disabled={busy} onClick={() => void load()} className="font-bold text-slate-500 inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Atualizar</button></div>
  </section>;
};

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}<input value={value} maxLength={300} onChange={event => onChange(event.target.value)} className={FIELD} /></label>;
const UploadButton: React.FC<{ disabled: boolean; done: boolean; label: string; onClick: () => void }> = ({ disabled, done, label, onClick }) => <button type="button" disabled={disabled} onClick={onClick} className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${done ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>{done ? <FileCheck2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}{label}</button>;
const Status: React.FC<{ status: string }> = ({ status }) => { const labels: Record<string, string> = { awaiting_acknowledgements: 'Aguardando confirmações', awaiting_sgr: 'Aguardando SGR', awaiting_verification: 'Em conferência', verified: 'Ativa', rejected: 'Correção necessária', superseded: 'Substituída' }; return <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">{labels[status] || status}</span>; };
