# S3 - Product Scale Readiness Plan

## Data de inicio
- 2026-03-11

## Checkpoint de execucao (2026-03-13)
- Status geral: `IN_PROGRESS` (S3 aberto, com base tecnica consolidada).
- Concluido ate agora:
  - separacao de dashboard por estado de conta (`trial`, `paid_setup`, `paid_executive`);
  - dominio de dados do Copilot criado (`copilot_*`) e migrado;
  - melhorias de resiliencia frontend para reduzir timeouts em cascata;
  - ajuste de regra de negocio para evitar bypass de limite no update de camera.
- Em aberto critico:
  - validacao em loja fisica de cameras/eventos com cobertura real;
  - SLI/SLO operacionais com baseline semanal oficial;
  - relatorio 72h com ciclo de vida completo e leitura executiva confiavel.

## Objetivo
Entrar em escala comercial com confianca operacional e de dados, sem regredir estabilidade do edge.

## Premissas de entrada
- S2 tecnico implementado:
  - source-of-truth de cameras via backend (`CAMERA_SOURCE_MODE=api_first`).
  - fallback explicito para `CAMERAS_JSON`.
  - wizard gera perfis corretos de `.env`.
- Pendencia operacional conhecida:
  - validar em loja fisica o perfil `api_first` com cameras reais.

## Escopo S3 (trilhas)
1. Confiabilidade operacional
2. Qualidade e confianca de metrica
3. Comparabilidade multi-loja
4. Prontidao comercial e suporte
5. Control Tower de Admin SaaS

## Trilha 1 - Confiabilidade operacional
### Entregaveis
- SLI/SLO por loja:
  - heartbeat freshness p95
  - camera health freshness p95
  - edge event lag p95
- Painel de incidentes com causa-raiz padronizada.

### Criterio de aceite
- 7 dias sem incidente severo sem diagnostico.
- MTTR medido e <= 30 min para incidentes de edge offline.

## Trilha 2 - Qualidade e confianca de metrica
### Entregaveis
- Score de confianca por metrica/camera.
- Pipeline de calibracao manual + historico auditavel.
- Alertas de drift por metrica.

### Criterio de aceite
- Toda metrica exibida com status `official|proxy|estimated` + score.
- Regras de bloqueio de leitura oficial quando confianca < threshold.

## Trilha 3 - Comparabilidade multi-loja
### Entregaveis
- Regra de cobertura minima para comparacao.
- Normalizacao por turno/janela.
- Ranking com guardrails (lojas fora de cobertura nao entram no ranking oficial).

### Criterio de aceite
- Comparativo oficial considera apenas lojas elegiveis.
- Relatorio deixa explicito cobertura e limitacoes.

## Trilha 4 - Prontidao comercial e suporte
### Entregaveis
- Playbook por segmento (acao sugerida + impacto esperado).
- Kit de rollout: onboarding, QA, suporte e rollback.
- Pacote de evidencias para vendas enterprise.
- Fluxo de suporte assistido para Câmeras/ROI:
  - visao do cliente com botao `Solicitar suporte` em modo leitura.
  - visao do admin interno com fila de solicitacoes e concessao de acesso temporario.
  - trilha de auditoria (`support_request_created`, `support_access_granted`, `support_request_closed`).

### Criterio de aceite
- 1 ciclo completo de rollout replicado em nova loja sem suporte ad hoc.

## Trilha 5 - Control Tower de Admin SaaS
### Entregaveis
- Jornada e blueprint de admin documentados (`20_journeys/Journey_SaaS_Admin_Control_Tower.md`).
- Tela `/app/admin` com resumo de:
  - saude da rede de lojas
  - incidentes operacionais
  - risco de billing/trial
  - confianca de dados

### Criterio de aceite
- Admin interno responde em < 5 minutos:
  - quem esta offline,
  - por que esta offline,
  - qual risco operacional/comercial prioritario.

## Plano de execucao (4 semanas)
### Semana 1
- Validacao em loja do perfil `api_first`.
- Instrumentar SLI/SLO e baseline de incidentes.

### Semana 2
- Ativar score de confianca e gates de bloqueio de leitura oficial.
- Iniciar drift alerts com thresholds por metrica.

### Semana 3
- Entregar comparabilidade multi-loja com cobertura minima.
- Publicar ranking com guardrails.

### Semana 4
- Consolidar playbooks e kit operacional/comercial.
- Revisao executiva com decisao GO/NO-GO de escala.

## Replanejamento pragmatico (proximos 10 dias uteis)
1. Trilha de valor imediato (ICP multilojista)
- consolidar `Top Acoes da Rede` no `/app/operations` com severidade + impacto + acao.
- reduzir ruido tecnico na home e reforcar recomendacao acionavel do Copilot.

2. Trilha de confiabilidade
- fechar SLI/SLO minimos: heartbeat freshness, camera freshness, event lag.
- publicar painel unico de incidentes com causa-raiz padronizada.

3. Trilha de confianca de dados
- ativar gates de elegibilidade por loja para exibir KPI oficial.
- exibir explicitamente `official | proxy | estimated` com score.

4. Trilha de suporte e rollout
- padronizar runbook de loja e pacote de evidencias para CS/suporte.
- fechar ciclo de atendimento com auditoria (solicitacao, concessao, encerramento).

## Gates GO/NO-GO
### GO para escala
- estabilidade: SLI de heartbeat/camera health dentro de meta por 7 dias.
- confianca: metricas oficiais com calibracao valida e sem drift aberto critico.
- comparabilidade: apenas lojas elegiveis entram em benchmarking oficial.
- operacao: runbooks e suporte com MTTR comprovado.

### NO-GO
- falha recorrente de source-of-truth de cameras em loja.
- metricas oficiais sem cobertura/calibracao minima.
- incidentes sem causa-raiz e sem plano de prevencao.

## Riscos e mitigacoes
- Risco: loja com rede heterogenea e NVR nao padrao.
  - Mitigacao: fallback local (`local_only`) temporario com prazo de retorno ao `api_first`.
- Risco: timeout intermitente de API afetar UX.
  - Mitigacao: cache/fallback no frontend + observabilidade backend.
- Risco: comparacoes injustas entre lojas.
  - Mitigacao: gate de cobertura minima e labels de confianca.

## Donos e cadencia
- Produto: definicao de governanca e criterios de comparabilidade.
- Backend: contratos, projecoes e observabilidade.
- Edge: ingestao, sync de cameras e resiliencia local.
- Operacoes: validacao de campo e runbooks.

Ritual semanal:
- segunda: planejamento da semana.
- quarta: checkpoint de risco.
- sexta: evidencia + decisao GO/NO-GO parcial.
