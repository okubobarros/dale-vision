# Diagnóstico de Dados e Alinhamento Produto (DB + Frontend + PDF)

Data: 2026-03-19  
Escopo: banco atual, consumo no frontend, contrato alvo do documento técnico (`Dale Vision Product & Technical_Document.pdf`).

## 1) Skills aplicadas
- `analytics-product`: avaliação de métricas de produto, ciclo de valor e North Star.
- `analytics-tracking` (assumindo seu "analytics-tracing"): qualidade de instrumentação e confiabilidade de sinal.
- `computer-vision-expert`: análise de ontologia/eventos de visão e cobertura operacional.
- `ml-engineer`: prontidão de dados para copiloto/ações estratégicas e feedback loop.

## 2) Snapshot real do banco (produção atual)

### 2.1 Inventário
- Tabelas no `public`: **62**.
- Modelos Django mapeados: **48**.
- Tabelas com maior volume:
  - `event_receipts`: 7813
  - `camera_health_logs`: 4390
  - `edge_event_minute_stats`: 3780
  - `traffic_metrics`: 2289
  - `conversion_metrics`: 2287
  - `vision_atomic_events`: 1597

### 2.2 Frescor de dados (pipeline vivo)
- `vision_atomic_events.max(ts)`: ~6.3 min atrás.
- `event_receipts.max(ts)`: ~6.3 min atrás.
- `traffic_metrics.max(ts_bucket)`: ~8.0 min atrás.
- `conversion_metrics.max(ts_bucket)`: ~6.5 min atrás.
- `edge_event_minute_stats.max(last_event_at)`: ~5.8 min atrás.

Conclusão: há ingestão ativa e quase em tempo real.

### 2.3 Qualidade estrutural (campos críticos)
- `vision_atomic_events`:
  - `store_id/camera_id/event_type/ts/metric_type/ownership/roi_entity_id`: sem nulos relevantes no dataset atual.
  - `confidence` fora de faixa [0..1]: 0.
- `traffic_metrics`:
  - sem valores negativos detectados.
  - sem duplicidade na chave lógica (`store_id, ts_bucket, zone_id, camera_id`).
- `conversion_metrics`:
  - sem negativos.
  - sem duplicidade na chave lógica (`store_id, ts_bucket, camera_id, metric_type, roi_entity_id`).
  - **gap importante**: `metric_type` nulo em **1507/2287 (~66%)**.
- `event_receipts`:
  - `event_id/ts/store_id` presentes (via `meta/raw`) no dataset atual.
  - **gap importante**: `processed_at` nulo em **7813/7813 (100%)**.

## 3) Quais dados o frontend usa hoje (de fato)

Foram identificados **74 endpoints** no frontend (`frontend/src`) com `api.get/post/...`.

### 3.1 Domínios mais críticos para o produto
- Operação/visão:
  - `/v1/stores/{storeId}/metrics/summary`
  - `/v1/stores/{storeId}/vision/audit`
  - `/v1/stores/{storeId}/vision/confidence`
  - `/v1/stores/{storeId}/vision/ingestion-summary`
  - `/v1/stores/network/vision/ingestion-summary`
- Dashboard/report:
  - `/v1/stores/{storeId}/dashboard`
  - `/v1/stores/network_dashboard`
  - `/v1/report/summary`, `/v1/report/impact`, `/v1/productivity/coverage`
- Alertas:
  - `/alerts/events/`, `/alerts/alert-rules/`, `/alerts/notification-logs/`
- Copilot:
  - `/v1/copilot/stores/{storeId}/context|insights|report-72h|conversations|actions/outcomes|value-ledger/daily`

### 3.2 Tabelas que realmente alimentam essas rotas
- Núcleo visão/KPI: `vision_atomic_events`, `event_receipts`, `traffic_metrics`, `conversion_metrics`.
- Saúde operacional: `edge_event_minute_stats`, `camera_health_logs`, `cameras`, `stores`.
- Alertas: `detection_events`, `alert_rules`, `notification_logs`, `event_media`.
- Copilot: `operational_window_hourly`, `copilot_*`, `action_outcome`, `value_ledger_daily`.

## 4) Comparação com o documento técnico (PDF)

## 4.1 O que está alinhado
- Arquitetura orientada a eventos edge-first está implementada.
- Há dedupe/idempotência por `event_id` em `event_receipts`.
- Há camadas de dados para operação e analytics near-real-time (`vision_atomic_events` + métricas agregadas em `traffic_metrics/conversion_metrics`).
- Há APIs de auditoria/ingestão/confiança para visão.

## 4.2 Gaps de contrato/formato (alto impacto)
1. **Nomes/contrato de evento não padronizados com o catálogo-alvo**
- PDF usa padrão `vision.queue_state.v1` etc.
- Em `event_receipts.event_name`, hoje predominam nomes normalizados com `_` (`vision_queue_state_v1`, `vision_metrics_v1`), dificultando governança semântica.

2. **Ausência de tabelas-alvo do documento**
- Esperadas no PDF: `vision_events_raw`, `vision_features_1m`, `store_kpis_daily`, `alerts_log`.
- Estado atual: usa `vision_atomic_events`, `traffic_metrics`, `conversion_metrics`, `detection_events`/`notification_logs`.
- Não é necessariamente errado, mas falta um "data contract mapping" oficial (`as-is` -> `target`).

3. **Conversão ainda é proxy e não reconcilia PDV**
- `conversion_rate` hoje deriva de `checkout_events / footfall` em várias consultas.
- No PDF, KPI de negócio exige reconciliação com `transactions`/`sales_total`.
- `sales_metrics` está vazio (0 linhas).

4. **`processed_at` em `event_receipts` não é usado**
- Sem fechamento claro de processamento por evento, limita rastreabilidade de SLA fim-a-fim.

5. **Cobertura desigual por tipo de evento CV**
- `vision.crossing.v1` quase inexistente (3 eventos) vs `queue_state`/`zone_occupancy` altos.
- Impacta diretamente confiança de `flow_in/out` e métricas derivadas.

6. **Copilot sem histórico operacional suficiente**
- `copilot_operational_insights`, `copilot_reports_72h`, `action_outcome`, `value_ledger_daily`: 0 linhas.
- Sem loop fechado (Ação -> Resultado -> ROI), copiloto não atua estrategicamente ainda.

## 4.3 Gaps de qualidade CV (contra critérios de aceite do PDF)
- Catálogo-alvo pede cobertura robusta de `flow_in/out`, `queue`, `occupancy`, `dwell`.
- Dados atuais mostram:
  - forte em `queue_state` e `zone_occupancy`;
  - fraco em `crossing` (fluxo), logo `conversion_rate` fica frágil;
  - sinais de semântica inconsistente (`metric_type` nulo em massa em `conversion_metrics`).

## 5) Measurement Readiness & Signal Quality Index (0-100)

Pontuação diagnóstica atual: **57/100 (Unreliable)**

- Decision Alignment: 17/25
- Event Model Clarity: 11/20
- Data Accuracy & Integrity: 12/20
- Conversion Definition Quality: 7/15
- Attribution & Context: 5/10
- Governance & Maintenance: 5/10

Interpretação: há sinal operacional vivo, mas ainda não está robusto o suficiente para decisões estratégicas de receita/ROI em escala.

## 6) O que falta para dados confiáveis espelharem a operação (ICP)

1. **Contrato canônico de eventos (v1) com validação estrita**
- Campos obrigatórios por tipo.
- `event_name` padronizado (dot notation) + `schema_version` obrigatório.
- rejeição explícita/telemetria para payload fora do contrato.

2. **Reconciliação CV x PDV para conversão real**
- Popular `sales_metrics`/`transactions_total`.
- Definir `conversion_rate_official` e `conversion_rate_proxy` com governança clara.

3. **Materialização de KPI diário auditável**
- Criar tabela equivalente a `store_kpis_daily` (ou mapear formalmente para estrutura existente).
- Persistir `money_at_risk` com lineage de inputs e versão de fórmula.

4. **Fechar ciclo de execução do Copilot**
- Garantir geração contínua de `copilot_operational_insights`.
- Persistir `action_outcome` e `value_ledger_daily` com callback de resultado real.
- Meta: `% alertas com ação + melhoria mensurável` (métrica-chave do PDF).

5. **QA de visão por câmera/ROI**
- Aumentar cobertura de `vision.crossing.v1` em câmeras de entrada.
- Rodar plano de calibração por métrica (`store_calibration_runs`) com aceite por erro.

6. **SLOs de pipeline monitoráveis**
- `event -> KPI` p95 < 120s.
- perda de evento < 0.1%.
- `edge offline` e `camera offline` dentro dos tempos-alvo.

## 7) To-do list priorizada (execução)

## Fase 0 - 3 dias (fundação de confiabilidade)
- [ ] Definir e versionar `event_contract_v1` (campos, tipos, enum e naming).
- [ ] Normalizar `event_name` para padrão canônico no ingest (sem quebrar retrocompatibilidade).
- [ ] Tornar obrigatório `metric_type` em `conversion_metrics` no pipeline.
- [ ] Implementar atualização de `event_receipts.processed_at` quando projeções forem aplicadas.

## Fase 1 - 1 semana (métrica oficial e governança)
- [ ] Introduzir `metric_status` oficial/proxy/estimated em payload de todas APIs de KPI.
- [ ] Criar `kpi_daily` (ou view materializada) com: `flow_in`, `transactions`, `conversion_rate_official`, `money_at_risk`.
- [ ] Ligar integração PDV mínima para `transactions_total` e `avg_ticket`.
- [ ] Dashboard de data quality por loja: freshness, completude, duplicidade, cobertura por evento.

## Fase 2 - 2 semanas (copiloto estratégico)
- [ ] Habilitar geração recorrente de `operational_window_hourly` e `copilot_operational_insights`.
- [ ] Forçar trilha Action -> Outcome -> Value Ledger (`action_outcome`, `value_ledger_daily`).
- [ ] Publicar ranking de insights por impacto esperado x confiança x executabilidade.
- [ ] Definir NSM operacional: `% alertas úteis (ação + melhoria)` por loja/segmento.

## Fase 3 - 2 a 4 semanas (qualidade CV de produção)
- [ ] Programa de calibração por câmera para `flow_in/out`, `queue`, `occupancy`, `dwell`.
- [ ] Critérios de aceite automáticos (erro/estabilidade) com bloqueio de promoção de modelo.
- [ ] Monitor de drift por câmera/turno (iluminação, oclusão, mudança de layout).

## 8) Risco principal atual
O maior risco não é falta de dado, é **mistura de métrica proxy com métrica oficial sem reconciliação PDV + loop de ação ainda vazio no Copilot**. Isso pode gerar recomendações "plausíveis" porém não auditáveis financeiramente para o ICP.

## 9) Recomendação executiva
Priorizar imediatamente:
1) contrato canônico + qualidade de ingestão,  
2) reconciliação de conversão com PDV,  
3) fechamento do loop de valor do Copilot (ação -> resultado -> dinheiro).

Sem esses 3 pilares, o produto segue operacional, mas ainda não atinge o nível de confiabilidade estratégica esperado pelo documento técnico.

## 10) Atualização desta etapa (2026-03-19 19:45 BRT)

### 10.1 Snapshot validado em banco agora
- `vision_atomic_events`: 1687 linhas (max `ts`: 2026-03-19 22:44:38Z).
- `event_receipts`: 8271 linhas (max `received_at`: 2026-03-19 22:44:39Z).
- `traffic_metrics`: 2409 linhas (max `ts_bucket`: 2026-03-19 22:44:30Z).
- `conversion_metrics`: 2407 linhas (max `ts_bucket`: 2026-03-19 22:44:30Z).
- `action_outcome`: 0 linhas.
- `value_ledger_daily`: 0 linhas.
- `stores`: 1 loja com sinal nas tabelas de visão/métricas nas últimas 24h.

### 10.2 Gaps críticos observados nesta rodada
1. `event_receipts` permanece sem fechamento operacional:
- `processed_at` nulo em `8271/8271` (100%).

2. `conversion_metrics` ainda tem quebra de contrato semântico:
- `metric_type` nulo em `1585/2407` (~65.9%).
- `roi_entity_id` nulo em `798/2407` (~33.2%).

3. Loop de valor do Copilot segue sem evidência de produção:
- sem outcomes registrados (`action_outcome=0`) e sem ledger diário (`value_ledger_daily=0`).

### 10.3 Frontend: dados efetivamente consumidos (status)
- Endpoint `/v1/me/admin/control-tower/summary/` agora já expõe `value_loop` no backend e o frontend passou a renderizar:
  - outcomes 24h
  - outcomes concluídos
  - cobertura do ledger
  - health do loop
- Isso elimina um gap de observabilidade: antes o backend calculava health parcial e o front não mostrava.

### 10.4 Entregas técnicas desta etapa
- Comando operacional criado:
  - `python manage.py rebuild_value_ledger_daily --date YYYY-MM-DD [--store-id ...] [--org-id ...] [--delete-orphans]`
- Admin summary com bloco `value_loop`:
  - volume de outcomes
  - cobertura de atualização do ledger
  - taxa de conclusão
  - health consolidado (`healthy|partial|degraded|no_data|unknown`).

### 10.5 To-do imediato (próxima etapa)
- [ ] Agendar job diário de `rebuild_value_ledger_daily` (janela D-1) com evidência de execução.
- [ ] Corrigir preenchimento de `metric_type` e `roi_entity_id` em `conversion_metrics` no pipeline legado (compat).
- [ ] Passar a atualizar `event_receipts.processed_at` ao final de toda projeção aplicada (incluindo legados).
- [ ] Definir SLO do loop Copilot (`outcomes_24h > 0` e `ledger_coverage_rate >= 90%`) com alerta automático.

### 10.6 Execução da etapa 2 (2026-03-19 20:35 BRT)
- Hardening aplicado em `apps/edge/vision_metrics.py`:
  - fallback de `roi_entity_id` para `zone_id` no path legado (`queue_state`/`checkout_proxy` e upsert genérico).
  - busca de linha existente em `conversion_metrics` agora prioriza chave completa (`store_id, ts_bucket, camera_id, metric_type, roi_entity_id`).
  - fallback controlado para linhas legadas com identidade incompleta (`metric_type/roi` nulos), evitando criar novos nulos.
- Comando novo criado:
  - `python manage.py backfill_conversion_metric_identity --dry-run --limit 100`
  - `python manage.py backfill_conversion_metric_identity --limit 100`
- Resultado medido (amostra aplicada no banco atual):
  - antes: `metric_type_null=1613`, `roi_null=812`
  - depois: `metric_type_null=1551`, `roi_null=780`
  - observação: ingestão seguia ativa durante a medição (`total` variou na janela).

### 10.7 Execução da etapa 3 (2026-03-19 21:05 BRT)
- Fechamento de `processed_at` no fluxo live:
  - `apps/edge/views.py`: caminho de `dedupe` agora chama `mark_event_receipt_processed(event_id=receipt_id)` antes do retorno.
  - `apps/edge/status_events.py`: eventos `backend` agora marcam `processed_at` quando webhook retorna `<300`; em falha HTTP/exception atualizam `last_error`.
  - `apps/core/services/journey_events.py`: receipts criados por `log_journey_event` já entram com `processed_at=now()` e `attempt_count=1`.
- Comando operacional criado para passivo histórico:
  - `python manage.py backfill_event_receipts_processed_at --limit 20000 --grace-minutes 1`
- Resultado medido no banco atual:
  - antes: `processed_null=8652`, `processed_set=0`
  - depois: `processed_null=10`, `processed_set=8648`
  - `status`: `processed=8648`, `received=10` (janela recente dentro de grace).

### 10.8 Execução da etapa 4 (2026-03-19 21:30 BRT)
- Automação contínua de receipts processados implementada:
  - script Render: `bin/render_job_event_receipts_processing.sh`
  - workflow GitHub: `.github/workflows/event_receipts_processing_health.yml` (hora em hora).
- Health check com threshold e artifact:
  - comando: `python manage.py event_receipts_processing_health --grace-minutes 5 --max-pending 50 --fail-on-breach`
  - JSON de evidência com `pending_aged`, `pending_all`, `processed_count`, `failed_count`, breakdown por source e event_name.
- Validação local (janela atual):
  - `status=healthy`
  - `pending_aged=30`
  - `max_pending=50`
