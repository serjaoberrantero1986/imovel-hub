import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim().replace(/^["']+|["']+$/g, '');

const turnstileErrorMessage = (errorCode?: string) => {
  const code = errorCode?.trim();
  if (code?.startsWith('110100') || code?.startsWith('110110')) {
    return `A Site Key do Turnstile é inválida ou não existe (código ${code}). Confira VITE_TURNSTILE_SITE_KEY na Vercel.`;
  }
  if (code?.startsWith('110200')) {
    return `Este domínio não está autorizado no Turnstile (código ${code}). Autorize webimoveis.site no widget da Cloudflare.`;
  }
  if (code?.startsWith('11060') || code?.startsWith('11062')) {
    return `A verificação do Turnstile expirou (código ${code}). Clique em tentar novamente.`;
  }
  return code
    ? `A verificação do Turnstile falhou (código ${code}). Confira o domínio e a Site Key na Cloudflare.`
    : 'A verificação do Turnstile não foi concluída. Tente novamente.';
};

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
  const [localResetSignal, setLocalResetSignal] = useState(0);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    setWidgetError(null);
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
        'error-callback': (errorCode?: string) => {
          onTokenRef.current(null);
          const message = turnstileErrorMessage(errorCode);
          setWidgetError(message);
          onErrorRef.current?.(message);
        },
      });
    }).catch(error => onErrorRef.current?.(error instanceof Error ? error.message : 'Falha ao carregar o Turnstile.'));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onTokenRef.current(null);
    };
  }, [action, resetSignal, localResetSignal]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" aria-label="Verificação de segurança Cloudflare" />
      {widgetError && (
        <button
          type="button"
          onClick={() => setLocalResetSignal(value => value + 1)}
          className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          Tentar a verificação novamente
        </button>
      )}
    </div>
  );
};

