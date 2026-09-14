import React, { useState, useMemo } from 'react';
import { 
  BookmarkCheck, 
  Bell, 
  BellRing, 
  BellOff, 
  Search, 
  ArrowRight, 
  Trash2, 
  Building2, 
  MapPin, 
  DollarSign, 
  Bed, 
  Maximize2, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Mail,
  LogIn
} from 'lucide-react';
import { useApp, DEFAULT_FILTERS } from '../context/AppContext';
import { SavedSearch, Property } from '../types';
import { filterProperties } from '../lib/propertyFilters';
import { PropertyCard } from '../components/properties/PropertyCard';

const PURPOSE_LABELS: Record<string, string> = {
  sale: 'Comprar (Venda)',
  rent: 'Alugar (Locação)',
  seasonal: 'Temporada',
  launch: 'Lançamento',
  all: 'Todas as Finalidades'
};

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  condo_house: 'Casa em Condomínio',
  penthouse: 'Cobertura',
  commercial: 'Comercial',
  land: 'Terreno',
  rural: 'Rural',
  chacara: 'Chácara',
  farm: 'Fazenda',
  launch: 'Em Lançamento'
};

const FREQUENCY_LABELS: Record<SavedSearch['alertFrequency'], { label: string; desc: string; color: string }> = {
  instant: { 
    label: 'Instantâneo', 
    desc: 'Notificação imediata assim que um imóvel compatível for publicado', 
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
  },
  daily: { 
    label: 'Diário', 
    desc: 'Resumo diário às 08:00 com as novas oportunidades do dia', 
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800' 
  },
  weekly: { 
    label: 'Semanal', 
    desc: 'Resumo semanal com tendências e novos imóveis da sua região', 
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
  },
  none: { 
    label: 'Desativado', 
    desc: 'Busca salva sem disparos de notificações automáticas', 
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' 
  }
};

export const SavedSearchesView: React.FC = () => {
  const { 
    savedSearches, 
    deleteSavedSearch, 
    updateSavedSearchAlert, 
    setFilters, 
    resetFilters,
    setCurrentView,
    properties,
    currentUser,
    isAuthenticated,
    openAuthModal
  } = useApp();

  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calculate matching properties for each saved search
  const searchesWithMatches = useMemo(() => {
    return savedSearches.map(search => {
      const mergedFilters = {
        ...DEFAULT_FILTERS,
        ...search.filters
      };
      const matched = filterProperties(properties, mergedFilters);
      return {
        ...search,
        matchedProperties: matched,
        actualMatchCount: matched.length
      };
    });
  }, [savedSearches, properties]);

  const activeAlertsCount = savedSearches.filter(s => s.alertFrequency !== 'none').length;
  const totalMatchesCount = searchesWithMatches.reduce((acc, s) => acc + s.actualMatchCount, 0);

  const handleApplySearch = (search: SavedSearch) => {
    setFilters({
      ...DEFAULT_FILTERS,
      ...search.filters
    });
    setCurrentView('search');
  };

  const handleCreateNewSearch = () => {
    resetFilters();
    setCurrentView('search');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 sm:py-8 transition-colors safe-bottom-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-extrabold uppercase tracking-wide">
                Alertas & Filtros Salvos
              </span>
              <span className="text-xs text-slate-500 font-medium">Radar Imobiliário</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Alertas e Buscas Salvas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
              Gerencie seus filtros de pesquisa favoritos e receba notificações automáticas quando novos imóveis compatíveis entrarem no portal.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="new-search-btn"
              type="button"
              onClick={handleCreateNewSearch}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Criar Nova Busca</span>
            </button>
          </div>
        </div>

        {/* Guest Warning Banner */}
        {!isAuthenticated && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Você está navegando como visitante
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Faça login na sua conta para salvar buscas personalizadas e receber alertas automáticos de novos imóveis.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shrink-0 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Fazer Login</span>
            </button>
          </div>
        )}

        {/* KPI / Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Buscas Salvas</p>
              <h4 className="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {savedSearches.length}
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Alertas Ativos</p>
              <h4 className="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {activeAlertsCount}
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Imóveis Compatíveis</p>
              <h4 className="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {totalMatchesCount} <span className="text-xs font-normal text-slate-400">no portal hoje</span>
              </h4>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {savedSearches.length === 0 ? (
          /* Empty State */
          <div className="py-16 sm:py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center mx-auto">
              <BookmarkCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Você ainda não tem buscas ou alertas salvos
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Ao pesquisar imóveis no portal, use o botão <strong className="text-slate-700 dark:text-slate-300">"Salvar Busca"</strong> na barra de filtros. Você poderá ativar alertas automáticos para ser avisado sempre que surgir um imóvel dentro do seu perfil desejado.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Fazer Login para Salvar</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCreateNewSearch}
                className={`px-6 py-3 rounded-2xl ${!isAuthenticated ? 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700' : 'bg-sky-600 hover:bg-sky-700 text-white'} text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer`}
              >
                <span>Explorar Imóveis & Salvar Filtros</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* List of Saved Searches */
          <div className="space-y-4">
            {searchesWithMatches.map(search => {
              const freqConfig = FREQUENCY_LABELS[search.alertFrequency] || FREQUENCY_LABELS.daily;
              const isExpanded = expandedSearchId === search.id;
              const f = search.filters || {};

              return (
                <div 
                  key={search.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-sky-300 dark:hover:border-sky-800"
                >
                  {/* Card Header & Main Info */}
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Title & Meta */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${freqConfig.color}`}>
                            {search.alertFrequency === 'none' ? (
                              <BellOff className="w-3.5 h-3.5" />
                            ) : (
                              <BellRing className="w-3.5 h-3.5" />
                            )}
                            <span>Alerta {freqConfig.label}</span>
                          </span>

                          <span className="text-xs text-slate-400 font-medium">
                            Salvo em {formatDate(search.createdAt)}
                          </span>

                          {search.actualMatchCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/80">
                              {search.actualMatchCount} imóveis disponíveis
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                          {search.title}
                        </h3>
                      </div>

                      {/* Right: Primary Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplySearch(search)}
                          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Ver Resultados ({search.actualMatchCount})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {search.actualMatchCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedSearchId(isExpanded ? null : search.id)}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                          >
                            <span>Preview</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {deleteConfirmId === search.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 p-1 rounded-xl border border-rose-200 dark:border-rose-900">
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-2">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                deleteSavedSearch(search.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(search.id)}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remover Busca Salva"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Criteria Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      {/* Purpose */}
                      {f.purpose && f.purpose !== 'all' && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <strong>Finalidade:</strong> {PURPOSE_LABELS[f.purpose] || f.purpose}
                        </span>
                      )}

                      {/* Types */}
                      {f.types && f.types.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <strong>Tipos:</strong> {f.types.map(t => TYPE_LABELS[t] || t).join(', ')}
                        </span>
                      )}

                      {/* City */}
                      {f.city && f.city !== 'all' && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <strong>Cidade:</strong> {f.city}
                        </span>
                      )}

                      {/* Neighborhoods */}
                      {f.neighborhoods && f.neighborhoods.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          <strong>Bairros:</strong> {f.neighborhoods.join(', ')}
                        </span>
                      )}

                      {/* Bedrooms */}
                      {f.bedrooms && f.bedrooms !== 'any' && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <strong>Quartos:</strong> {f.bedrooms}+
                        </span>
                      )}

                      {/* Price Range */}
                      {(f.minPrice || f.maxPrice) && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <strong>Faixa:</strong> {f.minPrice ? formatCurrency(f.minPrice) : 'R$ 0'} até {f.maxPrice ? formatCurrency(f.maxPrice) : 'Sem limite'}
                        </span>
                      )}

                      {/* Area Range */}
                      {(f.minArea || f.maxArea) && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                          <strong>Área:</strong> {f.minArea || 0}m² a {f.maxArea ? `${f.maxArea}m²` : 'livre'}
                        </span>
                      )}

                      {/* Search Term */}
                      {f.searchTerm && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          <strong>Termo:</strong> "{f.searchTerm}"
                        </span>
                      )}

                      {/* Amenities */}
                      {f.amenities && f.amenities.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          <strong>Comodidades:</strong> {f.amenities.length} selecionadas
                        </span>
                      )}
                    </div>

                    {/* Alert Frequency Quick Controls */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Disparo de Alertas:
                        </span>
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          {freqConfig.desc}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        {(['instant', 'daily', 'weekly', 'none'] as const).map(freq => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => updateSavedSearchAlert(search.id, freq)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                              search.alertFrequency === freq
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {freq === 'instant' ? 'Instantâneo' : freq === 'daily' ? 'Diário' : freq === 'weekly' ? 'Semanal' : 'Pausar'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Preview Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Imóveis correspondentes em tempo real ({search.actualMatchCount})</span>
                        </h4>

                        <button
                          type="button"
                          onClick={() => handleApplySearch(search)}
                          className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1"
                        >
                          <span>Abrir pesquisa completa</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {search.matchedProperties.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          Nenhum imóvel cadastrado no momento atende todos os critérios exatos desta busca. Você será notificado assim que um novo for cadastrado!
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {search.matchedProperties.slice(0, 3).map(property => (
                            <PropertyCard key={property.id} property={property} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Informative Security & How-it-Works Footer Card */}
        <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent p-5 sm:p-6 rounded-3xl border border-sky-200/60 dark:border-sky-900/40 space-y-3">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
            <h4 className="text-sm font-bold font-['Outfit']">
              Como funcionam os alertas imobiliários inteligentes?
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            Sempre que corretores e imobiliárias publicam um novo imóvel ou ajustam valores para baixo, nosso radar compara os atributos do anúncio com suas buscas salvas. Se houver correspondência, enviamos o aviso de acordo com sua periodicidade escolhida (instantânea, diária ou semanal). Você pode pausar ou excluir o alerta a qualquer momento com total privacidade e sem spam.
          </p>
        </div>

      </div>
    </div>
  );
};
