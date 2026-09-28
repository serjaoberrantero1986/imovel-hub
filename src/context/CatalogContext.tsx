import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AmenityCatalogItem, fetchAmenitiesCatalog } from '../lib/amenitiesCatalog';
import { supabase } from '../lib/supabaseClient';

interface CatalogContextType {
  amenities: AmenityCatalogItem[];
  activeAmenities: AmenityCatalogItem[];
  loadingAmenities: boolean;
  refreshAmenities: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [amenities, setAmenities] = useState<AmenityCatalogItem[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);

  const refreshAmenities = useCallback(async () => {
    setLoadingAmenities(true);
    try {
      setAmenities(await fetchAmenitiesCatalog());
    } catch {
      setAmenities([]);
    } finally {
      setLoadingAmenities(false);
    }
  }, []);

  useEffect(() => {
    void refreshAmenities();
    if (!supabase) return;
    const channel = supabase.channel('features-catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => void refreshAmenities())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refreshAmenities]);

  const activeAmenities = useMemo(() => amenities.filter(item => item.isActive), [amenities]);
  return <CatalogContext.Provider value={{ amenities, activeAmenities, loadingAmenities, refreshAmenities }}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog deve ser utilizado dentro de CatalogProvider.');
  return context;
};
