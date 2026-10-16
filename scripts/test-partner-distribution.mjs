import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261012000006_partner_property_distribution.sql','utf8');
const crud = readFileSync('src/lib/supabaseCrud.ts','utf8');
const types = readFileSync('src/types/index.ts','utf8');
const card = readFileSync('src/components/properties/PropertyCard.tsx','utf8');
const detail = readFileSync('src/components/properties/PropertyDetailView.tsx','utf8');
const hero = readFileSync('src/components/home/HeroPropertyScene.tsx','utf8');
const reportModal = readFileSync('src/components/properties/PartnerListingReportModal.tsx','utf8');
const publicInventoryFunction = migration.split('create table if not exists public.partnership_listing_reports')[0];

const checks = [
  ['registro canônico não é duplicado', /'property_id',p\.id,'source','partnership'/.test(migration) && !/insert into public\.properties/i.test(migration)],
  ['somente parceria operacional ativa', /pp\.status='active'/.test(migration) && /cv\.status='verified'/.test(migration)],
  ['encerramento futuro retira automaticamente', /pp\.ends_at is null or pp\.ends_at>now\(\)/.test(migration)],
  ['permissão de portal é obrigatória', /allow_partner_portal/.test(migration)],
  ['imóvel e CRECIs precisam continuar válidos', /p\.status='active'/.test(migration) && (migration.match(/is_eligible_sp_partnership_professional/g) || []).length === 2],
  ['restrição territorial permanece em SP', /upper\(l\.state\)='SP'/.test(migration)],
  ['inventário público não expõe campos privados', !/(email|phone|whatsapp|address_street)/i.test(publicInventoryFunction)],
  ['carregador preserva próprios e adiciona referências', /source === 'partnership'/.test(crud) && /\.eq\('user_id', ownerProfileId\)/.test(crud)],
  ['consulta em lotes evita URL ilimitada', /index \+= 100/.test(crud)],
  ['metadados tipados identificam as duas partes', /captor: \{ profileId/.test(types) && /partner: \{ profileId/.test(types)],
  ['card exibe selo e captador', /<span>Parceria<\/span>/.test(card) && /Captado por/.test(card)],
  ['detalhe identifica captador e atendente', /Captador responsável/.test(detail) && /Atendimento neste portal/.test(detail)],
  ['detalhe informa atualização e responsabilidade', /propertyUpdatedAt/.test(detail) && /property\.partnership\.notice/.test(detail)],
  ['hero também identifica parceria', /hero-property-partnership/.test(hero)],
  ['relato exige autenticação e não altera o imóvel', /Authentication required/.test(migration) && /report_outdated_partner_listing/.test(migration) && !/update public\.properties/i.test(migration)],
  ['autorrelato é bloqueado e frequência limitada', /Parties cannot report their own listing/.test(migration) && /unique\(partnership_id,reporter_id,reported_on\)/.test(migration)],
  ['relato notifica as duas partes', /scope','partnership_listing_report/.test(migration) && /unnest\(array\[v_partnership\.captor_id,v_partnership\.partner_id\]\)/.test(migration)],
  ['modal explica tratamento do relato', /não altera nem remove o anúncio automaticamente/.test(reportModal) && /Não inclua documentos/.test(reportModal)],
];

const failures=checks.filter(([,passed])=>!passed);
for(const [name,passed] of checks) console.log(`${passed?'✓':'✗'} ${name}`);
if(failures.length){console.error(`\n${failures.length} verificação(ões) falharam.`);process.exit(1);}
console.log(`\n${checks.length} verificações da distribuição passaram.`);
