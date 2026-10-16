import React, { useEffect, useState } from 'react';
import { Handshake, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { listPartnershipOpportunities, PartnershipOpportunity } from '../../lib/partnershipOpportunities';
import { propertyPartnershipErrorMessage, requestPartnershipOpportunity } from '../../lib/propertyPartnerships';

export const PartnershipOpportunitiesPanel: React.FC = () => {
  const { addToast } = useApp();
  const [items, setItems] = useState<PartnershipOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await listPartnershipOpportunities()); }
    catch (error) {
      const message = String((error as { message?: string })?.message || '');
      addToast({ type: 'error', title: 'Oportunidades indisponíveis', message: /MFA|AAL2/i.test(message) ? 'Confirme o código do aplicativo autenticador para consultar oportunidades.' : 'Não foi possível consultar oportunidades de parceria.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const request = async (offerId: string) => {
    setRequesting(offerId);
    try {
      await requestPartnershipOpportunity(offerId);
      addToast({ type: 'success', title: 'Interesse enviado', message: 'A oferta foi encaminhada para a análise do captador.' });
      await load();
    } catch (error) {
      addToast({ type: 'error', title: 'Interesse não enviado', message: propertyPartnershipErrorMessage(error) });
    } finally { setRequesting(null); }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white"><Handshake className="w-5 h-5 text-indigo-500" /> Oportunidades de Parcerias</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Imóveis publicados para descoberta regional. Ofertas privadas já enviadas continuam em “Leads de Parcerias”.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label="Atualizar oportunidades" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {loading ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500 dark:border-slate-700"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-500" />Consultando oportunidades...</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500 dark:border-slate-700"><Handshake className="mx-auto mb-2 h-7 w-7 text-slate-300" />Nenhuma oportunidade publicada para suas regiões no momento.</div> : <div className="grid gap-4 md:grid-cols-2">{items.map(item => <article key={item.offer_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h4 className="font-bold text-slate-900 dark:text-white">{String(item.property.title || 'Imóvel')}</h4><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}/SP</p><p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Captador: <strong>{String(item.captor.name || 'Profissional CRECI-SP')}</strong> · CRECI {String(item.captor.creci || '')}/SP</p><button type="button" disabled={requesting === item.offer_id} onClick={() => void request(item.offer_id)} className="mt-4 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{requesting === item.offer_id ? 'Enviando...' : 'Tenho interesse'}</button></article>)}</div>}
    </section>
  );
};
