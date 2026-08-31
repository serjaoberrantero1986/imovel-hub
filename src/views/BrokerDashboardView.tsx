import React from 'react';
import { 
  Building2, 
  Users, 
  Eye, 
  TrendingUp, 
  PlusCircle, 
  Calendar, 
  MessageSquare, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Download,
  Share2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCompactNumber, formatDateTime } from '../lib/utils';

export const BrokerDashboardView: React.FC = () => {
  const { 
    properties, 
    leads, 
    currentUser, 
    setCurrentView, 
    setIsWizardOpen, 
    setEditingProperty,
    openPropertyDetail 
  } = useApp();

  // Compute metrics
  const myProperties = properties.filter(p => p.userId === currentUser.id || true); // broker demo shows all/theirs
  const activeCount = myProperties.filter(p => p.status === 'active').length;
  const totalViews = myProperties.reduce((sum, p) => sum + p.viewsCount, 0);
  const totalLeads = leads.length;
  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '3.8';

  // Analytics Mock Series for Recharts
  const viewsTrendData = [
    { day: '01/08', views: 320, leads: 12 },
    { day: '05/08', views: 480, leads: 18 },
    { day: '10/08', views: 650, leads: 26 },
    { day: '15/08', views: 890, leads: 34 },
    { day: '20/08', views: 1120, leads: 48 },
    { day: '25/08', views: 1450, leads: 62 },
    { day: '31/08', views: 1820, leads: 79 },
  ];

  const leadsByOriginData = [
    { origin: 'Formulário', count: 42, fill: '#e11d48' },
    { origin: 'WhatsApp', count: 68, fill: '#10b981' },
    { origin: 'Agendamento', count: 24, fill: '#6366f1' },
    { origin: 'Compartilhamento', count: 15, fill: '#f59e0b' },
  ];

  const propertyTypeDistribution = [
    { name: 'Apartamentos', value: 45, color: '#e11d48' },
    { name: 'Casas Condomínio', value: 35, color: '#6366f1' },
    { name: 'Lançamentos', value: 15, color: '#10b981' },
    { name: 'Comercial', value: 5, color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Dashboard Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">
                Painel do Corretor
              </span>
              <span className="text-xs text-slate-400 font-medium">Atualizado em tempo real</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Olá, {currentUser.name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {currentUser.agencyName || 'Imobiliária Parceira'} • CRECI {currentUser.creci || '9835-J'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('crm_leads')}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Abrir CRM Leads ({leads.length})</span>
            </button>

            <button
              onClick={() => {
                setEditingProperty(null);
                setIsWizardOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Anúncio</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Imóveis Ativos</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {activeCount}
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +2 este mês
              </span>
            </div>
            <div className="text-[11px] text-slate-400">100% com fotos em alta resolução</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Leads</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {totalLeads}
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +18% vs jul
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Tempo médio de resposta: 14 min</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Visualizações Totais</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {totalViews.toLocaleString('pt-BR')}
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +32%
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Alcance de 4.800 compradores</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Taxa de Conversão</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {conversionRate}%
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                Acima da média
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Média de mercado: 2.1%</div>
          </div>

        </div>

        {/* Recharts Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Area Chart: Views & Interactions Trend */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                  Evolução de Visualizações & Contatos no Mês
                </h3>
                <p className="text-xs text-slate-500">Métricas diárias consolidadas de todos os anúncios ativos</p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="views" name="Visualizações" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#colorViews)" />
                  <Area type="monotone" dataKey="leads" name="Leads Gerados" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Leads by Channel Origin */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                Origem dos Contatos
              </h3>
              <p className="text-xs text-slate-500">Canais de maior conversão de leads</p>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByOriginData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="origin" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" name="Contatos" radius={[8, 8, 0, 0]}>
                    {leadsByOriginData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Bottom Section: Top Performing Properties Table */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                Desempenho dos Seus Anúncios
              </h3>
              <p className="text-xs text-slate-500">Métricas individuais de engajamento e status no portal</p>
            </div>
            <button
              onClick={() => setCurrentView('my_properties')}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Ver todos ({properties.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Imóvel / Código</th>
                  <th className="py-3 px-3">Tipo & Local</th>
                  <th className="py-3 px-3">Preço</th>
                  <th className="py-3 px-3 text-center">Visualizações</th>
                  <th className="py-3 px-3 text-center">Leads</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {myProperties.slice(0, 5).map(prop => (
                  <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={prop.media[0]?.thumbnailUrl || prop.media[0]?.url}
                          alt={prop.title}
                          className="w-12 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1 max-w-xs">{prop.title}</div>
                          <span className="text-[10px] font-mono text-slate-400">Cód: {prop.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      <div>{prop.neighborhood}</div>
                      <div className="text-[10px] text-slate-400">{prop.city}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(prop.price)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-600">
                      {prop.viewsCount}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {prop.leadsCount}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openPropertyDetail(prop.id)}
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
