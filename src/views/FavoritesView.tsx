import React from 'react';
import { Heart, ArrowRight, Search, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/properties/PropertyCard';

export const FavoritesView: React.FC = () => {
  const { properties, favoriteIds, setCurrentView } = useApp();

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
              Clique no ícone de coração nos anúncios que mais gostar para salvá-los e compará-los com facilidade.
            </p>
            <button
              onClick={() => setCurrentView('search')}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md inline-flex items-center gap-2"
            >
              <span>Explorar Imóveis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
