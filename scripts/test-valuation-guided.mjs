import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {normalizeGeckoItem,screenOffers} from '../src/lib/valuation/geckoMapping.mjs';
import {proposalForProperty} from '../api/valuation-search.js';

const sample=(id,price,area,extra={})=>({
  id,listing_url:'https://www.vivareal.com.br/imovel/'+id,
  source_name:'vivareal.com.br',property_type:'house',listing_title:'Casa para venda',
  listing_city:'Salto de Pirapora',listing_state:'SP',offer_purpose:'sale',
  asking_price:price,usable_area:area,total_area:null,built_area:null,
  bedrooms:3,bathrooms:2,reviewed_by_broker:false,excluded_by_broker:false,
  ...extra
});
const ref={
  property_type:'house',property_snapshot:{purpose:'sale',usefulArea:110},
  city:'Salto de Pirapora',state:'SP',land_area:210,built_area:90,bedrooms:3
};

test('Adaptador Gecko utiliza campos estruturados sem inventar áreas de terreno ou construída',()=>{
 const row=normalizeGeckoItem({
   id:'catalog-101',title:'Casa de 100 m² e piscina',
   url:'https://www.vivareal.com.br/imovel/casa-101',
   unitTypes:['HOME'],
   prices:{mainValue:290000,businessType:'SALE'},
   attributes:{usableAreas:[100],totalAreas:[190],bedrooms:[3],bathrooms:[2]},
   address:{city:'Salto de Pirapora',stateAcronym:'SP',neighborhood:'Centro'}
 },'vivareal.com.br');
 assert.equal(row.asking_price,290000);
 assert.equal(row.usable_area,100);
 assert.equal(row.total_area,190);
 assert.equal(row.built_area,null);
 assert.equal(row.land_area,null);
 assert.equal(row.offer_purpose,'sale');
 assert.equal(row.listing_state,'SP');
 assert.equal(row.property_type,'house');
});

test('Indicativo automático informa mediana e apenas duas ofertas compatíveis entram',()=>{
 const rows=[
  sample('one',240000,100),
  sample('two',330000,110),
  sample('three',230000,null),
  sample('four',400000,108,{listing_city:'Sorocaba'}),
  sample('five',310000,115,{offer_purpose:'rent'}),
  sample('six',250000,100,{excluded_by_broker:true,exclusion_reason:'Características diferentes'}),
 ];
 const result=screenOffers(ref,rows);
 assert.equal(result.counts.included,2);
 assert.equal(result.counts.pending,1);
 assert.equal(result.counts.excluded,3);
 assert.equal(result.ready,true);
 assert.equal(result.pricePerSqm,2700);
 assert.equal(result.value,297000);
 assert.ok(result.low<result.high);
 assert.ok(result.caveats.some(x=>x.includes('transações')));
});

test('Não confunde metragem de imóvel rural nem presume área quando ausente',()=>{
 const rural={...ref,property_type:'land',land_area:250,property_snapshot:{purpose:'sale',usefulArea:0}};
 const rows=[sample('land',250000,300,{property_type:'land',total_area:250})];
 const screened=screenOffers(rural,rows);
 assert.equal(screened.counts.included,1);
 assert.equal(screened.ready,false);
 const missing=screenOffers({...ref,property_snapshot:{purpose:'sale',usefulArea:0},built_area:null},
   [sample('a',300000,110),sample('b',260000,120)]);
 assert.equal(missing.ready,false);
 assert.equal(missing.counts.pending,2);
});

test('Consulta server-side escolhe fornecedor/finalidade usando dados do imóvel, sem mapa',()=>{
 const property={id:'property-1',type:'house',purpose:'sale',built_area:100,total_area:200};
 const location={city:'Salto de Pirapora',state:'SP',latitude:-23.65,longitude:-47.58};
 const zap=proposalForProperty(property,location,'zapimoveis.com.br',1);
 assert.equal(zap.type,'plp');
 assert.equal(zap.city,'Salto de Pirapora');
 assert.equal(zap.state,'SP');
 assert.deepEqual(zap.propertyTypes,['house']);
 assert.equal(zap.latitude,undefined,'Não buscar coordenadas ou raio sem necessidade');
 const olx=proposalForProperty(property,location,'olx.com.br',1);
 assert.equal(olx.categoryPath,'imoveis/venda/casas');
 assert.throws(()=>proposalForProperty({...property,purpose:'seasonal'},location,'olx.com.br'),/venda e locação/);
 assert.throws(()=>proposalForProperty(property,location,'imovelweb.com.br'),/URL/);
});

test('Cadastro da etapa 3 não copia área total/terreno para área útil',()=>{
 const wizard=readFileSync('src/components/properties/PropertyWizardModal.tsx','utf8');
 const crud=readFileSync('src/lib/supabaseCrud.ts','utf8');
 const migration=readFileSync('supabase/migrations/20261022000001_valuation_guided_areas_and_sources.sql','utf8');
 assert.match(wizard,/builtArea: builtArea > 0/);
 assert.match(wizard,/totalArea: totalArea \|\| 0/);
 assert.match(wizard,/usefulArea: usefulArea \|\| 0/);
 assert.doesNotMatch(wizard,/totalArea: totalArea \|\| usefulArea/);
 assert.doesNotMatch(wizard,/usefulArea: usefulArea \|\| totalArea/);
 assert.doesNotMatch(crud,/totalArea: Number\(dbProp.total_area \?\? 0\)/);
 assert.match(migration,/add column if not exists built_area/);
 assert.match(migration,/excluded_by_broker boolean/);
});

test('Avaliação fica dentro da etapa 8 sem mapa; pesquisa só mediante clique e confirmação',()=>{
 const step=readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
 const wizard=readFileSync('src/components/properties/PropertyWizardModal.tsx','utf8');
 const api=readFileSync('api/valuation-search.js','utf8');
 assert.match(wizard,/currentStep === 8/);
 assert.match(step,/Pesquisar mercado/);
 assert.match(step,/window.confirm/);
 assert.match(step,/screenOffers/);
 assert.doesNotMatch(step,/\bLeaflet\b|<PrivatePropertyLocationMap|<Map/);
 assert.match(api,/getUser\(bearer\)/);
 assert.match(api,/can_manage_my_valuations/);
 assert.match(api,/eq\('user_id',user.id\)/);
 assert.match(api,/process.env.GECKO_API_TOKEN/);
 assert.doesNotMatch(step,/GECKO_API_TOKEN/);
});


test('Suspeita de imóvel repetido em portais distintos não duplica indicador',()=>{
 const rows=[
  sample('one',250000,100,{listing_neighborhood:'Centro',source_name:'vivareal.com.br'}),
  sample('two',251000,101,{listing_neighborhood:'Centro',source_name:'olx.com.br'}),
  sample('three',300000,110,{listing_neighborhood:'Outro bairro',source_name:'zapimoveis.com.br'})
 ];
 const result=screenOffers(ref,rows);
 assert.equal(result.counts.included,2);
 assert.equal(result.counts.pending,1);
 assert.match(result.entries[1].reason,/Possível repetição/);
});

test('Preços de locação e de venda não são trocados no adaptador',()=>{
 const row={id:'apt-1',url:'https://www.vivareal.com.br/aluguel/apartamento-1',
  unitTypes:['APARTMENT'],title:'Apartamento para locação',
  prices:[{businessType:'SALE',mainValue:650000},{businessType:'RENT',mainValue:2800}],
  address:{city:'Salto de Pirapora',stateAcronym:'SP'}};
 const rent=normalizeGeckoItem(row,'vivareal.com.br','rent');
 assert.equal(rent.asking_price,2800);
 assert.equal(rent.offer_purpose,'rent');
});


test('Pesquisa autenticada usa atributos congelados da avaliação e não local atual',()=>{
 const api=readFileSync('api/valuation-search.js','utf8');
 const ui=readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
 assert.match(api,/assessmentId/);
 assert.match(api,/source_property_id/);
 assert.match(api,/assessment\.property_snapshot/);
 assert.match(api,/referenceLocation=\{city:assessment\.city,state:assessment\.state\}/);
 assert.match(ui,/assessmentId:selected\.id/);
});


test('Campos explicitamente nomeados para terreno e área construída são respeitados',()=>{
 const item={id:'area-identity',title:'Casa com lote e construção',
   url:'https://www.vivareal.com.br/imovel/casa-area-identity',
   unitTypes:['HOME'],prices:{mainValue:460000,businessType:'SALE'},
   attributes:{usableAreas:[100],totalAreas:[220],builtAreas:[135],landAreas:[250]},
   address:{city:'Salto de Pirapora',stateAcronym:'SP'}};
 const found=normalizeGeckoItem(item,'vivareal.com.br');
 assert.equal(found.usable_area,100);
 assert.equal(found.total_area,220);
 assert.equal(found.built_area,135);
 assert.equal(found.land_area,250);
});


test('Etapa 8 usa somente quatro telas e um único rodapé do cadastro',()=>{
 const step=readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
 const wizard=readFileSync('src/components/properties/PropertyWizardModal.tsx','utf8');
 assert.match(step,/ValuationPhase = 'subject' \| 'sources' \| 'analysis' \| 'result'/);
 assert.match(step,/React\.useImperativeHandle\(ref/);
 assert.match(wizard,/valuationRef\.current\?\.next\(\)/);
 assert.match(wizard,/valuationRef\.current\?\.back\(\)/);
 assert.match(wizard,/onFlowControlsChange=\{setValuationFlow\}/);
 assert.doesNotMatch(step,/phase==='dossier'/);
 assert.doesNotMatch(step,/setPhase\('dossier'\)/);
 assert.match(step,/Preparação do dossiê técnico \(futuro\)/);
});
test('Cabeçalho dá prioridade ao avatar em mobile e Perfil inferior abre o menu existente',()=>{
 const nav=readFileSync('src/components/layout/Navbar.tsx','utf8');
 const bottom=readFileSync('src/components/layout/MobileNav.tsx','utf8');
 const userMenu=readFileSync('src/components/layout/UserMenu.tsx','utf8');
 const editor=readFileSync('src/components/visual-editor/PortalEditorProvider.tsx','utf8');
 const css=readFileSync('src/index.css','utf8');
 assert.match(nav,/hidden lg:contents/);
 assert.match(nav,/<UserMenu \/>/);
 assert.match(bottom,/open-account-menu/);
 assert.match(userMenu,/window\.addEventListener\('open-account-menu'/);
 assert.match(userMenu,/Meus Anúncios/);
 assert.match(editor,/!isWizardOpen && \(currentView/);
 assert.match(css,/\.member-profile-menu:focus-visible \{ width: 44px; \}/);
});
