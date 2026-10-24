import React, { useEffect, useState } from 'react';
import { CalendarOff, Clock3, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { deleteVisitUnavailability, loadVisitUnavailability, saveVisitUnavailability, VisitUnavailability, visitError, visitLocalDate } from '../../lib/propertyVisits';

const days=[['Seg',1],['Ter',2],['Qua',3],['Qui',4],['Sex',5],['Sáb',6],['Dom',7]] as const;
const empty=(): Omit<VisitUnavailability,'id'> & {id?:string} => ({kind:'recurring',weekdays:[1,2,3,4,5],starts_on:null,ends_on:null,start_time:'12:00',end_time:'14:00',all_day:false,private_label:''});
const dateLabel=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`)):'';

export function VisitAvailabilitySettings({addToast}:{addToast:(toast:{type:'success'|'error'|'warning'|'info';title:string;message?:string})=>void}) {
  const [items,setItems]=useState<VisitUnavailability[]>([]);
  const [form,setForm]=useState(empty);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=async()=>{try{setItems(await loadVisitUnavailability());setError('');}catch(e){setError(visitError(e));}};
  useEffect(()=>{void load();},[]);
  const edit=(item:VisitUnavailability)=>{setForm({...item,start_time:item.start_time?.slice(0,5)||null,end_time:item.end_time?.slice(0,5)||null});setOpen(true);setError('');};
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{
    await saveVisitUnavailability(form);await load();setForm(empty());setOpen(false);
    addToast({type:'success',title:'Indisponibilidade salva',message:'Os clientes verão somente os horários que permanecem disponíveis.'});
  }catch(err){setError(visitError(err));}finally{setBusy(false);}};
  const remove=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{await deleteVisitUnavailability(id);await load();addToast({type:'success',title:'Indisponibilidade removida'});}catch(err){setError(visitError(err));}finally{setBusy(false);}};
  const recurring=form.kind==='recurring';
  return <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><CalendarOff className="w-5 h-5 text-rose-500"/>Disponibilidade para visitas</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Agenda padrão das 09:00 às 18:00, com horários a cada 30 minutos. O motivo de um bloqueio nunca é exibido ao cliente.</p></div><Button type="button" size="sm" leftIcon={<Plus size={15}/>} onClick={()=>{setForm(empty());setOpen(v=>!v);setError('');}}>Adicionar período</Button></div>
    {open&&<form onSubmit={submit} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-4">
      <Select label="Tipo de indisponibilidade" value={form.kind} onChange={e=>setForm(emptyValue=>({...emptyValue,kind:e.target.value as 'recurring'|'period',weekdays:e.target.value==='recurring'?[1,2,3,4,5]:null,starts_on:e.target.value==='period'?visitLocalDate():null,ends_on:e.target.value==='period'?visitLocalDate():null}))} options={[{value:'recurring',label:'Horário recorrente'},{value:'period',label:'Período por data'}]}/>
      {recurring?<div><p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Repetir nos dias</p><div className="flex flex-wrap gap-2">{days.map(([label,value])=><label key={value} className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold ${(form.weekdays||[]).includes(value)?'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300':'border-slate-200 dark:border-slate-700 text-slate-500'}`}><input className="sr-only" type="checkbox" checked={(form.weekdays||[]).includes(value)} onChange={e=>setForm(v=>({...v,weekdays:e.target.checked?[...(v.weekdays||[]),value]:(v.weekdays||[]).filter(d=>d!==value)}))}/>{label}</label>)}</div></div>:<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Input label="Data inicial" type="date" min={visitLocalDate()} value={form.starts_on||''} onChange={e=>setForm(v=>({...v,starts_on:e.target.value}))} required/><Input label="Data final" type="date" min={form.starts_on||visitLocalDate()} value={form.ends_on||''} onChange={e=>setForm(v=>({...v,ends_on:e.target.value}))} required/><label className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={form.all_day} onChange={e=>setForm(v=>({...v,all_day:e.target.checked,start_time:e.target.checked?null:'09:00',end_time:e.target.checked?null:'18:00'}))}/>Bloquear os dias inteiros</label></div>}
      {!form.all_day&&<div className="grid grid-cols-2 gap-3"><Input label="Das" type="time" step={1800} value={form.start_time||''} onChange={e=>setForm(v=>({...v,start_time:e.target.value}))} required/><Input label="Até" type="time" step={1800} value={form.end_time||''} onChange={e=>setForm(v=>({...v,end_time:e.target.value}))} required/></div>}
      <Input label="Identificação particular (opcional)" maxLength={100} placeholder="Ex.: Almoço, férias ou compromisso" value={form.private_label||''} onChange={e=>setForm(v=>({...v,private_label:e.target.value}))}/>
      {error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={()=>{setOpen(false);setForm(empty());}}>Cancelar</Button><Button type="submit" isLoading={busy}>Salvar período</Button></div>
    </form>}
    {!open&&error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
    <div className="space-y-2">{items.length===0?<p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-xs text-slate-500">Nenhuma indisponibilidade cadastrada.</p>:items.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"><div className="min-w-0"><p className="text-sm font-bold text-slate-900 dark:text-white">{item.private_label||'Período indisponível'}</p><p className="mt-1 text-xs text-slate-500">{item.kind==='recurring'?`${days.filter(([,value])=>(item.weekdays||[]).includes(value)).map(([label])=>label).join(', ')} · ${item.start_time?.slice(0,5)}–${item.end_time?.slice(0,5)}`:`${dateLabel(item.starts_on)} a ${dateLabel(item.ends_on)}${item.all_day?' · dia inteiro':` · ${item.start_time?.slice(0,5)}–${item.end_time?.slice(0,5)}`}`}</p></div><div className="flex shrink-0 gap-1"><Button type="button" size="sm" variant="ghost" leftIcon={<Pencil size={14}/>} onClick={()=>edit(item)}>Editar</Button><Button type="button" size="sm" variant="ghost" leftIcon={<Trash2 size={14}/>} disabled={busy} onClick={()=>void remove(item.id)}>Excluir</Button></div></div>)}</div>
    <p className="flex items-center gap-2 text-[11px] text-slate-500"><Clock3 size={13}/>Visitas confirmadas reservam também uma hora de intervalo antes da próxima visita.</p>
  </div>;
}
