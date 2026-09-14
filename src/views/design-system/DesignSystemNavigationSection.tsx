import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Breadcrumbs } from '../../components/ui';
import { Sidebar } from '../../components/layout/Sidebar';

export const DesignSystemNavigationSection: React.FC<{
  onHomeClick: () => void;
  onToast: (type: 'success' | 'error' | 'info' | 'warning', title: string) => void;
}> = ({ onHomeClick, onToast }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Card>
        <CardHeader>
          <CardTitle>Estruturas de Navegação & Breadcrumbs</CardTitle>
          <CardDescription>
            Hierarquia de rotas, trilhas de navegação para SEO imobiliário e menus de usuário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Breadcrumbs */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Trilhas de Breadcrumb
            </h5>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <Breadcrumbs
                homeClick={onHomeClick}
                items={[
                  { label: 'Imóveis em São Paulo', onClick: () => onToast('info', 'São Paulo') },
                  { label: 'Sorocaba', onClick: () => onToast('info', 'Sorocaba') },
                  { label: 'Parque Campolim', onClick: () => onToast('info', 'Campolim') },
                  { label: 'Edifício Royal Park #9840' },
                ]}
              />
            </div>
          </div>

          {/* Sidebar Preview */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Preview da Sidebar Pro
            </h5>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 p-4 flex justify-center">
              <Sidebar className="shadow-lg rounded-2xl max-h-[500px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
