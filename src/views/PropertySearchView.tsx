import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  Map as MapIcon, 
  Columns2, 
  SlidersHorizontal, 
  ArrowUpDown, 
  SearchX, 
  RotateCcw,
  Sparkles,
  Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/properties/PropertyCard';
import { PropertyMap } from '../components/properties/PropertyMap';
import { PropertyFilterBar } from '../components/properties/PropertyFilterBar';
import { Property } from '../types';

export const PropertySearchView: React.FC = () => {
  const { properties, filters, setFilters, resetFilters } = useApp();
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'map'>('split');
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

  // Filter properties based on current filter state
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // Purpose filter
      if (filters.purpose && filters.purpose !== 'all' && prop.purpose !== filters.purpose) {
        return false;
      }

      // Types filter
      if (filters.types.length > 0 && !filters.types.includes(prop.type)) {
        return false;
      }

      // City filter
      if (filters.city && filters.city !== 'all' && prop.city.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }

      // Bedrooms filter
      if (filters.bedrooms && filters.bedrooms !== 'any') {
        const minBeds = Number(filters.bedrooms);
        if (prop.bedrooms < minBeds) return false;
      }

      // Min Price
      if (filters.minPrice && prop.price < filters.minPrice) return false;

      // Max Price
      if (filters.maxPrice && prop.price > filters.maxPrice) return false;

      // Min Area
      if (filters.minArea && (prop.usefulArea || prop.totalArea) < filters.minArea) return false;

      // Max Area
      if (filters.maxArea && (prop.usefulArea || prop.totalArea) > filters.maxArea) return false;

      // Parking spots
      if (filters.parkingSpots && filters.parkingSpots !== 'any') {
        const minSpots = Number(filters.parkingSpots);
        if (prop.parkingSpots < minSpots) return false;
      }

      // Amenities filter
      if (filters.amenities.length > 0) {
        const hasAllAmenities = filters.amenities.every(a => prop.amenities.includes(a));
        if (!hasAllAmenities) return false;
      }

      // Search term
      if (filters.searchTerm && filters.searchTerm.trim() !== '') {
        const term = filters.searchTerm.toLowerCase();
        const matchesNeighborhood = prop.neighborhood.toLowerCase().includes(term);
        const matchesCity = prop.city.toLowerCase().includes(term);
        const matchesTitle = prop.title.toLowerCase().includes(term);
        const matchesCode = prop.code.toLowerCase().includes(term);
        const matchesStreet = prop.addressStreet.toLowerCase().includes(term);
        const matchesCondo = prop.condoName ? prop.condoName.toLowerCase().includes(term) : false;

        if (!matchesNeighborhood && !matchesCity && !matchesTitle && !matchesCode && !matchesStreet && !matchesCondo) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (filters.sortBy === 'price_asc') return a.price - b.price;
      if (filters.sortBy === 'price_desc') return b.price - a.price;
      if (filters.sortBy === 'area_desc') return (b.usefulArea || b.totalArea) - (a.usefulArea || a.totalArea);
      if (filters.sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [properties, filters]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Filters Bar */}
        <PropertyFilterBar />

        {/* Results Header & Layout Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
              <span>Resultados da Busca</span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'imóvel' : 'imóveis'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              {filters.city && filters.city !== 'all' ? `Em ${filters.city}` : 'Sorocaba e Região Metropolitana'} • Preços atualizados
            </p>
          </div>

          {/* Right Controls: Sort Dropdown & View Mode Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-2" />
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="bg-transparent text-slate-800 dark:text-slate-200 py-1.5 pr-3 pl-1 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="relevance" className="dark:bg-slate-900">Relevância / Destaques</option>
                <option value="price_asc" className="dark:bg-slate-900">Menor Preço</option>
                <option value="price_desc" className="dark:bg-slate-900">Maior Preço</option>
                <option value="area_desc" className="dark:bg-slate-900">Maior Área Útil</option>
                <option value="newest" className="dark:bg-slate-900">Mais Recentes</option>
              </select>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="hidden sm:flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <button
                onClick={() => setViewMode('split')}
                title="Visualização Dividida (Lista + Mapa)"
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'split'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Columns2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Apenas Grade de Imóveis"
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                title="Apenas Mapa Interativo"
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'map'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* View Mode Rendering */}
        {filteredProperties.length === 0 ? (
          /* Empty state */
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
              Nenhum imóvel encontrado com esses filtros
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Tente ampliar a faixa de preço, selecionar outros bairros ou remover filtros de comodidades para ver mais opções.
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar todos os filtros</span>
            </button>
          </div>
        ) : (
          <>
            {/* SPLIT VIEW (Cards on Left + Sticky Map on Right) */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {filteredProperties.map(property => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onHover={setHoveredPropertyId}
                      />
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 sticky top-24 h-[calc(100vh-140px)] hidden lg:block">
                  <PropertyMap
                    properties={filteredProperties}
                    hoveredPropertyId={hoveredPropertyId}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}

            {/* GRID ONLY VIEW */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onHover={setHoveredPropertyId}
                  />
                ))}
              </div>
            )}

            {/* MAP ONLY VIEW */}
            {viewMode === 'map' && (
              <div className="h-[75vh] w-full">
                <PropertyMap
                  properties={filteredProperties}
                  hoveredPropertyId={hoveredPropertyId}
                  className="h-full w-full"
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
