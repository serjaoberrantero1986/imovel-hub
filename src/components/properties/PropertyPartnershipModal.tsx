import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Loader2, RefreshCw, Send, ShieldCheck, Users } from 'lucide-react';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { UserAvatar } from '../ui/UserAvatar';
import {
  defaultPartnershipTerms,
  cancelPropertyPartnershipOffer,
  getMyIncomingPartnershipOffers,
  getPropertyPartnershipWorkspace,
  IncomingPartnershipOffer,
  PARTNERSHIP_RESPONSIBILITIES,
  PartnershipTerms,
  PropertyPartnershipWorkspace,
  PropertyPartnershipNegotiation,
  propertyPartnershipErrorMessage,
  ResponsibleParty,
  respondPropertyPartnershipNegotiation,
  savePropertyPartnershipOffer,
  publishPartnershipOpportunity,
} from '../../lib/propertyPartnerships';
import { formatCurrency } from '../../lib/utils';
import { PartnershipContractPanel } from './PartnershipContractPanel';

interface PropertyPartnershipModalProps {
  property?: Property | null;
  inbox?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_CLASS = 'mt-1 w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

export const PropertyPartnershipModal: React.FC<PropertyPartnershipModalProps> = ({ property, inbox = false, isOpen, onClose }) => {
  const { addToast } = useApp();
  const [workspace, setWorkspace] = useState<PropertyPartnershipWorkspace | null>(null);
  const [incoming, setIncoming] = useState<IncomingPartnershipOffer[]>([]);
  const [selectedIncomingId, setSelectedIncomingId] = useState<string | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [terms, setTerms] = useState<PartnershipTerms>(defaultPartnershipTerms());
  const [counterTerms, setCounterTerms] = useState<PartnershipTerms | null>(null);
  const [ownerCounterId, setOwnerCounterId] = useState<string | null>(null);
  const [ownerCounterTerms, setOwnerCounterTerms] = useState<PartnershipTerms | null>(null);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedIncoming = useMemo(() => incoming.find(item => item.negotiation_id === selectedIncomingId) || incoming[0] || null, [incoming, selectedIncomingId]);

  const load = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      if (inbox) {
        const items = await getMyIncomingPartnershipOffers();
        setIncoming(items);
        setSelectedIncomingId(current => items.some(item => item.negotiation_id === current) ? current : items[0]?.negotiation_id || null);
      } else if (property) {
        const value = await getPropertyPartnershipWorkspace(property.id);
        setWorkspace(value);
        const active = value.negotiations.filter(item => !['cancelled', 'declined'].includes(item.status));
        setSelectedPartners(active.map(item => item.partner_id));
        setTerms(active[0]?.current_terms || defaultPartnershipTerms(property.isExclusive));
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Parcerias indisponíveis', message: propertyPartnershipErrorMessage(error) });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) {
      setAcceptedDisclaimer(false); setCounterTerms(null);
      void load();
    }
  }, [isOpen, property?.id, inbox]);

  const saveOffer = async () => {
    if (!property || selectedPartners.length === 0) {
      addToast({ type: 'warning', title: 'Selecione os parceiros', message: 'Escolha ao menos um profissional conectado para receber a oferta.' });
      return;
    }
    const fixedTerms = { ...terms, territory_description: 'Estado de São Paulo' };
    if (!validateTerms(fixedTerms)) {
      addToast({ type: 'warning', title: 'Confira os termos', message: 'Preencha percentuais, vigência, território e todas as responsabilidades.' });
      return;
    }
    setBusy(true);
    try {
      const value = await savePropertyPartnershipOffer({ propertyId: property.id, partnerIds: selectedPartners, partnerLimit: null, terms: fixedTerms });
      setWorkspace(value);
      addToast({ type: 'success', title: 'Oferta enviada', message: 'Cada parceiro recebeu uma negociação privada e versionada.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Oferta não enviada', message: propertyPartnershipErrorMessage(error) });
    } finally { setBusy(false); }
  };

  const publishOpportunity = async () => {
    if (!property || !validateTerms(terms)) { addToast({ type: 'warning', title: 'Confira os termos', message: 'Preencha os termos antes de publicar a oportunidade.' }); return; }
    setBusy(true);
    try { setWorkspace(await publishPartnershipOpportunity(property.id, terms)); addToast({ type: 'success', title: 'Oportunidade publicada', message: 'Profissionais elegíveis da região já poderão demonstrar interesse.' }); }
    catch (error) { addToast({ type: 'error', title: 'Publicação não concluída', message: propertyPartnershipErrorMessage(error) }); }
    finally { setBusy(false); }
  };

  const respond = async (decision: 'accept' | 'decline' | 'counter') => {
    if (!selectedIncoming) return;
    if (decision === 'accept' && !acceptedDisclaimer) {
      addToast({ type: 'warning', title: 'Confirmação necessária', message: 'Leia e confirme a natureza preliminar do aceite.' }); return;
    }
    if (decision === 'counter' && (!counterTerms || !validateTerms(counterTerms))) {
      addToast({ type: 'warning', title: 'Contraproposta incompleta', message: 'Confira todos os termos antes de enviar.' }); return;
    }
    setBusy(true);
    try {
      await respondPropertyPartnershipNegotiation({ negotiationId: selectedIncoming.negotiation_id, expectedVersion: selectedIncoming.current_terms.version_number || 1, decision, counterTerms });
      addToast({ type: 'success', title: decision === 'accept' ? 'Aceite preliminar registrado' : decision === 'decline' ? 'Oferta recusada' : 'Contraproposta enviada', message: decision === 'accept' ? 'A parceria ainda dependerá de contrato, assinatura e comprovação no SGR.' : undefined });
      setCounterTerms(null); setAcceptedDisclaimer(false); await load();
    } catch (error) {
      addToast({ type: 'error', title: 'Resposta não registrada', message: propertyPartnershipErrorMessage(error) });
    } finally { setBusy(false); }
  };

  const respondAsCaptor = async (negotiation: PropertyPartnershipNegotiation, decision: 'accept' | 'decline' | 'counter') => {
    if (decision === 'counter' && (!ownerCounterTerms || !validateTerms(ownerCounterTerms))) {
      addToast({ type: 'warning', title: 'Contraproposta incompleta', message: 'Confira os termos antes de enviar.' }); return;
    }
    setBusy(true);
    try {
      await respondPropertyPartnershipNegotiation({ negotiationId: negotiation.id, expectedVersion: negotiation.current_terms.version_number || 1, decision, counterTerms: decision === 'counter' ? ownerCounterTerms : null });
      addToast({ type: 'success', title: decision === 'accept' ? 'Contraproposta aceita preliminarmente' : decision === 'decline' ? 'Contraproposta recusada' : 'Nova contraproposta enviada' });
      setOwnerCounterId(null); setOwnerCounterTerms(null); await load();
    } catch (error) {
      addToast({ type: 'error', title: 'Resposta não registrada', message: propertyPartnershipErrorMessage(error) });
    } finally { setBusy(false); }
  };

  const cancelOffer = async () => {
    if (!workspace?.offer || !window.confirm('Cancelar esta oferta? As negociações preliminares serão encerradas e os parceiros receberão um aviso.')) return;
    setBusy(true);
    try {
      await cancelPropertyPartnershipOffer(workspace.offer.id);
      addToast({ type: 'success', title: 'Oferta cancelada', message: 'As negociações preliminares foram encerradas.' });
      await load();
    } catch (error) {
      addToast({ type: 'error', title: 'Oferta não cancelada', message: propertyPartnershipErrorMessage(error) });
    } finally { setBusy(false); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} size="2xl" closeOnBackdropClick={!busy} title={inbox ? 'Ofertas de parceria recebidas' : `Parceria · ${property?.code || ''}`} description={inbox ? 'Analise os termos antes de aceitar, recusar ou apresentar uma contraproposta.' : 'Defina uma proposta privada para profissionais conectados. Esta etapa não publica o imóvel em outros portais.'}>
    {loading ? <div className="py-14 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Carregando negociações...</div> : inbox ? (
      <IncomingOffersContent items={incoming} selected={selectedIncoming} onSelect={setSelectedIncomingId} counterTerms={counterTerms} setCounterTerms={setCounterTerms} acceptedDisclaimer={acceptedDisclaimer} setAcceptedDisclaimer={setAcceptedDisclaimer} busy={busy} onRespond={respond} />
    ) : workspace ? (
      <OwnerOfferContent workspace={workspace} selectedPartners={selectedPartners} setSelectedPartners={setSelectedPartners} terms={terms} setTerms={setTerms} busy={busy} onSave={saveOffer} onPublishOpportunity={publishOpportunity} onCancelOffer={cancelOffer} ownerCounterId={ownerCounterId} ownerCounterTerms={ownerCounterTerms} onStartCounter={negotiation => { setOwnerCounterId(negotiation.id); setOwnerCounterTerms(structuredClone(negotiation.current_terms)); }} onCancelCounter={() => { setOwnerCounterId(null); setOwnerCounterTerms(null); }} onCounterTermsChange={setOwnerCounterTerms} onRespond={respondAsCaptor} />
    ) : <EmptyMessage text="Não foi possível carregar este imóvel." />}
  </Modal>;
};

const OwnerOfferContent: React.FC<{
  workspace: PropertyPartnershipWorkspace; selectedPartners: string[]; setSelectedPartners: React.Dispatch<React.SetStateAction<string[]>>;
  terms: PartnershipTerms; setTerms: (terms: PartnershipTerms) => void;
  busy: boolean; onSave: () => void; onPublishOpportunity?: () => void; onCancelOffer: () => void;
  ownerCounterId: string | null; ownerCounterTerms: PartnershipTerms | null;
  onStartCounter: (negotiation: PropertyPartnershipNegotiation) => void; onCancelCounter: () => void;
  onCounterTermsChange: (terms: PartnershipTerms) => void;
  onRespond: (negotiation: PropertyPartnershipNegotiation, decision: 'accept' | 'decline' | 'counter') => void;
}> = ({ workspace, selectedPartners, setSelectedPartners, terms, setTerms, busy, onSave, onPublishOpportunity, onCancelOffer, ownerCounterId, ownerCounterTerms, onStartCounter, onCancelCounter, onCounterTermsChange, onRespond }) => <div className="space-y-6">
  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap justify-between gap-3"><div><strong className="block text-sm text-slate-900 dark:text-white">{workspace.property.title}</strong><span className="text-xs text-slate-500">#{workspace.property.code} · {workspace.property.status}</span></div><span className="self-start px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">{workspace.offer ? 'Oferta em andamento' : 'Nova oferta'}</span></div>

  <section className="space-y-3"><div><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Destinatários</h4><p className="text-[11px] text-slate-500">Somente conexões aceitas, com CRECI-SP válido, interesse nessa finalidade e atuação na cidade ou no bairro do imóvel aparecem aqui.</p></div>
    {workspace.available_partners.length === 0 ? <EmptyMessage text="Nenhum profissional conectado está disponível. Crie conexões na seção Rede de Parcerias do perfil." /> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{workspace.available_partners.map(partner => <label key={partner.profile_id} className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer ${selectedPartners.includes(partner.profile_id) ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700'}`}><input type="checkbox" checked={selectedPartners.includes(partner.profile_id)} onChange={event => setSelectedPartners(current => event.target.checked ? [...current, partner.profile_id] : current.filter(id => id !== partner.profile_id))} className="rounded text-indigo-600" /><UserAvatar name={partner.name} src={partner.avatar_url || undefined} className="w-9 h-9 rounded-xl" /><span className="min-w-0"><strong className="block text-xs text-slate-900 dark:text-white truncate">{partner.portal_title || partner.name}</strong><span className="block text-[10px] text-slate-500">{partner.name} · CRECI {partner.creci}/SP</span></span></label>)}</div>}
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-xs text-slate-600 dark:text-slate-300"><strong className="block text-slate-900 dark:text-white">Rede aberta de parceiros</strong><span>Cada profissional selecionado terá uma negociação independente. Não existe limite global; a divisão e o contrato são definidos individualmente.</span></div>
  </section>

  <TermsEditor value={terms} onChange={setTerms} />
  <button type="button" disabled={busy} onClick={() => onPublishOpportunity?.()} className="w-full rounded-2xl border border-indigo-200 px-5 py-3 text-xs font-bold text-indigo-700">Publicar em Oportunidades de Parcerias</button>
  <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200"><strong className="block mb-1">Etapa preliminar</strong>O envio registra uma proposta versionada, mas não autoriza divulgação nem compartilhamento de leads. Isso dependerá do contrato assinado e da comprovação exigida.</div>
  <div className="flex flex-wrap justify-end gap-2">{workspace.offer && <button type="button" disabled={busy} onClick={onCancelOffer} className="px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold">Cancelar oferta</button>}<button type="button" disabled={busy || workspace.available_partners.length === 0} onClick={onSave} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar oferta versionada</button></div>

  {workspace.negotiations.length > 0 && <section className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3"><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Negociações deste imóvel</h4>{workspace.negotiations.map(item => <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-3"><div className="flex items-center gap-3"><UserAvatar name={item.partner.name} src={item.partner.avatar_url || undefined} className="w-10 h-10 rounded-xl" /><div className="flex-1 min-w-0"><strong className="block text-xs text-slate-900 dark:text-white truncate">{item.partner.name}</strong><span className="text-[11px] text-slate-500">CRECI {item.partner.creci}/SP · versão {item.current_terms.version_number}</span></div><NegotiationBadge status={item.status} /></div>{item.status === 'countered' && item.current_terms.proposed_by === item.partner_id && ownerCounterId !== item.id && <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={() => onRespond(item, 'decline')} className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 text-xs font-bold">Recusar</button><button type="button" disabled={busy} onClick={() => onStartCounter(item)} className="px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 dark:text-indigo-300 text-xs font-bold">Contrapropor</button><button type="button" disabled={busy} onClick={() => onRespond(item, 'accept')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Aceitar preliminarmente</button></div>}{ownerCounterId === item.id && ownerCounterTerms && <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4"><TermsEditor value={ownerCounterTerms} onChange={onCounterTermsChange} /><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onCancelCounter} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button type="button" disabled={busy} onClick={() => onRespond(item, 'counter')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Enviar contraproposta</button></div></div>}{['preliminarily_accepted','awaiting_contract','active'].includes(item.status) && <PartnershipContractPanel negotiationId={item.id} currentTerms={item.current_terms} renderTermsEditor={(value,onChange) => <TermsEditor value={value} onChange={onChange} />} />}</div>)}</section>}
</div>;

const IncomingOffersContent: React.FC<{
  items: IncomingPartnershipOffer[]; selected: IncomingPartnershipOffer | null; onSelect: (id: string) => void;
  counterTerms: PartnershipTerms | null; setCounterTerms: (terms: PartnershipTerms | null) => void;
  acceptedDisclaimer: boolean; setAcceptedDisclaimer: (value: boolean) => void; busy: boolean;
  onRespond: (decision: 'accept' | 'decline' | 'counter') => void;
}> = ({ items, selected, onSelect, counterTerms, setCounterTerms, acceptedDisclaimer, setAcceptedDisclaimer, busy, onRespond }) => {
  if (!items.length || !selected) return <EmptyMessage text="Você não possui ofertas de parceria aguardando análise." />;
  return <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
    <aside className="space-y-2">{items.map(item => <button key={item.negotiation_id} type="button" onClick={() => { onSelect(item.negotiation_id); setCounterTerms(null); }} className={`w-full text-left rounded-2xl border p-3 ${selected.negotiation_id === item.negotiation_id ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700'}`}><strong className="block text-xs text-slate-900 dark:text-white line-clamp-2">{item.property.title}</strong><span className="block text-[10px] text-slate-500 mt-1">#{item.property.code} · {item.captor.name}</span><span className="inline-block mt-2"><NegotiationBadge status={item.status} /></span></button>)}</aside>
    <div className="space-y-5"><div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4"><div className="flex gap-3 items-center"><UserAvatar name={selected.captor.name} src={selected.captor.avatar_url || undefined} className="w-11 h-11 rounded-xl" /><div><strong className="block text-sm text-slate-900 dark:text-white">{selected.property.title}</strong><span className="text-xs text-slate-500">{selected.captor.name} · CRECI {selected.captor.creci}/SP · {formatCurrency(selected.property.price)}</span></div></div></div>
      {counterTerms ? <TermsEditor value={counterTerms} onChange={setCounterTerms} /> : <TermsSummary terms={selected.current_terms} />}
      {!counterTerms && selected.status !== 'preliminarily_accepted' && <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3"><input type="checkbox" checked={acceptedDisclaimer} onChange={event => setAcceptedDisclaimer(event.target.checked)} className="mt-0.5 rounded text-emerald-600" /><span><strong className="block text-xs text-slate-900 dark:text-white">Li e concordo com estes termos preliminares</strong><span className="block text-[11px] text-slate-500">O aceite não ativa a parceria. Ainda serão necessários contrato versionado, assinatura eletrônica adequada e comprovação no SGR.</span></span></label>}
      <div className="flex flex-wrap justify-end gap-2">{counterTerms ? <><button type="button" disabled={busy} onClick={() => setCounterTerms(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar contraproposta</button><button type="button" disabled={busy} onClick={() => onRespond('counter')} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Enviar contraproposta</button></> : selected.status === 'preliminarily_accepted' ? <span className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"><Check className="w-4 h-4" /> Aceite preliminar registrado</span> : <><button type="button" disabled={busy} onClick={() => onRespond('decline')} className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold">Recusar</button><button type="button" disabled={busy} onClick={() => setCounterTerms(structuredClone(selected.current_terms))} className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold"><RefreshCw className="w-4 h-4 inline mr-1" /> Contrapropor</button><button type="button" disabled={busy || !acceptedDisclaimer} onClick={() => onRespond('accept')} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Aceitar preliminarmente</button></>}</div>
      {['preliminarily_accepted','awaiting_contract','active'].includes(selected.status) && <PartnershipContractPanel negotiationId={selected.negotiation_id} currentTerms={selected.current_terms} renderTermsEditor={(value,onChange) => <TermsEditor value={value} onChange={onChange} />} />}
    </div>
  </div>;
};

const TermsEditor: React.FC<{ value: PartnershipTerms; onChange: (value: PartnershipTerms) => void }> = ({ value, onChange }) => {
  const update = <K extends keyof PartnershipTerms>(key: K, next: PartnershipTerms[K]) => onChange({ ...value, [key]: key === 'territory_description' ? 'Estado de São Paulo' : next, territory_description: 'Estado de São Paulo' });
  const setCaptorShare = (share: number) => { const bounded = Math.max(1, Math.min(99, Number.isFinite(share) ? share : 50)); onChange({ ...value, captor_share: bounded, partner_share: 100 - bounded }); };
  return <div className="space-y-5">
    <section className="space-y-3"><div><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Divisão dos honorários</h4><p className="text-[11px] text-slate-500">Percentual sobre os honorários profissionais efetivamente devidos, nunca sobre o valor total do imóvel.</p></div><div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_110px] gap-3 items-end"><input type="range" min={1} max={99} step={1} value={value.captor_share} onChange={event => setCaptorShare(Number(event.target.value))} className="accent-rose-600" /><PercentField label="Captador" value={value.captor_share} onChange={setCaptorShare} /><PercentField label="Parceiro" value={value.partner_share} onChange={share => setCaptorShare(100 - share)} /></div></section>
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3"><SelectParty label="Recebe e presta contas dos honorários" value={value.honorarium_receiver} onChange={next => update('honorarium_receiver', next)} /><SelectParty label="Prepara o instrumento da transação" value={value.contract_preparer} onChange={next => update('contract_preparer', next)} /></section>
    <section className="space-y-3"><h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-500" /> Vigência e território</h4><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo<select value={value.duration_kind} onChange={event => onChange({ ...value, duration_kind: event.target.value as 'fixed' | 'indefinite', valid_until: event.target.value === 'indefinite' ? null : value.valid_until || value.valid_from })} className={FIELD_CLASS}><option value="indefinite">Prazo indeterminado</option><option value="fixed">Prazo determinado</option></select></label><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Início<input type="date" value={value.valid_from} onChange={event => update('valid_from', event.target.value)} className={FIELD_CLASS} /></label><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Término<input type="date" disabled={value.duration_kind === 'indefinite'} value={value.valid_until || ''} min={value.valid_from} onChange={event => update('valid_until', event.target.value || null)} className={`${FIELD_CLASS} disabled:opacity-50`} /></label><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aviso prévio (dias)<input type="number" min={0} max={180} value={value.termination_notice_days} onChange={event => update('termination_notice_days', Number(event.target.value))} className={FIELD_CLASS} /></label></div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Território autorizado<input value={value.territory_description} maxLength={500} onChange={event => update('territory_description', event.target.value)} className={FIELD_CLASS} placeholder="Ex.: Sorocaba e bairros limítrofes, Estado de São Paulo" /></label></section>
    <section className="space-y-3"><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Exclusividade e publicidade</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Toggle label="Autorização original do proprietário é exclusiva" checked={value.original_authorization_exclusive} onChange={next => update('original_authorization_exclusive', next)} /><Toggle label="Parceria exclusiva com este parceiro" checked={value.partnership_exclusive} onChange={next => update('partnership_exclusive', next)} /><Toggle label="Exibir no portal do parceiro" checked={value.allow_partner_portal} onChange={next => update('allow_partner_portal', next)} /><Toggle label="Divulgar em redes sociais" checked={value.allow_social_media} onChange={next => update('allow_social_media', next)} /><Toggle label="Realizar anúncios pagos" checked={value.allow_paid_ads} onChange={next => update('allow_paid_ads', next)} /><Toggle label="Publicar em portais externos" checked={value.allow_external_portals} onChange={next => update('allow_external_portals', next)} /><Toggle label="Adaptar materiais de divulgação" checked={value.allow_material_adaptation} onChange={next => update('allow_material_adaptation', next)} /></div></section>
    <section className="space-y-3"><div><h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Matriz de responsabilidades</h4><p className="text-[11px] text-slate-500">Defina claramente quem executa cada atividade. Nenhum item pode ficar sem responsável.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{PARTNERSHIP_RESPONSIBILITIES.map(item => <label key={item.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3"><span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{item.label}</span><select value={value.responsibilities[item.key]} onChange={event => update('responsibilities', { ...value.responsibilities, [item.key]: event.target.value as ResponsibleParty })} className="w-full bg-transparent text-xs text-slate-900 dark:text-white"><option value="captor">Captador</option><option value="partner">Parceiro</option><option value="both">Ambos</option></select></label>)}</div></section>
    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Condições adicionais<textarea rows={3} maxLength={3000} value={value.additional_terms || ''} onChange={event => update('additional_terms', event.target.value || null)} className={FIELD_CLASS} placeholder="Inclua somente condições objetivas relacionadas a esta parceria." /></label>
  </div>;
};

const TermsSummary: React.FC<{ terms: PartnershipTerms }> = ({ terms }) => <div className="space-y-4"><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><Summary value={`${terms.captor_share}%`} label="Captador" /><Summary value={`${terms.partner_share}%`} label="Parceiro" /><Summary value={terms.duration_kind === 'fixed' ? 'Determinado' : 'Indeterminado'} label="Prazo" /><Summary value={`v${terms.version_number || 1}`} label="Versão" /></div><div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2"><p><strong>Vigência:</strong> {terms.valid_from}{terms.valid_until ? ` a ${terms.valid_until}` : ', sem término definido'}.</p><p><strong>Território:</strong> {terms.territory_description}</p><p><strong>Honorários:</strong> recebimento e prestação de contas por {partyLabel(terms.honorarium_receiver).toLowerCase()}.</p><p><strong>Instrumento:</strong> preparado por {partyLabel(terms.contract_preparer).toLowerCase()}.</p><p><strong>Publicidade:</strong> {[terms.allow_partner_portal && 'portal do parceiro', terms.allow_social_media && 'redes sociais', terms.allow_paid_ads && 'anúncios pagos', terms.allow_external_portals && 'portais externos', terms.allow_material_adaptation && 'adaptação de materiais'].filter(Boolean).join(', ') || 'nenhuma permissão selecionada'}.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{PARTNERSHIP_RESPONSIBILITIES.map(item => <div key={item.key} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 flex justify-between gap-3 text-[11px]"><span className="text-slate-500">{item.label}</span><strong className="text-slate-800 dark:text-slate-200">{partyLabel(terms.responsibilities[item.key])}</strong></div>)}</div>{terms.additional_terms && <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-xs whitespace-pre-wrap"><strong className="block mb-1">Condições adicionais</strong>{terms.additional_terms}</div>}</div>;

const PercentField: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}<div className="relative"><input type="number" min={1} max={99} value={value} onChange={event => onChange(Number(event.target.value))} className={`${FIELD_CLASS} pr-7`} /><span className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400">%</span></div></label>;
const SelectParty: React.FC<{ label: string; value: ResponsibleParty; onChange: (value: ResponsibleParty) => void }> = ({ label, value, onChange }) => <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}<select value={value} onChange={event => onChange(event.target.value as ResponsibleParty)} className={FIELD_CLASS}><option value="captor">Captador</option><option value="partner">Parceiro</option><option value="both">Ambos</option></select></label>;
const Toggle: React.FC<{ label: string; checked: boolean; onChange: (value: boolean) => void }> = ({ label, checked, onChange }) => <label className="flex items-start gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 rounded text-indigo-600" />{label}</label>;
const Summary: React.FC<{ value: string; label: string }> = ({ value, label }) => <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3"><strong className="block text-base text-slate-900 dark:text-white">{value}</strong><span className="text-[10px] text-slate-500">{label}</span></div>;
const EmptyMessage: React.FC<{ text: string }> = ({ text }) => <div className="py-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500"><Users className="w-7 h-7 mx-auto mb-2 opacity-50" />{text}</div>;
const NegotiationBadge: React.FC<{ status: string }> = ({ status }) => { const labels: Record<string,string> = { proposed:'Aguardando parceiro',countered:'Contraproposta',preliminarily_accepted:'Aceite preliminar',declined:'Recusada',cancelled:'Cancelada',awaiting_contract:'Aguardando contrato',active:'Parceria ativa' }; return <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{labels[status] || status}</span>; };
const partyLabel = (value: ResponsibleParty) => value === 'captor' ? 'Captador' : value === 'partner' ? 'Parceiro' : 'Ambos';
const validateTerms = (terms: PartnershipTerms) => terms.captor_share > 0 && terms.partner_share > 0 && terms.captor_share + terms.partner_share === 100 && terms.territory_description.trim().length >= 2 && Boolean(terms.valid_from) && (terms.duration_kind === 'indefinite' ? !terms.valid_until : Boolean(terms.valid_until && terms.valid_until >= terms.valid_from)) && PARTNERSHIP_RESPONSIBILITIES.every(item => Boolean(terms.responsibilities[item.key]));
