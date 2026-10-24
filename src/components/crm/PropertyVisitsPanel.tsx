import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { PropertyVisit, VisitHistory, loadPropertyVisits, loadVisitHistory, schedulePropertyVisit, updatePropertyVisit,
  disputePropertyVisit, verifyVisitPresence, visitEmailService, captureVisitLocation, visitError, visitInterval,
  visitLocalDate, visitLocalTime, formatVisitDate, VISIT_STATUS, VisitNotice, loadVisitNotices, markVisitNoticeRead, resolveVisitDispute } from '../../lib/propertyVisits';

const eventLabels: Record<string,string> = { requested:'Solicitação / remarcação', confirmed:'Aceite do horário', otp_issued:'Envio de confirmação solicitado',
  otp_verified:'Presença confirmada pelo interessado', check_in:'Chegada registrada', manual_confirmed:'Chegada declarada manualmente',
  completed:'Visita concluída', check_out:'Saída registrada', cancelled:'Cancelamento', no_show:'Ausência informada', disputed:'Contestação' };
type Dialog = { action: string; visit?: PropertyVisit; disputeId?: string };

export function PropertyVisitsPanel({ leadId }: { leadId?: string }) {
  const { currentUser, isAuthenticated, openAuthModal, addToast, properties, leads } = useApp();
  const [items, setItems] = useState<PropertyVisit[]>([]);
  const [notices, setNotices] = useState<VisitNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestKey = useRef(crypto.randomUUID());
  const loadGeneration = useRef(0);
  const [filter, setFilter] = useState('active');
  const [date, setDate] = useState(visitLocalDate(Date.now()+86400000));
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [selectedLead, setSelectedLead] = useState(leadId || '');
  const [useGps, setUseGps] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState<VisitHistory | null>(null);
  const [emailReady, setEmailReady] = useState(false);
  const focusedId = new URLSearchParams(window.location.search).get('visit');
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    if (!isAuthenticated) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [visits, notices] = await Promise.all([loadPropertyVisits(), loadVisitNotices()]);
      if (generation === loadGeneration.current) { setItems(visits); setNotices(notices); setError(''); }
    } catch (e) { if (generation === loadGeneration.current) setError(visitError(e)); }
    finally { if (generation === loadGeneration.current) setLoading(false); }
  }, [isAuthenticated, currentUser.id]);
  useEffect(() => {
    setItems([]); setNotices([]); setDialog(null); if(currentUser.role==='admin')setFilter('all'); void load();
    let active = true;
    if (isAuthenticated) void visitEmailService().then(ready => { if (active) setEmailReady(ready); }).catch(() => { if (active) setEmailReady(false); });
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('property-visits-changed', refresh);
    return () => { active=false; ++loadGeneration.current; window.removeEventListener('focus', refresh); window.removeEventListener('property-visits-changed', refresh); };
  }, [load, isAuthenticated]);
  const open = (next: Dialog) => {
    setDialog(next); setFormError(''); setReason(''); setCode(''); setAccepted(false); setHistory(null); setUseGps(next.action!=='complete');
    requestKey.current=crypto.randomUUID();
    if (next.visit?.scheduled_at) { setDate(visitLocalDate(next.visit.scheduled_at)); setTime(visitLocalTime(next.visit.scheduled_at));
      const end = next.visit.scheduled_end ? Date.parse(next.visit.scheduled_end) : Date.parse(next.visit.scheduled_at) + 3600000;
      setDuration(Math.max(15, Math.round((end-Date.parse(next.visit.scheduled_at))/60000))); }
    if (next.action==='history' && next.visit) void loadVisitHistory(next.visit.id).then(setHistory).catch(e => setFormError(visitError(e)));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!dialog || lock.current) return;
    lock.current=true; setBusy(true); setFormError('');
    try {
      const v=dialog.visit;
      if (dialog.action==='create') {
        const interval=visitInterval(date,time,duration);
        const property=properties.find(p => p.id===propertyId);
        if (!property || !selectedLead) { setFormError('Escolha o imóvel e o atendimento correspondente.'); return; }
        await schedulePropertyVisit(propertyId,interval.start,interval.end,requestKey.current,selectedLead,property.partnership?.id);
      } else if (v) {
        if (dialog.action==='history') return;
        if (dialog.action==='send') {
          if (!await visitEmailService(v.id)) throw new Error('VISIT_EMAIL_UNAVAILABLE');
        } else if (dialog.action==='verify') {
          if (!accepted) { setFormError('Leia a declaração e confirme sua presença antes de continuar.'); return; }
          await verifyVisitPresence(v.id,code);
        } else if (dialog.action==='dispute') await disputePropertyVisit(v.id,reason,dialog.disputeId);
        else if (dialog.action==='resolve' && dialog.disputeId) await resolveVisitDispute(dialog.disputeId,reason);
        else {
          let fields: Record<string,unknown> = { p_reason: reason || null };
          if (dialog.action==='reschedule') { const interval=visitInterval(date,time,duration); fields={ ...fields,p_start:interval.start,p_end:interval.end }; }
          if (dialog.action==='check_in' || dialog.action==='manual_check_in') {
            if (!accepted) { setFormError('Confirme que compreendeu como o registro será identificado.'); return; }
            if (useGps) fields={...fields,...await captureVisitLocation()};
          }
          if (dialog.action==='complete' && useGps) fields={...fields,...await captureVisitLocation()};
          await updatePropertyVisit(v,dialog.action,fields);
        }
      }
      setDialog(null);
      addToast({ type:'success',title:dialog.action==='send'?'Código enviado':'Visita atualizada',
        message:dialog.action==='send'?'O código foi enviado ao e-mail verificado do interessado. Ele deve confirmar na própria conta.':'O registro foi salvo. Consulte a situação e o histórico da visita.' });
      window.dispatchEvent(new Event('property-visits-changed'));
    } catch (e) {
      const message = e instanceof Error && !e.message.startsWith('VISIT_') && /horário|data|duração/.test(e.message) ? e.message : visitError(e);
      setFormError(message); addToast({type:'error',title:'Não foi possível concluir',message});
    } finally { lock.current=false; setBusy(false); }
  };
  if (!isAuthenticated) return <section className="space-y-4 py-8"><h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Minhas visitas</h1><p className="text-sm text-slate-500">Entre na sua conta para consultar e confirmar suas visitas. O acesso é restrito aos participantes.</p><Button onClick={()=>openAuthModal('login')}>Entrar na minha conta</Button></section>;
  const visible=items.filter(v => (!leadId || v.lead_id===leadId) && (v.id===focusedId || filter==='all' || (filter==='active' ? ['requested','confirmed','checked_in'].includes(v.status) : v.status===filter)));
  const actionTitles: Record<string,string> = { resolve:'Registrar resposta administrativa',create:'Propor visita',confirm:'Confirmar horário',reschedule:'Propor outro horário',cancel:'Cancelar visita',no_show:'Informar ausência',check_in:'Registrar chegada',manual_check_in:'Registrar chegada por declaração',complete:'Concluir visita',send:'Enviar código ao interessado',verify:'Confirmar minha presença',dispute:'Contestação / resposta',history:'Histórico e comprovante' };
  const v=dialog?.visit;
  const requiresReason=dialog && (['reschedule','cancel','no_show','manual_check_in','dispute','resolve'].includes(dialog.action) || (dialog.action==='check_in' && !useGps));
  return <section className="space-y-5 text-slate-900 dark:text-slate-100">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-rose-600">AGENDAMENTO E VISITAÇÃO</p><h2 className="mt-1 text-2xl font-extrabold">Visitas aos imóveis</h2><p className="mt-2 text-sm text-slate-500">Horários de Brasília. Solicitação, aceite e presença são registros separados.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>void load()} isLoading={loading} leftIcon={<RefreshCw size={14}/>}>Atualizar</Button>{['broker','agency'].includes(currentUser.role)&&<Button size="sm" onClick={()=>open({action:'create'})}>Propor visita</Button>}</div></div>
    {notices.filter(n=>!leadId||items.some(v=>v.id===n.visit_id&&v.lead_id===leadId)).map(n=><div key={n.id} className="rounded-xl border border-rose-200 dark:border-rose-900 p-3 text-sm"><p className="font-bold">{n.title}</p><p>{n.message}</p><Button size="sm" variant="ghost" onClick={()=>{void markVisitNoticeRead(n.id).then(ok=>{if(ok)setNotices(current=>current.filter(x=>x.id!==n.id));}).catch(e=>setError(visitError(e)));}}>Marcar como lido</Button></div>)}
    {error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
    {!loading&&focusedId&&!items.some(item=>item.id===focusedId)&&<p role="status" className="text-sm text-slate-500">A visita do link não está disponível para esta conta.</p>}
    <Select label="Exibir visitas" value={filter} onChange={e=>setFilter(e.target.value)} options={[{value:'active',label:'Em andamento e próximas'},{value:'all',label:'Todas'},{value:'completed',label:'Concluídas'},{value:'cancelled',label:'Canceladas'},{value:'no_show',label:'Ausências informadas'}]}/>
    {!loading&&!error&&visible.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500"><CalendarCheck className="mx-auto mb-3 h-8 w-8"/>Nenhuma visita neste filtro.</div>}
    {visible.map(item=><article key={item.id} className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 space-y-4 ${focusedId===item.id?'border-rose-400':'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-extrabold">{item.property_title}</h3><p className="text-sm text-slate-500">{item.attendee_name} · {item.responsible_name}</p><p className="mt-2 text-sm font-semibold">{formatVisitDate(item.scheduled_at)} {item.scheduled_end ? 'a '+visitLocalTime(item.scheduled_end) : ''} (Brasília)</p></div><span className="self-start rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold">{VISIT_STATUS[item.status] || 'Registro anterior'}</span></div>
      <p className="text-xs text-slate-500">Horário: profissional {item.broker_confirmed_at?'confirmou':'aguardando'} · interessado {item.buyer_confirmed_at?'confirmou':'aguardando'}. Presença do interessado: {item.buyer_presence_at?'confirmada na própria conta':'ainda não confirmada'}.</p>
      {item.attendance_method==='manual_confirmed'&&<p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Chegada registrada por declaração do profissional.</p>}
      {item.manual_confirmation_reason&&<p className="text-sm text-amber-700 dark:text-amber-400">Observação de chegada: {item.manual_confirmation_reason}</p>}
      {item.dispute_count>0&&<p className="text-sm text-rose-600">Há {item.dispute_count} contestação(ões). Consulte o histórico.</p>}
      <div className="flex flex-wrap gap-2">
        {!item.is_administrator&&['requested','confirmed'].includes(item.status)&&<>
          {!(item.is_professional?item.broker_confirmed_at:item.buyer_confirmed_at)&&<Button size="sm" onClick={()=>open({action:'confirm',visit:item})}>Confirmar horário</Button>}
          <Button size="sm" variant="outline" onClick={()=>open({action:'reschedule',visit:item})}>Remarcar</Button>
          <Button size="sm" variant="ghost" onClick={()=>open({action:'cancel',visit:item})}>Cancelar</Button>
          {item.status==='confirmed'&&!item.buyer_presence_at&&<>
            <Button size="sm" variant="outline" disabled={!emailReady} onClick={()=>open({action:'send',visit:item})}>Enviar código de presença</Button>
            {!item.is_professional&&<Button size="sm" onClick={()=>open({action:'verify',visit:item})}>Confirmar minha presença</Button>}
          </>}
          {item.is_professional&&<>
            {item.buyer_presence_at&&<Button size="sm" onClick={()=>open({action:'check_in',visit:item})}>Registrar chegada</Button>}
            <Button size="sm" variant="outline" onClick={()=>open({action:'manual_check_in',visit:item})}>Registro manual</Button>
            {item.status==='confirmed'&&item.scheduled_end&&Date.now()>Date.parse(item.scheduled_end)&&<Button size="sm" variant="ghost" onClick={()=>open({action:'no_show',visit:item})}>Informar ausência</Button>}
          </>}
        </>}
        {item.is_professional&&item.status==='checked_in'&&<Button size="sm" onClick={()=>open({action:'complete',visit:item})}>Concluir visita</Button>}
        <Button size="sm" variant="outline" onClick={()=>open({action:'history',visit:item})}>Histórico e comprovante</Button>
        {!item.is_administrator&&<Button size="sm" variant="ghost" onClick={()=>open({action:'dispute',visit:item})}>Contestar</Button>}
        <Button size="sm" variant="ghost" onClick={()=>{ const url=new URL(item.source_origin||window.location.origin); url.search=''; url.searchParams.set('visit',item.id); void navigator.clipboard.writeText(url.toString()).then(()=>addToast({type:'success',title:'Link copiado',message:'O link exige acesso à conta de um participante.'})).catch(()=>addToast({type:'error',title:'Não foi possível copiar o link'})); }}>Copiar link</Button>
      </div>
      {!emailReady&&item.status==='confirmed'&&!item.buyer_presence_at&&<p className="text-xs text-slate-500">O canal de confirmação por e-mail está indisponível. Nenhum envio foi realizado. O registro manual permanece identificado como declaração.</p>}
    </article>)}
    <Modal isOpen={!!dialog} onClose={()=>{if(!lock.current)setDialog(null);}} title={dialog?actionTitles[dialog.action]:''} size="lg" closeOnBackdropClick={!busy}>
      {dialog&&<form onSubmit={submit} className="space-y-4">
        {v&&<p className="text-sm text-slate-500">{v.property_title} · {formatVisitDate(v.scheduled_at)} (Brasília)</p>}
        {dialog.action==='create'&&<>
          <Select label="Imóvel" value={propertyId} onChange={e=>setPropertyId(e.target.value)} required><option value="">Selecione</option>{properties.filter(p=>p.status==='active'&&(p.userId===currentUser.id||p.partnership)).map(p=><option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}</Select>
          <Select label="Atendimento vinculado ao imóvel" value={selectedLead} onChange={e=>setSelectedLead(e.target.value)} required><option value="">Selecione</option>{leads.filter(l=>!leadId||l.id===leadId).map(l=><option key={l.id} value={l.id}>{l.buyerName}</option>)}</Select>
          <p className="text-xs text-slate-500">A proposta aguarda o aceite do interessado. Para contatos sem conta, a presença poderá ser registrada apenas como declaração manual.</p>
        </>}
        {['create','reschedule'].includes(dialog.action)&&<div className="grid grid-cols-2 gap-3"><Input label="Data (Brasília)" type="date" value={date} onChange={e=>setDate(e.target.value)} required/><Input label="Horário (Brasília)" type="time" value={time} onChange={e=>setTime(e.target.value)} required/><Input label="Duração em minutos" type="number" min={15} max={240} value={duration} onChange={e=>setDuration(Number(e.target.value))} required/></div>}
        {dialog.action==='confirm'&&<p className="text-sm">Confirme que está de acordo com este horário. A presença será registrada no dia da visita.</p>}
        {dialog.action==='send'&&<p className="text-sm">O código será enviado exclusivamente ao e-mail verificado do interessado. Ele deverá informar o código na própria conta, nesta visita.</p>}
        {dialog.action==='verify'&&<><p className="text-sm">Use o código recebido no seu e-mail somente quando estiver no local da visita.</p><Input label="Código de seis dígitos" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required/><p className="text-xs text-slate-500">{v?.declaration_text}</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Declaro que estou presente para esta visita e li a declaração.</label></>}
        {['check_in','manual_check_in'].includes(dialog.action)&&<>
          <p className="text-sm">{dialog.action==='manual_check_in'?'Este ato será identificado como declaração do profissional. Ele não substitui a confirmação independente do interessado.':'A presença do interessado já foi confirmada na própria conta.'}</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={useGps} onChange={e=>setUseGps(e.target.checked)}/>Incluir minha localização pontual ao salvar</label>
          <p className="text-xs text-slate-500">A localização e sua precisão integram o histórico restrito aos participantes. Não há rastreamento contínuo. Se o GPS falhar, desmarque a opção e informe o motivo.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Compreendi e autorizo este registro.</label>
        </>}
        {requiresReason&&<Textarea label={dialog.action==='dispute'?'Relato':'Motivo'} value={reason} onChange={e=>setReason(e.target.value)} minLength={['dispute','resolve'].includes(dialog.action)?20:10} maxLength={dialog.action==='dispute'?4000:dialog.action==='resolve'?2000:1000} required showCount/>}
        {dialog.action==='complete'&&<><p className="text-sm">A conclusão preserva o histórico e gera um comprovante. Não é necessário capturar uma nova localização.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={useGps} onChange={e=>setUseGps(e.target.checked)}/>Incluir minha localização pontual de saída (opcional)</label></>}
        {dialog.action==='history'&&<>
          {!history&&!formError&&<p role="status">Carregando histórico...</p>}
          {history?.events.map(event=><div key={event.id} className="border-b border-slate-200 dark:border-slate-800 pb-3 text-sm"><p className="font-bold">{eventLabels[event.event]||'Registro de visita'}</p><p className="text-xs text-slate-500">{formatVisitDate(event.created_at)} · {event.actor_snapshot.name||'Participante'}</p>{typeof event.evidence.reason==='string'&&<p>{event.evidence.reason}</p>}{typeof event.evidence.start==='string'&&<p>Novo horário: {formatVisitDate(event.evidence.start)}</p>}{typeof event.evidence.distance_m==='number'&&<p>Distância estimada ao ponto do imóvel: {Math.round(event.evidence.distance_m)} m. Precisão informada: {String(event.evidence.accuracy)} m.</p>}</div>)}
          {v?.receipt_snapshot&&<><p className="text-xs text-slate-500">Comprovante preservado na conclusão. O identificador de integridade não comprova, por si só, presença ou direito à comissão.</p><Button type="button" variant="outline" onClick={()=>{ const blob=new Blob([JSON.stringify({comprovante:v.receipt_snapshot,integridade:v.receipt_hash},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`visita-${v.id}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }}>Baixar comprovante</Button></>}
          {history?.disputes.map(d=><div key={d.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2"><p className="font-bold text-sm">Contestação · {formatVisitDate(d.opened_at)}</p><p className="whitespace-pre-wrap text-sm">{d.statement}</p>{d.resolution_reason&&<p className="text-sm">Resposta administrativa: {d.resolution_reason}</p>}{d.responses.map(r=><p key={r.id} className="whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-sm">Resposta: {r.statement}</p>)}{['open','responded'].includes(d.status)&&<Button type="button" size="sm" variant="outline" onClick={()=>open({action:v?.is_administrator?'resolve':'dispute',visit:v,disputeId:d.id})}>{v?.is_administrator?'Encerrar com justificativa':'Acrescentar resposta'}</Button>}</div>)}
        </>}
        {formError&&<p role="alert" className="text-sm text-rose-600">{formError}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setDialog(null)}>Fechar</Button>{dialog.action!=='history'&&<Button type="submit" isLoading={busy}>{dialog.action==='send'?'Enviar código':'Salvar'}</Button>}</div>
      </form>}
    </Modal>
  </section>;
}
