import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {compareAssessmentSubject} from '../src/lib/valuation/subjectConsistency.mjs';
import {proposalForProperty} from '../api/valuation-search.js';
import {auditOlxRequestUrl} from '../lib/geckoContracts.mjs';
import {normalizeGeckoItem,screenOffers} from '../src/lib/valuation/geckoMapping.mjs';

const now={
  id:'bb1032e4-3f62-4e36-a6bc-be8625d6357f',
  type:'chacara',purpose:'sale',city:'Salto de Pirapora',state:'SP',
  neighborhood:'Jardim dos Ipês',totalArea:120,usefulArea:100,builtArea:0
};
const oldAssessment={
  source_property_id:now.id,property_type:'commercial',city:'Votorantim',state:'SP',
  neighborhood:'Green Valley',land_area:120,built_area:null,
  property_snapshot:{purpose:'sale',totalArea:120,usefulArea:100,builtArea:null}
};
const currentAssessment={
  ...oldAssessment,property_type:'chacara',city:now.city,state:'SP',
  neighborhood:now.neighborhood
};

test('Rejeita avaliação histórica de comercial/Votorantim para chácara/Salto',()=>{
 const changes=compareAssessmentSubject(oldAssessment,now);
 assert.ok(changes.some(x=>x.field==='type'&&x.before==='commercial'&&x.after==='chacara'));
 assert.ok(changes.some(x=>x.field==='city'&&x.before==='Votorantim'&&x.after==='Salto de Pirapora'));
 assert.ok(changes.some(x=>x.field==='neighborhood'));
});
test('Nova avaliação do imóvel atual não exige nova pesquisa por mudanças cosméticas',()=>{
 assert.deepEqual(compareAssessmentSubject(currentAssessment,now),[]);
 const changedArea=compareAssessmentSubject(currentAssessment,{...now,totalArea:140});
 assert.equal(changedArea.length,1);
 assert.equal(changedArea[0].field,'totalArea');
});
test('Preflight protegido verifica banco ATUAL e retorna 409 antes de chamar Gecko',()=>{
 const api=readFileSync('api/valuation-search.js','utf8');
 assert.match(api,/client\.from\('properties'\)/);
 assert.match(api,/client\.from\('property_locations'\)/);
 assert.match(api,/compareAssessmentSubject\(assessment,listing,location\)/);
 assert.match(api,/code:'ASSESSMENT_STALE'/);
 const guard=api.indexOf('const changes=compareAssessmentSubject');
 const fetch=api.indexOf("fetch('https://api.geckoapi.com.br/v1/extract'");
 assert.ok(guard>0&&fetch>guard);
});
test('Chácara venda Salto de Pirapora usa categoria OLX real e região Sorocaba',()=>{
 const payload=proposalForProperty(
   {type:'chacara',purpose:'sale'}, {city:'Salto de Pirapora',state:'SP'}, 'olx.com.br',1);
 assert.equal(payload.categoryPath,'imoveis/terrenos/sitios-e-chacaras/compra');
 assert.equal(payload.city,'Salto de Pirapora');
 assert.equal(payload.state,'SP');
 assert.equal(payload.region,'Regiao de Sorocaba');
 assert.equal(payload.keyword,'chacara');
 assert.throws(()=>proposalForProperty(
   {type:'commercial',purpose:'sale'}, {city:'Votorantim',state:'SP'},'olx.com.br',1
 ),/categoria deste tipo de imóvel/);
 assert.throws(()=>proposalForProperty(
   {type:'chacara',purpose:'rent'}, {city:'Salto de Pirapora',state:'SP'},'olx.com.br',1
 ),/categoria de locação/);
 assert.equal(proposalForProperty(
   {type:'apartment',purpose:'sale'}, {city:'Salto de Pirapora',state:'SP'},'olx.com.br',1
 ).categoryPath,'imoveis/venda/apartamentos');
 assert.equal(proposalForProperty(
   {type:'land',purpose:'sale'}, {city:'Salto de Pirapora',state:'SP'},'olx.com.br',1
 ).categoryPath,'imoveis/terrenos/lotes/compra');
});
test('Confere URL efetivamente consultada e rejeita perda de categoria ou município',()=>{
 const p=proposalForProperty({type:'chacara',purpose:'sale'},
   {city:'Salto de Pirapora',state:'SP'},'olx.com.br',1);
 const correct=auditOlxRequestUrl({
   requestUrl:'https://www.olx.com.br/imoveis/terrenos/sitios-e-chacaras/compra/estado-sp/regiao-de-sorocaba/salto-de-pirapora?q=chacara'
 },p);
 assert.equal(correct.status,'match');
 const wrong=auditOlxRequestUrl({
   requestUrl:'https://www.olx.com.br/imoveis/terrenos/estado-sp/regiao-de-sorocaba'
 },p);
 assert.equal(wrong.status,'mismatch');
 assert.ok(wrong.missingSegments.includes('sitios-e-chacaras'));
 assert.ok(wrong.missingSegments.includes('salto-de-pirapora'));
});
test('Classifica sala comercial pela categoria/título e a exclui com TODOS os motivos',()=>{
 const raw={
   id:'1506913293',
   title:'Aluga-se SALA COMERCIAL com mezanino',
   url:'https://sp.olx.com.br/sao-paulo/comercio-e-escritorio/sala-1506913293',
   category:'Salas comerciais',
   price:1500,
   location:{city:'São Paulo',state:'SP'}
 };
 const normalized=normalizeGeckoItem(raw,'olx.com.br','sale');
 assert.equal(normalized.property_type,'commercial');
 assert.equal(normalized.offer_purpose,'rent');
 const evaluated={
   property_type:'chacara',property_snapshot:{purpose:'sale',usefulArea:100},
   land_area:120,city:'Salto de Pirapora',state:'SP'
 };
 const out=screenOffers(evaluated,[normalized]);
 assert.equal(out.counts.excluded,1);
 assert.match(out.entries[0].reason,/Tipologia incompatível/);
 assert.match(out.entries[0].reason,/Finalidade incompatível/);
 assert.match(out.entries[0].reason,/Localização incompatível/);
});
test('Mantém histórico de anúncio inválido, mas bloqueia indicador se busca não validada',()=>{
 const clean={
   property_type:'farm',offer_purpose:'sale',
   asking_price:275000,total_area:120,
   listing_url:'https://sp.olx.com.br/imoveis/chacara-123',
   listing_city:'Salto de Pirapora',listing_state:'SP',
   source_name:'olx.com.br',listing_reference:'123'
 };
 const subject={
   property_type:'chacara',property_snapshot:{purpose:'sale'},
   land_area:120,city:'Salto de Pirapora',state:'SP'
 };
 const checked=screenOffers(subject,[{...clean,search_query_verified:false}]);
 assert.equal(checked.counts.excluded,1);
 assert.match(checked.entries[0].reason,/não confirmou os filtros/);
 const matched=screenOffers(subject,[{...clean,search_query_verified:true}]);
 assert.equal(matched.counts.included,1);
});
test('Wizard orienta criação de nova avaliação e preserva histórico antigo',()=>{
 const ui=readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
 assert.match(ui,/Criar avaliação atualizada/);
 assert.match(ui,/Avaliação anterior desatualizada/);
 assert.match(ui,/compareAssessmentSubject\(item,property\)/);
 assert.match(ui,/search_query_verified:searchVerified/);
 assert.match(ui,/response.status===409&&data.code==='ASSESSMENT_STALE'/);
});
