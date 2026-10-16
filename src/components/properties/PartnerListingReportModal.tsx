import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { partnershipContractErrorMessage, reportOutdatedPartnerListing } from '../../lib/partnershipContracts';

export const PartnerListingReportModal: React.FC<{ property: Property; isOpen: boolean; onClose: () => void }> = ({ property,isOpen,onClose }) => {
  const { addToast }=useApp();
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{if(isOpen)setReason('');},[isOpen]);
  const submit=async()=>{
    if(!property.partnership||reason.trim().length<10)return;
    setBusy(true);
    try{await reportOutdatedPartnerListing(property.partnership.id,reason);addToast({type:'success',title:'Informação enviada',message:'Captador e parceiro foram avisados para conferir o anúncio.'});onClose();}
    catch(error){addToast({type:'error',title:'Relato não enviado',message:partnershipContractErrorMessage(error)});}
    finally{setBusy(false);}
  };
  return <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={!busy} title="Comunicar informação desatualizada" description="Este relato não altera nem remove o anúncio automaticamente. As partes responsáveis receberão um aviso para conferência.">
    <div className="space-y-4"><div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>Não inclua documentos, dados bancários ou informações pessoais sensíveis.</span></div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300">O que precisa ser conferido?<textarea autoFocus rows={5} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} className="mt-1 w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="Ex.: o imóvel aparenta não estar mais disponível ou o valor informado diverge do atendimento." /></label><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Cancelar</button><button type="button" disabled={busy||reason.trim().length<10} onClick={()=>void submit()} className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">{busy&&<Loader2 className="w-4 h-4 animate-spin" />}Enviar relato</button></div></div>
  </Modal>;
};
