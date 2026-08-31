import React, { useState } from 'react';
import { 
  Heart, 
  Scale, 
  BedDouble, 
  Bath, 
  Car, 
  Maximize2, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatArea } from '../../lib/utils';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
  onHover?: (id: string | null) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  compact = false,
  onHover 
}) => {
  const { 
    openPropertyDetail, 
    toggleFavorite, 
    isFavorite, 
    comparisonIds, 
    toggleComparison 
  } = useApp();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const favorited = isFavorite(property.id);
  const inComparison = comparisonIds.includes(property.id);

  const images = property.media.length > 0 
    ? property.media 
    : [{ id: 'default', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80', isCover: true, order: 1, mediaType: 'image' as const }];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const purposeLabels: Record<string, { label: string; bg: string; text: string }> = {
    sale: { label: 'Venda', bg: 'bg-emerald-600', text: 'text-white' },
    rent: { label: 'Locação', bg: 'bg-indigo-600', text: 'text-white' },
    seasonal: { label: 'Temporada', bg: 'bg-amber-600', text: 'text-white' },
    launch: { label: 'Lançamento', bg: 'bg-rose-600', text: 'text-white' }
  };

  const badge = purposeLabels[property.purpose] || { label: 'Imóvel', bg: 'bg-slate-700', text: 'text-white' };

  return (
    <div
      id={`property-card-${property.id}`}
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      onClick={() => openPropertyDetail(property.id)}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
    >
      {/* Image Media Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={images[currentImageIndex]?.url || images[0]?.url}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg ${badge.bg} ${badge.text} shadow-md`}>
              {badge.label}
            </span>
            {property.featured && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                <Sparkles className="w-3 h-3 fill-current" />
                <span>Destaque</span>
              </span>
            )}
            {property.isExclusive && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-900/90 text-indigo-100 border border-indigo-500/40 backdrop-blur-md">
                Exclusivo
              </span>
            )}
          </div>

          {/* Quick Action Buttons (Favorite & Compare) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              id={`btn-compare-${property.id}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleComparison(property.id);
              }}
              title={inComparison ? 'Remover da comparação' : 'Comparar imóvel'}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                inComparison
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <Scale className="w-4 h-4" />
            </button>
            <button
              id={`btn-favorite-${property.id}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(property.id);
              }}
              title={favorited ? 'Remover dos favoritos' : 'Favoritar'}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                favorited
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Image Slider Controls (if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label="Imagem anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              aria-label="Próxima imagem"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pagination dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {images.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex ? 'w-4 bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Code & Views Counter on bottom image */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 font-medium pointer-events-none">
          <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
            Cód: {property.code}
          </span>
          <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {property.viewsCount}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        
        {/* Location & Title */}
        <div>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{property.neighborhood}, {property.city}/{property.state}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors font-['Outfit']">
            {property.title}
          </h3>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-4 gap-2 py-2.5 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5" title={`${property.bedrooms} Dormitórios`}>
            <BedDouble className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold">{property.bedrooms} <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">qts</span></span>
          </div>

          <div className="flex items-center gap-1.5" title={`${property.bathrooms} Banheiros`}>
            <Bath className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold">{property.bathrooms} <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">ban</span></span>
          </div>

          <div className="flex items-center gap-1.5" title={`${property.parkingSpots} Vagas`}>
            <Car className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold">{property.parkingSpots} <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">vgs</span></span>
          </div>

          <div className="flex items-center gap-1.5" title={`${property.usefulArea || property.totalArea} m² área útil`}>
            <Maximize2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold">{property.usefulArea || property.totalArea} <span className="text-[10px] text-slate-400 font-normal">m²</span></span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(property.price)}
              {property.purpose === 'rent' && (
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/mês</span>
              )}
            </div>
            {property.condoFee && property.condoFee > 0 && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Condomínio: {formatCurrency(property.condoFee)}
              </div>
            )}
          </div>

          <button
            id={`btn-details-${property.id}`}
            onClick={(e) => {
              e.stopPropagation();
              openPropertyDetail(property.id);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-600 dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-800 hover:text-white dark:text-slate-200 text-xs font-bold transition-all"
          >
            Ver Detalhes
          </button>
        </div>

      </div>
    </div>
  );
};
