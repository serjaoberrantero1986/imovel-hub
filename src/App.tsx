import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/ui/ToastContainer';
import { PropertyWizardModal } from './components/properties/PropertyWizardModal';
import { AuthModal } from './components/modals/AuthModal';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { PortalEditorProvider } from './components/visual-editor/PortalEditorProvider';
import { TenantProvider, useTenant } from './context/TenantContext';

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
import { AdminCreciReviewView } from './views/AdminCreciReviewView';
import { AdminPortalsView } from './views/AdminPortalsView';

const MainContent: React.FC = () => {
  const { currentView, activeLegalTab, currentUser, isAuthenticated, setCurrentView } = useApp();
  const { portal, loading, error, canonicalRootUrl } = useTenant();
  const isAdmin = isAuthenticated && currentUser.role === 'admin';
  const renderedView = isAdmin && !['admin_portals','admin_creci','profile'].includes(currentView) ? 'admin_portals' : currentView;
  React.useEffect(()=>{
    if(isAdmin && !['admin_portals','admin_creci','profile'].includes(currentView)) setCurrentView('admin_portals');
  },[isAdmin,currentView,setCurrentView]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="text-center"><span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-rose-600"/><p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">Carregando portal...</p></div></div>;
  }

  if (portal.mode === 'not_found') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 dark:bg-slate-950"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900"><img src="/icon.svg" alt="Web Imóveis" className="mx-auto h-14 w-14"/><h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">Portal não encontrado</h1><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{error || `O endereço ${portal.slug || ''}.webimoveis.site ainda não está associado a um portal publicado.`}</p><a href={canonicalRootUrl} className="mt-6 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700">Ir para o Web Imóveis</a></div></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-16 lg:pb-0 overflow-x-hidden">
      {/* Offline Status Listener */}
      <OfflineBanner />

      <Navbar />

      <main className="flex-1">
        {renderedView === 'portal' && <PortalHomeView />}
        {renderedView === 'search' && <PropertySearchView />}
        {renderedView === 'property_detail' && <PropertyDetailView />}
        {renderedView === 'dashboard' && <BrokerDashboardView />}
        {renderedView === 'my_properties' && <MyPropertiesView />}
        {renderedView === 'crm_leads' && <CrmLeadsView />}
        {renderedView === 'messages' && <MessagesChatView />}
        {renderedView === 'comparator' && <ComparatorView />}
        {renderedView === 'favorites' && <FavoritesView />}
        {renderedView === 'saved_searches' && <SavedSearchesView />}
        {renderedView === 'design_system' && <DesignSystemView />}
        {renderedView === 'profile' && <ProfileView />}
        {renderedView === 'admin_creci' && <AdminCreciReviewView />}
        {renderedView === 'admin_portals' && <AdminPortalsView />}
        {renderedView === 'legal' && <InstitutionalLegalView initialTab={activeLegalTab} />}
      </main>

      {!isAdmin && <Footer />}
      <MobileNav />
      <PropertyWizardModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <TenantProvider>
      <AppProvider>
        <PortalEditorProvider><MainContent /></PortalEditorProvider>
      </AppProvider>
    </TenantProvider>
  );
}
