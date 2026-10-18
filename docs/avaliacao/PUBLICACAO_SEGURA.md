# Liberação segura — Avaliação Inteligente do Web Imóveis

Atualizado em 18/10/2026. Este documento é um **checklist**, não uma autorização para deploy ou migration.

## Situação confirmada no GitHub
- PR #1: motor isolado, branch `feature/avaliacao-inteligente-motor-mvp` → `main`, ainda em rascunho.
- PR #2: tela e migration, branch `feature/avaliacao-inteligente-painel-supabase` → branch do PR #1. PR empilhado, ainda em rascunho.
- Vercel marcou o preview do PR #2 como **Ready**. O status não garante que o banco já suporta os formulários.
- Tests Node, TypeScript e build Vite passaram no GitHub Actions.
- Nenhum merge em `main` e nenhuma migration aplicada pelo trabalho de preparação.

## Preview de código (sem aprovação para salvar em produção)
A Vercel publicou um URL para o PR #2:
https://imovel-hub-git-feature-avaliacao-i-3e389e-souza-vercel-projects.vercel.app

Verificar o acesso (a Vercel pode exigir login), renderização responsiva, tema claro/escuro e o menu profissional. **Não realizar testes de gravação usando dados reais**, nem supor que o preview usa um banco independente: as variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY podem apontar para produção. Verificar destinos no painel Vercel antes de cadastrar qualquer coisa.

## Ordem das etapas para eventual produção
1. Revisar escopo, diffs e GitHub Actions dos PRs #1 e #2.
2. Confirmar pelo painel Vercel a separação entre variáveis de Preview e Production. Se ambas apontarem para a mesma base, não usar Preview para testes de escrita.
3. Revisar a migration `supabase/migrations/20261018000001_valuation_private_workspace.sql`. Não execute em produção como experimento.
4. Validar previamente em projeto Supabase isolado, com estrutura compatível, as constraints, as políticas RLS, o fluxo MFA e duas identidades profissionais distintas. Conferir o script SQL de leitura `supabase/checks/valuation_readiness.sql`.
5. Confirmar que um perfil comprador/anônimo não visualiza tabelas privadas e que um profissional A não lê/altera registros do profissional B. Testar `owner_id` adulterado e `assessment_id` de outro titular.
6. Depois de revisar e aprovar a mudança de banco para produção, preparar backup e janela de manutenção; aplicar a migration **antes** do deploy do frontend, para evitar consulta a tabelas inexistentes.
7. Após validar, mesclar PR #1 na `main`. Em seguida atualizar a base do PR #2 para `main` e mesclá-lo; o deploy automático da Vercel precisa ser supervisionado.
8. Testar a página real no ambiente publicado; conferir operações reais autorizadas, modo claro/escuro, mobile e estados vazios. Em caso de falha, interromper o rollout e seguir plano de correção.

## Verificações que os testes de código NÃO substituem
- Execução real de migração PostgreSQL e rollback efetivo.
- RLS/MFA em diferentes sessões autenticadas e perfis ativos/inativos.
- Persistência em banco real e sincronização depois do recarregamento.
- Acesso ao preview sob as configurações reais da Vercel.
- Qualquer aprovação para emitir valor de mercado/PTAM.

## Arquivos que esta etapa usa
- `supabase/migrations/20261018000001_valuation_private_workspace.sql` (mudança de banco **pendente**).
- `supabase/checks/valuation_readiness.sql` (somente leitura).
- `docs/avaliacao/FASE2_PAINEL_SUPABASE.md` e este checklist.

Não divulgar o recurso para corretores antes de concluir a validação acima.
