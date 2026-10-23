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
  addValuationComparable, createValuationForProperty,
  listValuationComparables, listValuationCandidates, addValuationCandidatesFromSearch,
  updateValuationCandidate, listValuationsForProperty, setComparableExclusion,
  updateValuationComparable, type ValuationAssessment, type ValuationComparable,
  type ValuationComparableInput, type ValuationCandidate
} from '../../lib/valuation/assessmentRepository';
import { candidateFromGecko, normalizeGeckoItem, screenOffers } from '../../lib/valuation/geckoMapping.mjs';
import { compareAssessmentSubject } from '../../lib/valuation/subjectConsistency.mjs';
import { reviewNumber as numericField, validateReview, reviewSaveError,
  savedReviewFeedback, visibleTriageEntries } from '../../lib/valuation/reviewFeedback.mjs';

// Mantém toda a experiência na oitava etapa do assistente já existente.
// Nenhum mapa, geocodificação ou segundo cadastro é apresentado aqui.
export type ValuationPhase = 'subject' | 'sources' | 'analysis' | 'result';
export interface PropertyValuationHandle {
  back: () => void;
  next: () => void;
}
export interface ValuationFlowControls {
  phase: ValuationPhase;
  primaryLabel: string;
  disabled: boolean;
  busy: boolean;
}
interface PropertyValuationStepProps {
  property: Property;
  onReturnToCadastro: () => void;
  onComplete: () => void;
  onFlowControlsChange: (controls: ValuationFlowControls) => void;
}
type Phase = ValuationPhase;
const PHASES: {id:Phase;label:string}[] = [
  {id:'subject',label:'Imóvel'}, {id:'sources',label:'Pesquisar'},
  {id:'analysis',label:'Analisar'}, {id:'result',label:'Resultado'}
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
const TYPE_LABELS:Record<string,string>={
  chacara:'Chácara',farm:'Chácara / sítio',commercial:'Comercial',
  house:'Casa',condo_house:'Casa em condomínio',apartment:'Apartamento',
  land:'Terreno',flat:'Flat',kitnet:'Kitnet',penthouse:'Cobertura'
};
const PURPOSE_LABELS:Record<string,string>={sale:'Venda',rent:'Locação',launch:'Lançamento'};
type ReviewDraft={
  listing_url:string;offer_purpose:'sale'|'rent'|'unknown';asking_price:string;usable_area:string;total_area:string;built_area:string;
  bedrooms:string;bathrooms:string;listing_city:string;listing_state:string;
  property_type:string;notes:string;
};
const emptyReview:ReviewDraft={
  listing_url:'',offer_purpose:'unknown',asking_price:'',usable_area:'',total_area:'',built_area:'',
  bedrooms:'',bathrooms:'',listing_city:'',listing_state:'',property_type:'',notes:''
};
type SourceStatus={id:string;state:'pending'|'running'|'done'|'error'|'skipped';accepted:number;skipped:number;message?:string};

export const PropertyValuationStep = React.forwardRef<PropertyValuationHandle,PropertyValuationStepProps>(
function PropertyValuationStep({property,onReturnToCadastro,onComplete,onFlowControlsChange},ref){
  const {addToast}=useApp();
  const {activeAmenities}=useCatalog();
  const [phase,setPhase]=useState<Phase>('subject');
  const [history,setHistory]=useState<ValuationAssessment[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [comparables,setComparables]=useState<ValuationComparable[]>([]);
  const [candidates,setCandidates]=useState<ValuationCandidate[]>([]);
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
  const [selectionId,setSelectionId]=useState<string|null>(null);
  const [selectionReason,setSelectionReason]=useState('');
  const [editId,setEditId]=useState<string|null>(null);
  const [reviewDraft,setReviewDraft]=useState<ReviewDraft>(emptyReview);
  const [reviewErrors,setReviewErrors]=useState<Partial<Record<keyof ReviewDraft,string>>>({});
  const [cardFeedback,setCardFeedback]=useState<{
    id:string;type:'success'|'warning'|'error';message:string
  }|null>(null);
  const [showManual,setShowManual]=useState(false);
  const [manualUrl,setManualUrl]=useState('');
  const [manualPrice,setManualPrice]=useState('');
  const [manualCity,setManualCity]=useState('');
  const [manualState,setManualState]=useState('');
  const [manualArea,setManualArea]=useState('');
  const [manualSource,setManualSource]=useState('Imobiliária');
  const [searchNotice,setSearchNotice]=useState('');
  const [creditBalance,setCreditBalance]=useState<number|null>(null);
  const [creditBefore,setCreditBefore]=useState<number|null>(null);
  const [creditAfter,setCreditAfter]=useState<number|null>(null);
  const [creditError,setCreditError]=useState('');
  const [creditLoading,setCreditLoading]=useState(false);
  const [creditApproval,setCreditApproval]=useState(false);
  const [remoteStaleChanges,setRemoteStaleChanges]=useState<
    Array<{field:string;label:string;before:string;after:string}>>([]);
  useEffect(()=>{setRemoteStaleChanges([]);},[selectedId]);
  useEffect(()=>{
    setCardFeedback(null);setReviewErrors({});setEditId(null);setSelectionId(null);setExcludeId(null);
  },[selectedId]);
  useEffect(()=>{
    if(phase==='analysis'&&cardFeedback){
      const feedback=document.getElementById('valuation-feedback-'+cardFeedback.id);
      feedback?.scrollIntoView({block:'nearest'});
      if(cardFeedback.type==='error')feedback?.focus({preventScroll:true});
    }
  },[cardFeedback,phase]);
  useEffect(()=>{
    if(creditApproval)document.getElementById('valuation-credit-confirm')?.scrollIntoView({
      behavior:'smooth',block:'center'
    });
  },[creditApproval]);
  // Valor operacional provisório: 1 crédito por consulta PLP, conforme
  // maioria da tabela GeckoAPI; a tarifa efetiva de cada portal pode variar.
  const estimatedCredits=sources.length;
  const readCredits=async()=>{
    if(!supabase)throw new Error('Saldo indisponível.');
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error('Faça login para consultar créditos.');
    const res=await fetch('/api/valuation-credits',{
      headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!Number.isFinite(Number(data.currentCredits)))
      throw new Error(String(data.error||'Saldo indisponível no momento.'));
    const amount=Number(data.currentCredits);
    setCreditBalance(amount);
    setCreditError('');
    return amount;
  };
  useEffect(()=>{
    if(phase!=='sources')return;
    let active=true;
    setCreditLoading(true);
    void readCredits().catch(e=>{
      if(active)setCreditError(e instanceof Error?e.message:'Saldo indisponível.');
    }).finally(()=>{if(active)setCreditLoading(false);});
    return()=>{active=false;};
  },[phase]);
  const selected=history.find(x=>x.id===selectedId)||null;
  const localStaleChanges=selected?compareAssessmentSubject(selected,property):[];
  const staleChanges=localStaleChanges.length?localStaleChanges:remoteStaleChanges;
  const isAssessmentStale=staleChanges.length>0;
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
    if(!selectedId){setComparables([]);setCandidates([]);return;}
    let active=true;
    void Promise.all([
      listValuationComparables(selectedId),
      listValuationCandidates(selectedId)
    ]).then(([rows,found])=>{
      if(active){setComparables(rows);setCandidates(found);}
    }).catch(()=>{if(active)setError('Não foi possível recuperar as amostras desta avaliação.');});
    return()=>{active=false;};
  },[selectedId]);

  // Candidatos incompletos também são visíveis; somente ofertas suficientes
  // entram no indicador. Dados brutos permanecem intactos e auditáveis.
  const allOffers=useMemo(()=>[
    ...comparables,
    ...candidates.map(c=>{
      const inferred=c.reviewed_by_broker?null:normalizeGeckoItem({
        ...c.captured_data,
        title:c.captured_data?.title||c.listing_title,
        url:c.captured_data?.url||c.listing_url
      },c.source_name);
      return ({
      ...c.normalized_data,
      property_type:c.normalized_data?.property_type==='unknown'&&inferred&&inferred.property_type!=='unknown'
        ?inferred?.property_type:c.normalized_data?.property_type,
      offer_purpose:c.normalized_data?.offer_purpose==='unknown'&&inferred&&inferred.offer_purpose!=='unknown'
        ?inferred?.offer_purpose:c.normalized_data?.offer_purpose,
      id:c.id,
      source_name:c.source_name,
      listing_url:c.normalized_data?.listing_url||c.listing_url||'',
      listing_title:c.normalized_data?.listing_title||c.listing_title,
      asking_price:c.normalized_data?.asking_price??null,
      excluded_by_broker:c.excluded_by_broker,
      exclusion_reason:c.exclusion_reason,
      manual_selection:c.manual_selection||null,
      reviewed_by_broker:c.reviewed_by_broker,
      notes:c.review_note
    } as unknown as ValuationComparable);
    })
  ],[comparables,candidates]);
  const indicator=useMemo(()=>selected?screenOffers(selected,allOffers):null,[selected,allOffers]);
  const options=indicator?.entries.filter(row=>triageFilter==='all'||row.status===triageFilter)||[];
  const shown=visibleTriageEntries(indicator?.entries||[],triageFilter,visibleCount,cardFeedback?.id);
  const requiredArea=['land','chacara','farm'].includes(property.type)?
    property.totalArea>0 : ['apartment','flat','kitnet','penthouse'].includes(property.type)?
    property.usefulArea>0 : property.usefulArea>0||Number(property.builtArea)>0;
  const subjectReady=Boolean(property.city&&property.state&&requiredArea);
  const currentIndex=PHASES.findIndex(p=>p.id===phase);

  const notify=(message:string)=>{
    addToast({type:'success',title:'Avaliação Inteligente',message});
  };
  const reportCardError=(id:string,message:string)=>{
    setCardFeedback({id,type:'error',message});
    addToast({type:'error',title:'Avaliação Inteligente',message});
  };
  const reportSavedDecision=(row:ValuationComparable,action:'review'|'reuse'|'restore')=>{
    if(!selected)return;
    const decision=screenOffers(selected,allOffers.map(offer=>offer.id===row.id?row:offer))
      .entries.find(entry=>entry.item.id===row.id);
    const feedback=savedReviewFeedback(decision,action);
    setCardFeedback({id:row.id,...feedback} as NonNullable<typeof cardFeedback>);
    addToast({type:feedback.type as 'success'|'warning',title:'Avaliação Inteligente',message:feedback.message});
  };
  const renderCardFeedback=(id:string)=>cardFeedback?.id===id&&
    <div id={'valuation-feedback-'+id} tabIndex={-1}
      role={cardFeedback.type==='error'?'alert':'status'}
      className={'rounded-xl border p-3 text-xs leading-relaxed '+toneStatus[
        cardFeedback.type==='error'?'excluded':cardFeedback.type==='warning'?'pending':'included'
      ]}>
      {cardFeedback.message}
    </div>;
  const prepareAssessment=async(createNew:boolean)=>{
    if(busy)return;
    setError('');setBusy(true);
    try{
      if(!subjectReady)throw new Error('Confira a cidade, o estado e a metragem pertinente na etapa 2 ou 3 do cadastro.');
      if(remoteStaleChanges.length)
        throw new Error('O cadastro mudou em outra sessão. Feche e reabra o imóvel para carregar os dados atualizados.');
      if(!createNew&&selected&&isAssessmentStale)
        throw new Error('A avaliação selecionada pertence a uma versão antiga. Crie uma nova avaliação antes de pesquisar.');
      if(createNew||!selected){
        // Preview usa o mesmo backend de produção. Não criar avaliações
        // parcialmente incompatíveis antes da migração estar aplicada.
        if(!supabase)throw new Error('O serviço privado de avaliações está indisponível.');
        const [{error:e1},{error:e2}]=await Promise.all([
          supabase.from('valuation_comparables')
            .select('id,usable_area,total_area,listing_city,excluded_by_broker').limit(0),
          supabase.from('properties').select('id,built_area').eq('id',property.id).limit(1)
        ]);
        if(e1||e2)
          throw new Error('A atualização do banco de dados da Avaliação Inteligente ainda não foi aplicada. Nenhuma avaliação nova foi criada.');

        const created=await createValuationForProperty(property);
        setHistory(previous=>[created,...previous]);
        setSelectedId(created.id);
        setComparables([]);
        setCandidates([]);
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
  const research=async(authorized=false)=>{
    if(busy)return;
    setError('');
    if(!selected){setError('Inicie a avaliação a partir do cadastro antes de pesquisar.');return;}
    if(isAssessmentStale){
      setCreditApproval(false);setPhase('subject');
      setError('Esta avaliação utiliza dados antigos. Crie uma avaliação atualizada antes de consultar os portais. Nenhum crédito foi consumido.');
      return;
    }
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
    if(!supabase){setError('O serviço de avaliações está indisponível.');return;}
    if(!authorized){
      setCreditApproval(true);
      return;
    }
    setCreditApproval(false);
    setBusy(true);
    try{
      const [{error:e1},{error:e2},{error:e3}]=await Promise.all([
        supabase.from('valuation_comparables')
          .select('id,usable_area,total_area,listing_city,offer_purpose,excluded_by_broker').limit(0),
        supabase.from('properties').select('id,built_area').eq('id',property.id).limit(1),
        supabase.from('valuation_candidates').select('id').limit(0)
      ]);
      if(e1||e2||e3)throw new Error('O armazenamento da avaliação não está atualizado. Nenhuma pesquisa paga foi realizada.');
      // Conferir saldo novamente na autorização para evitar usar um número antigo.
      const startCredits=await readCredits();
      if(startCredits<estimatedCredits)
        throw new Error('Saldo disponível insuficiente para o custo estimado. Reduza as fontes ou recarregue créditos.');
      setCreditBefore(startCredits);setCreditAfter(null);
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error('Sua sessão expirou. Entre novamente para pesquisar.');
      const values:SourceStatus[]=sources.map(id=>({id,state:'pending',accepted:0,skipped:0}));
      setSourceStates(values);
      let success=0;let total=0;let problems=0;
      let interruptedForStale=false;
      const failedMessages:string[]=[];
      const auditWarnings:string[]=[];
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
            if(response.status===409&&data.code==='ASSESSMENT_STALE'){
              interruptedForStale=true;
              setRemoteStaleChanges(Array.isArray(data.changes)?data.changes:[]);
              setError(message);
              setCreditApproval(false);
              setSourceStates(prev=>prev.map(item=>item.id===target?
                {...item,state:'error',message:'A avaliação ficou desatualizada. Nenhum crédito desta fonte foi consumido.'}:item));
              break;
            }
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
          const returned=Array.isArray(data.items)?data.items:[];
          const now=typeof data.retrievedAt==='string'?data.retrievedAt:new Date().toISOString();
          // Capturar todos, inclusive anúncios sem preço, cidade ou URL. Nunca
          // cobrar nova pesquisa para recuperar registros descartados localmente.
          const searchVerified=target!=='olx.com.br'||data.searchVerified===true;
          if(!searchVerified){
            auditWarnings.push('OLX: a URL efetivamente consultada não comprovou todos os filtros.'+
              ' Os anúncios foram preservados, porém bloqueados para o cálculo.');
          }
          const proposals=returned.map((row:unknown,index:number)=>{
            const candidate=candidateFromGecko(row,target,index,String(data.requestId||''),now);
            candidate.normalized_data={
              ...candidate.normalized_data,
              search_query_verified:searchVerified,
              search_query_issue:searchVerified?'':String(data.requestAudit?.reason||'Recorte não verificado')
            };
            candidate.captured_data={
              ...candidate.captured_data,
              searchContext:{
                requestUrl:typeof data.requestAudit?.url==='string'?data.requestAudit.url:null,
                queryStatus:String(data.requestAudit?.status||'not_applicable'),
                requestedCity:selected.city,requestedState:selected.state,
                requestedType:selected.property_type,requestId:String(data.requestId||'')
              }
            };
            return candidate;
          });
          const persisted=await addValuationCandidatesFromSearch(selected.id,proposals);
          success++;total+=persisted.saved.length;
          problems+=Number(data.limited?1:0);
          setCandidates(prev=>[...persisted.saved,...prev]);
          setSourceStates(prev=>prev.map(item=>item.id===target?
            {...item,state:'done',accepted:persisted.saved.length,skipped:0,
              message:persisted.alreadyPresent+' anúncio(s) já estavam na avaliação.'+
                (!searchVerified?' Recorte da pesquisa não confirmado; resultados bloqueados.':'')+
                (data.limited?' A fonte superou o limite de transferência desta consulta.':'')}:item));
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
      if(interruptedForStale){
        setPhase('subject');
        return;
      }
      setSearchNotice(success+' fonte(s) consultada(s); '+total+
        ' candidato(s) novos preservados, incluindo informações incompletas.'+
        (problems?' Algumas respostas excederam o limite e exigem nova paginação.':'')+
        (auditWarnings.length?' '+auditWarnings.join(' '):'')+
        (failedMessages.length?' Fontes com falha: '+failedMessages.join(', ')+'.':''));
      try{setCreditAfter(await readCredits());}
      catch{setCreditError('Não foi possível atualizar o saldo após a pesquisa.');}
      setPhase('analysis');
      if(success)notify('Pesquisa concluída. Confira a triagem automática antes de usar o indicativo.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível executar a pesquisa.');}
    finally{setBusy(false);}
  };

  const changeExclusion=async(row:ValuationComparable,exclude:boolean)=>{
    if(!selected||busy)return;
    setBusy(true);setError('');
    try{
      const candidate=candidates.find(c=>c.id===row.id);
      if(candidate){
        const changed=await updateValuationCandidate(selected.id,row.id,{
          excluded_by_broker:exclude,exclusion_reason:exclude?excludeReason.trim():''
        });
        setCandidates(prev=>prev.map(c=>c.id===changed.id?changed:c));
      }else{
        const changed=await setComparableExclusion(selected.id,row.id,exclude,exclude?excludeReason:'');
        setComparables(prev=>prev.map(c=>c.id===changed.id?changed:c));
      }
      setExcludeId(null);setExcludeReason('');
      notify(exclude?'Anúncio retirado da amostra com justificativa.':'Exclusão manual removida; critérios automáticos reaplicados.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a seleção.');}
    finally{setBusy(false);}
  };
  const changeManualSelection=async(row:ValuationComparable,include:boolean)=>{
    if(!selected||busy)return;
    if(include&&!row.reviewed_by_broker){
      setSelectionId(null);openReview(row);
      reportCardError(row.id,'Confira e salve os dados do anúncio antes de reaproveitá-lo no cálculo.');
      return;
    }
    if(include&&selectionReason.trim().length<3){
      reportCardError(row.id,'Explique por que este anúncio pode ser utilizado no cálculo (mínimo de 3 caracteres).');
      return;
    }
    setBusy(true);setError('');
    try{
      const candidate=candidates.find(c=>c.id===row.id);
      let savedOffer:ValuationComparable;
      if(candidate){
        const changed=await updateValuationCandidate(selected.id,row.id,{
          manual_selection:include?'include':null,
          excluded_by_broker:include?false:candidate.excluded_by_broker,
          exclusion_reason:include?'':candidate.exclusion_reason,
          reviewed_by_broker:include?true:candidate.reviewed_by_broker,
          review_note:include?(candidate.review_note+'\n'+new Date().toISOString()+': Reaproveitado manualmente: '+selectionReason.trim()).slice(-1500):candidate.review_note
        });
        setCandidates(prev=>prev.map(c=>c.id===changed.id?changed:c));
        savedOffer={...row,...changed.normalized_data,
          manual_selection:changed.manual_selection,
          reviewed_by_broker:changed.reviewed_by_broker,
          excluded_by_broker:changed.excluded_by_broker,exclusion_reason:changed.exclusion_reason};
      }else{
        const changed=await updateValuationComparable(selected.id,row.id,{manual_selection:include?'include':null});
        setComparables(prev=>prev.map(c=>c.id===changed.id?changed:c));
        savedOffer=changed;
      }
      setSelectionId(null);setSelectionReason('');
      reportSavedDecision(savedOffer,include?'reuse':'restore');
    }catch(e){reportCardError(row.id,reviewSaveError(e));}
    finally{setBusy(false);}
  };
  const openReview=(row:ValuationComparable)=>{
    setEditId(row.id);setExcludeId(null);setSelectionId(null);setError('');setReviewErrors({});
    setReviewDraft({
      listing_url:row.listing_url||'',
      offer_purpose:row.offer_purpose||'unknown',
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
    const candidate=candidates.find(c=>c.id===row.id);
    const validation=validateReview(reviewDraft,!candidate);
    setReviewErrors(validation);
    if(Object.keys(validation).length){
      reportCardError(row.id,'Não foi possível salvar. Confira os campos destacados; os dados preenchidos foram mantidos.');
      return;
    }
    setBusy(true);setError('');
    try{
      let savedOffer:ValuationComparable;
      const dataChecked={
        asking_price:numericField(reviewDraft.asking_price),
        usable_area:numericField(reviewDraft.usable_area),
        total_area:numericField(reviewDraft.total_area),
        built_area:numericField(reviewDraft.built_area),
        bedrooms:numericField(reviewDraft.bedrooms),
        bathrooms:numericField(reviewDraft.bathrooms),
        listing_city:reviewDraft.listing_city.trim().slice(0,120),
        listing_state:reviewDraft.listing_state.trim().toUpperCase().slice(0,2),
        property_type:reviewDraft.property_type,
        offer_purpose:reviewDraft.offer_purpose,
        listing_url:reviewDraft.listing_url.trim()
      };
      if(candidate){
        const changed=await updateValuationCandidate(selected.id,row.id,{
          listing_url:dataChecked.listing_url||null,
          normalized_data:{...candidate.normalized_data,...dataChecked},
          reviewed_by_broker:true,
          review_note:(candidate.review_note+(reviewDraft.notes.trim()?'\n'+new Date().toISOString()+
            ': '+reviewDraft.notes.trim():'')).slice(-1500)
        });
        setCandidates(prev=>prev.map(c=>c.id===changed.id?changed:c));
        savedOffer={...row,...changed.normalized_data,
          listing_url:changed.listing_url||'',manual_selection:changed.manual_selection,
          reviewed_by_broker:changed.reviewed_by_broker,
          excluded_by_broker:changed.excluded_by_broker,exclusion_reason:changed.exclusion_reason};
      }else{
        const changed=await updateValuationComparable(selected.id,row.id,{
          ...dataChecked,asking_price:dataChecked.asking_price,
          reviewed_by_broker:true,
          notes:(row.notes+(reviewDraft.notes.trim()?'\nConferência '+new Date().toISOString()+
            ': '+reviewDraft.notes.trim():'')).slice(-3000)
        });
        setComparables(prev=>prev.map(c=>c.id===changed.id?changed:c));
        savedOffer=changed;
      }
      setEditId(null);setReviewDraft(emptyReview);
      reportSavedDecision(savedOffer,'review');
    }catch(e){reportCardError(row.id,reviewSaveError(e));}
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

  // Um único conjunto de botões, no rodapé já existente do cadastro.
  React.useImperativeHandle(ref, () => ({
    back: () => {
      if (busy) return;
      if (phase === 'subject') onReturnToCadastro();
      else setPhase(PHASES[Math.max(0, currentIndex - 1)].id);
    },
    next: () => {
      if (busy || loading) return;
      if (phase === 'subject') {
        if(remoteStaleChanges.length)onReturnToCadastro();
        else void prepareAssessment(!selected||isAssessmentStale);
      } else if (phase === 'sources') {
        void research();
      } else if (phase === 'analysis') {
        setPhase('result');
      } else {
        onComplete();
      }
    }
  }));

  useEffect(() => {
    const primaryLabel = phase === 'subject'
      ? remoteStaleChanges.length?'Voltar ao cadastro':
        isAssessmentStale?'Criar avaliação atualizada':
        selected?'Continuar avaliação':'Iniciar avaliação'
      : phase === 'sources' ? 'Pesquisar mercado'
      : phase === 'analysis' ? 'Ver resultado' : 'Concluir / Fechar';
    onFlowControlsChange({
      phase, primaryLabel, busy,
      disabled: busy || loading ||
        (phase === 'subject' && !subjectReady) ||
        (phase === 'sources' && (sources.length === 0 || isAssessmentStale))
    });
  }, [phase, selectedId, busy, loading, subjectReady, sources.length,
    isAssessmentStale, remoteStaleChanges.length, onFlowControlsChange]);

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
          {isAssessmentStale&&selected&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/25 space-y-2" role="alert">
            <strong className="block text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="mr-2 inline h-4 w-4"/>Avaliação anterior desatualizada
            </strong>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              A avaliação selecionada foi criada com outros dados. Ela e seus anúncios continuarão no histórico,
              mas novas pesquisas exigem uma avaliação atualizada.
            </p>
            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-200">
              {staleChanges.map(change=><p key={String(change.field)}>
                <strong>{change.label}:</strong> {change.before} → {change.after}
              </p>)}
            </div>
            {remoteStaleChanges.length>0&&<p className="text-xs font-semibold text-amber-800">
              O cadastro mudou em outra sessão; feche e reabra o anúncio após conferir as alterações.
            </p>}
          </div>}
          {selected&&<div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy||!subjectReady||remoteStaleChanges.length>0}
              onClick={()=>void prepareAssessment(true)}>
              {isAssessmentStale?'Criar avaliação atualizada':'Criar nova avaliação (preservar a anterior)'}
            </Button>
          </div>}
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
            {compareAssessmentSubject(item,property).length>0?' · Dados antigos':''}
          </button>)}
        </CardContent></Card>}
    </div>}

    {phase==='sources'&&<Card className="animate-in fade-in">
      <CardHeader><CardTitle>Vamos pesquisar imóveis semelhantes</CardTitle>
        <CardDescription>Confira o recorte da pesquisa antes de autorizar qualquer consumo de créditos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pesquisar ofertas para</p>
          <strong className="mt-1 block text-sm text-slate-900 dark:text-white">
            {TYPE_LABELS[selected?.property_type||'']||selected?.property_type||'Imóvel'} ·
            {' '}{PURPOSE_LABELS[String(selected?.property_snapshot?.purpose||'')]||
            String(selected?.property_snapshot?.purpose||'Finalidade não confirmada')}
          </strong>
          <p className={muted}>{selected?.city||'Cidade não informada'}/{selected?.state||'UF não informada'} ·
            {' '}{selected?.neighborhood||'Bairro não informado'}</p>
        </div>
        {isAssessmentStale&&<p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Os dados desta avaliação estão desatualizados. Volte à primeira tela e crie uma avaliação atualizada antes de pesquisar.
        </p>}
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
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 space-y-2">
          <strong className="block text-sm text-slate-900 dark:text-white">Créditos da pesquisa</strong>
          <div className="flex justify-between text-xs">
            <span>Saldo disponível da integração</span>
            <strong>{creditLoading?'Consultando...':creditBalance!==null?creditBalance:'Indisponível'}</strong>
          </div>
          <div className="flex justify-between text-xs">
            <span>Custo estimado · {sources.length} fonte(s)</span>
            <strong>{estimatedCredits} crédito(s)</strong>
          </div>
          <div className="flex justify-between text-xs">
            <span>Saldo previsto</span>
            <strong>{creditBalance!==null?Math.max(0,creditBalance-estimatedCredits):'A consultar'}</strong>
          </div>
          <p className={muted}>Saldo compartilhado da conta GeckoAPI, não uma carteira individual do corretor.
            Os valores são estimados; a tarifa real pode variar por portal. O saldo final será consultado após a pesquisa.</p>
          {creditError&&<p role="alert" className="text-xs text-amber-600">{creditError}</p>}
          {creditAfter!==null&&creditBefore!==null&&
            <p className="text-xs text-emerald-600">Saldo após a pesquisa: {creditAfter} · variação na conta compartilhada: {creditBefore-creditAfter} crédito(s).</p>}
          <Button size="xs" variant="outline" disabled={creditLoading}
            onClick={()=>{setCreditLoading(true);void readCredits().catch(e=>setCreditError(String(e.message||e)))
              .finally(()=>setCreditLoading(false));}}>Atualizar saldo</Button>
        </div>
        {creditApproval&&<div id="valuation-credit-confirm" className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/20" role="group" aria-label="Autorizar pesquisa">
          <strong className="text-sm text-slate-900 dark:text-white">Confirmar pesquisa de mercado</strong>
          <p className="text-xs text-slate-700 dark:text-slate-200">
            Consultar {sources.length} fonte(s) para
            {' '}{TYPE_LABELS[selected?.property_type||'']||selected?.property_type||'imóvel'} em
            {' '}{selected?.city}/{selected?.state},
            finalidade {PURPOSE_LABELS[String(selected?.property_snapshot?.purpose||'')]||'não confirmada'}.
            Custo estimado de {estimatedCredits} crédito(s) da conta compartilhada da GeckoAPI.
          </p>
          <p className={muted}>O valor final dependerá da tarifa cobrada por cada fonte. Os anúncios retornados serão preservados, mesmo que precisem de conferência.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy||isAssessmentStale||creditLoading||creditBalance===null||creditBalance<estimatedCredits}
              onClick={()=>void research(true)}>Confirmar e pesquisar</Button>
            <Button variant="outline" size="sm" disabled={busy}
              onClick={()=>setCreditApproval(false)}>Cancelar</Button>
          </div>
        </div>}
        <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Settings2 className="h-4 w-4"/> Entender os filtros automáticos e as opções avançadas
          </summary>
          <p className={'mt-2 '+muted}>Cidade, UF, tipologia e finalidade são extraídas do imóvel cadastrado.
            As fontes têm filtros diferentes. A seleção final depende da triagem dos dados retornados;
            não se presume que o portal entregou todas as ofertas existentes.</p>
          <p className={'mt-2 '+muted}>A pesquisa utiliza uma página por fonte. Os anúncios incompletos são preservados e podem ser conferidos sem repetir a consulta.</p>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" disabled={busy} onClick={()=>setPhase('analysis')}>
            Ver anúncios salvos sem nova consulta
          </Button>
        </div>
        {sourceStates.length>0&&<div aria-live="polite" className="space-y-2">
          {sourceStates.map(x=><div key={x.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{PROVIDERS.find(p=>p.id===x.id)?.label||x.id}</span>
            <span className="text-slate-500">{x.state==='running'?'Consultando...':
              x.state==='done'?x.accepted+' candidatos preservados':
              x.state==='error'?x.message:
              x.state==='skipped'?'Não consultado':'Aguardando'}</span>
          </div>)}
        </div>}
      </CardContent>
    </Card>}

    {phase==='analysis'&&<div className="space-y-4 animate-in fade-in">
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Limpeza automática da amostra</h4>
        <p className={muted}>A triagem automática mantém os critérios atuais. Você pode revisar pendências, conferir cada motivo e decidir manualmente se deseja reaproveitar um anúncio.</p>
      </div>
      {searchNotice&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{searchNotice}</div>}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['included','Aproveitados'],['pending','Conferência'],['excluded','Excluídos']
        ].map(([key,label])=><button type="button" key={key}
          disabled={busy}
          onClick={()=>{setTriageFilter(key as 'included'|'pending'|'excluded');setVisibleCount(20);setCardFeedback(null);}}
          className={'rounded-2xl border p-3 text-center transition-colors '+(triageFilter===key?'border-rose-500 ring-1 ring-rose-500/20':'border-slate-200 dark:border-slate-700')}>
          <strong className="block text-xl font-extrabold text-slate-900 dark:text-white">
            {indicator?.counts[key as keyof typeof indicator.counts]??0}</strong>
          <span className="text-[11px] text-slate-500">{label}</span>
        </button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={busy} className="text-xs font-semibold text-rose-600" onClick={()=>{setTriageFilter('all');setVisibleCount(20);setCardFeedback(null);}}>
          Ver todos os anúncios ({allOffers.length})
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
            {triageFilter!=='all'&&decision.status!==triageFilter&&
              <p className={muted}>Anúncio recém-alterado, mantido visível até você trocar de filtro. Ele já está contabilizado na nova classificação.</p>}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <strong className="block text-sm text-slate-900 dark:text-white">{c.listing_title||c.source_name}</strong>
                <p className={muted}>{c.source_name} · {c.listing_city||'Município não confirmado'}{c.listing_neighborhood?' · '+c.listing_neighborhood:''}</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{Number(c.asking_price)>0?money(Number(c.asking_price)):'Preço não informado'}</p>
                <p className={muted}>Útil: {area(c.usable_area)} · Total: {area(c.total_area)}</p>
              </div>
              <span className={'inline-flex rounded-lg border px-2 py-1 text-[11px] font-bold '+toneStatus[decision.status]}>
                {labelStatus[decision.status]}</span>
            </div>
            {decision.reasons?.length>1?
              <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {decision.reasons.map((reason:string,i:number)=><li key={i}>{reason}</li>)}
              </ul>:
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{decision.reason}</p>}
            {candidates.some(row=>row.id===c.id)&&
              <details className="rounded-xl bg-slate-50 p-2 text-xs dark:bg-slate-800">
                <summary className="cursor-pointer font-semibold">Dados originais recebidos da fonte</summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-slate-500">
                  {JSON.stringify(candidates.find(row=>row.id===c.id)?.captured_data,null,2)}
                </p>
              </details>}
            {decision.warnings?.length>0&&<p className={muted}>{decision.warnings.join(' · ')}</p>}
            {c.notes?.includes('Indícios textuais não confirmados:')&&
              <p className={muted}>{c.notes.split('Indícios textuais não confirmados:')[1]?.split('\n')[0]}</p>}
            {c.excluded_by_broker&&<p className={muted}>Decisão do corretor: {c.exclusion_reason}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {c.listing_url&&<a href={c.listing_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                Anúncio original <ArrowUpRight className="h-3 w-3"/></a>}
              <Button size="xs" variant="outline" disabled={busy}
                onClick={()=>{setExcludeId(null);openReview(c);}}>Conferir dados</Button>
              {c.manual_selection==='include'?
                <Button size="xs" variant="secondary" disabled={busy}
                  onClick={()=>void changeManualSelection(c,false)}>Restaurar triagem automática</Button>:
                (decision.status==='excluded'||decision.status==='pending')&&
                <Button size="xs" variant="primary" disabled={busy}
                  onClick={()=>{setSelectionId(c.id);setSelectionReason('');setExcludeId(null);setEditId(null);setReviewErrors({});}}>Reaproveitar no cálculo</Button>}
              {c.excluded_by_broker?
                <Button size="xs" variant="secondary" disabled={busy}
                  onClick={()=>void changeExclusion(c,false)}>Reconsiderar</Button>:
                <Button size="xs" variant="ghost" disabled={busy}
                  onClick={()=>{setExcludeId(c.id);setExcludeReason('');setEditId(null);}}>Excluir da análise</Button>}
            </div>
            {editId!==c.id&&renderCardFeedback(c.id)}
            {selectionId===c.id&&c.manual_selection!=='include'&&<div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="text-xs text-emerald-800 dark:text-emerald-300">A triagem automática será preservada. Esta decisão apenas autoriza o uso deste anúncio no cálculo, sem inventar dados ausentes.</p>
              <label className={textLabel}>Justificativa da decisão manual
                <input disabled={busy} value={selectionReason} onChange={e=>setSelectionReason(e.target.value)} maxLength={500}
                  placeholder="Ex.: terreno, construção e localização são comparáveis" className={inputClass+' mt-1'}/></label>
              <p className={muted}>Justificativa obrigatória: mínimo de 3 caracteres. Dados essenciais ainda precisam estar confirmados.</p>
              <div className="flex gap-2">
                <Button size="xs" variant="primary" isLoading={busy} disabled={busy||selectionReason.trim().length<3}
                  onClick={()=>void changeManualSelection(c,true)}>Confirmar reaproveitamento</Button>
                <Button size="xs" variant="outline" disabled={busy} onClick={()=>setSelectionId(null)}>Cancelar</Button>
              </div>
            </div>}
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
            {editId===c.id&&<fieldset disabled={busy} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Conferência assistida · dados do anúncio</p>
              <label className={textLabel}>URL do anúncio (se disponível)
                <input value={reviewDraft.listing_url}
                  aria-invalid={Boolean(reviewErrors.listing_url)}
                  aria-describedby={reviewErrors.listing_url?'valuation-url-error-'+c.id:undefined}
                  onChange={e=>setReviewDraft(prev=>({...prev,listing_url:e.target.value}))}
                  className={inputClass+' mt-1'} placeholder="https://..."/>
                {reviewErrors.listing_url&&<span id={'valuation-url-error-'+c.id} className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{reviewErrors.listing_url}</span>}
              </label>
              <label className={textLabel}>Finalidade anunciada (confirme no anúncio)
                <select className={inputClass+' mt-1'} value={reviewDraft.offer_purpose}
                  onChange={e=>setReviewDraft(prev=>({...prev,offer_purpose:e.target.value as ReviewDraft['offer_purpose']}))}>
                  <option value="unknown">Não confirmada</option>
                  <option value="sale">Venda</option>
                  <option value="rent">Locação</option>
                </select>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  ['asking_price','Preço pedido (R$)'],['usable_area','Área útil (m²)'],
                  ['total_area','Área total (m²)'],['built_area','Área construída (m²)'],
                  ['bedrooms','Dormitórios'],['bathrooms','Banheiros'],
                  ['listing_city','Cidade'],['listing_state','UF']
                ] as const).map(([key,label])=><label key={key} className={textLabel}>{label}
                  <input value={reviewDraft[key]} onChange={e=>setReviewDraft(prev=>({...prev,[key]:e.target.value}))}
                    aria-invalid={Boolean(reviewErrors[key])}
                    aria-describedby={reviewErrors[key]?'valuation-field-error-'+c.id+'-'+key:undefined}
                    type={['listing_city','listing_state'].includes(key)?'text':'number'}
                    min={['listing_city','listing_state'].includes(key)?undefined:0}
                    step={['bedrooms','bathrooms'].includes(key)?1:'any'}
                    className={inputClass+' mt-1'}/>
                  {reviewErrors[key]&&<span id={'valuation-field-error-'+c.id+'-'+key} className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{reviewErrors[key]}</span>}
                </label>)}
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
              <label className={textLabel}>Observações da conferência (opcional)
                <textarea rows={2} value={reviewDraft.notes}
                  onChange={e=>setReviewDraft(prev=>({...prev,notes:e.target.value}))}
                  maxLength={500} className={inputClass+' mt-1'}
                  placeholder="Ex.: dados conferidos no anúncio original. A área privativa consta expressamente..."/>
              </label>
              {renderCardFeedback(c.id)}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" isLoading={busy} disabled={busy} onClick={()=>void saveReview(c)}>
                  Salvar e voltar à lista</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={()=>{setEditId(null);setReviewErrors({});setCardFeedback(null);}}>Cancelar</Button>
              </div>
            </fieldset>}
          </CardContent>
        </Card>;
      })}
      {options.length>visibleCount&&<Button variant="outline" onClick={()=>setVisibleCount(c=>c+20)}>
        Mostrar mais ({shown.length} de {options.length})
      </Button>}
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
    </div>}

    {phase==='result'&&<details className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
      <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
        <FileCheck2 className="mr-2 inline h-4 w-4"/> Preparação do dossiê técnico (futuro)
      </summary>
      <p className={muted+' mt-2'}>
        Cadastro, fontes, exclusões e memória de cálculo formarão um dossiê revisável.
        A emissão de PTAM, a homogeneização técnica e a assinatura profissional ainda não estão disponíveis.
      </p>
    </details>}

  </section>;
});
