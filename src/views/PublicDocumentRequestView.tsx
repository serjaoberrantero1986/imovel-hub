import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { editUserImage } from '../lib/editUserImage';

interface RequestItem { id:string; label:string; description:string; required:boolean; allows_multiple:boolean; status:string; files:{id:string;name:string;mime_type:string;size:number;version:number;created_at:string}[] }
interface RequestData { request_id:string; participant:{name:string;role:string}; property:{title:string;code:string}; instructions?:string; expires_at:string; status:string; items:RequestItem[] }

const roleLabel:Record<string,string>={owner:'proprietário',co_owner:'coproprietário',buyer:'comprador',tenant:'locatário',spouse:'cônjuge',guarantor:'fiador',representative:'representante',other:'participante'};

async function callRequest(body:Record<string,unknown>){
  if(!supabase)throw new Error('Serviço indisponível.');
  const {data,error}=await supabase.functions.invoke('deal-document-request',{body});
  if(error)throw error;
  if(data?.error)throw new Error(data.error);
  return data;
}

async function inspectFile(file:File){
  if(file.size>15*1024*1024)throw new Error('O arquivo deve ter no máximo 15 MB.');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const pdf=bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46;
  const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  const png=bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47;
  if(!pdf&&!jpg&&!png)throw new Error('Envie somente PDF, JPEG ou PNG válido.');
  return pdf?'application/pdf':jpg?'image/jpeg':'image/png';
}

export const PublicDocumentRequestView:React.FC<{token:string}>=({token})=>{
  const [data,setData]=useState<RequestData|null>(null);
  const [loading,setLoading]=useState(true);
  const [busyItem,setBusyItem]=useState<string|null>(null);
  const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);
  const load=async()=>{setLoading(true);try{setData(await callRequest({action:'view',token}));}catch{setData(null);}finally{setLoading(false);}};
  useEffect(()=>{void load();},[token]);

  const upload=async(item:RequestItem,file?:File)=>{
    if(!file||!supabase)return;
    setBusyItem(item.id);setMessage(null);
    try{
      let prepared=file;let mime=await inspectFile(file);
      if(mime!=='application/pdf'){
        const result=await editUserImage(file,'document',2560);
        if(!result)return;
        prepared=new File([result.blob],file.name.replace(/\.[^.]+$/, '')+'.jpg',{type:'image/jpeg'});
        mime='image/jpeg';
      }
      const signed=await callRequest({action:'upload-url',token,itemId:item.id,mimeType:mime});
      const {error:uploadError}=await supabase.storage.from('deal-documents').uploadToSignedUrl(signed.path,signed.token,prepared,{contentType:mime});
      if(uploadError)throw uploadError;
      await callRequest({action:'complete-upload',token,itemId:item.id,path:signed.path,originalName:prepared.name,mimeType:mime,fileSize:prepared.size});
      await load();setMessage({type:'success',text:`${item.label} enviado com sucesso.`});
    }catch(error){setMessage({type:'error',text:error instanceof Error&&error.message.includes('DEAL_')?'Não foi possível enviar este documento. Atualize a página e tente novamente.':error instanceof Error?error.message:'Não foi possível enviar o arquivo.'});}
    finally{setBusyItem(null);}
  };

  if(loading)return <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-rose-600"/><p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">Carregando solicitação...</p></div></main>;
  if(!data)return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5 dark:bg-slate-950"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900"><AlertCircle className="mx-auto h-10 w-10 text-amber-500"/><h1 className="mt-4 text-2xl font-black">Link indisponível</h1><p className="mt-2 text-sm text-slate-500">Este link expirou, foi revogado ou não é válido. Solicite um novo acesso ao profissional responsável.</p></div></main>;
  const completed=data.items.filter(item=>['received','under_review','approved'].includes(item.status)).length;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white"><div className="mx-auto max-w-3xl space-y-5"><header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><img src="/icon.svg" alt="Web Imóveis" className="h-12 w-12"/><div><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Envio seguro de documentos</p><h1 className="font-['Outfit'] text-2xl font-black">{data.property.title}</h1><p className="text-xs text-slate-500">Código {data.property.code}</p></div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed dark:bg-slate-800/60"><p>Olá, <strong>{data.participant.name}</strong>. Foram solicitados documentos relacionados à sua participação como {roleLabel[data.participant.role]||'participante'}.</p>{data.instructions&&<p className="mt-2 text-slate-600 dark:text-slate-300">{data.instructions}</p>}</div><div className="mt-4 flex items-center justify-between text-xs"><span className="font-bold">Progresso: {completed}/{data.items.length}</span><span className="text-slate-500">Válido até {new Date(data.expires_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</span></div></header>
  {message&&<div className={`rounded-2xl border p-4 text-sm font-bold ${message.type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200':'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'}`}>{message.text}</div>}
  <section className="space-y-3">{data.items.map(item=>{const received=['received','under_review','approved'].includes(item.status);return <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${received?'bg-emerald-100 text-emerald-600 dark:bg-emerald-950':'bg-rose-50 text-rose-600 dark:bg-rose-950'}`}>{received?<CheckCircle2 className="h-5 w-5"/>:<FileText className="h-5 w-5"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black">{item.label}</h2>{item.required&&<span className="rounded-md bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-600 dark:bg-rose-950">Obrigatório</span>}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>{item.files.length>0&&<div className="mt-3 space-y-1">{item.files.map(file=><div key={file.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] dark:bg-slate-800"><ImageIcon className="h-3.5 w-3.5"/><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-slate-400">versão {file.version}</span></div>)}</div>}<label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold hover:border-rose-400 hover:text-rose-600 dark:border-slate-700"><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" disabled={busyItem===item.id} onChange={event=>void upload(item,event.target.files?.[0])}/>{busyItem===item.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}{received?'Enviar nova versão':'Anexar arquivo'}</label></div></div></article>})}</section>
  <footer className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900"><ShieldCheck className="mx-auto mb-2 h-5 w-5 text-emerald-500"/>Os arquivos são privados e ficam disponíveis somente aos participantes autorizados desta negociação. Não envie senhas ou códigos de acesso.</footer></div></main>;
};
