import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,CheckCircle2,Clock3,CreditCard,ExternalLink,Loader2,RefreshCw,ShieldCheck} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {CommercialPlan,CommercialPlanTier,formatPlanPrice,loadCommercialPlans,planHighlights} from '../lib/commercialPlans';
import {clearBillingNavigationParams,CommercialCheckoutSummary,CommercialSubscriptionSummary,getSelectedCommercialPlan,loadMyCommercialBilling,startAsaasCheckout} from '../lib/commercialBilling';

const statusCopy:Record<string,string>={
  active:'Ativo',pending:'Aguardando confirmação',past_due:'Pagamento em atraso',suspended:'Suspenso',canceled:'Cancelado',expired:'Expirado',
  creating:'Preparando pagamento',paid:'Pago',failed:'Pagamento não iniciado'
};

export const PlanCheckoutView:React.FC=()=>{
  const{setCurrentView,addToast}=useApp();
  const[plans,setPlans]=useState<CommercialPlan[]>([]);
  const[selected,setSelected]=useState<CommercialPlanTier|null>(null);
  const[subscription,setSubscription]=useState<CommercialSubscriptionSummary|null>(null);
  const[checkout,setCheckout]=useState<CommercialCheckoutSummary|null>(null);
  const[loading,setLoading]=useState(true);
  const[starting,setStarting]=useState(false);
  const [callbackStatus]=useState(()=>new URLSearchParams(window.location.search).get('billing'));

  const refresh=async()=>{
    setLoading(true);
    try{
      const[available,tier,billing]=await Promise.all([loadCommercialPlans(),getSelectedCommercialPlan(),loadMyCommercialBilling()]);
      setPlans(available);setSelected(tier || available[0]?.tier || null);setSubscription(billing.subscription);setCheckout(billing.checkout);
      window.dispatchEvent(new Event('webimoveis_billing_refreshed'));
    }catch{addToast({type:'error',title:'Cobrança não carregada',message:'Não foi possível consultar sua assinatura agora.'});}
    finally{setLoading(false);}
  };
  useEffect(()=>{clearBillingNavigationParams();void refresh();},[]);
  useEffect(()=>{
    if(callbackStatus==='success')addToast({type:'info',title:'Pagamento enviado para confirmação',message:'Seu plano será ativado assim que o pagamento for confirmado.'});
    if(callbackStatus==='canceled')addToast({type:'warning',title:'Pagamento cancelado',message:'Nenhuma ativação foi realizada. Você pode retomar quando quiser.'});
    if(callbackStatus==='expired')addToast({type:'warning',title:'Pagamento expirado',message:'Inicie uma nova contratação para continuar.'});
  },[callbackStatus,addToast]);

  const plan=useMemo(()=>plans.find(item=>item.tier===selected)||plans.find(item=>item.tier===subscription?.planTier)||null,[plans,selected,subscription]);
  const begin=async()=>{
    if(!plan)return;
    setStarting(true);
    try{
      const result=await startAsaasCheckout(plan.tier);
      if(result.active){addToast({type:'success',title:'Plano já ativo',message:result.message});await refresh();return;}
      if(!result.checkoutUrl)throw new Error('Não foi possível abrir o pagamento.');
      window.location.assign(result.checkoutUrl);
    }catch(error:any){addToast({type:'error',title:'Pagamento não iniciado',message:error?.message||'Tente novamente em alguns instantes.'});}
    finally{setStarting(false);}
  };
  const leave=()=>{clearBillingNavigationParams();window.location.reload();};

  if(loading)return <div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-600"/><p className="mt-3 text-sm font-bold text-slate-500">Consultando sua contratação...</p></div></div>;
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><button onClick={leave} className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600"><ArrowLeft className="h-4 w-4"/>Ir para o painel</button><p className="text-[10px] font-black uppercase tracking-[.18em] text-rose-600">Contratação segura</p><h1 className="mt-2 font-['Outfit'] text-3xl font-black text-slate-950 dark:text-white">Seu plano Web Imóveis</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Revise seu plano e continue para o pagamento seguro. A ativação ocorre após a confirmação do pagamento.</p></div><button onClick={()=>void refresh()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"><RefreshCw className="h-4 w-4"/>Atualizar situação</button></header>

    {callbackStatus&&<section className="mt-7 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0"/><div><strong>Retorno do ambiente de pagamento</strong><p className="mt-1 text-xs leading-5 opacity-80">Estamos consultando a confirmação do pagamento. Se você já concluiu, clique em Atualizar situação.</p></div></div></section>}

    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.75fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {plan?<><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><span className="text-xs font-black uppercase tracking-wider text-rose-600">Plano selecionado</span><h2 className="mt-2 text-3xl font-black">{plan.name}</h2><label className="mt-4 block text-xs font-bold">Alterar plano<select value={selected || plan.tier} onChange={event=>setSelected(event.target.value as CommercialPlanTier)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">{plans.map(option=><option key={option.tier} value={option.tier}>{option.name} — {formatPlanPrice(option.monthlyPriceCents)}/mês</option>)}</select></label><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{plan.description}</p></div><div className="sm:text-right"><strong className="text-3xl font-black">{formatPlanPrice(plan.monthlyPriceCents)}</strong><span className="block text-xs text-slate-500">por mês</span></div></div><ul className="mt-7 grid gap-3 sm:grid-cols-2">{planHighlights(plan).map(item=><li key={item} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"/>{item}</li>)}</ul>
          {subscription?.status==='active'&&subscription.planTier===plan.tier?<div className="mt-8 rounded-2xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"><div className="flex gap-3"><CheckCircle2 className="h-6 w-6"/><div><strong>Plano ativo</strong><p className="mt-1 text-xs opacity-80">Sua assinatura está confirmada{subscription.currentPeriodEnd?` até ${new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}`:''}.</p></div></div></div>:<button onClick={()=>void begin()} disabled={starting} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">{starting?<Loader2 className="h-5 w-5 animate-spin"/>:<ExternalLink className="h-5 w-5"/>}{starting?'Preparando pagamento...':'Continuar para pagamento'}</button>}
        </>:<div className="py-12 text-center"><CreditCard className="mx-auto h-10 w-10 text-slate-300"/><h2 className="mt-4 text-xl font-black">Escolha um plano primeiro</h2><p className="mt-2 text-sm text-slate-500">Volte à página de planos para comparar as opções disponíveis.</p><a href="https://www.webimoveis.site/#planos" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Ver planos</a></div>}
      </section>
      <aside className="space-y-5">
        <section className="rounded-3xl bg-slate-950 p-6 text-white"><ShieldCheck className="h-8 w-8 text-emerald-400"/><h2 className="mt-5 text-xl font-black">Pagamento seguro</h2><p className="mt-3 text-sm leading-6 text-slate-300">Seus dados de pagamento são protegidos. Após a confirmação, os recursos do seu plano serão liberados automaticamente.</p></section>
        {(subscription||checkout)&&<section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-black">Situação atual</h2><dl className="mt-4 space-y-3 text-xs">{subscription&&<div className="flex justify-between gap-4"><dt className="text-slate-500">Assinatura</dt><dd className="font-bold">{statusCopy[subscription.status]||subscription.status}</dd></div>}{checkout&&<div className="flex justify-between gap-4"><dt className="text-slate-500">Última tentativa</dt><dd className="font-bold">{statusCopy[checkout.status]||checkout.status}</dd></div>}</dl>{checkout?.status==='pending'&&checkout.checkoutUrl&&<a href={checkout.checkoutUrl} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold dark:border-slate-700">Retomar pagamento <ExternalLink className="h-4 w-4"/></a>}</section>}
      </aside>
    </div>
  </div>;
};

