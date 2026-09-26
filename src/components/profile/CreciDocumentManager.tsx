import React, { useEffect, useRef, useState } from 'react';
import { Eye, FileCheck, Loader2, Trash2, Upload } from 'lucide-react';
import { Toast } from '../../context/appTypes';
import { UserProfile } from '../../types';
import {
  createCreciDocumentUrl,
  CreciDocument,
  CreciDocumentKind,
  deleteCreciDocument,
  listMyCreciDocuments,
  uploadCreciDocument
} from '../../lib/creciDocuments';

interface Props {
  user: UserProfile;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  onCountChange?: (count: number) => void;
}

export const CreciDocumentManager: React.FC<Props> = ({ user, addToast, onCountChange }) => {
  const [documents, setDocuments] = useState<CreciDocument[]>([]);
  const [kind, setKind] = useState<CreciDocumentKind>('cirp');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = user.creciReviewStatus === 'pending' || user.creciReviewStatus === 'approved';

  const refresh = async () => {
    try {
      const items = await listMyCreciDocuments();
      setDocuments(items);
      onCountChange?.(items.length);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Documentos indisponíveis', message: error.message || 'Não foi possível carregar os documentos.' });
    }
  };

  useEffect(() => { void refresh(); }, []);

  const handleUpload = async (file?: File) => {
    if (!file || locked) return;
    setBusy(true);
    try {
      await uploadCreciDocument(user.id, file, kind);
      await refresh();
      addToast({ type: 'success', title: 'Documento adicionado', message: 'O arquivo privado foi anexado à solicitação.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Upload não realizado', message: error.message || 'Não foi possível enviar o documento.' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleView = async (document: CreciDocument) => {
    const preview = window.open('about:blank', '_blank');
    try {
      const url = await createCreciDocumentUrl(document.storagePath);
      if (preview) preview.location.href = url;
      else window.location.href = url;
    } catch (error: any) {
      preview?.close();
      addToast({ type: 'error', title: 'Documento indisponível', message: error.message });
    }
  };

  const handleDelete = async (document: CreciDocument) => {
    if (locked) return;
    setBusy(true);
    try {
      await deleteCreciDocument(document);
      await refresh();
      addToast({ type: 'success', title: 'Documento removido' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Documento não removido', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileCheck className="w-4 h-4 text-indigo-600" /> Documentos comprobatórios</h4>
        <p className="text-[11px] text-slate-500 mt-1">Envie a CIRP ou uma certidão de regularidade em PDF, JPEG ou PNG, com até 8 MB. Os arquivos são privados.</p>
      </div>

      {!locked && (
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={kind} onChange={event => setKind(event.target.value as CreciDocumentKind)} className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
            <option value="cirp">Carteira de Identidade Profissional (CIRP)</option>
            <option value="regularity_certificate">Certidão de regularidade</option>
          </select>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={event => void handleUpload(event.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Anexar documento
          </button>
        </div>
      )}

      <div className="space-y-2">
        {documents.length === 0 ? <p className="text-xs text-amber-700 dark:text-amber-300">Nenhum documento anexado. É necessário anexar ao menos um para solicitar a análise.</p> : documents.map(document => (
          <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
            <div className="min-w-0"><p className="text-xs font-bold truncate">{document.originalName}</p><p className="text-[10px] text-slate-500">{document.documentKind === 'cirp' ? 'CIRP' : 'Certidão de regularidade'} · {(document.fileSize / 1024 / 1024).toFixed(2)} MB</p></div>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={() => void handleView(document)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800" title="Visualizar"><Eye className="w-4 h-4" /></button>
              {!locked && <button type="button" disabled={busy} onClick={() => void handleDelete(document)} className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600" title="Excluir"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        ))}
      </div>
      {locked && <p className="text-[11px] text-slate-500">Os documentos ficam bloqueados para alterações durante ou após a análise.</p>}
    </div>
  );
};
