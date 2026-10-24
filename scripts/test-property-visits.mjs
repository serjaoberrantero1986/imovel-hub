import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { visitInterval, visitLocalDate } from '../src/lib/visitSchedule.mjs';

test('horário civil independe do fuso do dispositivo e rejeita datas impossíveis', () => {
  assert.equal(visitInterval('2030-01-02','00:15',60,0).start,'2030-01-02T03:15:00.000Z');
  assert.equal(visitLocalDate('2030-01-02T02:30:00Z'),'2030-01-01');
  assert.throws(()=>visitInterval('2030-02-30','10:00',60,0));
  assert.throws(()=>visitInterval('2030-01-02','25:00',60,0));
  assert.throws(()=>visitInterval('2030-01-02','10:00',14,0));
  assert.throws(()=>visitInterval('2000-01-02','10:00'));
});

test('agenda, permissões e presença executam as migrations em PostgreSQL isolado', async t => {
  const root=process.env.VISITS_PGLITE_ROOT;
  if(!root) return t.skip('Defina VISITS_PGLITE_ROOT após instalar @electric-sql/pglite@0.5.11 no diretório temporário.');
  const { PGlite }=await import(pathToFileURL(`${root}/dist/index.js`).href);
  const { pgcrypto }=await import(root?pathToFileURL(`${root}/dist/contrib/pgcrypto.js`).href:'@electric-sql/pglite/contrib/pgcrypto');
  const db=new PGlite({extensions:{pgcrypto}});
  try {
    const read=path=>readFile(new URL(path,import.meta.url),'utf8');
    await db.exec(await read('./fixtures/visits-schema.sql'));
    for(const file of ['20261012000008_partnership_visits','20261012000009_partnership_visit_disputes','20261012000011_partnership_visit_otp_delivery','20261023180856_unified_property_visits','20261024140009_refine_visit_windows_and_reasons']) {
      await db.exec(await read(`../supabase/migrations/${file}.sql`));
    }
    const ids=Object.fromEntries(['broker','buyer','other','property','property2','lead'].map(key=>[key,crypto.randomUUID()]));
    // Fixtures exclusivamente em memória; nenhum dado de teste é enviado ao portal.
    await db.query(`insert into public.profiles(id,name,email,phone) values ($1,'Profissional teste','broker@example.test','11999999999'),($2,'Interessado teste','buyer@example.test','11988888888'),($3,'Outra pessoa','other@example.test','11977777777')`,[ids.broker,ids.buyer,ids.other]);
    await db.query(`insert into auth.users values ($1,'buyer@example.test',now())`,[ids.buyer]);
    await db.query(`insert into public.properties(id,user_id,title,status) values ($1,$2,'Imóvel de teste isolado','active'),($3,$2,'Segundo imóvel','active')`,[ids.property,ids.broker,ids.property2]);
    await db.query(`insert into public.property_locations(property_id,coordinate_quality,latitude,longitude) values($1,'property',-23.5,-47.5)`,[ids.property]);
    const identity=async(id,aal='aal1')=>{await db.query(`select set_config('request.jwt.claims',$1,false)`,[JSON.stringify({sub:id,aal})]);};
    const call=async(sql,params=[])=> (await db.query(sql,params)).rows[0];
    const schedule=async(property,start,key=crypto.randomUUID())=> (await call(`select public.schedule_property_visit($1,now()+$2::interval,now()+$2::interval+interval '1 hour',$3) id`,[property,start,key])).id;
    const update=async(id,revision,action,reason=null)=>call(`select public.update_property_visit($1,$2,$3,p_reason=>$4) ok`,[id,revision,action,reason]);
    await identity(ids.buyer);
    let visit;
    await t.test('solicitação gera data estruturada, comprador correto e um contato por imóvel',async()=>{
      const key=crypto.randomUUID(); visit=await schedule(ids.property,'1 hour',key);
      assert.equal(await schedule(ids.property,'1 hour',key),visit);
      const row=await call(`select * from public.partnership_visits where id=$1`,[visit]);
      assert.equal(row.attendee_profile_id,ids.buyer); assert.equal(row.responsible_id,ids.broker);
      assert.equal(row.status,'requested'); assert.equal(row.broker_confirmed_at,null); assert.ok(row.buyer_confirmed_at);
      assert.equal((await call(`select count(*)::int n from public.lead_contact_events`)).n,1);
      assert.equal((await call(`select count(*)::int n from public.notifications`)).n,1);
    });
    await t.test('outro usuário não vê nem altera a visita',async()=>{
      await identity(ids.other);
      assert.deepEqual((await call(`select public.get_my_property_visits() visits`)).visits,[]);
      await assert.rejects(update(visit,1,'cancel','Motivo suficientemente longo'),/VISIT_ACCESS/);
      await assert.rejects(call(`select public.get_property_visit_history($1)`,[visit]),/VISIT_ACCESS/);
    });
    await t.test('MFA profissional, confirmação e revisão concorrente',async()=>{
      await identity(ids.broker);
      await assert.rejects(update(visit,1,'confirm'),/AAL2/);
      await identity(ids.broker,'aal2'); await update(visit,1,'confirm');
      assert.equal((await call(`select status from public.partnership_visits where id=$1`,[visit])).status,'confirmed');
      await assert.rejects(update(visit,1,'confirm'),/VISIT_STALE/);
      const windows=(await call(`select public.get_my_property_visits() visits`)).visits.find(v=>v.id===visit);
      assert.equal(windows.can_send_code,true); assert.equal(windows.can_check_in,true); assert.equal(windows.can_mark_no_show,false);
    });
    await t.test('conflito e vínculo do mesmo lead com dois imóveis',async()=>{
      await identity(ids.buyer);
      await assert.rejects(schedule(ids.property2,'1 hour'),/VISIT_CONFLICT/);
      const second=await schedule(ids.property2,'3 hours');
      const linked=await call(`select count(distinct lead_id)::int n from public.partnership_visits`);
      assert.equal(linked.n,1);
      await identity(ids.broker,'aal2');
      await update(second,1,'confirm');
      assert.equal((await call(`select count(*)::int n from public.partnership_visits`)).n,2);
    });
    await t.test('janelas vêm do servidor e bloqueiam chegada antecipada',async()=>{
      await identity(ids.buyer);
      const id=await schedule(ids.property,'8 hours');
      await identity(ids.broker,'aal2'); await update(id,1,'confirm');
      const before=(await call(`select public.get_my_property_visits() visits`)).visits.find(v=>v.id===id);
      assert.equal(before.can_send_code,false); assert.equal(before.can_check_in,false); assert.equal(before.can_mark_no_show,false);
      await assert.rejects(update(id,2,'manual_check_in','Fim'),/VISIT_STATE/);
      await db.query(`update public.partnership_visits set scheduled_at=now()+interval '1 hour',scheduled_end=now()+interval '2 hours' where id=$1`,[id]);
      const inside=(await call(`select public.get_my_property_visits() visits`)).visits.find(v=>v.id===id);
      assert.equal(inside.can_send_code,true); assert.equal(inside.can_check_in,true);
      await update(id,2,'manual_check_in','Fim'); await update(id,3,'complete');
    });
    await t.test('corretor não obtém código nem fabrica confirmação do interessado',async()=>{
      await db.exec('set role authenticated');
      await assert.rejects(call(`select public.issue_partnership_visit_otp($1)`,[visit]),/permission denied/);
      await assert.rejects(call(`select public.prepare_property_visit_code($1,$2,'aal2',repeat('a',64))`,[visit,ids.broker]),/permission denied/);
      await db.exec('reset role');
      await assert.rejects(call(`select public.verify_property_visit_presence($1,'123456')`,[visit]),/VISIT_ACCESS/);
      await assert.rejects(update(visit,2,'check_in','Sem sinal disponível neste momento'),/VISIT_BUYER_PRESENCE/);
    });
    await t.test('cinco erros são persistidos, reenvio limitado, código de uso único',async()=>{
      const hash=(await call(`select encode(extensions.digest('123456','sha256'),'hex') hash`)).hash;
      const recipient=await call(`select public.prepare_property_visit_code($1,$2,'aal2',$3) target`,[visit,ids.broker,hash]);
      assert.equal(recipient.target.attendee_id,ids.buyer);
      await call(`select public.finish_property_visit_code_delivery($1,$2,true)`,[visit,hash]);
      await assert.rejects(call(`select public.prepare_property_visit_code($1,$2,'aal2',$3)`,[visit,ids.broker,hash]),/VISIT_RATE/);
      await identity(ids.buyer);
      for(let i=0;i<5;i++) assert.equal((await call(`select public.verify_property_visit_presence($1,'000000') result`,[visit])).result.ok,false);
      assert.equal((await call(`select otp_attempts from public.partnership_visits where id=$1`,[visit])).otp_attempts,5);
      assert.equal((await call(`select public.verify_property_visit_presence($1,'123456') result`,[visit])).result.ok,false);
      // Controla o relógio do desafio apenas no banco isolado, sem esperar um minuto.
      await db.query(`update public.partnership_visits set otp_issued_at=now()-interval '61 seconds' where id=$1`,[visit]);
      await call(`select public.prepare_property_visit_code($1,$2,'aal1',$3)`,[visit,ids.buyer,hash]);
      await call(`select public.finish_property_visit_code_delivery($1,$2,true)`,[visit,hash]);
      assert.equal((await call(`select public.verify_property_visit_presence($1,'123456') result`,[visit])).result.ok,true);
      await assert.rejects(call(`select public.verify_property_visit_presence($1,'123456')`,[visit]),/VISIT_STATE/);
    });
    await t.test('chegada exige justificativa sem GPS, conclusão gera comprovante imutável',async()=>{
      await identity(ids.broker,'aal2');
      await assert.rejects(update(visit,3,'check_in'),/VISIT_REASON/);
      await update(visit,3,'check_in','GPS indisponível no local da visita');
      await update(visit,4,'complete');
      const row=await call(`select * from public.partnership_visits where id=$1`,[visit]);
      assert.equal(row.status,'completed'); assert.ok(row.receipt_hash); assert.ok(row.receipt_snapshot); assert.equal(row.check_out_lat,null);
      await assert.rejects(update(visit,4,'complete'),/VISIT_STALE/);
      await assert.rejects(db.query(`delete from public.partnership_visit_events where visit_id=$1`,[visit]),/immutable/);
    });
    await t.test('contestação do comprador e resposta não apagam conclusão nem comprovante',async()=>{
      await identity(ids.buyer);
      const receipt=(await call(`select receipt_hash from public.partnership_visits where id=$1`,[visit])).receipt_hash;
      const d=(await call(`select public.dispute_property_visit($1,'Gostaria de esclarecer a localização informada.') id`,[visit])).id;
      await identity(ids.broker,'aal2');
      await call(`select public.dispute_property_visit($1,'A localização estava indisponível e foi declarada no registro.',$2)`,[visit,d]);
      const row=await call(`select status,receipt_hash from public.partnership_visits where id=$1`,[visit]);
      assert.equal(row.status,'completed'); assert.equal(row.receipt_hash,receipt);
      assert.equal((await call(`select public.get_property_visit_history($1) h`,[visit])).h.disputes[0].responses.length,1);
    });
    await t.test('remarcação invalida presença e exige novos aceites; cancelamento conserva histórico',async()=>{
      await identity(ids.buyer);
      const id=await schedule(ids.property,'1 hour');
      await identity(ids.broker,'aal2'); await update(id,1,'confirm');
      const hash=(await call(`select encode(extensions.digest('111111','sha256'),'hex') hash`)).hash;
      await call(`select public.prepare_property_visit_code($1,$2,'aal2',$3)`,[id,ids.broker,hash]);
      await call(`select public.finish_property_visit_code_delivery($1,$2,true)`,[id,hash]);
      await call(`select public.update_property_visit($1,2,'reschedule',now()+interval '5 hours',now()+interval '6 hours','Mudança de disponibilidade do profissional')`,[id]);
      const row=await call(`select * from public.partnership_visits where id=$1`,[id]);
      assert.equal(row.status,'requested'); assert.equal(row.otp_hash,null); assert.equal(row.buyer_confirmed_at,null);
      await identity(ids.buyer); await update(id,3,'confirm');
      await update(id,4,'cancel','Fim');
      assert.equal((await call(`select status from public.partnership_visits where id=$1`,[id])).status,'cancelled');
      assert.equal((await call(`select count(*)::int n from public.partnership_visit_events where visit_id=$1`,[id])).n,6);
    });
    await t.test('GPS inválido é recusado, distância calculada e declaração manual é distinta',async()=>{
      await identity(ids.buyer); const id=await schedule(ids.property,'1 hour');
      await identity(ids.broker,'aal2');
      await assert.rejects(call(`select public.update_property_visit($1,1,'manual_check_in',p_reason=>'Interessado sem confirmação digital',p_lat=>91,p_lng=>0,p_accuracy=>10)`,[id]),/VISIT_LOCATION/);
      await call(`select public.update_property_visit($1,1,'manual_check_in',p_reason=>'Interessado sem confirmação digital',p_lat=>-23.5,p_lng=>-47.5,p_accuracy=>12)`,[id]);
      const event=await call(`select evidence,event from public.partnership_visit_events where visit_id=$1 and event='manual_confirmed'`,[id]);
      assert.equal(event.evidence.distance_m,0); assert.equal(event.evidence.method,'declaratory'); assert.equal(event.evidence.buyer_presence_at,null);
      await update(id,2,'complete');
    });
    await t.test('falha de entrega e código expirado não confirmam presença',async()=>{
      await identity(ids.buyer); const id=await schedule(ids.property,'1 hour');
      await identity(ids.broker,'aal2'); await update(id,1,'confirm');
      const hash=(await call(`select encode(extensions.digest('222222','sha256'),'hex') hash`)).hash;
      await call(`select public.prepare_property_visit_code($1,$2,'aal2',$3)`,[id,ids.broker,hash]);
      await call(`select public.finish_property_visit_code_delivery($1,$2,false)`,[id,hash]);
      await identity(ids.buyer);
      assert.equal((await call(`select public.verify_property_visit_presence($1,'222222') result`,[id])).result.ok,false);
      await db.query(`update public.partnership_visits set otp_hash=$2,otp_expires_at=now()-interval '1 second',otp_delivery='sent' where id=$1`,[id,hash]);
      assert.equal((await call(`select public.verify_property_visit_presence($1,'222222') result`,[id])).result.ok,false);
      await update(id,2,'cancel','Teste de cancelamento após falha de entrega');
    });
    await t.test('contato sem conta admite declaração, nunca identidade fabricada',async()=>{
      const lead=crypto.randomUUID();
      await db.query(`insert into public.leads(id,advertiser_id,property_id,name) values($1,$2,$3,'Contato sem conta')`,[lead,ids.broker,ids.property]);
      await identity(ids.broker,'aal2');
      const id=(await call(`select public.schedule_property_visit($1,now()+interval '1 hour',now()+interval '2 hours',$2,$3) id`,[ids.property,crypto.randomUUID(),lead])).id;
      assert.equal((await call(`select attendee_profile_id from public.partnership_visits where id=$1`,[id])).attendee_profile_id,null);
      await update(id,1,'manual_check_in','Fim');
      await update(id,2,'complete');
    });
    await t.test('anon não acessa dados e administração não muda atos dos participantes',async()=>{
      await db.exec('set role anon');
      await assert.rejects(call('select public.get_my_property_visits()'),/permission denied/);
      await assert.rejects(call('select * from public.partnership_visits'),/permission denied/);
      await db.exec('reset role');
      await db.query(`update public.profiles set role='admin' where id=$1`,[ids.other]);
      await identity(ids.other,'aal2');
      assert.equal((await call('select public.get_my_property_visits() visits')).visits.length,1);
      await assert.rejects(update(visit,5,'cancel','Administrador não confirma visita alheia'),/VISIT_ACCESS/);
      const dispute=(await call(`select id from public.partnership_visit_disputes where visit_id=$1`,[visit])).id;
      await call(`select public.resolve_property_visit_dispute($1,'Registro administrativo: esclarecimentos adicionados, sem alterar a evidência original.')`,[dispute]);
      assert.equal((await call(`select status from public.partnership_visit_disputes where id=$1`,[dispute])).status,'resolved');
      assert.equal((await call(`select status from public.partnership_visits where id=$1`,[visit])).status,'completed');
    });
  } finally { await db.close(); }
});
