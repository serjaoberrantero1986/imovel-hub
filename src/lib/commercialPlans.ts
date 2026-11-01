import { supabase } from './supabaseClient';

export type CommercialPlanTier = 'basic' | 'intermediate' | 'advanced';
export type AnalyticsLevel = 'summary' | 'detailed' | 'complete';

export interface CommercialPlanEntitlements {
  activeListings: number;
  teamUsers: number;
  showcases: number;
  featuredListings: boolean;
  customShowcaseFilters: boolean;
  valuationsPerMonth: number;
  signaturesPerMonth: number;
  subdomainChangesPerYear: number;
  ownDomain: boolean;
  removeBranding: boolean;
  analytics: AnalyticsLevel;
}

export interface CommercialPlan {
  tier: CommercialPlanTier;
  name: string;
  description: string;
  monthlyPriceCents: number;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  entitlements: CommercialPlanEntitlements;
  updatedAt?: string;
}

const entitlements: Record<CommercialPlanTier, CommercialPlanEntitlements> = {
  basic: { activeListings:30, teamUsers:1, showcases:1, featuredListings:false, customShowcaseFilters:false, valuationsPerMonth:3, signaturesPerMonth:2, subdomainChangesPerYear:1, ownDomain:false, removeBranding:false, analytics:'summary' },
  intermediate: { activeListings:100, teamUsers:3, showcases:3, featuredListings:true, customShowcaseFilters:false, valuationsPerMonth:15, signaturesPerMonth:10, subdomainChangesPerYear:2, ownDomain:false, removeBranding:false, analytics:'detailed' },
  advanced: { activeListings:300, teamUsers:10, showcases:12, featuredListings:true, customShowcaseFilters:true, valuationsPerMonth:50, signaturesPerMonth:30, subdomainChangesPerYear:4, ownDomain:true, removeBranding:true, analytics:'complete' },
};

export const DEFAULT_COMMERCIAL_PLANS: CommercialPlan[] = [
  { tier:'basic', name:'Essencial', description:'Para o corretor que quer iniciar sua presença digital e organizar os primeiros atendimentos.', monthlyPriceCents:5900, active:true, featured:false, displayOrder:1, entitlements:entitlements.basic },
  { tier:'intermediate', name:'Profissional', description:'Para quem precisa ampliar a carteira, destacar oportunidades e acompanhar mais negócios.', monthlyPriceCents:11900, active:true, featured:true, displayOrder:2, entitlements:entitlements.intermediate },
  { tier:'advanced', name:'Imobiliária', description:'Para equipes que precisam de escala, personalização completa e gestão de uma operação maior.', monthlyPriceCents:24900, active:true, featured:false, displayOrder:3, entitlements:entitlements.advanced },
];

const toPlan = (row:any):CommercialPlan => ({
  tier: row.tier,
  name: String(row.name || ''),
  description: String(row.description || ''),
  monthlyPriceCents: Number(row.monthly_price_cents || 0),
  active: row.active === true,
  featured: row.featured === true,
  displayOrder: Number(row.display_order || 0),
  entitlements: { ...entitlements[row.tier as CommercialPlanTier], ...(row.entitlements || {}) },
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

export async function loadCommercialPlans(includeInactive=false):Promise<CommercialPlan[]> {
  if(!supabase) return DEFAULT_COMMERCIAL_PLANS.filter(plan=>includeInactive||plan.active);
  let query = supabase.from('commercial_plans').select('*').order('display_order');
  if(!includeInactive) query = query.eq('active',true);
  const {data,error}=await query;
  if(error){
    console.warn('Commercial plans unavailable:',error);
    return DEFAULT_COMMERCIAL_PLANS.filter(plan=>includeInactive||plan.active);
  }
  return (data||[]).map(toPlan);
}

export async function saveCommercialPlan(plan:CommercialPlan):Promise<void>{
  if(!supabase) throw new Error('Serviço temporariamente indisponível.');
  const {error}=await supabase.from('commercial_plans').upsert({
    tier:plan.tier,name:plan.name.trim(),description:plan.description.trim(),monthly_price_cents:Math.round(plan.monthlyPriceCents),
    active:plan.active,featured:plan.featured,display_order:plan.displayOrder,entitlements:plan.entitlements,updated_at:new Date().toISOString()
  },{onConflict:'tier'});
  if(error)throw error;
}

export const formatPlanPrice=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:cents%100?2:0}).format(cents/100);

export const planHighlights=(plan:CommercialPlan)=>[
  `Até ${plan.entitlements.activeListings} imóveis ativos`,
  `${plan.entitlements.teamUsers} ${plan.entitlements.teamUsers===1?'usuário':'usuários'} na equipe`,
  plan.entitlements.showcases===1?'1 vitrine automática':`Até ${plan.entitlements.showcases} vitrines`,
  `${plan.entitlements.valuationsPerMonth} avaliações por mês`,
  `${plan.entitlements.signaturesPerMonth} assinaturas incluídas`,
  'CRM, leads, visitas e documentos',
];

