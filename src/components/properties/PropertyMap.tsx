import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCompactNumber, formatCurrency } from '../../lib/utils';
import { Layers, MapPin, ZoomIn, ZoomOut, Locate } from 'lucide-react';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const { openPropertyDetail, theme } = useApp();
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Default center at Sorocaba/SP
    const defaultCenter: [number, number] = [-23.5015, -47.4580];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // Base Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on Dark mode or Map Type change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear current layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    if (mapType === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (theme === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);
  }, [theme, mapType]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker: any) => marker?.remove?.());
    markersRef.current = {};

    if (properties.length === 0) return;

    const bounds = L.latLngBounds([]);

    properties.forEach((prop) => {
      if (!prop.latitude || !prop.longitude) return;

      const isHovered = prop.id === hoveredPropertyId;
      const formattedPrice = formatCompactNumber(prop.price);

      const markerHtml = `
        <div class="cursor-pointer transition-transform duration-200 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
          <div class="px-2.5 py-1 rounded-full text-xs font-extrabold shadow-lg flex items-center gap-1 border border-white/80 ${
            isHovered
              ? 'bg-rose-600 text-white ring-4 ring-rose-500/30'
              : prop.purpose === 'rent'
              ? 'bg-indigo-600 text-white'
              : prop.purpose === 'launch'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          }">
            <span>${formattedPrice}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-map-price-marker',
        iconSize: [60, 26],
        iconAnchor: [30, 13]
      });

      const marker = L.marker([prop.latitude, prop.longitude], { icon: customIcon }).addTo(map);

      // Popup card content
      const coverImage = prop.media[0]?.thumbnailUrl || prop.media[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80';
      
      const popupHtml = `
        <div id="map-popup-${prop.id}" class="w-60 p-0 font-sans cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
          <div class="relative h-28 w-full bg-slate-200 overflow-hidden">
            <img src="${coverImage}" class="w-full h-full object-cover" />
            <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
              ${prop.purpose === 'sale' ? 'Venda' : prop.purpose === 'rent' ? 'Locação' : 'Lançamento'}
            </div>
          </div>
          <div class="p-3">
            <div class="text-[11px] text-slate-500 font-medium">${prop.neighborhood}, ${prop.city}</div>
            <div class="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">${prop.title}</div>
            <div class="mt-1 flex items-center justify-between">
              <span class="text-sm font-extrabold text-rose-600">${formatCurrency(prop.price)}</span>
              <span class="text-[11px] text-slate-600 font-semibold">${prop.usefulArea || prop.totalArea} m² • ${prop.bedrooms} qts</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-leaflet-popup',
        offset: [0, -10]
      });

      marker.on('click', () => {
        // Small delay to allow popup click binding
        setTimeout(() => {
          const popupEl = document.getElementById(`map-popup-${prop.id}`);
          if (popupEl) {
            popupEl.onclick = () => openPropertyDetail(prop.id);
          }
        }, 50);
      });

      markersRef.current[prop.id] = marker;
      bounds.extend([prop.latitude, prop.longitude]);
    });

    if (bounds.isValid() && properties.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [properties, hoveredPropertyId]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetCenter = () => {
    mapInstanceRef.current?.setView([-23.5015, -47.4580], 13);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
      {/* Map container DOM */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-0" />

      {/* Floating Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            title="Aproximar"
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Afastar"
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCenter}
            title="Centralizar em Sorocaba"
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Locate className="w-4 h-4" />
          </button>
        </div>

        {/* Map Style Toggle */}
        <button
          onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
          className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <Layers className="w-3.5 h-3.5 text-rose-500" />
          <span>{mapType === 'streets' ? 'Satélite' : 'Mapa'}</span>
        </button>
      </div>

      {/* Floating Property Counter Badge */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{properties.length} imóveis no mapa</span>
        </div>
      </div>
    </div>
  );
};
