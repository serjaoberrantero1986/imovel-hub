import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Property, PropertyStatus } from '../types';
import { INITIAL_PROPERTIES } from '../lib/mockData';
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
  addProperty: (propertyData: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>) => Promise<Property>;
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
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('imovelhub_properties');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored properties:', e);
      }
    }
    return INITIAL_PROPERTIES;
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('imovelhub_properties', JSON.stringify(properties));
    }
  }, [properties]);

  const refreshProperties = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const remoteProps = await fetchPropertiesFromSupabase();
      if (remoteProps !== null) {
        setProperties(remoteProps);
      }
    } catch (e) {
      console.warn('Error fetching properties from Supabase:', e);
    }
  }, []);

  // Initial load from Supabase if configured and whenever user changes
  useEffect(() => {
    if (isSupabaseConfigured) {
      refreshProperties();
    }
  }, [refreshProperties, currentUser?.id]);

  const addProperty = async (data: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>): Promise<Property> => {
    const codeNum = Math.floor(10000000 + Math.random() * 90000000);
    const code = `${codeNum}-MEOA`;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prop-${Date.now()}`;
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

    setProperties(prev => [newProp, ...prev]);

    if (isSupabaseConfigured) {
      const synced = await insertPropertyToSupabase(newProp);
      if (synced) {
        addToast({
          type: 'success',
          title: 'Gravado no Supabase!',
          message: `Imóvel "${newProp.title}" sincronizado com o banco de dados.`
        });
      }
    } else {
      addToast({
        type: 'success',
        title: 'Imóvel Publicado!',
        message: `Anúncio "${newProp.title}" cadastrado com sucesso sob o código ${code}.`
      });
    }

    return newProp;
  };

  const updateProperty = async (id: string, propertyData: Partial<Property>) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...propertyData,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    if (isSupabaseConfigured) {
      await updatePropertyInSupabase(id, propertyData);
    }

    addToast({
      type: 'success',
      title: 'Anúncio Atualizado',
      message: 'As alterações foram salvas com sucesso no banco de dados.'
    });
  };

  const deleteProperty = async (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));

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
