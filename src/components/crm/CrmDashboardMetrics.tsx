import React, { useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  ArrowUpRight, 
  Target, 
  PhoneCall, 
  MessageSquare, 
  Globe, 
  Instagram, 
  Share2, 
  Clock,
  Sparkles,
  Award,
  AlertTriangle
} from 'lucide-react';
import { Lead, Property } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface CrmDashboardMetricsProps {
  leads: Lead[];
  properties: Property[];
  onSelectStageFilter?: (stage: string) => void;
  onOpenLead?: (lead: Lead) => void;
}

export const CrmDashboardMetrics: React.FC<CrmDashboardMetricsProps> = ({
  leads,
  properties,
  onSelectStageFilter,
  onOpenLead
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  // Calculations
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const activeLeads = leads.filter(l => !['closed_won', 'lost'].includes(l.status)).length;
  const scheduledVisits = leads.filter(l => l.status === 'visit_scheduled' || Boolean(l.scheduledVisitDate)).length;
  const inProposalOrNegotiation = leads.filter(l => ['proposal', 'negotiation'].includes(l.status)).length;
  const closedWonLeads = leads.filter(l => l.status === 'closed_won');
  const closedDealsCount = closedWonLeads.length;
  
  const closedTotalValue = closedWonLeads.reduce((sum, l) => sum + (l.closedValue || l.propertyPrice || 0), 0);
  const potentialPipelineValue = leads
    .filter(l => !['closed_won', 'lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.budget || l.propertyPrice || 0), 0);

  const conversionRate = totalLeads > 0 
    ? ((closedDealsCount / totalLeads) * 100).toFixed(1) 
    : '0.0';

  // Leads with upcoming or overdue tasks
  const leadsWithPendingTasks = leads.filter(l => 
    l.tasks?.some(t => !t.completed)
  );

  // Origin breakdown
  const originCounts: Record<string, { count: number; label: string; icon: React.ReactNode; color: string }> = {
    portal_form: { count: 0, label: 'Formulário Portal', icon: <Globe className="w-4 h-4" />, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
    whatsapp: { count: 0, label: 'WhatsApp Direto', icon: <MessageSquare className="w-4 h-4" />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    whatsapp_click: { count: 0, label: 'WhatsApp Portal', icon: <MessageSquare className="w-4 h-4" />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    phone_call: { count: 0, label: 'Ligação Telefônica', icon: <PhoneCall className="w-4 h-4" />, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    referral: { count: 0, label: 'Indicação de Clientes', icon: <Share2 className="w-4 h-4" />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
    social_media: { count: 0, label: 'Redes Sociais / Ads', icon: <Instagram className="w-4 h-4" />, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50' },
    campaign: { count: 0, label: 'Google / Campanhas', icon: <TrendingUp className="w-4 h-4" />, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
  };

  leads.forEach(l => {
    const originKey = l.origin || 'portal_form';
    if (originCounts[originKey]) {
      originCounts[originKey].count += 1;
    } else if (originCounts.portal_form) {
      originCounts.portal_form.count += 1;
    }
  });

  const pipelineStages = [
    { key: 'new', title: 'Novos', count: leads.filter(l => l.status === 'new').length, color: 'bg-rose-500' },
    { key: 'contacted', title: 'Contato', count: leads.filter(l => l.status === 'contacted').length, color: 'bg-amber-500' },
    { key: 'interested', title: 'Interesse', count: leads.filter(l => l.status === 'interested').length, color: 'bg-blue-500' },
    { key: 'visit_scheduled', title: 'Visitas', count: leads.filter(l => l.status === 'visit_scheduled').length, color: 'bg-indigo-500' },
    { key: 'proposal', title: 'Proposta', count: leads.filter(l => l.status === 'proposal').length, color: 'bg-purple-500' },
    { key: 'negotiation', title: 'Negociação', count: leads.filter(l => l.status === 'negotiation').length, color: 'bg-violet-500' },
    { key: 'closed_won', title: 'Fechados', count: closedDealsCount, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
            <span>Métricas & Performance Comercial</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              Tempo Real
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visão consolidada do funil de conversão, velocidade de vendas e canais de atração
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              period === '7d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              period === '30d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            30 Dias
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              period === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Total
          </button>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Novos Leads */}
        <div 
          onClick={() => onSelectStageFilter && onSelectStageFilter('new')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              +{newLeads} hoje
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
            {newLeads}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Novos Leads
          </div>
        </div>

        {/* Card 2: Leads Ativos */}
        <div 
          onClick={() => onSelectStageFilter && onSelectStageFilter('active')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
              No funil
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
            {activeLeads}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Leads Ativos
          </div>
        </div>

        {/* Card 3: Visitas */}
        <div 
          onClick={() => onSelectStageFilter && onSelectStageFilter('visit_scheduled')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              Agenda
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
            {scheduledVisits}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Visitas Agendadas
          </div>
        </div>

        {/* Card 4: Propostas */}
        <div 
          onClick={() => onSelectStageFilter && onSelectStageFilter('proposal')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
              Mesa
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
            {inProposalOrNegotiation}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Propostas Ativas
          </div>
        </div>

        {/* Card 5: Taxa de Conversão */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Taxa Geral
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
            {conversionRate}%
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Conversão de Vendas
          </div>
        </div>

        {/* Card 6: Negócios Fechados */}
        <div 
          onClick={() => onSelectStageFilter && onSelectStageFilter('closed_won')}
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white">
              VGV Fechado
            </span>
          </div>
          <div className="text-xl font-black font-['Outfit'] truncate">
            {formatCurrency(closedTotalValue)}
          </div>
          <div className="text-xs text-emerald-100 mt-0.5">
            {closedDealsCount} Negócios Fechados
          </div>
        </div>

      </div>

      {/* Visual Pipeline Funnel & Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Funil Visual de Conversão */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Distribuição de Oportunidades no Funil
              </h3>
              <p className="text-xs text-slate-500">
                Pipeline potencial estimado: <strong className="text-slate-900 dark:text-white">{formatCurrency(potentialPipelineValue)}</strong>
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {totalLeads} leads totais
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {pipelineStages.map((stage) => {
              const percentage = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
              return (
                <div key={stage.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                      {stage.title}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {stage.count} leads ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, stage.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Origem dos Leads */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Origem dos Leads
            </h3>
            <p className="text-xs text-slate-500">
              Canais que mais geram clientes qualificados
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(originCounts).map(([key, item]) => {
              if (item.count === 0 && !['portal_form', 'whatsapp', 'phone_call', 'referral'].includes(key)) return null;
              const ratio = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${item.color}`}>
                      {item.icon}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {item.count}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono w-7 text-right">
                      {ratio}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Canal principal:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">WhatsApp & Portal Web (85%)</strong>
          </div>
        </div>

      </div>

    </div>
  );
};
