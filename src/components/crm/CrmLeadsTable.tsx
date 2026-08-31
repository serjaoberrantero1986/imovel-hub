import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Eye, 
  Filter,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { Lead, LeadStatus, Property } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { calculatePropertyMatchScore } from '../../lib/crmMatching';
import { KANBAN_STAGES } from './CrmKanbanBoard';

interface CrmLeadsTableProps {
  leads: Lead[];
  properties: Property[];
  onOpenLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  onDeleteLead: (lead: Lead) => void;
  onOpenProperty: (propertyId: string) => void;
}

export const CrmLeadsTable: React.FC<CrmLeadsTableProps> = ({
  leads,
  properties,
  onOpenLead,
  onUpdateStatus,
  onDeleteLead,
  onOpenProperty,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');

  const filteredLeads = leads.filter(lead => {
    if (stageFilter !== 'all' && lead.status !== stageFilter) return false;
    if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false;
    if (originFilter !== 'all' && lead.origin !== originFilter) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.buyerName.toLowerCase().includes(term) ||
      lead.buyerPhone.includes(term) ||
      (lead.buyerEmail && lead.buyerEmail.toLowerCase().includes(term)) ||
      (lead.buyerDocument && lead.buyerDocument.includes(term)) ||
      lead.propertyTitle.toLowerCase().includes(term) ||
      (lead.propertyCode && lead.propertyCode.toLowerCase().includes(term)) ||
      (lead.tags && lead.tags.some(t => t.toLowerCase().includes(term)))
    );
  });

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const handleWhatsAppClick = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    const phone = lead.buyerWhatsapp || getCleanPhone(lead.buyerPhone);
    const cleanNumber = phone.startsWith('55') ? phone : `55${phone}`;
    const text = encodeURIComponent(
      `Olá ${lead.buyerName}, tudo bem? Sou o Edson da ImovelHub. Estou entrando em contato a respeito do seu interesse no imóvel ${lead.propertyTitle} (Cód: ${lead.propertyCode}). Como posso te ajudar hoje?`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Multi-Filters Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email, CPF ou tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          
          {/* Estágio */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">Todos os Estágios</option>
            {KANBAN_STAGES.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {/* Prioridade */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="vip">VIP</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {/* Origem */}
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">Todas as Origens</option>
            <option value="portal_form">Portal Web</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone_call">Telefone</option>
            <option value="referral">Indicação</option>
            <option value="social_media">Redes Sociais</option>
          </select>

        </div>

      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            
            {/* Table Head */}
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Cliente / Contato</th>
                <th className="py-3.5 px-4">Imóvel & Orçamento</th>
                <th className="py-3.5 px-4">Match %</th>
                <th className="py-3.5 px-4">Estágio no Funil</th>
                <th className="py-3.5 px-4">Próximo Follow-up</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum cliente ou lead encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const matchedProp = properties.find(p => p.id === lead.propertyId);
                  const matchResult = matchedProp ? calculatePropertyMatchScore(lead, matchedProp) : null;
                  const nextTask = lead.tasks?.find(t => !t.completed);

                  return (
                    <tr 
                      key={lead.id}
                      onClick={() => onOpenLead(lead)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center font-bold font-['Outfit'] shrink-0">
                            {lead.buyerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {lead.buyerName}
                              </span>
                              {lead.accessRestricted && (
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" title="Protegido por LGPD" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                              <span>{lead.buyerPhone}</span>
                              {lead.origin && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px]">
                                  {lead.origin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Imóvel & Orçamento */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (lead.propertyId) onOpenProperty(lead.propertyId);
                            }}
                            className="font-bold text-slate-900 dark:text-white hover:text-rose-600 truncate flex items-center gap-1"
                          >
                            <span>{lead.propertyTitle}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {lead.budget ? formatCurrency(lead.budget) : formatCurrency(lead.propertyPrice)}
                          </div>
                        </div>
                      </td>

                      {/* Match % */}
                      <td className="py-3.5 px-4">
                        {matchResult ? (
                          <span className={`px-2 py-1 rounded-lg text-xs font-mono font-black flex items-center gap-1 w-max ${
                            matchResult.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            matchResult.score >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            {matchResult.score}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Estágio no Funil */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs outline-hidden"
                        >
                          {KANBAN_STAGES.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      </td>

                      {/* Próximo Follow-up */}
                      <td className="py-3.5 px-4">
                        {nextTask ? (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[140px]">{nextTask.title} ({nextTask.dueDate})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Nenhum agendado</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleWhatsAppClick(e, lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenLead(lead)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                            title="Ver Dossiê Completo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteLead(lead)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 transition-colors"
                            title="Excluir Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};
