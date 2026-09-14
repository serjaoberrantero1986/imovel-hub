import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Layers, 
  Layout, 
  Edit3, 
  Sliders,
  Building2,
  Compass
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui';
import { DesignSystemTokensSection } from './design-system/DesignSystemTokensSection';
import { DesignSystemButtonsSection } from './design-system/DesignSystemButtonsSection';
import { DesignSystemFormsSection } from './design-system/DesignSystemFormsSection';
import { DesignSystemCardsBadgesSection } from './design-system/DesignSystemCardsBadgesSection';
import { DesignSystemOverlaysSection } from './design-system/DesignSystemOverlaysSection';
import { DesignSystemTablesSection } from './design-system/DesignSystemTablesSection';
import { DesignSystemFeedbackSection } from './design-system/DesignSystemFeedbackSection';
import { DesignSystemNavigationSection } from './design-system/DesignSystemNavigationSection';

export const DesignSystemView: React.FC = () => {
  const { theme, toggleTheme, addToast, setCurrentView } = useApp();

  // Active category tab in design system
  const [activeSection, setActiveSection] = useState<'tokens' | 'buttons' | 'forms' | 'cards_badges' | 'overlays' | 'tables_pagination' | 'feedback' | 'navigation'>('tokens');

  const sections = [
    { id: 'tokens', label: 'Tokens & Cores', icon: <Palette className="w-4 h-4" /> },
    { id: 'buttons', label: 'Botões', icon: <Layers className="w-4 h-4" /> },
    { id: 'forms', label: 'Inputs & Formulários', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'cards_badges', label: 'Cards & Badges', icon: <Building2 className="w-4 h-4" /> },
    { id: 'overlays', label: 'Modais & Drawers', icon: <Sliders className="w-4 h-4" /> },
    { id: 'tables_pagination', label: 'Tabelas & Paginação', icon: <Layout className="w-4 h-4" /> },
    { id: 'feedback', label: 'Alerts, Toasts & Skeletons', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'navigation', label: 'Navegação & Breadcrumbs', icon: <Compass className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600/90 text-white">
                Design System v2.0
              </span>
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Web Imóvel Architecture
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-['Outfit']">
              Guia Completo de Componentes & Tokens
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Sistema de design moderno, modular e responsivo construído especialmente para marketplaces e CRMs imobiliários de alto padrão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-slate-600 hover:bg-slate-800"
              onClick={toggleTheme}
            >
              Tema: {theme === 'dark' ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentView('portal')}
            >
              Ir ao Portal
            </Button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="sticky top-20 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSection === sec.id
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modular Sections */}
        {activeSection === 'tokens' && <DesignSystemTokensSection />}
        {activeSection === 'buttons' && <DesignSystemButtonsSection />}
        {activeSection === 'forms' && <DesignSystemFormsSection />}
        {activeSection === 'cards_badges' && (
          <DesignSystemCardsBadgesSection onShowToast={title => addToast({ type: 'info', title })} />
        )}
        {activeSection === 'overlays' && (
          <DesignSystemOverlaysSection onToast={(type, title, message) => addToast({ type, title, message })} />
        )}
        {activeSection === 'tables_pagination' && <DesignSystemTablesSection />}
        {activeSection === 'feedback' && (
          <DesignSystemFeedbackSection onToast={(type, title, message) => addToast({ type, title, message })} />
        )}
        {activeSection === 'navigation' && (
          <DesignSystemNavigationSection
            onHomeClick={() => setCurrentView('portal')}
            onToast={(type, title) => addToast({ type, title })}
          />
        )}

      </div>
    </div>
  );
};
