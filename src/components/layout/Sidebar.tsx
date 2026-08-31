import React, { useState } from 'react';
import { 
  Home, 
  Search, 
  LayoutDashboard, 
  Building2, 
  Users, 
  MessageSquare, 
  Heart, 
  Scale, 
  BookmarkCheck, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: initialCollapsed = false,
  onToggleCollapse,
  className,
}) => {
  const { 
    currentView, 
    setCurrentView, 
    currentUser, 
    switchUserRole,
    theme,
    toggleTheme,
    leads, 
    favoriteIds, 
    comparisonIds, 
    conversations,
    savedSearches,
    setIsWizardOpen,
    setEditingProperty
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    setIsCollapsed(!isCollapsed);
    if (onToggleCollapse) onToggleCollapse();
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const mainNavItems = [
    { id: 'portal' as AppView, label: 'Portal Inicial', icon: Home },
    { id: 'search' as AppView, label: 'Buscar Imóveis', icon: Search },
    { id: 'favorites' as AppView, label: 'Favoritos', icon: Heart, badge: favoriteIds.length },
    { id: 'comparator' as AppView, label: 'Comparador', icon: Scale, badge: comparisonIds.length },
    { id: 'saved_searches' as AppView, label: 'Buscas Salvas', icon: BookmarkCheck, badge: savedSearches.length },
    { id: 'messages' as AppView, label: 'Mensagens', icon: MessageSquare, badge: totalUnread, badgeColor: 'bg-amber-500 text-white' },
  ];

  const brokerNavItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard & Métricas', icon: LayoutDashboard },
    { id: 'my_properties' as AppView, label: 'Meus Anúncios', icon: Building2 },
    { id: 'crm_leads' as AppView, label: 'CRM & Leads', icon: Users, badge: leads.length, badgeColor: 'bg-emerald-600 text-white' },
  ];

  return (
    <aside
      className={cn(
        'relative hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-30 select-none',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Top Header / Brand */}
      <div className="flex items-center justify-between p-4 h-18 border-b border-slate-100 dark:border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-['Outfit']">
                Imovel<span className="text-rose-600">Hub</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Pro Suite
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Action CTA: Anunciar Imóvel */}
      <div className="p-3">
        <Button
          variant="primary"
          size={isCollapsed ? 'sm' : 'md'}
          fullWidth
          leftIcon={<PlusCircle className="w-4 h-4 shrink-0" />}
          onClick={() => {
            setEditingProperty(null);
            setIsWizardOpen(true);
          }}
          title="Publicar novo anúncio"
        >
          {!isCollapsed && <span>Novo Anúncio</span>}
        </Button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        
        {/* Main section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Explorar
            </span>
          )}
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={item.label}
                className={cn(
                  'w-full flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                  isCollapsed ? 'justify-center' : 'justify-between',
                  isActive
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-rose-600 dark:text-rose-400 stroke-[2.2]' : 'text-slate-400')} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                      item.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Gestão Pro section (for brokers) */}
        {currentUser.role === 'broker' && (
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Gestão Pro
                </span>
                <Badge variant="verified" size="sm" className="py-0 px-1 text-[8px]">
                  CRECI
                </Badge>
              </div>
            )}
            {brokerNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.label}
                  className={cn(
                    'w-full flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                    isCollapsed ? 'justify-center' : 'justify-between',
                    isActive
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-rose-600 dark:text-rose-400 stroke-[2.2]' : 'text-slate-400')} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                        item.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom User info & Theme Switcher */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {!isCollapsed && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {currentUser.name.split(' ')[0]}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentUser.role === 'broker' ? 'Corretor' : 'Cliente'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              title="Alternar Tema"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        )}

        {isCollapsed && (
          <button
            onClick={toggleTheme}
            className="w-full flex justify-center p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Alternar Tema"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        )}
      </div>
    </aside>
  );
};
