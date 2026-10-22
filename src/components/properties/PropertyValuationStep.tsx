import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardList, FileCheck2, Info, Loader2, Plus, RefreshCw,
  Search, Settings2, ShieldCheck, Sparkles, XCircle
} from 'lucide-react';
import type { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { useCatalog } from '../../context/AppContext';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import { supabase } from '../../lib/supabaseClient';
import {
  addComparablesFromSearch, addValuationComparable, createValuationForProperty,
  listValuationComparables, listValuationsForProperty, setComparableExclusion,
  updateValuationComparable, type ValuationAssessment, type ValuationComparable,
  type ValuationComparableInput
} from '../../lib/valuation/assessmentRepository';
import { normalizeGeckoItem, screenOffers } from '../../lib/valuation/geckoMapping.mjs';

// Mantém toda a experiência na oitava etapa do assistente já existente.
// Nenhum mapa, geocodificação ou segundo cadastro é apresentado aqui.
type Phase = 'subject' | 'sources' | 'analysis' | 'result' | 'dossier';
const PHASES: {id:Phase;label:string}[] = [
  {id:'subject',label:'Imóvel'}, {id:'sources',label:'Pesquisar'},
  {id:'analysis',label:'Analisar'}, {id:'result',label:'Resultado'},
  {id:'dossier',label:'Dossiê'}
];
const PROVIDERS: {id:string;label:string}[] = [
  {id:'zapimoveis.com.br',label:'ZAP Imóveis'},
  {id:'vivareal.com.br',label:'VivaReal'},
  {id:'olx.com.br',label:'OLX'},
  {id:'chavesnamao.com.br',label:'Chaves na Mão'},
  {id:'imovelweb.com.br',label:'Imovelweb (por URL)'}
];
const money=(value:number)=>new Intl.NumberFormat('pt-BR',{
  style:'currency',currency:'BRL',maximumFractionDigits:0
}).format(value);
const area=(n?:number|null)=>Number(n)>0?Number(n).toLocaleString('pt-BR')+' m²':'Não informada';
const inputClass='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const textLabel='block mb-1 text-xs font-bold text-slate-600 dark:text-slate-300';
const cardBox='rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
const muted='text-xs leading-relaxed text-slate-500 dark:text-slate-400';
const labelStatus:{[key:string]:string}={
  included:'Aproveitado no indicativo',pending:'Pendente de conferência',excluded:'Excluído'
};
const toneStatus:{[key:string]:string}={
  included:'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
  pending:'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
  excluded:'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
};
const initialProviders=['zapimoveis.com.br','vivareal.com.br','olx.com.br','chavesnamao.com.br'];
const numericField=(raw:string):number|null=>{
  if(!raw.trim())return null;
  const n=Number(raw);
  return Number.isFinite(n)&&n>=0?n:null;
};
type ReviewDraft={
  asking_price:string;usable_area:string;total_area:string;built_area:string;
  bedrooms:string;bathrooms:string;listing_city:string;listing_state:string;
  property_type:string;notes:string;
};
const emptyReview:ReviewDraft={
  asking_price:'',usable_area:'',total_area:'',built_area:'',
  bedrooms:'',bathrooms:'',listing_city:'',listing_state:'',property_type:'',notes:''
};
type SourceStatus={id:string;state:'pending'|'running'|'done'|'error'|'skipped';accepted:number;skipped:number;message?:string};

export const PropertyValuationStep:React.FC<{property:Property}> = ({property})=>{
  const {addToast}=useApp();
  const {activeAmenities}=useCatalog();
  const [phase,setPhase]=useState<Phase>('subject');
  const [history,setHistory]=useState<ValuationAssessment[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [comparables,setComparables]=useState<ValuationComparable[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sources,setSources]=useState<string[]>(initialProviders);
  const [imovelwebUrl,setImovelwebUrl]=useState('');
  const [sourceStates,setSourceStates]=useState<SourceStatus[]>([]);
  const [triageFilter,setTriageFilter]=useState<'all'|'included'|'pending'|'excluded'>('all');
  const [visibleCount,setVisibleCount]=useState(20);
  const [excludeId,setExcludeId]=useState<string|null>(null);
  const [excludeReason,setExcludeReason]=useState('');
  const [editId,setEditId]=useState<string|null>(null);
  const [reviewDraft,setReviewDraft]=useState<ReviewDraft>(emptyReview);
  const [showManual,setShowManual]=useState(false);
  const [manualUrl,setManualUrl]=useState('');
  const [manualPrice,setManualPrice]=useState('');
  const [manualCity,setManualCity]=useState('');
  const [manualState,setManualState]=useState('');
  const [manualArea,setManualArea]=useState('');
  const [manualSource,setManualSource]=useState('Imobiliária');
  const [searchNotice,setSearchNotice]=useState('');
  const selected=history.find(x=>x.id===selectedId)||null;
  const amenities=(property.amenities||[]).map(id=>activeAmenities.find(a=>a.id===id)?.name||id);

  const reload=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const results=await listValuationsForProperty(property.id);
      setHistory(results);
      setSelectedId(prev=>results.some(item=>item.id===prev)?prev:results[0]?.id||null);
    }catch{
      setError('Não foi possível consultar o histórico das suas avaliações. Verifique a sessão e as permissões.');
    }finally{setLoading(false);}
  },[property.id]);
  useEffect(()=>{void reload();},[reload]);
  useEffect(()=>{
    if(!selectedId){setComparables([]);return;}
    let active=true;
    void listValuationComparables(selectedId).then(rows=>{
      if(active)setComparables(rows);
    }).catch(()=>{if(active)setError('Não foi possível recuperar as amostras desta avaliação.');});
    return()=>{active=false;};
  },[selectedId]);

  const indicator=useMemo(()=>selected?screenOffers(selected,comparables):null,[selected,comparables]);
  const options=indicator?.entries.filter(row=>triageFilter==='all'||row.status===triageFilter)||[];
  const shown=options.slice(0,visibleCount);
  const requiredArea=['land','chacara','farm'].includes(property.type)?
    property.totalArea>0 : ['apartment','flat','kitnet','penthouse'].includes(property.type)?
    property.usefulArea>0 : property.usefulArea>0||Number(property.builtArea)>0;
  const subjectReady=Boolean(property.city&&property.state&&requiredArea);
  const currentIndex=PHASES.findIndex(p=>p.id===phase);

  const notify=(message:string)=>{
    addToast({type:'success',title:'Avaliação Inteligente',message});
  };
  const prepareAssessment=async(createNew:boolean)=>{
    if(busy)return;
    setError('');setBusy(true);
    try{
      if(!subjectReady)throw new Error('Confira a cidade, o estado e a metragem pertinente na etapa 2 ou 3 do cadastro.');
      if(createNew||!selected){
        const created=await createValuationForProperty(property);
        setHistory(previous=>[created,...previous]);
        setSelectedId(created.id);
        setComparables([]);
        setSearchNotice('');
        notify('Avaliação privada iniciada com os dados do cadastro.');
      }
      setPhase('sources');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível iniciar a avaliação.');}
    finally{setBusy(false);}
  };

  const toggleSource=(id:string)=>{
    setSources(items=>items.includes(id)?items.filter(x=>x!==id):[...items,id]);
  };
  const research=async()=>{
    if(busy)return;
    setError('');
    if(!selected){setError('Inicie a avaliação a partir do cadastro antes de pesquisar.');return;}
    if(!sources.length){setError('Selecione pelo menos uma fonte.');return;}
    if(sources.includes('imovelweb.com.br')){
      try{
        const u=new URL(imovelwebUrl);
        if(u.protocol!=='https:'||!u.hostname.endsWith('imovelweb.com.br')||
          !u.pathname.endsWith('.html'))throw Error();
      }catch{
        setError('Informe a URL HTTPS pública de resultados do Imovelweb, terminada em .html.');
        return;
      }
    }
    // Falhar antes de qualquer chamada paga se as colunas necessárias da
    // migração ainda não estiverem disponíveis no banco do projeto.
    if(!supabase){setError('O serviço de avaliações está indisponível.');return;}
    setBusy(true);
    try{
      const [{error:e1},{error:e2}]=await Promise.all([
        supabase.from('valuation_comparables')
          .select('id,usable_area,total_area,listing_city,offer_purpose,excluded_by_broker').limit(0),
        supabase.from('properties').select('id,built_area').eq('id',property.id).limit(1)
      ]);
      if(e1||e2)throw new Error('O banco de dados ainda não possui a atualização de áreas e comparáveis. Nenhuma consulta paga foi executada.');
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error('Sua sessão expirou. Entre novamente para pesquisar.');
      const confirmed=window.confirm(
        'Você selecionou '+sources.length+' fonte(s). A pesquisa executará até '+sources.length+
        ' consulta(s) à GeckoAPI (uma página por fonte), que poderão consumir créditos. Deseja continuar?');
      if(!confirmed)return;
      const values:SourceStatus[]=sources.map(id=>({id,state:'pending',accepted:0,skipped:0}));
      setSourceStates(values);
      let success=0;let total=0;let problems=0;
      const failedMessages:string[]=[];
      for(const target of sources){
        setSourceStates(prev=>prev.map(item=>item.id===target?{...item,state:'running'}:item));
        try{
          const response=await fetch('/api/valuation-search',{
            method:'POST',
            headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
            body:JSON.stringify({propertyId:property.id,assessmentId:selected.id,target,page:1,
              imovelwebUrl:target==='imovelweb.com.br'?imovelwebUrl:''})
          });
          const data=await response.json().catch(()=>({}));
          if(!response.ok){
            const message=String(data.error||'Não foi possível consultar esta fonte.');
            setSourceStates(prev=>prev.map(item=>item.id===target?
              {...item,state:'error',message}:item));
            failedMessages.push(PROVIDERS.find(x=>x.id===target)?.label||target);
            if([401,403,429,503].includes(response.status)){
              setSourceStates(prev=>prev.map(item=>item.state==='pending'?
                {...item,state:'skipped',message:'Execução interrompida para evitar novas chamadas.'}:item));
              break;
            }
            continue;
          }
          const mapped=(Array.isArray(data.items)?data.items:[]).map((row:unknown)=>
            normalizeGeckoItem(row,target,property.purpose==='rent'?'rent':'sale')).filter(Boolean);
          const valid=mapped.filter((row:any)=>row.asking_price>0&&row.listing_url);
          const skipped=mapped.length-valid.length+
            Number(data.audit?.discardedMissingLocation||0)+
            Number(data.audit?.discardedOtherCities||0);
          const now=typeof data.retrievedAt==='string'?data.retrievedAt:new Date().toISOString();
          const proposals:ValuationComparableInput[]=valid.map((row:any)=>({
            source_type:target==='olx.com.br'?'olx':'portal',
            source_name:target,listing_url:row.listing_url,
            listing_reference:row.listing_reference,
            property_type:row.property_type,
            asking_price:row.asking_price,
            usable_area:row.usable_area,total_area:row.total_area,
            built_area:row.built_area,land_area:row.land_area,
            bedrooms:row.bedrooms,suites:row.suites,bathrooms:row.bathrooms,
            parking_spots:row.parking_spots,
            listing_title:row.listing_title,listing_city:row.listing_city,
            listing_state:row.listing_state,listing_neighborhood:row.listing_neighborhood,
            offer_purpose:row.offer_purpose,collected_at:now,
            excluded_by_broker:false,exclusion_reason:'',
            condominium:null,latitude:null,longitude:null,coordinate_quality:'unknown',
            availability:'unknown',market_zone_verified:false,reviewed_by_broker:false,
            conflicting_data:false,multi_unit:false,unfinished:false,
            notes:('Pesquisa GeckoAPI · '+now+
              (data.requestId?' · Consulta '+String(data.requestId).slice(0,80):'')+
              (Array.isArray(row.evidence_text)&&row.evidence_text.length?
                 ' · Indícios textuais não confirmados: '+row.evidence_text.join(' | '):'')
              ).slice(0,3000)
          }));
          const persisted=await addComparablesFromSearch(selected.id,proposals);
          success++;total+=persisted.saved.length;
          problems+=skipped;
          setComparables(prev=>[...persisted.saved,...prev]);
          setSourceStates(prev=>prev.map(item=>item.id===target?
            {...item,state:'done',accepted:persisted.saved.length,skipped,
              message:persisted.duplicates+' anúncio(s) já estavam na avaliação.'}:item));
        }catch(e){
          const message=e instanceof Error?e.message:'Falha nesta fonte.';
          failedMessages.push(PROVIDERS.find(x=>x.id===target)?.label||target);
          setSourceStates(prev=>prev.map(item=>item.id===target?
            {...item,state:'error',message}:item));
          // Se falhou a gravação, não fazer mais chamadas pagas.
          if(/salvar|banco de dados|permiss/.test(message.toLowerCase())){
            setError(message);
            setSourceStates(prev=>prev.map(item=>item.state==='pending'?
              {...item,state:'skipped',message:'Execução interrompida para preservar a amostra.'}:item));
            break;
          }
        }
      }
      setSearchNotice(success+' fonte(s) consultada(s); '+total+
        ' anúncio(s) novos gravados. '+problems+
        ' anúncio(s) não aproveitados na importação por ausência de preço, URL ou localização.'+
        (failedMessages.length?' Fontes com falha: '+failedMessages.join(', ')+'.':''));
      setPhase('analysis');
      if(success)notify('Pesquisa concluída. Confira a triagem automática antes de usar o indicativo.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível executar a pesquisa.');}
    finally{setBusy(false);}
  };

  const changeExclusion=async(row:ValuationComparable,exclude:boolean)=>{
    if(!selected||busy)return;
    setBusy(true);setError('');
    try{
      const changed=await setComparableExclusion(selected.id,row.id,exclude,exclude?excludeReason:'');
      setComparables(prev=>prev.map(c=>c.id===changed.id?changed:c));
      setExcludeId(null);setExcludeReason('');
      notify(exclude?'Anúncio retirado da amostra com justificativa.':'Exclusão manual removida; critérios automáticos reaplicados.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a seleção.');}
    finally{setBusy(false);}
  };
  const openReview=(row:ValuationComparable)=>{
    setEditId(row.id);setExcludeId(null);setError('');
    setReviewDraft({
      asking_price:String(row.asking_price??''),
      usable_area:row.usable_area!=null?String(row.usable_area):'',
      total_area:row.total_area!=null?String(row.total_area):'',
      built_area:row.built_area!=null?String(row.built_area):'',
      bedrooms:row.bedrooms!=null?String(row.bedrooms):'',
      bathrooms:row.bathrooms!=null?String(row.bathrooms):'',
      listing_city:row.listing_city||'',listing_state:row.listing_state||'',
      property_type:row.property_type,notes:''
    });
  };
  const saveReview=async(row:ValuationComparable)=>{
    if(!selected||busy)return;
    if(reviewDraft.notes.trim().length<12){
      setError('Explique de onde vieram as informações conferidas (mínimo de 12 caracteres).');
      return;
    }
    for(const field of ['asking_price','usable_area','total_area','built_area','bedrooms','bathrooms'] as const){
      const value=numericField(reviewDraft[field]);
      if((reviewDraft[field].trim()!==''&&value===null)||
        (['bedrooms','bathrooms'].includes(field)&&value!==null&&!Number.isInteger(value))||
        (field==='asking_price'&&(!value||value<=0))){
        setError('Confira os campos numéricos; preço positivo é obrigatório.');return;
      }
    }
    setBusy(true);setError('');
    try{
      const changed=await updateValuationComparable(selected.id,row.id,{
        asking_price:Number(reviewDraft.asking_price),
        usable_area:numericField(reviewDraft.usable_area),
        total_area:numericField(reviewDraft.total_area),
        built_area:numericField(reviewDraft.built_area),
        bedrooms:numericField(reviewDraft.bedrooms),
        bathrooms:numericField(reviewDraft.bathrooms),
        listing_city:reviewDraft.listing_city.trim().slice(0,120),
        listing_state:reviewDraft.listing_state.trim().toUpperCase().slice(0,2),
        property_type:reviewDraft.property_type,
        reviewed_by_broker:true,
        notes:(row.notes+'\nConferência '+new Date().toISOString()+
          ': '+reviewDraft.notes.trim()).slice(-3000)
      });
      setComparables(prev=>prev.map(c=>c.id===changed.id?changed:c));
      setEditId(null);setReviewDraft(emptyReview);
      notify('Informações conferidas e gravadas; análise recalculada.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a conferência.');}
    finally{setBusy(false);}
  };

  const saveManual=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!selected||busy)return;
    if(!manualUrl.trim()||!manualSource.trim()||!manualCity.trim()||
       !/^[A-Za-z]{2}$/.test(manualState.trim())||
       !(Number(manualPrice)>0)){
      setError('Informe fonte, link HTTPS, preço pedido, município e UF.');
      return;
    }
    setBusy(true);setError('');
    try{
      const c:ValuationComparableInput={
        source_type:'real_estate_agency',source_name:manualSource.trim().slice(0,120),
        listing_url:manualUrl.trim(),listing_reference:null,
        property_type:property.type,asking_price:Number(manualPrice),
        usable_area:numericField(manualArea),total_area:null,
        land_area:null,built_area:null,
        listing_title:'Anúncio cadastrado manualmente',
        listing_city:manualCity.trim(),listing_state:manualState.trim().toUpperCase(),
        listing_neighborhood:'',offer_purpose:property.purpose==='rent'?'rent':property.purpose==='sale'?'sale':'unknown',
        excluded_by_broker:false,exclusion_reason:'',
        bedrooms:null,bathrooms:null,suites:null,parking_spots:null,
        latitude:null,longitude:null,coordinate_quality:'unknown',condominium:null,
        availability:'unknown',market_zone_verified:false,reviewed_by_broker:false,
        conflicting_data:false,multi_unit:false,unfinished:false,
        notes:'Adição manual; verificação de detalhes pendente.'
      };
      const created=await addValuationComparable(selected.id,c);
      setComparables(prev=>[created,...prev]);
      setShowManual(false);setManualUrl('');setManualPrice('');setManualArea('');
      notify('Oferta adicionada para triagem; ainda não foi tecnicamente aprovada.');
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível adicionar o comparável.');}
    finally{setBusy(false);}
  };

  return <section className="space-y-5 pb-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rose-600"/>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">Etapa 8 · Opcional</span>
        </div>
        <h3 className="font-['Outfit'] text-xl font-extrabold text-slate-900 dark:text-white">Avaliação Inteligente</h3>
        <p className={muted}>Sua avaliação é privada. O preço anunciado e a publicação não serão alterados.</p>
      </div>
      {history.length>0&&<span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700">
        {history.length} avaliação(ões) no histórico
      </span>}
    </div>

    <div className="grid grid-cols-5 gap-1.5" aria-label="Progresso da avaliação">
      {PHASES.map((item,i)=><div key={item.id} className="space-y-1.5">
        <div className={'h-1.5 rounded-full '+(i<=currentIndex?'bg-rose-600':'bg-slate-200 dark:bg-slate-700')}/>
        <span className={'block text-center text-[10px] font-semibold '+(i===currentIndex?'text-rose-600':'text-slate-400')}>{item.label}</span>
      </div>)}
    </div>

    {error&&<div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
      <AlertCircle className="h-4 w-4 shrink-0"/><span>{error}</span>
    </div>}

    {phase==='subject'&&<div className="space-y-4 animate-in fade-in">
      <Card>
        <CardHeader><CardTitle>Este é o imóvel que vamos avaliar?</CardTitle>
          <CardDescription>As informações vieram do cadastro; nenhuma delas precisa ser digitada novamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            {property.media?.find(m=>m.mediaType==='image')?.url&&
              <img src={property.media.find(m=>m.mediaType==='image')?.thumbnailUrl||property.media.find(m=>m.mediaType==='image')?.url}
                className="h-20 w-24 shrink-0 rounded-xl object-cover" alt="Fotografia cadastrada do imóvel"/>}
            <div className="min-w-0 space-y-1">
              <strong className="block truncate text-sm text-slate-900 dark:text-white">{property.title||property.code}</strong>
              <p className={muted}>#{property.code} · {property.neighborhood||'Bairro não informado'} · {property.city}/{property.state}</p>
              <p className={muted}>Tipo: {property.type} · {property.bedrooms} dormitórios · {property.suites} suítes</p>
              <p className={muted}>Localização: {property.coordinateQuality==='property'?'Ponto confirmado no cadastro':'Endereço cadastrado; ponto exato não confirmado'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              ['Área útil',area(property.usefulArea)],
              ['Área construída',area(property.builtArea)],
              ['Área total/terreno',area(property.totalArea)]
            ].map(([name,value])=><div key={name} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[11px] text-slate-500">{name}</p>
              <strong className="text-sm text-slate-900 dark:text-white">{value}</strong>
            </div>)}
          </div>
          {amenities.length>0&&<details className="text-xs text-slate-600 dark:text-slate-300">
            <summary className="cursor-pointer font-semibold">Ver comodidades já cadastradas</summary>
            <p className="mt-2">{amenities.join(' · ')}</p>
          </details>}
          {!subjectReady&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            Falta cidade, UF ou metragem adequada ao tipo do imóvel. Corrija a informação no cadastro antes de iniciar.
          </div>}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={busy||!subjectReady} isLoading={busy}
              onClick={()=>void prepareAssessment(true)} rightIcon={<ChevronRight className="h-4 w-4"/>}>
              Iniciar nova avaliação
            </Button>
            {selected&&<Button variant="outline" disabled={busy} onClick={()=>void prepareAssessment(false)}>
              Continuar avaliação anterior
            </Button>}
          </div>
          <p className={muted}>O preço anunciado não participa do cálculo de mercado. Para corrigir o imóvel, utilize as etapas anteriores do cadastro.</p>
        </CardContent>
      </Card>
      {loading?<p className={muted}>Carregando avaliações...</p>:
      history.length>0&&<Card><CardHeader><CardTitle>Histórico privado</CardTitle>
        <CardDescription>As avaliações anteriores são preservadas para consulta.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {history.map(item=><button type="button" key={item.id} onClick={()=>setSelectedId(item.id)}
            className={'rounded-xl border px-3 py-2 text-xs font-semibold '+(selectedId===item.id?
              'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/30':
              'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')} · {item.status==='draft'?'Rascunho':item.status==='archived'?'Arquivada':'Em revisão'}
          </button>)}
        </CardContent></Card>}
    </div>}

    {phase==='sources'&&<Card className="animate-in fade-in">
      <CardHeader><CardTitle>Vamos pesquisar imóveis semelhantes</CardTitle>
        <CardDescription>Escolha os portais. A pesquisa utilizará automaticamente as informações cadastradas do seu imóvel, sem mapa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROVIDERS.map(provider=><label key={provider.id}
            className={'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-semibold transition-colors '+
              (sources.includes(provider.id)?'border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20':
                'border-slate-200 dark:border-slate-700')}>
            <input type="checkbox" checked={sources.includes(provider.id)}
              onChange={()=>toggleSource(provider.id)} className="h-4 w-4 accent-rose-500"/>
            {provider.label}
          </label>)}
        </div>
        {sources.includes('imovelweb.com.br')&&<label className={textLabel}>
          URL pública de resultados do Imovelweb
          <input type="url" value={imovelwebUrl} onChange={e=>setImovelwebUrl(e.target.value)}
            className={inputClass+' mt-1'} placeholder="https://www.imovelweb.com.br/...html"/>
        </label>}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <Info className="h-4 w-4 shrink-0 text-amber-700"/>
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {sources.length} fonte(s) selecionada(s): até {sources.length} consulta(s) pagas à GeckoAPI, uma página por portal.
            Uma confirmação será solicitada antes da pesquisa. A disponibilidade e o consumo de créditos dependem do provedor.
          </p>
        </div>
        <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Settings2 className="h-4 w-4"/> Entender os filtros automáticos e as opções avançadas
          </summary>
          <p className={'mt-2 '+muted}>Cidade, UF, tipologia e finalidade são extraídas do imóvel cadastrado.
            As fontes têm filtros diferentes. A seleção final depende da triagem dos dados retornados;
            não se presume que o portal entregou todas as ofertas existentes.</p>
          <p className={'mt-2 '+muted}>A pesquisa usa uma página por fonte nesta etapa. Paginação ampliada e importação de CSV continuam recursos técnicos opcionais do laboratório, não do fluxo principal.</p>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={()=>setPhase('subject')} leftIcon={<ChevronLeft className="h-4 w-4"/>}>Voltar</Button>
          <Button variant="primary" disabled={busy||sources.length===0} isLoading={busy}
            onClick={()=>void research()} leftIcon={<Search className="h-4 w-4"/>}>Pesquisar mercado</Button>
          <Button variant="ghost" disabled={busy} onClick={()=>setPhase('analysis')}>Ver anúncios já salvos</Button>
        </div>
        {sourceStates.length>0&&<div aria-live="polite" className="space-y-2">
          {sourceStates.map(x=><div key={x.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{PROVIDERS.find(p=>p.id===x.id)?.label||x.id}</span>
            <span className="text-slate-500">{x.state==='running'?'Consultando...':
              x.state==='done'?x.accepted+' salvos · '+x.skipped+' incompletos':
              x.state==='error'?x.message:
              x.state==='skipped'?'Não consultado':'Aguardando'}</span>
          </div>)}
        </div>}
      </CardContent>
    </Card>}

    {phase==='analysis'&&<div className="space-y-4 animate-in fade-in">
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Limpeza automática da amostra</h4>
        <p className={muted}>Os anúncios são avaliados sem seleção individual. Você pode excluir ofertas, revisar pendências e conferir cada motivo.</p>
      </div>
      {searchNotice&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{searchNotice}</div>}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['included','Aproveitados'],['pending','Conferência'],['excluded','Excluídos']
        ].map(([key,label])=><button type="button" key={key}
          onClick={()=>{setTriageFilter(key as 'included'|'pending'|'excluded');setVisibleCount(20);}}
          className={'rounded-2xl border p-3 text-center transition-colors '+(triageFilter===key?'border-rose-500 ring-1 ring-rose-500/20':'border-slate-200 dark:border-slate-700')}>
          <strong className="block text-xl font-extrabold text-slate-900 dark:text-white">
            {indicator?.counts[key as keyof typeof indicator.counts]??0}</strong>
          <span className="text-[11px] text-slate-500">{label}</span>
        </button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="text-xs font-semibold text-rose-600" onClick={()=>{setTriageFilter('all');setVisibleCount(20);}}>
          Ver todos os anúncios ({comparables.length})
        </button>
        <Button size="xs" variant="outline" onClick={()=>setShowManual(v=>!v)}
          leftIcon={<Plus className="h-3.5 w-3.5"/>}>Adicionar anúncio manualmente</Button>
      </div>
      {showManual&&<Card><CardHeader><CardTitle className="text-sm">Comparável adicional</CardTitle>
        <CardDescription>Recurso opcional. Utilize apenas links verificáveis.</CardDescription></CardHeader>
        <CardContent><form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={e=>void saveManual(e)}>
          <label className={textLabel}>Fonte / anunciante<input required value={manualSource} onChange={e=>setManualSource(e.target.value)} className={inputClass+' mt-1'}/></label>
          <label className={textLabel}>Preço anunciado (R$)<input required type="number" min="1" value={manualPrice} onChange={e=>setManualPrice(e.target.value)} className={inputClass+' mt-1'}/></label>
          <label className={textLabel+' sm:col-span-2'}>Link HTTPS<input required type="url" value={manualUrl} onChange={e=>setManualUrl(e.target.value)} className={inputClass+' mt-1'}/></label>
          <label className={textLabel}>Cidade<input required value={manualCity} onChange={e=>setManualCity(e.target.value)} className={inputClass+' mt-1'}/></label>
          <label className={textLabel}>UF<input required maxLength={2} value={manualState} onChange={e=>setManualState(e.target.value.toUpperCase())} className={inputClass+' mt-1'}/></label>
          <label className={textLabel}>Área útil (m²), se confirmada<input type="number" min="0" value={manualArea} onChange={e=>setManualArea(e.target.value)} className={inputClass+' mt-1'}/></label>
          <div className="flex items-end"><Button variant="primary" type="submit" disabled={busy} isLoading={busy}>Salvar comparável</Button></div>
        </form></CardContent>
      </Card>}
      {!shown.length?<Card><CardContent className="py-6 text-center">
        <ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-400"/>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhum anúncio nesta categoria.</p>
        <p className={muted}>Você pode ampliar as fontes da pesquisa ou conferir os anúncios de outras categorias.</p>
      </CardContent></Card>:shown.map(decision=>{
        const c=decision.item as ValuationComparable;
        return <Card key={c.id} className="overflow-visible">
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <strong className="block text-sm text-slate-900 dark:text-white">{c.listing_title||c.source_name}</strong>
                <p className={muted}>{c.source_name} · {c.listing_city||'Município não confirmado'}{c.listing_neighborhood?' · '+c.listing_neighborhood:''}</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{money(Number(c.asking_price))}</p>
                <p className={muted}>Útil: {area(c.usable_area)} · Total: {area(c.total_area)}</p>
              </div>
              <span className={'inline-flex rounded-lg border px-2 py-1 text-[11px] font-bold '+toneStatus[decision.status]}>
                {labelStatus[decision.status]}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{decision.reason}</p>
            {decision.warnings?.length>0&&<p className={muted}>{decision.warnings.join(' · ')}</p>}
            {c.notes?.includes('Indícios textuais não confirmados:')&&
              <p className={muted}>{c.notes.split('Indícios textuais não confirmados:')[1]?.split('\n')[0]}</p>}
            {c.excluded_by_broker&&<p className={muted}>Decisão do corretor: {c.exclusion_reason}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <a href={c.listing_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">Anúncio original <ArrowUpRight className="h-3 w-3"/></a>
              <Button size="xs" variant="outline" disabled={busy}
                onClick={()=>{setExcludeId(null);openReview(c);}}>Conferir dados</Button>
              {c.excluded_by_broker?
                <Button size="xs" variant="secondary" disabled={busy}
                  onClick={()=>void changeExclusion(c,false)}>Reconsiderar</Button>:
                <Button size="xs" variant="ghost" disabled={busy}
                  onClick={()=>{setExcludeId(c.id);setExcludeReason('');setEditId(null);}}>Excluir da análise</Button>}
            </div>
            {excludeId===c.id&&<div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <label className={textLabel}>Motivo da exclusão manual
                <input value={excludeReason} onChange={e=>setExcludeReason(e.target.value)} maxLength={500}
                  placeholder="Ex.: localização ou padrão construtivo incompatível" className={inputClass+' mt-1'}/></label>
              <div className="flex gap-2">
                <Button size="xs" variant="danger" disabled={busy||excludeReason.trim().length<8}
                  onClick={()=>void changeExclusion(c,true)}>Confirmar exclusão</Button>
                <Button size="xs" variant="outline" onClick={()=>setExcludeId(null)}>Cancelar</Button>
              </div>
            </div>}
            {editId===c.id&&<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Conferência assistida · dados do anúncio</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  ['asking_price','Preço pedido (R$)'],['usable_area','Área útil (m²)'],
                  ['total_area','Área total (m²)'],['built_area','Área construída (m²)'],
                  ['bedrooms','Dormitórios'],['bathrooms','Banheiros'],
                  ['listing_city','Cidade'],['listing_state','UF']
                ] as const).map(([key,label])=><label key={key} className={textLabel}>{label}
                  <input value={reviewDraft[key]} onChange={e=>setReviewDraft(prev=>({...prev,[key]:e.target.value}))}
                    type={['listing_city','listing_state'].includes(key)?'text':'number'}
                    min={['listing_city','listing_state'].includes(key)?undefined:0}
                    className={inputClass+' mt-1'}/></label>)}
                <label className={textLabel+' sm:col-span-2'}>Tipologia conferida
                  <select value={reviewDraft.property_type}
                    onChange={e=>setReviewDraft(prev=>({...prev,property_type:e.target.value}))}
                    className={inputClass+' mt-1'}>
                    {[['house','Casa'],['condo_house','Casa em condomínio'],['apartment','Apartamento'],
                      ['land','Terreno'],['farm','Chácara/fazenda'],['commercial','Comercial'],
                      ['unknown','Não identificada']].map(([value,label])=>
                        <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label className={textLabel}>O que você conferiu e em qual evidência?
                <textarea rows={2} value={reviewDraft.notes}
                  onChange={e=>setReviewDraft(prev=>({...prev,notes:e.target.value}))}
                  maxLength={500} className={inputClass+' mt-1'}
                  placeholder="Ex.: dados conferidos no anúncio original. A área privativa consta expressamente..."/>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" isLoading={busy} disabled={busy} onClick={()=>void saveReview(c)}>
                  Salvar e voltar à lista</Button>
                <Button size="sm" variant="outline" onClick={()=>setEditId(null)}>Cancelar</Button>
              </div>
            </div>}
          </CardContent>
        </Card>;
      })}
      {options.length>visibleCount&&<Button variant="outline" onClick={()=>setVisibleCount(c=>c+20)}>
        Mostrar mais ({shown.length} de {options.length})
      </Button>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={()=>setPhase('sources')} leftIcon={<ChevronLeft className="h-4 w-4"/>}>Voltar às fontes</Button>
        <Button variant="primary" onClick={()=>setPhase('result')} rightIcon={<ChevronRight className="h-4 w-4"/>}>Ver resultado</Button>
      </div>
    </div>}

    {phase==='result'&&<div className="space-y-4 animate-in fade-in">
      <Card>
        <CardHeader><CardTitle>Indicativo de valor de mercado</CardTitle>
          <CardDescription>Estimativa preliminar baseada em ofertas qualificadas para a pesquisa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {indicator?.ready&&Number.isFinite(indicator.value)?<>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valor indicativo (não é PTAM)</p>
            <p className="font-['Outfit'] text-3xl font-extrabold tracking-tight text-rose-600 sm:text-4xl">{money(Math.round(indicator.value/1000)*1000)}</p>
            <p className={muted}>Mediana das ofertas: {money(indicator.pricePerSqm)}/m² × {area(indicator.basis.referenceArea)}</p>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <div><span className="text-xs text-slate-500">Faixa inferior observada</span>
                <strong className="block text-base text-slate-900 dark:text-white">{money(indicator.low)}</strong></div>
              <div><span className="text-xs text-slate-500">Faixa superior observada</span>
                <strong className="block text-base text-slate-900 dark:text-white">{money(indicator.high)}</strong></div>
            </div>
          </>:<div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Ainda não há amostra suficiente para calcular.</p>
            <p className={muted}>São necessárias pelo menos duas ofertas com preço, tipologia, finalidade e metragem comparável identificados.</p>
          </div>}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Aproveitados',indicator?.counts.included||0],
              ['Conferência',indicator?.counts.pending||0],
              ['Excluídos',indicator?.counts.excluded||0]
            ].map(([label,value])=><div key={String(label)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <strong className="block text-lg text-slate-900 dark:text-white">{value}</strong>
              <span className="text-[11px] text-slate-500">{label}</span>
            </div>)}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <ShieldCheck className="mr-1 inline h-4 w-4"/>
            Este indicador utiliza preços anunciados, sem homogeneização técnica, vistoria ou validação de transações. Não constitui PTAM.
          </div>
          <details className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">Como este número foi calculado e quais são as limitações</summary>
            <div className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">
              <p>Critério: mediana do preço pedido por m² de anúncios aproveitados, multiplicada pela área de referência da mesma natureza.</p>
              <p>Os extremos indicam a faixa de preços observada na amostra ajustada pela área, não um intervalo estatístico de confiança.</p>
              {indicator?.caveats.map(text=><p key={text}>• {text}</p>)}
            </div>
          </details>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={()=>setPhase('analysis')} leftIcon={<ChevronLeft className="h-4 w-4"/>}>Revisar anúncios</Button>
        <Button variant="primary" onClick={()=>setPhase('dossier')} rightIcon={<ChevronRight className="h-4 w-4"/>}>Próxima etapa</Button>
      </div>
    </div>}

    {phase==='dossier'&&<Card className="animate-in fade-in">
      <CardHeader><CardTitle>Preparação do dossiê técnico</CardTitle>
        <CardDescription>O parecer formal será uma etapa posterior à qualificação da amostra e ao tratamento técnico.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          ['Cadastro de referência e características','Dados provenientes do anúncio vinculado'],
          ['Fontes e comparáveis consultados','Registrados no histórico privado da avaliação'],
          ['Justificativas de seleção e exclusão','Mantidas junto aos comparáveis'],
          ['Tratamento técnico e memória de cálculo','Ainda não disponível para emissão de PTAM'],
          ['Revisão e assinatura profissional','A implementar após a validação metodológica']
        ].map(([name,description],i)=><div key={name} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          {i<3?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/>:
            <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"/>}
          <div><strong className="block text-xs text-slate-900 dark:text-white">{name}</strong>
            <p className={muted}>{description}</p></div>
        </div>)}
        <p className={muted}>Nenhum documento formal é emitido automaticamente. A avaliação anterior continua no histórico mesmo que o preço anunciado do imóvel seja alterado depois.</p>
        <Button variant="outline" onClick={()=>setPhase('result')} leftIcon={<ChevronLeft className="h-4 w-4"/>}>Voltar ao resultado</Button>
      </CardContent>
    </Card>}
  </section>;
};
