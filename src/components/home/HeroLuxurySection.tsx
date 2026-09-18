import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  Check, 
  Building, 
  Home, 
  Sparkles, 
  Maximize2, 
  Trees, 
  Tractor, 
  Store, 
  Hash, 
  ChevronDown, 
  ChevronRight, 
  Star, 
  RotateCcw, 
  BookmarkPlus,
  BedDouble,
  Bath,
  Car,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Property, PropertyType, PropertyPurpose } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { AMENITIES_LIST } from '../../lib/mockData';

export const HeroLuxurySection: React.FC = () => {
  const { 
    properties, 
    filters, 
    setFilters, 
    resetFilters, 
    saveCurrentSearch, 
    openPropertyDetail 
  } = useApp();

  // Search Bar Local State
  const [isCodeSearchActive, setIsCodeSearchActive] = useState<boolean>(Boolean(filters.propertyCode));
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState<boolean>(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState<boolean>(false);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveSearchTitle, setSaveSearchTitle] = useState<string>('');
  
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Close type dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize code search state with filters
  useEffect(() => {
    if (filters.propertyCode && !isCodeSearchActive) {
      setIsCodeSearchActive(true);
    }
  }, [filters.propertyCode]);

  // Select up to 3 real properties strictly from the database (zero mock, max 3)
  const floatingProperties = useMemo<Property[]>(() => {
    if (!properties || properties.length === 0) return [];
    
    // Sort to prioritize featured ones, then shuffle a bit for dynamism
    const valid = properties.filter(p => p && p.id && p.title);
    if (valid.length <= 3) return valid;

    // Pick 3 pseudo-random or featured items
    const featured = valid.filter(p => p.featured);
    const nonFeatured = valid.filter(p => !p.featured);
    const pool = [...featured, ...nonFeatured];
    
    return pool.slice(0, 3);
  }, [properties]);

  // Property types list with icons and labels
  const propertyTypes: { id: PropertyType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'apartment', label: 'Apartamento', icon: Building },
    { id: 'house', label: 'Casa de Bairro', icon: Home },
    { id: 'condo_house', label: 'Casa em Condomínio', icon: Home },
    { id: 'land', label: 'Terreno', icon: Maximize2 },
    { id: 'chacara', label: 'Chácara', icon: Trees },
    { id: 'farm', label: 'Sítio / Fazenda', icon: Tractor },
    { id: 'commercial', label: 'Comercial', icon: Store },
    { id: 'launch', label: 'Lançamento', icon: Sparkles }
  ];

  // Helper for property type label
  const getPropertyTypeLabel = (type: string): string => {
    const found = propertyTypes.find(t => t.id === type);
    if (found) return found.label;
    if (type === 'penthouse') return 'Cobertura';
    if (type === 'rural') return 'Imóvel Rural';
    return 'Imóvel Exclusivo';
  };

  // Handle purpose switch (Comprar / Alugar)
  const handlePurposeChange = (purpose: PropertyPurpose) => {
    setFilters(prev => ({
      ...prev,
      purpose: prev.purpose === purpose ? 'all' : purpose
    }));
  };

  // Handle type selection
  const handleTypeToggle = (type: PropertyType) => {
    setFilters(prev => {
      const exists = prev.types.includes(type);
      const newTypes = exists ? prev.types.filter(t => t !== type) : [...prev.types, type];
      return { ...prev, types: newTypes };
    });
  };

  // Toggle code search mode (enable/disable without popups)
  const handleToggleCodeSearch = () => {
    if (isCodeSearchActive) {
      setIsCodeSearchActive(false);
      setFilters(prev => ({ ...prev, propertyCode: '' }));
    } else {
      setIsCodeSearchActive(true);
      if (filters.searchTerm) {
        setFilters(prev => ({ ...prev, propertyCode: prev.searchTerm, searchTerm: '' }));
      }
    }
  };

  // Scroll to results and trigger search
  const handleExecuteSearch = () => {
    const el = document.getElementById('portal-properties-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Confirm save search
  const handleConfirmSaveSearch = () => {
    if (!saveSearchTitle.trim()) return;
    saveCurrentSearch(saveSearchTitle.trim(), 'daily');
    setSaveModalOpen(false);
    setSaveSearchTitle('');
  };

  // Count active filters
  const activeFiltersCount = 
    (filters.purpose !== 'all' ? 1 : 0) +
    filters.types.length +
    (filters.bedrooms !== 'any' ? 1 : 0) +
    (filters.bathrooms && filters.bathrooms !== 'any' ? 1 : 0) +
    (filters.parkingSpots && filters.parkingSpots !== 'any' ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.minArea || filters.maxArea ? 1 : 0) +
    filters.amenities.length +
    (filters.searchTerm ? 1 : 0) +
    (filters.propertyCode ? 1 : 0);

  // Label for Type dropdown trigger
  const selectedTypeLabel = useMemo(() => {
    if (filters.types.length === 0) return 'Tipo';
    if (filters.types.length === 1) {
      const t = propertyTypes.find(item => item.id === filters.types[0]);
      return t ? t.label : '1 Tipo';
    }
    return `${filters.types.length} Tipos`;
  }, [filters.types]);

  // Helper to strictly get real property cover image from Supabase without fake houses
  const getPropertyCoverImage = (property: Property): string => {
    if (!property) return '';
    const coverMedia = property.media?.find(m => m.isCover && m.url)?.url;
    if (coverMedia) return coverMedia;
    const firstMedia = property.media?.find(m => m.url)?.url;
    if (firstMedia) return firstMedia;
    if (property.images && property.images.length > 0 && property.images[0]) {
      return property.images[0];
    }
    return '';
  };

  return (
    <section className="relative w-full overflow-hidden bg-slate-950 text-white min-h-[640px] sm:min-h-[720px] lg:min-h-[760px] flex flex-col justify-between pt-12 pb-16 lg:pb-20">
      
      {/* 1. Cinematic Background Panorama with Fade Effect */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
      >
        {/* User-requested background.jpeg with fade effect and responsive styling */}
        <div 
          className="absolute inset-0 bg-cover bg-center sm:bg-[center_right] transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `url('/background.jpeg'), url('/assets/background.jpeg'), url('background.jpeg'), url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2400&q=85')`,
            backgroundPosition: 'center 40%'
          }}
        />

        {/* Cinematic Fade Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 md:via-slate-950/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-950/40 via-transparent to-rose-950/25" />
        <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent" />

        {/* Radial ambient glow near pins */}
        <div className="hidden md:block absolute top-1/3 right-1/4 w-[500px] h-[300px] bg-fuchsia-600/15 blur-[120px] rounded-full" />
      </motion.div>

      {/* 2. Top & Center Container: Headline & Floating Real Properties */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center min-h-[380px] sm:min-h-[440px]">
          
          {/* LEFT: Exact Headline & Subtitle with 50px font sizes applied */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-4 sm:space-y-5 text-left pt-4 lg:pt-0">
            <h1 className="font-extrabold tracking-tight font-['Outfit',sans-serif] leading-[1.15]">
              <span 
                className="block text-white"
                style={{ fontSize: '50px' }}
              >
                Seu próximo imóvel
              </span>
              <span 
                className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-rose-400 to-rose-300"
                style={{ fontSize: '50px' }}
              >
                está mais perto do que
              </span>
              <span 
                className="block text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-200"
                style={{ fontSize: '50px' }}
              >
                você imagina.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal max-w-xl leading-relaxed">
              Encontre imóveis para comprar, alugar ou investir em poucos cliques.
            </p>
          </div>

          {/* RIGHT: Floating Real Properties with Geolocation Pins (Max 3, Real Data Only) */}
          <div className="lg:col-span-6 xl:col-span-7 relative w-full h-[320px] sm:h-[380px] lg:h-[420px]">
            
            {/* Real properties exists check */}
            {floatingProperties.length > 0 ? (
              <>
                {/* SVG Geolocation Neon Connection Lines */}
                <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="neonGlowLine" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#d946ef" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6" />
                    </linearGradient>
                    <filter id="neonShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Interconnected geo lines if 2 or 3 items */}
                  {floatingProperties.length >= 2 && (
                    <path
                      d="M 170 210 Q 240 180 340 130"
                      stroke="url(#neonGlowLine)"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      fill="none"
                      filter="url(#neonShadow)"
                      className="opacity-70 animate-pulse"
                    />
                  )}
                  {floatingProperties.length >= 3 && (
                    <path
                      d="M 340 130 Q 420 180 510 240"
                      stroke="url(#neonGlowLine)"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      fill="none"
                      filter="url(#neonShadow)"
                      className="opacity-70 animate-pulse"
                    />
                  )}
                </svg>

                {/* Floating Cards Container (Smooth horizontal scroll on mobile, floating geo-spatial on desktop) */}
                <div className="relative w-full h-full flex md:block overflow-x-auto md:overflow-visible pb-4 md:pb-0 gap-3.5 no-scrollbar">
                  {floatingProperties.map((property, idx) => {
                    // Coordinates matching gemini.jpeg layout across large screens
                    const desktopPositions = [
                      'md:left-[2%] lg:left-[4%] md:top-[28%] lg:top-[24%]',
                      'md:left-[40%] lg:left-[42%] md:top-[4%] lg:top-[2%]',
                      'md:left-[72%] lg:left-[74%] md:top-[38%] lg:top-[34%]'
                    ];

                    const currentPosClass = desktopPositions[idx % 3];
                    const isCardFeatured = property.featured || idx === 1;

                    return (
                      <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: idx * 0.15 }}
                        className={`shrink-0 md:shrink md:absolute ${currentPosClass} z-20 group cursor-pointer`}
                        onClick={() => openPropertyDetail(property.id)}
                      >
                        {/* Interactive Floating Card */}
                        <div className="relative bg-slate-950/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-fuchsia-500/30 hover:border-fuchsia-400/80 shadow-xl shadow-slate-950/80 hover:shadow-fuchsia-500/20 transition-all duration-300 transform group-hover:scale-[1.04] group-hover:-translate-y-1 w-[210px] sm:w-[230px]">
                          
                          {/* Featured Badge */}
                          {isCardFeatured && (
                            <div className="absolute -top-3 left-3 z-30 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-[10px] font-extrabold shadow-md flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              <span>Destaque</span>
                            </div>
                          )}

                          {/* Real Property Image Thumbnail */}
                          <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden mb-2 bg-slate-800">
                            {getPropertyCoverImage(property) ? (
                              <img
                                src={getPropertyCoverImage(property)}
                                alt={property.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-400 p-2 text-center">
                                <Home className="w-6 h-6 text-fuchsia-400/70 mb-1" />
                                <span className="text-[10px] font-medium text-slate-300 truncate max-w-full">
                                  {property.title}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                          </div>

                          {/* Property Details */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white truncate leading-tight">
                                {getPropertyTypeLabel(property.type)}
                              </h4>
                              <p className="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-0.5">
                                <span className="truncate">
                                  {property.neighborhood ? `${property.neighborhood} - ${property.city || 'SP'}` : (property.city || 'Região')}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm font-extrabold text-white mt-1">
                                {formatCurrency(property.price)}
                              </p>
                            </div>

                            {/* Arrow button */}
                            <div className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-fuchsia-600 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors shrink-0 mt-2">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>

                        {/* Geolocation Pin Below Card with Neon Pulsing Glow */}
                        <div className="hidden md:flex flex-col items-center justify-center mt-2.5 relative">
                          {/* Connecting vertical tick */}
                          <div className="w-0.5 h-3 bg-fuchsia-500/60" />
                          
                          {/* Glowing Pin */}
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-6 h-6 rounded-full bg-fuchsia-500/30 animate-ping" />
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 shadow-lg shadow-fuchsia-500/80 flex items-center justify-center border border-white/50 text-white">
                              <MapPin className="w-3 h-3 fill-white" />
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* If zero properties in database: render pristine clean city panorama without fake listings */
              <div className="hidden lg:flex items-center justify-center h-full text-center text-slate-400 text-xs">
                {/* Zero mock: keep scenic view uncluttered */}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* 3. Bottom Embedded Modern Hero Search Bar (Identical to gemini.jpeg) */}
      <div className="relative z-30 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6 sm:mt-10">
        
        {/* Main Floating Pill Container */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[28px] sm:rounded-full p-2 sm:p-2.5 shadow-2xl shadow-slate-950/60 border border-white/40 dark:border-slate-800 transition-all">
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            
            {/* A. Text Search Input with Inline Discreet Code Switch */}
            <div className="flex-1 relative flex items-center min-w-[240px] pl-3 pr-2 py-1 sm:py-0">
              <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
              
              <input
                type="text"
                value={isCodeSearchActive ? (filters.propertyCode || '') : (filters.searchTerm || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isCodeSearchActive) {
                    setFilters(prev => ({ ...prev, propertyCode: val }));
                  } else {
                    setFilters(prev => ({ ...prev, searchTerm: val }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteSearch();
                }}
                placeholder={
                  isCodeSearchActive 
                    ? "Digite o código do imóvel (ex: 99298446)..." 
                    : "Digite imóveis, bairros, condomínios..."
                }
                className="w-full bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0"
              />

              {/* Clear button if has text */}
              {(isCodeSearchActive ? filters.propertyCode : filters.searchTerm) && (
                <button
                  onClick={() => {
                    if (isCodeSearchActive) {
                      setFilters(prev => ({ ...prev, propertyCode: '' }));
                    } else {
                      setFilters(prev => ({ ...prev, searchTerm: '' }));
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
                  title="Limpar campo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Inline Discreet Code Switch Button (Enable/Disable without modal) */}
              <button
                type="button"
                onClick={handleToggleCodeSearch}
                title={isCodeSearchActive ? "Desativar busca por código" : "Buscar diretamente pelo código do anúncio"}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all ${
                  isCodeSearchActive
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Hash className="w-3 h-3" />
                <span>Código</span>
              </button>
            </div>

            <div className="hidden md:block w-px h-7 bg-slate-200 dark:bg-slate-700 self-center" />

            {/* B. Purpose Toggle (Comprar / Alugar) */}
            <div className="flex items-center justify-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-full shrink-0">
              <button
                type="button"
                onClick={() => handlePurposeChange('sale')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filters.purpose === 'sale'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() => handlePurposeChange('rent')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filters.purpose === 'rent'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Alugar
              </button>
            </div>

            <div className="hidden md:block w-px h-7 bg-slate-200 dark:bg-slate-700 self-center" />

            {/* C. Slide-Down Menu: "Tipo" with Grid Icon & Modern Dropdown */}
            <div className="relative shrink-0" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className={`w-full sm:w-auto px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  filters.types.length > 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {/* 4 dots grid icon */}
                <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                  <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                  <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                  <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                  <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                </div>
                <span>{selectedTypeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Animated Slide-Down Menu for Types */}
              <AnimatePresence>
                {isTypeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 space-y-1 text-slate-900 dark:text-white"
                  >
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Tipos de Imóveis
                      </span>
                      {filters.types.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, types: [] }))}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                        >
                          Limpar ({filters.types.length})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto pt-1">
                      {propertyTypes.map(t => {
                        const isSelected = filters.types.includes(t.id);
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTypeToggle(t.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-rose-100 dark:bg-rose-900 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span>{t.label}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-rose-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* D. "Filtros Avançados" Accordion Toggle */}
            <button
              type="button"
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                isAdvancedExpanded || activeFiltersCount > 1
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros Avançados</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* E. Compact Star for Save Search */}
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              title="Salvar esta busca"
              className="p-2.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors shrink-0 flex items-center justify-center"
            >
              <Star className="w-4 h-4" />
            </button>

            {/* F. Main "Buscar" Button in Vibrant Magenta/Rose Gradient */}
            <button
              type="button"
              onClick={handleExecuteSearch}
              className="px-6 sm:px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </button>

          </div>

          {/* G. Expandable Bottom Accordion for Advanced Filters */}
          <AnimatePresence>
            {isAdvancedExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-slate-100 dark:border-slate-800 mt-3 pt-4 px-2 sm:px-4 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-800 dark:text-slate-200">
                  
                  {/* Bedrooms */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Quartos
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                      {[
                        { val: 'any', label: 'Todos' },
                        { val: 1, label: '1' },
                        { val: 2, label: '2' },
                        { val: 3, label: '3' },
                        { val: 4, label: '4+' }
                      ].map(item => (
                        <button
                          key={String(item.val)}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, bedrooms: item.val as any }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
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

                  {/* Bathrooms */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Banheiros
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                      {[
                        { val: 'any', label: 'Todos' },
                        { val: 1, label: '1' },
                        { val: 2, label: '2' },
                        { val: 3, label: '3+' }
                      ].map(item => (
                        <button
                          key={String(item.val)}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, bathrooms: item.val as any }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            (filters.bathrooms || 'any') === item.val
                              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Parking spots */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Vagas
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                      {[
                        { val: 'any', label: 'Todas' },
                        { val: 1, label: '1' },
                        { val: 2, label: '2' },
                        { val: 3, label: '3+' }
                      ].map(item => (
                        <button
                          key={String(item.val)}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, parkingSpots: item.val as any }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            (filters.parkingSpots || 'any') === item.val
                              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Faixa de Preço (R$)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Mínimo"
                        value={filters.minPrice || ''}
                        onChange={(e) => setFilters(p => ({ ...p, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Máximo"
                        value={filters.maxPrice || ''}
                        onChange={(e) => setFilters(p => ({ ...p, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                </div>

                {/* Amenities Quick Selection */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Comodidades & Lazer
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {AMENITIES_LIST.slice(0, 8).map(amenity => {
                      const isSelected = filters.amenities.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => {
                            setFilters(prev => {
                              const exists = prev.amenities.includes(amenity.id);
                              return {
                                ...prev,
                                amenities: exists 
                                  ? prev.amenities.filter(a => a !== amenity.id)
                                  : [...prev.amenities, amenity.id]
                              };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {amenity.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Bar Controls inside Expanded Section */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      resetFilters();
                      setIsCodeSearchActive(false);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-rose-500 flex items-center gap-1.5 py-1 px-2 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar todos os filtros ({activeFiltersCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveModalOpen(true)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Salvar Esta Busca</span>
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* Save Search Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-rose-500" />
                <span>Salvar Esta Busca</span>
              </h3>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Dê um nome para esta busca e receba alertas quando novos imóveis correspondentes aos seus critérios forem anunciados.
            </p>
            <input
              type="text"
              placeholder="Ex: Apartamento 3 quartos no Campolim"
              value={saveSearchTitle}
              onChange={(e) => setSaveSearchTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveSearch}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20"
              >
                Salvar Busca
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
