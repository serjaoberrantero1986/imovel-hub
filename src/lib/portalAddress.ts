import { supabase } from './supabaseClient';

export interface PortalAddress {
  title: string;
  slug: string;
  url?: string;
}

export interface PortalSlugAvailability {
  slug: string;
  available: boolean;
  reason: string;
}

export const normalisePortalSlug = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
  .replace(/^-|-$/g, '').slice(0, 48);

export async function checkPortalSlugAvailability(value: string): Promise<PortalSlugAvailability> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { data, error } = await (supabase as any).rpc('check_portal_slug_availability', { p_value: value });
  if (error) throw error;
  return { slug: String(data?.slug || ''), available: data?.available === true, reason: String(data?.reason || '') };
}

export async function getMyPortalAddress(): Promise<PortalAddress | null> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { data, error } = await (supabase as any).rpc('get_my_portal_address');
  if (error) throw error;
  if (!data?.slug) return null;
  return { title: String(data.title || ''), slug: String(data.slug), url: data.url ? String(data.url) : undefined };
}

export async function updateMyPortalAddress(value: PortalAddress): Promise<PortalAddress> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { data, error } = await (supabase as any).rpc('update_my_portal_address', { p_title: value.title.trim(), p_slug: value.slug });
  if (error) {
    if (error.code === '23505' || /unavailable|duplicate|unique/i.test(error.message || '')) throw new Error('Este endereço acabou de ser escolhido por outra pessoa. Informe outro.');
    throw error;
  }
  return { title: String(data.title), slug: String(data.slug), url: String(data.url) };
}
