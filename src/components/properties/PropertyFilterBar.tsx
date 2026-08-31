import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  Check, 
  BookmarkPlus, 
  RotateCcw, 
  Building, 
  Home, 
  Sparkles,
  BedDouble,
  Car,
  Bath,
  Maximize2,
  Hash,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PropertyType, PropertyPurpose } from '../../types';
import { AMENITIES_LIST, POPULAR_NEIGHBORHOODS } from '../../lib/mockData';
import { formatCurrency } from '../../lib/utils';

export const PropertyFilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters, saveCurrentSearch, properties, openPropertyDetail } = useApp();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [searchTitleInput, setSearchTitleInput] = useState('');
  const [codeQuery, setCodeQuery] = useState(filters.propertyCode || '');

  const propertyTypes: { id: PropertyType; label: string; icon: any }[] = [
    { id: 'apartment', label: 'Apartamento', icon: Building },
    { id: 'condo_house', label: 'Casa em Condomínio', icon: Home },
    { id: 'house', label: 'Casa de Bairro', icon: Home },
    { id: 'penthouse', label: 'Cobertura', icon: Sparkles },
    { id: 'land', label: 'Terreno / Lote', icon: Building },
    { id: 'commercial', label: 'Comercial', icon: Building }
  ];

  const handlePurposeChange = (purpose: PropertyPurpose | 'all') => {
    setFilters(prev => ({ ...prev, purpose }));
  };

  const handleTypeToggle = (type: PropertyType) => {
    setFilters(prev => {
      const exists = prev.types.includes(type);
      const newTypes = exists ? prev.types.filter(t => t !== type) : [...prev.types, type];
      return { ...prev, types: newTypes };
    });
  };

  const handleAmenityToggle = (amenityId: string) => {
    setFilters(prev => {
      const exists = prev.amenities.includes(amenityId);
      const newAmenities = exists ? prev.amenities.filter(a => a !== amenityId) : [...prev.amenities, amenityId];
      return { ...prev, amenities: newAmenities };
    });
  };

  const handleSearchByCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = codeQuery.trim();
    setFilters(prev => ({ ...prev, propertyCode: clean }));
    setCodeModalOpen(false);
  };

  const handleClearCode = () => {
    setCodeQuery('');
    setFilters(prev => ({ ...prev, propertyCode: '' }));
  };

  const activeFiltersCount = 
    (filters.purpose !== 'all' ? 1 : 0) +
    filters.types.length +
    (filters.bedrooms !== 'any' ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.minArea || filters.maxArea ? 1 : 0) +
    filters.amenities.length +
    (filters.searchTerm ? 1 : 0) +
    (filters.propertyCode ? 1 : 0);

  const handleConfirmSaveSearch = () => {
    if (!searchTitleInput.trim()) return;
    saveCurrentSearch(searchTitleInput, 'daily');
    setSaveSearchModalOpen(false);
    setSearchTitleInput('');
  };

  // Code search matched suggestions
  const codeMatches = codeQuery.trim()
    ? properties.filter(p => p.code.toLowerCase().includes(codeQuery.trim().toLowerCase()))
    : properties.slice(0, 4);

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800/80 space-y-4 transition-colors">
      
      {/* Purpose Tabs & Save Search Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        
        {/* Purpose Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => handlePurposeChange('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filters.purpose === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => handlePurposeChange('sale')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filters.purpose === 'sale'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Comprar
          </button>
          <button
            onClick={() => handlePurposeChange('rent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filters.purpose === 'rent'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alugar
          </button>
          <button
            onClick={() => handlePurposeChange('launch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filters.purpose === 'launch'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Lançamentos</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>
        </div>

        {/* Action buttons: Code Search, Save Search & Reset */}
        <div className="flex items-center gap-2">
          {/* Quick Code Search Button */}
          <button
            onClick={() => setCodeModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filters.propertyCode
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-rose-500" />
            <span>{filters.propertyCode ? `Cód: ${filters.propertyCode}` : 'Buscar por Código'}</span>
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                resetFilters();
                setCodeQuery('');
              }}
              title="Limpar todos os filtros"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar ({activeFiltersCount})</span>
            </button>
          )}

          <button
            onClick={() => setSaveSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Salvar Busca</span>
          </button>
        </div>

      </div>

      {/* Main Search Input & Quick Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Search text box with Code Search Integrated */}
        <div className="md:col-span-6 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchTerm || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            placeholder="Digite cidade, bairro (ex: Campolim), condomínio ou código..."
            className="w-full pl-11 pr-28 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
          
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {filters.searchTerm && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setCodeModalOpen(true)}
              title="Buscar diretamente pelo código do imóvel"
              className="px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
            >
              <Hash className="w-3 h-3 text-rose-500" />
              <span>Código</span>
            </button>
          </div>
        </div>

        {/* Bedrooms Quick Filter */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 pl-2 pr-1">Quartos:</span>
            {[
              { val: 'any', label: 'Todos' },
              { val: 1, label: '1+' },
              { val: 2, label: '2+' },
              { val: 3, label: '3+' },
              { val: 4, label: '4+' }
            ].map(item => (
              <button
                key={String(item.val)}
                onClick={() => setFilters(prev => ({ ...prev, bedrooms: item.val as any }))}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  filters.bedrooms === item.val
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* More Filters Trigger */}
        <div className="md:col-span-3 flex items-center gap-2">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className={`flex-1 py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              advancedOpen || activeFiltersCount > 1
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Active Code Search Badge (if active) */}
      {filters.propertyCode && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200">
          <Hash className="w-4 h-4 text-rose-600" />
          <span>Filtrando especificamente pelo código: <strong>{filters.propertyCode}</strong></span>
          <button
            onClick={handleClearCode}
            className="ml-auto p-1 rounded-md text-rose-600 hover:bg-rose-200/50 dark:hover:bg-rose-900/60"
            title="Remover filtro de código"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Property Types Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Tipo de Imóvel:</span>
        {propertyTypes.map(t => {
          const isSelected = filters.types.includes(t.id);
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTypeToggle(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Expansion Drawer */}
      {advancedOpen && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-top-4 fade-in duration-200">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Faixa de Preço (R$)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters(p => ({ ...p, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Máximo"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters(p => ({ ...p, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Useful Area Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Área Útil (m²)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Mínimo m²"
                  value={filters.minArea || ''}
                  onChange={(e) => setFilters(p => ({ ...p, minArea: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Máximo m²"
                  value={filters.maxArea || ''}
                  onChange={(e) => setFilters(p => ({ ...p, maxArea: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Parking spots */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Vagas de Garagem
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { val: 'any', label: 'Todas' },
                  { val: 1, label: '1+' },
                  { val: 2, label: '2+' },
                  { val: 3, label: '3+' },
                  { val: 4, label: '4+' }
                ].map(spot => (
                  <button
                    key={String(spot.val)}
                    onClick={() => setFilters(p => ({ ...p, parkingSpots: spot.val as any }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      filters.parkingSpots === spot.val
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {spot.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Amenities Multi-Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Comodidades & Lazer
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {AMENITIES_LIST.map(amenity => {
                const isSelected = filters.amenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    onClick={() => handleAmenityToggle(amenity.id)}
                    className={`p-2 rounded-xl text-xs font-medium text-left flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{amenity.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action inside drawer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setAdvancedOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Aplicar Filtros
            </button>
          </div>

        </div>
      )}

      {/* Property Code Search Modal */}
      {codeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-rose-500" />
                <span>Busca por Código do Imóvel</span>
              </h3>
              <button onClick={() => setCodeModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o código completo ou os dígitos numéricos do imóvel (ex: <strong>10849201</strong> ou <strong>10849201-MEOA</strong>).
            </p>

            <form onSubmit={handleSearchByCode} className="space-y-3">
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value)}
                  placeholder="Ex: 10849201-MEOA"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Sample / Matching property codes */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {codeQuery.trim() ? 'Códigos Correspondentes:' : 'Códigos de Exemplo para Teste:'}
                </span>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {codeMatches.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setCodeQuery(p.code);
                        setFilters(prev => ({ ...prev, propertyCode: p.code }));
                        setCodeModalOpen(false);
                      }}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-rose-600 dark:text-rose-400"># {p.code}</span>
                          <span className="text-[10px] font-sans font-normal text-slate-500 truncate max-w-[180px]">{p.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.neighborhood} • {formatCurrency(p.price)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClearCode}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600"
                >
                  Limpar Código
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                  >
                    Filtrar por Código
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Search Dialog Modal */}
      {saveSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-rose-500" />
                <span>Salvar Critérios de Busca</span>
              </h3>
              <button onClick={() => setSaveSearchModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dê um nome para identificar este alerta. Notificaremos você sempre que um imóvel com esses requisitos for anunciado.
            </p>

            <input
              type="text"
              value={searchTitleInput}
              onChange={(e) => setSearchTitleInput(e.target.value)}
              placeholder="Ex: Apartamento 3 quartos no Campolim até R$ 800k"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSaveSearchModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSaveSearch}
                disabled={!searchTitleInput.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Salvar Alerta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
