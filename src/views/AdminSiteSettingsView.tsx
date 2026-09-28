import React, { useMemo, useState } from 'react';
import { Armchair, ArrowUpDown, Bike, Camera, Dog, Dumbbell, Flame, Gamepad2, Loader2, Pencil, Plus, Search, Settings2, ShieldAlert, ShieldCheck, Smile, Sparkles, Sun, Thermometer, Trash2, Trophy, Waves, Wind, Wine, Zap } from 'lucide-react';
import { useApp, useCatalog } from '../context/AppContext';
import { AmenityCatalogItem, AmenityCategory, AmenityInput, createAmenity, deleteAmenity, setAmenityActive, updateAmenity } from '../lib/amenitiesCatalog';

const CATEGORIES: { id: AmenityCategory; label: string }[] = [
  { id: 'lazer', label: 'Lazer' }, { id: 'seguranca', label: 'Segurança' },
  { id: 'conforto', label: 'Conforto' }, { id: 'estrutura', label: 'Estrutura' }
];
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Waves, Flame, Dumbbell, Trophy, Smile, Sparkles, Gamepad2, ShieldCheck, Camera,
  Bike, ArrowUpDown, Wind, Wine, Sun, Zap, Dog, Armchair, Thermometer
};
const ICON_NAMES = Object.keys(ICONS);
const emptyForm: AmenityInput = { name: '', category: 'lazer', icon: 'Sparkles', displayOrder: 10 };

export const AdminSiteSettingsView: React.FC = () => {
  const { currentUser, isAuthenticated, setCurrentView, addToast } = useApp();
  const { amenities, loadingAmenities, refreshAmenities } = useCatalog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | AmenityCategory>('all');
  const [editing, setEditing] = useState<AmenityCatalogItem | null>(null);
  const [form, setForm] = useState<AmenityInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => amenities.filter(item =>
    (category === 'all' || item.category === category) &&
    item.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))
  ), [amenities, category, search]);
  const activeCount = amenities.filter(item => item.isActive).length;

  if (!isAuthenticated || currentUser.role !== 'admin') {
    return <div className="min-h-[70vh] flex items-center justify-center px-4"><div className="max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-4"><ShieldAlert className="w-12 h-12 mx-auto text-rose-600" /><h1 className="text-2xl font-black font-['Outfit']">Acesso restrito</h1><p className="text-sm text-slate-500">Somente administradores podem alterar as configurações do site.</p><button onClick={() => setCurrentView('portal')} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold">Voltar ao início</button></div></div>;
  }

  const openNew = () => {
    const nextOrder = amenities.reduce((highest, item) => Math.max(highest, item.displayOrder), 0) + 10;
    setEditing(null); setForm({ ...emptyForm, displayOrder: nextOrder }); setModalOpen(true);
  };
  const openEdit = (item: AmenityCatalogItem) => {
    setEditing(item); setForm({ name: item.name, category: item.category, icon: item.icon, displayOrder: item.displayOrder }); setModalOpen(true);
  };
  const save = async () => {
    if (!form.name.trim()) return addToast({ type: 'warning', title: 'Nome obrigatório', message: 'Informe o nome da comodidade.' });
    setBusyId(editing?.id || 'new');
    try {
      if (editing) await updateAmenity(editing.id, form); else await createAmenity(form);
      await refreshAmenities(); setModalOpen(false);
      addToast({ type: 'success', title: editing ? 'Comodidade atualizada' : 'Comodidade criada', message: 'A alteração já está disponível no portal.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Alteração não salva', message: error?.message || 'Tente novamente.' });
    } finally { setBusyId(null); }
  };
  const toggle = async (item: AmenityCatalogItem) => {
    setBusyId(item.id);
    try {
      await setAmenityActive(item.id, !item.isActive); await refreshAmenities();
      addToast({ type: 'success', title: item.isActive ? 'Comodidade desativada' : 'Comodidade ativada' });
    } catch { addToast({ type: 'error', title: 'Situação não alterada', message: 'Não foi possível salvar a alteração.' }); }
    finally { setBusyId(null); }
  };
  const remove = async (item: AmenityCatalogItem) => {
    setBusyId(item.id);
    try {
      await deleteAmenity(item.id); await refreshAmenities(); setDeleteId(null);
      addToast({ type: 'success', title: 'Comodidade excluída' });
    } catch (error: any) { setDeleteId(null); addToast({ type: 'warning', title: 'Exclusão não realizada', message: error?.message || 'Desative o item para preservá-lo.' }); }
    finally { setBusyId(null); }
  };

  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8"><div className="max-w-7xl mx-auto space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-rose-950 p-6 sm:p-8 text-white shadow-xl"><div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl" /><div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5"><div className="flex items-start gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><Settings2 className="w-7 h-7 text-rose-300" /></div><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Administração</p><h1 className="text-2xl sm:text-3xl font-black font-['Outfit']">Configurações do Site</h1><p className="text-sm text-slate-300 mt-1">Gerencie os catálogos exibidos no portal.</p></div></div><button onClick={openNew} className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/30"><Plus className="w-4 h-4" /> Nova comodidade</button></div></section>

    <div className="grid grid-cols-2 gap-3 sm:max-w-md"><div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"><p className="text-[10px] uppercase font-bold text-slate-400">Ativas</p><p className="text-2xl font-black text-emerald-600">{activeCount}</p></div><div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"><p className="text-[10px] uppercase font-bold text-slate-400">Inativas</p><p className="text-2xl font-black text-slate-500">{amenities.length - activeCount}</p></div></div>

    <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"><div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3"><label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar comodidade" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs" /></label><select value={category} onChange={event => setCategory(event.target.value as any)} className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"><option value="all">Todas as categorias</option>{CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      {loadingAmenities ? <div className="p-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-rose-500" /></div> : filtered.length === 0 ? <div className="p-16 text-center"><Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-3" /><p className="text-sm font-bold">Nenhuma comodidade encontrada</p></div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map(item => { const Icon = ICONS[item.icon] || Sparkles; return <div key={item.id} className="p-4 sm:p-5 flex items-center gap-3"><div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Icon className="w-5 h-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{CATEGORIES.find(value => value.id === item.category)?.label}</span></div><p className="text-[10px] text-slate-400 mt-1">Ordem {item.displayOrder} · Identificador {item.id}</p></div><button type="button" role="switch" aria-checked={item.isActive} disabled={busyId === item.id} onClick={() => void toggle(item)} title={item.isActive ? 'Desativar' : 'Ativar'} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.isActive ? 'translate-x-1' : '-translate-x-4'}`} /></button><button onClick={() => openEdit(item)} className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600" title="Editar"><Pencil className="w-4 h-4" /></button>{deleteId === item.id ? <div className="flex items-center gap-1"><button disabled={busyId === item.id} onClick={() => void remove(item)} className="px-2.5 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-bold">Confirmar</button><button onClick={() => setDeleteId(null)} className="px-2 py-2 text-[10px] text-slate-500">Cancelar</button></div> : <button onClick={() => setDeleteId(item.id)} className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600" title="Excluir"><Trash2 className="w-4 h-4" /></button>}</div>; })}</div>}
    </section>
  </div>

  {modalOpen && <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"><div><h2 className="text-xl font-black font-['Outfit']">{editing ? 'Editar comodidade' : 'Nova comodidade'}</h2><p className="text-xs text-slate-500 mt-1">As alterações salvas serão atualizadas automaticamente no portal.</p></div><div className="grid sm:grid-cols-2 gap-4"><label className="sm:col-span-2 text-xs font-bold">Nome<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={100} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" /></label><label className="text-xs font-bold">Categoria<select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as AmenityCategory }))} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Ordem<input type="number" min="0" value={form.displayOrder} onChange={event => setForm(current => ({ ...current, displayOrder: Math.max(0, Number(event.target.value)) }))} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" /></label><label className="sm:col-span-2 text-xs font-bold">Ícone<select value={form.icon} onChange={event => setForm(current => ({ ...current, icon: event.target.value }))} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{ICON_NAMES.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div><div className="flex justify-end gap-2"><button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button disabled={busyId !== null} onClick={() => void save()} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">{busyId && <Loader2 className="w-4 h-4 animate-spin" />} Salvar alterações</button></div></div></div>}
  </div>;
};
