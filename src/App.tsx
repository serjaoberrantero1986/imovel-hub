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
import { PropertyVisitsPanel } from './components/crm/PropertyVisitsPanel';
import { MessagesChatView } from './views/MessagesChatView';
import { ComparatorView } from './views/ComparatorView';
import { FavoritesView } from './views/FavoritesView';
import { DesignSystemView } from './views/DesignSystemView';
import { ProfileView } from './views/ProfileView';
import { InstitutionalLegalView } from './views/InstitutionalLegalView';
import { SavedSearchesView } from './views/SavedSearchesView';
import { AdminCreciReviewView } from './views/AdminCreciReviewView';
import { AdminPortalsView } from './views/AdminPortalsView';
import { BuyingPowerView } from './views/BuyingPowerView';
import { AdminMortgageRatesView } from './views/AdminMortgageRatesView';
import { AdminCertificateSourcesView } from './views/AdminCertificateSourcesView';
import { PublicDocumentRequestView } from './views/PublicDocumentRequestView';
import { PublicContractReviewView } from './views/PublicContractReviewView';
import { PublicNegotiationReviewView } from './views/PublicNegotiationReviewView';
import { AppAccessView } from './views/AppAccessView';
import { MarketingLandingView } from './views/MarketingLandingView';
import { AdminPlansView } from './views/AdminPlansView';
import { PlanCheckoutView } from './views/PlanCheckoutView';
import { getSafePortalReturnUrl } from './lib/appAddress';

const MainContent: React.FC = () => {
  const { currentView, activeLegalTab, currentUser, isAuthenticated, setCurrentView } = useApp();
  const { portal, loading, error, canonicalRootUrl } = useTenant();
  const isAdmin = isAuthenticated && currentUser.role === 'admin';
  const renderedView = isAdmin && !['admin_portals','admin_plans','admin_creci','admin_mortgage_rates','admin_certificate_sources','profile','visits'].includes(currentView) ? 'admin_portals' : currentView;
  React.useEffect(()=>{
    if(isAdmin && !['admin_portals','admin_plans','admin_creci','admin_mortgage_rates','admin_certificate_sources','profile','visits'].includes(currentView)) setCurrentView('admin_portals');
  },[isAdmin,currentView,setCurrentView]);

  React.useEffect(() => {
    if (portal.mode !== 'app' || !isAuthenticated || currentView !== 'portal') return;
    const params = new URLSearchParams(window.location.search);
    const billingJourney = params.get('intent') === 'signup' || params.has('billing');
    if (billingJourney && (currentUser.role === 'broker' || currentUser.role === 'agency')) {
      setCurrentView('plan_checkout');
      return;
    }
    if (currentUser.role === 'admin') setCurrentView('admin_portals');
    else if (currentUser.role === 'broker' || currentUser.role === 'agency') setCurrentView(currentUser.verified && currentUser.creciReviewStatus === 'approved' ? 'crm_leads' : 'profile');
    else setCurrentView('favorites');
  }, [portal.mode, isAuthenticated, currentUser.role, currentUser.verified, currentUser.creciReviewStatus, currentView, setCurrentView]);

  React.useEffect(() => {
    if (portal.mode !== 'app' || !isAuthenticated) return;
    const destination = getSafePortalReturnUrl();
    if (destination) window.location.replace(destination.toString());
  }, [portal.mode, isAuthenticated]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="text-center"><span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-rose-600"/><p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">Carregando portal...</p></div></div>;
  }

  if (portal.mode === 'not_found') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 dark:bg-slate-950"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900"><img src="/icon.svg" alt="Web Imóveis" className="mx-auto h-14 w-14"/><h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">Portal não encontrado</h1><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{error || `O endereço ${portal.slug || ''}.webimoveis.site ainda não está associado a um portal publicado.`}</p><a href={canonicalRootUrl} className="mt-6 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700">Ir para o Web Imóveis</a></div></div>;
  }

  if (portal.mode === 'app' && !isAuthenticated) {
    return <><AppAccessView /><AuthModal /><ToastContainer /></>;
  }

  const returnUrl = portal.mode === 'app' ? getSafePortalReturnUrl() : null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-16 lg:pb-0 overflow-x-hidden">
      {/* Offline Status Listener */}
      <OfflineBanner />

      <Navbar />

      {returnUrl && <div className="border-b border-rose-100 bg-rose-50 px-4 py-2.5 text-center text-sm text-rose-900 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-100">Você entrou com segurança. <a href={returnUrl.toString()} className="font-extrabold underline underline-offset-4">Voltar ao portal de origem</a></div>}

      <main className="flex-1">
        {renderedView === 'portal' && <PortalHomeView />}
        {renderedView === 'search' && <PropertySearchView />}
        {renderedView === 'buying_power' && <BuyingPowerView />}
        {renderedView === 'property_detail' && <PropertyDetailView />}
        {renderedView === 'dashboard' && <BrokerDashboardView />}
        {renderedView === 'my_properties' && <MyPropertiesView />}
        {renderedView === 'crm_leads' && <CrmLeadsView />}
        {renderedView === 'visits' && <div className="max-w-6xl mx-auto px-4 py-8"><PropertyVisitsPanel /></div>}
        {renderedView === 'messages' && <MessagesChatView />}
        {renderedView === 'comparator' && <ComparatorView />}
        {renderedView === 'favorites' && <FavoritesView />}
        {renderedView === 'saved_searches' && <SavedSearchesView />}
        {renderedView === 'design_system' && <DesignSystemView />}
        {renderedView === 'profile' && <ProfileView />}
        {renderedView === 'admin_creci' && <AdminCreciReviewView />}
        {renderedView === 'admin_portals' && <AdminPortalsView />}
        {renderedView === 'admin_plans' && <AdminPlansView />}
        {renderedView === 'plan_checkout' && <PlanCheckoutView />}
        {renderedView === 'admin_mortgage_rates' && <AdminMortgageRatesView />}
        {renderedView === 'admin_certificate_sources' && <AdminCertificateSourcesView />}
        {renderedView === 'legal' && <InstitutionalLegalView initialTab={activeLegalTab} />}
      </main>

      {!isAdmin && portal.mode !== 'app' && <Footer />}
      <MobileNav />
      <PropertyWizardModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  const publicParams = new URLSearchParams(window.location.hash.slice(1));
  const negotiationReviewToken = publicParams.get('negotiation_review');
  if (negotiationReviewToken) return <PublicNegotiationReviewView token={negotiationReviewToken} />;
  const contractReviewToken = publicParams.get('contract_review');
  if (contractReviewToken) return <PublicContractReviewView token={contractReviewToken} />;
  const documentRequestToken = publicParams.get('document_request');
  if (documentRequestToken) return <PublicDocumentRequestView token={documentRequestToken} />;
  const hostname = window.location.hostname.toLowerCase();
  const isLocalMarketingPreview = import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'terminal.local') && !new URLSearchParams(window.location.search).has('tenant');
  const isMarketingRoot = hostname === 'webimoveis.site' || hostname === 'www.webimoveis.site' || isLocalMarketingPreview;
  if (isMarketingRoot) return <MarketingLandingView />;
  return (
    <TenantProvider>
      <AppProvider>
        <PortalEditorProvider><MainContent /></PortalEditorProvider>
      </AppProvider>
    </TenantProvider>
  );
}
