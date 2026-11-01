import { supabase } from './supabaseClient';
import { CommercialPlanTier } from './commercialPlans';

export type CommercialSubscriptionStatus = 'pending'|'active'|'past_due'|'suspended'|'canceled'|'expired';

export interface CommercialSubscriptionSummary {
  id: string;
  planTier: CommercialPlanTier;
  status: CommercialSubscriptionStatus;
  amountCents: number;
  currentPeriodEnd?: string;
  updatedAt: string;
}

export interface CommercialCheckoutSummary {
  id: string;
  planTier: CommercialPlanTier;
  status: 'creating'|'pending'|'paid'|'canceled'|'expired'|'failed';
  checkoutUrl?: string;
  createdAt: string;
}

export async function loadMyCommercialBilling(): Promise<{
  subscription: CommercialSubscriptionSummary|null;
  checkout: CommercialCheckoutSummary|null;
}> {
  if (!supabase) return { subscription:null, checkout:null };
  const [{data:subscriptions,error:subscriptionError},{data:checkouts,error:checkoutError}] = await Promise.all([
    supabase.from('commercial_subscriptions').select('id,plan_tier,status,amount_cents,current_period_end,updated_at').order('created_at',{ascending:false}).limit(1),
    supabase.from('commercial_checkout_attempts').select('id,plan_tier,status,checkout_url,created_at').order('created_at',{ascending:false}).limit(1),
  ]);
  if (subscriptionError) throw subscriptionError;
  if (checkoutError) throw checkoutError;
  const subscription = subscriptions?.[0];
  const checkout = checkouts?.[0];
  return {
    subscription: subscription ? {
      id:String(subscription.id), planTier:subscription.plan_tier as CommercialPlanTier,
      status:subscription.status as CommercialSubscriptionStatus,
      amountCents:Number(subscription.amount_cents), currentPeriodEnd:subscription.current_period_end || undefined,
      updatedAt:String(subscription.updated_at),
    } : null,
    checkout: checkout ? {
      id:String(checkout.id), planTier:checkout.plan_tier as CommercialPlanTier,
      status:checkout.status as CommercialCheckoutSummary['status'], checkoutUrl:checkout.checkout_url || undefined,
      createdAt:String(checkout.created_at),
    } : null,
  };
}

export async function getSelectedCommercialPlan():Promise<CommercialPlanTier|null>{
  const query = new URLSearchParams(window.location.search).get('plan');
  if (query === 'basic' || query === 'intermediate' || query === 'advanced') {
    sessionStorage.setItem('webimoveis_selected_plan',query);
    return query;
  }
  const stored = sessionStorage.getItem('webimoveis_selected_plan');
  if (stored === 'basic' || stored === 'intermediate' || stored === 'advanced') return stored;
  if (!supabase) return null;
  const {data} = await supabase.auth.getUser();
  const metadataPlan = data.user?.user_metadata?.selected_plan;
  return metadataPlan === 'basic' || metadataPlan === 'intermediate' || metadataPlan === 'advanced' ? metadataPlan : null;
}

export async function startAsaasCheckout(planTier:CommercialPlanTier):Promise<{checkoutUrl?:string;active?:boolean;message?:string}>{
  if(!supabase) throw new Error('Serviço de contratação indisponível.');
  const {data,error}=await supabase.functions.invoke('asaas-create-checkout',{body:{planTier}});
  if(error) throw new Error(data?.error || 'Não foi possível iniciar o checkout.');
  if(data?.error) throw new Error(String(data.error));
  return data || {};
}

export function clearBillingNavigationParams(){
  const url=new URL(window.location.href);
  ['intent','billing'].forEach(key=>url.searchParams.delete(key));
  window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`);
}
