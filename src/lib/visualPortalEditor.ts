import type { CanvasElement, CanvasBlock } from './portalCanvas';
import { supabase } from './supabaseClient';

export type PortalTemplateId = 'essencial' | 'signature' | 'urbano' | 'casa_familia' | 'prime';
export type HeroBackgroundMode = 'image' | 'solid' | 'gradient';
export type HeroPropertySceneStyle = 'route' | 'cards' | 'spotlight';
export type EditableSectionId = 'hero' | 'featured_properties' | 'neighborhoods' | 'map' | 'info_cards' | 'banners';

export interface EditableSection {
  id: EditableSectionId;
  label: string;
  isVisible: boolean;
}

export interface VisualPortalConfiguration {
  version: 1;
  elements?: Record<string, CanvasElement>;
  blocks?: CanvasBlock[];
  sectionOrder?: string[];
  templateId: PortalTemplateId;
  hero: {
    line1: string;
    line2: string;
    line3: string;
    subtitle: string;
    backgroundMode: HeroBackgroundMode;
    backgroundImages: Array<{ id: string; url: string; path: string }>;
    backgroundIntervalSeconds: number;
    backgroundAutoplay?: boolean;
    backgroundTransition?: 'fade' | 'none';
    backgroundTransitionSeconds?: number;
    backgroundPositionX?: number;
    backgroundPositionY?: number;
    backgroundFit?: 'cover' | 'contain';
    overlayOpacity?: number;
    minHeight?: number;
    gradientAngle?: number;
    propertyAutoplay?: boolean;
    propertyIntervalSeconds?: number;
    propertyVisibleCount?: number;
    propertyLimit?: number;
    propertySource?: 'all' | 'featured';
    propertyOrder?: 'random' | 'price_asc';
    propertyShowPrice?: boolean;
    propertyShowLocation?: boolean;
    propertyShowType?: boolean;
    solidColor: string;
    gradientStart: string;
    gradientEnd: string;
    showPropertyScene: boolean;
    propertySceneStyle: HeroPropertySceneStyle;
  };
  sections: EditableSection[];
}

export interface PortalTemplate {
  id: PortalTemplateId;
  name: string;
  description: string;
  preview: string;
  configuration: VisualPortalConfiguration;
}

const baseSections = (): EditableSection[] => [
  { id: 'hero', label: 'Apresentação principal', isVisible: true },
  { id: 'featured_properties', label: 'Imóveis em destaque', isVisible: true },
  { id: 'neighborhoods', label: 'Bairros', isVisible: true },
  { id: 'map', label: 'Busca no mapa', isVisible: true },
  { id: 'info_cards', label: 'Diferenciais', isVisible: true },
  { id: 'banners', label: 'Banners de chamada', isVisible: true }
];

const configuration = (templateId: PortalTemplateId, hero: Partial<VisualPortalConfiguration['hero']> = {}): VisualPortalConfiguration => ({
  version: 1,
  templateId,
  hero: {
    line1: 'Seu próximo imóvel',
    line2: 'está mais perto do que',
    line3: 'você imagina.',
    subtitle: 'Encontre imóveis para comprar, alugar ou investir em poucos cliques.',
    backgroundMode: 'image',
    backgroundImages: [],
    backgroundIntervalSeconds: 8,
    backgroundAutoplay: true,
    backgroundTransition: 'fade',
    propertyVisibleCount: 3,
    propertyLimit: 12,
    propertyAutoplay: false,
    propertyIntervalSeconds: 6,
    solidColor: '#10152b',
    gradientStart: '#0f172a',
    gradientEnd: '#4f46e5',
    showPropertyScene: true,
    propertySceneStyle: 'route',
    ...hero
  },
  sections: baseSections()
});

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  { id: 'essencial', name: 'Essencial', description: 'Claro, direto e focado na busca.', preview: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', configuration: configuration('essencial') },
  { id: 'signature', name: 'Signature', description: 'Hero dividida, títulos editoriais e imóveis em duas colunas.', preview: 'linear-gradient(135deg, #111827, #4c1d3b)', configuration: configuration('signature', { gradientStart: '#111827', gradientEnd: '#701a75', propertySceneStyle: 'spotlight' }) },
  { id: 'urbano', name: 'Urbano', description: 'Hero centralizada, grade compacta e mapa em evidência.', preview: 'linear-gradient(135deg, #111827, #4338ca)', configuration: configuration('urbano', { gradientStart: '#111827', gradientEnd: '#4338ca', propertySceneStyle: 'cards' }) },
  { id: 'casa_familia', name: 'Casa & Família', description: 'Foto em arco, diferenciais primeiro e bairros ampliados.', preview: 'linear-gradient(135deg, #78350f, #fb7185)', configuration: configuration('casa_familia', { gradientStart: '#78350f', gradientEnd: '#fb7185', propertySceneStyle: 'cards' }) },
  { id: 'prime', name: 'Prime', description: 'Hero cinematográfica e vitrines amplas sobre fundo escuro.', preview: 'linear-gradient(135deg, #09090b, #a16207)', configuration: configuration('prime', { gradientStart: '#09090b', gradientEnd: '#a16207', propertySceneStyle: 'spotlight' }) }
];

export const DEFAULT_VISUAL_PORTAL_CONFIGURATION = configuration('essencial');

export const cloneVisualConfiguration = (value: VisualPortalConfiguration) => JSON.parse(JSON.stringify(value)) as VisualPortalConfiguration;

export const normaliseVisualConfiguration = (value: Partial<VisualPortalConfiguration> | null | undefined): VisualPortalConfiguration => {
  // Move legacy direct-background overrides into the shared gallery once.
  const elements = {...value?.elements};
  const legacy = elements['hero.background'];
  const gallery = Array.isArray(value?.hero?.backgroundImages) ? [...value.hero.backgroundImages] : [];
  if (legacy?.imageUrl && !gallery.some(image => image.url === legacy.imageUrl)) gallery.unshift({id:'legacy-background',url:legacy.imageUrl,path:legacy.imagePath || ''});
  if(legacy) elements['hero.background'] = {...legacy,imageUrl:undefined,imagePath:undefined};
  return ({
  ...DEFAULT_VISUAL_PORTAL_CONFIGURATION,
  ...value,
  elements,
  hero: {
    ...DEFAULT_VISUAL_PORTAL_CONFIGURATION.hero,
    ...(value?.hero || {}),
    // Preserve all five legacy gallery images plus an older direct override.
    backgroundImages: gallery.slice(0, 6)
  },
  sections: baseSections().map(section => ({ ...section, ...(value?.sections || []).find(item => item.id === section.id) }))
});
};

export const templateConfiguration = (templateId: PortalTemplateId): VisualPortalConfiguration => {
  const template = PORTAL_TEMPLATES.find(item => item.id === templateId) || PORTAL_TEMPLATES[0];
  return cloneVisualConfiguration(template.configuration);
};

export const isSectionVisible = (config: VisualPortalConfiguration, id: EditableSectionId) =>
  config.sections.find(section => section.id === id)?.isVisible !== false;

export async function fetchMyVisualPortalConfiguration(ownerId: string): Promise<{ draft: VisualPortalConfiguration; published: VisualPortalConfiguration }> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { data, error } = await (supabase as any)
    .from('portal_settings')
    .select('visual_draft, visual_published')
    .eq('id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return {
    draft: normaliseVisualConfiguration(data?.visual_draft),
    published: normaliseVisualConfiguration(data?.visual_published)
  };
}

export async function ensureMyVisualPortalConfiguration(ownerId: string): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const initial = DEFAULT_VISUAL_PORTAL_CONFIGURATION;
  const { error } = await (supabase as any).from('portal_settings').upsert({
    id: ownerId,
    owner_profile_id: ownerId,
    visual_draft: initial,
    visual_published: initial
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function saveMyVisualPortalDraft(ownerId: string, draft: VisualPortalConfiguration): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await (supabase as any).from('portal_settings')
    .update({ visual_draft: draft, updated_at: new Date().toISOString() })
    .eq('id', ownerId)
    .eq('owner_profile_id', ownerId)
    .select('id').single();
  if (error) throw error;
}

export async function publishMyVisualPortalConfiguration(ownerId: string, draft: VisualPortalConfiguration): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await (supabase as any).from('portal_settings')
    .update({ visual_draft: draft, visual_published: draft, updated_at: new Date().toISOString() })
    .eq('id', ownerId)
    .eq('owner_profile_id', ownerId)
    .select('id').single();
  if (error) throw error;
}

// Every visual feature must be registered here before it is exposed in the editor.
export const VISUAL_EDITOR_REGISTRY = {
  home: {
    sections: baseSections,
    templates: PORTAL_TEMPLATES,
    elementKinds: ['text', 'box', 'image', 'icon'],
    insertableBlocks: ['text', 'image', 'button', 'icon']
  }
} as const;
