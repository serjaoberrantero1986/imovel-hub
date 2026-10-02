import { usePortalSession } from '../components/visual-editor/usePortalSession';
import { PortalCanvas, EditableText, EditableBox, CanvasSections, CanvasSection } from '../components/visual-editor/PortalCanvas';
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Eye,
  RotateCcw,
  SearchX
} from 'lucide-react';
import { useApp, useCatalog } from '../context/AppContext';
import { PropertyCard } from '../components/properties/PropertyCard';
import { PropertyFilterBar } from '../components/properties/PropertyFilterBar';
import { HeroLuxurySection } from '../components/home/HeroLuxurySection';
import { PropertyMap } from '../components/properties/PropertyMap';
import { PropertyCardSkeleton } from '../components/ui/Skeleton';
import { filterProperties, hasActiveFilters } from '../lib/propertyFilters';
import { PortalVisualEditor } from '../components/visual-editor/PortalVisualEditor';
import { DEFAULT_VISUAL_PORTAL_CONFIGURATION, VisualPortalConfiguration, ensureMyVisualPortalConfiguration, fetchMyVisualPortalConfiguration, isSectionVisible, publishMyVisualPortalConfiguration } from '../lib/visualPortalEditor';


export const PortalHomeView: React.FC = () => {
  const { homePageSettings } = useCatalog();
  const { 
    properties, 
    setCurrentView, 
    filters,
    setFilters, 
    resetFilters,
    setIsWizardOpen, 
    setEditingProperty,
    openLegalPage,
    currentUser,
    isAuthenticated,
    openAuthModal,
    addToast
  } = useApp();

  const [isVisualEditorOpen, setIsVisualEditorOpen] = useState(false);
  const session = usePortalSession(currentUser.id);
  const visualConfiguration = session.value;
  const setVisualConfiguration = session.change;
  const [sessionOwner, setSessionOwner] = useState<string | null>(null);
  const ownerRef = useRef(currentUser.id); ownerRef.current = currentUser.id;
  const [publishedVisualConfiguration, setPublishedVisualConfiguration] = useState<VisualPortalConfiguration | null>(null);
  const [visualEditorBusy, setVisualEditorBusy] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const canEditPortal = isAuthenticated && (currentUser.role === 'broker' || currentUser.role === 'agency');
  const activeVisualConfiguration = sessionOwner === currentUser.id && canEditPortal ? visualConfiguration : publishedVisualConfiguration;
  const unpublished = sessionOwner === currentUser.id && JSON.stringify(visualConfiguration) !== JSON.stringify(publishedVisualConfiguration);
  useEffect(() => {
    if (!unpublished) return;
    const warn = (event: BeforeUnloadEvent) => {event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  }, [unpublished]);
  const isVisible = (section: Parameters<typeof isSectionVisible>[1]) => !activeVisualConfiguration || isSectionVisible(activeVisualConfiguration, section);

  useEffect(() => {
    let cancelled = false;
    setSessionOwner(null);
    setIsVisualEditorOpen(false);
    setCanvasSettingsOpen(false);
    if (!canEditPortal) {
      setPublishedVisualConfiguration(null);
      setIsVisualEditorOpen(false);
      return () => { cancelled = true; };
    }
    const loadPublishedConfiguration = async () => {
      try {
        await ensureMyVisualPortalConfiguration(currentUser.id);
        const configuration = await fetchMyVisualPortalConfiguration(currentUser.id);
        if (!cancelled) setPublishedVisualConfiguration(configuration.published);
      } catch {
        if (!cancelled) setPublishedVisualConfiguration(null);
      }
    };
    void loadPublishedConfiguration();
    return () => { cancelled = true; };
  }, [canEditPortal, currentUser.id]);

  const openVisualEditor = async () => {
    if (!canEditPortal) return;
    if(sessionOwner === currentUser.id){setIsVisualEditorOpen(true);return;}
    const owner=currentUser.id;
    setVisualEditorBusy(true);
    try {
      await ensureMyVisualPortalConfiguration(currentUser.id);
      const configuration = await fetchMyVisualPortalConfiguration(currentUser.id);
      if(ownerRef.current !== owner)return;
      session.reset(configuration.published);
      setSessionOwner(owner);
      setPublishedVisualConfiguration(configuration.published);
      setIsVisualEditorOpen(true);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Editor indisponível', message: error?.message || 'Execute a atualização do banco de dados antes de usar o editor.' });
    } finally {
      setVisualEditorBusy(false);
    }
  };

  const discardVisualChanges = async () => {
    if(!window.confirm("Descartar as alterações não publicadas?"))return;
    setVisualEditorBusy(true);
    session.reset(publishedVisualConfiguration || DEFAULT_VISUAL_PORTAL_CONFIGURATION);
    try{await session.discardAssets();}catch(error){addToast({type:'warning',title:'Limpeza pendente',message:error instanceof Error?error.message:'Não foi possível limpar imagens temporárias.'});}
    finally{setVisualEditorBusy(false);}
  };
  const publishVisualConfiguration = async () => {
    setVisualEditorBusy(true);
    try {
      const owner = currentUser.id;
      const ready = await session.materialize(visualConfiguration);
      if(ownerRef.current !== owner)return;
      await publishMyVisualPortalConfiguration(owner, ready);
      if(ownerRef.current !== owner)return;
      session.commitAssets(ready);
      session.reset(ready);
      setPublishedVisualConfiguration(ready);
      addToast({ type: 'success', title: 'Versão publicada', message: 'A versão foi reservada para o portal individual do seu subdomínio.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Publicação não concluída', message: error?.message || 'Tente novamente.' });
    } finally {
      setVisualEditorBusy(false);
    }
  };

  const [hoveredMapPropId, setHoveredMapPropId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const homeIcons: Record<string, React.ComponentType<{className?:string}>> = { ShieldCheck, TrendingUp, Award, Sparkles, Home, MapPin, Building2 };
  const infoCards = [...homePageSettings.infoCards].filter(item=>item.isActive).sort((a,b)=>a.displayOrder-b.displayOrder);
  const now = new Date();
  const banners = (activeVisualConfiguration && !isSectionVisible(activeVisualConfiguration, 'banners') ? [] : [...homePageSettings.banners])
    .filter(item=>item.isActive&&(!item.startsAt||new Date(item.startsAt)<=now)&&(!item.endsAt||new Date(item.endsAt)>=now))
    .sort((a,b)=>a.displayOrder-b.displayOrder);

  // Check if user has applied any search or filter
  const isFiltering = useMemo(() => hasActiveFilters(filters), [filters]);

  // Filter properties dynamically
  const filteredProperties = useMemo(() => {
    return filterProperties(properties, filters);
  }, [properties, filters]);

  // Brief shimmer effect on filter change for polished UX
  useEffect(() => {
    if (isFiltering) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 180);
      return () => clearTimeout(timer);
    }
  }, [filters, isFiltering]);

  // Real featured listings from active properties
  const featuredProperties = useMemo(() => {
    const featured = properties.filter(p => p.featured);
    return featured.length > 0 ? featured.slice(0, 6) : properties.slice(0, 6);
  }, [properties]);

  // Dynamic real neighborhoods extracted directly from active properties
  const dynamicNeighborhoods = useMemo(() => {
    const map = new Map<string, { name: string; city: string; count: number; image?: string }>();
    properties.forEach(p => {
      const n = (p.neighborhood || '').trim();
      if (!n) return;
      const key = n.toLowerCase();
      const existing = map.get(key);
      const img = p.images?.[0];
      if (existing) {
        existing.count += 1;
        if (!existing.image && img) existing.image = img;
      } else {
        map.set(key, {
          name: n,
          city: p.city || 'Região',
          count: 1,
          image: img
        });
      }
    });
    return Array.from(map.values());
  }, [properties]);

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
    <PortalCanvas value={activeVisualConfiguration || DEFAULT_VISUAL_PORTAL_CONFIGURATION} editing={isVisualEditorOpen && canEditPortal} busy={visualEditorBusy||session.preparing} ownerId={currentUser.id} onChange={setVisualConfiguration} unpublished={unpublished} onDiscard={() => void discardVisualChanges()} onUndo={session.undo} onRedo={session.redo} canUndo={session.canUndo} canRedo={session.canRedo} onPrepareImage={session.prepareImage} onPublish={() => void publishVisualConfiguration()} onClose={() => {setIsVisualEditorOpen(false);setCanvasSettingsOpen(false);}} onSettings={() => setCanvasSettingsOpen(true)}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Hero Luxury Section with Real Floating Properties and Modern Search Bar */}
      {isVisible('hero') && <HeroLuxurySection visualConfiguration={activeVisualConfiguration || undefined} />}

      {canEditPortal && !isVisualEditorOpen && unpublished && <div className="canvas-preview-status">Prévia privada · alterações não publicadas</div>}
      {canEditPortal && !isVisualEditorOpen && <button type="button" onClick={() => void openVisualEditor()} disabled={visualEditorBusy} className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white shadow-xl shadow-slate-950/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60 dark:bg-white dark:text-slate-900 sm:bottom-6 sm:right-6"><Sparkles className="h-4 w-4 text-rose-400" />{visualEditorBusy ? 'Abrindo editor...' : 'Editar portal'}</button>}

      {isVisualEditorOpen && canvasSettingsOpen && <PortalVisualEditor configuration={visualConfiguration} busy={visualEditorBusy||session.preparing} onChange={setVisualConfiguration} onClose={() => setCanvasSettingsOpen(false)} onPublish={() => void publishVisualConfiguration()} onPrepareImage={session.prepareImage} />}

      {/* Main Content Area */}
      <CanvasSections>
        
        {/* Section: Imóveis em Destaque ou Resultados da Busca */}
        {isVisible('featured_properties') && <CanvasSection sectionId="featured_properties"><EditableBox id="section.featured" label="Imóveis em destaque"><section id="portal-properties-section" className="space-y-6 scroll-mt-20">
          {isFiltering ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>Resultado da Busca</span>
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    {isLoading
                      ? 'Buscando imóveis...'
                      : filteredProperties.length === 0
                      ? 'Nenhum imóvel encontrado'
                      : `${filteredProperties.length} ${filteredProperties.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {filters.searchTerm
                      ? `Filtrando por "${filters.searchTerm}"`
                      : filters.propertyCode
                      ? `Filtrando por código "${filters.propertyCode}"`
                      : 'Exibindo imóveis conforme os filtros aplicados'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Busca</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('search');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    <span>Ver no Mapa Completo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards Grid / Skeleton / Empty State */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <PropertyCardSkeleton key={idx} />
                  ))}
                </div>
              ) : filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
                    <SearchX className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Nenhum imóvel corresponde à busca
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Não encontramos nenhum imóvel com esses critérios. Tente buscar por outros termos, bairros ou limpar os filtros.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                    <EditableText id="featured.title" label="Imóveis em Destaque">Imóveis em Destaque</EditableText>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    <EditableText id="featured.subtitle" label="Oportunidades selecionadas com alta valo">Oportunidades selecionadas com alta valorização e acabamento nobre</EditableText>
                  </p>
                </div>

                {properties.length > 0 && (
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, purpose: 'sale' }));
                      setCurrentView('search');
                    }}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 group cursor-pointer"
                  >
                    <span>Ver todos os {properties.length} imóveis</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>

              {/* Cards Grid or Clean Empty State */}
              {properties.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                    <Home className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-['Outfit']">
                      Nenhum imóvel anunciado no momento
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Não há imóveis disponíveis no banco de dados. Novos anúncios cadastrados aparecerão aqui imediatamente.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        openAuthModal('login');
                      } else if (currentUser.role === 'broker' || currentUser.role === 'agency') {
                        setEditingProperty(null);
                        setIsWizardOpen(true);
                      } else {
                        addToast({
                          type: 'info',
                          title: 'Anuncie no Portal',
                          message: 'A publicação de imóveis é exclusiva para corretores e imobiliárias credenciadas.'
                        });
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Publicar Primeiro Imóvel</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredProperties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section></EditableBox></CanvasSection>}

        {/* Section: Bairros Reais dos Imóveis Cadastrados */}
        {isVisible('neighborhoods') && dynamicNeighborhoods.length > 0 && (
          <CanvasSection sectionId="neighborhoods"><EditableBox id="section.neighborhoods" label="Bairros"><section className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-8 shadow-sm">
            <div className="max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <EditableText id="neighborhoods.eyebrow" label="Localização Privilegiada">Localização Privilegiada</EditableText>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                <EditableText id="neighborhoods.title" label="Explore por Bairro">Explore por Bairro</EditableText>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                <EditableText id="neighborhoods.subtitle" label="Conheça as regiões com imóveis ativos di">Conheça as regiões com imóveis ativos disponíveis no portal</EditableText>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {dynamicNeighborhoods.slice(0, 8).map(bairro => (
                <div
                  key={bairro.name}
                  onClick={() => handleNeighborhoodSearch(bairro.name)}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-md"
                >
                  <img
                    src={bairro.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'}
                    alt={bairro.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="font-extrabold text-sm font-['Outfit'] group-hover:text-rose-400 transition-colors">{bairro.name}</div>
                    <div className="text-[11px] text-slate-300 font-medium">{bairro.city}</div>
                    <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                      {bairro.count} {bairro.count === 1 ? 'imóvel' : 'imóveis'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {dynamicNeighborhoods.length > 8 && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs font-bold text-slate-400 self-center mr-1">Outros bairros:</span>
                {dynamicNeighborhoods.slice(8).map(n => (
                  <button
                    key={n.name}
                    onClick={() => handleNeighborhoodSearch(n.name)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {n.name} ({n.count})
                  </button>
                ))}
              </div>
            )}
          </section></EditableBox></CanvasSection>
        )}

        {/* Section: Interactive Map Exploration Banner */}
        {isVisible('map') && <CanvasSection sectionId="map"><EditableBox id="section.map" label="Mapa"><section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900 text-white rounded-3xl p-6 sm:p-10 overflow-hidden shadow-2xl relative">
          <div className="lg:col-span-5 space-y-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <MapPin className="w-3.5 h-3.5" />
              <span><EditableText id="map.eyebrow" label="Geolocalização Imobiliária">Geolocalização Imobiliária</EditableText></span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">
              <EditableText id="map.title" label="Busque Imóveis Direto no Mapa">Busque Imóveis Direto no Mapa</EditableText>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <EditableText id="map.description" label="Visualize os preços dos imóveis nos bair">Visualize os preços dos imóveis nos bairros de sua preferência, confira proximidade com escolas, supermercados e vias de acesso com visualização dinâmica.</EditableText>
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
                <span><EditableText id="map.button" label="Abrir Busca no Mapa Completo">Abrir Busca no Mapa Completo</EditableText></span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 h-72 sm:h-96 rounded-2xl overflow-hidden shadow-inner border border-slate-700">
            <PropertyMap 
              properties={properties} 
              hoveredPropertyId={hoveredMapPropId}
            />
          </div>
        </section></EditableBox></CanvasSection>}

        {isVisible('info_cards') && infoCards.length>0&&<CanvasSection sectionId="info_cards"><EditableBox id="section.info" label="Cards informativos"><section className="grid grid-cols-1 md:grid-cols-3 gap-6">{infoCards.map(card=>{const Icon=homeIcons[card.icon]||Sparkles;return <div key={card.id} onClick={()=>!isVisualEditorOpen&&card.action==='security'&&openLegalPage('security')} className={`p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm transition-all group ${card.action!=='none'?'cursor-pointer hover:border-rose-400':''}`} style={{backgroundColor:card.backgroundColor,color:card.textColor}}><div className="flex items-center justify-between"><div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" style={{color:card.iconColor,backgroundColor:`${card.iconColor}18`}}><Icon className="w-6 h-6"/></div>{card.linkLabel&&<span className="text-[11px] font-bold flex items-center gap-1" style={{color:card.iconColor}}><EditableText id={`card.${card.id}.link`} label="Texto do link">{card.linkLabel}</EditableText><ChevronRight className="w-3.5 h-3.5"/></span>}</div><h3 className="text-base font-bold font-['Outfit']"><EditableText id={`card.${card.id}.title`} label="Título do card">{card.title}</EditableText></h3><p className="text-xs leading-relaxed opacity-70"><EditableText id={`card.${card.id}.description`} label="Descrição do card">{card.description}</EditableText></p></div>;})}</section></EditableBox></CanvasSection>}

        <CanvasSection sectionId="banners"><EditableBox id="section.banners" label="Banners">{banners.map(banner=><section key={banner.id} className="rounded-3xl p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 bg-cover bg-center" style={{color:banner.textColor,backgroundImage:banner.imageUrl?`linear-gradient(90deg,${banner.startColor}dd,${banner.endColor}aa),url(${banner.imageUrl})`:`linear-gradient(90deg,${banner.startColor},${banner.endColor})`}}><div className="space-y-2 max-w-xl"><h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit']"><EditableText id={`banner.${banner.id}.title`} label="Título do banner">{banner.title}</EditableText></h2><p className="text-xs sm:text-sm opacity-85"><EditableText id={`banner.${banner.id}.description`} label="Descrição do banner">{banner.description}</EditableText></p></div>{banner.buttonLabel&&banner.action!=='none'&&!(banner.action==='publish'&&currentUser.role==='admin')&&<button onClick={()=>{if(banner.action==='external'){if(/^https?:\/\//i.test(banner.externalUrl))window.open(banner.externalUrl,'_blank','noopener,noreferrer');return;}if(banner.action==='search'){setCurrentView('search');return;}if(!isAuthenticated){openAuthModal('login');return;}if(currentUser.role!=='broker'&&currentUser.role!=='agency'){addToast({type:'warning',title:'Recurso Exclusivo',message:'A publicação de anúncios é exclusiva para corretores e imobiliárias credenciadas.'});return;}setEditingProperty(null);setIsWizardOpen(true);}} className="px-8 py-4 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all shrink-0"><EditableText id={`banner.${banner.id}.button`} label="Texto do botão">{banner.buttonLabel}</EditableText></button>}</section>)}</EditableBox></CanvasSection>

      </CanvasSections>

    </div>
    </PortalCanvas>
  );
};
