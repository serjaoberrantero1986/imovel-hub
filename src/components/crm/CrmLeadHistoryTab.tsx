import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Lead, LeadInteraction } from '../../types';
import { formatDateTime } from '../../lib/utils';

interface CrmLeadHistoryTabProps {
  lead: Lead;
  onAddInteraction: (leadId: string, interaction: Omit<LeadInteraction, 'id' | 'createdAt'>) => Promise<void>;
}

export const CrmLeadHistoryTab: React.FC<CrmLeadHistoryTabProps> = ({
  lead,
  onAddInteraction,
}) => {
  const [newInteractionType, setNewInteractionType] = useState<LeadInteraction['type']>('whatsapp');
  const [newInteractionTitle, setNewInteractionTitle] = useState('');
  const [newInteractionDesc, setNewInteractionDesc] = useState('');

  const handleCreateInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteractionTitle.trim()) return;
    await onAddInteraction(lead.id, {
      leadId: lead.id,
      type: newInteractionType,
      title: newInteractionTitle,
      description: newInteractionDesc,
      createdBy: 'Corretor Responsável',
    });
    setNewInteractionTitle('');
    setNewInteractionDesc('');
  };

  return (
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
  );
};
