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
  isAuthenticated?: boolean;
  openAuthModal?: (tab?: 'login' | 'signup' | 'forgot') => void;
  properties: Property[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, currentUser, isAuthenticated = false, openAuthModal, properties, addToast }) => {
  // Favorite IDs scoped per user, empty for guests
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      return [];
    }
    const saved = localStorage.getItem(`imovelhub_favorites_${currentUser.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Sync favorites when user switches or logs in/out
  useEffect(() => {
    if (isAuthenticated && currentUser.id !== 'guest_buyer') {
      const key = `imovelhub_favorites_${currentUser.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setFavoriteIds(JSON.parse(saved));
        } catch {
          setFavoriteIds([]);
        }
      } else {
        setFavoriteIds([]);
      }
      refreshPreferences();
    } else {
      setFavoriteIds([]);
    }
  }, [currentUser.id, isAuthenticated]);

  // Comparison IDs persisted across page reloads (empty by default, cleans permanently)
  const [comparisonIds, setComparisonIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('imovelhub_comparisons');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('imovelhub_comparisons', JSON.stringify(comparisonIds));
  }, [comparisonIds]);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // Saved searches scoped per user
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      return [];
    }
    const saved = localStorage.getItem(`imovelhub_saved_searches_${currentUser.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Sync saved searches when user switches
  useEffect(() => {
    if (isAuthenticated && currentUser.id !== 'guest_buyer') {
      const key = `imovelhub_saved_searches_${currentUser.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setSavedSearches(JSON.parse(saved));
        } catch {
          setSavedSearches([]);
        }
      } else {
        setSavedSearches([]);
      }
    } else {
      setSavedSearches([]);
    }
  }, [currentUser.id, isAuthenticated]);

  const refreshPreferences = async () => {
    if (!isSupabaseConfigured || !isAuthenticated || currentUser.id === 'guest_buyer') return;
    try {
      const remoteFavs = await fetchFavoritesFromSupabase(currentUser.id);
      if (remoteFavs) {
        setFavoriteIds(remoteFavs);
        localStorage.setItem(`imovelhub_favorites_${currentUser.id}`, JSON.stringify(remoteFavs));
      }
      const remoteSearches = await fetchSavedSearchesFromSupabase(currentUser.id);
      if (remoteSearches && remoteSearches.length > 0) {
        setSavedSearches(remoteSearches);
        localStorage.setItem(`imovelhub_saved_searches_${currentUser.id}`, JSON.stringify(remoteSearches));
      }
    } catch (e) {
      console.warn('Error fetching favorites or saved searches:', e);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      addToast({
        type: 'warning',
        title: 'Login Necessário',
        message: 'Faça login na sua conta para salvar imóveis em seus favoritos.'
      });
      if (openAuthModal) {
        openAuthModal('login');
      }
      return;
    }

    const key = `imovelhub_favorites_${currentUser.id}`;
    const exists = favoriteIds.includes(propertyId);
    const newFavStatus = !exists;
    const nextFavs = exists ? favoriteIds.filter(id => id !== propertyId) : [...favoriteIds, propertyId];

    if (isSupabaseConfigured) {
      const saved = await toggleFavoriteInSupabase(currentUser.id, propertyId, newFavStatus);
      if (!saved) {
        addToast({ type: 'error', title: 'Não foi possível atualizar favoritos', message: 'O banco de dados não confirmou a alteração.' });
        return;
      }
    }
    setFavoriteIds(nextFavs);
    localStorage.setItem(key, JSON.stringify(nextFavs));
    addToast(exists ? { type: 'info', title: 'Removido dos Favoritos' } : { type: 'success', title: 'Adicionado aos Favoritos!' });
  };

  const isFavorite = (propertyId: string) => favoriteIds.includes(propertyId);

  const toggleComparison = (propertyId: string) => {
    const isAlreadyIn = comparisonIds.includes(propertyId);
    if (isAlreadyIn) {
      const next = comparisonIds.filter(id => id !== propertyId);
      setComparisonIds(next);
      localStorage.setItem('imovelhub_comparisons', JSON.stringify(next));
      addToast({ type: 'info', title: 'Imóvel removido da comparação' });
    } else {
      if (comparisonIds.length >= 4) {
        addToast({ type: 'warning', title: 'Limite Atingido', message: 'Você pode comparar no máximo 4 imóveis simultaneamente.' });
        return;
      }
      const next = [...comparisonIds, propertyId];
      setComparisonIds(next);
      localStorage.setItem('imovelhub_comparisons', JSON.stringify(next));
      addToast({ type: 'success', title: 'Adicionado ao Comparador', message: `${next.length} de 4 selecionados.` });
    }
  };

  const clearComparison = () => {
    setComparisonIds([]);
    localStorage.setItem('imovelhub_comparisons', JSON.stringify([]));
    addToast({ type: 'info', title: 'Comparador limpo com sucesso' });
  };

  const saveCurrentSearch = async (title: string, alertFrequency: SavedSearch['alertFrequency'] = 'daily') => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      addToast({
        type: 'warning',
        title: 'Login Necessário',
        message: 'Faça login na sua conta para salvar buscas e receber alertas.'
      });
      if (openAuthModal) {
        openAuthModal('login');
      }
      return;
    }

    const searchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `search-${Date.now()}`;
    const newSearch: SavedSearch = {
      id: searchId,
      userId: currentUser.id,
      title: title || 'Busca Personalizada',
      filters: { ...filters },
      alertFrequency,
      matchCount: properties.length,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const saved = await insertSavedSearchToSupabase(newSearch);
      if (!saved) {
        addToast({ type: 'error', title: 'Não foi possível salvar a busca', message: 'O banco de dados não confirmou a alteração.' });
        return;
      }
    }
    const nextSearches = [newSearch, ...savedSearches];
    setSavedSearches(nextSearches);
    localStorage.setItem(`imovelhub_saved_searches_${currentUser.id}`, JSON.stringify(nextSearches));

    addToast({
      type: 'success',
      title: 'Busca Salva no Supabase!',
      message: `Você receberá alertas ${alertFrequency === 'instant' ? 'instantâneos' : 'diários'} com novos imóveis compatíveis.`
    });
  };

  const deleteSavedSearch = async (id: string) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') return;
    if (isSupabaseConfigured) {
      const deleted = await deleteSavedSearchFromSupabase(id);
      if (!deleted) { addToast({ type: 'error', title: 'Não foi possível remover o alerta' }); return; }
    }
    const nextSearches = savedSearches.filter(s => s.id !== id);
    setSavedSearches(nextSearches);
    localStorage.setItem(`imovelhub_saved_searches_${currentUser.id}`, JSON.stringify(nextSearches));
    addToast({ type: 'info', title: 'Alerta de busca removido' });
  };

  const updateSavedSearchAlert = async (id: string, alertFrequency: SavedSearch['alertFrequency']) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') return;
    if (isSupabaseConfigured) {
      const saved = await updateSavedSearchAlertInSupabase(id, alertFrequency);
      if (!saved) { addToast({ type: 'error', title: 'Não foi possível atualizar o alerta' }); return; }
    }
    const nextSearches = savedSearches.map(s => s.id === id ? { ...s, alertFrequency } : s);
    setSavedSearches(nextSearches);
    localStorage.setItem(`imovelhub_saved_searches_${currentUser.id}`, JSON.stringify(nextSearches));
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
