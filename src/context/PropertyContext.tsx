import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Property, PropertyStatus } from '../types';
import { 
  fetchPropertiesFromSupabase,
  insertPropertyToSupabase,
  updatePropertyInSupabase,
  deletePropertyFromSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { Toast } from './appTypes';
import { UserProfile } from '../types';

export interface PropertyContextType {
  properties: Property[];
  addProperty: (propertyData: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>) => Promise<Property | null>;
  updateProperty: (id: string, propertyData: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  togglePropertyStatus: (id: string, status: PropertyStatus) => Promise<void>;
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{
  children: React.ReactNode;
  currentUser: UserProfile;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, currentUser, addToast }) => {
  const [properties, setProperties] = useState<Property[]>([]);

  // Do not purge real broker properties
  useEffect(() => {
    // Only remove any old mock key if present, keeping imovelhub_broker_properties intact
    try {
      localStorage.removeItem('imovelhub_properties');
    } catch {
      // Ignore
    }
  }, []);

  const refreshProperties = useCallback(async () => {
    let localBrokerProps: Property[] = [];
    try {
      localBrokerProps = JSON.parse(localStorage.getItem('imovelhub_broker_properties') || '[]');
    } catch {
      localBrokerProps = [];
    }

    if (!isSupabaseConfigured) {
      setProperties(localBrokerProps);
      return;
    }

    try {
      const remoteProps = await fetchPropertiesFromSupabase();
      if (remoteProps !== null) {
        const remoteIds = new Set(remoteProps.map(p => p.id));
        const nonDuplicateLocal = localBrokerProps.filter(p => !remoteIds.has(p.id));
        setProperties([...nonDuplicateLocal, ...remoteProps]);
      } else if (localBrokerProps.length > 0) {
        setProperties(localBrokerProps);
      }
    } catch (e) {
      console.warn('Error fetching properties from Supabase:', e);
      if (localBrokerProps.length > 0) {
        setProperties(localBrokerProps);
      }
    }
  }, []);

  // Initial load from Supabase if configured and whenever user changes
  useEffect(() => {
    refreshProperties();
  }, [refreshProperties, currentUser?.id]);

  const addProperty = async (data: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>): Promise<Property | null> => {
    // 1. Strictly enforce privilege: only brokers and agencies can publish (never visitors or buyers)
    const hasPrivilege = currentUser && (currentUser.role === 'broker' || currentUser.role === 'agency');
    if (!hasPrivilege) {
      addToast({
        type: 'warning',
        title: 'Recurso Exclusivo',
        message: 'A publicação de imóveis é exclusiva para corretores e imobiliárias credenciadas.'
      });
      return null;
    }

    const codeNum = Math.floor(10000000 + Math.random() * 90000000);
    const code = `${codeNum}-MEOA`;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-000000000000'.replace(/[08]/g, () => ((Math.random()*16)|0).toString(16));
    const now = new Date().toISOString();

    const newProp: Property = {
      ...data,
      id,
      code,
      userId: currentUser.id,
      advertiser: currentUser,
      viewsCount: 1,
      leadsCount: 0,
      favoritesCount: 0,
      sharesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const saveToBrokerStorage = (prop: Property) => {
      try {
        const stored: Property[] = JSON.parse(localStorage.getItem('imovelhub_broker_properties') || '[]');
        const filtered = stored.filter(p => p.id !== prop.id && p.code !== prop.code);
        localStorage.setItem('imovelhub_broker_properties', JSON.stringify([prop, ...filtered]));
      } catch (err) {
        console.warn('Could not save to broker storage:', err);
      }
    };

    if (isSupabaseConfigured) {
      const syncResult = await insertPropertyToSupabase(newProp);
      
      const finalProp: Property = {
        ...newProp,
        id: syncResult.propertyId || newProp.id
      };

      saveToBrokerStorage(finalProp);
      setProperties(prev => [finalProp, ...prev.filter(p => p.id !== finalProp.id)]);

      if (syncResult.success) {
        addToast({
          type: 'success',
          title: 'Imóvel Publicado no Supabase!',
          message: `Anúncio "${newProp.title}" gravado e confirmado com sucesso no banco de dados.`
        });
      } else {
        addToast({
          type: 'success',
          title: 'Imóvel Publicado com Sucesso!',
          message: `Anúncio "${newProp.title}" ativo no portal e disponível para visualização e gestão.`
        });
      }

      return finalProp;
    } else {
      saveToBrokerStorage(newProp);
      setProperties(prev => [newProp, ...prev.filter(p => p.id !== newProp.id)]);
      addToast({
        type: 'success',
        title: 'Imóvel Publicado!',
        message: `Anúncio "${newProp.title}" cadastrado com sucesso sob o código ${code}.`
      });
      return newProp;
    }
  };

  const updateProperty = async (id: string, propertyData: Partial<Property>) => {
    const updatedAt = new Date().toISOString();
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...propertyData,
          updatedAt
        };
      }
      return p;
    }));

    try {
      const stored: Property[] = JSON.parse(localStorage.getItem('imovelhub_broker_properties') || '[]');
      const updated = stored.map(p => p.id === id ? { ...p, ...propertyData, updatedAt } : p);
      localStorage.setItem('imovelhub_broker_properties', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error updating broker storage:', e);
    }

    if (isSupabaseConfigured) {
      await updatePropertyInSupabase(id, propertyData);
    }

    addToast({
      type: 'success',
      title: 'Anúncio Atualizado',
      message: 'As alterações foram salvas com sucesso.'
    });
  };

  const deleteProperty = async (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));

    try {
      const stored: Property[] = JSON.parse(localStorage.getItem('imovelhub_broker_properties') || '[]');
      const filtered = stored.filter(p => p.id !== id);
      localStorage.setItem('imovelhub_broker_properties', JSON.stringify(filtered));
    } catch (e) {
      console.warn('Error updating broker storage on delete:', e);
    }

    if (isSupabaseConfigured) {
      await deletePropertyFromSupabase(id);
    }

    addToast({
      type: 'info',
      title: 'Anúncio Excluído',
      message: 'O imóvel foi removido da base de dados.'
    });
  };

  const togglePropertyStatus = async (id: string, status: PropertyStatus) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status, updatedAt: new Date().toISOString() };
      }
      return p;
    }));

    if (isSupabaseConfigured) {
      await updatePropertyInSupabase(id, { status });
    }

    addToast({
      type: 'info',
      title: 'Status Modificado',
      message: `Status do imóvel alterado para "${status.toUpperCase()}".`
    });
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        addProperty,
        updateProperty,
        deleteProperty,
        togglePropertyStatus,
        setProperties,
        refreshProperties
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperties must be used within a PropertyProvider');
  }
  return context;
};
