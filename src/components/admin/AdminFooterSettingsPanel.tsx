import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useApp, useCatalog } from '../../context/AppContext';
import { FooterSettings, saveFooterSettings } from '../../lib/portalSettings';
import { AdminCatalogSection } from './AdminCatalogSection';

interface Props { open: boolean; onToggle: () => void; }

const fields: { key: keyof FooterSettings; label: string; type?: string; full?: boolean }[] = [
  { key: 'brandDescription', label: 'Descrição do portal', full: true },
  { key: 'creci', label: 'Identificação profissional' },
  { key: 'professionalName', label: 'Nome do responsável' },
  { key: 'serviceTitle', label: 'Título do atendimento' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'address', label: 'Endereço', full: true },
  { key: 'businessHours', label: 'Horário de atendimento', full: true },
  { key: 'navigationTitle', label: 'Título da navegação' },
  { key: 'connectionTitle', label: 'Título das redes sociais' },
  { key: 'newsletterText', label: 'Texto de novidades', full: true },
  { key: 'instagramUrl', label: 'Endereço do Instagram', type: 'url' },
  { key: 'facebookUrl', label: 'Endereço do Facebook', type: 'url' },
  { key: 'youtubeUrl', label: 'Endereço do YouTube', type: 'url' },
  { key: 'linkedinUrl', label: 'Endereço do LinkedIn', type: 'url' },
  { key: 'copyrightText', label: 'Texto de direitos autorais', full: true }
];

export const AdminFooterSettingsPanel: React.FC<Props> = ({ open, onToggle }) => {
  const { footerSettings, refreshFooterSettings } = useCatalog();
  const { addToast } = useApp();
  const [form, setForm] = useState(footerSettings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(footerSettings), [footerSettings]);

  const save = async () => {
    if (!form.brandDescription.trim() || !form.copyrightText.trim()) {
      addToast({ type: 'warning', title: 'Informações obrigatórias', message: 'Preencha a descrição do portal e o texto de direitos autorais.' });
      return;
    }
    setSaving(true);
    try {
      await saveFooterSettings(form);
      await refreshFooterSettings();
      addToast({ type: 'success', title: 'Rodapé atualizado', message: 'As informações já estão disponíveis no portal.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Alterações não salvas', message: error?.message || 'Não foi possível atualizar o rodapé.' });
    } finally { setSaving(false); }
  };

  return <AdminCatalogSection title="Rodapé do site" description="Edite atendimento, redes sociais e textos institucionais." activeCount={1} inactiveCount={0} open={open} onToggle={onToggle} action={<button disabled={saving} onClick={() => void save()} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Salvar</button>}>
    <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(field => <label key={field.key} className={`${field.full ? 'sm:col-span-2' : ''} text-xs font-bold text-slate-700 dark:text-slate-200`}>{field.label}<input type={field.type || 'text'} value={form[field.key]} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal" /></label>)}
      <p className="sm:col-span-2 text-[11px] text-slate-500">Termos de uso, privacidade, defesa do consumidor e preferências de cookies permanecem protegidos no rodapé.</p>
    </div>
  </AdminCatalogSection>;
};
