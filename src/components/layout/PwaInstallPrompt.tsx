import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share, 
  PlusSquare, 
  X, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  Building2 
} from 'lucide-react';
import { Button } from '../ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosTutorial, setShowIosTutorial] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if dismissed before
    const hasDismissed = localStorage.getItem('imovelhub_pwa_dismissed');

    // Listen for BeforeInstallPrompt event (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!hasDismissed && !isStandaloneMode) {
        // Show after a pleasant delay
        setTimeout(() => setShowPrompt(true), 3500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for manual trigger custom events
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        setShowPrompt(true);
      } else if (isIosDevice) {
        setShowIosTutorial(true);
      } else {
        setShowPrompt(true);
      }
    };
    window.addEventListener('trigger-pwa-install', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('trigger-pwa-install', handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowPrompt(false);
      setShowIosTutorial(true);
    } else {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('imovelhub_pwa_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Bottom Prompt Banner for Mobile */}
      {showPrompt && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white p-4 rounded-2xl sm:rounded-3xl border border-rose-500/30 shadow-2xl backdrop-blur-xl animate-slideUp">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-white font-['Outfit'] truncate">
                  Instalar App ImovelHub
                </h4>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold uppercase">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-tight">
                Acesse mais rápido, navegue em tela cheia e consulte imóveis mesmo offline.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Fechar banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Agora Não
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="flex-[2] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar Aplicativo</span>
            </Button>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIosTutorial && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-['Outfit']">
                  Instalar no iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIosTutorial(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Para instalar o <strong>ImovelHub</strong> na sua tela de início sem precisar da App Store:
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">1. Toque em Compartilhar</span>
                  <p className="text-[11px] text-slate-500">Na barra inferior do Safari</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">2. Adicionar à Tela de Início</span>
                  <p className="text-[11px] text-slate-500">Role para baixo e selecione a opção</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">3. Concluir</span>
                  <p className="text-[11px] text-slate-500">Toque em "Adicionar" no canto superior</p>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setShowIosTutorial(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
