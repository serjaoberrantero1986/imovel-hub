-- Verificação somente de leitura do módulo de avaliação.
-- Execute APÓS aplicar e revisar a migration, de preferência em banco isolado.
-- Este script NÃO cria, altera ou exclui dados nem simula autenticação.

with expected(table_name) as (
  values ('valuation_assessments'), ('valuation_comparables')
)
select
  e.table_name,
  to_regclass('public.' || e.table_name) is not null as tabela_existe,
  coalesce(c.relrowsecurity, false) as rls_habilitada,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = e.table_name) as qtd_politicas,
  case when c.oid is null then null
       else has_table_privilege('anon', c.oid, 'SELECT') end as anon_pode_ler,
  case when c.oid is null then null
       else has_table_privilege('authenticated', c.oid, 'SELECT') end as autenticado_tem_grant,
  case when c.oid is null then null
       else has_table_privilege('authenticated', c.oid, 'INSERT') end as autenticado_tem_grant_insercao
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name
order by e.table_name;

-- Confirme oito políticas, quatro em cada tabela, todas de titularidade.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('valuation_assessments', 'valuation_comparables')
order by tablename, cmd;

-- Função crítica executa com privilégios delegados; revisar corpo e search_path.
select n.nspname as schema, p.proname as funcao,
       p.prosecdef as security_definer,
       p.proconfig as configuracoes
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('can_manage_my_valuations', 'has_satisfied_mfa')
order by p.proname;

-- Integridade: chave composta na tabela de comparáveis.
select conname, contype, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = to_regclass('public.valuation_comparables')
  and contype = 'f'
order by conname;
