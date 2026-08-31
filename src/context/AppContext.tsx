import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Property, 
  UserProfile, 
  Lead, 
  LeadTask,
  LeadInteraction,
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
import { 
  fetchPropertiesFromSupabase,
  insertPropertyToSupabase,
  updatePropertyInSupabase,
  deletePropertyFromSupabase,
  fetchLeadsFromSupabase,
  insertLeadToSupabase,
  updateLeadInSupabase,
  deleteLeadFromSupabase,
  fetchConversationsFromSupabase,
  insertMessageToSupabase,
  fetchFavoritesFromSupabase,
  toggleFavoriteInSupabase,
  fetchSavedSearchesFromSupabase,
  insertSavedSearchToSupabase,
  deleteSavedSearchFromSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured } from '../lib/supabaseClient';

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
  | 'design_system'
  | 'security_audit';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppContextType {
  // Database sync state
  isDbConnected: boolean;
  isSyncing: boolean;
  refreshData: () => Promise<void>;

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
  addProperty: (propertyData: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>) => Promise<Property>;
  updateProperty: (id: string, propertyData: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  togglePropertyStatus: (id: string, status: PropertyStatus) => Promise<void>;
  
  // Leads & CRM
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  updateLeadStatus: (leadId: string, status: Lead['status'], notes?: string) => Promise<void>;
  updateLeadNotes: (leadId: string, notes: string, privateNotes?: string) => Promise<void>;
  addLeadTask: (leadId: string, task: Omit<LeadTask, 'id'>) => Promise<void>;
  toggleLeadTask: (leadId: string, taskId: string) => Promise<void>;
  deleteLeadTask: (leadId: string, taskId: string) => Promise<void>;
  addLeadInteraction: (leadId: string, interaction: Omit<LeadInteraction, 'id' | 'createdAt'>) => Promise<void>;
  addLeadTag: (leadId: string, tag: string) => Promise<void>;
  removeLeadTag: (leadId: string, tag: string) => Promise<void>;
  toggleLeadInterestProperty: (leadId: string, propertyId: string) => Promise<void>;
  toggleLeadPrivacy: (leadId: string) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  
  // Messages & Chat
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  startOrOpenConversation: (propertyId: string) => void;
  
  // Favorites & Comparisons
  favoriteIds: string[];
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  
  comparisonIds: string[];
  toggleComparison: (propertyId: string) => void;
  clearComparison: () => void;
  
  // Filters & Saved Searches
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  savedSearches: SavedSearch[];
  saveCurrentSearch: (title: string, alertFreq?: SavedSearch['alertFrequency']) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
  
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
  searchTerm: '',
  propertyCode: ''
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDbConnected] = useState<boolean>(isSupabaseConfigured);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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

  // --------------------------------------------------------------------------
  // Properties State & Sync
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Leads & CRM State & Sync
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Conversations State & Sync
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Favorites State & Sync
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Comparison State
  // --------------------------------------------------------------------------
  const [comparisonIds, setComparisonIds] = useState<string[]>(['prop-1', 'prop-3']);

  // --------------------------------------------------------------------------
  // Filters & Saved Searches State
  // --------------------------------------------------------------------------
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

  // Property Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Toasts Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --------------------------------------------------------------------------
  // ASYNC INITIAL DATABASE FETCH & HYDRATION
  // --------------------------------------------------------------------------
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      // 1. Fetch properties
      const remoteProps = await fetchPropertiesFromSupabase();
      if (remoteProps && remoteProps.length > 0) {
        setProperties(remoteProps);
      }

      // 2. Fetch leads
      const remoteLeads = await fetchLeadsFromSupabase();
      if (remoteLeads && remoteLeads.length > 0) {
        setLeads(remoteLeads);
      }

      // 3. Fetch conversations
      const remoteConvs = await fetchConversationsFromSupabase(currentUser.id);
      if (remoteConvs && remoteConvs.length > 0) {
        setConversations(remoteConvs);
      }

      // 4. Fetch favorites
      const remoteFavs = await fetchFavoritesFromSupabase(currentUser.id);
      if (remoteFavs) {
        setFavoriteIds(remoteFavs);
      }

      // 5. Fetch saved searches
      const remoteSearches = await fetchSavedSearchesFromSupabase(currentUser.id);
      if (remoteSearches && remoteSearches.length > 0) {
        setSavedSearches(remoteSearches);
      }
    } catch (e) {
      console.warn('Error during Supabase initial synchronization:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --------------------------------------------------------------------------
  // REAL CRUD ACTIONS FOR PROPERTIES
  // --------------------------------------------------------------------------
  const addProperty = async (data: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount' | 'favoritesCount' | 'sharesCount' | 'advertiser' | 'userId'>): Promise<Property> => {
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

    // Optimistic state update
    setProperties(prev => [newProp, ...prev]);

    // Persist to Supabase Database
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
    // Optimistic local update
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

    // Persist to Supabase Database
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
    // Optimistic local delete
    setProperties(prev => prev.filter(p => p.id !== id));

    // Persist to Supabase Database
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

  // --------------------------------------------------------------------------
  // REAL CRUD ACTIONS FOR LEADS
  // --------------------------------------------------------------------------
  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Local state
    setLeads(prev => [newLead, ...prev]);
    setProperties(prev => prev.map(p => p.id === leadData.propertyId ? { ...p, leadsCount: p.leadsCount + 1 } : p));

    // Persist to Supabase Database
    if (isSupabaseConfigured) {
      await insertLeadToSupabase(newLead);
      if (leadData.propertyId) {
        const prop = properties.find(p => p.id === leadData.propertyId);
        if (prop) {
          await updatePropertyInSupabase(prop.id, { leadsCount: prop.leadsCount + 1 });
        }
      }
    }

    addToast({
      type: 'success',
      title: 'Mensagem Enviada!',
      message: 'O anunciante recebeu seu contato no banco de dados e responderá em breve.'
    });
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));

    if (isSupabaseConfigured) {
      await updateLeadInSupabase(leadId, updates);
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status'], notes?: string) => {
    const stageNameMap: Record<string, string> = {
      new: 'NOVO LEAD',
      contacted: 'CONTATO REALIZADO',
      interested: 'INTERESSADO',
      visit_scheduled: 'VISITA AGENDADA',
      proposal: 'PROPOSTA',
      negotiation: 'NEGOCIAÇÃO',
      closed_won: 'FECHADO',
      lost: 'PERDIDO'
    };

    const newInteraction = {
      id: `int-${Date.now()}`,
      leadId,
      type: 'status_change' as const,
      title: `Estágio alterado para ${stageNameMap[status] || status}`,
      description: notes || `Lead movimentado no funil de vendas para a etapa ${stageNameMap[status] || status}.`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name
    };

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const interactions = l.interactions ? [newInteraction, ...l.interactions] : [newInteraction];
        return {
          ...l,
          status,
          notes: notes !== undefined ? notes : l.notes,
          interactions,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));

    if (isSupabaseConfigured) {
      await updateLeadInSupabase(leadId, { status, notes });
    }

    addToast({
      type: 'info',
      title: 'Funil CRM Atualizado',
      message: `Lead movido para a etapa "${stageNameMap[status] || status}".`
    });
  };

  const updateLeadNotes = async (leadId: string, notes: string, privateNotes?: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          notes,
          privateNotes: privateNotes !== undefined ? privateNotes : l.privateNotes,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));
    if (isSupabaseConfigured) {
      await updateLeadInSupabase(leadId, { notes });
    }
  };

  const addLeadTask = async (leadId: string, taskData: Omit<LeadTask, 'id'>) => {
    const newTask: LeadTask = {
      ...taskData,
      id: `task-${Date.now()}`
    };

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const tasks = l.tasks ? [...l.tasks, newTask] : [newTask];
        return { ...l, tasks, updatedAt: new Date().toISOString() };
      }
      return l;
    }));

    addToast({
      type: 'success',
      title: 'Tarefa Criada',
      message: `Tarefa "${newTask.title}" agendada com sucesso.`
    });
  };

  const toggleLeadTask = async (leadId: string, taskId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.tasks) {
        const tasks = l.tasks.map(t => {
          if (t.id === taskId) {
            const nextCompleted = !t.completed;
            return {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : undefined
            };
          }
          return t;
        });
        return { ...l, tasks, updatedAt: new Date().toISOString() };
      }
      return l;
    }));
  };

  const deleteLeadTask = async (leadId: string, taskId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.tasks) {
        return { ...l, tasks: l.tasks.filter(t => t.id !== taskId), updatedAt: new Date().toISOString() };
      }
      return l;
    }));
    addToast({ type: 'info', title: 'Tarefa removida' });
  };

  const addLeadInteraction = async (leadId: string, interactionData: Omit<LeadInteraction, 'id' | 'createdAt'>) => {
    const newInt: LeadInteraction = {
      ...interactionData,
      id: `int-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const interactions = l.interactions ? [newInt, ...l.interactions] : [newInt];
        return { 
          ...l, 
          interactions, 
          lastContactDate: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
      }
      return l;
    }));

    addToast({
      type: 'success',
      title: 'Histórico Registrado',
      message: 'Nova interação adicionada à timeline do cliente.'
    });
  };

  const addLeadTag = async (leadId: string, tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const currentTags = l.tags || [];
        if (!currentTags.includes(cleanTag)) {
          return { ...l, tags: [...currentTags, cleanTag], updatedAt: new Date().toISOString() };
        }
      }
      return l;
    }));
  };

  const removeLeadTag = async (leadId: string, tag: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.tags) {
        return { ...l, tags: l.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() };
      }
      return l;
    }));
  };

  const toggleLeadInterestProperty = async (leadId: string, propertyId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const current = l.interestedPropertyIds || [];
        const isSelected = current.includes(propertyId);
        const nextIds = isSelected ? current.filter(id => id !== propertyId) : [...current, propertyId];
        return { ...l, interestedPropertyIds: nextIds, updatedAt: new Date().toISOString() };
      }
      return l;
    }));
    addToast({
      type: 'info',
      title: 'Imóveis de Interesse Atualizados',
      message: 'A carteira de interesse do cliente foi atualizada.'
    });
  };

  const toggleLeadPrivacy = async (leadId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const nextRestricted = !l.accessRestricted;
        return { ...l, accessRestricted: nextRestricted, updatedAt: new Date().toISOString() };
      }
      return l;
    }));
    addToast({
      type: 'info',
      title: 'Segurança de Dados',
      message: 'Configuração de privacidade e controle de acesso atualizada.'
    });
  };

  const deleteLead = async (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (isSupabaseConfigured) {
      await deleteLeadFromSupabase(leadId);
    }
    addToast({
      type: 'info',
      title: 'Lead Excluído',
      message: 'O lead foi removido da sua carteira.'
    });
  };

  // --------------------------------------------------------------------------
  // REAL CRUD ACTIONS FOR MESSAGES
  // --------------------------------------------------------------------------
  const sendMessage = async (conversationId: string, text: string) => {
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

    if (isSupabaseConfigured) {
      await insertMessageToSupabase(newMsg, conversationId);
    }
  };

  const startOrOpenConversation = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    const conv = conversations.find(c => c.propertyId === propertyId);
    if (!conv) {
      const convId = `conv-${Date.now()}`;
      const firstMsg = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        text: `Olá! Tenho interesse no imóvel ${prop.code} (${prop.title}). Poderia me passar mais informações?`,
        createdAt: new Date().toISOString(),
        read: true
      };

      const newConv: Conversation = {
        id: convId,
        propertyId: prop.id,
        propertyTitle: prop.title,
        propertyImage: prop.media[0]?.thumbnailUrl || prop.media[0]?.url,
        propertyPrice: prop.price,
        otherUser: prop.advertiser,
        lastMessage: 'Conversa iniciada',
        lastMessageTime: 'Hoje',
        unreadCount: 0,
        messages: [firstMsg]
      };

      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);

      if (isSupabaseConfigured) {
        insertMessageToSupabase(firstMsg, convId);
      }
    } else {
      setActiveConversationId(conv.id);
    }
    setCurrentView('messages');
  };

  // --------------------------------------------------------------------------
  // FAVORITES
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // COMPARISON ACTIONS
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // SAVED SEARCHES
  // --------------------------------------------------------------------------
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

  return (
    <AppContext.Provider
      value={{
        isDbConnected,
        isSyncing,
        refreshData,
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
        updateLead,
        updateLeadStatus,
        updateLeadNotes,
        addLeadTask,
        toggleLeadTask,
        deleteLeadTask,
        addLeadInteraction,
        addLeadTag,
        removeLeadTag,
        toggleLeadInterestProperty,
        toggleLeadPrivacy,
        deleteLead,
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
