import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform, build } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const migration = readFileSync(new URL('../supabase/migrations/20261104163159_commercial_access_and_account_isolation.sql', import.meta.url),'utf8');
const edge = readFileSync(new URL('../supabase/functions/asaas-create-checkout/index.ts',import.meta.url),'utf8');

test('real checkout handler respects provider limits and only returns a URL after acceptance', async () => {
  const code = (await transform(edge.replace(/^import .*\n/m,''),{loader:'ts',target:'es2022'})).code;
  let handler, payload, calls=0, remoteStatus=200;
  const client = {auth:{getUser:async()=>({data:{user:{id:'new-professional'}}})},from(table){
    const q = new Proxy({}, {get(_target, method){
      if(method==='single')return async()=>({data:table==='profiles'?{id:'new-professional',name:'Nome',role:'broker',is_active:true}:{tier:'advanced',name:'Imobiliária com um nome muito longo',description:'Plano imobiliário completo',monthly_price_cents:24900,active:true}});
      if(method==='maybeSingle')return async()=>({data:null});
      if(method==='then')return resolve=>resolve({error:null});
      return ()=>q;
    }});return q;
  }};
  vm.runInNewContext(code,{Deno:{env:{get:()=> 'configured'},serve:fn=>{handler=fn;}},createClient:()=>client,crypto:globalThis.crypto,Response,Date,JSON,Array,fetch:async(_url,init)=>{
    calls++;payload=JSON.parse(init.body);return new Response(JSON.stringify(remoteStatus===200?{id:'checkout-id'}:{errors:[{description:'provider refused'}]}),{status:remoteStatus});
  }});
  const request=()=>new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer valid','Origin':'https://app.webimoveis.site'},body:JSON.stringify({planTier:'advanced'})});
  const ok=await handler(request()); assert.equal(ok.status,200);assert.match((await ok.json()).checkoutUrl,/checkout-id/);
  assert.ok(Array.from(payload.items[0].name).length<=30);assert.equal(payload.items[0].value,249);assert.equal(payload.chargeTypes[0],'RECURRENT');
  remoteStatus=400; const denied=await handler(request());assert.equal(denied.status,502);assert.equal((await denied.json()).checkoutUrl,undefined);
  const unauth=await handler(new Request('https://example.com',{method:'POST'}));assert.equal(unauth.status,401);assert.equal(calls,2);
});

test('PostgreSQL gates new professionals, preserves legacy users, isolates conversations and repairs signup links',async()=>{
  const {PGlite}=await import(process.env.COMMERCIAL_PGLITE_ROOT || '@electric-sql/pglite');
  const db=new PGlite();
  const legacy='00000000-0000-4000-8000-000000000001', fresh='00000000-0000-4000-8000-000000000002', buyer='00000000-0000-4000-8000-000000000003', stranger='00000000-0000-4000-8000-000000000004';
  const tables=[...new Set([...migration.matchAll(/array\[([^\]]+)\]/gs)].flatMap(m=>[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1])))];
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function public.has_satisfied_mfa() returns boolean language sql stable as $$select true$$;
      create table public.profiles(id uuid primary key,role text,is_active boolean default true,created_at timestamptz,email text);
      create table public.commercial_subscriptions(profile_id uuid,status text,current_period_end timestamptz);
      create table public.portal_settings(id uuid,visual_draft jsonb,visual_published jsonb);
      grant usage on schema auth to authenticated;
      ${tables.map(t=>`create table public.${t}(id uuid primary key,owner_id uuid,buyer_id uuid,advertiser_id uuid,property_id uuid,conversation_id uuid,sender_id uuid,created_at timestamptz,email text,buyer_unread_count int);alter table public.${t} enable row level security;grant all on public.${t} to authenticated;`).join('\n')}
      create policy participants on public.conversations for select to authenticated using(buyer_id=auth.uid() or advertiser_id=auth.uid());
      insert into profiles values('${legacy}','broker',true,'2026-10-01','legacy@example.com'),('${fresh}','broker',true,'2026-11-03','reused@example.com'),('${buyer}','buyer',true,'2026-10-01','buyer@example.com'),('${stranger}','broker',true,'2026-11-03','other@example.com');
      insert into leads(id,buyer_id,advertiser_id,created_at,email) values('${buyer}','${fresh}','${legacy}','2026-10-24','reused@example.com');
      insert into conversations(id,buyer_id,advertiser_id,created_at) values('${buyer}','${fresh}','${legacy}','2026-11-03');
      insert into messages(id,conversation_id,sender_id,created_at) values('${buyer}','${buyer}','${fresh}','2026-11-03');`);
    await db.exec(migration);
    assert.equal((await db.query('select count(*)::int as n from messages')).rows[0].n,1);
    assert.equal((await db.query('select buyer_id from conversations')).rows[0].buyer_id,null);
    async function access(id){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return (await db.query('select has_my_commercial_access() as allowed')).rows[0].allowed;}
    assert.equal(await access(legacy),true);assert.equal(await access(fresh),false);assert.equal(await access(buyer),true);
    await access(fresh);
    await assert.rejects(db.query(`update conversations set buyer_unread_count=1`),/SUBSCRIPTION_REQUIRED/);
    await db.exec('begin');
    await db.query("select set_config('webimovel.account_deletion_profile_id',$1,true)",[fresh]);
    await db.query('update conversations set buyer_unread_count=0');
    await assert.rejects(db.query(`insert into conversations(id) values('${stranger}')`),/SUBSCRIPTION_REQUIRED/);
    await db.exec('rollback');
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.query(`insert into commercial_subscriptions values('${fresh}','pending',null)`);
    assert.equal(await access(fresh),false);
    await db.query("select set_config('request.jwt.claim.sub','',false)");await db.query(`update commercial_subscriptions set status='active',current_period_end=now()+interval '1 month'`);
    assert.equal(await access(fresh),true);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select count(*)::int as n from conversations')).rows[0].n,0);
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.query(`update commercial_subscriptions set status='canceled'`);assert.equal(await access(fresh),false);
    await db.query("select set_config('request.jwt.claim.sub','',false)");await db.query(`update commercial_subscriptions set status='active',current_period_end=now()-interval '1 day'`);assert.equal(await access(fresh),false);
    assert.equal(await access(stranger),false);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[legacy]);await db.exec('set role authenticated');
    assert.equal((await db.query('select count(*)::int as n from conversations')).rows[0].n,1);
  }finally{await db.close();}
});


test('actual application rendering blocks direct navigation and publication before payment',async()=>{
  const result=await build({stdin:{contents:"import App from './src/App.tsx'; import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; export const render=()=>renderToStaticMarkup(React.createElement(App));",resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',external:['react','react-dom/server'],define:{'import.meta.env.DEV':'false'},plugins:[{
    name:'isolated-app-context',setup(builder){
      builder.onResolve({filter:/^\.\/(context|components|views)\//},args=>{
        if(!args.importer.endsWith('/src/App.tsx'))return;
        return {path:args.path,namespace:'app-fixture'};
      });
      builder.onLoad({filter:/.*/,namespace:'app-fixture'},args=>{
        if(args.path.endsWith('/AppContext'))return {contents:"import React from 'react'; export const useApp=()=>globalThis.appState; export const AppProvider=({children})=>children;",loader:'jsx'};
        if(args.path.endsWith('/TenantContext'))return {contents:"export const useTenant=()=>({portal:{mode:'app'},loading:false}); export const TenantProvider=({children})=>children;",loader:'jsx'};
        const name=args.path.split('/').at(-1);
        return {contents:`import React from 'react';export const ${name}=({children})=>children||React.createElement('span',null,'${name}');`,loader:'jsx'};
      });
    }
  }]});
  const context={appState:null,window:{location:{hash:'',hostname:'app.webimoveis.site',search:''}},URLSearchParams,require:createRequire(import.meta.url),exports:{},module:{exports:{}}};
  vm.runInNewContext(result.outputFiles[0].text,context);
  const render=(role,commercialAccess,currentView)=>{
    context.appState={isAuthenticated:true,currentUser:{id:'account',role,commercialAccess},currentView,setCurrentView:()=>{}};
    return context.module.exports.render();
  };
  for(const view of ['portal','search','messages','crm_leads','my_properties','visits','dashboard']){
    const html=render('broker',false,view);assert.match(html,/PlanCheckoutView/);assert.doesNotMatch(html,/PropertyWizardModal/);
  }
  assert.match(render('broker',undefined,'messages'),/PlanCheckoutView/);
  assert.match(render('broker',false,'profile'),/ProfileView/);
  assert.match(render('broker',true,'messages'),/MessagesChatView/);
  assert.match(render('buyer',true,'search'),/PropertySearchView/);
  assert.match(render('admin',true,'admin_portals'),/AdminPortalsView/);
});

