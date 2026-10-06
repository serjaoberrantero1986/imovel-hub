import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

let loader: Promise<void> | null = null;
const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
    const script = existing || document.createElement('script');
    const handleLoad = () => resolve();
    const handleError = () => reject(new Error('Não foi possível carregar a verificação Cloudflare.'));
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return loader;
};

interface TurnstileWidgetProps {
  action: 'login' | 'signup' | 'password_reset';
  resetSignal: number;
  onToken: (token: string | null) => void;
  onError?: (message: string) => void;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ action, resetSignal, onToken, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    onTokenRef.current(null);

    if (!TURNSTILE_SITE_KEY) {
      onErrorRef.current?.('A Site Key do Cloudflare Turnstile não foi configurada no frontend.');
      return;
    }

    void loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: `auth_${action}`,
        theme: 'auto',
        size: 'flexible',
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'timeout-callback': () => onTokenRef.current(null),
        'error-callback': () => {
          onTokenRef.current(null);
          onErrorRef.current?.('A verificação de segurança não foi concluída. Tente novamente.');
        },
      });
    }).catch(error => onErrorRef.current?.(error instanceof Error ? error.message : 'Falha ao carregar o Turnstile.'));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onTokenRef.current(null);
    };
  }, [action, resetSignal]);

  return <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" aria-label="Verificação de segurança Cloudflare" />;
};

