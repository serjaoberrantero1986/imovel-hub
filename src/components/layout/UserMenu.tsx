import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  LayoutDashboard, 
  Building2, 
  Users, 
  MessageSquare, 
  Heart, 
  Scale, 
  BookmarkCheck, 
  LogOut, 
  CheckCircle2, 
  ChevronDown,
  Sparkles,
  ShieldAlert,
  Settings,
  Moon,
  Sun
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../ui/Badge';

export const UserMenu: React.FC = () => {
  const { 
    currentUser, 
    switchUserRole, 
    setCurrentView, 
    leads, 
    favoriteIds, 
    comparisonIds, 
    conversations,
    savedSearches,
    theme,
    toggleTheme
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNav = (view: any) => {
    setCurrentView(view);
    setIsOpen(false);
  };

  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div ref={menuRef} className="relative inline-block text-left shrink-0">
      <button
        id="user-profile-menu-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 shrink-0 cursor-pointer"
      >
        <div className="relative shrink-0 flex items-center justify-center">
          <img
            src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
            alt={currentUser.name}
            className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] aspect-square rounded-lg object-cover ring-2 ring-rose-500/20 shrink-0"
          />
          {currentUser.verified && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>

        <div className="hidden xl:block text-left pr-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
            {currentUser.name.split(' ')[0]}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {currentUser.role === 'broker' ? 'CRECI ' + (currentUser.creci || 'Ativo') : 'Cliente'}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Card */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt={currentUser.name}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  {currentUser.verified && (
                    <Badge variant="verified" size="sm" className="py-0 px-1 text-[9px]">
                      Verificado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.email}
                </p>
                {currentUser.role === 'broker' && currentUser.agencyName && (
                  <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                    {currentUser.agencyName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation items for Broker / Buyer */}
          <div className="py-1.5 text-xs sm:text-sm font-medium">
            {currentUser.role === 'broker' ? (
              <>
                <button
                  onClick={() => handleNav('dashboard')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                    <span>Painel & Analytics</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('my_properties')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-rose-500" />
                    <span>Meus Anúncios</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('crm_leads')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>CRM & Gestão de Leads</span>
                  </div>
                  {leads.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {leads.length}
                    </span>
                  )}
                </button>
              </>
            ) : null}

            <button
              onClick={() => handleNav('messages')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span>Mensagens e Chats</span>
              </div>
              {unreadMessages > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-white">
                  {unreadMessages}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('favorites')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Favoritos Salvos</span>
              </div>
              {favoriteIds.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {favoriteIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('comparator')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Scale className="w-4 h-4 text-indigo-500" />
                <span>Comparador de Imóveis</span>
              </div>
              {comparisonIds.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {comparisonIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('saved_searches')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <BookmarkCheck className="w-4 h-4 text-sky-500" />
                <span>Alertas e Buscas Salvas</span>
              </div>
              {savedSearches.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {savedSearches.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('security_audit')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <span>Segurança & Auditoria</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Ativo
              </span>
            </button>
          </div>

          {/* Role Switcher, Theme & Options */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 px-2 space-y-1">
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {theme === 'light' ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                {theme === 'light' ? 'OFF' : 'ON'}
              </span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                switchUserRole(currentUser.role === 'broker' ? 'buyer' : 'broker');
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Alternar para {currentUser.role === 'broker' ? 'Comprador' : 'Corretor Pro'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
