import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/ui/ToastContainer';
import { PropertyWizardModal } from './components/properties/PropertyWizardModal';
import { AuthModal } from './components/modals/AuthModal';
import { PwaInstallPrompt } from './components/layout/PwaInstallPrompt';
import { OfflineBanner } from './components/layout/OfflineBanner';

// Views
import { PortalHomeView } from './views/PortalHomeView';
import { PropertySearchView } from './views/PropertySearchView';
import { PropertyDetailView } from './components/properties/PropertyDetailView';
import { BrokerDashboardView } from './views/BrokerDashboardView';
import { MyPropertiesView } from './views/MyPropertiesView';
import { CrmLeadsView } from './views/CrmLeadsView';
import { MessagesChatView } from './views/MessagesChatView';
import { ComparatorView } from './views/ComparatorView';
import { FavoritesView } from './views/FavoritesView';
import { DesignSystemView } from './views/DesignSystemView';
import { ProfileView } from './views/ProfileView';
import { InstitutionalLegalView } from './views/InstitutionalLegalView';
import { SavedSearchesView } from './views/SavedSearchesView';

const MainContent: React.FC = () => {
  const { currentView, activeLegalTab } = useApp();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-16 lg:pb-0 overflow-x-hidden">
      {/* Offline Status Listener */}
      <OfflineBanner />

      <Navbar />

      <main className="flex-1">
        {currentView === 'portal' && <PortalHomeView />}
        {currentView === 'search' && <PropertySearchView />}
        {currentView === 'property_detail' && <PropertyDetailView />}
        {currentView === 'dashboard' && <BrokerDashboardView />}
        {currentView === 'my_properties' && <MyPropertiesView />}
        {currentView === 'crm_leads' && <CrmLeadsView />}
        {currentView === 'messages' && <MessagesChatView />}
        {currentView === 'comparator' && <ComparatorView />}
        {currentView === 'favorites' && <FavoritesView />}
        {currentView === 'saved_searches' && <SavedSearchesView />}
        {currentView === 'design_system' && <DesignSystemView />}
        {currentView === 'profile' && <ProfileView />}
        {currentView === 'legal' && <InstitutionalLegalView initialTab={activeLegalTab} />}
      </main>

      <Footer />
      <MobileNav />
      <PwaInstallPrompt />
      <PropertyWizardModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
