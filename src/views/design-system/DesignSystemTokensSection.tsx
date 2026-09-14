import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';

export const DesignSystemTokensSection: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Color Palette Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Paleta Cromática do Marketplace</CardTitle>
          <CardDescription>
            Matizes calibrados com alto contraste e elegância para o mercado imobiliário premium.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brand Rose */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Cores de Destaque & Conversão (Brand Rose)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {[
                { name: 'Rose 50', hex: '#fff1f2', bg: 'bg-rose-50', text: 'text-slate-800' },
                { name: 'Rose 100', hex: '#ffe4e6', bg: 'bg-rose-100', text: 'text-slate-800' },
                { name: 'Rose 500', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-white' },
                { name: 'Rose 600 (Primary)', hex: '#e11d48', bg: 'bg-rose-600', text: 'text-white font-bold' },
                { name: 'Rose 700', hex: '#be123c', bg: 'bg-rose-700', text: 'text-white' },
                { name: 'Rose 900', hex: '#881337', bg: 'bg-rose-900', text: 'text-white' },
              ].map(c => (
                <div key={c.name} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className={`h-16 ${c.bg} flex items-center justify-center p-2 text-center text-xs ${c.text}`}>
                    {c.hex}
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center text-xs font-medium truncate">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Neutrals Slate */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Neutros Sofisticados (Slate / Obsidian)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {[
                { name: 'Slate 50', hex: '#f8fafc', bg: 'bg-slate-50', text: 'text-slate-800' },
                { name: 'Slate 200', hex: '#e2e8f0', bg: 'bg-slate-200', text: 'text-slate-800' },
                { name: 'Slate 600', hex: '#475569', bg: 'bg-slate-600', text: 'text-white' },
                { name: 'Slate 800', hex: '#1e293b', bg: 'bg-slate-800', text: 'text-white' },
                { name: 'Slate 900', hex: '#0f172a', bg: 'bg-slate-900', text: 'text-white' },
                { name: 'Slate 950 (Dark Canvas)', hex: '#090d16', bg: 'bg-slate-950', text: 'text-white font-bold' },
              ].map(c => (
                <div key={c.name} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className={`h-16 ${c.bg} flex items-center justify-center p-2 text-center text-xs ${c.text}`}>
                    {c.hex}
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center text-xs font-medium truncate">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Functional Accents */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Cores de Ação e Status
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                Emerald (Sucesso / CRECI / Verificado)
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-bold">
                Indigo (Locação / Analytics / Comparador)
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
                Amber (Oportunidade / Alerta / Lançamento)
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold">
                Red (Alerta Crítico / Exclusão / Cancelamento)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Scale */}
      <Card>
        <CardHeader>
          <CardTitle>Hierarquia Tipográfica</CardTitle>
          <CardDescription>
            Par de fontes modernas: <strong>Outfit</strong> para títulos imobiliários de destaque e <strong>Plus Jakarta Sans</strong> para leitura confortável.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-3">
            <div>
              <span className="text-xs text-slate-400 font-mono">H1 / Display (Outfit Extrabold 36px/40px)</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                Mansão Suspensa em Condomínio Fechado
              </h1>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">H2 / Section Title (Outfit Bold 24px)</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                Detalhes do Imóvel & Infraestrutura de Lazer
              </h2>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">H3 / Card Title (Outfit Bold 18px)</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                Apartamento Alto Padrão - 4 Suítes
              </h3>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">Body / Regular (Plus Jakarta Sans 14px/16px)</span>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                Excelente oportunidade no bairro Campolim com acabamento em mármore importado, varanda gourmet envidraçada, automação residencial completa e vista panorâmica privilegiada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
