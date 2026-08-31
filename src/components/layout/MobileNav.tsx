import React from 'react';
import { 
  Home, 
  Search, 
  Heart, 
  Scale, 
  Users, 
  LayoutDashboard, 
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
  Menu
} from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    favoriteIds, 
    comparisonIds, 
    conversations,
    leads, 
    currentUser 
  } = useApp();

  const totalUnread = (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const isBroker = currentUser?.role === 'broker';

  const navItems: { 
    id: AppView; 
    label: string; 
    icon: React.FC<{ className?: string }>; 
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'portal', label: 'Início', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
    { 
      id: 'favorites', 
      label: 'Favoritos', 
      icon: Heart, 
      badge: (favoriteIds || []).length,
      badgeColor: 'bg-rose-600'
    },
    ...(isBroker ? [
      { 
        id: 'crm_leads' as AppView, 
        label: 'Leads', 
        icon: Users, 
        badge: (leads || []).length,
        badgeColor: 'bg-indigo-600'
      },
      { 
        id: 'messages' as AppView, 
        label: 'Chat', 
        icon: MessageSquare, 
        badge: totalUnread,
        badgeColor: 'bg-emerald-600'
      }
    ] : [
      { 
        id: 'comparator' as AppView, 
        label: 'Comparar', 
        icon: Scale, 
        badge: (comparisonIds || []).length,
        badgeColor: 'bg-indigo-600'
      },
      { 
        id: 'messages' as AppView, 
        label: 'Chat', 
        icon: MessageSquare, 
        badge: totalUnread,
        badgeColor: 'bg-emerald-600'
      }
    ])
  ];

  return (
    <nav 
      aria-label="Menu inferior mobile" 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 px-1 pt-1.5 transition-colors duration-200 safe-bottom-fixed shadow-[0_-8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_20px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-bottom-nav-${item.id}`}
              onClick={() => {
                setCurrentView(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
                isActive 
                  ? 'text-rose-600 dark:text-rose-400 font-extrabold' 
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {/* Active Background Pill */}
              {isActive && (
                <div className="absolute inset-0 bg-rose-50 dark:bg-rose-950/60 rounded-2xl -z-10 animate-fadeIn" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
                
                {/* Notification Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full ${item.badgeColor || 'bg-rose-600'} text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 transition-all ${isActive ? 'font-black scale-105' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
