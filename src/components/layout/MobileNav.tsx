import React from 'react';
import { Home, Search, Heart, LayoutDashboard, Users } from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, favoriteIds, leads, currentUser } = useApp();

  const navItems: { id: AppView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'portal', label: 'Início', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'favorites', label: 'Favoritos', icon: Heart, badge: favoriteIds.length },
    ...(currentUser.role === 'broker' ? [
      { id: 'crm_leads' as AppView, label: 'Leads', icon: Users, badge: leads.length },
      { id: 'dashboard' as AppView, label: 'Painel', icon: LayoutDashboard }
    ] : [
      { id: 'comparator' as AppView, label: 'Comparar', icon: LayoutDashboard }
    ])
  ];

  return (
    <nav aria-label="Navegação mobile" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 transition-colors">
      <div className="flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => {
                setCurrentView(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive 
                  ? 'text-rose-600 dark:text-rose-400 font-bold scale-105' 
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
