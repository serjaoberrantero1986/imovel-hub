import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCompactNumber, formatCurrency } from '../../lib/utils';
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Locate, 
  Key, 
  ExternalLink, 
  X,
  MapPin,
  Sparkles,
  Compass,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
  hoveredPropertyId?: string | null;
  className?: string;
}

// Inner controls for Google Maps
const GoogleMapControls: React.FC<{
  mapTypeId: string;
  setMapTypeId: (type: string) => void;
  properties: Property[];
  onOpenKeyModal: () => void;
  onSwitchToOsm: () => void;
}> = ({ mapTypeId, setMapTypeId, properties, onOpenKeyModal, onSwitchToOsm }) => {
  const map = useMap();

  const handleZoomIn = () => {
    if (!map) return;
    map.setZoom((map.getZoom() || 13) + 1);
  };

  const handleZoomOut = () => {
    if (!map) return;
    map.setZoom((map.getZoom() || 13) - 1);
  };

  const handleResetCenter = () => {
    if (!map) return;
    map.panTo({ lat: -23.5015, lng: -47.4580 });
    map.setZoom(13);
  };

  // Fit bounds on property change
  useEffect(() => {
    if (!map || properties.length === 0) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      let validCoords = 0;
      properties.forEach(p => {
        if (p.latitude && p.longitude) {
          bounds.extend({ lat: p.latitude, lng: p.longitude });
          validCoords++;
        }
      });
      if (validCoords > 1) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      } else if (validCoords === 1) {
        const single = properties.find(p => p.latitude && p.longitude);
        if (single) {
          map.panTo({ lat: single.latitude, lng: single.longitude });
          map.setZoom(14);
        }
      }
    } catch {
      // ignore
    }
  }, [map, properties]);

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
      {/* Zoom & Center Tools */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          title="Aproximar Zoom"
          className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Afastar Zoom"
          className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5 mx-1" />
        <button
          onClick={handleResetCenter}
          title="Centralizar em Sorocaba/SP"
          className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>

      {/* Map Layer Switcher */}
      <button
        onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')}
        className="px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
      >
        <Layers className="w-3.5 h-3.5 text-rose-500" />
        <span>{mapTypeId === 'roadmap' ? 'Satélite' : 'Mapa'}</span>
      </button>

      {/* Provider & Key Config */}
      <button
        onClick={onOpenKeyModal}
        title="Gerenciar Provedor de Mapa / Chave"
        className="px-3 py-1.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 backdrop-blur-md shadow-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
      >
        <Key className="w-3 h-3" />
        <span>Google Maps</span>
      </button>
    </div>
  );
};

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  hoveredPropertyId,
  className = 'h-full w-full'
}) => {
  const { openPropertyDetail, theme } = useApp();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [leafletLayer, setLeafletLayer] = useState<'streets' | 'satellite'>('streets');
  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);
  
  // Manage Provider selection and Google Maps API Key
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gmp_api_key') || envKey;
  });
  const [inputKey, setInputKey] = useState<string>(apiKey);
  const [mapProvider, setMapProvider] = useState<'osm' | 'google'>(() => {
    const saved = localStorage.getItem('preferred_map_provider');
    if (saved === 'google' && (localStorage.getItem('gmp_api_key') || envKey)) {
      return 'google';
    }
    return (envKey && envKey.startsWith('AIza')) ? 'google' : 'osm';
  });

  // Leaflet DOM ref and instance
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<{ [id: string]: L.Marker }>({});

  // Initialize Leaflet Map when provider is 'osm'
  useEffect(() => {
    if (mapProvider !== 'osm') {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      return;
    }

    if (!leafletContainerRef.current) return;
    if (leafletMapRef.current) return;

    const defaultCenter: [number, number] = [-23.5015, -47.4580];
    const map = L.map(leafletContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapProvider]);

  // Update Leaflet tile layer on style or dark mode toggle
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || mapProvider !== 'osm') return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    if (leafletLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (theme === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
  }, [theme, leafletLayer, mapProvider]);

  // Update Leaflet markers
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || mapProvider !== 'osm') return;

    Object.values(leafletMarkersRef.current).forEach((marker: L.Marker) => {
      marker.remove();
    });
    leafletMarkersRef.current = {};

    if (properties.length === 0) return;

    const bounds = L.latLngBounds([]);
    let validCount = 0;

    properties.forEach((prop) => {
      if (!prop.latitude || !prop.longitude) return;

      const isHovered = prop.id === hoveredPropertyId;
      const formattedPrice = formatCompactNumber(prop.price);

      const markerHtml = `
        <div class="cursor-pointer transition-transform duration-200 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
          <div class="px-2.5 py-1 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1 border border-white/90 ${
            isHovered
              ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 shadow-rose-600/30'
              : prop.purpose === 'rent'
              ? 'bg-indigo-600 text-white'
              : prop.purpose === 'launch'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          }">
            <span class="font-mono">${formattedPrice}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-map-price-marker',
        iconSize: [64, 28],
        iconAnchor: [32, 14]
      });

      const marker = L.marker([prop.latitude, prop.longitude], { icon: customIcon }).addTo(map);

      const coverImage = prop.media[0]?.thumbnailUrl || prop.media[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80';
      
      const popupHtml = `
        <div id="osm-popup-${prop.id}" class="w-64 p-0 font-sans cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <div class="relative h-32 w-full bg-slate-200 overflow-hidden">
            <img src="${coverImage}" class="w-full h-full object-cover" />
            <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
              ${prop.purpose === 'sale' ? 'Venda' : prop.purpose === 'rent' ? 'Locação' : 'Lançamento'}
            </div>
            <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-[10px] font-mono font-bold">
              Cód: ${prop.code}
            </div>
          </div>
          <div class="p-3 space-y-1.5">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">${prop.neighborhood}, ${prop.city}</div>
            <div class="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">${prop.title}</div>
            <div class="flex items-center justify-between pt-1">
              <span class="text-sm font-extrabold text-rose-600 dark:text-rose-400">${formatCurrency(prop.price)}</span>
              <span class="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">${prop.usefulArea || prop.totalArea} m² • ${prop.bedrooms} qts</span>
            </div>
            <button class="w-full mt-2 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold text-center transition-colors">
              Ver Detalhes do Imóvel
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-leaflet-popup',
        offset: [0, -10]
      });

      marker.on('click', () => {
        setTimeout(() => {
          const popupEl = document.getElementById(`osm-popup-${prop.id}`);
          if (popupEl) {
            popupEl.onclick = () => openPropertyDetail(prop.id);
          }
        }, 50);
      });

      leafletMarkersRef.current[prop.id] = marker;
      bounds.extend([prop.latitude, prop.longitude]);
      validCount++;
    });

    if (bounds.isValid() && validCount > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [properties, hoveredPropertyId, mapProvider, openPropertyDetail]);

  const handleLeafletZoomIn = () => leafletMapRef.current?.zoomIn();
  const handleLeafletZoomOut = () => leafletMapRef.current?.zoomOut();
  const handleLeafletResetCenter = () => {
    leafletMapRef.current?.setView([-23.5015, -47.4580], 13);
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    if (cleanKey) {
      localStorage.setItem('gmp_api_key', cleanKey);
      localStorage.setItem('preferred_map_provider', 'google');
      setApiKey(cleanKey);
      setMapProvider('google');
    } else {
      localStorage.removeItem('gmp_api_key');
      localStorage.setItem('preferred_map_provider', 'osm');
      setApiKey('');
      setMapProvider('osm');
    }
    setKeyModalOpen(false);
  };

  const handleClearKey = () => {
    localStorage.removeItem('gmp_api_key');
    localStorage.setItem('preferred_map_provider', 'osm');
    setApiKey('');
    setInputKey('');
    setMapProvider('osm');
  };

  const defaultCenter = { lat: -23.5015, lng: -47.4580 };
  const hasValidGoogleKey = Boolean(apiKey && apiKey.trim().length > 10);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900 shadow-md ${className}`}>
      
      {/* 1. Leaflet Map View (Default / High Performance, zero API Key required) */}
      {mapProvider === 'osm' && (
        <div className="w-full h-full min-h-[350px] relative">
          <div ref={leafletContainerRef} className="w-full h-full min-h-[350px] z-0" />

          {/* Leaflet Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            {/* Zoom & Center */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
              <button
                onClick={handleLeafletZoomIn}
                title="Aproximar Zoom"
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleLeafletZoomOut}
                title="Afastar Zoom"
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5 mx-1" />
              <button
                onClick={handleLeafletResetCenter}
                title="Centralizar em Sorocaba/SP"
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Locate className="w-4 h-4" />
              </button>
            </div>

            {/* Satellite / Streets toggle */}
            <button
              onClick={() => setLeafletLayer(leafletLayer === 'streets' ? 'satellite' : 'streets')}
              className="px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-rose-500" />
              <span>{leafletLayer === 'streets' ? 'Satélite' : 'Mapa'}</span>
            </button>

            {/* Google Maps setup trigger button */}
            <button
              onClick={() => setKeyModalOpen(true)}
              title="Ativar Google Maps Platform"
              className="px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Compass className="w-3 h-3 text-rose-500" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Google Maps View (Activated when user enables Google Maps and provides a valid API Key) */}
      {mapProvider === 'google' && hasValidGoogleKey && (
        <APIProvider apiKey={apiKey}>
          <div className="w-full h-full min-h-[350px]">
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              mapTypeId={mapTypeId}
              disableDefaultUI={true}
              gestureHandling="greedy"
              colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            >
              {/* Map Custom Controls Component */}
              <GoogleMapControls
                mapTypeId={mapTypeId}
                setMapTypeId={setMapTypeId}
                properties={properties}
                onOpenKeyModal={() => setKeyModalOpen(true)}
                onSwitchToOsm={() => {
                  setMapProvider('osm');
                  localStorage.setItem('preferred_map_provider', 'osm');
                }}
              />

              {/* Advanced Markers for Properties */}
              {properties.map((prop) => {
                if (!prop.latitude || !prop.longitude) return null;
                const isHovered = prop.id === hoveredPropertyId;
                const isSelected = selectedProperty?.id === prop.id;
                const formattedPrice = formatCompactNumber(prop.price);

                return (
                  <AdvancedMarker
                    key={prop.id}
                    position={{ lat: prop.latitude, lng: prop.longitude }}
                    title={`${prop.title} - ${formatCurrency(prop.price)}`}
                    onClick={() => setSelectedProperty(prop)}
                    zIndex={isSelected ? 100 : isHovered ? 90 : 10}
                  >
                    <div 
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected || isHovered ? 'scale-125 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1 border border-white/90 ${
                        isSelected || isHovered
                          ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 shadow-rose-600/30'
                          : prop.purpose === 'rent'
                          ? 'bg-indigo-600 text-white'
                          : prop.purpose === 'launch'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      }`}>
                        <span className="font-mono">${formattedPrice}</span>
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* InfoWindow Popup for Selected Property */}
              {selectedProperty && selectedProperty.latitude && selectedProperty.longitude && (
                <InfoWindow
                  position={{ lat: selectedProperty.latitude, lng: selectedProperty.longitude }}
                  onCloseClick={() => setSelectedProperty(null)}
                  pixelOffset={[0, -28]}
                >
                  <div 
                    onClick={() => openPropertyDetail(selectedProperty.id)}
                    className="w-64 p-0 font-sans cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <div className="relative h-32 w-full bg-slate-200 overflow-hidden">
                      <img 
                        src={selectedProperty.media[0]?.thumbnailUrl || selectedProperty.media[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'} 
                        alt={selectedProperty.title}
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                        {selectedProperty.purpose === 'sale' ? 'Venda' : selectedProperty.purpose === 'rent' ? 'Locação' : 'Lançamento'}
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-[10px] font-mono font-bold">
                        Cód: {selectedProperty.code}
                      </div>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {selectedProperty.neighborhood}, {selectedProperty.city}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {selectedProperty.title}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                          {formatCurrency(selectedProperty.price)}
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                          {selectedProperty.usefulArea || selectedProperty.totalArea} m² • {selectedProperty.bedrooms} qts
                        </span>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openPropertyDetail(selectedProperty.id);
                        }}
                        className="w-full mt-2 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold text-center transition-colors"
                      >
                        Ver Detalhes do Imóvel
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}

            </Map>
          </div>
        </APIProvider>
      )}

      {/* Floating Property Counter Badge */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="px-3.5 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{properties.length} imóveis no mapa</span>
          <span className="text-[10px] text-slate-400 font-normal">
            ({mapProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'})
          </span>
        </div>
      </div>

      {/* Map Settings & API Key Modal */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-rose-500" />
                <span>Configurar Visualização de Mapa</span>
              </h3>
              <button onClick={() => setKeyModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha o provedor de mapa padrão da aplicação ou adicione sua chave do Google Maps.
            </p>

            {/* Provider selection options */}
            <div className="space-y-2 pt-1">
              <label 
                onClick={() => {
                  setMapProvider('osm');
                  localStorage.setItem('preferred_map_provider', 'osm');
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  mapProvider === 'osm'
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    OpenStreetMap / CartoDB & Satélite Esri
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Nenhuma chave de API necessária • Sempre disponível e rápido
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  mapProvider === 'osm' ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
                }`}>
                  {mapProvider === 'osm' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </label>

              <label 
                onClick={() => {
                  setMapProvider('google');
                  localStorage.setItem('preferred_map_provider', 'google');
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  mapProvider === 'google'
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Google Maps Platform</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      API Oficial
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Requer chave de API ou Maps Demo Key gratuita
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  mapProvider === 'google' ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
                }`}>
                  {mapProvider === 'google' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </label>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  Google Maps API Key (opcional):
                </label>
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Gerar Maps Demo Key Instantânea</span>
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Você pode gerar uma chave demo com 1 clique usando sua conta Google:
                </p>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 underline pt-0.5"
                >
                  <span>Abrir Portal de Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  Usar OpenStreetMap
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
