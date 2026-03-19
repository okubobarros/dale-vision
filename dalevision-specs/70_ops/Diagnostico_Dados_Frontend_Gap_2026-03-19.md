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
