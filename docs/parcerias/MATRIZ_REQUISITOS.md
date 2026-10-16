# Matriz de Requisitos — Rede de Parcerias

Estados: `pendente`, `em_execucao`, `implementado_local`, `migration_aplicada`, `validado_producao`, `bloqueado_externo`.

| ID | Requisito | Fase | Evidência obrigatória | Estado |
|---|---|---:|---|---|
| GOV-001 | Plano mestre versionado | 0 | `PLANO_MESTRE.md` revisado | implementado_local |
| GOV-002 | Matriz requisito → migration → código → teste | 0 | esta matriz atualizada por entrega | implementado_local |
| GOV-003 | Parecer jurídico completo | 0 | documento aprovado pelo responsável jurídico | bloqueado_externo |
| GOV-004 | Validação CRECI-SP/COFECI/SGR | 0 | resposta ou parecer arquivado | bloqueado_externo |
| LGPD-001 | RIPD e teste de balanceamento | 0 | documento aprovado | bloqueado_externo |
| LGPD-002 | Política de retenção | 0 | tabela de prazos e bases legais | bloqueado_externo |
| PAR-001 | Adesão voluntária à rede | 1 | migration, RPC, tela e teste de RLS | implementado_local |
| PAR-002 | Restrição CRECI-SP aprovado e vigente | 1 | validação server-side e testes negativos | implementado_local |
| PAR-003 | MFA obrigatório para operações contratuais | 1 | RPC exige AAL2 e testes | implementado_local |
| PAR-004 | Regiões reais do Estado de SP | 1 | fonte real, persistência e filtros | em_execucao |
| PAR-005 | Especialidades e preferências de colaboração | 1 | schema e formulário | implementado_local |
| PAR-006 | Convites, bloqueios e denúncias | 1 | fluxo, auditoria e administração | implementado_local |
| OFR-001 | Oferta de parceria por imóvel | 2 | registro único ligado a `properties.id` | implementado_local |
| OFR-002 | Percentuais totalizam 100% | 2 | constraint, RPC, slider/campos e testes | implementado_local |
| OFR-003 | Contraproposta sem sobrescrever versão | 2 | versões e concorrência | implementado_local |
| OFR-004 | Vigência determinada ou indeterminada | 2 | constraints e interface | implementado_local |
| OFR-005 | Exclusividade original e da parceria separadas | 2 | campos, textos e testes | implementado_local |
| OFR-006 | Publicidade granular | 2 | permissões versionadas | implementado_local |
| OFR-007 | Matriz de responsabilidades | 2 | responsabilidades completas e versionadas | implementado_local |
| CTR-001 | Documento contratual imutável | 3 | storage privado, hash e versão | implementado_local |
| CTR-002 | Assinatura eletrônica avançada ou superior | 3 | validação do provedor/SGR | bloqueado_externo |
| CTR-003 | Comprovação do SGR antes da ativação | 3 | identificador, documento e regra server-side | bloqueado_externo |
| CTR-004 | Alteração cria aditivo/nova versão | 3 | histórico imutável e testes | implementado_local |
| CTR-005 | Encerramento preserva atribuições anteriores | 3 | regra de lead e teste temporal | implementado_local |
| DST-001 | Imóvel único, sem duplicação por portal | 4 | consulta tenant baseada em permissão ativa | implementado_local |
| DST-002 | Selo Parceria em cards | 4 | componente compartilhado e teste visual | implementado_local |
| DST-003 | Captador e parceiro identificados | 4 | card e detalhe com nome/CRECI-SP | implementado_local |
| DST-004 | Atualização sincronizada pelo captador | 4 | consultas apontam ao registro original | implementado_local |
| DST-005 | Retirada imediata por status ou contrato | 4 | consulta pública e testes negativos | implementado_local |
| DST-006 | Comunicar informação desatualizada | 4 | formulário, notificação e auditoria | implementado_local |
| LED-001 | Lead atribuído ao portal parceiro de origem | 5 | origem imutável e testes | implementado_local |
| LED-002 | Captador recebe dados mínimos inicialmente | 5 | projeção/RPC segura | implementado_local |
| LED-003 | Liberação progressiva de dados | 5 | estados, RLS e log de acesso | implementado_local |
| LED-004 | Tratamento de duplicidade | 5 | eventos e contestação, sem adjudicação automática | em_execucao |
| LED-005 | Exportação em massa bloqueada | 5 | ausência de privilégio/RPC e teste | implementado_local |
| VIS-001 | Agendamento e confirmação do interessado | 6 | fluxo com OTP e estados | pendente |
| VIS-002 | Check-in geolocalizado pontual | 6 | permissão explícita, coordenada, precisão e hora do servidor | pendente |
| VIS-003 | Check-out opcional e pontual | 6 | evento separado | pendente |
| VIS-004 | Sem rastreamento contínuo | 6 | revisão de código e teste de permissão | pendente |
| VIS-005 | Alternativa sem geolocalização | 6 | confirmação manual justificada | pendente |
| VIS-006 | Comprovante com hash e versão da declaração | 6 | documento reproduzível e auditável | pendente |
| VIS-007 | Contestação preserva registro original | 6 | tabela/eventos imutáveis | pendente |
| VIS-008 | Nenhuma biometria na primeira versão | 6 | revisão de dependências, schema e UI | pendente |
| NEG-001 | Proposta ligada a lead, parceria e contrato vigente | 7 | schema, RPC e testes | pendente |
| NEG-002 | Registro do resultado sem custodiar valores | 7 | interface documental e ausência de pagamento | pendente |
| ADM-001 | Painel de supervisão | 8 | interface administrativa no padrão aprovado | pendente |
| ADM-002 | Decisão com justificativa e notificação persistente | 8 | transação, auditoria e teste | pendente |
| ADM-003 | Piloto controlado | 8 | participantes autorizados e relatório | pendente |
| MKT-001 | Landing divulga somente recursos validados | 9 | inventário de afirmações e teste de links | pendente |

## Regra de atualização

Nenhuma entrega pode alterar um estado para `implementado_local` sem listar os arquivos e testes que comprovam o requisito. `validado_producao` exige evidência observável no ambiente real; build local ou migration escrita não bastam.

## Ampliação aprovada: oportunidades e contratos de carteira

Esta lista complementa as fases anteriores. Nenhum item abaixo deve ser considerado validado em produção somente porque há código local ou migration escrita.

| ID | Requisito acordado | Estado em 16/10/2026 | Evidência ou pendência |
|---|---|---|---|
| GEO-001 | Pesquisar todos os municípios paulistas na seleção de regiões | implementado_local | `partnershipLocations.ts` consulta a API oficial do IBGE; `PartnershipNetworkPanel.tsx` exige uma opção reconhecida. Ainda requer teste no navegador e na API real. |
| GEO-002 | Selecionar bairros de fonte oficial após escolher o município, sem criação manual | pendente | A consulta atual a bairros de imóveis ativos (`20261016000003_partnership_region_neighborhoods.sql`) é provisória e não atende ao requisito. Avaliar importação versionada da malha de bairros do Censo 2022/IBGE para SP, com código de município e bairro, cobertura e atualização documentadas; onde não houver bairro oficial, permitir somente seleção da cidade inteira. Validar também no servidor e preservar regiões já salvas. |
| GEO-003 | Padronizar no servidor as cidades e bairros existentes, sem perder regiões previamente salvas | pendente | Conferir grafias legadas e regras de migração antes de endurecer a validação server-side. |
| GEO-004 | Substituir os menus nativos de município e bairro pelo padrão visual da busca principal | pendente | Reutilizar composição branca, borda arredondada, sombra e rolagem do seletor aprovado, com busca por digitação, teclado, estados de carregamento/vazio, acessibilidade, tema escuro e celular. A digitação filtra opções, mas apenas um item oficial selecionado pode ser salvo. |
| OPP-001 | Vitrine privada de oportunidades elegíveis por região e finalidade, sem conexão prévia | pendente | RPC com CRECI-SP, MFA quando necessário, bloqueios, localização, autorização de publicidade e paginação. Não expor dados do proprietário ou leads. |
| OPP-002 | Separar “Oportunidades de Parcerias” no CRM de “Ofertas de Parceria” em Meus Imóveis | pendente | Oportunidades mostram anúncios disponíveis; Ofertas mostram negociações enviadas/recebidas. |
| OPP-003 | Ícone de aperto de mãos no menu superior, lista, grade, mapa e filtros | pendente | O ícone deve abrir diretamente Oportunidades de Parcerias para profissional elegível, também no menu móvel; não criar atalho sem destino nem confundir com Ofertas de Parceria de Meus Imóveis. Reutilizar navegação, cards e mapa existentes, inclusive estados responsivos e vazios. |
| OPP-004 | Aceite, recusa e contraproposta a partir da oportunidade; acordo cria vínculo de rede | pendente | Adaptar RPCs de negociação sem ativar anúncio ou lead antes do contrato/SGR; preservar bloqueios. |
| OPP-005 | Consentimento opcional para avisos de novas oportunidades no cadastro e perfil | pendente | Preferência persistida; aviso apenas se região/finalidade combinarem, com controle de frequência e cancelamento. |
| CAR-001 | Reutilizar condições e seleção de muitos imóveis sem contrato automático futuro | pendente | Preparação em lote para ofertas; nenhum imóvel novo entra em contrato sem seleção e aditivo. |
| CAR-002 | Um contrato de carteira por captador/parceiro com imóveis selecionados e origem SGR por imóvel | implementado_local | `20261016000002_portfolio_partnership_contracts.sql` e painel contratual; migration e teste real pendentes. |
| CAR-003 | Inclusão/exclusão via aditivo e mudança de honorários via novo contrato | implementado_local | Mesmos arquivos de CAR-002; testar revisão, rejeição, concorrência, ativação e histórico em produção. |
| CAR-004 | Condições específicas por imóvel quando necessário | pendente | Modelo atual exige termos preliminares idênticos; antes de alterar o modelo contratual, revisar o impacto em distribuição, leads e auditoria. |
| E2E-001 | Teste real com dois profissionais autorizados, incluindo publicação cruzada e proteção de leads | pendente | Sem contrato oficial de teste, não afirmar validação de ponta a ponta nem criar confirmação fictícia. |
| META-001 | Auditar a meta interrompida antes de retomá-la | pendente | Conferir status e dependências contra esta matriz e o código publicado; não presumir que a meta esteja concluída ou retomada. |

Validação local desta ampliação: `npm run lint`, `npm run build`, `node scripts/test-partnership-foundation.mjs` e `node scripts/partnership-production-preflight.mjs` passaram. Os dois scripts são verificações estruturais; não substituem o teste da API do IBGE no navegador, a execução da migration nem a validação no Supabase de produção.

## Evidências da Fase 1

- `PAR-001`: `20261012000001_partnership_network_foundation.sql`, `partnershipNetwork.ts`, `PartnershipNetworkPanel.tsx`; lint, build e `test-partnership-foundation.mjs` aprovados localmente.
- `PAR-002`: função server-side `is_eligible_sp_partnership_professional`, reutilizando aprovação, validade e ativação reais do perfil; verificação estrutural aprovada localmente.
- `PAR-004`: persistência relacional restrita a `SP`, limite de vinte regiões e filtro server-side por cidade; verificação estrutural aprovada localmente.
- `PAR-005`: finalidades de venda, locação e lançamentos, além de seis especialidades profissionais, persistidas e editáveis no perfil.
- `PAR-006`: convite, aceite, recusa, encerramento, bloqueio, denúncia privada, notificações e eventos imutáveis implementados. A fila administrativa será apresentada no painel de supervisão da Fase 8 (`ADM-001`).

## Evidências da Fase 2

- `OFR-001`: oferta única ligada ao registro canônico do imóvel e negociações independentes por parceiro em `20261012000003_property_partnership_offers.sql`.
- `OFR-002`: constraint de 100%, validação transacional e controles numérico/deslizante sincronizados em `PropertyPartnershipModal.tsx`.
- `OFR-003`: snapshots imutáveis, numeração sequencial, pai da versão, bloqueio de sobrescrita e controle por versão esperada.
- `OFR-004` a `OFR-007`: vigência, exclusividades distintas, cinco permissões de publicidade e doze responsabilidades persistidas por versão.
- Validações locais: TypeScript, build e `test-partnership-offers.mjs`. A migration e o fluxo com duas contas ainda exigem validação no Supabase de produção.

## Evidências da Fase 3

- `CTR-001`: versões contratuais canônicas com SHA-256, bucket privado, documentos originais imutáveis e decisões administrativas separadas em `20261012000004_partnership_contracts_and_sgr.sql`.
- `PAR-003`: criação, confirmação, upload, submissão ao SGR e decisão administrativa exigem sessão AAL2 no servidor.
- `CTR-004`: `20261012000005_partnership_amendments_and_lifecycle.sql` cria aditivos sobre a mesma negociação sem substituir o contrato vigente antes de nova formalização; a ativação preserva a data inicial e todo o histórico.
- `CTR-005`: encerramento unilateral respeita o aviso prévio vigente, exige motivo, MFA e concorrência e não exclui contratos ou eventos. Permanece em execução até a proteção temporal das atribuições de leads ser implementada na Fase 5.
- O Web Imóveis registra ciência e orquestra evidências; não apresenta o aceite interno como assinatura. A assinatura avançada ou superior e a consulta continuam no SGR/COFECI.
- Validações locais: TypeScript, build e `test-partnership-contracts.mjs`. `CTR-002` e `CTR-003` permanecem bloqueados externamente até validação jurídica/operacional do fluxo e teste real no SGR e no Supabase de produção.

## Evidências da Fase 4

- `DST-001`, `DST-004` e `DST-005`: `20261012000006_partner_property_distribution.sql` calcula o inventário de cada subdomínio por UUID canônico, contrato verificado, permissão, vigência, situação do imóvel e CRECIs válidos.
- `DST-002` e `DST-003`: `PropertyCard`, `HeroPropertyScene` e `PropertyDetailView` mostram o selo Parceria e identificam captador e profissional que atende no portal atual.
- O carregador consulta referências em lotes e anexa somente metadados de parceria; preço, fotos, descrição e disponibilidade continuam vindo do imóvel original.
- `DST-006`: usuário autenticado pode sinalizar informação desatualizada; o relato privado é auditável, limitado por usuário/imóvel/dia e notifica captador e parceiro sem alterar automaticamente o anúncio.
- Validações locais: TypeScript, build e `test-partner-distribution.mjs`. O comportamento real em dois subdomínios depende da aplicação das migrations e de uma parceria formalmente ativada em produção.

## Evidências da Fase 5

- `LED-001`: `20261012000007_partnership_lead_protection.sql` vincula cada contato ao imóvel, parceria, contrato vigente, portal parceiro e evento de contato, preservando snapshots e horário.
- `LED-002` e `LED-003`: o parceiro de origem recebe o lead no CRM; o captador recebe resumo sem PII e solicita campos individualmente, com finalidade, MFA, decisão do parceiro e auditoria de cada consulta.
- `LED-005`: tabelas privadas não concedem leitura direta; o resumo é paginado em até 50 registros e os detalhes só saem por RPC vinculada a uma autorização aprovada.
- A possível duplicidade usa fingerprint SHA-256 e é apenas sinalizada, sem definir direito a honorários. `LED-004` permanece em execução até existir contestação formal com respostas imutáveis.
- `CTR-005` passa a implementado local porque as atribuições apontam para a parceria com `ON DELETE RESTRICT` e sobrevivem ao término da vigência.

