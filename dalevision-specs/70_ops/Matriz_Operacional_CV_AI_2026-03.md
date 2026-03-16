# Matriz Operacional CV + AI + MLOps (Referencia de Execucao)

## Objetivo
Transformar sinais de visao computacional em indicadores executivos confiaveis e acionaveis, com trilha completa:
- evento -> indicador -> recomendacao -> acao -> impacto financeiro.

Data base: 2026-03-16

---

## Escala de maturidade (0-5)
- `0` inexistente
- `1` ad-hoc/manual
- `2` funcional, sem padrao forte
- `3` padronizado e repetivel
- `4` monitorado com governanca e automacao
- `5` otimizado/preditivo em escala

---

## Estagio atual consolidado (tema CV/AI/Data)
- Ingestao/eventos: `3/5`
- Preprocessing/normalizacao: `3/5`
- Labeling/ground truth: `2/5`
- Model training/evaluation: `2/5`
- Deploy/rollout de modelos: `2/5`
- Monitoring de dados/modelo: `2/5`
- Loop de acao e outcome: `3/5`
- ROI oficial (com POS): `1/5`

Leitura executiva:
- maturidade media atual: `2.3/5`.
- estado: `funcional e padronizando`, ainda nao `measurement-ready` para benchmark multi-loja oficial.

---

## Matriz operacional completa

| Etapa | Objetivo | Entradas | Saidas | Tools recomendadas | KPI tecnico | KPI de negocio | Estagio atual | Proximo gate |
|---|---|---|---|---|---|---|---|---|
| 1. Ingestao edge-first | Capturar eventos sem enviar video | RTSP, metadata camera, ROI | `RetailEvent` com `idempotency_key`, `confidence` | Edge-agent, OpenCV, YOLO, Django ingest API | ingest success rate, event lag p95, duplicate discard rate | cobertura operacional por loja/turno | 3/5 | 99% ingest success e duplicidade <0.1% |
| 2. Normalizacao | Padronizar eventos multi-fonte | eventos CV/POS/manual | evento canonico versionado (`event_type`, `source`, `model_version`) | Python, Pydantic/serializers, Postgres | schema pass rate, version compatibility | confianca em comparativos entre lojas | 3/5 | contrato v1 fechado para 100% dos eventos criticos |
| 3. Preprocessing/features | Consolidar em janelas operacionais | eventos crus + horarios loja | `operational_window` 5/15 min | Pandas, NumPy, jobs Django, SQL | freshness <5 min, null-rate, outlier-rate | dashboard sem tela vazia, leitura em tempo util | 3/5 | 3 dias seguidos sem `slo_breached` critico |
| 4. Labeling/annotation | Criar verdade de campo para treinar/validar | amostras de video/eventos | labels de fila, entrada/saida, staff, ocupacao | CVAT/Label Studio, protocolo QA | inter-annotator agreement, label error rate | confianca em alertas e recomendacoes | 2/5 | playbook de rotulagem + lote minimo por segmento |
| 5. Model training | Treinar modelos base por tarefa (nao por loja) | dataset anotado | pesos/versionamento de modelos | PyTorch, Ultralytics, MLflow, W&B (opcional) | mAP/F1/MAE por tarefa | reducao de falso alerta em operacao | 2/5 | baseline tecnico aprovado por tarefa |
| 6. Evaluation tecnica + de negocio | Validar offline e online | modelos + datasets + eventos reais | relatorio de aceitacao por versao | notebooks, MLflow eval, testes backend | precision/recall, drift inicial, robustness por luz/oclusao | acuracia de fila/cobertura e qualidade da decisao | 2/5 | gate de release com limite minimo por segmento |
| 7. Deploy/rollout | Publicar sem quebrar loja | build assinado + politica update | versao ativa por agente/camera, rollback | release pipeline, canais stable/canary, health checks | update success, rollback rate, MTTR | tempo para distribuir melhoria na rede | 2/5 | canary em 1->5 lojas com rollback automatico |
| 8. Monitoring continuo | Detectar queda de qualidade cedo | logs edge, eventos, outcomes | alertas de drift/confianca e acao recomendada | Prometheus/Grafana (ou equivalente), Sentry, SQL health | drift score, confidence drop, missing events | evitar fadiga de alertas e perda de confianca do gestor | 2/5 | painel unico de dados+modelo+acao |
| 9. Decision engine | Converter sinal em recomendacao priorizada | windows + contexto loja/segmento | insight com impacto esperado e explicacao | regras semanticas + AI product layer | insight precision, dispatch readiness | acao mais rapida em gargalos reais | 3/5 | limiar de confianca aplicado em 100% dos insights |
| 10. Action outcome + ledger | Fechar loop de valor | dispatch + status + pos-acao | `completed/failed`, completion/failure rate, value ledger | backend reports, jobs diarios, APIs | completion rate, failure rate, lead time | prova de valor em R$ por periodo | 3/5 | 3 dias de estabilidade em campo remoto |
| 11. ROI oficial (POS) | Trocar estimativa por valor oficial | vendas POS/gateway + eventos operacionais | receita/ticket/conversao oficiais | conectores POS, ETL, reconciliacao | reconciliation accuracy | credibilidade financeira para decisor | 1/5 | primeiro conector oficial ativo em piloto |

---

## Ferramentas por camada (stack recomendada)

### Edge/CV
- OpenCV
- YOLO (Ultralytics/PyTorch)
- MediaPipe (casos especificos de pose/atividade)
- ONNX Runtime/TensorRT (quando otimizar inferencia no edge)

### Dados/feature store operacional
- Python (`pandas`, `numpy`)
- Postgres/Supabase
- Jobs de materializacao (5/15 min)
- Event backbone (Kafka/Redpanda/Pulsar) na fase de escala

### Treino/MLOps
- PyTorch
- MLflow (experimentos + model registry)
- Weights & Biases (opcional para tracking avancado)
- DVC (opcional para versionar dados)

### Qualidade/observabilidade
- Great Expectations/dbt tests (quando houver camada analitica formal)
- Sentry + dashboards de saude
- Monitoramento de drift e cobertura por metrica/camera/loja

---

## Padrao global vs customizacao por loja/segmento

Regra pratica:
- `80%` padrao global (contrato, modelos base, pipeline, governanca).
- `20%` calibracao local (ROI, thresholds, baseline, horario operacional).

### O que e global
- contrato `RetailEvent`
- tasks CV base (fila, fluxo, ocupacao, staff)
- criterio de confianca e semaforo `official/proxy/estimated`
- gates de release e rollback

### O que e por segmento
- SLAs operacionais (ex.: fila tolerada)
- pesos de impacto financeiro (ticket, abandono, elasticidade)
- prioridade de indicadores (lavanderia != cafe != moda)

### O que e por loja
- geometria ROI e posicionamento de camera
- baseline de fluxo por horario
- custos locais (hora staff, ticket medio quando disponivel)

---

## Roadmap de maturidade (objetivo de 90 dias)

### Fase 1 (0-30 dias) - Trust Foundation
1. Fechar contrato unico de evento em todos os produtores.
2. Completar painel de cobertura/confianca por loja.
3. Operar gate de campo de 3 dias consecutivos sem regressao.

### Fase 2 (31-60 dias) - Model Reliability
1. Pipeline de labeling com QA por segmento.
2. Gate formal de avaliacao para promover versao de modelo.
3. Rollout canary de update edge com rollback automatico.

### Fase 3 (61-90 dias) - Value Proof
1. Loop de acao com completion/failure estabilizado.
2. Primeiro conector POS para KPI financeiro oficial.
3. Relatorio executivo mensal com ROI oficial + estimado governado.

---

## Criterios de saida para "High-confidence indicators"
- Cobertura operacional >= 80% por loja/turno.
- Confidence medio >= 85 para indicadores criticos.
- Falso alerta dentro do limite acordado por segmento.
- Completion rate com trilha de falha e motivo.
- KPI financeiro oficial em ao menos 1 integracao real (POS/gateway).

