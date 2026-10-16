import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Check, Flag, Handshake, Loader2, MapPin, Plus, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  endPartnershipConnection,
  blockPartnershipProfessional,
  getMyPartnershipNetwork,
  PartnershipConnection,
  PartnershipNetworkState,
  PartnershipProfessional,
  PartnershipRegion,
  PartnershipReportCategory,
  PartnershipSpecialty,
  partnershipErrorMessage,
  requestPartnershipConnection,
  reportPartnershipProfessional,
  respondPartnershipConnection,
  saveMyPartnershipMembership,
  searchPartnershipProfessionals,
} from '../../lib/partnershipNetwork';
import { UserAvatar } from '../ui/UserAvatar';
import { Modal } from '../ui/Modal';
import { getRegisteredSpNeighborhoods, getSpMunicipalities, SpMunicipality } from '../../lib/partnershipLocations';

const EMPTY_STATE: PartnershipNetworkState = { eligible: false, member: null, regions: [], connections: [] };

const normalizeArea = (value: string) => value.trim().replace(/\s+/g, ' ');
const SPECIALTIES: Array<{ value: PartnershipSpecialty; label: string }> = [
  { value: 'capture', label: 'Captação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'visits', label: 'Visitas' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'documents', label: 'Documentação' },
  { value: 'closing', label: 'Fechamento' },
];
const REPORT_CATEGORIES: Array<{ value: PartnershipReportCategory; label: string }> = [
  { value: 'conduct', label: 'Conduta inadequada' },
  { value: 'spam', label: 'Spam ou contato excessivo' },
  { value: 'misleading_profile', label: 'Perfil ou informações enganosas' },
  { value: 'unauthorized_contact', label: 'Contato ou uso de dados sem autorização' },
  { value: 'other', label: 'Outro motivo' },
];

export const PartnershipNetworkPanel: React.FC = () => {
  const { addToast } = useApp();
  const [network, setNetwork] = useState<PartnershipNetworkState>(EMPTY_STATE);
  const [enabled, setEnabled] = useState(false);
  const [acceptsSale, setAcceptsSale] = useState(true);
  const [acceptsRent, setAcceptsRent] = useState(true);
  const [acceptsLaunch, setAcceptsLaunch] = useState(false);
  const [specialties, setSpecialties] = useState<PartnershipSpecialty[]>([]);
  const [introduction, setIntroduction] = useState('');
  const [regions, setRegions] = useState<PartnershipRegion[]>([]);
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [municipalities, setMunicipalities] = useState<SpMunicipality[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(true);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [professionals, setProfessionals] = useState<PartnershipProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<PartnershipConnection['partner'] | null>(null);
  const [reportCategory, setReportCategory] = useState<PartnershipReportCategory>('conduct');
  const [reportDetails, setReportDetails] = useState('');
  const [blockAfterReport, setBlockAfterReport] = useState(true);
  const [reporting, setReporting] = useState(false);

  const hydrate = (state: PartnershipNetworkState) => {
    setNetwork(state);
    setEnabled(state.member?.status === 'active');
    setAcceptsSale(state.member?.accepts_sale ?? true);
    setAcceptsRent(state.member?.accepts_rent ?? true);
    setAcceptsLaunch(state.member?.accepts_launch ?? false);
    setSpecialties(state.member?.specialties || []);
    setIntroduction(state.member?.introduction || '');
    setRegions(state.regions || []);
  };

  const load = async () => {
    setLoading(true);
    try { hydrate(await getMyPartnershipNetwork()); }
    catch (error) { addToast({ type: 'error', title: 'Rede indisponível', message: partnershipErrorMessage(error) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    let active = true;
    void getSpMunicipalities()
      .then(items => { if (active) setMunicipalities(items); })
      .catch(() => { if (active) addToast({ type: 'error', title: 'Municípios indisponíveis', message: 'Não foi possível consultar a lista oficial. Tente novamente mais tarde.' }); })
      .finally(() => { if (active) setMunicipalitiesLoading(false); });
    return () => { active = false; };
  }, [addToast]);

  const selectedMunicipality = useMemo(() => municipalities.find(item => item.name.toLocaleLowerCase('pt-BR') === normalizeArea(city).toLocaleLowerCase('pt-BR')), [municipalities, city]);

  useEffect(() => {
    if (!selectedMunicipality) { setNeighborhoods([]); setNeighborhoodsLoading(false); return; }
    let active = true;
    setNeighborhoodsLoading(true);
    void getRegisteredSpNeighborhoods(selectedMunicipality.name)
      .then(items => { if (active) setNeighborhoods(items); })
      .catch(() => { if (active) { setNeighborhoods([]); addToast({ type: 'error', title: 'Bairros indisponíveis', message: 'Não foi possível consultar os bairros cadastrados nesta cidade.' }); } })
      .finally(() => { if (active) setNeighborhoodsLoading(false); });
    return () => { active = false; };
  }, [selectedMunicipality?.id, addToast]);

  const addRegion = () => {
    const nextCity = normalizeArea(city);
    const nextNeighborhood = normalizeArea(neighborhood);
    if (!selectedMunicipality) {
      addToast({ type: 'warning', title: 'Escolha um município', message: 'Selecione uma cidade da lista oficial de São Paulo.' });
      return;
    }
    if (nextNeighborhood && !neighborhoods.some(item => item.toLocaleLowerCase('pt-BR') === nextNeighborhood.toLocaleLowerCase('pt-BR'))) {
      addToast({ type: 'warning', title: 'Escolha um bairro cadastrado', message: 'Selecione um bairro da lista ou deixe o campo vazio para atuar na cidade inteira.' });
      return;
    }
    if (regions.length >= 20) {
      addToast({ type: 'warning', title: 'Limite atingido', message: 'Você pode cadastrar até vinte regiões de atuação.' });
      return;
    }
    const duplicate = regions.some(region => region.city.toLocaleLowerCase('pt-BR') === nextCity.toLocaleLowerCase('pt-BR') && (region.neighborhood || '').toLocaleLowerCase('pt-BR') === nextNeighborhood.toLocaleLowerCase('pt-BR'));
    if (duplicate) {
      addToast({ type: 'info', title: 'Região já adicionada', message: 'Escolha outra cidade ou bairro.' });
      return;
    }
    setRegions(current => [...current, { state: 'SP', city: selectedMunicipality.name, neighborhood: nextNeighborhood || null }]);
    setCity(''); setNeighborhood('');
  };

  const saveMembership = async () => {
    if (enabled && regions.length === 0) {
      addToast({ type: 'warning', title: 'Região obrigatória', message: 'Adicione ao menos uma cidade ou bairro antes de entrar na rede.' });
      return;
    }
    if (enabled && !acceptsSale && !acceptsRent && !acceptsLaunch) {
      addToast({ type: 'warning', title: 'Finalidade obrigatória', message: 'Selecione pelo menos um tipo de parceria que deseja receber.' });
      return;
    }
    setSaving(true);
    try {
      const state = await saveMyPartnershipMembership({ enabled, acceptsSale, acceptsRent, acceptsLaunch, specialties, introduction, regions });
      hydrate(state);
      addToast({ type: 'success', title: enabled ? 'Participação atualizada' : 'Participação desativada', message: enabled ? 'Suas preferências e regiões foram salvas.' : 'Seu perfil deixou de aparecer para novas conexões.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Alteração não salva', message: partnershipErrorMessage(error) });
    } finally { setSaving(false); }
  };

  const runSearch = async () => {
    setSearching(true);
    try { setProfessionals(await searchPartnershipProfessionals(search, searchCity)); }
    catch (error) { addToast({ type: 'error', title: 'Busca não concluída', message: partnershipErrorMessage(error) }); }
    finally { setSearching(false); }
  };

  const performConnectionAction = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id);
    try {
      await action();
      addToast({ type: 'success', title: success });
      await load();
      if (enabled) await runSearch();
    } catch (error) {
      addToast({ type: 'error', title: 'Operação não concluída', message: partnershipErrorMessage(error) });
    } finally { setBusyId(null); }
  };

  const invitations = useMemo(() => network.connections.filter(connection => connection.status === 'pending' && connection.direction === 'received'), [network.connections]);
  const connections = useMemo(() => network.connections.filter(connection => connection.status === 'accepted'), [network.connections]);

  const submitReport = async () => {
    if (!reportTarget || reportDetails.trim().length < 20) {
      addToast({ type: 'warning', title: 'Descreva o ocorrido', message: 'Informe pelo menos 20 caracteres para permitir a análise administrativa.' });
      return;
    }
    setReporting(true);
    try {
      await reportPartnershipProfessional({ profileId: reportTarget.profile_id, category: reportCategory, details: reportDetails, block: blockAfterReport });
      addToast({ type: 'success', title: 'Denúncia registrada', message: 'O relato foi preservado para análise administrativa.' });
      setReportTarget(null); setReportDetails(''); setReportCategory('conduct'); setBlockAfterReport(true);
      await load();
    } catch (error) {
      addToast({ type: 'error', title: 'Denúncia não enviada', message: partnershipErrorMessage(error) });
    } finally { setReporting(false); }
  };

  if (loading) return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-sm text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" /> Carregando rede de parcerias...
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Handshake className="w-5 h-5 text-indigo-500" /> Rede de Parcerias</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Conecte-se com profissionais de CRECI-SP aprovado. Entrar na rede não compartilha seus imóveis automaticamente.</p>
        </div>

        <div>
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Minhas principais especialidades</span>
          <div className="flex flex-wrap gap-2">{SPECIALTIES.map(item => <label key={item.value} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"><input type="checkbox" checked={specialties.includes(item.value)} onChange={event => setSpecialties(current => event.target.checked ? [...current, item.value] : current.filter(value => value !== item.value))} className="rounded text-indigo-600" />{item.label}</label>)}</div>
        </div>
        <span className={`self-start px-3 py-1 rounded-full text-xs font-bold ${network.eligible ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
          {network.eligible ? 'CRECI-SP elegível' : 'Aprovação necessária'}
        </span>
      </div>

      {!network.eligible && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
          Para participar, mantenha a conta profissional ativa e conclua a aprovação de um CRECI do estado de São Paulo dentro da validade.
        </div>
      )}

      <label className={`flex items-start gap-3 rounded-2xl border p-4 ${network.eligible ? 'cursor-pointer border-slate-200 dark:border-slate-700' : 'opacity-60 border-slate-200 dark:border-slate-800'}`}>
        <input type="checkbox" checked={enabled} disabled={!network.eligible || saving} onChange={event => setEnabled(event.target.checked)} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
        <span><strong className="block text-xs text-slate-900 dark:text-white">Quero participar da rede de parcerias</strong><span className="block text-[11px] text-slate-500 mt-0.5">Sua entrada permite ser encontrado e receber convites. Cada imóvel ainda exigirá oferta e contrato próprios.</span></span>
      </label>

      <fieldset disabled={!enabled || !network.eligible || saving} className="space-y-4 disabled:opacity-60">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Apresentação para outros profissionais</label>
          <textarea value={introduction} maxLength={500} rows={3} onChange={event => setIntroduction(event.target.value)} placeholder="Conte como trabalha, suas especialidades e o tipo de parceria que procura..." className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white" />
          <div className="text-right text-[10px] text-slate-400">{introduction.length}/500</div>
        </div>

        <div>
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Tenho interesse em parcerias de</span>
          <div className="flex flex-wrap gap-3">
            {[['Venda', acceptsSale, setAcceptsSale], ['Locação', acceptsRent, setAcceptsRent], ['Lançamentos', acceptsLaunch, setAcceptsLaunch]].map(([label, checked, setter]) => (
              <label key={String(label)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"><input type="checkbox" checked={Boolean(checked)} onChange={event => (setter as React.Dispatch<React.SetStateAction<boolean>>)(event.target.checked)} className="rounded text-indigo-600" />{String(label)}</label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div><span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Regiões de atuação em São Paulo</span><span className="text-[11px] text-slate-500">Escolha um município da lista oficial. Os bairros sugeridos vêm dos imóveis cadastrados; deixe o bairro vazio para atender a cidade inteira.</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <div><input list="partnership-sp-municipalities" value={city} maxLength={100} disabled={municipalitiesLoading || municipalities.length === 0} onChange={event => { setCity(event.target.value); setNeighborhood(''); }} placeholder={municipalitiesLoading ? 'Carregando municípios...' : 'Busque um município'} aria-label="Município de atuação" className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-60" /><datalist id="partnership-sp-municipalities">{municipalities.map(item => <option key={item.id} value={item.name} />)}</datalist></div>
            <div><input list="partnership-sp-neighborhoods" value={neighborhood} maxLength={100} disabled={!selectedMunicipality || neighborhoodsLoading || neighborhoods.length === 0} onChange={event => setNeighborhood(event.target.value)} placeholder={neighborhoodsLoading ? 'Carregando bairros...' : neighborhoods.length ? 'Busque um bairro (opcional)' : 'Sem bairros cadastrados'} aria-label="Bairro de atuação (opcional)" className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-60" /><datalist id="partnership-sp-neighborhoods">{neighborhoods.map(item => <option key={item} value={item} />)}</datalist></div>
            <button type="button" disabled={!selectedMunicipality || neighborhoodsLoading} onClick={addRegion} className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" /> Adicionar</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {regions.map((region, index) => <span key={`${region.city}-${region.neighborhood || ''}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-xs"><MapPin className="w-3.5 h-3.5" />{region.city}{region.neighborhood ? ` · ${region.neighborhood}` : ''}/SP<button type="button" aria-label={`Remover ${region.city}`} onClick={() => setRegions(current => current.filter((_, itemIndex) => itemIndex !== index))}><X className="w-3.5 h-3.5" /></button></span>)}
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <button type="button" disabled={saving || (!network.eligible && enabled)} onClick={saveMembership} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Salvar participação</button>
      </div>

      {enabled && network.member?.status === 'active' && <>
        {invitations.length > 0 && <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Convites recebidos</h4>
          {invitations.map(connection => <ConnectionRow key={connection.id} connection={connection} busy={busyId === connection.id} actions={<><button type="button" onClick={() => void performConnectionAction(connection.id, () => respondPartnershipConnection(connection.id, 'declined'), 'Convite recusado')} className="p-2 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/30" aria-label="Recusar convite"><X className="w-4 h-4" /></button><button type="button" onClick={() => void performConnectionAction(connection.id, () => respondPartnershipConnection(connection.id, 'accepted'), 'Conexão criada')} className="p-2 rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" aria-label="Aceitar convite"><Check className="w-4 h-4" /></button></>} />)}
        </section>}

        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Minha rede <span className="text-xs text-slate-400">({connections.length})</span></h4>
          {connections.length === 0 ? <p className="text-xs text-slate-500">Você ainda não possui conexões aceitas.</p> : connections.map(connection => <ConnectionRow key={connection.id} connection={connection} busy={busyId === connection.id} actions={<><button type="button" onClick={() => setReportTarget(connection.partner)} className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" aria-label="Denunciar profissional"><Flag className="w-4 h-4" /></button><button type="button" onClick={() => { if (window.confirm('Bloquear este profissional? Vocês deixarão de aparecer mutuamente na rede.')) void performConnectionAction(connection.id, () => blockPartnershipProfessional(connection.partner.profile_id), 'Profissional bloqueado'); }} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Bloquear profissional"><Ban className="w-4 h-4" /></button><button type="button" onClick={() => { if (window.confirm('Encerrar esta conexão? As parcerias contratuais futuras deixarão de ser permitidas.')) void performConnectionAction(connection.id, () => endPartnershipConnection(connection.id), 'Conexão encerrada'); }} className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label="Encerrar conexão"><Trash2 className="w-4 h-4" /></button></>} />)}
        </section>

        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
          <div><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Encontrar profissionais</h4><p className="text-[11px] text-slate-500">A busca mostra somente participantes ativos com CRECI-SP aprovado e válido.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, CRECI ou portal" className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs" />
            <input value={searchCity} onChange={event => setSearchCity(event.target.value)} placeholder="Cidade (opcional)" className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs" />
            <button type="button" onClick={() => void runSearch()} disabled={searching} className="px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2">{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar</button>
          </div>
          {professionals.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{professionals.map(professional => <ProfessionalCard key={professional.profile_id} professional={professional} busy={busyId === professional.profile_id} onInvite={() => void performConnectionAction(professional.profile_id, () => requestPartnershipConnection(professional.profile_id), 'Convite enviado')} />)}</div>}
          {!searching && professionals.length === 0 && (search || searchCity) && <p className="text-xs text-slate-500">Nenhum participante encontrado com esses filtros.</p>}
        </section>
      </>}

      <Modal
        isOpen={Boolean(reportTarget)}
        onClose={() => { if (!reporting) setReportTarget(null); }}
        title="Denunciar profissional"
        description="O relato é privado, auditável e será disponibilizado somente à administração responsável."
        size="md"
        closeOnBackdropClick={!reporting}
        footer={<><button type="button" disabled={reporting} onClick={() => setReportTarget(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button type="button" disabled={reporting || reportDetails.trim().length < 20} onClick={() => void submitReport()} className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">{reporting && <Loader2 className="w-4 h-4 animate-spin" />} Enviar denúncia</button></>}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3"><UserAvatar name={reportTarget?.name || ''} src={reportTarget?.avatar_url || undefined} className="w-10 h-10 rounded-xl" /><div><strong className="block text-xs text-slate-900 dark:text-white">{reportTarget?.name}</strong><span className="text-[11px] text-slate-500">CRECI {reportTarget?.creci}/SP</span></div></div>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo</label><select value={reportCategory} onChange={event => setReportCategory(event.target.value as PartnershipReportCategory)} className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">{REPORT_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Relato</label><textarea rows={5} maxLength={2000} value={reportDetails} onChange={event => setReportDetails(event.target.value)} placeholder="Descreva objetivamente o que ocorreu, incluindo datas e contexto quando possível." className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs" /><div className="text-right text-[10px] text-slate-400">{reportDetails.length}/2000</div></div>
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3"><input type="checkbox" checked={blockAfterReport} onChange={event => setBlockAfterReport(event.target.checked)} className="mt-0.5 rounded text-rose-600" /><span><strong className="block text-xs text-slate-900 dark:text-white">Bloquear também este profissional</strong><span className="block text-[11px] text-slate-500">Os perfis deixarão de aparecer mutuamente e a conexão será encerrada.</span></span></label>
        </div>
      </Modal>
    </div>
  );
};

const ConnectionRow: React.FC<{ connection: PartnershipConnection; busy: boolean; actions: React.ReactNode }> = ({ connection, busy, actions }) => <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
  <UserAvatar name={connection.partner.name} src={connection.partner.avatar_url || undefined} className="w-10 h-10 rounded-xl shrink-0" />
  <div className="min-w-0 flex-1"><strong className="block text-xs text-slate-900 dark:text-white truncate">{connection.partner.name}</strong><span className="block text-[11px] text-slate-500">CRECI {connection.partner.creci}/SP{connection.partner.portal_slug ? ` · ${connection.partner.portal_slug}.webimoveis.site` : ''}</span></div>
  <div className={`flex gap-1 ${busy ? 'pointer-events-none opacity-50' : ''}`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : actions}</div>
</div>;

const ProfessionalCard: React.FC<{ professional: PartnershipProfessional; busy: boolean; onInvite: () => void }> = ({ professional, busy, onInvite }) => {
  const cannotInvite = Boolean(professional.connection && ['pending', 'accepted', 'blocked'].includes(professional.connection.status));
  return <article className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
    <div className="flex items-center gap-3"><UserAvatar name={professional.name} src={professional.avatar_url || undefined} className="w-11 h-11 rounded-xl shrink-0" /><div className="min-w-0"><strong className="block text-xs text-slate-900 dark:text-white truncate">{professional.portal_title || professional.name}</strong><span className="block text-[11px] text-slate-500 truncate">{professional.name} · CRECI {professional.creci}/SP</span></div></div>
    {professional.introduction && <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">{professional.introduction}</p>}
    <div className="flex flex-wrap gap-1.5">{professional.regions.slice(0, 4).map((region, index) => <span key={`${region.city}-${region.neighborhood || ''}-${index}`} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">{region.city}{region.neighborhood ? ` · ${region.neighborhood}` : ''}</span>)}</div>
    {professional.specialties?.length > 0 && <div className="flex flex-wrap gap-1.5">{professional.specialties.map(value => <span key={value} className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[10px] text-indigo-700 dark:text-indigo-300">{SPECIALTIES.find(item => item.value === value)?.label || value}</span>)}</div>}
    <button type="button" onClick={onInvite} disabled={busy || cannotInvite} className="w-full py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}{professional.connection?.status === 'accepted' ? 'Já conectado' : professional.connection?.status === 'pending' ? 'Convite pendente' : 'Convidar para conectar'}</button>
  </article>;
};
