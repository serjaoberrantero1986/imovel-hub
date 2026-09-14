import React, { createContext, useContext, useState, useEffect } from 'react';
import { FilterState, SavedSearch, Property } from '../types';
import { DEFAULT_FILTERS } from './appTypes';
import { 
  fetchFavoritesFromSupabase,
  toggleFavoriteInSupabase,
  fetchSavedSearchesFromSupabase,
  insertSavedSearchToSupabase,
  deleteSavedSearchFromSupabase,
  updateSavedSearchAlertInSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { Toast } from './appTypes';
import { UserProfile } from '../types';

export interface SearchPreferencesContextType {
  favoriteIds: string[];
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  comparisonIds: string[];
  toggleComparison: (propertyId: string) => void;
  clearComparison: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  savedSearches: SavedSearch[];
  saveCurrentSearch: (title: string, alertFreq?: SavedSearch['alertFrequency']) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
  updateSavedSearchAlert: (id: string, alertFrequency: SavedSearch['alertFrequency']) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const SearchPreferencesContext = createContext<SearchPreferencesContextType | undefined>(undefined);

export const SearchPreferencesProvider: React.FC<{
  children: React.ReactNode;
  currentUser: UserProfile;
  properties: Property[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, currentUser, properties, addToast }) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('imovelhub_favorites');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return ['prop-1', 'prop-2'];
  });

  useEffect(() => {
    localStorage.setItem('imovelhub_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const [comparisonIds, setComparisonIds] = useState<string[]>(['prop-1', 'prop-3']);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('imovelhub_saved_searches');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'search-1',
        userId: 'user_current',
        title: 'Apartamentos no Centro ou Campolim com 2+ quartos',
        filters: {
          purpose: 'sale',
          types: ['apartment'],
          city: 'Sorocaba',
          bedrooms: 2
        },
        alertFrequency: 'daily',
        matchCount: 14,
        createdAt: '2026-08-25T10:00:00Z'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('imovelhub_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  const refreshPreferences = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const remoteFavs = await fetchFavoritesFromSupabase(currentUser.id);
      if (remoteFavs) {
        setFavoriteIds(remoteFavs);
      }
      const remoteSearches = await fetchSavedSearchesFromSupabase(currentUser.id);
      if (remoteSearches && remoteSearches.length > 0) {
        setSavedSearches(remoteSearches);
      }
    } catch (e) {
      console.warn('Error fetching favorites or saved searches:', e);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    const exists = favoriteIds.includes(propertyId);
    const newFavStatus = !exists;

    setFavoriteIds(prev => {
      if (exists) {
        addToast({ type: 'info', title: 'Removido dos Favoritos' });
        return prev.filter(id => id !== propertyId);
      } else {
        addToast({ type: 'success', title: 'Adicionado aos Favoritos!' });
        return [...prev, propertyId];
      }
    });

    if (isSupabaseConfigured) {
      await toggleFavoriteInSupabase(currentUser.id, propertyId, newFavStatus);
    }
  };

  const isFavorite = (propertyId: string) => favoriteIds.includes(propertyId);

  const toggleComparison = (propertyId: string) => {
    setComparisonIds(prev => {
      if (prev.includes(propertyId)) {
        addToast({ type: 'info', title: 'Imóvel removido da comparação' });
        return prev.filter(id => id !== propertyId);
      }
      if (prev.length >= 4) {
        addToast({ type: 'warning', title: 'Limite Atingido', message: 'Você pode comparar no máximo 4 imóveis simultaneamente.' });
        return prev;
      }
      addToast({ type: 'success', title: 'Adicionado ao Comparador', message: `${prev.length + 1} de 4 selecionados.` });
      return [...prev, propertyId];
    });
  };

  const clearComparison = () => setComparisonIds([]);

  const saveCurrentSearch = async (title: string, alertFrequency: SavedSearch['alertFrequency'] = 'daily') => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      userId: currentUser.id,
      title: title || 'Busca Personalizada',
      filters: { ...filters },
      alertFrequency,
      matchCount: properties.length,
      createdAt: new Date().toISOString()
    };

    setSavedSearches(prev => [newSearch, ...prev]);

    if (isSupabaseConfigured) {
      await insertSavedSearchToSupabase(newSearch);
    }

    addToast({
      type: 'success',
      title: 'Busca Salva no Supabase!',
      message: `Você receberá alertas ${alertFrequency === 'instant' ? 'instantâneos' : 'diários'} com novos imóveis compatíveis.`
    });
  };

  const deleteSavedSearch = async (id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    if (isSupabaseConfigured) {
      await deleteSavedSearchFromSupabase(id);
    }
    addToast({ type: 'info', title: 'Alerta de busca removido' });
  };

  const updateSavedSearchAlert = async (id: string, alertFrequency: SavedSearch['alertFrequency']) => {
    setSavedSearches(prev => prev.map(s => s.id === id ? { ...s, alertFrequency } : s));
    if (isSupabaseConfigured) {
      await updateSavedSearchAlertInSupabase(id, alertFrequency);
    }
    addToast({
      type: 'success',
      title: 'Frequência de Alerta Atualizada',
      message: alertFrequency === 'none' 
        ? 'Alertas desativados para esta busca.' 
        : `Alertas configurados para frequência ${alertFrequency === 'instant' ? 'instantânea' : alertFrequency === 'daily' ? 'diária' : 'semanal'}.`
    });
  };

  return (
    <SearchPreferencesContext.Provider
      value={{
        favoriteIds,
        toggleFavorite,
        isFavorite,
        comparisonIds,
        toggleComparison,
        clearComparison,
        filters,
        setFilters,
        resetFilters,
        savedSearches,
        saveCurrentSearch,
        deleteSavedSearch,
        updateSavedSearchAlert,
        refreshPreferences
      }}
    >
      {children}
    </SearchPreferencesContext.Provider>
  );
};

export const useSearchPreferences = () => {
  const context = useContext(SearchPreferencesContext);
  if (!context) {
    throw new Error('useSearchPreferences must be used within a SearchPreferencesProvider');
  }
  return context;
};
