import{readFileSync}from'node:fs';
const migration=readFileSync('supabase/migrations/20261012000007_partnership_lead_protection.sql','utf8');
const service=readFileSync('src/lib/partnershipLeads.ts','utf8');
const panel=readFileSync('src/components/crm/PartnershipLeadPanel.tsx','utf8');
const detail=readFileSync('src/components/properties/PropertyDetailView.tsx','utf8');
const crud=readFileSync('src/lib/supabaseCrud.ts','utf8');
const checks=[
['contato informa a parceria ao servidor',/partnershipId: property\.partnership\?\.id/.test(detail)&&/p_partnership_id: lead\.partnershipId/.test(crud)],
['servidor revalida parceria e contrato',/Active portal partnership not found/.test(migration)&&/cv\.status='verified'/.test(migration)],
['parceiro de origem recebe o lead completo',/v_advertiser_id:=v_partnership\.partner_id/.test(migration)],
['atribuição guarda contrato e snapshots imutáveis',/contract_version_id uuid not null/.test(migration)&&/prevent_partnership_lead_attribution_mutation/.test(migration)],
['captador recebe apenas aviso mínimo',/dados pessoais permanecem protegidos/.test(migration)],
['resumo não inclui dados pessoais',/get_my_partnership_lead_summaries/.test(migration)&&!/buyer_(name|email|phone)/.test(migration.split('get_my_partnership_lead_summaries')[1].split('create or replace function public.get_my_partnership_lead_access_requests')[0])],
['acesso exige campos mínimos e finalidade',/f in\('name','email','phone','message'\)/.test(migration)&&/Access purpose required/.test(migration)],
['decisão exige parceiro, MFA e justificativa',/Partner decision access required/.test(migration)&&/Decision reason required/.test(migration)],
['detalhes liberam somente campos autorizados',/requested_fields/.test(migration)&&/get_authorized_partnership_lead_details/.test(migration)],
['cada visualização detalhada é auditada',/details_viewed/.test(migration)&&/partnership_lead_access_audit/.test(migration)],
['sem acesso direto ou exportação em massa',/revoke all on public\.partnership_lead_attributions/.test(migration)&&/least\(greatest\(p_limit,1\),50\)/.test(migration)],
['duplicidade usa hash sem adjudicação',/contact_fingerprint/.test(migration)&&/duplicate_possible/.test(migration)&&!/winner|commission_owner|adjudicat/i.test(migration)],
['encerramento não apaga atribuições',/references public\.property_partnerships\(id\) on delete restrict/.test(migration)&&!/delete from public\.partnership_lead/i.test(migration)],
['interface explica divulgação progressiva',/Compartilhamento progressivo/.test(panel)&&/Resumos sem nome, telefone, e-mail ou mensagem/.test(panel)],
['interface permite solicitar, decidir e consultar',/Solicitar acesso/.test(panel)&&/Decidir acesso aos dados/.test(panel)&&/Dados autorizados/.test(panel)],
['serviço usa somente RPCs dedicadas',/request_partnership_lead_access/.test(service)&&/get_authorized_partnership_lead_details/.test(service)],
];
const failures=checks.filter(([,passed])=>!passed);for(const[name,passed]of checks)console.log(`${passed?'✓':'✗'} ${name}`);if(failures.length){console.error(`\n${failures.length} verificação(ões) falharam.`);process.exit(1);}console.log(`\n${checks.length} verificações da proteção de leads passaram.`);
