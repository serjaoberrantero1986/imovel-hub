# Plano Mestre — Rede de Parcerias Web Imóveis

## 1. Objetivo

Implementar uma rede opcional de parcerias entre corretores e imobiliárias credenciados no CRECI-SP, mantendo o Web Imóveis como provedor de tecnologia. A plataforma não define honorários, não escolhe o parceiro, não recebe sinal, não custodia ou divide comissões e não substitui as partes na intermediação.

O objetivo somente estará concluído quando contratos versionados, distribuição sincronizada, identificação pública, proteção de leads, visitas e auditoria estiverem implementados e validados em produção.

## 2. Princípios obrigatórios

1. A participação na rede é voluntária e revogável.
2. A primeira versão aceita apenas profissionais com CRECI-SP aprovado, ativo e não expirado.
3. A primeira versão aceita apenas imóveis localizados no Estado de São Paulo.
4. Entrar na rede não autoriza a divulgação automática da carteira.
5. Cada imóvel possui um único registro e um único captador responsável pelos dados objetivos.
6. Portais parceiros exibem referências autorizadas; nunca criam cópias do imóvel.
7. A parceria só se torna ativa depois da assinatura eletrônica adequada e da comprovação de registro/documento no SGR.
8. Um clique em "Aceito" encerra a negociação da proposta, mas não substitui a assinatura exigida.
9. Contratos assinados e históricos são imutáveis. Mudanças geram nova versão.
10. O captador controla preço, fotos, descrição, disponibilidade e status; alterações refletem em todos os portais autorizados.
11. Leads são compartilhados progressivamente, pelo mínimo necessário e com trilha de acesso.
12. Visitas coletam localização apenas no check-in e, opcionalmente, no check-out; não existe rastreamento contínuo.
13. A primeira versão não processa biometria, reconhecimento facial ou características biométricas de assinatura.
14. A plataforma preserva evidências e contestações, mas não decide o direito material à comissão.
15. Toda operação privilegiada ocorre em função transacional do Supabase, com RLS, concorrência e auditoria.

## 3. Papéis

### Captador

- detém a autorização original de intermediação;
- mantém os dados e o status do imóvel;
- propõe divisão dos honorários, prazo, publicidade e responsabilidades;
- aprova ou recusa contrapropostas;
- comprova o contrato original e as permissões de publicidade.

### Parceiro vendedor

- aceita, recusa ou contrapropõe;
- divulga o imóvel apenas no escopo autorizado;
- atende os leads originados no seu portal;
- executa somente as responsabilidades contratadas;
- não altera os dados objetivos do imóvel nem repassa a autorização.

### Interessado

- recebe informação clara sobre captador e parceiro;
- escolhe os canais de contato autorizados;
- confirma ou contesta visitas sem coerção;
- exerce os direitos previstos na LGPD.

### Administrador Web Imóveis

- verifica requisitos cadastrais e evidências técnicas;
- modera denúncias e suspende preventivamente quando justificado;
- não define honorários nem decide disputas materiais de comissão;
- toda decisão exige justificativa, concorrência, auditoria e notificação persistente.

## 4. Ciclo da parceria

`rascunho` → `proposta_enviada` → `contraproposta` → `acordo_preliminar` → `aguardando_assinaturas` → `aguardando_sgr` → `ativa` → `suspensa`, `expirada`, `encerrada` ou `contestada`.

Regras:

- somente `ativa` permite exibição no portal parceiro e compartilhamento operacional de leads;
- uma nova proposta não altera o contrato vigente até ser assinada e comprovada;
- cancelamento não apaga a atribuição de leads recebidos durante a vigência;
- suspensão do CRECI, retirada da autorização, status não público do imóvel ou vencimento bloqueiam a distribuição imediatamente;
- cada parceiro possui contrato independente, mesmo quando o imóvel admite múltiplos parceiros.

## 5. Conteúdo contratual mínimo

- partes e respectivos CRECIs;
- referência ao contrato de corretagem original;
- imóvel objeto da parceria;
- exclusividade do contrato original e exclusividade da parceria;
- percentual dos honorários do captador e do parceiro, totalizando 100%;
- responsável pelo recebimento e repasse dos honorários;
- vigência e antecedência de encerramento;
- publicidade permitida;
- território;
- matriz de responsabilidades;
- tratamento de leads e dados pessoais;
- efeitos sobre interessados apresentados durante a vigência;
- cancelamento, contestação e prestação de contas;
- identificador, hash e comprovante do SGR;
- versão aceita por cada parte.

## 6. Matriz de responsabilidades

Cada item aceita `captador`, `parceiro` ou `ambos`:

- relacionamento com o proprietário;
- relacionamento com comprador ou locatário;
- agendamento de visita;
- acompanhamento da visita;
- recebimento da proposta;
- apresentação da proposta ao proprietário;
- negociação;
- coleta e conferência documental;
- encaminhamento do instrumento da transação;
- assinatura e fechamento;
- entrega de chaves;
- prestação de contas dos honorários.

## 7. Distribuição pública

Anúncios autorizados exibem selo discreto `Parceria` e, no mínimo:

- nome e CRECI-SP do captador;
- nome e CRECI-SP do parceiro que atende no portal atual;
- data da última atualização;
- informação de que disponibilidade e dados são mantidos pelo captador;
- ação para comunicar informação desatualizada.

O rodapé do portal não substitui a identificação dos papéis no card e na página do imóvel.

## 8. Leads

- o portal de origem define o parceiro responsável pelo primeiro atendimento;
- o captador recebe notificação e inicialmente somente os dados necessários;
- acesso aos dados completos depende da finalidade e da etapa do atendimento;
- todo acesso sensível deve ser auditado;
- duplicidades são resolvidas por fatos registrados, sem decisão automática sobre honorários;
- exportação em massa fica bloqueada na primeira versão;
- encerramento da parceria revoga acessos futuros e preserva evidências necessárias ao exercício regular de direitos.

## 9. Visitas

Fluxo: solicitação → confirmação do interessado → check-in pontual → código de uso único → visita → check-out opcional → comprovante → eventual contestação.

Evidências permitidas:

- imóvel, parceria e lead;
- participantes;
- horários do servidor;
- coordenadas e precisão declarada pelo dispositivo;
- distância calculada em relação ao imóvel;
- sessão autenticada;
- confirmação por código de uso único;
- declaração exibida e sua versão;
- hash do comprovante;
- contestações e respostas.

Proibições iniciais:

- rastreamento de percurso;
- coleta silenciosa em segundo plano;
- reconhecimento facial;
- análise biométrica da assinatura;
- exigir localização ou assinatura como condição absoluta para visitar;
- afirmar que o registro constitui prova jurídica definitiva.

## 10. Fases e portas de qualidade

### Fase 0 — especificação e conformidade

- plano mestre, matriz e arquitetura;
- parecer jurídico imobiliário, digital, trabalhista e de consumo;
- validação do fluxo com CRECI-SP/COFECI e SGR;
- RIPD/LIA e política de retenção;
- aprovação antes da primeira migration.

### Fase 1 — fundação

- adesão, regiões, especialidades, descoberta, convites, bloqueio e denúncia;
- CRECI-SP e MFA obrigatórios;
- RLS, funções e auditoria.

### Fase 2 — ofertas e negociação

- oferta por imóvel, percentuais sincronizados, responsabilidades, vigência, publicidade, contraproposta e aceite preliminar.

### Fase 3 — contratos

- versões imutáveis, PDF, assinatura avançada ou superior, SGR, ativação, suspensão e encerramento.

### Fase 4 — distribuição

- selo, identificação, consulta por tenant, sincronização e retirada imediata.

### Fase 5 — leads

- atribuição, compartilhamento progressivo, duplicidade, auditoria e notificações.

### Fase 6 — visitas

- agenda, confirmação, geolocalização pontual, comprovante e contestação.

### Fase 7 — propostas e fechamento

- propostas, tarefas, documentos, resultado e prestação de contas documental, sem movimentação financeira.

### Fase 8 — administração e piloto

- supervisão, denúncias, incidentes, relatórios e piloto controlado no CRECI-SP.

### Fase 9 — landing page SaaS

- divulgar apenas capacidades que estiverem implementadas e validadas.

## 11. Critério de conclusão de cada fase

Uma fase exige, quando aplicável:

- migration idempotente;
- RLS e privilégios mínimos;
- funções transacionais e controle de concorrência;
- tipos TypeScript e serviços;
- interfaces responsivas em tema claro/escuro;
- acessibilidade e estados vazio, carregando, erro e sucesso;
- toasts e notificações persistentes;
- auditoria e retenção;
- testes de unidade, integração e autorização negativa;
- build de produção;
- migration aplicada pelo responsável;
- teste real autorizado em produção;
- atualização da matriz de rastreabilidade.

## 12. Dependências externas que bloqueiam ativação, não desenvolvimento

- parecer jurídico dos contratos e termos;
- confirmação do procedimento esperado pelo CRECI-SP/COFECI;
- definição de integração ou comprovação manual do SGR;
- escolha de provedor de assinatura avançada/qualificada, caso o SGR não cubra todo o fluxo;
- aprovação do RIPD/LIA e dos prazos de retenção;
- textos legais finais em português do Brasil.

