import fs from 'node:fs';
const migration=fs.readFileSync('supabase/migrations/20261012000008_partnership_visits.sql','utf8');
const checks=[
 ['visitas vinculadas à parceria e imóvel',/create table if not exists public\.partnership_visits[\s\S]*partnership_id uuid[\s\S]*property_id uuid/.test(migration)],
 ['CRECI-SP e contrato revalidados',/require_partnership_aal2\(\)[\s\S]*Active partnership required[\s\S]*Verified contract required/.test(migration)],
 ['OTP armazenado somente como hash e expiração',/otp_hash text[\s\S]*otp_expires_at timestamptz[\s\S]*digest\(v_code/.test(migration)],
 ['check-in exige OTP ou justificativa manual',/Invalid or expired visit code[\s\S]*Manual reason required/.test(migration)],
 ['geolocalização é pontual',/check_in_lat numeric[\s\S]*check_out_lat numeric/.test(migration)],
 ['check-out conclui a visita',/confirm_partnership_visit_checkout[\s\S]*status='completed'/.test(migration)],
 ['eventos são imutáveis',/prevent_partnership_visit_event_mutation[\s\S]*before update or delete/.test(migration)],
 ['funções sem acesso anônimo',/revoke all on function public\.create_partnership_visit[\s\S]*from public,anon/.test(migration)],
 ['sem rastreamento contínuo ou biometria',!/(watchPosition|biometric|facial_recognition)/i.test(migration)],
 ['código enviado por aviso persistente',/partnership_visit_otp[\s\S]*insert into public\.notifications/.test(migration)],
];
for(const [label,ok] of checks){if(!ok){console.error(`✗ ${label}`);process.exitCode=1}else console.log(`✓ ${label}`)}
if(!process.exitCode) console.log(`\n${checks.length} verificações da Fase 6 passaram.`);
