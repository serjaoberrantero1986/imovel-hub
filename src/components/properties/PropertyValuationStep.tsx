import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, ClipboardList, Loader2, Plus, ShieldCheck } from 'lucide-react';
import type { Property } from '../../types';
import { useCatalog } from '../../context/AppContext';
import {
  addValuationComparable, createValuationForProperty, listValuationComparables,
  listValuationsForProperty, type ValuationAssessment, type ValuationComparable,
  type ValuationComparableInput, type ValuationSourceType,
} from '../../lib/valuation/assessmentRepository';
import { auditComparables } from '../../lib/valuation/engine.mjs';

const control = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white';
const types: { id: ValuationSourceType; label: string }[] = [
  { id: 'real_estate_agency', label:'Imobiliária' }, { id:'olx',label:'OLX' },
  { id:'facebook_marketplace',label:'Facebook Marketplace' },
  { id:'portal',label:'Portal imobiliário' }, { id:'other',label:'Outra fonte' },
];
const fresh = () => ({
  source_type: 'real_estate_agency' as ValuationSourceType,
  source_name:'', listing_url:'', asking_price:'', built_area:'', land_area:'',
  bedrooms:'', bathrooms:'', latitude:'', longitude:'',
  positionConfirmed:false, availability:'unknown' as 'unknown'|'active',
  regionChecked:false, dataReviewed:false, notes:'',
});
type ComparableDraft = ReturnType<typeof fresh>;
const readNumber = (value:string):number|null => value.trim()===''?null:Number(value);
const currency = (value:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value);

export const PropertyValuationStep: React.FC<{ property: Property }> = ({ property }) => {
  const { activeAmenities } = useCatalog();
  const [history,setHistory] = useState<ValuationAssessment[]>([]);
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [comparables,setComparables] = useState<ValuationComparable[]>([]);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [showForm,setShowForm] = useState(false);
  const [draft,setDraft] = useState<ComparableDraft>(fresh);
  const [error,setError] = useState('');
  const selected = history.find(item=>item.id===selectedId) ?? null;
  const visibleAmenities = (property.amenities || []).map(id=>activeAmenities.find(item=>item.id===id)?.name||id);

  const refresh = useCallback(async () => {
    setLoading(true);setError('');
    try {
      const items=await listValuationsForProperty(property.id);
      setHistory(items);
      setSelectedId(previous=>items.some(a=>a.id===previous)?previous:(items[0]?.id||null));
    } catch {
      setError('Não foi possível consultar avaliações. Verifique as permissões e tente novamente.');
    } finally {setLoading(false);}
  },[property.id]);

  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    if(!selectedId){setComparables([]);return;}
    let alive=true;
    void listValuationComparables(selectedId).then(data=>{if(alive)setComparables(data);})
      .catch(()=>{if(alive)setError('Não foi possível carregar os comparáveis desta avaliação.');});
    return ()=>{alive=false;};
  },[selectedId]);

  const audit=useMemo(()=>{
    if(!selected) return null;
    return auditComparables({
      propertyType:selected.property_type, builtArea:selected.built_area, landArea:selected.land_area,
      condominium:selected.condominium,
      coordinates:selected.latitude!==null&&selected.longitude!==null?{lat:Number(selected.latitude),lng:Number(selected.longitude)}:null,
      coordinateQuality:selected.coordinate_quality,
    },comparables.map(c=>({
      id:c.id,source:c.source_name,publisher:c.source_name,
      sourceListingId:c.listing_reference,listingUrl:c.listing_url,
      propertyType:c.property_type,askingPrice:Number(c.asking_price),
      builtArea:c.built_area!==null?Number(c.built_area):null,
      landArea:c.land_area!==null?Number(c.land_area):null,bedrooms:c.bedrooms,bathrooms:c.bathrooms,
      coordinates:c.latitude!==null&&c.longitude!==null?{lat:Number(c.latitude),lng:Number(c.longitude)}:null,
      coordinateQuality:c.coordinate_quality,availability:c.availability,
      marketZoneVerified:c.market_zone_verified,reviewedByBroker:c.reviewed_by_broker,
      condominium:c.condominium,multiUnit:c.multi_unit,unfinished:c.unfinished,
      conflictingData:c.conflicting_data,
    })));
  },[selected,comparables]);

  const startAssessment=async()=>{
    if(busy)return;setBusy(true);setError('');
    try{
      const created=await createValuationForProperty(property);
      setHistory(items=>[created,...items]);setSelectedId(created.id);setShowForm(false);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a avaliação.');}
    finally{setBusy(false);}
  };
  const addComparable=async(e:React.FormEvent)=>{
    e.preventDefault();if(!selected||busy)return;
    if(!Number.isFinite(Number(draft.asking_price))||Number(draft.asking_price)<=0) {
      setError('Informe um preço de anúncio válido.');return;
    }
    if([draft.built_area,draft.land_area,draft.bedrooms,draft.bathrooms].some(n=>n!==''&&(!Number.isFinite(Number(n))||Number(n)<0))) {
      setError('Confira os números informados.');return;
    }
    const coordsFilled=Boolean(draft.latitude.trim()&&draft.longitude.trim());
    if((Boolean(draft.latitude.trim())!==Boolean(draft.longitude.trim()))||
      (coordsFilled&&(!Number.isFinite(Number(draft.latitude))||!Number.isFinite(Number(draft.longitude))||
      Math.abs(Number(draft.latitude))>90||Math.abs(Number(draft.longitude))>180))){
      setError('Informe ambas as coordenadas válidas ou deixe os campos vazios.');return;
    }
    const input:ValuationComparableInput={
      source_type:draft.source_type,source_name:draft.source_name.trim(),
      listing_url:draft.listing_url.trim(),listing_reference:null,
      property_type:selected.property_type,asking_price:Number(draft.asking_price),
      built_area:readNumber(draft.built_area),land_area:readNumber(draft.land_area),
      bedrooms:readNumber(draft.bedrooms),bathrooms:readNumber(draft.bathrooms),
      suites:null,parking_spots:null,condominium:null,
      latitude:coordsFilled?Number(draft.latitude):null,
      longitude:coordsFilled?Number(draft.longitude):null,
      coordinate_quality:coordsFilled?(draft.positionConfirmed?'property':'street'):'unknown',
      availability:draft.availability,market_zone_verified:draft.regionChecked,
      reviewed_by_broker:draft.dataReviewed,conflicting_data:false,multi_unit:false,unfinished:false,
      notes:draft.notes.trim().slice(0,3000),
    };
    setBusy(true);setError('');
    try{
      const created=await addValuationComparable(selected.id,input);
      setComparables(prev=>[created,...prev]);setDraft(fresh());setShowForm(false);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível adicionar o anúncio.');}
    finally{setBusy(false);}
  };
  return <section className="space-y-5 pb-3">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/20">
      <div className="flex items-center gap-3">
        <ChartNoAxesCombined className="h-6 w-6 text-rose-600"/>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Etapa 8 — Avaliação Inteligente <span className="text-xs font-normal text-rose-600">(opcional)</span></h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">O anúncio já está salvo. A avaliação é privada, não modifica seu preço e pode ser feita depois.</p>
        </div>
      </div>
      <button type="button" disabled={busy||loading} onClick={()=>void startAssessment()}
        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
        {busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>} Nova avaliação
      </button>
    </div>
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap justify-between gap-3">
        <div><strong className="text-sm">{property.title}</strong>
          <p className="text-xs text-slate-500">#{property.code} · {property.city}/{property.state} · {property.neighborhood}</p></div>
        <div className="text-right"><span className="block text-xs text-slate-500">Preço anunciado (não avaliado)</span>
          <strong className="text-base">{currency(property.price)}</strong></div>
      </div>
      {property.media?.length>0&&<div className="mt-3 flex max-w-full gap-2 overflow-x-auto">
        {property.media.filter(m=>m.mediaType==='image').slice(0,8).map(m=>
          <img key={m.id} src={m.thumbnailUrl||m.url} alt={m.caption||'Foto do anúncio'} className="h-20 w-28 shrink-0 rounded-xl object-cover"/>)}
      </div>}
      <p className="mt-3 text-xs text-slate-500">{property.totalArea||'—'} m² total · {property.usefulArea||'—'} m² útil · {property.bedrooms} dormitórios · {property.suites} suítes · {property.bathrooms} banheiros · {property.parkingSpots} vagas</p>
      {visibleAmenities.length>0&&<p className="mt-2 text-xs text-slate-500">Comodidades: {visibleAmenities.join(' · ')}</p>}
    </div>
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {loading?<p className="text-xs text-slate-500">Carregando histórico...</p>:history.length===0?
      <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Este imóvel ainda não tem avaliação. Você pode concluir o anúncio agora ou iniciar uma avaliação quando quiser.</p>:
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {history.map((a,i)=><button type="button" key={a.id} onClick={()=>setSelectedId(a.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${selectedId===a.id?'border-rose-600 text-rose-600 bg-rose-50 dark:bg-rose-950/40':'border-slate-200 dark:border-slate-700'}`}>
            {i===0?'Mais recente · ':''}{new Date(a.created_at).toLocaleDateString('pt-BR')}
          </button>)}
        </div>
        {selected&&<>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-rose-600"/><h4 className="text-sm font-bold">Anúncios comparáveis</h4></div>
            <button type="button" onClick={()=>setShowForm(prev=>!prev)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700">
              {showForm?'Cancelar':'+ Adicionar anúncio'}
            </button>
          </div>
          {showForm&&<form onSubmit={e=>void addComparable(e)} className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">Fonte
                <select className={control} value={draft.source_type} onChange={e=>setDraft(p=>({...p,source_type:e.target.value as ValuationSourceType}))}>
                  {types.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select></label>
              <label className="text-xs font-semibold">Anunciante / imobiliária
                <input required maxLength={120} className={control} value={draft.source_name} onChange={e=>setDraft(p=>({...p,source_name:e.target.value}))}/></label>
              <label className="text-xs font-semibold sm:col-span-2">Link HTTPS do anúncio
                <input type="url" required maxLength={2000} className={control} placeholder="https://..." value={draft.listing_url} onChange={e=>setDraft(p=>({...p,listing_url:e.target.value}))}/></label>
              <label className="text-xs font-semibold">Preço pedido (R$)
                <input required type="number" min="1" step="0.01" className={control} value={draft.asking_price} onChange={e=>setDraft(p=>({...p,asking_price:e.target.value}))}/></label>
              <label className="text-xs font-semibold">Disponibilidade
                <select className={control} value={draft.availability} onChange={e=>setDraft(p=>({...p,availability:e.target.value as 'unknown'|'active'}))}>
                  <option value="unknown">Não confirmada</option><option value="active">Oferta ativa conferida</option>
                </select></label>
              {([['built_area','Área construída (m²)'],['land_area','Terreno (m²)'],['bedrooms','Dormitórios'],['bathrooms','Banheiros']] as const).map(([field,label])=>
                <label key={field} className="text-xs font-semibold">{label}
                  <input className={control} min="0" step={field.includes('area')?'0.01':'1'} type="number" value={draft[field]} onChange={e=>setDraft(p=>({...p,[field]:e.target.value}))}/></label>)}
              <label className="text-xs font-semibold">Latitude (opcional)
                <input type="number" step="any" className={control} value={draft.latitude} onChange={e=>setDraft(p=>({...p,latitude:e.target.value}))}/></label>
              <label className="text-xs font-semibold">Longitude (opcional)
                <input type="number" step="any" className={control} value={draft.longitude} onChange={e=>setDraft(p=>({...p,longitude:e.target.value}))}/></label>
            </div>
            <div className="grid gap-2 text-xs">
              <label className="flex gap-2"><input type="checkbox" checked={draft.positionConfirmed} onChange={e=>setDraft(p=>({...p,positionConfirmed:e.target.checked}))}/>O ponto exato do imóvel comparável foi confirmado</label>
              <label className="flex gap-2"><input type="checkbox" checked={draft.regionChecked} onChange={e=>setDraft(p=>({...p,regionChecked:e.target.checked}))}/>Verifiquei a equivalência da região de mercado</label>
              <label className="flex gap-2"><input type="checkbox" checked={draft.dataReviewed} onChange={e=>setDraft(p=>({...p,dataReviewed:e.target.checked}))}/>Conferi os dados do anúncio</label>
            </div>
            <button type="submit" disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Salvar comparável</button>
          </form>}
          <div className="grid grid-cols-3 gap-2">
            {(['aceito','pendente','rejeitado'] as const).map(status=><div key={status} className="rounded-xl bg-slate-100 p-3 text-center dark:bg-slate-800">
              <strong className="block text-lg">{audit?.counts[status]??0}</strong>
              <span className="text-[11px] capitalize text-slate-500">{status}</span>
            </div>)}
          </div>
          {comparables.map(c=>{
            const decision=audit?.decisions.find((d:{id:string})=>d.id===c.id);
            return <div key={c.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
              <div className="flex justify-between gap-2"><strong>{c.source_name} · {currency(Number(c.asking_price))}</strong>
                <a href={c.listing_url} rel="noopener noreferrer" target="_blank" className="flex items-center gap-1 text-rose-600">Anúncio <ArrowUpRight className="h-3 w-3"/></a></div>
              <span className="text-slate-500">Triagem: {decision?.status||'pendente'} · {decision?.certifiedDistance?decision.distanceMeters+' m':'Distância não certificada'}</span>
              {[...(decision?.rejectedReasons||[]),...(decision?.pendingReasons||[])].map((reason:string,i:number)=><p key={i} className="mt-1 text-slate-500">• {reason}</p>)}
            </div>;
          })}
        </>}
      </div>}
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700"/>
      <p className="text-xs text-amber-900 dark:text-amber-200">Avaliação preliminar sem preço calculado. Uma amostra aceita na triagem não equivale a venda comprovada, laudo ou PTAM. Localização privada e fotos permanecem acessíveis somente ao titular.</p>
    </div>
  </section>;
};
