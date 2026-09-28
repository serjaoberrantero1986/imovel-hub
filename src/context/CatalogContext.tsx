import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AmenityCatalogItem, fetchAmenitiesCatalog } from '../lib/amenitiesCatalog';
import { fetchPropertyTypesCatalog, PropertyTypeCatalogItem } from '../lib/propertyTypesCatalog';
import { supabase } from '../lib/supabaseClient';

interface CatalogContextType {
  amenities: AmenityCatalogItem[];
  activeAmenities: AmenityCatalogItem[];
  loadingAmenities: boolean;
  amenitiesError: string | null;
  refreshAmenities: () => Promise<void>;
  propertyTypes: PropertyTypeCatalogItem[];
  activePropertyTypes: PropertyTypeCatalogItem[];
  loadingPropertyTypes: boolean;
  propertyTypesError: string | null;
  refreshPropertyTypes: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [amenities, setAmenities] = useState<AmenityCatalogItem[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [amenitiesError, setAmenitiesError] = useState<string | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeCatalogItem[]>([]);
  const [loadingPropertyTypes, setLoadingPropertyTypes] = useState(true);
  const [propertyTypesError, setPropertyTypesError] = useState<string | null>(null);

  const refreshAmenities = useCallback(async () => {
    setLoadingAmenities(true);
    try {
      const nextAmenities = await fetchAmenitiesCatalog();
      setAmenities(nextAmenities);
      setAmenitiesError(null);
    } catch {
      setAmenitiesError('Não foi possível atualizar as comodidades. A última lista carregada foi preservada.');
    } finally {
      setLoadingAmenities(false);
    }
  }, []);

  const refreshPropertyTypes = useCallback(async () => {
    setLoadingPropertyTypes(true);
    try { setPropertyTypes(await fetchPropertyTypesCatalog()); setPropertyTypesError(null); }
    catch { setPropertyTypesError('Não foi possível atualizar os tipos de imóveis. A última lista carregada foi preservada.'); }
    finally { setLoadingPropertyTypes(false); }
  }, []);

  useEffect(() => {
    void refreshAmenities();
    void refreshPropertyTypes();
    if (!supabase) return;
    const channel = supabase.channel('features-catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => void refreshAmenities())
      .subscribe();
    const propertyTypesChannel = supabase.channel('property-types-catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_types_catalog' }, () => void refreshPropertyTypes())
      .subscribe();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshAmenities(), 0);
      window.setTimeout(() => void refreshPropertyTypes(), 0);
    });
    return () => {
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(channel);
      void supabase.removeChannel(propertyTypesChannel);
    };
  }, [refreshAmenities, refreshPropertyTypes]);

  const activeAmenities = useMemo(() => amenities.filter(item => item.isActive), [amenities]);
  const activePropertyTypes = useMemo(() => propertyTypes.filter(item => item.isActive), [propertyTypes]);
  return <CatalogContext.Provider value={{ amenities, activeAmenities, loadingAmenities, amenitiesError, refreshAmenities, propertyTypes, activePropertyTypes, loadingPropertyTypes, propertyTypesError, refreshPropertyTypes }}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog deve ser utilizado dentro de CatalogProvider.');
  return context;
};
