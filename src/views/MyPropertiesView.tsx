import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Property, PropertyStatus } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

export const MyPropertiesView: React.FC = () => {
  const { 
    properties, 
    currentUser, 
    deleteProperty, 
    togglePropertyStatus, 
    setIsWizardOpen, 
    setEditingProperty, 
    openPropertyDetail 
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const myProperties = properties.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
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
    setEditingProperty(null);
    setIsWizardOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">
                Meus Anúncios
              </span>
              <span className="text-xs text-slate-400 font-medium">Gestão de Estoque</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Gerenciar Meus Imóveis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Edite informações, fotos, valores ou pause e reative anúncios instantaneamente
            </p>
          </div>

          <button
            onClick={handleCreateNew}
            className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar Novo Imóvel</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'paused', label: 'Pausados' },
              { id: 'sold', label: 'Vendidos / Alugados' },
              { id: 'draft', label: 'Rascunhos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  filterStatus === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar anúncio por código ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
          </div>

        </div>

        {/* Listings Table / Grid */}
        <div className="grid grid-cols-1 gap-4">
          {myProperties.map(prop => (
            <div
              key={prop.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            >
              {/* Image & Title Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                  <img
                    src={prop.media[0]?.thumbnailUrl || prop.media[0]?.url}
                    alt={prop.title}
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ${
                    prop.status === 'active' ? 'bg-emerald-600' : prop.status === 'paused' ? 'bg-amber-600' : 'bg-slate-700'
                  }`}>
                    {prop.status === 'active' ? 'Ativo' : prop.status === 'paused' ? 'Pausado' : 'Vendido'}
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {prop.code}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">
                      {prop.purpose === 'sale' ? 'Venda' : prop.purpose === 'rent' ? 'Locação' : 'Lançamento'} • {prop.type}
                    </span>
                  </div>

                  <h3 
                    onClick={() => openPropertyDetail(prop.id)}
                    className="text-base font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-rose-600 transition-colors"
                  >
                    {prop.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{prop.neighborhood}, {prop.city}</span>
                    <span>•</span>
                    <span>{prop.usefulArea || prop.totalArea} m²</span>
                    <span>•</span>
                    <span>{prop.bedrooms} qts</span>
                  </div>
                </div>
              </div>

              {/* Price & Stats Metrics */}
              <div className="flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                <div className="text-left md:text-right">
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(prop.price)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Criado em {formatDate(prop.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="text-center">
                    <div className="font-bold text-slate-900 dark:text-white">{prop.viewsCount}</div>
                    <div className="text-[10px] text-slate-400">Visitas</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{prop.leadsCount}</div>
                    <div className="text-[10px] text-slate-400">Leads</div>
                  </div>
                </div>

                {/* Actions Button Group */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(prop)}
                    title="Editar Anúncio"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => togglePropertyStatus(prop.id, prop.status === 'active' ? 'paused' : 'active')}
                    title={prop.status === 'active' ? 'Pausar Anúncio' : 'Ativar Anúncio'}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {prop.status === 'active' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                  </button>

                  <button
                    onClick={() => openPropertyDetail(prop.id)}
                    title="Ver Detalhes do Anúncio"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-indigo-500" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir o anúncio "${prop.title}"?`)) {
                        deleteProperty(prop.id);
                      }
                    }}
                    title="Excluir Anúncio"
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          ))}

          {myProperties.length === 0 && (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum imóvel encontrado</p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Cadastrar Primeiro Imóvel
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
