import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, CalendarDays, CheckCircle2, ChevronRight, ExternalLink, FileCheck, FileText, Globe2, Image as ImageIcon, Loader2, Mail, ShieldAlert, UserRoundCheck, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { createCreciDocumentUrl, listCreciReviews, CreciReview, CreciReviewStatus, CreciDocument, reviseCreciDecision } from '../lib/creciDocuments';

const statusLabel = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Validade encerrada' };
const tabs: { key: CreciReviewStatus; label: string }[] = [{ key: 'pending', label: 'Pendentes' }, { key: 'approved', label: 'Aprovados' }, { key: 'rejected', label: 'Rejeitados' }, { key: 'expired', label: 'Validade encerrada' }];
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Data não informada';

export const AdminCreciReviewView: React.FC = () => {
  const { currentUser, isAuthenticated, setCurrentView, addToast } = useApp();
  const [reviews, setReviews] = useState<CreciReview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CreciReviewStatus>('pending');
  const [search, setSearch] = useState('');
  const [confirmation, setConfirmation] = useState<boolean | null>(null);
  const [queueError, setQueueError] = useState(false);
  const filtered = useMemo(() => reviews.filter(review => review.status === activeTab && `${review.name} ${review.creci} ${review.email}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))), [reviews, activeTab, search]);

  const [previewLoading, setPreviewLoading] = useState(false);

  const selected = useMemo(() => reviews.find(review => review.profileId === selectedId) || null, [reviews, selectedId]);
  const selectedSnapshot = useRef<CreciReview | null>(null);
  selectedSnapshot.current = selected;
  const selectedDocument = useMemo(() => selected?.documents.find(document => document.id === selectedDocumentId) || selected?.documents[0] || null, [selected, selectedDocumentId]);

  const load = useCallback(async (showLoading = false) => {
    if (currentUser.role !== 'admin') return;
    if (showLoading) setLoading(true);
    try {
      const nextReviews = await listCreciReviews();
      const opened = selectedSnapshot.current;
      if (opened && nextReviews.find(item => item.profileId === opened.profileId)?.revision !== opened.revision) {
        setSelectedId(null);
        addToast({ type: 'warning', title: 'Cadastro atualizado', message: 'Os dados deste profissional foram alterados. Abra o cadastro novamente antes de decidir.' });
      }
      setQueueError(false);
      setReviews(nextReviews);
      setSelectedId(previous => previous && nextReviews.some(review => review.profileId === previous) ? previous : null);
    } catch {
      setQueueError(true);
      addToast({ type: 'error', title: 'Fila temporariamente indisponível', message: 'Não foi possível atualizar as solicitações. Tentaremos novamente automaticamente.' });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [addToast, currentUser.role]);

  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    void load(true);
    const timer = window.setInterval(() => void load(false), 30_000);
    const handleQueueChange = () => void load(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load(false);
    };
    window.addEventListener('creci-review-queue-changed', handleQueueChange);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('creci-review-queue-changed', handleQueueChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser.role, load]);

  useEffect(() => {
    setSelectedDocumentId(selected?.documents[0]?.id || null);
    setNote('');
    setExpiresAt(selected?.expiresAt?.slice(0, 10) || '');
    setConfirmation(null);
  }, [selected?.profileId, selected?.revision]);

  useEffect(() => {
    let active = true;
    setDocumentUrl('');
    if (!selectedDocument) return;
    setPreviewLoading(true);
    void createCreciDocumentUrl(selectedDocument.storagePath)
      .then(url => { if (active) setDocumentUrl(url); })
      .catch(() => { if (active) addToast({ type: 'error', title: 'Documento indisponível', message: 'Não foi possível carregar a visualização deste documento.' }); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [selectedDocument?.id, selectedDocument?.storagePath, addToast]);

  if (!isAuthenticated || currentUser.role !== 'admin') {
    return <div className="min-h-[70vh] flex items-center justify-center px-4"><div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-4"><div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center"><ShieldAlert className="w-7 h-7" /></div><h1 className="text-2xl font-black font-['Outfit'] text-slate-900 dark:text-white">Acesso restrito</h1><p className="text-sm text-slate-500">Esta área é exclusiva da equipe administrativa autorizada.</p><button onClick={() => setCurrentView('portal')} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold">Voltar ao início</button></div></div>;
  }

  const decide = async (approved: boolean) => {
    if (!selected || loading) return;
    if ((!approved || selected.status !== 'pending') && !note.trim()) {
      addToast({ type: 'warning', title: 'Informe o motivo', message: 'A justificativa é obrigatória para rejeitar ou revisar uma decisão anterior.' });
      return;
    }
    if (approved && expiresAt && new Date(`${expiresAt}T23:59:59`).getTime() <= Date.now()) {
      addToast({ type: 'warning', title: 'Confira a validade', message: 'A data de validade da aprovação deve ser futura.' }); return;
    }
    setLoading(true);
    try {
      await reviseCreciDecision(selected, approved, note, approved && expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined);
      addToast({ type: 'success', title: approved ? 'CRECI aprovado' : 'Solicitação rejeitada', message: approved ? 'O selo foi liberado e a decisão registrada.' : 'O corretor poderá corrigir os documentos e solicitar uma nova análise.' });
      window.dispatchEvent(new Event('creci-review-updated'));
      setConfirmation(null);
      setSelectedId(null);
      selectedSnapshot.current = null;
      setActiveTab(approved ? 'approved' : 'rejected');
      await load(false);
    } catch {
      setConfirmation(null);
      addToast({ type: 'error', title: 'Decisão não registrada', message: 'Atualize a lista e confira se outro administrador alterou o cadastro. Tente novamente.' });
      await load(false);
    } finally { setLoading(false); }
  };

  const renderPreview = (document: CreciDocument) => {
    if (previewLoading) return <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />;
    if (!documentUrl) return <p className="text-sm text-slate-500">Visualização indisponível.</p>;
    if (document.mimeType === 'application/pdf') return <iframe key={documentUrl} src={documentUrl} title={`Documento de ${selected?.name}`} className="w-full h-[520px] rounded-2xl bg-white" />;
    return <img src={documentUrl} alt={`Documento de ${selected?.name}`} className="max-w-full max-h-[520px] object-contain rounded-2xl" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">Administração</span>
              <span className="text-xs text-slate-400 font-medium">Validação profissional</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Análises de CRECI</h1>
            <p className="text-xs sm:text-sm text-slate-500">Confira documentos privados e registre decisões auditadas.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={()=>setCurrentView('admin_portals')} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold flex items-center gap-2"><Globe2 className="w-4 h-4 text-rose-500"/> Portais profissionais</button>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 shadow-sm">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Aguardando análise</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{reviews.filter(review => review.status === 'pending').length}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div role="tablist" aria-label="Situação das análises" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
            {tabs.map(tab => <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} onClick={() => { setActiveTab(tab.key); setSelectedId(null); }} className={`px-3 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === tab.key ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>{tab.label} <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{reviews.filter(review => review.status === tab.key).length}</span></button>)}
          </div>
          <input aria-label="Buscar profissional por nome ou CRECI" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nome ou CRECI" className="w-full sm:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs" />
        </div>
        {queueError && <div role="alert" className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200">Não foi possível atualizar as análises. <button type="button" onClick={() => void load(true)} className="font-bold underline">Tentar novamente</button></div>}
        <div className="grid lg:grid-cols-[350px_minmax(0,1fr)] gap-5 items-start">
          <aside className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800"><h2 className="font-extrabold text-slate-900 dark:text-white">{tabs.find(tab => tab.key === activeTab)?.label}</h2><p className="text-xs text-slate-500 mt-1">Atualização automática em segundo plano</p></div>
            {loading && filtered.length === 0 ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div> : filtered.length === 0 ? <div className="p-10 text-center"><UserRoundCheck className="w-10 h-10 mx-auto text-emerald-400 mb-3" /><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{search ? 'Nenhum resultado' : 'Nenhum cadastro nesta aba'}</p><p className="text-xs text-slate-500 mt-1">Os cadastros aparecerão aqui conforme sua situação.</p></div> : filtered.map(review => (
              <button key={review.profileId} onClick={() => setSelectedId(review.profileId)} className={`w-full p-4 border-b border-slate-100 dark:border-slate-800 text-left flex items-center gap-3 transition-colors ${selectedId === review.profileId ? 'bg-rose-50 dark:bg-rose-950/25' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}><UserAvatar name={review.name} src={review.avatarUrl} className="w-11 h-11 rounded-xl shrink-0" /><div className="min-w-0 flex-1"><p className="font-bold text-sm text-slate-900 dark:text-white truncate">{review.name}</p><p className="text-xs text-slate-500 truncate">CRECI {review.creci}/{review.creciUf}</p><p className="text-[10px] text-slate-400 mt-1">{formatDate(review.requestedAt)}</p></div><ChevronRight className={`w-4 h-4 shrink-0 ${selectedId === review.profileId ? 'text-rose-600' : 'text-slate-300'}`} /></button>
            ))}
          </aside>

          <main className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {!selected ? <div className="min-h-[520px] flex flex-col items-center justify-center text-center p-8"><FileCheck className="w-12 h-12 text-slate-300 mb-4" /><h2 className="font-extrabold text-slate-800 dark:text-white">Selecione um corretor</h2><p className="text-sm text-slate-500 mt-1">Os dados e o documento aparecerão aqui automaticamente.</p></div> : <div>
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
                <UserAvatar name={selected.name} src={selected.avatarUrl} className="w-14 h-14 rounded-2xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">{selected.name}</h2>
                    <Badge size="sm" variant={selected.status === 'approved' ? 'success' : selected.status === 'rejected' ? 'danger' : 'warning'}>{statusLabel[selected.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selected.email}</span>
                    <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" />CRECI {selected.creci}/{selected.creciUf}</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(selected.reviewedAt || selected.requestedAt)}</span>
                    {selected.portalUrl&&<a href={selected.portalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-rose-600 hover:underline"><Globe2 className="w-3.5 h-3.5"/>{selected.portalSlug}.webimoveis.site <ExternalLink className="w-3 h-3"/></a>}
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-6">
                {selected.documents.length > 1 && <div className="flex flex-wrap gap-2">{selected.documents.map(document => <button key={document.id} onClick={() => setSelectedDocumentId(document.id)} className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${selectedDocument?.id === document.id ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{document.mimeType === 'application/pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}{document.documentKind === 'cirp' ? 'CIRP' : 'Certidão'}</button>)}</div>}
                {selectedDocument && <section><div className="flex items-center justify-between gap-3 mb-3"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Documento enviado</h3><p className="text-xs text-slate-500">{selectedDocument.originalName}</p></div><span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">{selectedDocument.documentKind === 'cirp' ? 'CIRP' : 'Certidão de regularidade'}</span></div><div className="min-h-[360px] rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-center overflow-hidden">{renderPreview(selectedDocument)}</div></section>}
                <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 sm:p-5 space-y-4"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Decisão administrativa</h3><p className="text-xs text-slate-500 mt-1">A decisão e o administrador responsável serão registrados no histórico.</p></div><div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Validade da aprovação (opcional)<input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="mt-1.5 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" /></label><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Observação ou justificativa<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={1000} placeholder="Obrigatória ao rejeitar ou revisar uma decisão" className="mt-1.5 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none" /></label></div><div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><button disabled={loading || selected.status === 'rejected'} onClick={() => setConfirmation(false)} className="px-5 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"><XCircle className="w-4 h-4" /> Rejeitar</button><button disabled={loading || selected.status === 'approved' || !selected.documents.some(document => document.documentKind === 'cirp')} onClick={() => setConfirmation(true)} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Aprovar CRECI</button></div></section>
                {selected.history.length > 0 && <section className="space-y-3"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Histórico de decisões</h3>{selected.history.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4"><div className="flex flex-wrap justify-between gap-2 text-xs"><strong>{item.decision === 'approved' ? 'Aprovado' : 'Rejeitado'} · {item.reviewerName}</strong><time className="text-slate-500">{formatDate(item.createdAt)}</time></div>{item.note && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{item.note}</p>}{item.expiresAt && <p className="mt-1 text-xs text-slate-500">Validade: {formatDate(item.expiresAt)}</p>}</article>)}</section>}
              </div>
            </div>}
          </main>
        </div>
      </div>
      <Modal isOpen={confirmation !== null} onClose={() => { if (!loading) setConfirmation(null); }} title={confirmation ? 'Confirmar aprovação' : selected?.status === 'approved' ? 'Retirar aprovação' : 'Confirmar rejeição'} description="Confira a decisão antes de registrá-la." footer={<div className="flex justify-end gap-2"><button type="button" disabled={loading} onClick={() => setConfirmation(null)} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold">Cancelar</button><button type="button" disabled={loading} onClick={() => confirmation !== null && void decide(confirmation)} className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-xs font-bold disabled:opacity-50">{loading ? 'Registrando...' : 'Confirmar decisão'}</button></div>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{confirmation ? 'O selo profissional será liberado. O corretor receberá um aviso da aprovação.' : 'O selo profissional será retirado e novas publicações que exigem aprovação serão bloqueadas. Os anúncios existentes serão preservados. O corretor receberá o motivo e poderá corrigir seus dados ou documentos.'}</p>
        <p className="mt-3 text-xs text-slate-500">A decisão e a justificativa ficarão registradas no histórico.</p>
      </Modal>
    </div>
  );
};
