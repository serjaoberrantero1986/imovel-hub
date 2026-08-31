import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Building2, 
  DollarSign, 
  MapPin, 
  Tag, 
  FileText, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Lead, LeadStatus, Property } from '../../types';
import { KANBAN_STAGES } from './CrmKanbanBoard';

interface CrmNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const CrmNewLeadModal: React.FC<CrmNewLeadModalProps> = ({
  isOpen,
  onClose,
  properties,
  onAddLead,
}) => {
  if (!isOpen) return null;

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerDocument, setBuyerDocument] = useState('');
  const [buyerOccupation, setBuyerOccupation] = useState('');
  const [origin, setOrigin] = useState<Lead['origin']>('portal_form');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [priority, setPriority] = useState<Lead['priority']>('medium');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [budget, setBudget] = useState<string>('');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [preferredNeighborhoods, setPreferredNeighborhoods] = useState<string>('');
  const [minBedrooms, setMinBedrooms] = useState<string>('2');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('Novo Cliente, Quente');
  const [accessRestricted, setAccessRestricted] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerPhone.trim()) return;

    const chosenProp = properties.find(p => p.id === selectedPropertyId) || properties[0];

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const neighborhoods = preferredNeighborhoods
      .split(',')
      .map(n => n.trim())
      .filter(Boolean);

    await onAddLead({
      buyerName,
      buyerPhone,
      buyerEmail: buyerEmail || undefined,
      buyerDocument: buyerDocument || undefined,
      buyerOccupation: buyerOccupation || undefined,
      origin,
      status,
      priority,
      propertyId: chosenProp?.id,
      propertyTitle: chosenProp?.title || 'Busca Personalizada',
      propertyPrice: chosenProp?.price || Number(budget) || 0,
      propertyImage: chosenProp?.images[0]?.url,
      propertyCode: chosenProp?.code || 'GERAL',
      budget: budget ? Number(budget) : undefined,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      preferredNeighborhoods: neighborhoods.length > 0 ? neighborhoods : undefined,
      minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
      notes: notes || undefined,
      tags,
      accessRestricted,
      interactions: [
        {
          id: `int-${Date.now()}`,
          leadId: '',
          type: 'status_change',
          title: 'Lead Cadastrado no CRM',
          description: `Cliente cadastrado na etapa ${status.toUpperCase()} via ${origin}.`,
          createdAt: new Date().toISOString(),
          createdBy: 'Corretor'
        }
      ],
      tasks: [
        {
          id: `task-${Date.now()}`,
          leadId: '',
          title: 'Qualificação inicial e primeiro contato',
          type: 'call',
          priority: 'high',
          dueDate: new Date().toISOString().split('T')[0],
          completed: false
        }
      ]
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                Novo Cliente / Lead no CRM
              </h2>
              <p className="text-xs text-slate-500">
                Cadastre o comprador, preferências e imóvel de interesse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Dados Principais */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit'] text-[11px]">
              1. Dados do Cliente
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Mariana Vasconcellos"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="mariana@exemplo.com.br"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={buyerDocument}
                  onChange={(e) => setBuyerDocument(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Origem e Imóvel de Origem */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit'] text-[11px]">
              2. Origem & Imóvel de Interesse
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Canal de Origem
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as Lead['origin'])}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="portal_form">Formulário do Site</option>
                  <option value="whatsapp">WhatsApp Direto</option>
                  <option value="phone_call">Ligação Telefônica</option>
                  <option value="referral">Indicação</option>
                  <option value="social_media">Redes Sociais</option>
                  <option value="campaign">Google / Anúncios</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Estágio Inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  {KANBAN_STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Prioridade
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Lead['priority'])}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="vip">VIP</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Imóvel de Referência
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title} (R$ {p.price.toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preferências e Matchmaking */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit'] text-[11px]">
              3. Perfil de Compra & Match Inteligente
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Orçamento Máx (R$)
                </label>
                <input
                  type="number"
                  placeholder="1500000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Bairros de Interesse
                </label>
                <input
                  type="text"
                  placeholder="Jardins, Moema, Pinheiros"
                  value={preferredNeighborhoods}
                  onChange={(e) => setPreferredNeighborhoods(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Quartos Mínimos
                </label>
                <select
                  value={minBedrooms}
                  onChange={(e) => setMinBedrooms(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="1">1+ Quarto</option>
                  <option value="2">2+ Quartos</option>
                  <option value="3">3+ Quartos</option>
                  <option value="4">4+ Quartos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notas & Tags */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                placeholder="Investidor, À Vista, Permuta, Casal Novo"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Observações Iniciais
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Cliente tem imóvel quitado e busca upgrade para apartamento com varanda gourmet."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={accessRestricted}
                onChange={(e) => setAccessRestricted(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Proteger dados sensíveis por LGPD
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Lead no CRM</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
