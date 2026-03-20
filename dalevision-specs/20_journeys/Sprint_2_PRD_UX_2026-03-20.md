# Sprint 2 PRD - Refino de Experiencia (P0/P1)

Data: `2026-03-20`
Origem: `Journeys_UX_Refinement_Matrix_2026-03-20.md`
Objetivo do sprint: reduzir ruido operacional, padronizar fechamento de acao e manter contexto de loja entre modulos.

Itens do sprint: `UX-04`, `UX-06`, `UX-05`, `UX-08`.

## Escopo e entregaveis
1. Fluxo padrao para diagnostico de cameras por causa.
2. Encerramento guiado de alertas para Store Staff.
3. Indicador de qualidade de alerta com sugestao de ajuste de regra.
4. Persistencia de contexto (`store_id`) entre operacoes, cameras e alertas.

## Item UX-04 - Diagnostico de Cameras por Causa

## Problema
Falhas de camera (RTSP/credencial/saude) geram tentativa e erro sem trilha clara.

## Rotas
- `/app/cameras`
- `/app/edge-help`
- `/app/operations/stores/:storeId`

## User story
Como `Admin`, quero seguir um fluxo padronizado de diagnostico para recuperar camera sem retrabalho.

## Requisitos funcionais
1. Classificar falha por causa provavel (`credencial`, `conectividade`, `stream`, `heartbeat`).
2. Exibir proxima acao recomendada por causa.
3. Permitir validar resultado da correcao na mesma experiencia.

## Criterios de aceite
1. Toda camera com falha exibe causa primaria e acao recomendada.
2. Usuario consegue executar `diagnosticar -> corrigir -> validar` sem trocar contexto manual.
3. Logs de falha tecnica disponiveis para suporte.

## Tracking
- `camera_diagnosis_viewed`
- `camera_diagnosis_action_clicked`
- `camera_diagnosis_resolved`

## Item UX-06 - Encerramento Guiado de Alertas (Store Staff)

## Problema
Staff nao tem clareza de qual desfecho registrar e quando escalar.

## Rotas
- `/app/alerts`
- `/app/alerts/history`

## User story
Como `Store Staff`, quero encerrar alertas com opcoes claras para manter rastreabilidade do turno.

## Requisitos funcionais
1. Exibir 3 desfechos padrao: `resolvido localmente`, `delegado`, `incidente tecnico`.
2. Exigir motivo curto quando `delegado` ou `incidente tecnico`.
3. Sincronizar historico de desfecho automaticamente.

## Criterios de aceite
1. Todo alerta fechado possui desfecho valido.
2. Fluxo de encerramento executavel em ate 2 interacoes.
3. Historico em `/app/alerts/history` reflete desfecho e ator.

## Tracking
- `alert_resolution_started`
- `alert_resolution_completed`
- `alert_resolution_escalated`

## Item UX-05 - Qualidade de Alerta + Sugestao de Regra

## Problema
Volume de alerta nao diferencia sinal util de ruido.

## Rotas
- `/app/alerts`
- `/app/alerts/rules`
- `/app/alerts/history`

## User story
Como `Admin`, quero ver qualidade do alerta e sugestao de ajuste para reduzir fadiga operacional.

## Requisitos funcionais
1. Exibir score de qualidade por regra (ex.: baixo/medio/alto).
2. Sugerir ajuste de threshold/cooldown com base no historico.
3. Permitir aplicar sugestao com confirmacao.

## Criterios de aceite
1. Cada regra possui indicador de qualidade visivel.
2. Sugestao de ajuste aparece quando ruido ultrapassar limiar definido.
3. Aplicacao do ajuste registra trilha de alteracao.

## Tracking
- `alert_rule_quality_viewed`
- `alert_rule_suggestion_shown`
- `alert_rule_suggestion_applied`

## Item UX-08 - Persistencia de Contexto por store_id

## Problema
Ao trocar entre operacoes/cameras/alertas, contexto da loja se perde.

## Rotas
- `/app/operations/stores/:storeId`
- `/app/cameras?store_id=...`
- `/app/alerts?store_id=...`

## User story
Como `Admin`, quero manter contexto da loja ao navegar entre modulos para reduzir friccao.

## Requisitos funcionais
1. Deep links entre modulos preservando `store_id`.
2. Breadcrumb operacional com loja atual.
3. Fallback seguro quando `store_id` nao estiver disponivel.

## Criterios de aceite
1. Navegacao cruzada preserva `store_id` em 100% dos links principais.
2. Breadcrumb exibe loja atual e modulo.
3. Sem `store_id`, sistema orienta selecao de loja sem erro.

## Tracking
- `store_context_link_clicked`
- `store_context_preserved`
- `store_context_missing_fallback`

## Fora do escopo deste sprint
- Severidade global S1-S4 (Sprint 3).
- Template unico de evidencia de calibracao (Sprint 3).

## Definicao de pronto (Sprint 2)
1. Fluxos de camera e alerta com encerramento guiado ativos.
2. Qualidade de alerta visivel e acionavel em regras.
3. Navegacao cross-modulo mantendo contexto de loja.
4. Eventos de tracking validados com baseline de ruido e tempo de resolucao.
