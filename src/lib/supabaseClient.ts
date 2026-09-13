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

// Retrieve credentials from environment variables (or localStorage override)
const rawUrl = (typeof window !== 'undefined' && localStorage.getItem('imovelhub_supabase_url')) 
  || import.meta.env.VITE_SUPABASE_URL 
  || '';

const rawKey = (typeof window !== 'undefined' && localStorage.getItem('imovelhub_supabase_anon_key')) 
  || import.meta.env.VITE_SUPABASE_ANON_KEY 
  || '';

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

/**
 * Updates Supabase credentials dynamically at runtime and reinitializes client
 */
export function updateSupabaseCredentials(newUrl: string, newKey: string): { success: boolean; configured: boolean } {
  const cleanUrl = sanitizeSupabaseUrl(newUrl);
  const cleanKey = (newKey || '').trim().replace(/^["']+|["']+$/g, '');

  if (typeof window !== 'undefined') {
    if (cleanUrl) {
      localStorage.setItem('imovelhub_supabase_url', cleanUrl);
    } else {
      localStorage.removeItem('imovelhub_supabase_url');
    }
    if (cleanKey) {
      localStorage.setItem('imovelhub_supabase_anon_key', cleanKey);
    } else {
      localStorage.removeItem('imovelhub_supabase_anon_key');
    }
  }

  supabaseUrl = cleanUrl;
  supabaseAnonKey = cleanKey;
  isSupabaseConfigured = Boolean(
    cleanUrl && 
    cleanKey && 
    cleanUrl.startsWith('http') && 
    cleanKey.length > 20
  );

  if (isSupabaseConfigured) {
    try {
      supabase = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return { success: true, configured: true };
    } catch (e) {
      console.error('Error instantiating Supabase client:', e);
      supabase = null;
      return { success: false, configured: false };
    }
  } else {
    supabase = null;
    return { success: true, configured: false };
  }
}
