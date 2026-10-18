import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const sql = readFileSync('supabase/migrations/20261018000001_valuation_private_workspace.sql', 'utf8');
const service = readFileSync('src/lib/valuation/assessmentRepository.ts', 'utf8');
const view = readFileSync('src/components/properties/PropertyValuationStep.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const wizard = readFileSync('src/components/properties/PropertyWizardModal.tsx','utf8');
const myListings = readFileSync('src/views/MyPropertiesView.tsx','utf8');
const step = readFileSync('src/components/properties/PropertyValuationStep.tsx','utf8');
const menu = readFileSync('src/components/layout/UserMenu.tsx', 'utf8');

test('tabelas possuem proprietários e dependência composta', () => {
  assert.match(sql, /create table public\.valuation_assessments/i);
  assert.match(sql, /create table public\.valuation_comparables/i);
  assert.match(sql, /foreign key \(assessment_id, owner_id\) references public\.valuation_assessments\(id, owner_id\)/i);
});

test('isolamento RLS e MFA explícitos para ambas as tabelas', () => {
  assert.equal((sql.match(/enable row level security;/gi) || []).length, 2);
  assert.ok((sql.match(/public\.can_manage_my_valuations\(owner_id\)/g) || []).length >= 8);
  assert.match(sql, /public\.has_satisfied_mfa\(\)/i);
  assert.match(sql, /p\.role::text in \('broker', 'agency'\)/i);
  assert.match(sql, /revoke all on public\.valuation_assessments from public, anon, authenticated/i);
  assert.match(sql, /revoke all on public\.valuation_comparables from public, anon, authenticated/i);
});

test('persistência usa identidade do Supabase Auth e não IDs dos formulários', () => {
  assert.match(service, /auth\.getUser\(\)/);
  assert.match(service, /owner_id = await requireProfessionalOwner\(\)/);
  assert.match(service, /\.eq\('owner_id', owner\)/);
});

test('anúncios externos são registrados manualmente por URLs HTTPS', () => {
  assert.match(service, /url\.protocol !== 'https:'/);
  assert.match(view, /Facebook Marketplace/);
  assert.match(view, /addValuationComparable\(selected\.id, input\)/);
});

test('painel permanece restrito e sem preço artificial', () => {
  assert.match(myListings, /currentUser\.id === prop\.userId/);
  assert.match(view, /Avaliação preliminar sem preço calculado/);
  assert.match(view, /auditComparables\(/);
  assert.doesNotMatch(app, /renderedView === 'valuation'/);
  assert.doesNotMatch(menu, /menu-item-valuation/);
  assert.match(wizard, /number: 8, title: 'Avaliação \(opcional\)'/);
  assert.match(wizard, /PropertyValuationStep/);
  assert.match(myListings, /handleStartValuation/);
  assert.match(step, /createValuationForProperty/);
});
