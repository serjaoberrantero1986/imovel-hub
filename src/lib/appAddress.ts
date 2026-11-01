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

export function getAuthRedirectUrl() {
  if (typeof window === 'undefined') return APP_ORIGIN;
  const url = new URL(window.location.href);
  const host = normaliseHost(url.hostname);
  const belongsToWebImoveis = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host.endsWith(`.${ROOT_DOMAIN}`);
  const allowedOrigin = (url.protocol === 'https:' && belongsToWebImoveis) || isLocalDevelopmentHost(host);
  if (!allowedOrigin) return APP_ORIGIN;
  url.searchParams.delete('auth');
  url.searchParams.delete('returnTo');
  return url.toString();
}

