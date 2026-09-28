import React, { useMemo, useState } from 'react';
import { AlertCircle, Armchair, ArrowDown, ArrowUp, ArrowUpDown, Bike, Camera, Dog, Dumbbell, Flame, Gamepad2, GripVertical, Loader2, Pencil, Plus, Search, ShieldAlert, ShieldCheck, Smile, Sparkles, Sun, Thermometer, Trash2, Trophy, Waves, Wind, Wine, Zap } from 'lucide-react';
import { useApp, useCatalog } from '../context/AppContext';
import { AmenityCatalogItem, AmenityCategory, AmenityInput, createAmenity, deleteAmenity, setAmenityActive, updateAmenity } from '../lib/amenitiesCatalog';
import { AdminPropertyTypesPanel } from '../components/admin/AdminPropertyTypesPanel';
import { AdminCatalogSection } from '../components/admin/AdminCatalogSection';
import { AdminFooterSettingsPanel } from '../components/admin/AdminFooterSettingsPanel';
import { Switch } from '../components/ui/Switch';
import { CATALOG_ICON_OPTIONS } from '../lib/iconOptions';

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
  const { amenities, loadingAmenities, amenitiesError, refreshAmenities } = useCatalog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | AmenityCategory>('all');
  const [editing, setEditing] = useState<AmenityCatalogItem | null>(null);
  const [form, setForm] = useState<AmenityInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openCatalog, setOpenCatalog] = useState<'amenities' | 'propertyTypes' | 'footer' | null>('amenities');
  const [dragAmenityId, setDragAmenityId] = useState<string | null>(null);

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
  const swapAmenities = async (item: AmenityCatalogItem, other: AmenityCatalogItem) => {
    setBusyId(item.id);
    try {
      await updateAmenity(item.id,{name:item.name,category:item.category,icon:item.icon,displayOrder:other.displayOrder});
      await updateAmenity(other.id,{name:other.name,category:other.category,icon:other.icon,displayOrder:item.displayOrder});
      await refreshAmenities();
    } finally { setBusyId(null); }
  };
  const moveAmenity = async (item: AmenityCatalogItem, direction: -1 | 1) => {
    const ordered = [...amenities].sort((a,b)=>a.displayOrder-b.displayOrder);
    const index = ordered.findIndex(value=>value.id===item.id); const other = ordered[index+direction]; if (other) await swapAmenities(item,other);
  };
  const dropAmenity = async (target: AmenityCatalogItem) => {
    const source=amenities.find(item=>item.id===dragAmenityId); setDragAmenityId(null);
    if(source&&source.id!==target.id) await swapAmenities(source,target);
  };

  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8"><div className="max-w-7xl mx-auto space-y-6">
    <section><div className="flex items-center gap-2"><span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">Administração</span><span className="text-xs text-slate-400 font-medium">Catálogos do portal</span></div><h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Configurações do Site</h1><p className="text-xs sm:text-sm text-slate-500">Gerencie os catálogos exibidos no portal.</p></section>

    <AdminCatalogSection title="Comodidades" description="Gerencie conforto, lazer, estrutura e segurança." activeCount={activeCount} inactiveCount={amenities.length-activeCount} open={openCatalog==='amenities'} onToggle={()=>setOpenCatalog(current=>current==='amenities'?null:'amenities')} action={<button onClick={openNew} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/20"><Plus className="w-4 h-4" />Nova comodidade</button>}>

    {amenitiesError && <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-600 shrink-0" /><p className="text-xs text-amber-800 dark:text-amber-300 flex-1">{amenitiesError}</p><button onClick={() => void refreshAmenities()} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">Tentar novamente</button></div>}

    <div><div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3"><label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar comodidade" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs" /></label><select value={category} onChange={event => setCategory(event.target.value as any)} className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"><option value="all">Todas as categorias</option>{CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      {loadingAmenities ? <div className="p-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-rose-500" /></div> : filtered.length === 0 ? <div className="p-16 text-center"><Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-3" /><p className="text-sm font-bold">Nenhuma comodidade encontrada</p></div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((item,index) => { const Icon = ICONS[item.icon] || Sparkles; return <div key={item.id} draggable onDragStart={()=>setDragAmenityId(item.id)} onDragOver={event=>event.preventDefault()} onDrop={()=>void dropAmenity(item)} className="p-4 sm:p-5 flex items-center gap-3"><GripVertical className="w-4 h-4 text-slate-300 cursor-grab"/><div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Icon className="w-5 h-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{CATEGORIES.find(value => value.id === item.category)?.label}</span></div></div><div className="hidden sm:flex"><button disabled={index===0||busyId!==null} onClick={()=>void moveAmenity(item,-1)} className="p-1.5 text-slate-400 disabled:opacity-20" title="Mover para cima"><ArrowUp className="w-4 h-4"/></button><button disabled={index===filtered.length-1||busyId!==null} onClick={()=>void moveAmenity(item,1)} className="p-1.5 text-slate-400 disabled:opacity-20" title="Mover para baixo"><ArrowDown className="w-4 h-4"/></button></div><Switch checked={item.isActive} disabled={busyId===item.id} onChange={()=>void toggle(item)} label={item.isActive?'Desativar comodidade':'Ativar comodidade'}/><button onClick={() => openEdit(item)} className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600" title="Editar"><Pencil className="w-4 h-4" /></button>{deleteId === item.id ? <div className="flex items-center gap-1"><button disabled={busyId === item.id} onClick={() => void remove(item)} className="px-2.5 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-bold">Confirmar</button><button onClick={() => setDeleteId(null)} className="px-2 py-2 text-[10px] text-slate-500">Cancelar</button></div> : <button onClick={() => setDeleteId(item.id)} className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600" title="Excluir"><Trash2 className="w-4 h-4" /></button>}</div>; })}</div>}
    </div>
    </AdminCatalogSection>
    <AdminPropertyTypesPanel open={openCatalog==='propertyTypes'} onToggle={()=>setOpenCatalog(current=>current==='propertyTypes'?null:'propertyTypes')} />
    <AdminFooterSettingsPanel open={openCatalog==='footer'} onToggle={()=>setOpenCatalog(current=>current==='footer'?null:'footer')} />
  </div>

  {modalOpen && <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"><div><h2 className="text-xl font-black font-['Outfit']">{editing ? 'Editar comodidade' : 'Nova comodidade'}</h2><p className="text-xs text-slate-500 mt-1">As alterações salvas serão atualizadas automaticamente no portal.</p></div><div className="grid sm:grid-cols-2 gap-4"><label className="sm:col-span-2 text-xs font-bold">Nome<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={100} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" /></label><label className="sm:col-span-2 text-xs font-bold">Categoria<select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as AmenityCategory }))} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="sm:col-span-2 text-xs font-bold">Ícone<select value={form.icon} onChange={event => setForm(current => ({ ...current, icon: event.target.value }))} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{CATALOG_ICON_OPTIONS.filter(item=>ICON_NAMES.includes(item.value)).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div><div className="flex justify-end gap-2"><button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button disabled={busyId !== null} onClick={() => void save()} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">{busyId && <Loader2 className="w-4 h-4 animate-spin" />} Salvar alterações</button></div></div></div>}
  </div>;
};
