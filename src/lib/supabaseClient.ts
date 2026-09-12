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

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
export const supabaseAnonKey = (rawKey || '').trim().replace(/^["']+|["']+$/g, '');

// Clean any stale or dirty URL stored in localStorage
if (typeof window !== 'undefined') {
  try {
    const storedUrl = localStorage.getItem('imovelhub_supabase_url');
    if (storedUrl) {
      const sanitized = sanitizeSupabaseUrl(storedUrl);
      if (sanitized !== storedUrl) {
        localStorage.setItem('imovelhub_supabase_url', sanitized);
      }
    }
  } catch {
    // ignore
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20
);

/**
 * Supabase Client instance
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
