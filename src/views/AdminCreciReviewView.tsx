import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, CheckCircle2, ChevronRight, FileCheck, FileText, Image as ImageIcon, Loader2, Mail, ShieldAlert, ShieldCheck, UserRoundCheck, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserAvatar } from '../components/ui/UserAvatar';
import { createCreciDocumentUrl, listPendingCreciReviews, PendingCreciReview, CreciDocument, reviewCreciRequest } from '../lib/creciDocuments';

const REFRESH_INTERVAL_MS = 30_000;
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Data não informada';

export const AdminCreciReviewView: React.FC = () => {
  const { currentUser, isAuthenticated, setCurrentView, addToast } = useApp();
  const [reviews, setReviews] = useState<PendingCreciReview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selected = useMemo(() => reviews.find(review => review.profileId === selectedId) || null, [reviews, selectedId]);
  const selectedDocument = useMemo(() => selected?.documents.find(document => document.id === selectedDocumentId) || selected?.documents[0] || null, [selected, selectedDocumentId]);

  const load = useCallback(async (showLoading = false) => {
    if (currentUser.role !== 'admin') return;
    if (showLoading) setLoading(true);
    try {
      const nextReviews = await listPendingCreciReviews();
      setReviews(nextReviews);
      setSelectedId(previous => previous && nextReviews.some(review => review.profileId === previous) ? previous : nextReviews[0]?.profileId || null);
    } catch {
      addToast({ type: 'error', title: 'Fila temporariamente indisponível', message: 'Não foi possível atualizar as solicitações. Tentaremos novamente automaticamente.' });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [addToast, currentUser.role]);

  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    void load(true);
    const timer = window.setInterval(() => void load(false), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [currentUser.role, load]);

  useEffect(() => {
    setSelectedDocumentId(selected?.documents[0]?.id || null);
    setNote('');
    setExpiresAt('');
  }, [selected?.profileId]);

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
  }, [selectedDocument, addToast]);

  if (!isAuthenticated || currentUser.role !== 'admin') {
    return <div className="min-h-[70vh] flex items-center justify-center px-4"><div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-4"><div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center"><ShieldAlert className="w-7 h-7" /></div><h1 className="text-2xl font-black font-['Outfit'] text-slate-900 dark:text-white">Acesso restrito</h1><p className="text-sm text-slate-500">Esta área é exclusiva da equipe administrativa autorizada.</p><button onClick={() => setCurrentView('portal')} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold">Voltar ao início</button></div></div>;
  }

  const decide = async (approved: boolean) => {
    if (!selected || loading) return;
    if (!approved && !note.trim()) {
      addToast({ type: 'warning', title: 'Informe o motivo', message: 'A justificativa é obrigatória para rejeitar a solicitação.' });
      return;
    }
    setLoading(true);
    try {
      await reviewCreciRequest(selected.profileId, approved, note, approved && expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined);
      addToast({ type: 'success', title: approved ? 'CRECI aprovado' : 'Solicitação rejeitada', message: approved ? 'O selo foi liberado e a decisão registrada.' : 'O corretor poderá corrigir os documentos e solicitar uma nova análise.' });
      window.dispatchEvent(new Event('creci-review-updated'));
      setSelectedId(null);
      await load(false);
    } catch {
      addToast({ type: 'error', title: 'Decisão não registrada', message: 'Não foi possível concluir a análise. Nenhuma alteração foi aplicada.' });
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-rose-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><ShieldCheck className="w-7 h-7 text-rose-300" /></div><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Administração</p><h1 className="text-2xl sm:text-3xl font-black font-['Outfit']">Análises de CRECI</h1><p className="text-sm text-slate-300 mt-1">Confira documentos privados e registre decisões auditadas.</p></div></div>
            <div className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 backdrop-blur-sm"><p className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Aguardando análise</p><p className="text-3xl font-black text-white">{reviews.length}</p></div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[350px_minmax(0,1fr)] gap-5 items-start">
          <aside className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800"><h2 className="font-extrabold text-slate-900 dark:text-white">Solicitações pendentes</h2><p className="text-xs text-slate-500 mt-1">Atualização automática a cada 30 segundos</p></div>
            {loading && reviews.length === 0 ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div> : reviews.length === 0 ? <div className="p-10 text-center"><UserRoundCheck className="w-10 h-10 mx-auto text-emerald-400 mb-3" /><p className="text-sm font-bold text-slate-700 dark:text-slate-200">Tudo em dia</p><p className="text-xs text-slate-500 mt-1">Não há solicitações aguardando análise.</p></div> : reviews.map(review => (
              <button key={review.profileId} onClick={() => setSelectedId(review.profileId)} className={`w-full p-4 border-b border-slate-100 dark:border-slate-800 text-left flex items-center gap-3 transition-colors ${selectedId === review.profileId ? 'bg-rose-50 dark:bg-rose-950/25' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}><UserAvatar name={review.name} className="w-11 h-11 rounded-xl shrink-0" /><div className="min-w-0 flex-1"><p className="font-bold text-sm text-slate-900 dark:text-white truncate">{review.name}</p><p className="text-xs text-slate-500 truncate">CRECI {review.creci}/{review.creciUf}</p><p className="text-[10px] text-slate-400 mt-1">{formatDate(review.requestedAt)}</p></div><ChevronRight className={`w-4 h-4 shrink-0 ${selectedId === review.profileId ? 'text-rose-600' : 'text-slate-300'}`} /></button>
            ))}
          </aside>

          <main className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {!selected ? <div className="min-h-[520px] flex flex-col items-center justify-center text-center p-8"><FileCheck className="w-12 h-12 text-slate-300 mb-4" /><h2 className="font-extrabold text-slate-800 dark:text-white">Selecione um corretor</h2><p className="text-sm text-slate-500 mt-1">Os dados e o documento aparecerão aqui automaticamente.</p></div> : <div>
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4"><UserAvatar name={selected.name} className="w-14 h-14 rounded-2xl shrink-0" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">{selected.name}</h2><span className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">Aguardando análise</span></div><div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500"><span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selected.email}</span><span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" />CRECI {selected.creci}/{selected.creciUf}</span><span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(selected.requestedAt)}</span></div></div></div>
              <div className="p-5 sm:p-6 space-y-6">
                {selected.documents.length > 1 && <div className="flex flex-wrap gap-2">{selected.documents.map(document => <button key={document.id} onClick={() => setSelectedDocumentId(document.id)} className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${selectedDocument?.id === document.id ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{document.mimeType === 'application/pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}{document.documentKind === 'cirp' ? 'CIRP' : 'Certidão'}</button>)}</div>}
                {selectedDocument && <section><div className="flex items-center justify-between gap-3 mb-3"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Documento enviado</h3><p className="text-xs text-slate-500">{selectedDocument.originalName}</p></div><span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">{selectedDocument.documentKind === 'cirp' ? 'CIRP' : 'Certidão de regularidade'}</span></div><div className="min-h-[360px] rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-center overflow-hidden">{renderPreview(selectedDocument)}</div></section>}
                <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 sm:p-5 space-y-4"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Decisão administrativa</h3><p className="text-xs text-slate-500 mt-1">A decisão e o administrador responsável serão registrados no histórico.</p></div><div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Validade da aprovação (opcional)<input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="mt-1.5 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" /></label><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Observação ou justificativa<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={1000} placeholder="Obrigatória em caso de rejeição" className="mt-1.5 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none" /></label></div><div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><button disabled={loading} onClick={() => void decide(false)} className="px-5 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"><XCircle className="w-4 h-4" /> Rejeitar</button><button disabled={loading} onClick={() => void decide(true)} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Aprovar CRECI</button></div></section>
              </div>
            </div>}
          </main>
        </div>
      </div>
    </div>
  );
};
