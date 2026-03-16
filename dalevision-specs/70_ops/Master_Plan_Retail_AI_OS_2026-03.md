# Master Plan Retail AI OS (Referencia Principal)

## Objetivo
Definir o plano tecnico e de produto para evoluir a DaleVision de:
- ferramenta de monitoramento
para:
- Retail AI Operating System orientado a decisao, acao e impacto financeiro.

Este documento consolida:
- arquitetura alvo edge-first e event-driven;
- etapas de implementacao;
- skills por etapa;
- roadmap em sprints;
- matriz de continuidade dos docs existentes.

Data base: 2026-03-14
Escopo: backend + frontend + edge + dados + copiloto + operacao

---

## Atualizacao de execucao (2026-03-15)

Status pratico da trilha de produto/ROI:
- Sprint 2: `DONE (ENG + GOVERNANCA)` com `VALIDACAO DE CAMPO PENDENTE`.
- Avanco principal: loop `dispatch -> outcome -> value ledger` implementado no backend/frontend de reports.

Entregas tecnicas confirmadas em codigo:
- `ActionOutcome` e `ValueLedgerDaily` ativos.
- Endpoints store e network para outcomes/ledger.
- Patch de conclusao de outcome (`dispatched -> completed`).
- Breakdown por loja no modo rede (com `store_name`).
- Governanca de metodo no payload (`method_version_current`).
- UI `/app/reports` com leitura executiva de risco/valor e acao rapida por loja.
- Campo de saldo financeiro liquido (`value_net_gap_brl`) no ledger store/network.
- Sinalizacao explicita de SLO no pipeline do ledger (`slo_breached`) em API + Reports.

Checklist de fechamento Sprint 2 (estado atual):
- [x] runbook de suporte atualizado com fluxo outcome/ledger.
- [x] SLO minimo para endpoints/job criticos da trilha de valor (painel + alertas no reports).
- [x] checklist final centralizado com evidencias (health snapshot + acceptance report + evidence pack + daily log entry).
- [ ] validacao operacional com dados reais multi-loja (evidencia em loja remota nesta semana).

Avanco de governanca operacional (15/03/2026):
- comando `copilot_value_ledger_health_snapshot` implementado para gerar evidencia diaria multi-loja (`stdout + JSON`), com cobertura, frescor/SLO e gap liquido por loja.
- comando `copilot_sprint2_evidence_pack` implementado e automatizado via workflow diario para consolidar checklist final + decisao GO/NO-GO em um unico markdown.
- status `sprint2_acceptance` exposto em `/app/reports` para leitura executiva direta de GO/NO-GO.

Decisao de trilha:
- Sprint 2 considerada `done` para engenharia e governanca.
- Fechamento operacional definitivo sera registrado apos validacao de campo (loja geograficamente distante).
- Enquanto isso, a equipe segue em paralelo com itens de sprint seguinte (auto-update edge + refinamento CV/admin).

Gate tecnico objetivo para encerrar Sprint 2 sem ambiguidade:
- fonte unica: `incident_response.target_status.overall` em `/app/reports`;
- criterio de aceite:
1. `overall = go` por 3 snapshots diarios consecutivos;
2. `runbook_coverage_rate_pct >= 80`;
3. `avg_time_to_runbook_seconds <= 900`;
4. sem regressao em `sprint2_acceptance.status`.
- se qualquer item cair para `no_go`, sprint volta para `in_progress` ate correcao + nova evidencia.

Proximo passo operacional (sem bloquear engenharia):
1. validar em campo o pacote de update remoto do edge-agent;
2. capturar evidencia real de ingestao/calibracao por camera;
3. consolidar no evidence pack diario para fechamento executivo.
Referencia operacional: `70_ops/S2_Field_Validation_Gate.md`.

## Atualizacao de execucao (2026-03-16)

Status consolidado:
- Sprint 2 segue `DONE (ENG + GOVERNANCA)` com `FIELD VALIDATION PENDING`.
- Reports evoluiu de monitoramento para leitura de execucao de acao com foco em completion/failure.

Evolucoes aplicadas:
- breakdown de outcomes por fonte de execucao;
- filtros de status de acao em reports (`all`, `dispatched`, `completed`, `failed`);
- agregados de falha no resumo executivo (`actions_failed_total`, `failure_rate`);
- suporte operacional para marcar resultado de acao como `failed` e fechar loop de acompanhamento.

Impacto no plano master:
- gate de maturidade de `Actionability` ficou mais mensuravel (nao apenas dispatch, mas desfecho da acao).
- preparacao para S3/S4 ficou mais solida porque completion rate e failure rate agora tem trilha objetiva.

Pendencia unica para fechamento definitivo da Sprint 2:
- validar em campo (loja remota) que os indicadores de execucao e ledger ficam estaveis por 3 dias consecutivos.

---

## Proximo foco (paralelo ao campo)

### Trilha A - Auto-update Edge (S2/S3)
- rollout seguro de versao por lotes (canary 1 loja -> 5 lojas -> rede).
- telemetria de update (sucesso/falha, rollback, tempo de recuperacao).
- controles de versao no dashboard/admin.

### Trilha B - Computer Vision e Refinamento Admin (S3)
- calibracao por segmento de loja (cafeteria, lavanderia, moda, farmacia etc.).
- ajustes assistidos por admin para ROI/thresholds sem depender do usuario final.
- hardening de confianca (deteccao de drift, dedupe de evento, controle de falso positivo).

---

## 1) Estado atual consolidado

### 1.1 O que ja esta pronto (base forte)
- Edge com eventos atomicos de visao (`vision.crossing.v1`, `vision.queue_state.v1`, `vision.checkout_proxy.v1`, `vision.zone_occupancy.v1`).
- Governanca de metricas em UI/API (`official | proxy | estimated`) iniciada.
- Dominio `copilot_*` criado para contexto, insights e memoria.
- Materializacao operacional por janela (job operacional) iniciada.
- Dashboard executivo com foco em decisao e impacto.

### 1.2 O que ainda e lacuna critica
- Backbone de streaming duravel (hoje arquitetura hibrida API + job).
- Contrato unico de evento de varejo com versionamento formal para todos os produtores.
- Loop fechado de acao implementado em v1; falta hardening operacional e medicao em producao.
- Modelo financeiro conservador com penalizador por confianca (padrao unico no backend).
- Read models event-driven para network/store/event sem recomputar no request.

### 1.3 Diagnostico objetivo
- Estado atual: parcialmente event-driven (hibrido).
- Estado alvo: event-driven ponta a ponta, com acao auditavel e prova de ROI por loja/rede.

---

## 2) Arquitetura alvo (North Star)

Fluxo alvo:

1. `Store Sources` (camera, POS, sensores, app staff)
2. `Edge Inference` (CV local, sem streaming de video para cloud)
3. `Event Backbone` (stream duravel)
4. `Normalization + Feature Aggregation`
5. `Decision Engine`
6. `Action Orchestration`
7. `Application Layer` (dashboard, copiloto, alertas, relatorios)
8. `Value Ledger` (prova de valor em R$ por acao)

Principios:
- edge-first: video fica na loja, sobe apenas evento;
- idempotencia obrigatoria por evento;
- confianca explicita em toda metrica;
- expected vs actual como leitura padrao;
- degradacao graciosa (nunca tela "quebrada");
- multi-tenant estrito por org/store.

---

## 3) Skills por etapa (como vamos trabalhar)

### Etapa A - Fundacao de arquitetura e contratos
- Skill principal: `architecture`
- Skills suporte: `architecture-decision-records`, `software-architecture`
- Saidas:
  - ADRs de broker, idempotencia, particionamento, retencao.
  - Contrato `RetailEvent` v1 com versao e compatibilidade.
  - Definicao de dominos de eventos e owners.

### Etapa B - Computer Vision confiavel no edge
- Skill principal: `computer-vision-expert`
- Skills suporte: `clean-code`, `error-detective`
- Saidas:
  - Padrao de confidence score por detector e por janela.
  - Regras de dedupe temporal e controle de falso positivo.
  - Pipeline de calibracao e monitoramento de drift.

### Etapa C - Data quality e analytics de produto
- Skill principal: `analytics-product`
- Skills suporte: `analytics-tracking`, `data-quality-frameworks`, `supabase-postgres-best-practices`
- Saidas:
  - Taxonomia oficial de eventos de produto e operacao.
  - Contratos e testes de qualidade de dados.
  - KPIs north star + funnels + adoption de acao.

### Etapa D - Decision Engine e Copilot de acao
- Skill principal: `ai-product`
- Skills suporte: `workflow-orchestration-patterns`, `ai-engineer`
- Saidas:
  - Pipeline deterministico: sinal -> diagnostico -> impacto -> recomendacao.
  - Thresholds de confianca para disparo de acao.
  - Action loop com outcomes e value ledger diario.

### Etapa E - Produto executivo e monetizacao
- Skill principal: `product-inventor`
- Skills suporte: `pricing-strategy`, `data-storytelling`
- Saidas:
  - Dashboard CEO com leitura em <10s.
  - Narrativa expected vs actual + impacto financeiro.
  - Embalagem de plano Pro baseada em valor comprovado.

---

## 4) Roadmap de implementacao (Sprints)

Padrao de sprint:
- duracao: 2 semanas;
- saida obrigatoria: evidencia tecnica + evidencia de valor.

### Sprint 1 - Event Contract + Ingestao Idempotente
Objetivo:
- estabilizar envelope de evento e dedupe.

Entregas:
- `RetailEvent` v1 (schema + validacao).
- idempotency key obrigatoria no ingest.
- normalizacao inicial por tipo de evento.

DoD:
- duplicidade persistida < 0.1%;
- replay seguro sem efeito colateral.

### Sprint 2 - Operational Window + Read Models
Objetivo:
- consolidar janelas de 5/15 minutos por loja.

Entregas:
- materializacao `operational_window`.
- read models para network e store.
- fallback de baixa confianca na API/UI.
- outcome + value ledger em reports (store/network), com governanca de metodo.
- ranking de risco por loja no modo rede para priorizacao executiva.

DoD:
- SLO de atualizacao < 5 min;
- dashboard sem estado vazio com lojas ativas.
- evidencias multi-loja em producao para fechar aceite da sprint.

### Sprint 3 - Decision Engine V1
Objetivo:
- gerar recomendacoes acionaveis com regra explicavel.

Entregas:
- regras por categoria (fila, staff, cobertura, conversao proxy).
- `impact_expected_brl` com penalizador por confianca.
- classificacao `official/proxy/estimated` no payload.

DoD:
- nenhuma recomendacao com score < limiar vira dispatch automatico;
- trilha de evidencia por insight.

### Sprint 4 - Action Orchestration + Delegacao
Objetivo:
- fechar loop de acao operacional.

Entregas:
- dispatch via WhatsApp/email.
- estados de acao (`dispatched`, `ack`, `done`, `failed`).
- captura de baseline e pos-acao para outcome.

DoD:
- toda acao tem rastreabilidade ponta a ponta;
- dashboard mostra status da execucao.

### Sprint 5 - Value Ledger + ROI diario
Objetivo:
- provar valor economico do produto.

Entregas:
- `value_ledger_daily` por loja/rede.
- consolidacao de custo evitado + receita recuperada.
- relatorio executivo mensal de valor.

DoD:
- relatorio responde "quanto valeu a assinatura no periodo".

### Sprint 6 - Predictive + Multi-Store Intelligence
Objetivo:
- expected vs actual por loja e rede.

Entregas:
- baseline por segmento/loja.
- anomalia de conversao e fila com explicacao.
- ranking top/bottom e prioridade de intervencao.

DoD:
- ranking e alertas comparativos com elegibilidade de confianca.

### Sprint 7 - POS Integration Track (official finance)
Objetivo:
- migrar metrica financeira de estimated/proxy para official.

Entregas:
- conectores POS/gateway por adaptador.
- reconciliacao de venda por loja/periodo.
- upgrade de governanca de metricas financeiras.

DoD:
- "Receita em risco" com status official onde houver integracao.

### Sprint 8 - Scale Readiness (Series A/B readiness)
Objetivo:
- preparar operacao e engenharia para escala de rede.

Entregas:
- runbooks, observabilidade e custo por loja.
- SLO/SLA por camada.
- playbook de rollout de 10 -> 50 -> 200 lojas.

DoD:
- operacao repetivel com qualidade e previsibilidade.

---

## 5) Backlog macro por trilha

### 5.1 Data Platform
- Broker/event bus duravel.
- consumer de normalizacao.
- agregador por janela.
- storage de eventos crus + agregados.
- testes de contrato e qualidade.

### 5.2 CV/Edge
- calibracao por camera/ROI.
- monitor de drift por condicao (luz, oclusao, angulo).
- dedupe temporal.
- versionamento de modelo e feature flags.

### 5.3 Decision Engine
- regras por contexto de loja (has_salao, segmento, cobertura).
- modelo `Revenue at Risk` conservador.
- thresholds de confianca por tipo de acao.

### 5.4 Copilot + UX executiva
- decision center como bloco principal.
- recomendacao com impacto e evidencia.
- acao com 1 clique e retorno de outcome.

### 5.5 Produto e monetizacao
- instrumentacao de uso de acao.
- metricas de adocao e retencao por plano.
- narrativa de valor no trial -> pro.

---

## 6) Matriz de revalidacao dos docs atuais

### 6.1 Manter como referencia ativa (sem mudar objetivo)
- `30_system/Copilot_Operational_Data_Architecture.md`
- `30_system/Roadmap_Vision_Productization.md`
- `50_specs/SPEC-007-Event-Pipeline.md`
- `70_ops/Sprint_Execution_Reference.md`
- `70_ops/Vision_Product_Status.md`

### 6.2 Evoluir e alinhar com este master plan
- `10_product/Roadmap.md` (hoje muito alto nivel, precisa refletir sprints e valor).
- `30_system/Architecture.md` (incluir estado hibrido atual e alvo event-driven).
- `30_system/API_Contracts.md` (explicitar `/productivity/coverage` e novos contratos de acao/outcome).
- `30_system/Metrics_Dictionary.md` (incluir status official/proxy/estimated por metrica).

### 6.3 Consolidar para reduzir ruido documental
- consolidar planos paralelos de escala em:
  - `70_ops/S3_Product_Scale_Readiness_Plan.md`
  - `70_ops/Reliable_Vision_Execution_Plan.md`
  - `70_ops/Plano_Executavel_Edge_to_Product.md`
- manter 1 plano operacional principal e transformar os outros em anexos.

### 6.4 Nao necessario neste momento (deixar em backlog)
- digital twin completo de loja;
- automacao autonoma full sem aprovacao humana;
- benchmark cross-segment sem baseline por segmento.

---

## 7) KPIs e gates de maturidade

### Gate G1 - Event Reliability
- ingest success rate;
- duplicate discard rate;
- event lag p95.

### Gate G2 - Metric Trust
- coverage score por loja/turno;
- confidence score medio por metrica;
- % de metricas exibidas com governance tag.

### Gate G3 - Actionability
- tempo de deteccao -> recomendacao;
- taxa de aprovacao de acoes;
- taxa de conclusao de acoes.

### Gate G4 - Financial Proof
- receita em risco identificada;
- valor recuperado/evitado apos acao;
- ROI mensal vs assinatura.

---

## 8) Cadencia de governanca (operacao)

Semanal:
- review tecnico de pipeline e qualidade.
- review de produto (insights, UX, friccao de acao).

Quinzenal:
- review de sprint e gates.
- decisao de escopo: manter / incluir / remover.

Mensal:
- comite de valor (produto + comercial + operacao).
- revisao de pricing e narrativa de ROI.

---

## 9) Proximas acoes imediatas (7 dias)

1. Atualizar `10_product/Roadmap.md` para refletir este plano.
2. Atualizar `30_system/Architecture.md` com alvo edge-first event-driven.
3. Publicar ADR do broker e ADR do action outcome ledger.
4. Formalizar contrato `RetailEvent` v1 e `action_outcome` v1.
5. Atualizar `10_product/Pricing_Plans.md` com entitlements por plano (single-store vs multi-store).
6. Fechar aceite operacional da Sprint 2 com evidencias multi-loja e SLO documentado.

### 9.1 Plano complementar (remoto + campo) sem perder trilha de sprint

Objetivo:
- manter a Sprint 2 fechada em engenharia/governanca;
- executar validacao de campo remota nesta semana;
- adiantar blocos de S3/S4 que destravam evolucao sem depender de visita presencial.

Mapa por sprint:

1. `S2` (fechamento operacional pendente)
- Task S2-OP-01: validar nova versao em loja remota (`autostart + ingestao + camera_health + atomic events`).
- Task S2-OP-02: rodar 48-72h de evidencias (`health snapshot`, `acceptance report`, `evidence pack`, `daily log`).
- Task S2-OP-03: registrar GO/NO-GO operacional definitivo no fim da janela.

2. `S3` (confianca de dado / CV)
- Task S3-CV-01: calibracao assistida por admin (ROI/thresholds por camera).
- Task S3-CV-02: baseline por segmento e checklist de falso positivo.
- Task S3-CV-03: regras de confianca para exibicao monetaria (score bands e fallback).

3. `S4` (orquestracao/execucao de campo remoto)
- Task S4-UPD-01: contrato de auto-update por canal (`stable/canary`) e telemetria de versao.
- Task S4-UPD-02: rollout canary com rollback automatico e health gate.
- Task S4-UPD-03: observabilidade de update por loja/agent no suporte.

Regra de prioridade:
- primeiro garantir estabilidade + ingestao real (S2-OP).
- segundo reduzir custo de iteracao remota com auto-update (S4-UPD).
- terceiro endurecer qualidade de CV e confianca executiva (S3-CV).

---

## 10) Regra de ouro para investidor e execucao

Nao basta mostrar metricas.
Precisamos provar:
- problema detectado;
- acao executada;
- impacto financeiro medido.

Quando esse ciclo estiver estavel, DaleVision deixa de ser dashboard e vira sistema operacional de decisao para varejo fisico.

---

## 11) Edge lifecycle: autostart + autoupdate (obrigatorio para escala)

Status atual:
- autostart: estabilizado.
- autoupdate: precisa entrar como trilha obrigatoria do roadmap.

Por que e critico:
- sem autoupdate, cada evolucao de modelo/regra vira operacao manual;
- aumenta drift de versao por loja e quebra comparabilidade;
- eleva custo de suporte e risco operacional.

Requisitos minimos de autoupdate:
1. canal de release (`stable`, `canary`) por loja.
2. rollout gradual (1 loja -> 5 -> 20 -> rede).
3. health check pos-update com rollback automatico.
4. assinatura/verificacao de pacote (integridade).
5. telemetria de versao ativa por agente/camera.

SLOs de operacao edge:
- taxa de sucesso de update > 98%;
- rollback automatico < 5 min quando health falhar;
- 95% da base em versao suportada em ate 7 dias.

Entrada no roadmap:
- Sprint 2: contrato de update + telemetria de versao.
- Sprint 3: canary + rollback automatico.
- Sprint 4: rollout em lote com observabilidade de frota.

Referencias de execucao:
- `docs/contracts/CONTRACT_EDGE_AUTO_UPDATE_V1.md`
- `70_ops/S4_AutoUpdate_Execution_Plan.md`
- `40_edge_agent/Edge_AutoUpdate_Backup.md`

---

## 12) Matriz por tipo de negocio (metric packs)

Regra:
- nao existe KPI unico para todo varejo.
- cada loja recebe pacote de metricas por `business_model`.

Campos minimos em `store_profile`:
- `business_model` (cafeteria, restaurante, lavanderia_self, moda, farmacia, outros)
- `has_salao` (bool)
- `has_checkout_queue` (bool)
- `has_pos_integration` (bool)
- `avg_ticket_baseline_brl` (opcional)
- `hourly_labor_cost_brl` (opcional)

Pacotes iniciais:

1. `lavanderia_self`
- prioridade: ocupacao de maquinas, fila de uso, tempo de espera, throughput.
- risco financeiro: abandono por indisponibilidade/espera.
- acao tipica: liberar maquina, ajustar janela de limpeza/manutencao.

2. `cafe_restaurante_com_salao`
- prioridade: fila de caixa + ocupacao de salao + cobertura de staff.
- risco financeiro: perda por fila e baixa conversao de atendimento.
- acao tipica: realocar staff salao -> checkout em pico.

3. `cafe_restaurante_sem_salao`
- prioridade: fila checkout, tempo de atendimento, fluxo por faixa horaria.
- risco financeiro: abandono por espera.
- acao tipica: abrir caixa adicional no pico.

4. `moda`
- prioridade: fluxo, dwell em zonas, cobertura de vendedor, conversao.
- risco financeiro: potencial nao capturado por falta de atendimento.
- acao tipica: reforcar vendedor em zona quente.

5. `farmacia`
- prioridade: fila balcao/caixa, tempo de atendimento, cobertura em horario critico.
- risco financeiro: abandono + perda de venda recorrente.
- acao tipica: reforco imediato em ponto de fila.

Regra de produto:
- metrica nao suportada pelo segmento nao aparece como "zero", aparece como `not_applicable`.

---

## 13) Entitlements por plano (gates de funcionalidade)

Referencia base atual:
- ver `10_product/Pricing_Plans.md` para limite oficial de lojas/cameras.

Matriz recomendada de gating (produto):

1. `trial/free/start` (single-store focus)
- foco: operacao da loja unica.
- sem comparacao/ranking entre lojas.
- dashboard: store-level + alertas basicos + copiloto local.

2. `pro` (multi-store operacao)
- inclui comparacao entre lojas (top/bottom, gargalos).
- inclui delegacao (WhatsApp/email) e tracking de acao.
- inclui cobertura operacional e insights de produtividade.

3. `rede/enterprise` (network intelligence)
- inclui governanca completa de rede, API/BI, simulacoes e benchmarking avancado.
- inclui controles administrativos de rollout (edge fleet e politicas).

Regra de UX:
- recurso bloqueado deve aparecer como "Pro feature" com CTA contextual.
- nao quebrar experiencia de planos menores; mostrar valor e caminho de upgrade.

---

## 14) Dependencia de KPI por integracao (official vs proxy)

### 14.1 Mapa de dependencia

1. KPIs possiveis so com CV/edge:
- footfall, fila media, staff detectado, ocupacao de zona, alertas operacionais.
- status esperado: `official` para sinal operacional (quando cobertura confiavel).

2. KPIs dependentes de baseline cadastrado:
- cobertura planejada, ociosidade de staff (proxy), custo de hora estimado.
- status esperado: `proxy` ou `estimated`.

3. KPIs dependentes de POS/gateway:
- faturamento diario por loja, ticket medio oficial, conversao oficial, revenue at risk official.
- status esperado: `official` apos integracao e reconciliacao.

### 14.2 Estrategia de estimulo de integracao

No dashboard/copiloto:
- sempre mostrar badge de governanca (`official/proxy/estimated`);
- quando KPI estiver em proxy/estimated por falta de POS, mostrar CTA:
  - "Conectar POS/Gateway para elevar confianca e liberar valor oficial."

Gatilhos de upgrade:
- liberar simulador financeiro avancado apenas com POS conectado ou plano superior;
- mostrar ganho incremental esperado ao conectar integracao.

### 14.3 Regra de confianca para monetizacao
- score >= 85: exibir valor fechado em R$;
- score entre 60 e 84: exibir intervalo de seguranca;
- score < 60: ocultar valor monetario e exibir "sinal em calibracao".
