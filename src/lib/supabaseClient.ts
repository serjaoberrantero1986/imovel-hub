import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Sanitizes and normalizes Supabase project URLs.
 * Supabase project URLs must be root origin URLs (e.g. https://xyz.supabase.co).
 * If users or configuration include `/rest/v1/` or trailing paths, PostgREST throws
 * PGRST125 ("Invalid path specified in request URL") when the auth/storage client appends paths.
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^["']+|["']+$/g, '');
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.supabase.co') || parsed.hostname.includes('supabase')) {
      return parsed.origin;
    }
    // For custom self-hosted domains or localhost, remove /rest/v1 or /auth/v1
    const cleanPathname = parsed.pathname.replace(/\/(rest|auth|storage)\/v[0-9]+(\/.*)?$/i, '').replace(/\/+$/, '');
    return `${parsed.origin}${cleanPathname}`;
  } catch {
    // fallback
  }
  url = url.replace(/\/(rest|auth|storage)\/v[0-9]+(\/.*)?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

// Credentials come exclusively from the deployment environment. A browser must
// never be able to redirect the portal to a different Supabase project.
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let supabaseUrl = sanitizeSupabaseUrl(rawUrl);
export let supabaseAnonKey = (rawKey || '').trim().replace(/^["']+|["']+$/g, '');

export let isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20
);

/**
 * Supabase Client instance
 */
export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/** Runtime credential changes are intentionally disabled. */
export function updateSupabaseCredentials(newUrl: string, newKey: string): { success: boolean; configured: boolean } {
  void newUrl;
  void newKey;
  return { success: false, configured: isSupabaseConfigured };
}
