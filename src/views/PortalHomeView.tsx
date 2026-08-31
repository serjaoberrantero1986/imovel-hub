import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  ArrowRight, 
  Key, 
  CheckCircle,
  Home,
  Building,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/properties/PropertyCard';
import { PropertyFilterBar } from '../components/properties/PropertyFilterBar';
import { PropertyMap } from '../components/properties/PropertyMap';
import { POPULAR_NEIGHBORHOODS } from '../lib/mockData';

export const PortalHomeView: React.FC = () => {
  const { 
    properties, 
    setCurrentView, 
    setFilters, 
    setIsWizardOpen, 
    setEditingProperty 
  } = useApp();

  const [hoveredMapPropId, setHoveredMapPropId] = useState<string | null>(null);

  // Featured listings
  const featuredProperties = properties.filter(p => p.featured).slice(0, 6);
  const launchProperties = properties.filter(p => p.purpose === 'launch').slice(0, 3);
  const rentalProperties = properties.filter(p => p.purpose === 'rent').slice(0, 3);

  const handleCategorySearch = (type: any, purpose: any = 'sale') => {
    setFilters(prev => ({ ...prev, types: [type], purpose }));
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNeighborhoodSearch = (neighborhood: string) => {
    setFilters(prev => ({ ...prev, searchTerm: neighborhood }));
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Hero Section with Premium Atmosphere */}
      <section className="relative pt-12 pb-24 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
        
        {/* Subtle Background Pattern & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Main Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-rose-300">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>O Portal Imobiliário mais Moderno do Interior de SP</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-['Outfit'] leading-tight">
              Encontre o Imóvel Perfeito para <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-rose-400">Viver Seus Melhores Momentos</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal max-w-2xl mx-auto">
              Milhares de casas em condomínio, apartamentos e lançamentos exclusivos em Sorocaba e região com atendimento direto de corretores credenciados.
            </p>
          </div>

          {/* Embedded Filter Bar */}
          <div className="max-w-5xl mx-auto pt-2">
            <PropertyFilterBar />
          </div>

          {/* Quick Categories Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {[
              { label: 'Casas em Condomínio', type: 'condo_house', purpose: 'sale' },
              { label: 'Apartamentos no Campolim', type: 'apartment', purpose: 'sale' },
              { label: 'Lançamentos na Planta', type: 'apartment', purpose: 'launch' },
              { label: 'Locação Residencial', type: 'apartment', purpose: 'rent' },
              { label: 'Terrenos e Lotes', type: 'land', purpose: 'sale' }
            ].map(cat => (
              <button
                key={cat.label}
                onClick={() => handleCategorySearch(cat.type, cat.purpose)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
              >
                {cat.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        
        {/* Section: Imóveis em Destaque */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Seleção Exclusiva</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                Imóveis em Destaque
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Oportunidades selecionadas com alta valorização e acabamento nobre
              </p>
            </div>

            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, purpose: 'sale' }));
                setCurrentView('search');
              }}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 group"
            >
              <span>Ver todos os {properties.length} imóveis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>

        {/* Section: Bairros Mais Nobres & Buscados */}
        <section className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Localização Privilegiada
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Explore por Bairro em Sorocaba
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Conheça as regiões com melhor infraestrutura, escolas, shoppings e qualidade de vida
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'Campolim', count: '48 imóveis', desc: 'Zona Sul • Alto Padrão', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80' },
              { name: 'Jardim América', count: '24 imóveis', desc: 'Residencial Tradicional', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80' },
              { name: 'Condomínio Alphaville', count: '18 imóveis', desc: 'Casas de Luxo e Segurança', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
              { name: 'Jardim Paulistano', count: '15 imóveis', desc: 'Próximo a Parques e Hospitais', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80' }
            ].map(bairro => (
              <div
                key={bairro.name}
                onClick={() => handleNeighborhoodSearch(bairro.name)}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-md"
              >
                <img
                  src={bairro.img}
                  alt={bairro.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="font-extrabold text-sm font-['Outfit'] group-hover:text-rose-400 transition-colors">{bairro.name}</div>
                  <div className="text-[11px] text-slate-300 font-medium">{bairro.desc}</div>
                  <div className="text-[10px] text-amber-300 font-bold mt-0.5">{bairro.count}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs font-bold text-slate-400 self-center mr-1">Outros bairros:</span>
            {POPULAR_NEIGHBORHOODS.slice(4).map(n => (
              <button
                key={n}
                onClick={() => handleNeighborhoodSearch(n)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Section: Interactive Map Exploration Banner */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900 text-white rounded-3xl p-6 sm:p-10 overflow-hidden shadow-2xl relative">
          <div className="lg:col-span-5 space-y-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <MapPin className="w-3.5 h-3.5" />
              <span>Geolocalização Imobiliária</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">
              Busque Imóveis Direto no Mapa
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Visualize os preços dos imóveis nos bairros de sua preferência, confira proximidade com escolas, supermercados e vias de acesso com visualização dinâmica.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setCurrentView('search');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all active:scale-98"
              >
                <Eye className="w-4 h-4" />
                <span>Abrir Busca no Mapa Completo</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 h-72 sm:h-96 rounded-2xl overflow-hidden shadow-inner border border-slate-700">
            <PropertyMap 
              properties={properties} 
              hoveredPropertyId={hoveredMapPropId}
            />
          </div>
        </section>

        {/* Section: Por que anunciar na ImovelHub */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
              Segurança & Verificação CRECI
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Todos os anúncios e corretores parceiros são verificados garantindo total transparência e proteção jurídica em todas as negociações.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
              CRM & Gestão de Leads Integrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Para corretores e imobiliárias: funil kanban inteligente, disparo direto para WhatsApp e métricas de desempenho em tempo real.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
              Fotos em Alta Resolução & Tour
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Apresentação impecável com galerias otimizadas para mobile e desktop, gerando até 3x mais contatos qualificados por anúncio.
            </p>
          </div>
        </section>

        {/* CTA Banner: Quer Vender ou Alugar seu Imóvel? */}
        <section className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-rose-600 via-rose-700 to-indigo-800 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">
              Quer Vender ou Alugar seu Imóvel Mais Rápido?
            </h2>
            <p className="text-xs sm:text-sm text-rose-100">
              Cadastre seu anúncio em menos de 3 minutos e alcance milhares de compradores e investidores em Sorocaba e região.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingProperty(null);
              setIsWizardOpen(true);
            }}
            className="px-8 py-4 rounded-2xl bg-white text-rose-700 hover:bg-slate-100 font-extrabold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            Anunciar Imóvel Agora
          </button>
        </section>

      </div>

    </div>
  );
};
