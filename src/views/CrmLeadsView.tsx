import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Building, 
  DollarSign,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead, LeadStatus } from '../types';
import { formatCurrency, formatDateTime } from '../lib/utils';

export const CrmLeadsView: React.FC = () => {
  const { leads, updateLeadStatus, updateLeadNotes, openPropertyDetail, addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState('');

  const statusColumns: { id: LeadStatus; title: string; color: string; bg: string }[] = [
    { id: 'new', title: 'Novo Lead', color: 'border-rose-500 text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40' },
    { id: 'contacted', title: 'Contato Realizado', color: 'border-amber-500 text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { id: 'visit_scheduled', title: 'Visita Agendada', color: 'border-indigo-500 text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
    { id: 'proposal_sent', title: 'Proposta / Negociação', color: 'border-purple-500 text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { id: 'closed_won', title: 'Fechado / Ganho', color: 'border-emerald-500 text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  ];

  const filteredLeads紧 = leads.filter(l => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.buyerName.toLowerCase().includes(term) ||
      l.buyerPhone.includes(term) ||
      l.propertyTitle.toLowerCase().includes(term) ||
      (l.propertyCode && l.propertyCode.toLowerCase().includes(term))
    );
  });

  const handleOpenNotes = (lead: Lead) => {
    setSelectedLeadForNotes(lead);
    setNotesText(lead.notes || '');
  };

  const handleSaveNotes = () => {
    if (selectedLeadForNotes) {
      updateLeadNotes(selectedLeadForNotes.id, notesText);
      addToast({ type: 'success', title: 'Anotações Salvas', message: 'Histórico do lead atualizado.' });
      setSelectedLeadForNotes(null);
    }
  };

  const handleAdvanceStatus = (lead: Lead) => {
    const currentIndex = statusColumns.findIndex(c => c.id === lead.status);
    if (currentIndex < statusColumns.length - 1) {
      const nextStatus = statusColumns[currentIndex + 1].id;
      updateLeadStatus(lead.id, nextStatus);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header & Quick Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold uppercase">
                CRM Imobiliário
              </span>
              <span className="text-xs text-slate-400 font-medium">Funil Kanban de Vendas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Gestão de Leads & Oportunidades
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Acompanhe o estágio de cada cliente desde o primeiro contato até o fechamento
            </p>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, fone ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 shadow-sm"
            />
          </div>
        </div>

        {/* Kanban Board Horizontal Columns Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4 scrollbar-none">
          {statusColumns.map(col => {
            const columnLeads = filteredLeads紧.filter(l => l.status === col.id);
            
            return (
              <div
                key={col.id}
                className="flex flex-col bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-3 min-w-[260px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      col.id === 'new' ? 'bg-rose-500 animate-pulse' :
                      col.id === 'contacted' ? 'bg-amber-500' :
                      col.id === 'visit_scheduled' ? 'bg-indigo-500' :
                      col.id === 'proposal_sent' ? 'bg-purple-500' : 'bg-emerald-500'
                    }`} />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {col.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Cards List in Column */}
                <div className="space-y-3">
                  {columnLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      {/* Lead Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {lead.buyerName}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{lead.buyerPhone}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {lead.origin === 'portal_form' ? 'Portal' : 'WhatsApp'}
                        </span>
                      </div>

                      {/* Associated Property Mini Card */}
                      <div 
                        onClick={() => openPropertyDetail(lead.propertyId)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 cursor-pointer group"
                      >
                        {lead.propertyImage && (
                          <img src={lead.propertyImage} className="w-10 h-8 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600">
                            {lead.propertyTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Cód: {lead.propertyCode}
                          </div>
                        </div>
                      </div>

                      {/* Scheduled Visit Tag */}
                      {lead.scheduledVisitDate && (
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Visita: {formatDateTime(lead.scheduledVisitDate)}</span>
                        </div>
                      )}

                      {/* Notes snippet */}
                      {lead.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl italic line-clamp-2">
                          "{lead.notes}"
                        </p>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/55${lead.buyerPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100"
                            title="Chamar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleOpenNotes(lead)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                            title="Anotações do Corretor"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {col.id !== 'closed_won' && (
                          <button
                            onClick={() => handleAdvanceStatus(lead)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold flex items-center gap-1 hover:opacity-90 transition-opacity"
                          >
                            <span>Avançar</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhum lead nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lead Notes Modal */}
        {selectedLeadForNotes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Anotações: {selectedLeadForNotes.buyerName}
                  </h3>
                  <p className="text-xs text-slate-500">Histórico de atendimento e preferências</p>
                </div>
                <button onClick={() => setSelectedLeadForNotes(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <textarea
                rows={5}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Ex: Cliente prefere apartamentos acima do 10º andar, possui carta de crédito pré-aprovada na Caixa..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedLeadForNotes(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  Salvar Anotações
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
