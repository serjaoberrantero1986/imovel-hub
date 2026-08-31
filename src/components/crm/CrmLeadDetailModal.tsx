import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  Tag, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  DollarSign, 
  MapPin, 
  FileText, 
  ExternalLink, 
  Lock, 
  Unlock, 
  ChevronRight, 
  Send,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Lead, LeadStatus, LeadInteraction, LeadTask, Property } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { calculatePropertyMatchScore, getTopMatchingPropertiesForLead } from '../../lib/crmMatching';
import { KANBAN_STAGES } from './CrmKanbanBoard';
import { auditService } from '../../lib/security';

interface CrmLeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onUpdateStatus: (leadId: string, status: LeadStatus, notes?: string) => Promise<void>;
  onUpdateNotes: (leadId: string, notes: string, privateNotes?: string) => Promise<void>;
  onAddTask: (leadId: string, task: Omit<LeadTask, 'id'>) => Promise<void>;
  onToggleTask: (leadId: string, taskId: string) => Promise<void>;
  onDeleteTask: (leadId: string, taskId: string) => Promise<void>;
  onAddInteraction: (leadId: string, interaction: Omit<LeadInteraction, 'id' | 'createdAt'>) => Promise<void>;
  onAddTag: (leadId: string, tag: string) => Promise<void>;
  onRemoveTag: (leadId: string, tag: string) => Promise<void>;
  onToggleInterestProperty: (leadId: string, propertyId: string) => Promise<void>;
  onTogglePrivacy: (leadId: string) => Promise<void>;
  onOpenProperty: (propertyId: string) => void;
}

type TabType = 'overview' | 'matching' | 'history' | 'tasks' | 'notes' | 'preferences';

export const CrmLeadDetailModal: React.FC<CrmLeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  properties,
  onUpdateStatus,
  onUpdateNotes,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddInteraction,
  onAddTag,
  onRemoveTag,
  onToggleInterestProperty,
  onTogglePrivacy,
  onOpenProperty,
}) => {
  if (!isOpen || !lead) return null;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // New Interaction Form State
  const [newInteractionType, setNewInteractionType] = useState<LeadInteraction['type']>('whatsapp');
  const [newInteractionTitle, setNewInteractionTitle] = useState('');
  const [newInteractionDesc, setNewInteractionDesc] = useState('');

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskType, setNewTaskType] = useState<LeadTask['type']>('follow_up');
  const [newTaskPriority, setNewTaskPriority] = useState<LeadTask['priority']>('medium');

  // New Tag Form State
  const [newTagInput, setNewTagInput] = useState('');

  // Notes state
  const [generalNotes, setGeneralNotes] = useState(lead.notes || '');
  const [privateNotes, setPrivateNotes] = useState(lead.privateNotes || '');

  // Calculate Matchmaking rankings
  const topMatches = getTopMatchingPropertiesForLead(lead, properties);
  const originProperty = properties.find(p => p.id === lead.propertyId);

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const handleWhatsAppClick = (customText?: string) => {
    const phone = lead.buyerWhatsapp || getCleanPhone(lead.buyerPhone);
    const cleanNumber = phone.startsWith('55') ? phone : `55${phone}`;
    const message = customText || `Olá ${lead.buyerName}, tudo bem? Aqui é da ImovelHub. Estou entrando em contato para dar continuidade ao seu interesse no imóvel ${lead.propertyTitle}. Quando seria um bom momento para conversarmos?`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSharePropertyOnWhatsApp = (prop: Property) => {
    const phone = lead.buyerWhatsapp || getCleanPhone(lead.buyerPhone);
    const cleanNumber = phone.startsWith('55') ? phone : `55${phone}`;
    const text = `Olá ${lead.buyerName}! Selecionei uma excelente oportunidade que tem alto match com o seu perfil:\n\n*${prop.title}*\n📍 ${prop.neighborhood}, ${prop.city}\n💰 ${formatCurrency(prop.price)}\n🛏 ${prop.bedrooms} Quartos | 📐 ${prop.totalArea} m²\n\nCód: ${prop.code}\nO que achou dessa opção?`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSaveNotes = async () => {
    await onUpdateNotes(lead.id, generalNotes, privateNotes);
  };

  const handleCreateInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteractionTitle.trim()) return;
    await onAddInteraction(lead.id, {
      leadId: lead.id,
      type: newInteractionType,
      title: newInteractionTitle,
      description: newInteractionDesc,
      createdBy: 'Corretor Responsável'
    });
    setNewInteractionTitle('');
    setNewInteractionDesc('');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDate) return;
    await onAddTask(lead.id, {
      leadId: lead.id,
      title: newTaskTitle,
      type: newTaskType,
      priority: newTaskPriority,
      dueDate: newTaskDate,
      dueTime: newTaskTime || undefined,
      completed: false,
    });
    setNewTaskTitle('');
    setNewTaskDate('');
    setNewTaskTime('');
  };

  const handleAddTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    await onAddTag(lead.id, newTagInput);
    setNewTagInput('');
  };

  // Masking helpers for privacy
  const getMaskedDocument = (doc?: string) => {
    if (!doc) return 'Não informado';
    if (showSensitiveData || !lead.accessRestricted) return doc;
    return doc.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.$2.***-**');
  };

  const getMaskedPhone = (phone?: string) => {
    if (!phone) return 'Não informado';
    if (showSensitiveData || !lead.accessRestricted) return phone;
    return phone.replace(/(\(\d{2}\)\s*)(\d{4,5})-(\d{4})/, '$1****-$3');
  };

  const getMaskedEmail = (email?: string) => {
    if (!email) return 'Não informado';
    if (showSensitiveData || !lead.accessRestricted) return email;
    const parts = email.split('@');
    if (parts.length < 2) return '***@***';
    const name = parts[0];
    const maskedName = name.slice(0, 2) + '****';
    return `${maskedName}@${parts[1]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left info */}
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center text-xl font-bold font-['Outfit'] shadow-md shadow-rose-600/20 shrink-0">
              {lead.buyerName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] truncate">
                  {lead.buyerName}
                </h2>
                
                {/* Privacy Badge */}
                <button
                  type="button"
                  onClick={() => onTogglePrivacy(lead.id)}
                  title={lead.accessRestricted ? 'Dados Protegidos por LGPD' : 'Dados Públicos para a Equipe'}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
                    lead.accessRestricted
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lead.accessRestricted ? <ShieldCheck className="w-3 h-3 text-indigo-500" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                  <span>{lead.accessRestricted ? 'Restrito (LGPD)' : 'Equipe'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>Criado em: {formatDateTime(lead.createdAt)}</span>
                <span>•</span>
                <span>Origem: <strong>{lead.origin || 'Portal Web'}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Actions & Status Selector */}
          <div className="flex items-center gap-2.5 self-end md:self-center">
            
            {/* WhatsApp 1-click */}
            <button
              onClick={() => handleWhatsAppClick()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            {/* Stage Selector */}
            <div className="relative">
              <select
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
              >
                {KANBAN_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-1 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Dados & Contato</span>
          </button>

          <button
            onClick={() => setActiveTab('matching')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'matching'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Match de Imóveis ({topMatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Histórico ({lead.interactions?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tarefas & Follow-up ({lead.tasks?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Notas & Confidencial</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Preferências & Tags</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Privacy Control Notice */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Controle Rigoroso de Privacidade (LGPD)
                    </h4>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      {lead.accessRestricted 
                        ? 'Os dados pessoais sensíveis estão mascarados. Clique em "Revelar" para auditoria autorizada.' 
                        : 'Acesso total liberado para corretores credenciados.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextState = !showSensitiveData;
                    if (nextState && lead) {
                      auditService.log({
                        eventType: 'LGPD_DATA_UNMASKED',
                        severity: 'MEDIUM',
                        resourceType: 'lead',
                        resourceId: lead.id,
                        details: `Visualização auditada de dados sensíveis de contato do lead "${lead.buyerName}" pelo corretor.`,
                        blocked: false
                      });
                    }
                    setShowSensitiveData(nextState);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {showSensitiveData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSensitiveData ? 'Ocultar' : 'Revelar Dados'}</span>
                </button>
              </div>

              {/* Personal & Contact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Dados de Contato */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
                    Dados de Contato
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Telefone / Celular:</span>
                      <div className="flex items-center gap-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span>{getMaskedPhone(lead.buyerPhone)}</span>
                        <button
                          onClick={() => handleWhatsAppClick()}
                          className="text-emerald-600 hover:text-emerald-700"
                          title="Enviar WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">E-mail:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {getMaskedEmail(lead.buyerEmail)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Documento (CPF):</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {getMaskedDocument(lead.buyerDocument)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Profissão / Ocupação:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {lead.buyerOccupation || 'Não informado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Perfil Financeiro & Origem */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
                    Perfil Financeiro & Origem
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Orçamento Previsto:</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        {lead.budget ? formatCurrency(lead.budget) : 'A definir'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Faixa Desejada:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {lead.budgetMin ? formatCurrency(lead.budgetMin) : 'R$ 0'} até {lead.budgetMax ? formatCurrency(lead.budgetMax) : 'Ilimitado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Canal de Origem:</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                        {lead.origin || 'Portal Web'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Responsável:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {lead.assignedTo || 'Corretor da Conta'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Imóvel de Origem (Lead Source Property) */}
              {originProperty && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit'] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-rose-600" />
                      <span>Imóvel de Origem do Lead</span>
                    </h4>
                    <button
                      onClick={() => onOpenProperty(originProperty.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1"
                    >
                      <span>Ver Anúncio</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <img
                      src={originProperty.media?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
                      alt={originProperty.title}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                        {originProperty.title}
                      </h5>
                      <p className="text-xs text-slate-500">
                        📍 {originProperty.neighborhood}, {originProperty.city} • Cód: {originProperty.code}
                      </p>
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(originProperty.price)}
                      </p>
                    </div>
                  </div>

                  {lead.message && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic">
                      "{lead.message}"
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MATCHMAKING INTELIGENTE */}
          {activeTab === 'matching' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Sistema de Match de Imóveis Inteligente
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Calcula a compatibilidade do perfil do cliente (orçamento, finalidade, tipologia, bairros desejados, número de quartos e comodidades) contra o catálogo ativo de imóveis.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {topMatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum imóvel compatível encontrado no momento.
                  </div>
                ) : (
                  topMatches.map(({ property, match }) => {
                    const isInterest = lead.interestedPropertyIds?.includes(property.id);

                    return (
                      <div
                        key={property.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Imóvel Info */}
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={property.media?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
                            alt={property.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {property.title}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-400">
                                {property.code}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              📍 {property.neighborhood}, {property.city} • {property.bedrooms} qtos • {property.totalArea} m²
                            </p>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                              {formatCurrency(property.price)}
                            </p>
                          </div>
                        </div>

                        {/* Match Score & Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          
                          {/* Score Badge */}
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                              match.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              match.score >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              <Sparkles className="w-3 h-3" />
                              {match.score}% Match
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {match.criteria.filter(c => c.passed).length}/{match.criteria.length} critérios compatíveis
                            </span>
                          </div>

                          {/* Toggle Interest */}
                          <button
                            type="button"
                            onClick={() => onToggleInterestProperty(lead.id, property.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                              isInterest
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isInterest ? '★ Na Carteira' : '+ Interessado'}
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => handleSharePropertyOnWhatsApp(property)}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 transition-colors"
                            title="Enviar ficha do imóvel no WhatsApp do cliente"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE & HISTÓRICO */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              
              {/* Form Add Interaction */}
              <form onSubmit={handleCreateInteraction} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
                  Registrar Nova Atividade / Interação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Tipo de Contato</label>
                    <select
                      value={newInteractionType}
                      onChange={(e) => setNewInteractionType(e.target.value as LeadInteraction['type'])}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="call">Ligação Telefônica</option>
                      <option value="visit">Visita Presencial</option>
                      <option value="proposal">Envio de Proposta</option>
                      <option value="email">E-mail</option>
                      <option value="note">Anotação Interna</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Título do Evento</label>
                    <input
                      type="text"
                      placeholder="Ex: Ligação para tirar dúvidas sobre financiamento"
                      value={newInteractionTitle}
                      onChange={(e) => setNewInteractionTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    placeholder="Detalhes da conversa, combinados, objeções ou próximos passos..."
                    rows={2}
                    value={newInteractionDesc}
                    onChange={(e) => setNewInteractionDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar no Histórico</span>
                  </button>
                </div>
              </form>

              {/* Timeline List */}
              <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {(!lead.interactions || lead.interactions.length === 0) ? (
                  <div className="pl-10 text-xs text-slate-400">
                    Nenhuma interação registrada ainda.
                  </div>
                ) : (
                  lead.interactions.map((interaction) => (
                    <div key={interaction.id} className="relative pl-10 space-y-1">
                      {/* Timeline Dot */}
                      <div className="absolute left-2.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-rose-500" />
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase font-mono">
                            {interaction.type}
                          </span>
                          {interaction.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(interaction.createdAt)}
                        </span>
                      </div>

                      {interaction.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          {interaction.description}
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400">
                        Por: {interaction.createdBy || 'Corretor'}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 4: TAREFAS & AGENDA */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              
              {/* Form Add Task */}
              <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
                  Agendar Nova Tarefa / Follow-up
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Título da Tarefa</label>
                    <input
                      type="text"
                      placeholder="Ex: Ligar para confirmar visita de sábado"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Data Limite</label>
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Horário (Opcional)</label>
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value as LeadTask['type'])}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="follow_up">Follow-up</option>
                      <option value="visit">Visita</option>
                      <option value="call">Ligação</option>
                      <option value="proposal">Proposta</option>
                    </select>

                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as LeadTask['priority'])}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="low">Prioridade Baixa</option>
                      <option value="medium">Prioridade Média</option>
                      <option value="high">Prioridade Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Tarefa</span>
                  </button>
                </div>
              </form>

              {/* Tasks List */}
              <div className="space-y-2">
                {(!lead.tasks || lead.tasks.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhuma tarefa pendente para este lead.
                  </div>
                ) : (
                  lead.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        task.completed
                          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleTask(lead.id, task.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>📅 {task.dueDate} {task.dueTime ? `às ${task.dueTime}` : ''}</span>
                            <span>•</span>
                            <span className="capitalize">{task.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && (
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            task.priority === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteTask(lead.id, task.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 5: NOTAS & CONFIDENCIAL */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              
              {/* Notas Gerais */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Bloco de Notas Gerais</span>
                  <span className="text-[10px] text-slate-400 font-normal">Visível para a equipe</span>
                </label>
                <textarea
                  rows={4}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Anotações sobre a negociação, preferências da família, condições de pagamento..."
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              {/* Notas Privadas / Confidenciais */}
              <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
                <label className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Notas Confidenciais do Corretor
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Apenas você tem acesso</span>
                </label>
                <textarea
                  rows={4}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Estratégia de fechamento, comissões acordadas, objeções sensíveis..."
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Anotações</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 6: PREFERÊNCIAS & TAGS */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              
              {/* Tags Manager */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
                  Tags do Lead
                </h4>

                <form onSubmit={handleAddTagSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar tag (Ex: Investidor, À Vista, Permuta, Urgente)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs transition-colors"
                  >
                    + Tag
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(!lead.tags || lead.tags.length === 0) ? (
                    <span className="text-xs text-slate-400">Nenhuma tag cadastrada</span>
                  ) : (
                    lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-2xs"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => onRemoveTag(lead.id, tag)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Preferências de Busca */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
                  Critérios de Busca do Cliente
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Tipologias de Interesse:</span>
                    <div className="flex flex-wrap gap-1">
                      {lead.preferredPropertyTypes && lead.preferredPropertyTypes.length > 0 ? (
                        lead.preferredPropertyTypes.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold uppercase text-[10px]">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">Qualquer tipo</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Bairros / Localizações:</span>
                    <div className="flex flex-wrap gap-1">
                      {lead.preferredNeighborhoods && lead.preferredNeighborhoods.length > 0 ? (
                        lead.preferredNeighborhoods.map((n, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            📍 {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">{lead.preferredCity || 'Qualquer localização'}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Quartos Mínimos:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lead.minBedrooms ? `${lead.minBedrooms}+ Quartos` : 'Sem preferência'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Vagas de Garagem:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lead.minParkingSpaces ? `${lead.minParkingSpaces}+ Vagas` : 'Sem preferência'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            ID do Lead: <strong className="font-mono">{lead.id}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold transition-colors"
          >
            Fechar Dossiê
          </button>
        </div>

      </div>
    </div>
  );
};
