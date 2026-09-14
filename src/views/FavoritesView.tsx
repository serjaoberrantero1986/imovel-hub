import React from 'react';
import { Heart, ArrowRight, Search, Sparkles, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/properties/PropertyCard';

export const FavoritesView: React.FC = () => {
  const { properties, favoriteIds, setCurrentView, isAuthenticated, openAuthModal } = useApp();

  const favoritedProperties = properties.filter(p => favoriteIds.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">
                Meus Salvos
              </span>
              <span className="text-xs text-slate-400 font-medium">Lista de Desejos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Imóveis Favoritados
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Você tem {favoritedProperties.length} imóveis salvos para acompanhar variações de preço e disponibilidade
            </p>
          </div>

          <button
            onClick={() => setCurrentView('search')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Continuar Buscando
          </button>
        </div>

        {/* Guest Warning Banner */}
        {!isAuthenticated && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Você está navegando como visitante
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Faça login na sua conta para que seus imóveis favoritos fiquem salvos permanentemente na nuvem.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shrink-0 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Fazer Login</span>
            </button>
          </div>
        )}

        {/* List of Cards */}
        {favoritedProperties.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
              Sua lista de favoritos está vazia
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {!isAuthenticated 
                ? 'Faça login na sua conta para salvar seus imóveis prediletos e acompanhar alterações de preço e novidades.' 
                : 'Clique no ícone de coração nos anúncios que mais gostar para salvá-los e compará-los com facilidade.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isAuthenticated && (
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md inline-flex items-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Entrar ou Cadastrar</span>
                </button>
              )}
              <button
                onClick={() => setCurrentView('search')}
                className="px-6 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-sm inline-flex items-center gap-2"
              >
                <span>Explorar Imóveis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritedProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
