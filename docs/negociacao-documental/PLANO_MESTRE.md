# Plano mestre — Dossiê documental, contratos e assinaturas

Este documento controla a implementação aprovada para o fluxo de fechamento imobiliário. Ele deve ser atualizado quando uma decisão for confirmada, uma etapa for concluída ou um ajuste alterar dependências. Nenhuma etapa concluída deve ser removida do histórico.

## Decisões confirmadas

- [x] O fluxo nasce no lead quando ele entra em **Fechamento e documental**.
- [x] Imóvel, anúncio, corretor, interessado e demais dados existentes são reaproveitados.
- [x] O dossiê pertence à negociação, permitindo mais de uma negociação por imóvel.
- [x] O padrão visual e documental do CIRP será reutilizado.
- [x] Solicitações são montadas por participante, com checkboxes de documentos aplicáveis.
- [x] O destinatário recebe um link temporário por e-mail, sem código adicional.
- [x] O link temporário exibe somente a solicitação daquele participante.
- [x] Imagens e PDFs são aceitos, preservando legibilidade e histórico de versões.
- [x] A minuta é enviada simultaneamente a todos para concordância.
- [x] Apontamentos visuais ficam em uma camada separada e não modificam o documento original.
- [x] Qualquer nova versão reinicia a rodada de concordância de todos.
- [x] A versão final só segue para assinatura depois da concordância unânime.
- [x] A assinatura será integrada pela API v4 da SuperSign, inicialmente em Sandbox.
- [x] A landing page permanece fora deste escopo.
- [x] Propostas, contrapropostas e condições consolidadas antecedem a minuta e preservam versões.
- [x] Imóveis sem matrícula individual usam fluxo próprio de cessão de direitos possessórios.
- [x] Fontes de certidões são catalogadas por jurisdição, autoridade e regra de aplicação.

## Regras permanentes

- [x] Reutilizar o Design System, componentes, temas e comportamento responsivo existentes.
- [x] Integrar os eventos documentais já implementados às notificações persistentes e aos toasts.
- [x] Preservar documentos, versões, decisões e auditoria históricos.
- [x] Não expor secrets; manter tokens temporários somente no fragmento do link e seu hash no banco.
- [ ] Não usar dados fictícios em produção.
- [ ] Manter operações críticas no servidor e políticas RLS restritivas.
- [ ] Validar localmente e depois no domínio `webimoveis.site`.
- [ ] Fazer um único commit e push ao final do conjunto autorizado.

## Fase 0 — Auditoria e fundação

- [x] Ler `AGENTS.md` e a skill de consistência do produto.
- [x] Localizar CRM, lead, CIRP, notificações, uploads e visitas existentes.
- [ ] Mapear as tabelas e políticas reais relacionadas a leads, imóveis e notificações.
- [x] Criar migration versionada sem alterar dados históricos.
- [x] Criar tipos e serviço de domínio compartilhado.
- [x] Adicionar o estágio **Fechamento e documental** ao funil.
- [x] Restringir a fundação ao profissional responsável, com MFA e RLS.

## Fase 1 — Sala da Negociação

- [x] Criar a aba **Negociação e documentos** no lead.
- [x] Liberar o início do dossiê no estágio documental.
- [x] Criar/recuperar dossiê reaproveitando dados existentes.
- [x] Exibir linha do metrô responsiva e animada.
- [ ] Criar visão geral com percentual ponderado, bloqueios e próxima ação.
- [ ] Criar abas: proprietários, interessados, imóvel, negociação, certidões, contratos e histórico.
- [ ] Tratar estado vazio, carregamento, erro e ausência de permissão.

## Fase 1A — Proposta e contexto jurídico

- [x] Criar histórico imutável de proposta, contraproposta e condições consolidadas.
- [x] Registrar valor, pagamento, prazo, posse, corretagem e condições especiais por versão.
- [x] Calcular hash de cada versão e preservar as substituídas.
- [x] Classificar o imóvel como matriculado, direitos possessórios ou ainda não confirmado.
- [x] Pré-preencher a minuta com as condições consolidadas e aceitas.
- [x] Criar roteiro específico para cessão de direitos possessórios sem afirmar propriedade registral.
- [x] Enviar cada versão simultaneamente às partes por link pessoal e temporário.
- [x] Registrar concordância ou solicitação de alteração por participante.
- [x] Aceitar a versão somente após concordância unânime.
- [x] Notificar o profissional com decisão, participante e versão correspondente.

## Fase 2 — Participantes e checklist guiado

- [x] Importar o interessado principal do lead.
- [x] Permitir cadastrar proprietários, coproprietários, cônjuges, compradores, locatários, fiadores e representantes.
- [ ] Criar perguntas condicionais somente para informações ausentes.
- [x] Criar catálogo de documentos preparado para evolução versionada.
- [ ] Criar modelos rápidos por papel e tipo de negócio.
- [x] Permitir seleção individual por checkbox.
- [x] Marcar documento como não aplicável com justificativa e auditoria; obrigatoriedade permanece definida na solicitação.

## Fase 3 — Solicitação e upload por link temporário

- [x] Gerar token aleatório, armazenando somente seu hash.
- [ ] Configurar validade, revogação, renovação e encerramento.
- [x] Enviar e-mail personalizado ao participante.
- [x] Criar formulário público restrito ao token.
- [x] Exibir descrição e orientação de cada documento solicitado.
- [x] Aceitar PDF, JPEG e PNG validados também no servidor.
- [x] Reutilizar o editor documental compartilhado para imagens.
- [x] Preservar versões anteriores na substituição.
- [x] Criar estados: aguardando, recebido, em conferência, aprovado, correção solicitada, vencido e não aplicável.
- [x] Permitir pedido de correção com motivo e novo envio.
- [x] Registrar acessos, uploads, substituições e decisões.

## Fase 4 — Conferência e dossiê

- [x] Organizar arquivos por participante e categoria.
- [x] Criar validade, vencimento e alertas persistentes em janelas de 30 e 7 dias.
- [x] Implementar comparação assistida entre dados cadastrados e documentos sem alteração silenciosa.
- [x] Criar pendências impeditivas e ressalvas.
- [x] Calcular conclusão ponderada do checklist aplicável.
- [x] Gerar índice do dossiê e fotografia imutável da versão usada no contrato.
- [x] Preparar exportação controlada do índice, sem URLs públicas dos documentos privados.
- [x] Criar catálogo de fontes oficiais por município, estado e abrangência nacional.
- [x] Separar certidão fiscal, distribuição judicial, CNDT e ações trabalhistas.
- [x] Marcar consultas condicionais de pessoa jurídica e empregador.

## Fase 5 — Construtor contratual

- [x] Criar catálogo versionado de modelos e cláusulas.
- [x] Implementar interruptores com explicação, dependências e incompatibilidades.
- [x] Preencher automaticamente imóvel, partes, profissionais e condições conhecidas.
- [x] Solicitar somente condições específicas ainda ausentes.
- [x] Diferenciar minuta preliminar, minuta pronta e versão final.
- [x] Criar histórico de versões sem sobrescrita.

## Fase 6 — Revisão simultânea da minuta

- [x] Enviar a mesma versão simultaneamente a todos os revisores.
- [x] Criar link temporário de revisão por participante.
- [x] Exibir PDF real com zoom e navegação por página.
- [x] Criar comentário geral e comentário ancorado.
- [x] Criar destaque, risco, desenho livre, seta/círculo e marca de inserção.
- [x] Armazenar anotações como camada separada com página e coordenadas.
- [x] Permitir filtrar por participante e situação.
- [x] Criar estados: novo, em análise, aceito, parcial, rejeitado e resolvido.
- [x] Registrar concordância ou solicitação de alteração.
- [x] Reiniciar todas as concordâncias quando surgir nova versão.
- [x] Comparar alterações entre versões.
- [x] Bloquear e calcular hash da versão unanimemente aprovada.

## Fase 7 — SuperSign

- [x] Preparar consulta de plano, limites e capacidades da conta pela API.
- [x] Configurar a secret `SUPERSIGN_SANDBOX_API_KEY`; produção permanece sem configuração.
- [x] Implementar cliente servidor da API v4 restrito ao Sandbox.
- [x] Criar envelope somente após aprovação unânime.
- [x] Configurar signatários, qualificações, autenticação e ordem.
- [x] Enviar PDF pela URL assinada e posicionar campos por âncora.
- [x] Implementar idempotência nas operações POST de criação.
- [x] Criar receptor de webhook com validação HMAC do corpo cru e tolerância de 5 minutos.
- [x] Cadastrar o webhook no Sandbox e validar uma entrega `WEBHOOK_TEST` assinada ponta a ponta.
- [x] Deduplicar eventos e confirmar o estado remoto para tolerar chegada fora de ordem.
- [x] Mapear envio, assinatura, conclusão, recusa, expiração, anulação e falha de e-mail.
- [x] Preparar download e armazenamento privado do documento selado e dados de validação.
- [x] Validar o documento final pela API antes de concluir a negociação.

## Fase 8 — Notificações, segurança e acabamento

- [x] Notificar criação, envio, recebimento, rejeição, vencimento e aprovação de documentos.
- [x] Notificar nova minuta, apontamentos, concordâncias e solicitações de alteração.
- [x] Notificar eventos de assinatura e falha de entrega.
- [x] Exibir badges no menu, CRM, lead e Sala da Negociação.
- [x] Garantir textos detalhados e acionáveis.
- [ ] Aplicar RLS, URLs assinadas, expiração, rate limit e auditoria.
- [ ] Validar acessibilidade, celular, tema escuro e desempenho.

## Fase 9 — Validação e publicação

- [ ] Executar lint, build e testes de domínio.
- [x] Validar migrations e advisors do Supabase.
- [ ] Testar fluxo autenticado do corretor.
- [ ] Testar link público temporário sem expor outros dados.
- [ ] Testar rodada simultânea com mais de dois participantes.
- [ ] Testar nova versão invalidando concordâncias anteriores.
- [ ] Testar SuperSign integralmente em Sandbox.
- [ ] Solicitar confirmação específica antes de usar produção/créditos da SuperSign.
- [ ] Publicar uma única vez e testar em `webimoveis.site`.

## Registro de ajustes

| Data | Ajuste | Impacto | Situação |
|---|---|---|---|
| 25/10/2026 | Link documental sem código adicional | Token temporário passa a ser a credencial restrita | Confirmado |
| 25/10/2026 | Revisão simultânea | Aprovação fica separada da ordem de assinatura | Confirmado |
| 25/10/2026 | Anotações visuais | Exige camada de marcações versionada sobre o PDF | Confirmado |
| 25/10/2026 | SuperSign API v4 | Envelope criado somente depois da aprovação unânime | Confirmado |
| 25/10/2026 | Webhook SuperSign Sandbox | Entrega de teste assinada, validada por HMAC e registrada sem criar envelope | Homologado |
| 25/10/2026 | Central de avisos da negociação | Atualizações aparecem no perfil e no CRM e são baixadas por dossiê | Implementado |
| 25/10/2026 | Token no fragmento do link | Evita envio da credencial aos logs HTTP do servidor | Implementado |
| 25/10/2026 | Validação binária no servidor | Arquivos inválidos são removidos antes do registro | Implementado |
| 25/10/2026 | Conferência sem alteração silenciosa | Divergências ficam lado a lado e exigem decisão profissional | Implementado |
| 25/10/2026 | Snapshot contratual | Contrato usará uma fotografia versionada e íntegra do dossiê | Implementado |
| 25/10/2026 | Não aplicável com justificativa | Decisão exige motivo e fica na auditoria | Implementado |
| 25/10/2026 | Exportação sem links privados | Índice imprimível contém versão e hash de integridade | Implementado |
| 25/10/2026 | Construtor contratual determinístico | Modelos, cláusulas e condições geram versões reproduzíveis e auditáveis | Implementado |
| 25/10/2026 | Guardas de minuta | Servidor bloqueia cláusulas inválidas e minuta pronta com campos essenciais vazios | Implementado |
| 25/10/2026 | Revisão simultânea por versão | Todos recebem o mesmo PDF e links individuais na mesma rodada | Implementado |
| 25/10/2026 | Camada visual separada | PDF permanece imutável; marcações usam página e coordenadas normalizadas | Implementado |
| 25/10/2026 | Negociação antes da minuta | Proposta, contraproposta e consolidação passam a ter versões e hash próprios | Implementado |
| 25/10/2026 | Imóvel sem matrícula individual | Checklist e minuta tratam cessão de direitos possessórios e cadeia da posse | Implementado |
| 25/10/2026 | Catálogo territorial de certidões | Fontes oficiais são filtradas por UF, município, pessoa e tipo de documento | Implementado |
| 25/10/2026 | Manifestação eletrônica da negociação | Cada parte recebe link pessoal para aceitar ou solicitar alteração na mesma versão | Implementado |
| 25/10/2026 | SuperSign isolada em Sandbox | Cliente v4, envelope, upload e campos por âncora foram preparados sem habilitar produção | Secret e webhook homologados; aguarda envelope integral |
