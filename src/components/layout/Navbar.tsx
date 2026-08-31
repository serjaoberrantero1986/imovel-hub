import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Heart, 
  Scale, 
  PlusCircle, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  MessageSquare, 
  Palette,
  Sparkles,
  Hash,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    theme, 
    toggleTheme, 
    favoriteIds, 
    comparisonIds, 
    conversations,
    setIsWizardOpen,
    setEditingProperty,
    setFilters,
    properties
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navCodeModalOpen, setNavCodeModalOpen] = useState(false);
  const [navCodeInput, setNavCodeInput] = useState('');

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
  };

  const handleNavCodeSearch = (codeToSearch?: string) => {
    const code = (codeToSearch || navCodeInput).trim();
    if (code) {
      setFilters(prev => ({ ...prev, propertyCode: code }));
      setCurrentView('search');
      setNavCodeModalOpen(false);
      setNavCodeInput('');
      setMobileMenuOpen(false);
    }
  };

  const codeMatches = navCodeInput.trim()
    ? properties.filter(p => p.code.toLowerCase().includes(navCodeInput.trim().toLowerCase()))
    : properties.slice(0, 4);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-8">
            <button 
              id="brand-logo-btn"
              onClick={() => handleNavigate('portal')}
              className="flex items-center gap-3 group text-left focus:outline-none cursor-pointer"
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
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                  currentView === 'search' ? 'text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                Comprar
              </button>
              <button
                id="nav-alugar-btn"
                onClick={() => handleNavigate('search', 'rent')}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Alugar
              </button>
              <button
                id="nav-lancamentos-btn"
                onClick={() => handleNavigate('search', 'launch')}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lançamentos</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
              <button
                id="nav-mapa-btn"
                onClick={() => handleNavigate('search')}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Explorar no Mapa</span>
              </button>
              <button
                id="nav-design-system-btn"
                onClick={() => handleNavigate('design_system')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'design_system'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-indigo-600/80 hover:text-indigo-600 dark:text-indigo-400/80 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30'
                }`}
                title="Visualizar Componentes e Tokens do Design System"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Design System</span>
              </button>
            </nav>
          </div>

          {/* Right Action Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Property Code Search trigger button */}
            <button
              id="btn-code-search-nav"
              onClick={() => setNavCodeModalOpen(true)}
              title="Buscar por código do imóvel"
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold font-mono"
            >
              <Hash className="w-4 h-4 text-rose-500" />
              <span className="hidden xl:inline text-[11px]">Código</span>
            </button>

            {/* Comparison button */}
            {comparisonIds.length > 0 && (
              <button
                id="btn-comparator-nav"
                onClick={() => handleNavigate('comparator')}
                title="Comparar imóveis lado a lado"
                className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-slate-700" />
              ) : (
                <Sun className="w-5 h-5 text-amber-400" />
              )}
            </button>

            {/* Anunciar Imóvel CTA */}
            <Button
              id="cta-anunciar-imovel"
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={handleStartNewListing}
              className="hidden sm:inline-flex"
            >
              Anunciar Imóvel
            </Button>

            {/* Dedicated User Menu Dropdown */}
            <UserMenu />

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
            id="mobile-code-search"
            onClick={() => {
              setMobileMenuOpen(false);
              setNavCodeModalOpen(true);
            }}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs flex items-center justify-center gap-2 mb-2"
          >
            <Hash className="w-4 h-4 text-rose-500" />
            <span>Buscar por Código do Imóvel</span>
          </button>

          <button
            id="mobile-design-system"
            onClick={() => handleNavigate('design_system')}
            className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 mb-2"
          >
            <Palette className="w-4 h-4" />
            <span>Guia & Componentes do Design System</span>
          </button>

          <Button
            id="mobile-anunciar-cta"
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              handleStartNewListing();
              setMobileMenuOpen(false);
            }}
          >
            Publicar Anúncio de Imóvel
          </Button>
        </div>
      )}

      {/* Property Code Search Modal */}
      {navCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-rose-500" />
                <span>Localizar Imóvel por Código</span>
              </h3>
              <button onClick={() => setNavCodeModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o código identificador único do imóvel para ir direto aos detalhes ou resultados.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleNavCodeSearch(); }} className="space-y-3">
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={navCodeInput}
                  onChange={(e) => setNavCodeInput(e.target.value)}
                  placeholder="Ex: 10849201 ou 10849201-MEOA"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Sample list */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {navCodeInput.trim() ? 'Imóveis Encontrados:' : 'Exemplos no Catálogo:'}
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {codeMatches.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleNavCodeSearch(p.code)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-rose-600 dark:text-rose-400"># {p.code}</span>
                          <span className="text-[10px] font-sans font-normal text-slate-500 truncate max-w-[180px]">{p.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.neighborhood} • {formatCurrency(p.price)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNavCodeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!navCodeInput.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  Buscar Imóvel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
