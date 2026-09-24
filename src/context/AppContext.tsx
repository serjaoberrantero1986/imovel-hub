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
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { CreciVerificationResult } from '../lib/creciVerification';
import { AppView, LegalTab, Toast, DEFAULT_FILTERS } from './appTypes';
import { AuthProvider, useAuth, AuthContextType } from './AuthContext';
import { PropertyProvider, useProperties, PropertyContextType } from './PropertyContext';
import { CrmProvider, useCrm, CrmContextType } from './CrmContext';
import { ChatProvider, useChat, ChatContextType } from './ChatContext';
import { SearchPreferencesProvider, useSearchPreferences, SearchPreferencesContextType } from './SearchPreferencesContext';

export type { AppView, LegalTab, Toast };
export { DEFAULT_FILTERS };

export interface AppContextType extends 
  AuthContextType,
  Omit<PropertyContextType, 'setProperties'>,
  Omit<CrmContextType, 'setLeads' | 'refreshLeads'>,
  Omit<ChatContextType, 'setConversations' | 'refreshConversations'>,
  Omit<SearchPreferencesContextType, 'refreshPreferences'> {
  // Database sync state
  isDbConnected: boolean;
  setIsDbConnected: (connected: boolean) => void;
  isSyncing: boolean;
  refreshData: () => Promise<void>;

  // Navigation & View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedPropertyId: string | null;
  openPropertyDetail: (id: string) => void;
  activeLegalTab: LegalTab;
  setActiveLegalTab: (tab: LegalTab) => void;
  openLegalPage: (tab?: LegalTab) => void;
  
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
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

const AppContext = createContext<AppContextType | undefined>(undefined);

// Internal AppConsumerProvider combines all slice hooks into the unified AppContext
const AppCompositeProvider: React.FC<{
  children: React.ReactNode;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}> = ({ children, toasts, addToast, removeToast }) => {
  const [isDbConnected, setIsDbConnected] = useState<boolean>(() => isSupabaseConfigured);
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

  // Navigation
  const [currentView, setCurrentView] = useState<AppView>('portal');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>('prop-1');
  const [activeLegalTab, setActiveLegalTab] = useState<LegalTab>('terms');

  const openPropertyDetail = (id: string) => {
    setSelectedPropertyId(id);
    setCurrentView('property_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLegalPage = (tab: LegalTab = 'terms') => {
    setActiveLegalTab(tab);
    setCurrentView('legal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Wizard
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Consume child contexts
  const auth = useAuth();
  const propertyCtx = useProperties();
  const crm = useCrm();
  const chat = useChat();
  const searchPref = useSearchPreferences();

  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        propertyCtx.refreshProperties(),
        crm.refreshLeads(),
        chat.refreshConversations(),
        searchPref.refreshPreferences()
      ]);
    } catch (e) {
      console.warn('Error during Supabase initial synchronization:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [propertyCtx, crm, chat, searchPref]);

  const compositeValue: AppContextType = {
    isDbConnected,
    setIsDbConnected,
    isSyncing,
    refreshData,
    currentView,
    setCurrentView,
    selectedPropertyId,
    openPropertyDetail,
    activeLegalTab,
    setActiveLegalTab,
    openLegalPage,
    theme,
    toggleTheme,
    isWizardOpen,
    setIsWizardOpen,
    editingProperty,
    setEditingProperty,
    toasts,
    addToast,
    removeToast,
    // Auth slice
    currentUser: auth.currentUser,
    isAuthenticated: auth.isAuthenticated,
    authModalOpen: auth.authModalOpen,
    setAuthModalOpen: auth.setAuthModalOpen,
    authModalTab: auth.authModalTab,
    setAuthModalTab: auth.setAuthModalTab,
    openAuthModal: auth.openAuthModal,
    closeAuthModal: auth.closeAuthModal,
    login: auth.login,
    loginWithGoogle: auth.loginWithGoogle,
    signUp: auth.signUp,
    logout: auth.logout,
    deleteAccount: auth.deleteAccount,
    updateUserProfile: auth.updateUserProfile,
    verifyCreci: auth.verifyCreci,
    switchUserRole: auth.switchUserRole,
    // Property slice
    properties: propertyCtx.properties,
    addProperty: propertyCtx.addProperty,
    updateProperty: propertyCtx.updateProperty,
    deleteProperty: propertyCtx.deleteProperty,
    togglePropertyStatus: propertyCtx.togglePropertyStatus,
    refreshProperties: propertyCtx.refreshProperties,
    // CRM slice
    leads: crm.leads,
    viewedLeadIds: crm.viewedLeadIds,
    unreadLeadsCount: crm.unreadLeadsCount,
    markLeadAsViewed: crm.markLeadAsViewed,
    addLead: crm.addLead,
    updateLead: crm.updateLead,
    updateLeadStatus: crm.updateLeadStatus,
    updateLeadNotes: crm.updateLeadNotes,
    addLeadTask: crm.addLeadTask,
    toggleLeadTask: crm.toggleLeadTask,
    deleteLeadTask: crm.deleteLeadTask,
    addLeadInteraction: crm.addLeadInteraction,
    addLeadTag: crm.addLeadTag,
    removeLeadTag: crm.removeLeadTag,
    toggleLeadInterestProperty: crm.toggleLeadInterestProperty,
    toggleLeadPrivacy: crm.toggleLeadPrivacy,
    deleteLead: crm.deleteLead,
    // Chat slice
    conversations: chat.conversations,
    activeConversationId: chat.activeConversationId,
    setActiveConversationId: chat.setActiveConversationId,
    markAsRead: chat.markAsRead,
    sendMessage: chat.sendMessage,
    startOrOpenConversation: chat.startOrOpenConversation,
    setConversationArchived: chat.setConversationArchived,
    // Search & Preferences slice
    favoriteIds: searchPref.favoriteIds,
    toggleFavorite: searchPref.toggleFavorite,
    isFavorite: searchPref.isFavorite,
    comparisonIds: searchPref.comparisonIds,
    toggleComparison: searchPref.toggleComparison,
    clearComparison: searchPref.clearComparison,
    filters: searchPref.filters,
    setFilters: searchPref.setFilters,
    resetFilters: searchPref.resetFilters,
    savedSearches: searchPref.savedSearches,
    saveCurrentSearch: searchPref.saveCurrentSearch,
    deleteSavedSearch: searchPref.deleteSavedSearch,
    updateSavedSearchAlert: searchPref.updateSavedSearchAlert
  };

  return (
    <AppContext.Provider value={compositeValue}>
      {children}
    </AppContext.Provider>
  );
};

// Outer context wrapper for nested slices with shared toast system
const InnerLayers: React.FC<{
  children: React.ReactNode;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}> = ({ children, toasts, addToast, removeToast }) => {
  const auth = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('portal');

  return (
    <PropertyProvider currentUser={auth.currentUser} addToast={addToast}>
      <PropertyBridge toasts={toasts} addToast={addToast} removeToast={removeToast} currentView={currentView} setCurrentView={setCurrentView}>
        {children}
      </PropertyBridge>
    </PropertyProvider>
  );
};

const PropertyBridge: React.FC<{
  children: React.ReactNode;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}> = ({ children, toasts, addToast, removeToast, setCurrentView }) => {
  const auth = useAuth();
  const propertyCtx = useProperties();

  return (
    <CrmProvider
      currentUser={auth.currentUser}
      properties={propertyCtx.properties}
      setProperties={propertyCtx.setProperties}
      addToast={addToast}
    >
      <ChatProvider
        currentUser={auth.currentUser}
        isAuthenticated={auth.isAuthenticated}
        openAuthModal={auth.openAuthModal}
        properties={propertyCtx.properties}
        setCurrentView={setCurrentView}
        addToast={addToast}
      >
        <SearchPreferencesProvider
          currentUser={auth.currentUser}
          isAuthenticated={auth.isAuthenticated}
          openAuthModal={auth.openAuthModal}
          properties={propertyCtx.properties}
          addToast={addToast}
        >
          <AppCompositeProvider toasts={toasts} addToast={addToast} removeToast={removeToast}>
            {children}
          </AppCompositeProvider>
        </SearchPreferencesProvider>
      </ChatProvider>
    </CrmProvider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toasts Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <AuthProvider addToast={addToast}>
      <InnerLayers toasts={toasts} addToast={addToast} removeToast={removeToast}>
        {children}
      </InnerLayers>
    </AuthProvider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Re-export slice hooks for components that only need specific domains
export { useAuth, useProperties, useCrm, useChat, useSearchPreferences };
