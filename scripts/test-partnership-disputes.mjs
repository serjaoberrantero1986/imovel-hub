import fs from 'node:fs';
const m=fs.readFileSync('supabase/migrations/20261012000009_partnership_visit_disputes.sql','utf8');
const c=[
 ['contestação ligada à visita',/partnership_visit_disputes[\s\S]*visit_id uuid/.test(m)],
 ['categorias controladas',/category text not null check\(category in\('location','attendance','lead_attribution','conduct','other'\)\)/.test(m)],
 ['MFA obrigatório',/open_partnership_visit_dispute[\s\S]*require_partnership_aal2\(\)/.test(m)&&/respond_partnership_visit_dispute[\s\S]*require_partnership_aal2\(\)/.test(m)],
 ['resposta append-only',/partnership_visit_dispute_responses[\s\S]*before update or delete/.test(m)],
 ['eventos imutáveis',/partnership_visit_dispute_events[\s\S]*before update or delete/.test(m)],
 ['status da visita preserva disputa',/status='disputed'/.test(m)],
 ['sem acesso anônimo',/revoke all on function public\.open_partnership_visit_dispute[\s\S]*from public,anon/.test(m)],
 ['hash de evidência validado',/evidence_hash text check\(evidence_hash is null or evidence_hash~'\^\[0-9a-f\]\{64\}\$'\)/.test(m)],
 ['serviço frontend usa RPCs dedicadas',/open_partnership_visit_dispute/.test(fs.readFileSync('src/lib/partnershipVisits.ts','utf8'))]
];
for(const [n,ok] of c){if(!ok){console.error(`✗ ${n}`);process.exitCode=1}else console.log(`✓ ${n}`)}
if(!process.exitCode) console.log(`\n${c.length} verificações da Fase 7 passaram.`);
