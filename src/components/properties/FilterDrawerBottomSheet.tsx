import React, { useState, TouchEvent } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Check, 
  RotateCcw, 
  Building, 
  Home, 
  Sparkles, 
  BedDouble, 
  Car, 
  Bath, 
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PropertyType, PropertyPurpose } from '../../types';
import { AMENITIES_LIST, POPULAR_NEIGHBORHOODS } from '../../lib/mockData';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';

interface FilterDrawerBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCount: number;
}

export const FilterDrawerBottomSheet: React.FC<FilterDrawerBottomSheetProps> = ({
  isOpen,
  onClose,
  filteredCount
}) => {
  const { filters, setFilters, resetFilters } = useApp();
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (!isOpen) return null;

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

  // Drag down to close gesture
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientY;
    if (touchEnd - touchStart > 80) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet Modal Body */}
      <div 
        className="relative z-10 w-full max-h-[88vh] bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slideUp"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Handle Indicator */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                Filtros de Busca
              </h3>
              <p className="text-[11px] text-slate-500">Refine os critérios do catálogo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1.5 rounded-lg active:scale-95 transition-colors cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Fechar filtros"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 text-slate-800 dark:text-slate-200">
          
          {/* Finalidade (Purpose) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Finalidade
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'sale', label: 'Comprar' },
                { id: 'rent', label: 'Alugar' },
                { id: 'launch', label: 'Lançamento' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePurposeChange(opt.id as any)}
                  className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center ${
                    filters.purpose === opt.id
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Imóvel */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tipo de Imóvel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {propertyTypes.map(t => {
                const Icon = t.icon;
                const isSelected = filters.types.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeToggle(t.id)}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dormitórios & Vagas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5" />
                <span>Quartos / Suítes</span>
              </label>
              <div className="flex gap-1.5">
                {['any', '1', '2', '3', '4'].map(bed => (
                  <button
                    key={bed}
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, bedrooms: bed as any }))}
                    className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      filters.bedrooms === bed
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {bed === 'any' ? 'Qualquer' : `${bed}+`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Car className="w-3.5 h-3.5" />
                <span>Vagas de Garagem</span>
              </label>
              <div className="flex gap-1.5">
                {['any', '1', '2', '3', '4'].map(car => (
                  <button
                    key={car}
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, parkingSpots: car as any }))}
                    className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      filters.parkingSpots === car
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {car === 'any' ? 'Qualquer' : `${car}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Faixa de Preço (R$)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold mb-1 block">Valor Mínimo</span>
                <input
                  type="number"
                  placeholder="R$ Mínimo"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold mb-1 block">Valor Máximo</span>
                <input
                  type="number"
                  placeholder="R$ Máximo"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Quick Price Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Até 400k', max: 400000 },
                { label: 'Até 800k', max: 800000 },
                { label: 'Até 1.5M', max: 1500000 },
                { label: 'Acima de 2M', min: 2000000 }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      minPrice: p.min,
                      maxPrice: p.max
                    }));
                  }}
                  className="min-h-[36px] px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comodidades & Lazer */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Comodidades e Infraestrutura
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AMENITIES_LIST.map(amenity => {
                const isChecked = filters.amenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => handleAmenityToggle(amenity.id)}
                    className={`min-h-[44px] p-2 rounded-xl border text-xs font-semibold flex items-center justify-between text-left transition-all ${
                      isChecked
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate pr-1">{amenity.name}</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-rose-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 safe-bottom-fixed">
          <button
            type="button"
            onClick={resetFilters}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Limpar Filtros
          </button>
          <Button
            variant="primary"
            onClick={onClose}
            className="flex-[2] min-h-[48px] rounded-xl shadow-lg shadow-rose-600/20 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span>Ver {filteredCount} {filteredCount === 1 ? 'imóvel' : 'imóveis'}</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
