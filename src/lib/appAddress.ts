import { ROOT_DOMAIN } from './tenant';

export const APP_HOST = `app.${ROOT_DOMAIN}`;
export const APP_ORIGIN = `https://${APP_HOST}`;

const normaliseHost = (hostname: string) => hostname.trim().toLowerCase().replace(/\.$/, '');

export function isAppHost(hostname = window.location.hostname) {
  return normaliseHost(hostname) === APP_HOST;
}

export function isLocalDevelopmentHost(hostname = window.location.hostname) {
  const host = normaliseHost(hostname);
  return import.meta.env.DEV && (host === 'localhost' || host === '127.0.0.1');
}

export function getCanonicalAppOrigin() {
  return isLocalDevelopmentHost() ? window.location.origin : APP_ORIGIN;
}

export function parseSafePortalReturnUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = normaliseHost(url.hostname);
    const belongsToWebImoveis = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host.endsWith(`.${ROOT_DOMAIN}`);
    if (url.protocol !== 'https:' || !belongsToWebImoveis || host === APP_HOST || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function getSafePortalReturnUrl() {
  return parseSafePortalReturnUrl(new URLSearchParams(window.location.search).get('returnTo'));
}

export function buildCentralAuthUrl(tab: 'login' | 'signup' | 'forgot' = 'login', returnTo = window.location.href) {
  if (isLocalDevelopmentHost() || isAppHost()) return null;
  const url = new URL(getCanonicalAppOrigin());
  url.searchParams.set('auth', tab);
  const safeReturn = parseSafePortalReturnUrl(returnTo);
  if (safeReturn) url.searchParams.set('returnTo', safeReturn.toString());
  return url.toString();
}

