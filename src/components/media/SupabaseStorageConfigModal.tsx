import React, { useState } from 'react';
import { Database, X } from 'lucide-react';
import { sanitizeSupabaseUrl, updateSupabaseCredentials } from '../../lib/supabaseClient';

interface SupabaseStorageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl: string;
  initialKey: string;
  initialBucket: string;
  onSaved: (message: string) => void;
}

export const SupabaseStorageConfigModal: React.FC<SupabaseStorageConfigModalProps> = ({
  isOpen,
  onClose,
  initialUrl,
  initialKey,
  initialBucket,
  onSaved
}) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [keyInput, setKeyInput] = useState(initialKey);
  const [bucketInput, setBucketInput] = useState(initialBucket);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeSupabaseUrl(urlInput);
    const cleanKey = keyInput.trim().replace(/^["']+|["']+$/g, '');
    const cleanBucket = bucketInput.trim() || 'property-images';

    localStorage.setItem('imovelhub_supabase_url', cleanUrl);
    localStorage.setItem('imovelhub_supabase_anon_key', cleanKey);
    localStorage.setItem('imovelhub_supabase_bucket', cleanBucket);
    
    updateSupabaseCredentials(cleanUrl, cleanKey);
    onSaved('Conexão com o Supabase Storage configurada.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            <span>Configurar Supabase Storage</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Integração nativa com buckets do Supabase Storage para armazenamento permanente de fotos dos imóveis.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Supabase Project URL:
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Supabase Anon Key:
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Storage Bucket:
            </label>
            <input
              type="text"
              value={bucketInput}
              onChange={(e) => setBucketInput(e.target.value)}
              placeholder="property-images"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
            ✅ O sistema opera com fallback automático para armazenamento local comprimido de altíssima performance caso as credenciais não estejam configuradas.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
            >
              Salvar Credenciais
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
