import { HomePageSettings } from './portalSettings';
import { supabase } from './supabaseClient';

export type PortalTemplateId = 'essencial' | 'signature' | 'urbano' | 'casa_familia' | 'prime';
export type HeroBackgroundMode = 'image' | 'solid' | 'gradient';
export type EditableSectionId = 'hero' | 'featured_properties' | 'neighborhoods' | 'map' | 'info_cards' | 'banners';

export interface EditableSection {
  id: EditableSectionId;
  label: string;
  isVisible: boolean;
}

export interface VisualPortalConfiguration {
  version: 1;
  templateId: PortalTemplateId;
  hero: {
    backgroundMode: HeroBackgroundMode;
    solidColor: string;
    gradientStart: string;
    gradientEnd: string;
    showPropertyScene: boolean;
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
    backgroundMode: 'image',
    solidColor: '#10152b',
    gradientStart: '#0f172a',
    gradientEnd: '#4f46e5',
    showPropertyScene: true,
    ...hero
  },
  sections: baseSections()
});

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  { id: 'essencial', name: 'Essencial', description: 'Claro, direto e focado na busca.', preview: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', configuration: configuration('essencial') },
  { id: 'signature', name: 'Signature', description: 'Editorial, sóbrio e sofisticado.', preview: 'linear-gradient(135deg, #111827, #4c1d3b)', configuration: configuration('signature', { gradientStart: '#111827', gradientEnd: '#701a75' }) },
  { id: 'urbano', name: 'Urbano', description: 'Contemporâneo, vibrante e metropolitano.', preview: 'linear-gradient(135deg, #111827, #4338ca)', configuration: configuration('urbano', { gradientStart: '#111827', gradientEnd: '#4338ca' }) },
  { id: 'casa_familia', name: 'Casa & Família', description: 'Acolhedor, leve e próximo.', preview: 'linear-gradient(135deg, #78350f, #fb7185)', configuration: configuration('casa_familia', { gradientStart: '#78350f', gradientEnd: '#fb7185' }) },
  { id: 'prime', name: 'Prime', description: 'Luxo discreto com contraste marcante.', preview: 'linear-gradient(135deg, #09090b, #a16207)', configuration: configuration('prime', { gradientStart: '#09090b', gradientEnd: '#a16207' }) }
];

export const DEFAULT_VISUAL_PORTAL_CONFIGURATION = configuration('essencial');

export const cloneVisualConfiguration = (value: VisualPortalConfiguration) => JSON.parse(JSON.stringify(value)) as VisualPortalConfiguration;

export const normaliseVisualConfiguration = (value: Partial<VisualPortalConfiguration> | null | undefined): VisualPortalConfiguration => ({
  ...DEFAULT_VISUAL_PORTAL_CONFIGURATION,
  ...value,
  hero: { ...DEFAULT_VISUAL_PORTAL_CONFIGURATION.hero, ...(value?.hero || {}) },
  sections: baseSections().map(section => ({ ...section, ...(value?.sections || []).find(item => item.id === section.id) }))
});

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
    .eq('owner_profile_id', ownerId);
  if (error) throw error;
}

export async function publishMyVisualPortalConfiguration(ownerId: string, draft: VisualPortalConfiguration): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await (supabase as any).from('portal_settings')
    .update({ visual_draft: draft, visual_published: draft, updated_at: new Date().toISOString() })
    .eq('id', ownerId)
    .eq('owner_profile_id', ownerId);
  if (error) throw error;
}

// Every visual feature must be registered here before it is exposed in the editor.
export const VISUAL_EDITOR_REGISTRY = {
  home: {
    sections: baseSections,
    templates: PORTAL_TEMPLATES
  }
} as const;
