import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface Props {
  latitude: number | null;
  longitude: number | null;
  confirmed: boolean;
  onConfirm: (latitude: number, longitude: number) => void;
}
/** Mapa exclusivamente no popup autenticado. Não renderizar para visitantes. */
export const PrivatePropertyLocationMap: React.FC<Props> = ({latitude,longitude,confirmed,onConfirm}) => {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [candidate,setCandidate] = useState<{lat:number;lng:number}|null>(null);
  // SVG próprio evita caminhos de imagem quebrados do marcador padrão do Leaflet
  // após a compilação Vite. Mantém identidade visual e tamanho de toque no mobile.
  const markerIcon=useRef(L.divIcon({
    className:'',
    html:'<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48" role="img" aria-label="Local do imóvel"><path d="M19 2C9.6 2 2 9.6 2 19c0 13.2 17 27 17 27s17-13.8 17-27C36 9.6 28.4 2 19 2Z" fill="var(--portal-primary, #e11d48)" stroke="#fff" stroke-width="3"/><circle cx="19" cy="19" r="7" fill="#fff"/></svg>',
    iconSize:[38,48],iconAnchor:[19,46]
  }));

  const valid = latitude!==null&&longitude!==null&&Number.isFinite(latitude)&&Number.isFinite(longitude)
    &&Math.abs(latitude)<=90&&Math.abs(longitude)<=180&&(latitude!==0||longitude!==0);

  useEffect(()=>{
    if(!host.current||map.current)return;
    const instance=L.map(host.current,{zoomControl:true}).setView(
      valid?[latitude!,longitude!]:[-23.5,-47.5],valid?17:8
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap contributors',maxZoom:19
    }).addTo(instance);
    map.current=instance;
    const update=(lat:number,lng:number)=>{
      if(!marker.current){
        marker.current=L.marker([lat,lng],{draggable:true,icon:markerIcon.current}).addTo(instance);
        marker.current.on('dragend',()=>{const next=marker.current?.getLatLng();if(next)setCandidate({lat:next.lat,lng:next.lng});});
      }else marker.current.setLatLng([lat,lng]);
      setCandidate({lat,lng});
    };
    if(valid)update(latitude!,longitude!);
    instance.on('click',e=>update(e.latlng.lat,e.latlng.lng));
    window.setTimeout(()=>instance.invalidateSize(),100);
    return ()=>{instance.remove();map.current=null;marker.current=null;};
  },[]);

  useEffect(()=>{
    if(!map.current||!valid)return;
    const position=L.latLng(latitude!,longitude!);
    // A confirmed position may be edited by dragging, without geocoding overriding it.
    marker.current?.setLatLng(position);
    if(!marker.current){
      marker.current=L.marker(position,{draggable:true,icon:markerIcon.current}).addTo(map.current);
      marker.current.on('dragend',()=>{const next=marker.current?.getLatLng();if(next)setCandidate({lat:next.lat,lng:next.lng});});
    }
    map.current.setView(position,17);
    setCandidate({lat:latitude!,lng:longitude!});
  },[latitude,longitude,valid]);

  return <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
    <div className="flex justify-between gap-2">
      <strong className="text-xs text-slate-800 dark:text-white">Conferir ponto exato do imóvel (opcional)</strong>
      <span className={`text-[11px] font-semibold ${confirmed?'text-emerald-600':'text-amber-600'}`}>
        {confirmed?'Lote confirmado':'Ponto não confirmado'}
      </span>
    </div>
    <p className="text-xs text-slate-500">Após preencher o endereço, clique no lote ou arraste o marcador. Somente o profissional responsável verá esta localização precisa.</p>
    <div ref={host} className="h-56 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Mapa privado para confirmar o lote"/>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] text-slate-500">{candidate?`${candidate.lat.toFixed(7)}, ${candidate.lng.toFixed(7)}`:'Selecione um local no mapa'}</span>
      <button type="button" disabled={!candidate} onClick={()=>candidate&&onConfirm(candidate.lat,candidate.lng)}
        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">
        Confirmar ponto no mapa
      </button>
    </div>
  </div>;
};
