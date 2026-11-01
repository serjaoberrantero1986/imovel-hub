import type { PortalPlanTier, PropertyShowcase, VisualPortalConfiguration } from './visualPortalEditor';

export const PORTAL_PLAN_LIMITS: Record<PortalPlanTier, { showcases: number; featured: boolean; customFilters: boolean }> = {
  basic: { showcases: 1, featured: false, customFilters: false },
  intermediate: { showcases: 3, featured: true, customFilters: false },
  advanced: { showcases: 12, featured: true, customFilters: true },
};

export const planLabel = (tier: PortalPlanTier) => tier === 'basic' ? 'Básico' : tier === 'intermediate' ? 'Intermediário' : 'Avançado';

export const showcaseTemplates: Array<{ label: string; value: Omit<PropertyShowcase, 'id' | 'isVisible'> }> = [
  { label: 'Imóveis em destaque', value: { title: 'Imóveis em Destaque', subtitle: 'Oportunidades selecionadas pelo corretor', source: 'featured', purpose: 'all', types: [], order: 'featured', limit: 6 } },
  { label: 'Mais recentes para venda', value: { title: 'Novidades para Comprar', subtitle: 'Os imóveis mais recentes disponíveis para venda', source: 'all', purpose: 'sale', types: [], order: 'recent', limit: 6 } },
  { label: 'Mais recentes para locação', value: { title: 'Novidades para Locação', subtitle: 'Imóveis recém-publicados para alugar', source: 'all', purpose: 'rent', types: [], order: 'recent', limit: 6 } },
  { label: 'Menor valor em temporada', value: { title: 'Temporada com Menor Valor', subtitle: 'Opções econômicas para sua estadia', source: 'all', purpose: 'seasonal', types: [], order: 'price_asc', limit: 6 } },
  { label: 'Fazendas e grandes áreas', value: { title: 'Fazendas e Grandes Áreas', subtitle: 'Imóveis rurais selecionados por área', source: 'all', purpose: 'all', types: ['farm', 'rural'], order: 'area_desc', limit: 6 } },
];

export const basicShowcase = (): PropertyShowcase => ({
  id: 'available-properties', title: 'Imóveis Disponíveis', subtitle: 'Confira os anúncios mais recentes do portal', isVisible: true,
  source: 'all', purpose: 'all', types: [], order: 'recent', limit: 6,
});

export const applyPortalPlan = (configuration: VisualPortalConfiguration, tier: PortalPlanTier): VisualPortalConfiguration => {
  const limits = PORTAL_PLAN_LIMITS[tier];
  if (tier === 'basic') return { ...configuration, showcases: [basicShowcase()] };
  return { ...configuration, showcases: configuration.showcases.slice(0, limits.showcases) };
};

export const portalPlanErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/BASIC_SHOWCASE/.test(message)) return 'O plano Básico permite somente a vitrine automática, sem filtros.';
  if (/INTERMEDIATE_SHOWCASE_LIMIT/.test(message)) return 'O plano Intermediário permite até três vitrines.';
  if (/INTERMEDIATE_CUSTOM_FILTER/.test(message)) return 'Este filtro personalizado está disponível no plano Avançado.';
  if (/ADVANCED_SHOWCASE_LIMIT/.test(message)) return 'O limite máximo de vitrines foi atingido.';
  if (/FEATURED_PLAN_REQUIRED/.test(message)) return 'A marcação de destaque está disponível nos planos superiores.';
  return message || 'Não foi possível concluir esta alteração.';
};
