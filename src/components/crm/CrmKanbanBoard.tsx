import React from 'react';
import { 
  Phone, 
  MessageSquare, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Tag, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Lead, LeadStatus, Property } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { calculatePropertyMatchScore } from '../../lib/crmMatching';

interface CrmKanbanBoardProps {
  leads: Lead[];
  properties: Property[];
  onOpenLead: (lead: Lead) => void;
  onAdvanceStage: (lead: Lead) => void;
  onChangeStage: (lead: Lead, status: LeadStatus) => void;
  onOpenProperty: (propertyId: string) => void;
}

export const KANBAN_STAGES: {
  id: LeadStatus;
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  borderHover: string;
}[] = [
  { 
    id: 'new', 
    title: 'NOVO LEAD', 
    subtitle: 'Aguardando contato', 
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60', 
    badgeText: 'text-rose-700 dark:text-rose-300', 
    dotColor: 'bg-rose-500 animate-pulse', 
    borderHover: 'hover:border-rose-400' 
  },
  { 
    id: 'contacted', 
    title: 'CONTATO REALIZADO', 
    subtitle: 'Qualificação inicial', 
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60', 
    badgeText: 'text-amber-700 dark:text-amber-300', 
    dotColor: 'bg-amber-500', 
    borderHover: 'hover:border-amber-400' 
  },
  { 
    id: 'interested', 
    title: 'INTERESSADO', 
    subtitle: 'Imóveis selecionados', 
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60', 
    badgeText: 'text-blue-700 dark:text-blue-300', 
    dotColor: 'bg-blue-500', 
    borderHover: 'hover:border-blue-400' 
  },
  { 
    id: 'visit_scheduled', 
    title: 'VISITA AGENDADA', 
    subtitle: 'Em campo / Presencial', 
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60', 
    badgeText: 'text-indigo-700 dark:text-indigo-300', 
    dotColor: 'bg-indigo-500', 
    borderHover: 'hover:border-indigo-400' 
  },
  { 
    id: 'proposal', 
    title: 'PROPOSTA', 
    subtitle: 'Proposta formalizada', 
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60', 
    badgeText: 'text-purple-700 dark:text-purple-300', 
    dotColor: 'bg-purple-500', 
    borderHover: 'hover:border-purple-400' 
  },
  { 
    id: 'negotiation', 
    title: 'NEGOCIAÇÃO', 
    subtitle: 'Alinhando minutas', 
    badgeBg: 'bg-violet-50 dark:bg-violet-950/60', 
    badgeText: 'text-violet-700 dark:text-violet-300', 
    dotColor: 'bg-violet-500', 
    borderHover: 'hover:border-violet-400' 
  },
  { 
    id: 'closed_won', 
    title: 'FECHADO', 
    subtitle: 'Contrato assinado', 
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60', 
    badgeText: 'text-emerald-700 dark:text-emerald-300', 
    dotColor: 'bg-emerald-500', 
    borderHover: 'hover:border-emerald-400' 
  },
  { 
    id: 'lost', 
    title: 'PERDIDO', 
    subtitle: 'Descartado / Arquivo', 
    badgeBg: 'bg-slate-100 dark:bg-slate-800', 
    badgeText: 'text-slate-600 dark:text-slate-400', 
    dotColor: 'bg-slate-400', 
    borderHover: 'hover:border-slate-400' 
  },
];

export const CrmKanbanBoard: React.FC<CrmKanbanBoardProps> = ({
  leads,
  properties,
  onOpenLead,
  onAdvanceStage,
  onChangeStage,
  onOpenProperty,
}) => {

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
    <div className="w-full overflow-x-auto pb-6 scrollbar-thin">
      <div className="flex gap-4 min-w-[1900px] items-start">
        
        {KANBAN_STAGES.map((stage, stageIndex) => {
          const stageLeads = leads.filter(l => l.status === stage.id);
          const stageTotalValue = stageLeads.reduce(
            (sum, l) => sum + (l.closedValue || l.budget || l.propertyPrice || 0), 
            0
          );

          return (
            <div
              key={stage.id}
              className="flex-1 min-w-[280px] max-w-[320px] bg-slate-100/80 dark:bg-slate-900/60 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex flex-col space-y-3 shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase font-['Outfit']">
                      {stage.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {stage.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs border border-slate-200 dark:border-slate-700">
                    {stageLeads.length}
                  </span>
                  {stageTotalValue > 0 && (
                    <span className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">
                      {formatCurrency(stageTotalValue)}
                    </span>
                  )}
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 min-h-[300px]">
                {stageLeads.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                    Nenhum lead nesta etapa
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    // Match score with origin property or first matching property
                    const matchedProperty = properties.find(p => p.id === lead.propertyId);
                    const matchResult = matchedProperty 
                      ? calculatePropertyMatchScore(lead, matchedProperty)
                      : null;

                    const pendingTasks = lead.tasks?.filter(t => !t.completed) || [];
                    const nextTask = pendingTasks[0];

                    return (
                      <div
                        key={lead.id}
                        onClick={() => onOpenLead(lead)}
                        className={`group p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200 cursor-pointer space-y-3 ${stage.borderHover}`}
                      >
                        {/* Top: Name & Priority / Privacy Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                {lead.buyerName}
                              </h4>
                              {lead.accessRestricted && (
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" title="Dados protegidos por política de privacidade" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {lead.buyerPhone}
                            </p>
                          </div>

                          {lead.priority && (
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              lead.priority === 'vip' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300' :
                              lead.priority === 'urgent' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 animate-pulse' :
                              lead.priority === 'high' ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {lead.priority}
                            </span>
                          )}
                        </div>

                        {/* Property Cardlet */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.propertyId) onOpenProperty(lead.propertyId);
                          }}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <img
                            src={lead.propertyImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80'}
                            alt={lead.propertyTitle}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                              {lead.propertyTitle}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                              <span>Cód: {lead.propertyCode}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {formatCurrency(lead.propertyPrice)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Matchmaker AI Score Pill */}
                        {matchResult && (
                          <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                            <span className="flex items-center gap-1 font-semibold">
                              <Sparkles className="w-3 h-3 text-emerald-500" />
                              Match Inteligente
                            </span>
                            <span className="font-mono font-black text-xs">
                              {matchResult.score}%
                            </span>
                          </div>
                        )}

                        {/* Tags list */}
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                #{tag}
                              </span>
                            ))}
                            {lead.tags.length > 3 && (
                              <span className="text-[9px] text-slate-400 font-bold">
                                +{lead.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Next Task / Follow-up Alert */}
                        {nextTask && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {nextTask.title} ({nextTask.dueTime || nextTask.dueDate})
                            </span>
                          </div>
                        )}

                        {/* Card Actions Footer */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                          
                          {/* Quick WhatsApp */}
                          <button
                            type="button"
                            onClick={(e) => handleWhatsAppClick(e, lead)}
                            title="Abrir WhatsApp com mensagem rápida"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-600 transition-colors flex items-center gap-1 text-[11px] font-bold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Stage Mover */}
                          <div className="flex items-center gap-1">
                            {stageIndex < KANBAN_STAGES.length - 2 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAdvanceStage(lead);
                                }}
                                title="Avançar para o próximo estágio"
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-0.5 transition-colors"
                              >
                                <span>Avançar</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            {stage.id !== 'closed_won' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChangeStage(lead, 'closed_won');
                                }}
                                title="Fechar Negócio"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
};
