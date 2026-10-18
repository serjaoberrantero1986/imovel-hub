import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, ClipboardList, ExternalLink, MapPin, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  addValuationComparable, createValuation, listMyValuations, listValuationComparables,
  updateValuationComparable, type ValuationAssessment, type ValuationAssessmentInput,
  type ValuationComparable, type ValuationComparableInput, type ValuationPropertyType,
  type ValuationSourceType, type ValuationCoordinateQuality,
} from '../lib/valuation/assessmentRepository';
import { auditComparables } from '../lib/valuation/engine.mjs';

const propertyTypes: Array<{ value: ValuationPropertyType; label: string }> = [
  { value: 'house', label: 'Casa' }, { value: 'apartment', label: 'Apartamento' },
  { value: 'land', label: 'Terreno' }, { value: 'commercial', label: 'Comercial' },
  { value: 'other', label: 'Outro' },
];
const sources: Array<{ value: ValuationSourceType; label: string }> = [
  { value: 'real_estate_agency', label: 'Site de imobiliária' },
  { value: 'olx', label: 'OLX' }, { value: 'facebook_marketplace', label: 'Facebook Marketplace' },
  { value: 'portal', label: 'Portal de classificados' }, { value: 'other', label: 'Outra fonte' },
];
const fieldClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const money = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount);
const numeric = (value: string): number | null => value.trim() === '' ? null : Number(value);
const textLimit = (text: string, max: number) => text.trim().slice(0, max);
const dateText = (date: string) => new Date(date).toLocaleDateString('pt-BR');

type NumericField = 'land_area' | 'built_area' | 'bedrooms' | 'suites' | 'bathrooms' | 'parking_spots';
const numericFields: Array<{ key: NumericField; label: string }> = [
  { key: 'land_area', label: 'Terreno (m²)' }, { key: 'built_area', label: 'Construção (m²)' },
  { key: 'bedrooms', label: 'Dormitórios' }, { key: 'suites', label: 'Suítes' }, { key: 'bathrooms', label: 'Banheiros' },
  { key: 'parking_spots', label: 'Vagas' },
];
type AssessmentDraft = {
  title: string; property_type: ValuationPropertyType; state: string; city: string;
  neighborhood: string; street: string; street_number: string;
  land_area: string; built_area: string; bedrooms: string; suites: string; bathrooms: string; parking_spots: string;
  latitude: string; longitude: string; condominium: boolean; notes: string;
};
const emptyAssessment: AssessmentDraft = {
  title: '', property_type: 'house', state: 'SP', city: '', neighborhood: '',
  street: '', street_number: '', land_area: '', built_area: '', bedrooms: '', suites: '',
  bathrooms: '', parking_spots: '', latitude: '', longitude: '', condominium: false, notes: '',
};
type ComparableDraft = {
  source_type: ValuationSourceType; source_name: string; listing_url: string;
  listing_reference: string; asking_price: string; property_type: ValuationPropertyType;
  land_area: string; built_area: string; bedrooms: string; suites: string; bathrooms: string; parking_spots: string;
  latitude: string; longitude: string; coordinate_quality: 'property' | 'street';
  availability: 'active' | 'unknown'; market_zone_verified: boolean; reviewed_by_broker: boolean;
  conflicting_data: boolean; multi_unit: boolean; unfinished: boolean; notes: string;
};
const newComparable = (propertyType: ValuationPropertyType): ComparableDraft => ({
  source_type: 'real_estate_agency', source_name: '', listing_url: '', listing_reference: '',
  asking_price: '', property_type: propertyType, land_area: '', built_area: '',
  bedrooms: '', bathrooms: '', parking_spots: '', latitude: '', longitude: '',
  coordinate_quality: 'street', availability: 'unknown', market_zone_verified: false,
  reviewed_by_broker: false, conflicting_data: false, multi_unit: false, unfinished: false, notes: '',
});
const inputNumber = (value: string) => value.trim() === '' || (Number.isFinite(Number(value)) && Number(value) >= 0);
const validCoordinatePair = (lat: string, lng: string) => {
  if (!lat.trim() && !lng.trim()) return true;
  if (!lat.trim() || !lng.trim()) return false;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
};
function IntegerAreaFields({ draft, setDraft }: {
  draft: { [K in NumericField]: string };
  setDraft: (key: NumericField, value: string) => void;
}) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {numericFields.map(({ key, label }) => (
      <label key={key} className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <input type="number" step={key.includes('area') ? '0.01' : '1'} min="0"
          value={draft[key]} onChange={event => setDraft(key, event.target.value)}
          className={fieldClass} placeholder="Não informado" />
      </label>
    ))}
  </div>;
}

export const ValuationView: React.FC = () => {
  const { currentUser, isAuthenticated, openAuthModal, setCurrentView, addToast } = useApp();
  const allowed = isAuthenticated && (currentUser.role === 'broker' || currentUser.role === 'agency');
  const [assessments, setAssessments] = useState<ValuationAssessment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comparables, setComparables] = useState<ValuationComparable[]>([]);
  const [assessmentDraft, setAssessmentDraft] = useState<AssessmentDraft>(emptyAssessment);
  const [comparableDraft, setComparableDraft] = useState<ComparableDraft>(newComparable('house'));
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showComparableForm, setShowComparableForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComparables, setLoadingComparables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const selected = useMemo(() => assessments.find(item => item.id === selectedId) ?? null, [assessments, selectedId]);

  useEffect(() => {
    let active = true;
    setAssessments([]);
    setSelectedId(null);
    setComparables([]);
    if (!allowed) return;
    setLoading(true);
    setErrorText('');
    void listMyValuations().then(data => {
      if (active) {
        setAssessments(data);
        setSelectedId(data[0]?.id ?? null);
      }
    }).catch(() => {
      if (active) setErrorText('Não foi possível consultar as avaliações. Confirme a instalação do módulo e sua sessão.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, currentUser.id]);

  useEffect(() => {
    let active = true;
    setComparables([]);
    if (!allowed || !selectedId) return;
    setLoadingComparables(true);
    void listValuationComparables(selectedId).then(items => {
      if (active) setComparables(items);
    }).catch(() => {
      if (active) setErrorText('Não foi possível carregar os anúncios vinculados a esta avaliação.');
    }).finally(() => { if (active) setLoadingComparables(false); });
    return () => { active = false; };
  }, [allowed, selectedId, currentUser.id]);

  const results = useMemo(() => {
    if (!selected) return null;
    const coords = selected.latitude !== null && selected.longitude !== null
      ? { lat: Number(selected.latitude), lng: Number(selected.longitude) } : null;
    return auditComparables({
      propertyType: selected.property_type,
      landArea: selected.land_area === null ? null : Number(selected.land_area),
      builtArea: selected.built_area === null ? null : Number(selected.built_area),
      condominium: selected.condominium,
      coordinates: coords, coordinateQuality: selected.coordinate_quality,
    }, comparables.map(item => ({
      id: item.id,
      source: item.source_name,
      publisher: item.source_name,
      sourceListingId: item.listing_reference,
      listingUrl: item.listing_url,
      propertyType: item.property_type,
      askingPrice: Number(item.asking_price),
      landArea: item.land_area === null ? null : Number(item.land_area),
      builtArea: item.built_area === null ? null : Number(item.built_area),
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      condominium: item.condominium,
      coordinates: item.latitude !== null && item.longitude !== null
        ? { lat: Number(item.latitude), lng: Number(item.longitude) } : null,
      coordinateQuality: item.coordinate_quality,
      availability: item.availability,
      marketZoneVerified: item.market_zone_verified,
      reviewedByBroker: item.reviewed_by_broker,
      conflictingData: item.conflicting_data,
      multiUnit: item.multi_unit,
      unfinished: item.unfinished,
    })));
  }, [comparables, selected]);

  const notifyFailure = () => {
    addToast({ type: 'error', title: 'Não foi possível salvar', message: 'Confira os dados e suas permissões de acesso.' });
  };
  const onCreateAssessment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!validCoordinatePair(assessmentDraft.latitude, assessmentDraft.longitude) ||
      !numericFields.every(f => inputNumber(assessmentDraft[f.key]))) {
      setErrorText('Corrija a localização e os números informados antes de salvar.');
      return;
    }
    if (!assessmentDraft.title.trim() || !assessmentDraft.city.trim()) {
      setErrorText('Informe o título e a cidade do imóvel.');
      return;
    }
    const loc = assessmentDraft.latitude.trim() !== '';
    const input: ValuationAssessmentInput = {
      title: textLimit(assessmentDraft.title, 180),
      property_type: assessmentDraft.property_type,
      state: assessmentDraft.state.toUpperCase(), city: textLimit(assessmentDraft.city, 120),
      neighborhood: textLimit(assessmentDraft.neighborhood, 120), street: textLimit(assessmentDraft.street, 200),
      street_number: textLimit(assessmentDraft.street_number, 20), notes: textLimit(assessmentDraft.notes, 3000),
      land_area: numeric(assessmentDraft.land_area), built_area: numeric(assessmentDraft.built_area),
      bedrooms: numeric(assessmentDraft.bedrooms), suites: numeric(assessmentDraft.suites), bathrooms: numeric(assessmentDraft.bathrooms),
      parking_spots: numeric(assessmentDraft.parking_spots), condominium: assessmentDraft.condominium,
      latitude: loc ? Number(assessmentDraft.latitude) : null,
      longitude: loc ? Number(assessmentDraft.longitude) : null,
      coordinate_quality: loc ? 'property' : 'unknown',
    };
    setSaving(true);
    setErrorText('');
    try {
      const created = await createValuation(input);
      setAssessments(previous => [created, ...previous]);
      setSelectedId(created.id);
      setShowAssessmentForm(false);
      setAssessmentDraft(emptyAssessment);
      addToast({ type: 'success', title: 'Avaliação salva', message: 'Rascunho privado criado com sucesso.' });
    } catch { notifyFailure(); } finally { setSaving(false); }
  };

  const onCreateComparable = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    if (!validCoordinatePair(comparableDraft.latitude, comparableDraft.longitude) ||
      !numericFields.every(f => inputNumber(comparableDraft[f.key])) ||
      !Number.isFinite(Number(comparableDraft.asking_price)) || Number(comparableDraft.asking_price) <= 0) {
      setErrorText('Confira o preço, as áreas e as coordenadas informadas.');
      return;
    }
    const loc = comparableDraft.latitude.trim() !== '';
    const input: ValuationComparableInput = {
      source_type: comparableDraft.source_type,
      source_name: textLimit(comparableDraft.source_name, 120),
      listing_url: comparableDraft.listing_url,
      listing_reference: textLimit(comparableDraft.listing_reference, 120) || null,
      property_type: comparableDraft.property_type,
      asking_price: Number(comparableDraft.asking_price),
      land_area: numeric(comparableDraft.land_area), built_area: numeric(comparableDraft.built_area),
      bedrooms: numeric(comparableDraft.bedrooms), suites: numeric(comparableDraft.suites), bathrooms: numeric(comparableDraft.bathrooms),
      parking_spots: numeric(comparableDraft.parking_spots),
      condominium: null,
      latitude: loc ? Number(comparableDraft.latitude) : null,
      longitude: loc ? Number(comparableDraft.longitude) : null,
      coordinate_quality: loc ? comparableDraft.coordinate_quality as ValuationCoordinateQuality : 'unknown',
      availability: comparableDraft.availability,
      market_zone_verified: comparableDraft.market_zone_verified,
      reviewed_by_broker: comparableDraft.reviewed_by_broker,
      conflicting_data: comparableDraft.conflicting_data,
      multi_unit: comparableDraft.multi_unit,
      unfinished: comparableDraft.unfinished,
      notes: textLimit(comparableDraft.notes, 3000),
    };
    setSaving(true);
    setErrorText('');
    try {
      const created = await addValuationComparable(selected.id, input);
      setComparables(previous => [created, ...previous]);
      setComparableDraft(newComparable(selected.property_type));
      setShowComparableForm(false);
      addToast({ type: 'success', title: 'Anúncio salvo', message: 'O comparável foi vinculado à avaliação.' });
    } catch { notifyFailure(); } finally { setSaving(false); }
  };

  const onReview = async (item: ValuationComparable) => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const updated = await updateValuationComparable(selected.id, item.id, { reviewed_by_broker: !item.reviewed_by_broker });
      setComparables(previous => previous.map(row => row.id === updated.id ? updated : row));
      addToast({ type: 'success', title: 'Revisão atualizada' });
    } catch { notifyFailure(); } finally { setSaving(false); }
  };

  if (!allowed) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <Building2 className="mx-auto h-12 w-12 text-rose-600" />
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">Avaliação Inteligente</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Recurso exclusivo para corretores e imobiliárias autenticados.
      </p>
      <button className="mt-5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white"
        onClick={() => isAuthenticated ? setCurrentView('profile') : openAuthModal('login')}>
        {isAuthenticated ? 'Gerenciar meu perfil' : 'Entrar na minha conta'}
      </button>
    </div>;
  }

  return <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Gestão imobiliária</span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">Avaliação Inteligente</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cadastre o imóvel, organize anúncios semelhantes e acompanhe a qualidade das amostras.</p>
        </div>
        <button type="button" onClick={() => { setShowAssessmentForm(true); setErrorText(''); }}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
          <Plus className="h-4 w-4" /> Nova avaliação
        </button>
      </header>
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Ferramenta preliminar de pesquisa e revisão. Não calcula valor de mercado validado e não substitui PTAM ou vistoria profissional.
      </div>
      {errorText && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{errorText}</div>}

      {showAssessmentForm && <form onSubmit={onCreateAssessment} className={cardClass + ' space-y-4'}>
        <h2 className="font-bold text-slate-900 dark:text-white">Novo imóvel para avaliação</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-xs font-semibold">Título do imóvel *
            <input required maxLength={180} className={fieldClass} value={assessmentDraft.title} onChange={event => setAssessmentDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Identificação da avaliação" />
          </label>
          <label className="space-y-1 text-xs font-semibold">Tipo
            <select className={fieldClass} value={assessmentDraft.property_type} onChange={event => setAssessmentDraft(prev => ({ ...prev, property_type: event.target.value as ValuationPropertyType }))}>
              {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">Estado
            <input required maxLength={2} className={fieldClass} value={assessmentDraft.state} onChange={event => setAssessmentDraft(prev => ({ ...prev, state: event.target.value.toUpperCase() }))}/>
          </label>
          {(['city', 'neighborhood', 'street', 'street_number'] as const).map(key =>
            <label className="space-y-1 text-xs font-semibold" key={key}>
              {({city:'Cidade *',neighborhood:'Bairro',street:'Rua',street_number:'Número'} as const)[key]}
              <input required={key==='city'} className={fieldClass} value={assessmentDraft[key]} onChange={event => setAssessmentDraft(prev => ({ ...prev, [key]: event.target.value }))}/>
            </label>)}
        </div>
        <IntegerAreaFields draft={assessmentDraft} setDraft={(key,value) => setAssessmentDraft(prev => ({ ...prev, [key]: value }))} />
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-semibold">Latitude predial (opcional)
            <input type="number" step="any" className={fieldClass} value={assessmentDraft.latitude} onChange={event => setAssessmentDraft(prev => ({ ...prev, latitude: event.target.value }))} placeholder="Latitude do lote" />
          </label>
          <label className="space-y-1 text-xs font-semibold">Longitude predial (opcional)
            <input type="number" step="any" className={fieldClass} value={assessmentDraft.longitude} onChange={event => setAssessmentDraft(prev => ({ ...prev, longitude: event.target.value }))} placeholder="Longitude do lote" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assessmentDraft.condominium} onChange={event => setAssessmentDraft(prev => ({ ...prev, condominium: event.target.checked }))}/>Imóvel em condomínio fechado</label>
        <label className="block space-y-1 text-xs font-semibold">Notas técnicas
          <textarea maxLength={3000} rows={2} className={fieldClass} value={assessmentDraft.notes} onChange={event => setAssessmentDraft(prev => ({ ...prev, notes: event.target.value }))} placeholder="Conservação, reforma e documentação, conforme informações conferidas."/>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setShowAssessmentForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar avaliação'}</button>
        </div>
      </form>}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section aria-label="Histórico de avaliações" className={cardClass + ' space-y-3'}>
          <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-rose-600"/><h2 className="font-bold">Minhas avaliações</h2></div>
          {loading ? <p className="text-sm text-slate-500">Carregando...</p> :
            assessments.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma avaliação cadastrada. Crie a primeira para começar.</p> :
            <div className="space-y-2">{assessments.map(item => <button key={item.id} onClick={() => { setSelectedId(item.id); setShowComparableForm(false); }}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId===item.id?'border-rose-400 bg-rose-50 dark:bg-rose-950/30':'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
              <strong className="block text-sm">{item.title}</strong>
              <span className="mt-1 block text-xs text-slate-500">{item.city}/{item.state} · {dateText(item.created_at)}</span>
              <span className="mt-1 block text-[11px] text-slate-500">{item.status === 'draft' ? 'Rascunho' : item.status === 'archived' ? 'Arquivada' : 'Em revisão'}</span>
            </button>)}</div>}
        </section>
        <section aria-label="Detalhes da avaliação" className="space-y-4">
          {!selected ? <div className={cardClass + ' text-sm text-slate-500'}>
            Selecione uma avaliação no histórico ou crie um novo cadastro.
          </div> : <>
            <div className={cardClass + ' space-y-3'}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-lg font-extrabold">{selected.title}</h2>
                  <p className="text-xs text-slate-500">{selected.street}{selected.street_number ? ', '+selected.street_number : ''} · {selected.neighborhood} · {selected.city}/{selected.state}</p></div>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  onClick={() => { setComparableDraft(newComparable(selected.property_type)); setShowComparableForm(true); setErrorText(''); }}>
                  <Plus className="h-4 w-4"/> Adicionar anúncio
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Terreno', selected.land_area === null ? 'Não informado' : selected.land_area+' m²'],
                  ['Construção', selected.built_area === null ? 'Não informado' : selected.built_area+' m²'],
                  ['Dormitórios', selected.bedrooms ?? '—'],
                  ['Suítes', selected.suites ?? '—'],
                  ['Banheiros', selected.bathrooms ?? '—'],
                ].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p>
                </div>)}
              </div>
            </div>

            {showComparableForm && <form onSubmit={onCreateComparable} className={cardClass+' space-y-4'}>
              <h3 className="font-bold">Adicionar anúncio para análise</h3>
              <p className="text-xs text-slate-500">Inclua somente dados efetivamente publicados ou conferidos. Não acessamos automaticamente OLX ou Facebook.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold">Fonte
                  <select className={fieldClass} value={comparableDraft.source_type} onChange={event => setComparableDraft(prev => ({ ...prev, source_type:event.target.value as ValuationSourceType }))}>
                    {sources.map(source => <option key={source.value} value={source.value}>{source.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">Nome da imobiliária ou anunciante *
                  <input required maxLength={120} className={fieldClass} value={comparableDraft.source_name} onChange={event => setComparableDraft(prev => ({...prev,source_name:event.target.value}))}/>
                </label>
                <label className="space-y-1 text-xs font-semibold sm:col-span-2">Link HTTPS do anúncio *
                  <input required type="url" maxLength={2000} className={fieldClass} value={comparableDraft.listing_url} onChange={event => setComparableDraft(prev => ({...prev,listing_url:event.target.value}))} placeholder="https://..." />
                </label>
                <label className="space-y-1 text-xs font-semibold">Preço anunciado (R$) *
                  <input required type="number" min="1" step="0.01" className={fieldClass} value={comparableDraft.asking_price} onChange={event => setComparableDraft(prev => ({...prev,asking_price:event.target.value}))}/>
                </label>
                <label className="space-y-1 text-xs font-semibold">Tipo de imóvel
                  <select className={fieldClass} value={comparableDraft.property_type} onChange={event => setComparableDraft(prev => ({...prev,property_type:event.target.value as ValuationPropertyType}))}>
                    {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">Referência do anúncio
                  <input maxLength={120} className={fieldClass} value={comparableDraft.listing_reference} onChange={event => setComparableDraft(prev => ({...prev,listing_reference:event.target.value}))}/>
                </label>
                <label className="space-y-1 text-xs font-semibold">Disponibilidade
                  <select className={fieldClass} value={comparableDraft.availability} onChange={event => setComparableDraft(prev => ({...prev,availability:event.target.value as 'active'|'unknown'}))}>
                    <option value="unknown">Não confirmada</option><option value="active">Oferta ativa confirmada</option>
                  </select>
                </label>
              </div>
              <IntegerAreaFields draft={comparableDraft} setDraft={(key,value) => setComparableDraft(prev => ({ ...prev, [key]:value }))}/>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs font-semibold">Latitude
                  <input type="number" step="any" className={fieldClass} value={comparableDraft.latitude} onChange={event => setComparableDraft(prev => ({...prev,latitude:event.target.value}))}/>
                </label>
                <label className="space-y-1 text-xs font-semibold">Longitude
                  <input type="number" step="any" className={fieldClass} value={comparableDraft.longitude} onChange={event => setComparableDraft(prev => ({...prev,longitude:event.target.value}))}/>
                </label>
                <label className="space-y-1 text-xs font-semibold">Precisão da localização
                  <select className={fieldClass} value={comparableDraft.coordinate_quality} onChange={event => setComparableDraft(prev => ({...prev,coordinate_quality:event.target.value as 'property'|'street'}))}>
                    <option value="street">Referência da rua</option><option value="property">Ponto exato do lote</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {([
                  ['market_zone_verified','Conferi a equivalência da região de mercado'],
                  ['reviewed_by_broker','Revisei os dados deste anúncio'],
                  ['conflicting_data','Há informações contraditórias'],
                  ['multi_unit','São várias moradias no mesmo imóvel'],
                  ['unfinished','Construção inacabada'],
                ] as const).map(([key,label])=><label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={comparableDraft[key]} onChange={event => setComparableDraft(prev => ({...prev,[key]:event.target.checked}))}/>{label}
                </label>)}
              </div>
              <label className="block space-y-1 text-xs font-semibold">Observações
                <textarea maxLength={3000} rows={2} className={fieldClass} value={comparableDraft.notes} onChange={event => setComparableDraft(prev=>({...prev,notes:event.target.value}))}/>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setShowComparableForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Salvando...':'Salvar anúncio'}</button>
              </div>
            </form>}

            <div className={cardClass + ' space-y-3'}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Auditoria de comparáveis</h3>
                <span className="text-xs text-slate-500">{comparables.length} anúncio(s) registrado(s)</span>
              </div>
              {results && <div className="grid grid-cols-3 gap-2">
                {(['aceito','pendente','rejeitado'] as const).map(status=><div key={status} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                  <div className="text-xl font-extrabold">{results.counts[status]}</div>
                  <div className="text-xs capitalize text-slate-500">{status}</div>
                </div>)}
              </div>}
              {loadingComparables ? <p className="text-sm text-slate-500">Carregando anúncios...</p> :
                comparables.length === 0 ? <p className="text-sm text-slate-500">Ainda não há anúncios vinculados. Inclua o primeiro link para começar a triagem.</p> :
                <div className="space-y-3">{comparables.map(item=>{
                  const decision = results?.decisions.find((result: { id: string }) => result.id === item.id);
                  return <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><div className="flex items-center gap-2"><strong className="text-sm">{item.source_name}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${decision?.status==='aceito'?'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200':decision?.status==='rejeitado'?'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200':'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'}`}>
                        {decision?.status || 'pendente'}</span></div>
                        <p className="mt-1 text-sm">{money(Number(item.asking_price))} · {dateText(item.created_at)}</p>
                      </div>
                      <a href={item.listing_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">Ver anúncio <ExternalLink className="h-3 w-3"/></a>
                    </div>
                    {decision && <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p><MapPin className="mr-1 inline h-3 w-3"/>{decision.certifiedDistance ? decision.distanceMeters+' m (posição predial)' : 'Distância não certificada'}</p>
                      {[...decision.rejectedReasons,...decision.pendingReasons].map((reason: string,i: number)=><p key={i}>• {reason}</p>)}
                    </div>}
                    <div className="mt-3 flex justify-end">
                      <button disabled={saving} onClick={()=>void onReview(item)}
                        className="text-xs font-bold text-slate-700 underline disabled:opacity-50 dark:text-slate-300">
                        {item.reviewed_by_broker ? 'Desfazer confirmação da revisão' : 'Marcar dados como revisados'}
                      </button>
                    </div>
                  </div>;
                })}</div>}
            </div>

            <div className={cardClass + ' space-y-3'}>
              <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500"/><h3 className="font-bold">Pesquisa por raio</h3></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{results?.stages.map((stage: {radiusMeters:number; certified:number; accepted:number})=><div key={stage.radiusMeters} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <strong className="block text-sm">{stage.radiusMeters<1000?stage.radiusMeters+' m':stage.radiusMeters/1000+' km'}</strong>
                <span className="block text-lg font-extrabold">{stage.accepted}</span>
                <span className="block text-[11px] text-slate-500">aceitos com distância validada</span>
              </div>)}</div>
              <p className="text-xs text-slate-500">Os raios usam apenas coordenadas prediais certificadas; pontos centrais de ruas não entram nas contagens.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-bold">Valor de mercado: indisponível nesta fase</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{results?.valuation.reason}</p>
              <p className="mt-2 text-xs text-slate-500">Uma amostra cadastral aceita não equivale a preço negociado nem a laudo técnico de avaliação.</p>
            </div>
          </>}
        </section>
      </div>
    </div>
  </div>;
};
