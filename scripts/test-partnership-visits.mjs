import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync('supabase/migrations/20261023180856_unified_property_visits.sql','utf8');
assert.ok(sql.includes('revoke all on function public.issue_partnership_visit_otp(uuid) from public,anon,authenticated'));
assert.ok(sql.includes('grant execute on function public.prepare_property_visit_code(uuid,uuid,text,text) to service_role'));
assert.ok(!sql.includes("'code',v_code"));
console.log('Permissões: verificações estruturais passaram. Comportamento coberto por test-property-visits.mjs.');
