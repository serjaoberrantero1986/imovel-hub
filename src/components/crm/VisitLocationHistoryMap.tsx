import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

export interface VisitLocationPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  label: string;
  detail: string;
  referenceLat?: number;
  referenceLng?: number;
}

export function VisitLocationHistoryMap({point}:{point:VisitLocationPoint}) {
  const container=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!container.current)return;
    const map=L.map(container.current,{zoomControl:true,attributionControl:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
    const captured=L.latLng(point.lat,point.lng);
    L.circleMarker(captured,{radius:8,color:'#e11d48',fillColor:'#fb7185',fillOpacity:.9,weight:3}).addTo(map).bindPopup(point.label);
    if(point.accuracy&&point.accuracy>0)L.circle(captured,{radius:point.accuracy,color:'#e11d48',fillColor:'#fb7185',fillOpacity:.1,weight:1}).addTo(map);
    const bounds=L.latLngBounds([captured]);
    if(Number.isFinite(point.referenceLat)&&Number.isFinite(point.referenceLng)){
      const reference=L.latLng(point.referenceLat!,point.referenceLng!);
      L.circleMarker(reference,{radius:7,color:'#334155',fillColor:'#64748b',fillOpacity:.9,weight:2}).addTo(map).bindPopup('Ponto cadastrado do imóvel');
      L.polyline([reference,captured],{color:'#e11d48',dashArray:'6 6',weight:2}).addTo(map);bounds.extend(reference);
    }
    map.fitBounds(bounds.pad(.35),{maxZoom:17});
    setTimeout(()=>map.invalidateSize(),0);
    return()=>{map.remove();};
  },[point]);
  return <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
    <div ref={container} className="h-56 w-full" aria-label={`Mapa da ${point.label}`}/>
    <div className="p-3 text-xs"><p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><MapPin size={14} className="text-rose-600"/>{point.label}</p><p className="mt-1 text-slate-500">{point.detail}</p><p className="mt-1 font-mono text-[11px] text-slate-500">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}{point.accuracy?` · precisão ${Math.round(point.accuracy)} m`:''}</p></div>
  </div>;
}
