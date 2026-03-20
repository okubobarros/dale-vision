# Plano de Execução - Ingestão, Refino e MLOps (Admin vs Lab)
Data: 2026-03-20
Referência: `Dale Vision Product & Technical_Document.pdf`
Skills aplicadas: `ml-engineer`, `ml-pipeline-workflow`, `mlops-engineer`

## 1) Decisão estrutural: onde fazer cada coisa

### 1.1 Admin SaaS (produção)
Objetivo: visibilidade executiva e governança.

No Admin ficam:
- SLO/SLA de ingestão (`processing_rate`, `failure_rate`, `pending_total`)
- Completude por tabela/campo (`null_rate`)
- Funil PM/Admin e qualidade de payload
- Alertas de risco e backlog executivo

O Admin não é ambiente de experimento de modelo.

### 1.2 Data Reliability + CV Lab (ambiente separado)
Objetivo: desenvolvimento e validação técnica de dados/modelos.

No Lab ficam:
- QA de ingestão (schema, dedupe, replay, stress)
- Rotulagem e curadoria (`CVAT/Label Studio`)
- Treino/validação de CV (YOLO e variantes)
- Avaliação offline/online de modelos
- Canary e rollback de modelos

Conclusão: usar os dois.
- Admin = observabilidade e decisão.
- Lab = engenharia e refino técnico.

## 2) Alinhamento com o documento técnico

Este plano executa diretamente os blocos do PDF:
- Arquitetura orientada a eventos (edge -> ingest -> fila -> workers -> KPI/ROI)
- Ingestão híbrida stream + batch com idempotência
- MLOps com versionamento de modelo + ontologia + ROI
- QA/Labelling com validação por gold set
- Loop fechado Evento -> Ação -> Resultado -> Dinheiro

## 3) Trilha de ingestão confiável (fase imediata)

## 3.1 Contratos de evento (Data Contract)
- Definir contratos por tipo (`vision`, `retail`, `pdv`, `journey`)
- Campos obrigatórios, tipos, ranges, unidades, timezone
- `schema_version` obrigatório em todos os eventos novos

## 3.2 Gateway de validação
- Validar payload antes de persistir
- Rejeitar com erro padronizado e motivo explícito
- Persistir motivo em `event_receipts.last_error`

## 3.3 Testes de ingestão (obrigatórios)
- Contract tests por evento
- Idempotência (mesmo `event_id` -> 1 gravação)
- Deduplicação multi-câmera (cenários sintéticos)
- Replay/backfill (reprocessamento sem duplicar)
- Carga/picos (backpressure)

## 3.4 SLOs de dados (produção)
- `processing_rate >= 99%`
- `failure_rate <= 1%`
- `pending_total = 0` em janela 24h
- `overall_null_rate <= 5%` (transitório) e alvo final <= 2%

## 4) Trilha de refino de modelo CV (YOLO / Ultralytics)

## 4.1 Uso recomendado da stack YOLO
- Usar YOLO para detecção base em edge (latência baixa)
- Export ONNX/TensorRT para inferência otimizada no edge agent
- Versionar conjunto: `model_version`, `ontology_version`, `roi_version`

## 4.2 Pipeline de treino (Lab)
1. Coleta de hard cases por loja/câmera
2. Curadoria/rotulagem
3. Treino por cenário (entrada, caixa, salão)
4. Avaliação offline por métrica operacional
5. Canary por loja
6. Promoção/rollback

## 4.3 Métricas de aceitação de modelo
- Queue length: erro absoluto médio <= 1 pessoa
- Queue wait time: erro <= 10s
- Flow in/out: erro <= 10%
- Occupancy/dwell: erro <= 15%
- Falso positivo crítico (alerta): queda contínua por release

## 4.4 Observabilidade MLOps
- Drift por iluminação/layout/câmera
- Distribuição de confiança por evento
- Taxa de falsos positivos e falsos negativos por loja
- Dashboard de health por versão de modelo

## 5) Plano para elevar score de qualidade para 95

## 5.1 Fórmula operacional (atualizar)
Score = qualidade de payload + confiabilidade de ingestão + estabilidade de modelo

Componentes:
- Payload completeness (40%)
- Ingestion SLO (35%)
- CV reliability (25%)

## 5.2 Metas por janela
- D+7: score >= 75
- D+14: score >= 85
- D+30: score >= 95

## 5.3 Backlog prioritário (execução)
1. Contratos e validação hard no ingest
2. Testes automáticos de idempotência/dedupe/replay
3. Coleta de dataset de hard cases por loja piloto
4. Pipeline de treino/validação/canary com rollback
5. Conexão PDV real e reconciliação com métricas proxy

## 6) Entregáveis técnicos sugeridos (próximos commits)

1. `Data Contract Registry` (yaml/json versionado)
2. `Ingestion Validation Service` com testes de contrato
3. `Data Reliability Test Pack` (replay + stress + dedupe)
4. `Model Registry Policy` (promoção/canary/rollback)
5. `CV Evaluation Report` por release (offline + online)

## 7) Critério de pronto para escalar multi-cliente/multi-loja

- Score >= 95 por 7 dias consecutivos
- SLO de ingestão dentro da meta
- Métricas oficiais e proxy reconciliadas
- Canary validado em mais de 1 loja
- Playbook de incidente e rollback testado
