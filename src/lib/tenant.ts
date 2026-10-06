import { DEFAULT_VISUAL_PORTAL_CONFIGURATION, normaliseVisualConfiguration, VisualPortalConfiguration } from './visualPortalEditor';
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HOME_PAGE_SETTINGS,
  DEFAULT_PORTAL_IDENTITY,
  FooterSettings,
  HomePageSettings,
  PortalIdentitySettings,
} from './portalSettings';
import { supabase } from './supabaseClient';

export type PortalHostMode = 'root' | 'tenant' | 'not_found';

export interface PublicPortalProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  creci: string;
  agencyName: string;
  agencyLogo: string;
  avatarUrl: string;
}

export interface PublicPortalData {
  mode: PortalHostMode;
  slug: string | null;
  ownerProfileId: string | null;
  identity: PortalIdentitySettings;
  footer: FooterSettings;
  homePage: HomePageSettings;
  visualPublished: VisualPortalConfiguration;
  profile: PublicPortalProfile | null;
}

const ROOT_DOMAIN = (import.meta.env.VITE_PORTAL_ROOT_DOMAIN || 'webimoveis.site').trim().toLowerCase();
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api', 'auth', 'mail', 'smtp', 'static', 'assets', 'cdn', 'support', 'status']);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function extractPortalSlug(hostname = window.location.hostname): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!host || host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host === 'localhost' || host === '127.0.0.1') {
    if ((host === 'localhost' || host === '127.0.0.1') && import.meta.env.DEV) {
      const previewSlug = new URLSearchParams(window.location.search).get('tenant')?.trim().toLowerCase() || '';
      return SLUG_PATTERN.test(previewSlug) && !RESERVED_SUBDOMAINS.has(previewSlug) ? previewSlug : null;
    }
    return null;
  }
  const suffix = `.${ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  // Keep invalid or reserved labels as tenant attempts so they resolve to the
  // explicit not-found state instead of accidentally exposing the root portal.
  return label || '__invalid__';
}

const rootDefaults = (): PublicPortalData => ({
  mode: 'root',
  slug: null,
  ownerProfileId: null,
  identity: DEFAULT_PORTAL_IDENTITY,
  footer: DEFAULT_FOOTER_SETTINGS,
  homePage: DEFAULT_HOME_PAGE_SETTINGS,
  visualPublished: DEFAULT_VISUAL_PORTAL_CONFIGURATION,
  profile: null,
});

const asObject = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

function normalisePortalPayload(payload: unknown, slug: string | null): PublicPortalData | null {
  const row = asObject(payload);
  if (!row.found) return null;
  const profileRow = asObject(row.profile);
  const profile: PublicPortalProfile | null = row.owner_profile_id ? {
    id: String(row.owner_profile_id),
    name: String(profileRow.name || ''),
    email: String(profileRow.email || ''),
    phone: String(profileRow.phone || ''),
    whatsapp: String(profileRow.whatsapp || ''),
    creci: String(profileRow.creci || ''),
    agencyName: String(profileRow.agency_name || ''),
    agencyLogo: String(profileRow.agency_logo || ''),
    avatarUrl: String(profileRow.avatar_url || ''),
  } : null;
  const identityFallback: Partial<PortalIdentitySettings> = profile ? {
    portalName: profile.agencyName || profile.name || DEFAULT_PORTAL_IDENTITY.portalName,
    logoUrl: profile.agencyLogo || DEFAULT_PORTAL_IDENTITY.logoUrl,
  } : {};
  const footerFallback: Partial<FooterSettings> = profile ? {
    professionalName: profile.name || DEFAULT_FOOTER_SETTINGS.professionalName,
    phone: profile.whatsapp || profile.phone || DEFAULT_FOOTER_SETTINGS.phone,
    email: profile.email || DEFAULT_FOOTER_SETTINGS.email,
    creci: profile.creci ? `CRECI ${profile.creci}` : DEFAULT_FOOTER_SETTINGS.creci,
  } : {};
  const homePage = asObject(row.home_page) as Partial<HomePageSettings>;
  return {
    mode: slug ? 'tenant' : 'root',
    slug,
    ownerProfileId: row.owner_profile_id ? String(row.owner_profile_id) : null,
    identity: { ...DEFAULT_PORTAL_IDENTITY, ...identityFallback, ...asObject(row.identity) },
    footer: { ...DEFAULT_FOOTER_SETTINGS, ...footerFallback, ...asObject(row.footer) },
    homePage: {
      ...DEFAULT_HOME_PAGE_SETTINGS,
      ...homePage,
      infoCards: homePage.infoCards || DEFAULT_HOME_PAGE_SETTINGS.infoCards,
      banners: homePage.banners || DEFAULT_HOME_PAGE_SETTINGS.banners,
    },
    visualPublished: normaliseVisualConfiguration(asObject(row.visual_published)),
    profile,
  };
}

async function fetchRootFallback(): Promise<PublicPortalData> {
  if (!supabase) return rootDefaults();
  const { data, error } = await supabase
    .from('portal_settings')
    .select('identity, footer, home_page, visual_published')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw error;
  return normalisePortalPayload({ found: true, ...(data || {}) }, null) || rootDefaults();
}

export async function resolvePublicPortal(slug: string | null): Promise<PublicPortalData> {
  if (!supabase) return slug ? { ...rootDefaults(), mode: 'not_found', slug } : rootDefaults();
  const { data, error } = await (supabase as any).rpc('resolve_public_portal', { p_slug: slug });
  if (error) {
    if (!slug) return fetchRootFallback();
    throw error;
  }
  const resolved = normalisePortalPayload(data, slug);
  return resolved || (slug ? { ...rootDefaults(), mode: 'not_found', slug } : rootDefaults());
}

export { ROOT_DOMAIN };
