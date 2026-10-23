import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {screenOffers} from '../src/lib/valuation/geckoMapping.mjs';
import {reviewNumber, validateReview, reviewSaveError, savedReviewFeedback,
  visibleTriageEntries} from '../src/lib/valuation/reviewFeedback.mjs';

const step=readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
const subject={id:'assessment',property_type:'chacara',city:'Salto de Pirapora',state:'SP',
  land_area:700,bedrooms:3,property_snapshot:{purpose:'sale'}};
const offer=(id,extra={})=>({id,source_name:'olx.com.br',listing_title:'Chácara',
  listing_url:'https://sp.olx.com.br/terrenos/'+id,property_type:'farm',
  listing_city:subject.city,listing_state:'SP',offer_purpose:'sale',asking_price:350000,
  total_area:700,usable_area:null,built_area:null,bedrooms:null,bathrooms:null,
  reviewed_by_broker:true,excluded_by_broker:false,manual_selection:null,notes:'',...extra});
const draft=row=>Object.fromEntries(['listing_url','offer_purpose','asking_price','usable_area',
  'total_area','built_area','bedrooms','bathrooms','listing_city','listing_state','property_type','notes']
  .map(key=>[key,String(row[key]??'')]));

// Exercita os handlers reais sem carregar React, sessão ou serviços externos.
function handler(name,next,deps){
  const source=step.slice(step.indexOf('  const '+name+'='),step.indexOf('  const '+next+'='))
    .replace('const '+name+'=','const handler=');
  assert.ok(source.includes('const handler='));
  const {code}=transformSync(source,{loader:'ts',target:'es2022'});
  return new Function(...Object.keys(deps),code+';return handler;')(...Object.values(deps));
}
function harness(rows){
  const state={rows:rows.map(row=>({id:row.id,normalized_data:{...row},listing_url:row.listing_url,
    reviewed_by_broker:row.reviewed_by_broker,manual_selection:row.manual_selection,
    excluded_by_broker:false,exclusion_reason:'',review_note:'Histórico preservado',captured_data:{title:'Original'}})),
    busy:false,editId:null,selectionId:null,reviewDraft:{},errors:{},feedback:null,toasts:[],writes:[],failure:null};
  const offers=()=>state.rows.map(c=>({...c.normalized_data,id:c.id,manual_selection:c.manual_selection,
    reviewed_by_broker:c.reviewed_by_broker,excluded_by_broker:c.excluded_by_broker}));
  const deps=()=>({selected:subject,busy:state.busy,candidates:state.rows,allOffers:offers(),
    reviewDraft:state.reviewDraft,selectionReason:'Área comparável',emptyReview:{},
    numericField:reviewNumber,validateReview,reviewSaveError,screenOffers,
    setReviewErrors:value=>{state.errors=value;},setBusy:value=>{state.busy=value;},setError:()=>{},
    setEditId:value=>{state.editId=value;},setReviewDraft:value=>{state.reviewDraft=value;},
    setSelectionId:value=>{state.selectionId=value;},setSelectionReason:()=>{},openReview:()=>{},
    setCandidates:update=>{state.rows=update(state.rows);},
    updateValuationCandidate:async(assessment,id,changes)=>{
      if(state.failure)throw state.failure;
      state.writes.push({assessment,id,changes});
      return {...state.rows.find(c=>c.id===id),...changes};
    },updateValuationComparable:()=>{throw new Error('Não deve alterar comparáveis manuais neste teste');},
    setComparables:()=>{},
    reportCardError:(id,message)=>{state.feedback={id,type:'error',message};},
    reportSavedDecision:(row,action)=>{
      const decision=screenOffers(subject,offers().map(c=>c.id===row.id?row:c)).entries.find(c=>c.item.id===row.id);
      state.feedback={id:row.id,...savedReviewFeedback(decision,action)};
      state.toasts.push(state.feedback);
    }});
  return {state,offers,save:async row=>{
    state.editId=row.id;state.reviewDraft=draft(row);
    await handler('saveReview','saveManual',deps())(row);
  },reuse:async(row,include)=>handler('changeManualSelection','openReview',deps())(row,include)};
}

test('validação identifica campo e aceita áreas decimais, cômodos e observações vazios',()=>{
  const valid=draft(offer('a',{total_area:700.5}));
  assert.deepEqual(validateReview(valid),{});
  assert.equal(reviewNumber(''),null);
  for(const value of ['-1','0','Infinity','abc'])
    assert.ok(validateReview({...valid,asking_price:value}).asking_price);
  assert.ok(validateReview({...valid,bedrooms:'2.5'}).bedrooms);
  assert.ok(validateReview({...valid,total_area:'-2'}).total_area);
  for(const url of ['http://example.com','sem-link','https://user:pass@example.com'])
    assert.ok(validateReview({...valid,listing_url:url}).listing_url);
  assert.deepEqual(validateReview({...valid,listing_url:'',asking_price:''}),{});
  assert.ok(validateReview({...valid,listing_url:'',asking_price:''},true).listing_url);
  assert.ok(validateReview({...valid,listing_url:'',asking_price:''},true).asking_price);
});

test('dois anúncios consecutivos gravam, preservam original/histórico e informam suas classificações',async()=>{
  const a=offer('a');const b=offer('b',{total_area:1200,offer_purpose:'unknown'});
  const h=harness([a,b]);
  await h.save(a);
  assert.equal(h.state.feedback.type,'success');
  assert.match(h.state.feedback.message,/Classificação: Aproveitados/);
  await h.save(b);
  assert.equal(h.state.writes.length,2);
  assert.equal(h.state.busy,false);
  assert.equal(h.state.editId,null);
  assert.match(h.state.feedback.message,/Conferência gravada.*Classificação: Excluídos/);
  assert.equal(h.state.rows[1].normalized_data.total_area,1200);
  assert.equal(h.state.rows[1].normalized_data.bedrooms,null);
  assert.equal(h.state.rows[1].review_note,'Histórico preservado');
  assert.deepEqual(h.state.rows[1].captured_data,{title:'Original'});
  assert.deepEqual(screenOffers(subject,h.offers()).counts,{included:1,pending:0,excluded:1});
});

test('inválido não grava, mantém formulário e produz erro local em vez de sucesso',async()=>{
  const row=offer('a');const h=harness([row]);
  await h.save({...row,asking_price:-1});
  assert.equal(h.state.writes.length,0);
  assert.equal(h.state.editId,'a');
  assert.equal(h.state.reviewDraft.asking_price,'-1');
  assert.ok(h.state.errors.asking_price);
  assert.equal(h.state.feedback.type,'error');
  assert.equal(h.state.toasts.length,0);
});

test('falha PostgREST não fecha formulário nem altera estado nem anuncia sucesso',async()=>{
  const row=offer('a');const h=harness([row]);h.state.failure={code:'42501',message:'SQL privado'};
  await h.save(row);
  assert.equal(h.state.busy,false);
  assert.equal(h.state.editId,'a');
  assert.equal(h.state.rows[0].review_note,'Histórico preservado');
  assert.equal(h.state.toasts.length,0);
  assert.match(h.state.feedback.message,/permissão/);
  assert.doesNotMatch(h.state.feedback.message,/SQL/);
});

test('reaproveitar sem finalidade grava decisão mas avisa que permanece fora do cálculo',async()=>{
  const row=offer('b',{total_area:1200,offer_purpose:'unknown'});const h=harness([row]);
  await h.reuse(row,true);
  assert.equal(h.state.rows[0].manual_selection,'include');
  assert.equal(h.state.feedback.type,'warning');
  assert.match(h.state.feedback.message,/Decisão manual gravada.*ainda não compõe o cálculo.*Conferência.*Finalidade/);
  assert.equal(screenOffers(subject,h.offers()).counts.included,0);
  await h.reuse(h.offers()[0],false);
  assert.equal(h.state.rows[0].manual_selection,null);
  assert.match(h.state.feedback.message,/triagem automática restaurada.*Excluídos/);
});

test('reaproveitamento confirmado entra no cálculo sem exigir dormitórios iguais',async()=>{
  const row=offer('a',{total_area:1200,bedrooms:1});const h=harness([row]);
  await h.reuse(row,true);
  assert.equal(h.state.feedback.type,'success');
  assert.match(h.state.feedback.message,/reaproveitado.*Aproveitados/);
  assert.equal(screenOffers(subject,h.offers()).counts.included,1);
});

test('retorno real recalcula com a linha devolvida pelo banco, não com aprovação presumida',()=>{
  const before=offer('a',{total_area:1200});
  let feedback;const toasts=[];
  const report=handler('reportSavedDecision','renderCardFeedback',{
    selected:subject,allOffers:[before],screenOffers,savedReviewFeedback,
    setCardFeedback:value=>{feedback=value;},addToast:value=>toasts.push(value)
  });
  report({...before,manual_selection:'include',offer_purpose:'unknown'},'reuse');
  assert.equal(feedback.type,'warning');
  assert.match(feedback.message,/Classificação: Conferência/);
  report({...before,manual_selection:'include'},'reuse');
  assert.equal(feedback.type,'success');
  assert.match(feedback.message,/Classificação: Aproveitados/);
  assert.equal(toasts.length,2);
});

test('mudança de grupo ou paginação mantém somente o cartão alterado sem adulterar contagens',()=>{
  const entries=Array.from({length:25},(_,i)=>({item:{id:String(i)},status:i===24?'excluded':'pending'}));
  const original=JSON.stringify(entries);
  const shown=visibleTriageEntries(entries,'pending',20,'24');
  assert.equal(shown.length,21);assert.equal(shown[0].item.id,'24');
  assert.equal(visibleTriageEntries(entries,'all',20,'24')[0].item.id,'24');
  assert.equal(visibleTriageEntries(entries,'pending',20,null).length,20);
  assert.equal(visibleTriageEntries(entries,'pending',20,'0').length,20);
  assert.equal(visibleTriageEntries(entries,'included',20,'24').length,1);
  assert.equal(JSON.stringify(entries),original);
});

test('erros de infraestrutura são traduzidos sem mostrar mensagens internas',()=>{
  for(const code of ['PGRST301','PGRST302','PGRST303','42501','PGRST116','23514','22001','22P02','unknown']) {
    assert.doesNotMatch(reviewSaveError({code,message:'secret postgres detail'}),/secret|postgres/);
  }
  assert.match(reviewSaveError({code:'PGRST301'}),/sessão expirou/);
  assert.match(reviewSaveError({code:'PGRST116'}),/não está mais disponível/);
});

test('retorno local fica junto de Salvar e campos inválidos têm descrição acessível',()=>{
  assert.match(step,/renderCardFeedback\(c.id\)\}\s*<div className="flex flex-wrap gap-2">\s*<Button size="sm"/);
  assert.match(step,/aria-invalid=\{Boolean\(reviewErrors\[key\]\)\}/);
  assert.match(step,/feedback\?\.scrollIntoView\(\{block:'nearest'\}\)/);
  assert.match(step,/mantido visível até você trocar de filtro/);
});
