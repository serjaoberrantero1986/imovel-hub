import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Heart, 
  Scale, 
  PlusCircle, 
  Sun, 
  Moon, 
  User, 
  Menu, 
  X, 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  CheckCircle2, 
  ChevronDown,
  Building
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    theme, 
    toggleTheme, 
    currentUser, 
    switchUserRole,
    favoriteIds,
    comparisonIds,
    conversations,
    setIsWizardOpen,
    setEditingProperty,
    setFilters
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleStartNewListing = () => {
    setEditingProperty(null);
    setIsWizardOpen(true);
  };

  const handleNavigate = (view: any, purpose?: any) => {
    if (purpose) {
      setFilters(prev => ({ ...prev, purpose }));
    }
    setCurrentView(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-8">
            <button 
              id="brand-logo-btn"
              onClick={() => handleNavigate('portal')}
              className="flex items-center gap-3 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-200">
                <Building2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-['Outfit']">
                    Imovel<span className="text-rose-600 dark:text-rose-500">Hub</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                    Pro
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Classificados & Gestão Imobiliária
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              <button
                id="nav-comprar-btn"
                onClick={() => handleNavigate('search', 'sale')}
                className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  currentView === 'search' ? 'text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                Comprar
              </button>
              <button
                id="nav-alugar-btn"
                onClick={() => handleNavigate('search', 'rent')}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                Alugar
              </button>
              <button
                id="nav-lancamentos-btn"
                onClick={() => handleNavigate('search', 'launch')}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
              >
                <span>Lançamentos</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
              <button
                id="nav-mapa-btn"
                onClick={() => handleNavigate('search')}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Explorar no Mapa</span>
              </button>
            </nav>
          </div>

          {/* Right Action Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Persona Switcher Pill (Broker / Buyer) */}
            <div className="hidden md:flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
              <button
                id="role-broker-toggle"
                onClick={() => switchUserRole('broker')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  currentUser.role === 'broker'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-rose-500" />
                <span>Corretor</span>
              </button>
              <button
                id="role-buyer-toggle"
                onClick={() => switchUserRole('buyer')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  currentUser.role === 'buyer'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cliente</span>
              </button>
            </div>

            {/* Comparison button */}
            {comparisonIds.length > 0 && (
              <button
                id="btn-comparator-nav"
                onClick={() => handleNavigate('comparator')}
                title="Comparar imóveis lado a lado"
                className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {comparisonIds.length}
                </span>
              </button>
            )}

            {/* Favorites button */}
            <button
              id="btn-favorites-nav"
              onClick={() => handleNavigate('favorites')}
              title="Meus Favoritos"
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Heart className={`w-5 h-5 ${favoriteIds.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-500 dark:text-slate-400'}`} />
              {favoriteIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {favoriteIds.length}
                </span>
              )}
            </button>

            {/* Messages button */}
            <button
              id="btn-messages-nav"
              onClick={() => handleNavigate('messages')}
              title="Mensagens e Chats"
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce">
                  {totalUnread}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-slate-700" />
              ) : (
                <Sun className="w-5 h-5 text-amber-400" />
              )}
            </button>

            {/* Anunciar Imóvel CTA */}
            <button
              id="cta-anunciar-imovel"
              onClick={handleStartNewListing}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-sm font-bold shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/30 transition-all active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Anunciar Imóvel</span>
            </button>

            {/* User Profile / Dashboard Menu */}
            <div className="relative">
              <button
                id="user-menu-button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-rose-500/20"
                />
                <div className="hidden xl:block text-left pr-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px]">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {currentUser.role === 'broker' ? 'CRECI ' + (currentUser.creci || 'Ativo') : 'Comprador'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      {currentUser.verified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                    {currentUser.agencyName && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {currentUser.agencyName}
                      </span>
                    )}
                  </div>

                  <div className="py-1 text-sm font-medium">
                    <button
                      id="dropdown-dashboard-btn"
                      onClick={() => handleNavigate('dashboard')}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      <span>Painel & Analytics</span>
                    </button>
                    <button
                      id="dropdown-my-listings-btn"
                      onClick={() => handleNavigate('my_properties')}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                    >
                      <Building2 className="w-4 h-4 text-rose-500" />
                      <span>Gerenciar Meus Imóveis</span>
                    </button>
                    <button
                      id="dropdown-crm-btn"
                      onClick={() => handleNavigate('crm_leads')}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                    >
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>CRM & Leads ({useApp().leads.length})</span>
                    </button>
                    <button
                      id="dropdown-messages-btn"
                      onClick={() => handleNavigate('messages')}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      <span>Mensagens de Clientes</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      id="dropdown-logout-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        switchUserRole(currentUser.role === 'broker' ? 'buyer' : 'broker');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      Alternar Perfil ({currentUser.role === 'broker' ? 'Mudar p/ Comprador' : 'Mudar p/ Corretor Pro'})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              id="mobile-comprar"
              onClick={() => handleNavigate('search', 'sale')}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 text-center"
            >
              Comprar
            </button>
            <button
              id="mobile-alugar"
              onClick={() => handleNavigate('search', 'rent')}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 text-center"
            >
              Alugar
            </button>
            <button
              id="mobile-lancamentos"
              onClick={() => handleNavigate('search', 'launch')}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 text-center"
            >
              Lançamentos
            </button>
            <button
              id="mobile-mapa"
              onClick={() => handleNavigate('search')}
              className="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-sm font-bold text-rose-600 dark:text-rose-400 text-center flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-4 h-4" />
              <span>Mapa</span>
            </button>
          </div>

          <button
            id="mobile-anunciar-cta"
            onClick={() => {
              handleStartNewListing();
              setMobileMenuOpen(false);
            }}
            className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar Anúncio de Imóvel</span>
          </button>
        </div>
      )}
    </header>
  );
};
