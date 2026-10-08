# Aplicação do e-mail de confirmação

O HTML em `confirmation.html` utiliza a identidade pública de Souza Negócios consultada em 07/10/2026: vermelho `#ff0000`, laranja `#ffa200`, cinza `#707070` e o logotipo aprovado. O PNG em `public/assets/email-logo.png` é uma conversão fiel do arquivo público, com transparência, para melhor compatibilidade de e-mail.

1. Publique o frontend e confira `https://www.webimoveis.site/assets/email-logo.png`.
2. No projeto Supabase efetivamente usado pelo site, abra Authentication → Email Templates → Confirm signup (ou Emails → Templates na versão atual do painel).
3. Use o assunto `Confirme seu e-mail — Souza Negócios` e cole o conteúdo completo de `confirmation.html` no corpo. Preserve `{{ .ConfirmationURL }}` em todos os links de confirmação.
4. Faça um cadastro real autorizado, verifique o recebimento no celular e no computador e confirme que o link conclui a confirmação corretamente. Confira também o reenvio após 60 segundos.

O template é aplicado no Supabase; apenas fazer commit/push não o instala. Não altera SMTP, remetente, limites de envio ou URLs de autenticação. Se a identidade do portal mudar, atualize o template e o PNG para acompanhar a nova marca.

A consulta pública mostrou o site usando `mpqitqzcksusgbheiynz.supabase.co`, enquanto o AGENTS.md indica `uzgeyzsgahhsnsnjgefn.supabase.co`. Nenhuma configuração foi modificada. Confirme o projeto efetivamente configurado na hospedagem antes de aplicar a migration ou o template; não execute no projeto antigo por suposição.

Antes do teste de CIRP, execute `supabase/migrations/20261007000001_creci_review_revisions_and_notices.sql` no projeto correto, com as migrations anteriores de credenciamento e MFA já aplicadas. Ela altera as funções de solicitação e decisão, o controle de alterações do registro, a consulta administrativa e o limite concorrente de imagens. Reutiliza as tabelas atuais; não exclui cadastros, documentos, anúncios ou decisões anteriores. As notificações passam a ser criadas pelo servidor e lidas pelo destinatário, com confirmação de leitura por função autenticada.

Se `public.notifications` ainda não existir, o mesmo arquivo agora cria a tabela e o tipo de notificação, com índices, proteção por usuário e MFA. Não é necessário executar a migration antiga completa de chat para obter essa dependência. Se a tentativa anterior retornou `42P01` para essa tabela, execute novamente o arquivo completo atualizado, do `begin` ao `commit`; não execute apenas o trecho final. Uma execução que falhou dentro dessa transação não deve ser considerada aplicada. Se o editor informar que a transação permanece abortada (`25P02`), execute `rollback;` antes de repetir o arquivo completo.

A mudança de CRECI ou conselho invalida a aprovação e aguarda uma solicitação explícita, em vez de entrar na fila antecipadamente. Uma análise já solicitada protege os dados do registro até a decisão. Alterações em documentos atualizam a versão do cadastro para impedir aprovações com uma visualização desatualizada.

Verifique em produção, com cadastros reais autorizados: envio com CIRP e UF selecionada; duas imagens e recusa da terceira; pendente → aprovado; aprovado → rejeitado com motivo; rejeitado → aprovado usando os mesmos documentos; histórico preservado; aviso após novo login; selo atualizado; tentativa de decisão concorrente; e bloqueio de chamadas administrativas por usuários sem privilégio. Os testes locais não aplicam SQL nem criam contas ou documentos no banco real.
