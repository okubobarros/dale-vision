# Backlog Executavel CV/AI/MLOps (90 dias)

## Objetivo
Converter a matriz operacional em execucao real de sprint, com:
- ticket claro;
- owner sugerido;
- esforco estimado;
- dependencia;
- criterio de aceite objetivo.

Data base: 2026-03-16

---

## Legenda
- Prioridade: `P0` (critico), `P1` (alto), `P2` (medio)
- Esforco: `S` (<=1 dia), `M` (2-4 dias), `L` (5-8 dias), `XL` (>8 dias)
- Status: `todo`, `in_progress`, `done`

Owners sugeridos:
- `BE` backend/data
- `EDGE` edge-agent/cv runtime
- `CV` modelagem computervision
- `FE` frontend/reports/dashboard
- `MLOPS` pipeline/release/monitoring
- `PM` produto/governanca

---

## Sprint 2 (fechamento operacional) - semana atual

### S2-01 - Gate de campo 3 dias consecutivos
- Prioridade: `P0`
- Esforco: `M`
- Owner: `PM + BE`
- Dependencias: evidence pack diario ativo
- Status: `todo`
- Entrega:
  - registrar 3 snapshots diarios consecutivos com `overall=go`;
  - anexar decisao final GO/NO-GO.
- Aceite:
  - `runbook_coverage_rate_pct >= 80`;
  - `avg_time_to_runbook_seconds <= 900`;
  - sem regressao de `sprint2_acceptance`.

### S2-02 - Auditoria de completion/failure em reports
- Prioridade: `P0`
- Esforco: `S`
- Owner: `BE + FE`
- Dependencias: endpoints de outcome ativos
- Status: `todo`
- Entrega:
  - validar filtros `all/dispatched/completed/failed` em loja real;
  - validar breakdown por source.
- Aceite:
  - nenhuma tela vazia com lojas ativas;
  - `failure_rate` e `actions_failed_total` consistentes com base.

### S2-03 - Checklist de evidencias consolidado
- Prioridade: `P1`
- Esforco: `S`
- Owner: `PM`
- Dependencias: S2-01
- Status: `todo`
- Entrega:
  - atualizar daily log + status docs com evidencias finais de S2.
- Aceite:
  - documentos `70_ops` sincronizados com data e decisao final.

---

## Sprint 3 (model reliability + trust)

### S3-01 - Playbook de labeling por segmento
- Prioridade: `P0`
- Esforco: `L`
- Owner: `CV + PM`
- Dependencias: amostras de campo coletadas
- Status: `todo`
- Entrega:
  - protocolo de anotacao para: fila, entrada/saida, staff, ocupacao;
  - criterio de QA de label.
- Aceite:
  - checklist de rotulagem publicado;
  - acordo minimo entre anotadores definido.

### S3-02 - Dataset baseline v1 (multi-segmento)
- Prioridade: `P0`
- Esforco: `L`
- Owner: `CV`
- Dependencias: S3-01
- Status: `todo`
- Entrega:
  - lote minimo por segmento (cafeteria, lavanderia, moda, farmacia);
  - split treino/validacao.
- Aceite:
  - dataset versionado;
  - cobertura minima por tarefa atingida.

### S3-03 - Gate formal de avaliacao de modelo
- Prioridade: `P0`
- Esforco: `M`
- Owner: `CV + MLOPS`
- Dependencias: S3-02
- Status: `todo`
- Entrega:
  - template unico de avaliacao offline/online;
  - thresholds de promocao de modelo por tarefa.
- Aceite:
  - nenhuma versao sobe sem passar gate tecnico.

### S3-04 - Painel de confianca operacional por metrica/camera
- Prioridade: `P1`
- Esforco: `M`
- Owner: `BE + FE`
- Dependencias: agregacoes de confidence prontas
- Status: `todo`
- Entrega:
  - painel de coverage + confidence por loja/turno;
  - alertas de queda de confianca.
- Aceite:
  - leitura executiva mostra claramente `official/proxy/estimated`.

### S3-05 - Regras de fallback monetario por confidence
- Prioridade: `P1`
- Esforco: `S`
- Owner: `BE`
- Dependencias: S3-04
- Status: `todo`
- Entrega:
  - >=85 valor fechado;
  - 60-84 intervalo;
  - <60 sem valor monetario.
- Aceite:
  - comportamento aplicado em dashboard/reports sem inconsistencias.

### S3-06 - Sentimento agregado em loja com guardrails LGPD
- Prioridade: `P1`
- Esforco: `L`
- Owner: `CV + PM + BE`
- Dependencias: parecer juridico interno + contrato de dados de privacidade
- Status: `todo`
- Entrega:
  - indice agregado por zona/horario (`sentiment_balance_index`, `friction_moments_rate`);
  - sem identificacao individual e sem biometria persistente;
  - trilha auditavel de acesso a evidencias de calibracao.
- Aceite:
  - ADR de privacidade aprovado;
  - metrica publicada como `proxy_experimental` com limites claros de uso.

---

## Sprint 4 (auto-update edge + rollout seguro)

### S4-01 - Contrato de auto-update v1
- Prioridade: `P0`
- Esforco: `M`
- Owner: `EDGE + BE`
- Dependencias: nenhuma
- Status: `in_progress` (backend validado; edge-agent pendente)
- Entrega:
  - estados: `started`, `downloaded`, `activated`, `healthy`, `rolled_back`, `failed`;
  - canal `stable/canary`.
- Aceite:
  - contrato publicado + telemetria persistida por agente.

### S4-02 - Rollout canary com health gate
- Prioridade: `P0`
- Esforco: `L`
- Owner: `EDGE + MLOPS`
- Dependencias: S4-01
- Status: `todo`
- Entrega:
  - rollout 1 loja -> 5 lojas;
  - rollback automatico em falha.
- Aceite:
  - update success >98% no canary;
  - rollback <5 min quando health falhar.

### S4-03 - Observabilidade de frota edge
- Prioridade: `P1`
- Esforco: `M`
- Owner: `BE + FE`
- Dependencias: S4-01
- Status: `todo`
- Entrega:
  - visao por versao/canal/status por loja;
  - feed de falhas de update.
- Aceite:
  - suporte identifica loja quebrada em <10 min.

---

## Sprint 5 (value proof + ROI oficial inicial)

### S5-01 - Conector POS piloto (1 integracao)
- Prioridade: `P0`
- Esforco: `XL`
- Owner: `BE + PM`
- Dependencias: credenciais e escopo com cliente piloto
- Status: `todo`
- Entrega:
  - ingestao de venda por loja/periodo;
  - reconciliacao com janelas operacionais.
- Aceite:
  - primeiro KPI financeiro `official` ativo no piloto.

### S5-02 - Reconciliacao financeiro-operacional
- Prioridade: `P0`
- Esforco: `L`
- Owner: `BE`
- Dependencias: S5-01
- Status: `todo`
- Entrega:
  - job de reconciliacao diario;
  - flags de qualidade dos dados financeiros.
- Aceite:
  - acuracia de reconciliacao dentro do limite definido.

### S5-03 - Relatorio executivo mensal de valor
- Prioridade: `P1`
- Esforco: `M`
- Owner: `FE + PM + BE`
- Dependencias: S5-02
- Status: `todo`
- Entrega:
  - consolidado de valor recuperado/evitado por loja/rede;
  - separacao official/proxy/estimated.
- Aceite:
  - relatorio responde claramente "quanto valeu a assinatura no periodo".

---

## Kanban imediato (proximos 14 dias)

### Prontos para iniciar agora
1. `S2-01` Gate de campo 3 dias consecutivos.
2. `S2-02` Auditoria completion/failure em reports.
3. `S4-01` Contrato de auto-update v1 (em paralelo sem bloquear S2).

### Em seguida
1. `S3-01` Playbook de labeling por segmento.
2. `S3-03` Gate formal de avaliacao de modelo.
3. `S3-06` Sentimento agregado em loja com guardrails LGPD.
4. `S4-02` Rollout canary com health gate.

---

## Definition of Done (backlog executavel)
- Todo ticket precisa:
1. evidencia tecnica (log, endpoint, teste ou screenshot de operacao);
2. evidencia de impacto em KPI tecnico ou de negocio;
3. atualizacao de documentacao em `70_ops` no mesmo dia;
4. estado final marcado (`done`) com data e owner.
