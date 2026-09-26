import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, FileCheck, Loader2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createCreciDocumentUrl, listPendingCreciReviews, PendingCreciReview, reviewCreciRequest } from '../lib/creciDocuments';

export const AdminCreciReviewView: React.FC = () => {
  const { currentUser, isAuthenticated, setCurrentView, addToast } = useApp();
  const [reviews, setReviews] = useState<PendingCreciReview[]>([]);
  const [selected, setSelected] = useState<PendingCreciReview | null>(null);
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (currentUser.role !== 'admin') return;
    setLoading(true);
    try { setReviews(await listPendingCreciReviews()); }
    catch (error: any) { addToast({ type: 'error', title: 'Fila indisponível', message: error.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [currentUser.id, currentUser.role]);

  if (!isAuthenticated || currentUser.role !== 'admin') {
    return <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4"><ShieldAlert className="w-12 h-12 mx-auto text-rose-600" /><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-slate-500">Esta área é exclusiva da equipe autorizada do portal.</p><button onClick={() => setCurrentView('portal')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Voltar ao início</button></div>;
  }

  const viewDocument = async (path: string) => {
    const preview = window.open('about:blank', '_blank');
    try {
      const url = await createCreciDocumentUrl(path);
      if (preview) preview.location.href = url;
      else window.location.href = url;
    } catch (error: any) {
      preview?.close();
      addToast({ type: 'error', title: 'Documento indisponível', message: error.message });
    }
  };

  const decide = async (approved: boolean) => {
    if (!selected || loading) return;
    if (!approved && !note.trim()) {
      addToast({ type: 'warning', title: 'Justificativa obrigatória', message: 'Informe o motivo da rejeição.' });
      return;
    }
    setLoading(true);
    try {
      await reviewCreciRequest(selected.profileId, approved, note, approved && expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined);
      addToast({ type: 'success', title: approved ? 'CRECI aprovado' : 'Solicitação rejeitada', message: 'A decisão foi registrada no histórico administrativo.' });
      setSelected(null); setNote(''); setExpiresAt('');
      await load();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Decisão não registrada', message: error.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-indigo-600 uppercase">Administração</p><h1 className="text-2xl font-extrabold">Análises de CRECI</h1><p className="text-sm text-slate-500">Documentos privados e decisões auditadas.</p></div><button onClick={() => void load()} disabled={loading} className="p-3 rounded-xl bg-white dark:bg-slate-900 border"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
        <div className="grid lg:grid-cols-[360px_1fr] gap-5">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden">
            <div className="p-4 border-b text-sm font-bold">Pendentes ({reviews.length})</div>
            {reviews.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Nenhuma solicitação pendente.</div> : reviews.map(review => <button key={review.profileId} onClick={() => { setSelected(review); setNote(''); setExpiresAt(''); }} className={`w-full p-4 border-b text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${selected?.profileId === review.profileId ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}><p className="font-bold text-sm">{review.name}</p><p className="text-xs text-slate-500">CRECI {review.creci} · {review.creciUf}</p><p className="text-[10px] text-slate-400 mt-1">{review.documents.length} documento(s)</p></button>)}
          </div>
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5">
            {!selected ? <div className="h-full min-h-72 flex flex-col items-center justify-center text-center text-slate-500"><FileCheck className="w-10 h-10 mb-3 text-slate-300" /><p className="text-sm">Selecione uma solicitação para conferir.</p></div> : <div className="space-y-5">
              <div><h2 className="text-lg font-bold">{selected.name}</h2><p className="text-xs text-slate-500">{selected.email} · CRECI {selected.creci}/{selected.creciUf}</p></div>
              <div className="space-y-2"><h3 className="text-xs font-bold uppercase text-slate-500">Documentos</h3>{selected.documents.map(document => <button key={document.id} onClick={() => void viewDocument(document.storagePath)} className="w-full flex items-center justify-between p-3 rounded-xl border hover:border-indigo-400"><div className="text-left min-w-0"><p className="text-xs font-bold truncate">{document.originalName}</p><p className="text-[10px] text-slate-500">{document.documentKind === 'cirp' ? 'CIRP' : 'Certidão de regularidade'}</p></div><Eye className="w-4 h-4 text-indigo-600" /></button>)}</div>
              <div className="grid sm:grid-cols-2 gap-3"><div><label className="text-xs font-bold">Validade da aprovação (opcional)</label><input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="mt-1 w-full p-2.5 rounded-xl border bg-transparent text-xs" /></div><div><label className="text-xs font-bold">Observação / justificativa</label><textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={1000} className="mt-1 w-full p-2.5 rounded-xl border bg-transparent text-xs" /></div></div>
              <div className="flex flex-col sm:flex-row justify-end gap-2"><button disabled={loading} onClick={() => void decide(false)} className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Rejeitar</button><button disabled={loading} onClick={() => void decide(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Aprovar CRECI</button></div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
};
