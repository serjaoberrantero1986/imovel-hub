import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AmenityCatalogItem, fetchAmenitiesCatalog } from '../lib/amenitiesCatalog';
import { fetchPropertyTypesCatalog, PropertyTypeCatalogItem } from '../lib/propertyTypesCatalog';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_FOOTER_SETTINGS, fetchFooterSettings, FooterSettings } from '../lib/portalSettings';

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
  footerSettings: FooterSettings;
  loadingFooterSettings: boolean;
  footerSettingsError: string | null;
  refreshFooterSettings: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [amenities, setAmenities] = useState<AmenityCatalogItem[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [amenitiesError, setAmenitiesError] = useState<string | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeCatalogItem[]>([]);
  const [loadingPropertyTypes, setLoadingPropertyTypes] = useState(true);
  const [propertyTypesError, setPropertyTypesError] = useState<string | null>(null);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [loadingFooterSettings, setLoadingFooterSettings] = useState(true);
  const [footerSettingsError, setFooterSettingsError] = useState<string | null>(null);

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

  const refreshFooterSettings = useCallback(async () => {
    setLoadingFooterSettings(true);
    try { setFooterSettings(await fetchFooterSettings()); setFooterSettingsError(null); }
    catch { setFooterSettingsError('Não foi possível atualizar o rodapé. O conteúdo padrão foi preservado.'); }
    finally { setLoadingFooterSettings(false); }
  }, []);

  useEffect(() => {
    void refreshAmenities();
    void refreshPropertyTypes();
    void refreshFooterSettings();
    if (!supabase) return;
    const channel = supabase.channel('features-catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => void refreshAmenities())
      .subscribe();
    const propertyTypesChannel = supabase.channel('property-types-catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_types_catalog' }, () => void refreshPropertyTypes())
      .subscribe();
    const portalSettingsChannel = supabase.channel('portal-settings-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_settings' }, () => void refreshFooterSettings())
      .subscribe();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshAmenities(), 0);
      window.setTimeout(() => void refreshPropertyTypes(), 0);
      window.setTimeout(() => void refreshFooterSettings(), 0);
    });
    return () => {
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(channel);
      void supabase.removeChannel(propertyTypesChannel);
      void supabase.removeChannel(portalSettingsChannel);
    };
  }, [refreshAmenities, refreshPropertyTypes, refreshFooterSettings]);

  const activeAmenities = useMemo(() => amenities.filter(item => item.isActive), [amenities]);
  const activePropertyTypes = useMemo(() => propertyTypes.filter(item => item.isActive), [propertyTypes]);
  return <CatalogContext.Provider value={{ amenities, activeAmenities, loadingAmenities, amenitiesError, refreshAmenities, propertyTypes, activePropertyTypes, loadingPropertyTypes, propertyTypesError, refreshPropertyTypes, footerSettings, loadingFooterSettings, footerSettingsError, refreshFooterSettings }}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog deve ser utilizado dentro de CatalogProvider.');
  return context;
};
