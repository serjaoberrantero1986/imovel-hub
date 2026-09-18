import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCompactNumber, formatCurrency } from '../../lib/utils';
import { resolvePropertyCoordinates } from '../../lib/geocoding';
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Locate
} from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
  hoveredPropertyId?: string | null;
  className?: string;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  hoveredPropertyId,
  className = 'h-full w-full'
}) => {
  const { openPropertyDetail, theme } = useApp();
  const [leafletLayer, setLeafletLayer] = useState<'streets' | 'satellite'>('streets');

  // Leaflet DOM ref and instances
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<{ [id: string]: L.Marker }>({});

  // Default coordinate center (Central Brazil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];

  // Initialize Leaflet Map (OpenStreetMap engine - no API key required)
  useEffect(() => {
    if (!leafletContainerRef.current) return;
    if (leafletMapRef.current) return;

    // Calculate initial center based on properties if available
    let initialCenter: [number, number] = defaultCenter;
    let initialZoom = 4;
    if (properties.length > 0) {
      for (const p of properties) {
        const [pLat, pLng] = resolvePropertyCoordinates(p);
        if (pLat && pLng) {
          initialCenter = [pLat, pLng];
          initialZoom = properties.length === 1 ? 15 : 12;
          break;
        }
      }
    }

    const map = L.map(leafletContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    // Official OpenStreetMap Tile Server (100% Free, Open Source, Never requires API Key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    leafletMapRef.current = map;

    // ResizeObserver ensures map canvas renders seamlessly across screen resizes
    const resizeObserver = new ResizeObserver(() => {
      try {
        map.invalidateSize();
      } catch {}
    });

    if (leafletContainerRef.current) {
      resizeObserver.observe(leafletContainerRef.current);
    }

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 200);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update tile layer on theme toggle or satellite switch
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const isSatellite = leafletLayer === 'satellite';
    const isDark = theme === 'dark' && !isSatellite;

    if (isSatellite) {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: '&copy; Esri &mdash; OpenStreetMap contributors'
      }).addTo(map);
    } else {
      // Official OpenStreetMap Tile Server
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        className: isDark ? 'osm-dark-tiles' : '',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }).addTo(map);
    }
  }, [theme, leafletLayer]);

  // Update Leaflet property markers
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Remove stale markers
    Object.values(leafletMarkersRef.current).forEach((marker: L.Marker) => {
      marker.remove();
    });
    leafletMarkersRef.current = {};

    if (properties.length === 0) return;

    const bounds = L.latLngBounds([]);
    let validCount = 0;

    properties.forEach((prop) => {
      const [lat, lng] = resolvePropertyCoordinates(prop);
      if (!lat || !lng) return;

      const isHovered = prop.id === hoveredPropertyId;
      const formattedPrice = formatCompactNumber(prop.price);

      const markerHtml = `
        <div class="cursor-pointer transition-transform duration-200 select-none whitespace-nowrap inline-flex items-center -translate-x-1/2 -translate-y-1/2 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
          <div class="px-2.5 py-1 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1 border border-white/90 whitespace-nowrap ${
            isHovered
              ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 shadow-rose-600/30'
              : (prop.purpose === 'rent' || prop.purpose === 'seasonal')
              ? 'bg-indigo-600 text-white'
              : prop.purpose === 'launch'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          }">
            <span class="font-mono whitespace-nowrap leading-none">${formattedPrice}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-map-price-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const coverImage = prop.media[0]?.thumbnailUrl || prop.media[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80';
      
      const popupHtml = `
        <div id="osm-popup-${prop.id}" class="w-64 p-0 font-sans cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <div class="relative h-32 w-full bg-slate-200 overflow-hidden">
            <img src="${coverImage}" class="w-full h-full object-cover" />
            <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
              ${prop.purpose === 'sale' ? 'Venda' : (prop.purpose === 'rent' ? 'Locação' : prop.purpose === 'seasonal' ? 'Temporada' : 'Lançamento')}
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
      bounds.extend([lat, lng]);
      validCount++;
    });

    // Auto-fit to visible properties
    if (bounds.isValid()) {
      try {
        map.invalidateSize();
      } catch {}
      if (validCount > 1) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else if (validCount === 1) {
        const center = bounds.getCenter();
        map.setView(center, 15);
      }
      setTimeout(() => {
        try {
          map.invalidateSize();
          if (validCount > 1) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          } else if (validCount === 1) {
            map.setView(bounds.getCenter(), 15);
          }
        } catch {}
      }, 150);
    }
  }, [properties, hoveredPropertyId, openPropertyDetail]);

  const handleZoomIn = () => leafletMapRef.current?.zoomIn();
  const handleZoomOut = () => leafletMapRef.current?.zoomOut();
  const handleResetCenter = () => {
    if (properties.length > 0) {
      const bounds = L.latLngBounds([]);
      let count = 0;
      properties.forEach(p => {
        const [pLat, pLng] = resolvePropertyCoordinates(p);
        if (pLat && pLng) {
          bounds.extend([pLat, pLng]);
          count++;
        }
      });
      if (bounds.isValid() && count > 0) {
        if (count > 1) {
          leafletMapRef.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else {
          leafletMapRef.current?.setView(bounds.getCenter(), 15);
        }
        return;
      }
    }
    leafletMapRef.current?.setView(defaultCenter, 4);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900 shadow-md ${className}`}>
      {/* Leaflet Map Canvas */}
      <div className="w-full h-full min-h-[350px] relative">
        <div ref={leafletContainerRef} className="w-full h-full min-h-[350px] z-0" />

        {/* Minimal Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Zoom & Center */}
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
              title="Centralizar no Mapa"
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
        </div>
      </div>

      {/* Floating Property Counter Badge */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="px-3.5 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{properties.length} imóveis no mapa</span>
          <span className="text-[10px] text-slate-400 font-medium">
            (OpenStreetMap)
          </span>
        </div>
      </div>
    </div>
  );
};
