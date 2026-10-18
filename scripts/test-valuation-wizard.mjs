import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evaluateComparable } from '../src/lib/valuation/engine.mjs';

const wizard=readFileSync('src/components/properties/PropertyWizardModal.tsx','utf8');
const myListings=readFileSync('src/views/MyPropertiesView.tsx','utf8');
const app=readFileSync('src/App.tsx','utf8');
const step=readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
const migration=readFileSync('supabase/migrations/20261018000002_valuation_linked_wizard_and_location_quality.sql','utf8');
const neighborhood=readFileSync('supabase/migrations/20261018000003_collaborative_neighborhoods.sql','utf8');

test('avaliação é somente o oitavo passo e não uma página própria',()=>{
  assert.match(wizard,/number: 8, title: 'Avaliação \(opcional\)'/);
  assert.match(wizard,/currentStep === 8/);
  assert.doesNotMatch(app,/renderedView === 'valuation'/);
  assert.match(myListings,/handleStartValuation/);
});

test('anúncio pode ser salvo na etapa sete antes da avaliação',()=>{
  assert.match(wizard,/handleSaveListing\(\)/);
  assert.match(wizard,/setCurrentStep\(8\)/);
  assert.match(step,/Avaliação Inteligente/);
});

test('snapshot privado somente de anúncios do próprio profissional',()=>{
  assert.match(migration,/source_property_id uuid references public\.properties\(id\)/);
  assert.match(migration,/p\.user_id = new\.owner_id/);
  assert.match(step,/createValuationForProperty/);
});

test('posição no mapa é confirmada, não promovida por geocoding aproximado',()=>{
  assert.match(wizard,/PrivatePropertyLocationMap/);
  assert.match(wizard,/coordinateQuality === 'property'/);
  assert.match(migration,/coordinate_quality in \('unknown','approximate','geocoded','property'\)/);
});

test('bairros colaborativos possuem autenticação, limite e controle de origem',()=>{
  assert.match(neighborhood,/register_community_neighborhood/);
  assert.match(neighborhood,/public\.has_satisfied_mfa\(\)/);
  assert.match(neighborhood,/v_count>=40/);
});

test('casa em condomínio exige áreas na triagem',()=>{
 const subject={propertyType:'condo_house',coordinateQuality:'property',coordinates:{lat:-23.5,lng:-47.5},landArea:125,builtArea:100,condominium:true};
 const comparable={id:'x',propertyType:'condo_house',coordinateQuality:'property',coordinates:subject.coordinates,
   availability:'active',askingPrice:200000,bedrooms:3,bathrooms:2,marketZoneVerified:true,reviewedByBroker:true};
 const r=evaluateComparable(subject,comparable);
 assert.equal(r.status,'pendente');
 assert.ok(r.pendingReasons.some(reason=>reason.includes('Área construída')));
 assert.ok(r.pendingReasons.some(reason=>reason.includes('Área do terreno')));
});
