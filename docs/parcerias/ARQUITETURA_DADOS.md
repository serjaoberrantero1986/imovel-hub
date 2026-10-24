# Arquitetura Inicial de Dados e Segurança

Este documento define direção e invariantes. Os nomes finais de tabelas e funções serão confirmados em cada fase antes da migration correspondente.

## 1. Reutilização do schema atual

- `profiles`: identidade, papel, CRECI, UF, revisão, validade e atividade;
- `properties`: registro canônico do imóvel e captador em `user_id`;
- `property_locations`: validação server-side de `state = 'SP'`;
- `leads`: contato original, futuramente acrescido de atribuição da parceria por estrutura relacional;
- `notifications`: avisos persistentes;
- `crm_interactions` e `crm_tasks`: reflexos operacionais, sem substituir eventos jurídicos;
- `portal_settings`: identifica o portal parceiro que originou exibição e lead;
- fluxos atuais de CRECI, MFA e auditoria: pré-requisitos reutilizados.

Não armazenar contratos, percentuais, permissões ou responsabilidades em `profiles.settings`, `properties` ou `leads.meta`. Dados essenciais e consultáveis exigem tabelas, constraints e RLS próprias.

## 2. Entidades planejadas

### `partnership_network_members`

Adesão voluntária, disponibilidade, regiões e especialidades. Uma linha por perfil. Somente corretor/imobiliária ativa, CRECI-SP aprovado e dentro da validade.

### `partnership_member_regions`

Municípios e bairros reais do Estado de São Paulo escolhidos pelo membro. A origem do catálogo territorial deve ser real e versionada; listas fictícias são proibidas.

### `partnership_connections`

Convites e relacionamento entre membros: pendente, aceito, recusado, bloqueado ou encerrado. Conexão não concede acesso a imóveis.

### `property_partnership_offers`

Oferta do captador ligada a um único `properties.id`. Define quem pode recebê-la e se admite um ou vários parceiros. Não duplica conteúdo do imóvel.

### `property_partnerships`

Relação entre oferta, captador, parceiro e versão contratual vigente. O estado `active` só pode ser alcançado por RPC transacional depois dos requisitos documentais.

### `partnership_contract_versions`

Snapshot imutável dos termos. Guarda percentuais, vigência, exclusividades, publicidade, responsabilidades, hash, storage path privado, identificadores de assinatura e SGR. Atualização é proibida após proposta; aceite e assinatura são eventos relacionados.

### `partnership_contract_acceptances`

Aceite preliminar e assinatura de cada parte, com versão, sujeito, papel, horário do servidor, AAL, hash do documento e referência do provedor. Não armazena segredo, token bruto ou material criptográfico privado.

### `partnership_events`

Log append-only de propostas, contrapropostas, aceitações, assinaturas, ativação, suspensão, encerramento e contestação. Atores comuns não recebem `UPDATE` ou `DELETE`.

### `partnership_property_publications`

Materializa, se necessário para desempenho, a autorização de exibir um imóvel em determinado portal. Deve ser derivada da parceria ativa e nunca ser a fonte da verdade. Consulta pública sempre revalida status do imóvel, perfil e contrato.

### `partnership_lead_assignments`

Liga o lead à propriedade, portal de origem, parceiro, captador e versão contratual vigente na criação. Esses vínculos não mudam retroativamente.

### `partnership_lead_access_events`

Loga visualização e liberação de dados pessoais sensíveis ao contexto. Sem acesso público e sem exposição de detalhes técnicos ao usuário final.

### `property_visits`

Agenda, participantes, status, parceria, lead e propriedade. Não armazena percurso.

### `property_visit_events`

Eventos append-only de confirmação, check-in, check-out, ausência, conclusão e cancelamento. Localização, quando presente, é pontual e acompanha precisão e finalidade.

### `property_visit_confirmations`

Confirmação do interessado por código de uso único. Armazena somente hash do código, tentativas, expiração, consumo e resultado; nunca o código em texto puro.

### `property_visit_receipts`

Snapshot do comprovante, versão da declaração e hash. O documento não afirma prova definitiva e não usa biometria.

### `property_visit_disputes`

Contestações e respostas sem apagar a visita ou o comprovante original.

## 3. Invariantes server-side

1. IDs nativos UUID gerados por `gen_random_uuid()` no banco ou `crypto.randomUUID()` no cliente quando necessário.
2. Captador é `properties.user_id`; não pode ser redefinido pela parceria.
3. Captador e parceiro são distintos.
4. Ambos têm papel `broker` ou `agency`, `is_active = true`, `creci_uf = 'SP'`, revisão aprovada e não expirada.
5. A localização canônica do imóvel tem `state = 'SP'`.
6. Percentuais são inteiros ou decimais em intervalo definido, não negativos, e somam exatamente 100.
7. Somente o captador cria oferta; ambas as partes participam da negociação e assinatura.
8. Operações contratuais exigem sessão AAL2.
9. Versão proposta ou assinada não aceita `UPDATE` ou `DELETE`.
10. Nenhuma parceria ativa sem duas assinaturas válidas, hash compatível e comprovação SGR.
11. Somente propriedades `active` aparecem publicamente; pausa, venda, locação, arquivo ou exclusão removem a exibição derivada.
12. RLS nunca confia em IDs de perfil enviados pelo cliente quando `auth.uid()` determina o ator.
13. Funções `SECURITY DEFINER` fixam `search_path`, revogam `PUBLIC`/`anon` e validam o ator internamente.
14. Administração exige papel administrativo e produz auditoria/notificação na mesma transação.
15. Exclusão de conta não apaga contratos, eventos ou comprovantes com obrigação de retenção; dados pessoais devem ser minimizados ou pseudonimizados segundo a política aprovada.

## 4. RLS prevista

- público: somente projeção de imóveis ativos e parcerias ativas, sem termos contratuais, leads, endereço exato oculto ou documentos;
- captador: suas ofertas, contratos, eventos e leads no limite definido;
- parceiro: propostas destinadas a ele, contratos dos quais participa e leads originados/atribuídos;
- interessado autenticado: seus próprios dados e confirmações de visita;
- administrador: acesso por RPC auditada, evitando políticas genéricas de leitura irrestrita;
- service role: somente rotinas de backend explicitamente autorizadas.

## 5. Storage previsto

Buckets privados separados por finalidade:

- contratos e comprovantes de assinatura;
- comprovantes do SGR;
- comprovantes de visita;
- anexos de contestação.

Arquivos são acessados por URL assinada curta, com verificação de participação antes da emissão. Não armazenar documentos jurídicos em buckets públicos. Documentos enviados seguem o modo documental de `editUserImage/ImageEditorModal`; PDFs preservam o fluxo documental.

## 6. Concorrência e idempotência

- propostas carregam `revision` ou `updated_at` esperado;
- aceitação bloqueia a versão `FOR UPDATE`;
- chamadas repetidas retornam o resultado existente ou erro de estado compreensível;
- contraproposta concorrente nunca sobrescreve outra;
- ativação, suspensão e encerramento são transacionais;
- eventos usam chave idempotente quando originados por webhook de assinatura.

## 7. Geolocalização e visitas

- o navegador solicita permissão somente após ação de check-in/check-out;
- não existe `watchPosition` persistente;
- armazenar coordenada, precisão, horário do servidor e finalidade;
- distância ao imóvel é evidência contextual, não decisão absoluta;
- GPS insuficiente permite confirmação manual justificada;
- OTP tem validade curta, limite de tentativas, hash e uso único;
- assinatura desenhada pode ser anexada apenas como manifestação visual, nunca analisada biometricamente; a primeira versão deve preferir OTP e declaração versionada;
- comprovantes e localização seguem retenção aprovada e acesso restrito.

### Implementação unificada em 24/10/2026

`partnership_visits` passou a representar visitas de imóveis próprios e em parceria sem apagar os registros anteriores. `responsible_id`, `source_origin`, o snapshot do imóvel/portal e a chave idempotente definem o contexto da solicitação; horários, confirmações, presença, chegada e conclusão permanecem campos distintos.

As mutações são feitas por RPCs transacionais. O cliente não recebe o código de presença: a Edge Function autenticada gera o código, envia ao e-mail verificado e persiste somente o hash por uma RPC exclusiva de `service_role`. O interessado confirma na própria sessão. Eventos, comprovante, contestações e respostas são anexados; remarcação incrementa a revisão e conserva os valores anteriores no histórico.

A coordenada exata do imóvel é copiada para um snapshot privado apenas quando a qualidade cadastral permite comparação. O navegador usa `getCurrentPosition` depois do clique e envia precisão declarada pelo dispositivo. Ausência de GPS não bloqueia a visita: o profissional pode registrar uma declaração manual identificada, e a conclusão também funciona sem nova localização.

## 8. Integrações externas

Nenhuma integração deve ser simulada. Até existir integração oficial comprovada:

- SGR: permitir envio e verificação administrativa do comprovante real, sem alegar validação automática;
- assinatura: selecionar provedor somente após validar assinatura avançada ou qualificada, webhooks, autenticação, evidências, LGPD e custos;
- mapas/geocodificação: reutilizar a infraestrutura real existente e não registrar chaves no cliente ou repositório.

## 9. Impactos conhecidos em rotinas existentes

- consulta pública de propriedades deverá considerar o portal acessado e autorizações ativas;
- criação de lead deverá registrar captador, parceiro, portal e contrato vigente atomicamente;
- exclusão de conta precisará respeitar retenção contratual e liberar acessos sem apagar evidências;
- revisão/revogação de CRECI deverá suspender novas operações e distribuições, preservando histórico;
- notificações de parceria usarão o mecanismo persistente existente, com novos escopos e RPCs específicas;
- a landing page somente poderá divulgar os recursos após validação em produção.

