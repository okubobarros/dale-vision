# Decision Blueprint - Produto Funcional com Dados Confiáveis (Meta 95)

Data: 2026-03-19  
Status: decisão executiva para alinhamento Produto + Dados + CV + Operação.

## 1) Contexto e decisão
- Objetivo: transformar o estado atual em produto funcional de ponta a ponta, com métricas próximas do real e capacidade de decisão para ICP.
- Meta explícita: elevar o `Measurement Readiness & Signal Quality Index` de ~66 para **>=95**.
- Decisão: executar em trilhas paralelas, com gates semanais de qualidade e bloqueio de rollout quando qualidade cair.

## 2) Skills aplicadas neste blueprint
- `analytics-product`: funil, jornada, NSM, conversão trial->assinatura.
- `analytics-tracking`: qualidade do sinal e medição confiável.
- `data-quality-frameworks`: contratos de dados, validação e health checks automatizados.
- `computer-vision-expert`: qualidade de ROI/eventos CV, FN/FP, calibração por câmera.
- `data-storytelling`: narrativa executiva com decisão orientada por evidência.

## 3) Estado atual (snapshot 2026-03-19)
- Score geral: **66/100** (parcialmente confiável).
- Frescor de ingestão: bom (pipeline ativo near-real-time).
- `event_receipts`: grande avanço após fechamento de `processed_at`; health já automatizado.
- Gap crítico remanescente:
  - `conversion_metrics.metric_type` nulo: alto volume.
  - `conversion_metrics.roi_entity_id` nulo: alto volume.
- Loop de valor Copilot ainda sem tração (`action_outcome` / `value_ledger_daily` baixo ou zero em produção).

## 4) Definição de qualidade 95 (critérios objetivos)
Para considerar **95/100**, todos os itens abaixo precisam estar atendidos por 14 dias corridos:

1. Event Model Clarity
- 100% de eventos críticos com contrato canônico.
- 0% de nulos em campos identitários críticos (`metric_type`, `roi_entity_id`, `store_id`, `camera_id` quando aplicável).

2. Data Accuracy & Integrity
- Duplicação crítica < 0.1%.
- `event_receipts.pending_aged` <= threshold definido (sem backlog crônico).
- Reconciliação diária consistente entre tabelas atômicas e agregadas.

3. Conversion Definition Quality
- Conversão separada em:
  - `proxy` (CV)
  - `official` (PDV/gateway reconciliado)
- Dashboard sempre exibindo `status` da métrica (`official|proxy|estimated|not_applicable`).

4. Governança operacional
- Health checks automáticos + artifact diário.
- Ownership claro por trilha (produto, dados, CV, suporte).

## 5) Jornadas (User + Admin)

## 5.1 Jornada User (ICP)
Sequência obrigatória:
1. Home -> CTA -> Agendamento demo
2. Demo -> Register -> Callback/Auth
3. Onboarding guiado (loja -> edge -> câmeras -> ROI -> primeiro sinal)
4. Integrações (PDV/gateway) com assistente passo a passo
5. Trial com métricas e relatório de valor
6. Upgrade/assinatura
7. Operação recorrente com Copilot (ação -> resultado -> valor)

Eventos e KPIs por etapa:
- Aquisição: `demo_lead_created`, taxa `home->demo`.
- Ativação: tempo para primeira câmera online, tempo para ROI publicada, tempo para first_metrics_received.
- Trial: % lojas com insight útil + % com relatório final.
- Receita: trial->paid, tempo até assinatura, churn inicial.

## 5.2 Jornada Admin (SaaS + Suporte)
Sequência operacional:
1. Control Tower (todas contas/lojas)
2. Risco operacional e comercial
3. Suporte assistido (ROI/calibração/câmera)
4. Governança de dados e confiança por métrica
5. Escalonamento (incidentes, drift, rollback)

Blocos mínimos do painel Admin:
- Saúde de dados (receipts, nulos, freshness, erro por pipeline).
- Saúde CV (FN/FP por câmera/métrica, cobertura de ROI, pendências de calibração).
- Saúde comercial (trial, assinatura, risco de conversão).
- Saúde de suporte (fila, SLA, reincidência por loja).

## 6) Onde métricas são apresentadas e formato
- Store/Network Dashboard: visão executiva operacional (JSON REST `/v1/...`).
- Analytics/Reports: detalhes por período (bucket `hour|day`) e governança de métrica.
- Admin Control Tower: visão multi-conta, risco e health (`value_loop` e saúde operacional).
- Formato de exposição:
  - API JSON com payloads agregados e metadados de governança.
  - artifacts JSON de jobs para auditoria e decisão.
  - tabelas relacionais com contrato explícito e versionado.

## 7) Trilha de redução agressiva de nulos (imediata)

## 7.1 Ações técnicas
1. Backfill contínuo de `conversion_metrics` com limite por lote + scheduler.
2. Health check com threshold para nulos (`metric_type_null`, `roi_null`) e falha automática no job.
3. Bloqueio de novos nulos no write path (já em andamento; reforçar contratos legados).
4. Relatório diário com tendência de queda (% nulos por dia).

## 7.2 Meta operacional
- Semana 1: reduzir nulos em 60%.
- Semana 2: reduzir nulos para <=5%.
- Semana 3: zerar nulos novos e manter histórico residual <1%.

## 8) Trilha PDV/Gateway (dados reais de receita)

## 8.1 Modelo de integração (fases)
1. Fase A - Ingestão básica
- eventos de `transactions`, `sales_total`, `avg_ticket` com idempotência.
2. Fase B - Reconciliação
- cálculo de `conversion_rate_official` por loja/faixa horária.
3. Fase C - Ativação no produto
- dashboard e reports mostrando proxy vs oficial.
4. Fase D - Copilot financeiro
- recomendações com impacto financeiro validado em dado oficial.

## 8.2 Contratos mínimos
- Campos obrigatórios por transação: `store_id`, `timestamp`, `transaction_id`, `amount`, `payment_method`.
- Tolerância de atraso (SLA) por conector.
- Regras de dedupe e retentativa por fonte.

## 9) Trilha CV (ROI, screenshot, FN/FP, calibração)

## 9.1 Pipeline de qualidade CV
1. Snapshot ROI versionado por câmera.
2. Auditoria de evento atômico com contexto (`camera_id`, `roi_entity_id`, `metric_type`, `ts`).
3. Painel de confiança por métrica/câmera (inclui FN/FP estimado).
4. Calibração assistida com aprovação manual (`store_calibration_runs`).

## 9.2 Critérios CV para produção
- Entrada/fluxo (line ROI) com erro dentro do tolerado por segmento.
- Fila/checkout/ocupação com estabilidade por turno.
- Drift detectado e classificado em até 24h.

## 10) North Star e OKRs (produto funcional)

## North Star proposta
- `% de lojas com decisão acionável + resultado medido (ação->outcome->valor) por semana`.

## OKRs 8 semanas
1. Confiabilidade de dados
- KR1: `Signal Quality >=95`.
- KR2: nulos críticos <1%.
- KR3: pending aged receipts <= threshold em 99% das horas.

2. Valor de produto
- KR1: 80% das lojas em trial com primeiro insight em <=48h.
- KR2: trial->paid +30% vs baseline.
- KR3: 70% das recomendações do Copilot com evidência de outcome.

3. Operação admin/support
- KR1: MTTR de incidentes críticos <=30 min.
- KR2: 90% solicitações de suporte com resolução <=24h.

## 11) Backlog executivo priorizado (agora)

## P0 (esta semana)
1. Automação de backfill + health para nulos de `conversion_metrics`.
2. Dashboard Admin: card dedicado de qualidade de dados (nulos, backlog receipts, freshness).
3. Definir contrato canônico PDV/gateway e criar endpoint de ingestão v1.

## P1 (2 semanas)
1. Conector PDV/gateway piloto (1 provedor) com reconciliação diária.
2. Exibir no frontend `official vs proxy` em todos os KPIs de conversão.
3. Relatório executivo diário (auto) para produto/admin.

## P2 (4-8 semanas)
1. Escalar conectores (multigateway / multipdv).
2. Copilot com priorização por impacto financeiro oficial.
3. Benchmark multi-loja com confiança estatística por segmento.

## 12) Regras de GO/NO-GO
- GO para expansão comercial quando:
  - qualidade >=95,
  - conversão oficial ativa nas contas-alvo,
  - suporte/admin com SLA estabilizado.
- NO-GO quando:
  - nulos críticos em crescimento,
  - backlog de receipts fora do threshold,
  - CV sem calibração válida nas métricas vendidas.

## 13) Próxima execução recomendada
1. Implementar agora a automação completa para `conversion_metrics` (backfill + health + workflow + artifact).
2. Em paralelo, abrir trilha PDV/gateway com contrato v1 e endpoint de ingestão.
3. Atualizar painel Admin com score de qualidade único para decisão diária.
