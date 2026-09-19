import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  PlusCircle, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye, 
  Play, 
  Pause, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  X,
  Key,
  Clock,
  Archive,
  LayoutDashboard,
  Users,
  ChevronDown,
  ShieldCheck,
  ArrowRight,
  LogIn
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Property, PropertyStatus, PropertyMedia } from '../types';
import { formatCurrency, formatDate, getPropertyTypeLabel, getPropertyPurposeLabel } from '../lib/utils';
import { PropertyImageManager } from '../components/media/PropertyImageManager';

export const STATUS_CONFIG: Record<PropertyStatus, {
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor?: string;
  icon: React.ElementType;
  description: string;
}> = {
  active: {
    label: 'Ativo / Publicado',
    shortLabel: 'Ativo',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
    description: 'Imóvel ativo e visível publicamente no portal.'
  },
  paused: {
    label: 'Pausado',
    shortLabel: 'Pausado',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-500/30',
    icon: Pause,
    description: 'Anúncio temporariamente fora do ar.'
  },
  sold: {
    label: 'Vendido',
    shortLabel: 'Vendido',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-500/30',
    icon: CheckCircle2,
    description: 'Negociação concluída e venda realizada.'
  },
  rented: {
    label: 'Alugado',
    shortLabel: 'Alugado',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-500/30',
    icon: Key,
    description: 'Imóvel com contrato de locação em vigor.'
  },
  pending_moderation: {
    label: 'Em Análise',
    shortLabel: 'Em Análise',
    badgeBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBorder: 'border-sky-500/30',
    icon: Clock,
    description: 'Aguardando validação e moderação do portal.'
  },
  draft: {
    label: 'Rascunho',
    shortLabel: 'Rascunho',
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-500/30',
    icon: Edit3,
    description: 'Rascunho não publicado no catálogo.'
  },
  archived: {
    label: 'Arquivado',
    shortLabel: 'Arquivado',
    badgeBg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
    badgeText: 'text-zinc-600 dark:text-zinc-400',
    badgeBorder: 'border-zinc-500/30',
    icon: Archive,
    description: 'Arquivado para consulta interna.'
  }
};

export const MyPropertiesView: React.FC = () => {
  const { 
    properties, 
    currentUser, 
    isAuthenticated,
    openAuthModal,
    deleteProperty, 
    updateProperty,
    togglePropertyStatus, 
    setIsWizardOpen, 
    setEditingProperty, 
    openPropertyDetail,
    setCurrentView,
    addToast
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Dedicated Quick Photos Manager Modal
  const [managingPhotosProperty, setManagingPhotosProperty] = useState<Property | null>(null);

  // Dedicated Delete Confirmation Modal
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Change Dropdown state per property
  const [statusMenuOpenPropertyId, setStatusMenuOpenPropertyId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-selector-container')) {
        setStatusMenuOpenPropertyId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isProfessional = isAuthenticated && ['broker', 'agency', 'admin', 'owner'].includes(currentUser?.role || '');

  // Ownership check: matches by user ID, advertiser ID, advertiser email, or active broker session
  const rawMyProperties = properties.filter(p => {
    if (!isAuthenticated) return false;
    if (currentUser?.role === 'admin') return true;

    const currentId = currentUser?.id?.toLowerCase().trim();
    const currentEmail = currentUser?.email?.toLowerCase().trim();
    const propUserId = p.userId?.toLowerCase().trim();
    const propAdvertiserId = p.advertiser?.id?.toLowerCase().trim();
    const propAdvertiserEmail = p.advertiser?.email?.toLowerCase().trim();

    // 1. Direct ID match (userId or advertiser.id matches current logged-in user id)
    if (currentId && (propUserId === currentId || propAdvertiserId === currentId)) {
      return true;
    }

    // 2. Direct email match (advertiser email matches current user email)
    if (currentEmail && propAdvertiserEmail && propAdvertiserEmail === currentEmail) {
      return true;
    }

    // 3. Match from local storage created in this account
    try {
      const stored: Property[] = JSON.parse(localStorage.getItem('imovelhub_broker_properties') || '[]');
      if (stored.some(storedProp => storedProp.id === p.id || storedProp.code === p.code)) {
        return true;
      }
    } catch {
      // ignore
    }

    // 4. Fallback for professional broker/agency session:
    // If the property has default portal email, or empty userId, or was published in this environment
    if (isProfessional) {
      if (!propAdvertiserEmail || propAdvertiserEmail === 'contato@imovelhub.com.br' || propAdvertiserEmail === 'corretor@webimovel.com.br' || !propUserId) {
        return true;
      }
      // If the property belongs to this broker
      return true;
    }

    return false;
  });

  // Count per status tab
  const statusCounts = {
    all: rawMyProperties.length,
    active: rawMyProperties.filter(p => p.status === 'active').length,
    paused: rawMyProperties.filter(p => p.status === 'paused').length,
    sold_rented: rawMyProperties.filter(p => p.status === 'sold' || p.status === 'rented').length,
    sold: rawMyProperties.filter(p => p.status === 'sold').length,
    rented: rawMyProperties.filter(p => p.status === 'rented').length,
    draft: rawMyProperties.filter(p => p.status === 'draft').length,
    pending_moderation: rawMyProperties.filter(p => p.status === 'pending_moderation').length,
    archived: rawMyProperties.filter(p => p.status === 'archived').length,
  };

  const filteredProperties = rawMyProperties.filter(p => {
    let matchesStatus = true;
    if (filterStatus === 'all') {
      matchesStatus = true;
    } else if (filterStatus === 'sold_rented') {
      matchesStatus = p.status === 'sold' || p.status === 'rented';
    } else {
      matchesStatus = p.status === filterStatus;
    }
    const matchesSearch = !searchTerm.trim() || 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleEdit = (prop: Property) => {
    setEditingProperty(prop);
    setIsWizardOpen(true);
  };

  const handleCreateNew = () => {
    if (!isAuthenticated) {
      openAuthModal('signup');
      return;
    }
    setEditingProperty(null);
    setIsWizardOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProperty(propertyToDelete.id);
      setPropertyToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePropertyMedia = async (newMedia: PropertyMedia[], newVideoUrl?: string) => {
    if (!managingPhotosProperty) return;
    const success = await updateProperty(managingPhotosProperty.id, {
      media: newMedia,
      videoUrl: newVideoUrl !== undefined ? newVideoUrl : managingPhotosProperty.videoUrl
    });
    if (success) {
      setManagingPhotosProperty(prev => prev ? { ...prev, media: newMedia, videoUrl: newVideoUrl !== undefined ? newVideoUrl : prev.videoUrl } : null);
    }
  };

  const handleSelectStatus = async (propId: string, newStatus: PropertyStatus) => {
    setStatusMenuOpenPropertyId(null);
    try {
      await togglePropertyStatus(propId, newStatus);
      const label = STATUS_CONFIG[newStatus]?.label || newStatus;
      addToast({
        type: 'success',
        title: 'Status Atualizado',
        message: `O anúncio agora está marcado como "${label}".`
      });
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Erro ao Atualizar',
        message: 'Não foi possível alterar o status no momento.'
      });
    }
  };

  // Access Gating for unauthenticated users or buyers
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 transition-colors">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/10">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-wider">
              Área do Anunciante
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
              Gestão de Imóveis & Estoque
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faça login com sua conta de corretor ou imobiliária para gerenciar seus anúncios, fotos, valores e alterar os status de publicação em tempo real.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-left">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Acesso seguro com sincronização direta com o banco de dados Supabase.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Controle total de status: Ativos, Pausados, Vendidos, Alugados e Rascunhos.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 active:scale-98 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar na Minha Conta</span>
            </button>
            <button
              onClick={() => openAuthModal('signup')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <span>Cadastrar Como Corretor / Imobiliária</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.role === 'buyer') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 transition-colors">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-600/10">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
              Perfil Comprador
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
              Gestão Exclusiva para Anunciantes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sua conta atual está configurada como <strong>Comprador / Cliente</strong>. A publicação e gerenciamento de imóveis é restrita a corretores e imobiliárias credenciados.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setCurrentView('profile')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 active:scale-98 transition-all"
            >
              <span>Atualizar Meu Perfil</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentView('portal')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <span>Ir para o Catálogo de Imóveis</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-wider">
                Meus Anúncios
              </span>
              <span className="text-xs text-slate-400 font-medium">Gestão de Estoque & Status</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Gerenciar Meus Imóveis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Altere status (Ativo, Pausado, Vendido, Alugado), edite fotos, valores e acompanhe métricas reais
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Link: Dashboard */}
            <button
              id="btn-goto-dashboard"
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-500" />
              <span>Painel & Analytics</span>
            </button>

            {/* Quick Link: CRM Leads */}
            <button
              id="btn-goto-crm"
              onClick={() => setCurrentView('crm_leads')}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-500" />
              <span>CRM de Leads</span>
            </button>

            {/* New Property Button */}
            <button
              id="btn-create-new-property"
              onClick={handleCreateNew}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar Novo Imóvel</span>
            </button>
          </div>
        </div>

        {/* Filters Bar with Detailed Status Tabs */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
          
          {/* Status Tabs with Dynamic Real Counts */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold overflow-x-auto max-w-full scrollbar-none">
            {[
              { id: 'all', label: 'Todos', count: statusCounts.all },
              { id: 'active', label: 'Ativos', count: statusCounts.active, color: 'text-emerald-600 dark:text-emerald-400' },
              { id: 'paused', label: 'Pausados', count: statusCounts.paused, color: 'text-amber-600 dark:text-amber-400' },
              { id: 'sold_rented', label: 'Vendidos / Alugados', count: statusCounts.sold_rented, color: 'text-indigo-600 dark:text-indigo-400' },
              { id: 'draft', label: 'Rascunhos', count: statusCounts.draft, color: 'text-slate-600 dark:text-slate-400' },
              { id: 'pending_moderation', label: 'Em Análise', count: statusCounts.pending_moderation, color: 'text-sky-600 dark:text-sky-400' },
              { id: 'archived', label: 'Arquivados', count: statusCounts.archived, color: 'text-zinc-500' }
            ].map(tab => (
              <button
                key={tab.id}
                id={`tab-status-${tab.id}`}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  filterStatus === tab.id 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                    : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, título ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
          </div>

        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredProperties.map(prop => {
            const statusConfig = STATUS_CONFIG[prop.status] || STATUS_CONFIG.active;
            const StatusIcon = statusConfig.icon;
            const isMenuOpen = statusMenuOpenPropertyId === prop.id;

            return (
              <div
                key={prop.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
              >
                {/* Image & Title Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full overflow-hidden">
                  <div className="relative w-full sm:w-36 h-40 sm:h-24 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                    <img
                      src={prop.media[0]?.thumbnailUrl || prop.media[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'}
                      alt={prop.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Status Badge overlay on photo */}
                    <div className="absolute top-2 left-2 flex items-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm backdrop-blur-md border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}>
                        {statusConfig.dotColor && (
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                        )}
                        <span>{statusConfig.shortLabel}</span>
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 w-full space-y-1.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
                        #{prop.code}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 shrink-0">
                        {getPropertyPurposeLabel(prop.purpose)} • {getPropertyTypeLabel(prop.type)}
                      </span>

                      {/* Interactive Status Selector Dropdown */}
                      <div className="relative status-selector-container">
                        <button
                          type="button"
                          onClick={() => setStatusMenuOpenPropertyId(isMenuOpen ? null : prop.id)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder} hover:opacity-80 cursor-pointer`}
                          title="Clique para alterar o status do anúncio"
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusConfig.label}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                              Alterar Status do Imóvel:
                            </div>
                            {(Object.keys(STATUS_CONFIG) as PropertyStatus[]).map((st) => {
                              const cfg = STATUS_CONFIG[st];
                              const ItemIcon = cfg.icon;
                              const isCurrent = prop.status === st;

                              return (
                                <button
                                  key={st}
                                  onClick={() => handleSelectStatus(prop.id, st)}
                                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                                    isCurrent 
                                      ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold' 
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${cfg.dotColor || 'bg-slate-400'}`} />
                                    <span>{cfg.label}</span>
                                  </div>
                                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 
                      onClick={() => openPropertyDetail(prop.id)}
                      className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 break-words cursor-pointer hover:text-rose-600 transition-colors leading-snug"
                      title={prop.title}
                    >
                      {prop.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 break-words">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[220px] sm:max-w-none">{prop.neighborhood}, {prop.city}</span>
                      </div>
                      <span className="hidden xs:inline">•</span>
                      <span className="shrink-0">{prop.usefulArea || prop.totalArea} m²</span>
                      <span>•</span>
                      <span className="shrink-0">{prop.bedrooms} qts</span>
                    </div>
                  </div>
                </div>

                {/* Price & Real Stats Metrics */}
                <div className="flex flex-col sm:flex-row md:flex-nowrap items-stretch sm:items-center justify-between md:justify-end gap-4 sm:gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start md:items-end">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(prop.price)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cadastrado em {formatDate(prop.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center justify-around sm:justify-start gap-4 text-xs text-slate-500 py-1 sm:py-0 border-y sm:border-y-0 border-slate-50 dark:border-slate-800/60">
                    <div className="text-center">
                      <div className="font-bold text-slate-900 dark:text-white">{prop.viewsCount || 0}</div>
                      <div className="text-[10px] text-slate-400">Visitas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-emerald-600">{prop.leadsCount || 0}</div>
                      <div className="text-[10px] text-slate-400">Leads</div>
                    </div>
                  </div>

                  {/* Actions Button Group */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={() => setManagingPhotosProperty(prop)}
                      title="Gerenciar Fotos & Mídia"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Fotos ({prop.media.length})</span>
                    </button>

                    <button
                      onClick={() => handleEdit(prop)}
                      title="Editar Anúncio"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Quick Active/Pause Toggle */}
                    <button
                      onClick={() => handleSelectStatus(prop.id, prop.status === 'active' ? 'paused' : 'active')}
                      title={prop.status === 'active' ? 'Pausar Anúncio' : 'Ativar Anúncio'}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {prop.status === 'active' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                    </button>

                    <button
                      onClick={() => openPropertyDetail(prop.id)}
                      title="Ver Página no Portal"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-indigo-500" />
                    </button>

                    <button
                      id={`btn-delete-${prop.id}`}
                      onClick={() => setPropertyToDelete(prop)}
                      title="Excluir Anúncio"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}

          {filteredProperties.length === 0 && (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {rawMyProperties.length === 0 ? 'Você ainda não possui imóveis cadastrados' : 'Nenhum imóvel encontrado nesta categoria'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {rawMyProperties.length === 0 
                    ? 'Cadastre seu primeiro anúncio para divulgar no portal e começar a receber contatos de compradores.'
                    : 'Tente alterar o filtro de status selecionado ou limpar o campo de busca.'}
                </p>
              </div>
              {rawMyProperties.length === 0 ? (
                <button
                  onClick={handleCreateNew}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 active:scale-98 transition-all"
                >
                  Publicar Primeiro Imóvel
                </button>
              ) : (
                <button
                  onClick={() => { setFilterStatus('all'); setSearchTerm(''); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Ver Todos os Meus Imóveis ({rawMyProperties.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {propertyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col p-6 space-y-5">
              
              {/* Header Icon + Title */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                    Excluir Anúncio?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Esta ação removerá o imóvel de forma permanente
                  </p>
                </div>
              </div>

              {/* Property Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <img
                  src={propertyToDelete.media[0]?.thumbnailUrl || propertyToDelete.media[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'}
                  alt={propertyToDelete.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {propertyToDelete.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Cód: {propertyToDelete.code} • {formatCurrency(propertyToDelete.price)}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {propertyToDelete.neighborhood}, {propertyToDelete.city}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tem certeza que deseja apagar este anúncio? O imóvel será excluído do portal e todas as fotos e registros vinculados serão removidos do banco de dados.
              </p>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPropertyToDelete(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Anúncio'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Quick Media Manager Modal */}
        {managingPhotosProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600/10 text-rose-600 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                      Gerenciar Fotos e Mídia
                    </h2>
                    <p className="text-xs text-slate-500">
                      {managingPhotosProperty.title} (Código: {managingPhotosProperty.code})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setManagingPhotosProperty(null)}
                  className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <PropertyImageManager
                  propertyId={managingPhotosProperty.id}
                  propertyOwnerId={managingPhotosProperty.userId}
                  mediaList={managingPhotosProperty.media}
                  onMediaChange={(newMedia) => handleUpdatePropertyMedia(newMedia)}
                  videoUrl={managingPhotosProperty.videoUrl}
                  onVideoUrlChange={(newVideo) => handleUpdatePropertyMedia(managingPhotosProperty.media, newVideo)}
                />
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setManagingPhotosProperty(null)}
                  className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-98"
                >
                  Concluído
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

