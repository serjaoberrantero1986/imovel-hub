# Piloto controlado — Rede de parcerias CRECI-SP

Este roteiro deve ser executado somente depois de aplicar as migrations 1 a 10 no projeto Supabase de produção.

## Participantes

- Conta A: corretor CRECI-SP aprovado, responsável pela captação.
- Conta B: corretor CRECI-SP aprovado, parceiro em cidade/região compatível.
- Conta administradora: responsável por revisar o contrato e acompanhar a auditoria.

Não usar contas falsas, dados fictícios ou atalhos de demonstração.

## Sequência observável

1. A conta A adere à rede e seleciona apenas regiões e finalidades reais.
2. A conta A cria uma oferta para um imóvel ativo próprio, define responsabilidades e percentuais que totalizam 100%.
3. A conta B aceita a negociação preliminar.
4. Ambas conferem os termos, ativam MFA e registram a evidência externa do SGR antes da ativação.
5. A conta administradora verifica o documento, a versão, os hashes e a notificação persistente.
6. A conta B abre o subdomínio e confirma que o imóvel aparece com o selo “Parceria”, captador e CRECI-SP.
7. Um usuário autenticado envia um contato pelo portal B. A conta B recebe o lead completo; a conta A recebe somente o resumo protegido.
8. A conta A solicita campos específicos com finalidade. A conta B aprova ou rejeita com justificativa e MFA.
9. As partes criam uma visita. O OTP é emitido, o check-in solicita localização apenas no momento do ato e o check-out registra evento separado.
10. Uma das partes abre uma contestação. A outra responde. Nenhum evento ou evidência original pode ser alterado.
11. A conta administradora consulta o painel e confirma subdomínios, imóveis, leads e visitas agregados sem PII.
12. O imóvel é pausado ou a parceria é encerrada. O imóvel desaparece do portal parceiro, mas os leads e a auditoria permanecem.

## Evidências mínimas

- IDs das versões contratuais e registros externos do SGR;
- hashes de documentos e declarações;
- timestamps dos eventos;
- notificações persistentes recebidas por cada parte;
- resultado da consulta administrativa;
- captura dos estados público, parceiro, encerrado e contestado.

## Critério de aprovação

O piloto só é aprovado se todos os passos forem reproduzidos com as duas contas reais, sem acesso indevido a PII, sem duplicação do imóvel canônico e sem alteração de eventos imutáveis. Falha em qualquer etapa interrompe a abertura da rede.
