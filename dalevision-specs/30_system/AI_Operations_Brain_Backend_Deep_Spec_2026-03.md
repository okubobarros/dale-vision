# AI Operations Brain - Backend Deep Spec (DaleVision)

Data: 2026-03-16  
Status: referencia arquitetural de execucao

## 1) Resposta direta: faz sentido?
Sim, faz total sentido e esta alinhado com o caminho de produto premium.
A diferenca real de valor esta em fechar o loop:

`evento -> decisao -> acao -> outcome -> valor`

Hoje o projeto ja tem parte relevante desse loop, mas ainda faltam blocos para ficar 100% fechado e auditavel ponta a ponta.

## 2) Maturidade atual por camada

1. Vision Layer: **parcialmente pronto**
- Edge ingest e sinais operacionais ativos.
- Status de camera/loja e update events funcionando.

2. Event Layer: **bom v1, ainda hibrido**
- Envelope/eventos com idempotencia em pontos criticos.
- Ainda sem event bus unico e sem event store canonico separado em dominios.

3. Decision Layer: **v1 funcional**
- Insights e janelas operacionais existem (`OperationalWindowHourly`, `CopilotOperationalInsight`).
- Falta motor de decisao formal com score/rule trace por decisao.

4. Action Layer: **v1 funcional**
- Dispatch para n8n existe (`action_dispatched`).
- Falta endpoint dedicado para callback n8n por `event_id`.

5. Outcome Layer: **parcial**
- `ActionOutcome` existe com status e impacto.
- Falta trilha robusta de delivery (`provider_message_id`, `delivery_status`) e avaliacao pos-acao separada.

6. Value Ledger: **v1 ativo**
- `ValueLedgerDaily` e visoes store/network ativos.
- Falta `ValueLedgerEntry` por acao para granularidade de auditoria enterprise.

## 3) Arquitetura alvo (backend)

## Camada A - Ingestion API (append-only)
Objetivo: receber fatos de edge e integracoes sem bloquear pipeline.

Principios:
- request sincrono so para validar + persistir receipt + responder 200;
- processamento pesado sempre assincrono;
- idempotencia por chave obrigatoria.

Objetos:
- `EventReceipt` (ja existe no schema publico)
- `raw_events` (novo, payload bruto canonical)
- `normalized_events` (novo, evento validado e indexado)

## Camada B - Event Store / Processing State
Objetivo: fonte unica dos fatos e estado de processamento.

Novas tabelas recomendadas:
- `event_processing_state`
  - `event_id`, `normalized_at`, `projected_at`, `decided_at`, `dispatched_at`, `outcome_evaluated_at`, `ledger_posted_at`

## Camada C - Operational Projections
Objetivo: leitura rapida para app/copilot.

Projetores recomendados:
- `store_operational_state`
- `camera_operational_state`
- `network_executive_state`

Observacao: parte disso hoje esta espalhada em consultas runtime + summaries. Migrar para projection dedicada reduz custo e latencia.

## Camada D - Decision Engine
Objetivo: transformar sinal em recomendacao acionavel com explicacao.

Nova entidade:
- `decision`
  - `decision_id`, `event_id`, `store_id`, `decision_type`, `priority`, `action_required`, `recommended_action`, `confidence_score`, `impact_expected_brl`, `rule_trace`

## Camada E - Action Orchestrator
Objetivo: backend como dono da verdade de execucao.

Modelo alvo:
- `action_dispatch` (novo)
- `action_outcome` (ja existe; evoluir)

Fluxo:
- backend cria `action_dispatch`
- emite `action_dispatched` para n8n
- n8n executa canal
- callback retorna para backend
- backend atualiza `action_outcome`

## Camada F - Outcome Evaluation
Objetivo: confirmar se a acao funcionou.

Nova entidade:
- `outcome_evaluation`
  - `action_dispatch_id`, `baseline_snapshot`, `post_action_snapshot`, `resolution_status`, `evaluation_window`, `impact_estimated_brl`, `confidence_score`, `evaluation_method`

## Camada G - Value Ledger
Objetivo: monetizacao auditavel por acao.

Evolucao recomendada:
- manter `value_ledger_daily` (ja existe)
- adicionar `value_ledger_entry` (novo) por evento/acao

## 4) Mapeamento pratico: o que ja temos vs gaps

1. Ja temos
- `EdgeUpdateEvent` com idempotencia por `store_id + idempotency_key`.
- `OperationalWindowHourly`.
- `ActionOutcome`.
- `ValueLedgerDaily`.
- APIs de resumo store/network e validacao S4.

2. Gaps imediatos (prioridade alta)
- endpoint backend de callback n8n por `event_id`.
- credencial de integracao n8n com escopo minimo (`actions:write`).
- persistencia de entrega no `ActionOutcome`:
  - `provider_message_id`
  - `delivery_status`
  - `delivery_error` (opcional)
- visualizacao de funil no frontend:
  - `dispatched -> delivered -> completed -> failed`.

## 5) APIs alvo por dominio

## Ingestion API
- `POST /api/v1/events/ingest/` (novo canonico, opcional fase 2)

## Decision API
- `GET /api/v1/decisions/stores/:store_id/` (novo)
- `POST /api/v1/decisions/:decision_id/dispatch/` (novo)

## Action API
- `POST /api/v1/actions/dispatch/` (novo canonico; pode apontar para fluxo atual de alerts)
- `POST /api/v1/actions/outcomes/callback/` (novo; n8n -> backend por `event_id`)
- `PATCH /api/v1/actions/outcomes/:id/` (ja existe equivalente em copilot detail)

## Ledger API
- `GET /api/v1/ledger/stores/:store_id/entries/` (novo)
- `GET /api/v1/ledger/network/daily/` (ja existe equivalente via copilot/value-ledger network)

## 6) Jobs/filas assincronas necessarias

Filas logicas:
- `events.normalize`
- `events.project`
- `decisions.evaluate`
- `actions.dispatch`
- `outcomes.evaluate`
- `ledger.post`

Jobs periodicos:
- projection refresh / reconciliation
- stale incident scanner
- daily ledger close

## 7) Seguranca e multi-tenant

Obrigatorio em todas entidades centrais:
- `org_id`
- `store_id` (quando aplicavel)

Obrigatorio em toda query critica:
- escopo por tenant sem excecao

Credencial n8n:
- token de servico dedicado
- escopo minimo (`actions:write`)
- rotacao e expiracao

## 8) Observabilidade da propria plataforma

SLOs recomendados:
- ingest success rate >= 99.9%
- decision latency p95 <= 5s
- dispatch callback success >= 99%
- outcome closure <= 15 min (janela alvo)
- ledger freshness <= 15 min

Métricas executivas:
- revenue_protected
- operational_loss_avoided
- completion_rate
- delivery_rate
- time_to_action
- time_to_recovery

## 9) Plano de execucao por sprint (alinhado ao plano atual)

## Sprint 2 (fechamento de loop de acao)
- [ ] endpoint callback n8n por `event_id`
- [ ] token servico n8n
- [ ] campos de delivery em `ActionOutcome`
- [ ] funil `dispatched/delivered/completed/failed` em Dashboard/Reports

## Sprint 3 (decision hardening)
- [ ] entidade `decision` + `rule_trace`
- [ ] scoring conservador de impacto financeiro com confianca
- [ ] projection dedicada de estado operacional

## Sprint 4 (outcome + ledger granular)
- [ ] `outcome_evaluation`
- [ ] `value_ledger_entry`
- [ ] playbooks por tipo de incidente

## Sprint 5 (enterprise scale)
- [ ] particionamento/retencao de event store
- [ ] benchmark multi-loja por segmento
- [ ] governance pack para investidor/enterprise

## 10) Regra estrategica de produto
Nao evoluir mais no modelo:
`alerta -> mensagem -> dashboard`

Evoluir no modelo:
`evento -> decisao -> acao -> resultado -> valor`

Essa e a base para posicionar a DaleVision como:
`AI Operations System for Physical Retail`

