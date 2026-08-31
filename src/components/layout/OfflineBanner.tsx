import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnectedToast(true);
        setTimeout(() => {
          setShowReconnectedToast(false);
          setWasOffline(false);
        }, 4000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnectedToast) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none animate-fadeIn">
      {/* Offline Alert Badge */}
      {!isOnline && (
        <div className="pointer-events-auto bg-amber-500/95 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md border border-amber-400 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-950" />
            <div>
              <span className="font-extrabold">Modo Offline Ativo</span>
              <p className="text-[10px] font-medium text-slate-900 leading-tight">
                Navegando pelos imóveis salvos em cache local.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/15 text-[10px] uppercase tracking-wider font-extrabold">
            Cache
          </span>
        </div>
      )}

      {/* Back Online Notification */}
      {isOnline && showReconnectedToast && (
        <div className="pointer-events-auto bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md border border-emerald-400 flex items-center gap-2.5 text-xs">
          <Wifi className="w-4 h-4 text-emerald-200" />
          <span>Conexão restabelecida! Sincronizando dados...</span>
        </div>
      )}
    </div>
  );
};
