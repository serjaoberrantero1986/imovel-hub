import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  RefreshCw, 
  BarChart3, 
  Kanban, 
  Table, 
  CalendarCheck, 
  Trash2, 
  ShieldCheck, 
  AlertCircle,
  LogIn,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead, LeadStatus } from '../types';
import { CrmDashboardMetrics } from '../components/crm/CrmDashboardMetrics';
import { CrmKanbanBoard, KANBAN_STAGES } from '../components/crm/CrmKanbanBoard';
import { CrmLeadsTable } from '../components/crm/CrmLeadsTable';
import { CrmTasksCalendar } from '../components/crm/CrmTasksCalendar';
import { CrmLeadDetailModal } from '../components/crm/CrmLeadDetailModal';
import { CrmNewLeadModal } from '../components/crm/CrmNewLeadModal';

export const CrmLeadsView: React.FC = () => {
  const { 
    leads, 
    properties,
    currentUser,
    isAuthenticated,
    openAuthModal,
    setCurrentView,
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
    openPropertyDetail, 
    addToast, 
    isSyncing, 
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'kanban' | 'dashboard' | 'table' | 'tasks'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Authentication gating
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 transition-colors">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/10">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
              CRM & Gestão de Leads
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faça login com sua conta profissional para acessar o funil Kanban, agendamento de visitas, histórico de interações e pipeline de vendas.
            </p>
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
              CRM Exclusivo para Anunciantes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sua conta atual está configurada como <strong>Comprador / Cliente</strong>. O CRM e gestão de contatos de interessados é de uso restrito a corretores e imobiliárias credenciados.
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
              <span>Buscar Imóveis no Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter properties belonging to user (or all if admin)
  const myProperties = properties.filter(p => {
    if (currentUser?.role === 'admin') return true;
    return (currentUser?.id && p.userId === currentUser.id) ||
      (currentUser?.email && p.advertiser?.email && p.advertiser.email.toLowerCase() === currentUser.email.toLowerCase());
  });

  const myPropertyIds = new Set(myProperties.map(p => p.id));

  // Filter leads belonging to user's listings or assigned to user (or all if admin)
  const displayedLeads = leads.filter(l => {
    if (currentUser?.role === 'admin') return true;
    if (l.advertiserId && l.advertiserId === currentUser?.id) return true;
    if (l.propertyId && myPropertyIds.has(l.propertyId)) return true;
    return false;
  });

  // Handlers
  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailModalOpen(true);
  };

  const handleAdvanceStage = async (lead: Lead) => {
    const currentIndex = KANBAN_STAGES.findIndex(s => s.id === lead.status);
    if (currentIndex < KANBAN_STAGES.length - 1) {
      const nextStatus = KANBAN_STAGES[currentIndex + 1].id;
      await updateLeadStatus(lead.id, nextStatus);
    }
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      setIsDeletingLead(true);
      await deleteLead(leadToDelete.id);
      if (selectedLead?.id === leadToDelete.id) {
        setIsDetailModalOpen(false);
        setSelectedLead(null);
      }
      setLeadToDelete(null);
    } finally {
      setIsDeletingLead(false);
    }
  };

  // Keep selectedLead updated in real-time when leads state updates
  const currentSelectedLead = selectedLead 
    ? displayedLeads.find(l => l.id === selectedLead.id) || selectedLead
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-wider">
                CRM Imobiliário Pro
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Segurança LGPD & Sincronização Supabase
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Gestão Comercial & Pipeline de Vendas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Controle de leads, agendamento de visitas, matchmaker de imóveis e follow-ups em tempo real
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sync Button */}
            <button
              onClick={() => refreshData()}
              disabled={isSyncing}
              className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
              title="Sincronizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            {/* New Lead Button */}
            <button
              onClick={() => setIsNewLeadModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Lead</span>
            </button>
          </div>
        </div>

        {/* CRM Nav Tabs */}
        <div className="p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto scrollbar-none text-xs font-bold">
          
          {/* Tab 1: Kanban */}
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Pipeline Kanban ({displayedLeads.length})</span>
          </button>

          {/* Tab 2: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard de Métricas</span>
          </button>

          {/* Tab 3: Table */}
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Clientes & Leads</span>
          </button>

          {/* Tab 4: Tasks */}
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Tarefas & Agenda ({displayedLeads.reduce((acc, l) => acc + (l.tasks?.filter(t => !t.completed).length || 0), 0)})</span>
          </button>

        </div>

        {/* View Switcher */}
        {activeTab === 'kanban' && (
          <CrmKanbanBoard
            leads={displayedLeads}
            properties={properties}
            onOpenLead={handleOpenLead}
            onAdvanceStage={handleAdvanceStage}
            onChangeStage={(lead, status) => updateLeadStatus(lead.id, status)}
            onOpenProperty={openPropertyDetail}
          />
        )}

        {activeTab === 'dashboard' && (
          <CrmDashboardMetrics
            leads={displayedLeads}
            properties={properties}
            onSelectStageFilter={() => {
              setActiveTab('table');
            }}
            onOpenLead={handleOpenLead}
          />
        )}

        {activeTab === 'table' && (
          <CrmLeadsTable
            leads={displayedLeads}
            properties={properties}
            onOpenLead={handleOpenLead}
            onUpdateStatus={(leadId, status) => updateLeadStatus(leadId, status)}
            onDeleteLead={(lead) => setLeadToDelete(lead)}
            onOpenProperty={openPropertyDetail}
          />
        )}

        {activeTab === 'tasks' && (
          <CrmTasksCalendar
            leads={displayedLeads}
            onToggleTask={toggleLeadTask}
            onDeleteTask={deleteLeadTask}
            onAddTask={addLeadTask}
            onOpenLead={handleOpenLead}
          />
        )}

        {/* Lead Dossier 360 Modal */}
        <CrmLeadDetailModal
          lead={currentSelectedLead}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedLead(null);
          }}
          properties={properties}
          onUpdateStatus={updateLeadStatus}
          onUpdateNotes={updateLeadNotes}
          onAddTask={addLeadTask}
          onToggleTask={toggleLeadTask}
          onDeleteTask={deleteLeadTask}
          onAddInteraction={addLeadInteraction}
          onAddTag={addLeadTag}
          onRemoveTag={removeLeadTag}
          onToggleInterestProperty={toggleLeadInterestProperty}
          onTogglePrivacy={toggleLeadPrivacy}
          onOpenProperty={openPropertyDetail}
        />

        {/* New Lead Modal */}
        <CrmNewLeadModal
          isOpen={isNewLeadModalOpen}
          onClose={() => setIsNewLeadModalOpen(false)}
          properties={properties}
          onAddLead={addLead}
        />

        {/* Custom Delete Confirmation Modal */}
        {leadToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                    Excluir Lead do CRM?
                  </h3>
                  <p className="text-xs text-slate-500">Remoção permanente da carteira</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">{leadToDelete.buyerName}</div>
                <div className="text-slate-500 font-mono">Tel: {leadToDelete.buyerPhone}</div>
                <div className="text-slate-400 italic truncate">Interesse: {leadToDelete.propertyTitle}</div>
              </div>

              <p className="text-xs text-slate-500">
                Tem certeza que deseja apagar o registro deste cliente do banco de dados? Todo o histórico de mensagens e tarefas vinculadas será removido.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  disabled={isDeletingLead}
                  onClick={() => setLeadToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  disabled={isDeletingLead}
                  onClick={handleConfirmDeleteLead}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5 hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingLead ? 'Excluindo...' : 'Sim, Excluir'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
