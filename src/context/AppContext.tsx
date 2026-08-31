import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Property, 
  UserProfile, 
  Lead, 
  Conversation, 
  FilterState, 
  SavedSearch,
  PropertyStatus 
} from '../types';
import { 
  INITIAL_PROPERTIES, 
  BROKERS, 
  INITIAL_LEADS, 
  INITIAL_CONVERSATIONS 
} from '../lib/mockData';

export type AppView = 
  | 'portal' 
  | 'search' 
  | 'property_detail' 
  | 'dashboard' 
  | 'my_properties' 
  | 'crm_leads' 
  | 'messages' 
  | 'favorites' 
  | 'saved_searches'
  | 'comparator'
  | 'design_system';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppContextType {
  // Navigation & View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedPropertyId: string | null;
  openPropertyDetail: (id: string) => void;
  
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Auth User
  currentUser: UserProfile;
  switchUserRole: (role: 'broker' | 'buyer') => void;
  
  // Properties CRUD
  properties: Property[];
  addProperty: (propertyData: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>) => Property;
  updateProperty: (id: string, propertyData: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  togglePropertyStatus: (id: string, status: PropertyStatus) => void;
  
  // Leads & CRM
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLeadStatus: (leadId: string, status: Lead['status'], notes?: string) => void;
  updateLeadNotes: (leadId: string, notes: string) => void;
  
  // Messages & Chat
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (conversationId: string, text: string) => void;
  startOrOpenConversation: (propertyId: string) => void;
  
  // Favorites & Comparisons
  favoriteIds: string[];
  toggleFavorite: (propertyId: string) => void;
  isFavorite: (propertyId: string) => boolean;
  
  comparisonIds: string[];
  toggleComparison: (propertyId: string) => void;
  clearComparison: () => void;
  
  // Filters & Saved Searches
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  savedSearches: SavedSearch[];
  saveCurrentSearch: (title: string, alertFreq?: SavedSearch['alertFrequency']) => void;
  deleteSavedSearch: (id: string) => void;
  
  // Wizard Modal
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
  editingProperty: Property | null;
  setEditingProperty: (property: Property | null) => void;
  
  // Notification Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_FILTERS: FilterState = {
  purpose: 'all',
  types: [],
  city: 'all',
  neighborhoods: [],
  bedrooms: 'any',
  suites: 'any',
  bathrooms: 'any',
  parkingSpots: 'any',
  amenities: [],
  sortBy: 'relevance',
  searchTerm: ''
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('imovelhub_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('imovelhub_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Auth User
  const [currentUser, setCurrentUser] = useState<UserProfile>(BROKERS[2]);

  const switchUserRole = (role: 'broker' | 'buyer') => {
    if (role === 'broker') {
      setCurrentUser(BROKERS[2]);
      addToast({ type: 'info', title: 'Perfil de Corretor Ativo', message: 'Acesso completo ao Dashboard, CRM e Gestão de Anúncios.' });
    } else {
      setCurrentUser({
        id: 'buyer_guest',
        name: 'Ana Carolina Meireles',
        email: 'ana.meireles@email.com',
        phone: '(15) 99182-7364',
        role: 'buyer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
      });
      addToast({ type: 'info', title: 'Perfil de Comprador Ativo', message: 'Navegação como cliente interessado em buscar imóveis.' });
    }
  };

  // Navigation
  const [currentView, setCurrentView] = useState<AppView>('portal');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>('prop-1');

  const openPropertyDetail = (id: string) => {
    setSelectedPropertyId(id);
    setCurrentView('property_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Properties State with localStorage fallback
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
    localStorage.setItem('imovelhub_properties', JSON.stringify(properties));
  }, [properties]);

  // CRUD Actions
  const addProperty = (data: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>): Property => {
    const codeNum = Math.floor(10000000 + Math.random() * 90000000);
    const code = `${codeNum}-MEOA`;
    const id = `prop-${Date.now()}`;
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
    addToast({
      type: 'success',
      title: 'Imóvel Publicado!',
      message: `Anúncio "${newProp.title}" cadastrado com sucesso sob o código ${code}.`
    });
    return newProp;
  };

  const updateProperty = (id: string, propertyData: Partial<Property>) => {
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
    addToast({
      type: 'success',
      title: 'Anúncio Atualizado',
      message: 'As alterações foram salvas com sucesso.'
    });
  };

  const deleteProperty = (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    addToast({
      type: 'info',
      title: 'Anúncio Excluído',
      message: 'O imóvel foi removido da sua base de anúncios.'
    });
  };

  const togglePropertyStatus = (id: string, status: PropertyStatus) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status, updatedAt: new Date().toISOString() };
      }
      return p;
    }));
    addToast({
      type: 'info',
      title: 'Status Modificado',
      message: `Status do imóvel alterado para "${status.toUpperCase()}".`
    });
  };

  // Leads & CRM State
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('imovelhub_leads');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_LEADS;
  });

  useEffect(() => {
    localStorage.setItem('imovelhub_leads', JSON.stringify(leads));
  }, [leads]);

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setLeads(prev => [newLead, ...prev]);
    // increment leadsCount in property
    setProperties(prev => prev.map(p => p.id === leadData.propertyId ? { ...p, leadsCount: p.leadsCount + 1 } : p));
    addToast({
      type: 'success',
      title: 'Mensagem Enviada!',
      message: 'O anunciante recebeu seu contato e responderá em breve.'
    });
  };

  const updateLeadStatus = (leadId: string, status: Lead['status'], notes?: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status,
          notes: notes !== undefined ? notes : l.notes,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));
    addToast({
      type: 'info',
      title: 'Lead Atualizado',
      message: `Lead movido para a etapa "${status.replace('_', ' ').toUpperCase()}".`
    });
  };

  const updateLeadNotes = (leadId: string, notes: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes, updatedAt: new Date().toISOString() } : l));
  };

  // Conversations State
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('imovelhub_conversations');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('imovelhub_conversations', JSON.stringify(conversations));
  }, [conversations]);

  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date().toISOString();
    const newMsg = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text,
      createdAt: now,
      read: true
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: text,
          lastMessageTime: 'Agora',
          messages: [...conv.messages, newMsg]
        };
      }
      return conv;
    }));
  };

  const startOrOpenConversation = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    let conv = conversations.find(c => c.propertyId === propertyId);
    if (!conv) {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        propertyId: prop.id,
        propertyTitle: prop.title,
        propertyImage: prop.media[0]?.thumbnailUrl || prop.media[0]?.url,
        propertyPrice: prop.price,
        otherUser: prop.advertiser,
        lastMessage: 'Conversa iniciada',
        lastMessageTime: 'Hoje',
        unreadCount: 0,
        messages: [
          {
            id: `msg-${Date.now()}`,
            conversationId: `conv-${Date.now()}`,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatarUrl,
            text: `Olá! Tenho interesse no imóvel ${prop.code} (${prop.title}). Poderia me passar mais informações?`,
            createdAt: new Date().toISOString(),
            read: true
          }
        ]
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    } else {
      setActiveConversationId(conv.id);
    }
    setCurrentView('messages');
  };

  // Favorites State
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

  const toggleFavorite = (propertyId: string) => {
    setFavoriteIds(prev => {
      const exists = prev.includes(propertyId);
      if (exists) {
        addToast({ type: 'info', title: 'Removido dos Favoritos' });
        return prev.filter(id => id !== propertyId);
      } else {
        addToast({ type: 'success', title: 'Adicionado aos Favoritos!' });
        return [...prev, propertyId];
      }
    });
  };

  const isFavorite = (propertyId: string) => favoriteIds.includes(propertyId);

  // Comparison State (Max 4)
  const [comparisonIds, setComparisonIds] = useState<string[]>(['prop-1', 'prop-3']);

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

  // Filters State
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // Saved Searches
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

  const saveCurrentSearch = (title: string, alertFrequency: SavedSearch['alertFrequency'] = 'daily') => {
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
    addToast({
      type: 'success',
      title: 'Busca Salva com Sucesso!',
      message: `Você receberá alertas ${alertFrequency === 'instant' ? 'instantâneos' : 'diários'} com novos imóveis compatíveis.`
    });
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    addToast({ type: 'info', title: 'Alerta de busca removido' });
  };

  // Property Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Toasts Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedPropertyId,
        openPropertyDetail,
        theme,
        toggleTheme,
        currentUser,
        switchUserRole,
        properties,
        addProperty,
        updateProperty,
        deleteProperty,
        togglePropertyStatus,
        leads,
        addLead,
        updateLeadStatus,
        updateLeadNotes,
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        startOrOpenConversation,
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
        isWizardOpen,
        setIsWizardOpen,
        editingProperty,
        setEditingProperty,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
