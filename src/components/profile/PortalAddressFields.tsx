import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { checkPortalSlugAvailability, normalisePortalSlug } from '../../lib/portalAddress';

export type PortalAddressCheck = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

export function PortalAddressFields({ title, subtitle, slug, onTitleChange, onSubtitleChange, onSlugChange, onStatusChange, disabled = false, suggestFromTitle = true }:{
  title:string; slug:string; onTitleChange:(value:string)=>void; onSlugChange:(value:string)=>void;
  subtitle?:string; onSubtitleChange?:(value:string)=>void;
  onStatusChange?:(status:PortalAddressCheck)=>void; disabled?:boolean; suggestFromTitle?:boolean;
}) {
  const [status,setStatus]=useState<PortalAddressCheck>('idle');
  const [message,setMessage]=useState('Digite ao menos 3 caracteres.');
  const edited=useRef(false);
  const setCheck=(next:PortalAddressCheck,text:string)=>{setStatus(next);setMessage(text);onStatusChange?.(next);};
  useEffect(()=>{
    if(disabled)return;
    const normalized=normalisePortalSlug(slug);
    if(normalized.length<3){setCheck('idle','Digite ao menos 3 caracteres.');return;}
    let active=true;setCheck('checking','Verificando disponibilidade…');
    const timer=window.setTimeout(()=>void checkPortalSlugAvailability(normalized).then(result=>{
      if(!active)return;
      if(result.slug!==slug)onSlugChange(result.slug);
      setCheck(result.available?'available':'unavailable',result.reason);
    }).catch(()=>active&&setCheck('error','Não foi possível verificar agora. Tente novamente.')),500);
    return()=>{active=false;window.clearTimeout(timer);};
  },[slug,disabled]);
  const stateClass=status==='available'?'border-emerald-400 text-emerald-700 dark:text-emerald-300':status==='unavailable'||status==='error'?'border-rose-400 text-rose-700 dark:text-rose-300':'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white';
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Título do site
      <input type="text" maxLength={80} disabled={disabled} value={title} placeholder="Ex: Souza Imóveis" onChange={e=>{const value=e.target.value;onTitleChange(value);if(suggestFromTitle&&!edited.current)onSlugChange(normalisePortalSlug(value));}} className="mt-1 w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"/>
    </label>
    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Endereço do site
      <span className={`mt-1 flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border ${stateClass}`}>
        <input type="text" maxLength={48} disabled={disabled} value={slug} placeholder="souzaimoveis" onChange={e=>{edited.current=true;onSlugChange(normalisePortalSlug(e.target.value));}} className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-xs outline-none"/>
        <span className="pr-2 text-[10px] text-slate-400 whitespace-nowrap">.webimoveis.site</span>
        <span className="pr-3">{status==='checking'?<Loader2 className="w-4 h-4 animate-spin"/>:status==='available'?<CheckCircle2 className="w-4 h-4"/>:(status==='unavailable'||status==='error')?<XCircle className="w-4 h-4"/>:null}</span>
      </span>
      <span className={`mt-1 block text-[10px] ${status==='available'?'text-emerald-600':status==='unavailable'||status==='error'?'text-rose-600':'text-slate-500'}`}>{message}</span>
    </label>
    {onSubtitleChange&&<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Subtítulo do site
      <input type="text" maxLength={100} disabled={disabled} value={subtitle||''} placeholder="Ex: Classificados & Gestão Imobiliária" onChange={e=>onSubtitleChange(e.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"/>
      <span className="mt-1 block text-[10px] font-normal text-slate-500">Aparece abaixo do título no cabeçalho do portal.</span>
    </label>}
  </div>;
}
