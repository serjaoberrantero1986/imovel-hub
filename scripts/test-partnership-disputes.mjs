import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync('supabase/migrations/20261023180856_unified_property_visits.sql','utf8');
assert.ok(sql.includes('public.dispute_property_visit'));
assert.ok(sql.includes('public.resolve_property_visit_dispute'));
assert.ok(!sql.includes("set status='disputed'"));
console.log('Contestações: verificações estruturais passaram. Comportamento coberto por test-property-visits.mjs.');
