# Copilot Operational Data Architecture (S3)

## 1) Estado atual (o que já existe)

### Fontes de dados reais já disponíveis
- `stores` + `organizations` + `org_members`: estado comercial e estrutura da rede.
- `cameras` + `camera_health_logs`: saúde de câmera, latência, erro e última leitura.
- `edge_edgeeventreceipt` e `stores.last_seen_at`: sinais de edge/heartbeat.
- `traffic_metrics`, `conversion_metrics`, `vision_atomic_events`: base operacional e visão computacional.
- `detection_events` + `alert_rules` + `notification_logs`: alertas operacionais.
- `onboarding_progress`: progresso de implantação.
- Endpoints existentes:
  - `/api/v1/stores/{id}/dashboard/`
  - `/api/v1/stores/{id}/edge-status/`
  - `/api/v1/stores/{id}/ceo-dashboard/`
  - `/api/v1/stores/{id}/vision/confidence/`
  - `/api/v1/stores/{id}/vision/calibration-plan/`
  - `/api/v1/report/summary|impact|export/`

### Copiloto (estado atual)
- Frontend: existe experiencia contextual no dashboard/operations, mas ainda sem fluxo completo de inteligencia operacional em tempo real.
- Backend: dominio dedicado ja criado e migrado:
  - `copilot_dashboard_context_snapshots`
  - `copilot_operational_insights`
  - `copilot_reports_72h`
  - `copilot_conversations`
  - `copilot_messages`
- Estado funcional atual:
  - persistencia estrutural pronta;
  - contratos basicos preparados;
  - geracao automatica de insight/relatorio ainda em evolucao (sem LLM obrigatoria no loop principal).

## 2) Lacunas para Copiloto como “cérebro”

- Falta um **context snapshot** único para home do dashboard.
- Falta pipeline online para manter snapshots atualizados com SLO definido.
- Falta geracao deterministica de insight baseada em regras/thresholds antes da camada LLM.
- Falta contrato final do relatorio 72h com versao, status e publish controlado.
- Falta amarracao completa entre calibracao (`vision_calibration_runs`) e confianca exibida no Copilot/dashboard.
- Falta observabilidade de ponta a ponta (coleta -> insight -> recomendacao -> acao do usuario).

## 2.1 Aprendizados recentes (2026-03-13)
- Nao existe valor em IA sem base operacional confiavel por loja/turno.
- Erro de UX em plano/limite derruba confianca mesmo quando regra tecnica esta correta.
- O Copilot precisa nascer com evidencias e trilha auditavel, nao com texto generico.
- Primeiro ganho real deve vir de recomendacao acionavel e priorizacao, nao de narrativa longa.

## 3) Arquitetura recomendada

### 3.1 Novas tabelas mínimas
- `copilot_dashboard_context_snapshots`
  - `id`, `org_id`, `store_id`, `account_state`, `operational_state`, `snapshot_json`, `generated_at`
- `copilot_operational_insights`
  - `id`, `org_id`, `store_id`, `category`, `severity`, `headline`, `description`, `evidence_json`, `confidence`, `status`, `created_at`, `expires_at`
- `copilot_reports_72h`
  - `id`, `org_id`, `store_id`, `status`, `summary_json`, `sections_json`, `generated_at`, `source_window_start`, `source_window_end`
- `copilot_conversations`
  - `id`, `org_id`, `store_id`, `user_uuid`, `session_id`, `created_at`, `updated_at`
- `copilot_messages`
  - `id`, `conversation_id`, `role`, `content`, `context_json`, `citations_json`, `created_at`

### 3.2 Endpoints novos (contrato)
- `GET /api/v1/copilot/stores/{store_id}/context/`
- `GET /api/v1/copilot/stores/{store_id}/insights/`
- `GET /api/v1/copilot/stores/{store_id}/report-72h/`
- `GET /api/v1/copilot/stores/{store_id}/conversations/`
- `POST /api/v1/copilot/stores/{store_id}/chat/`

### 3.2.1 Estrategia de entrega por fases
1. Fase A (deterministica, sem LLM obrigatoria)
- gerar insights por regras e thresholds auditaveis;
- preencher dashboard e operations com recomendacoes de acao;
- registrar tudo em `copilot_operational_insights`.

2. Fase B (LLM assistida)
- usar LLM para sumarizacao, explicacao e priorizacao contextual;
- sempre com citacao de evidencia (`evidence_json` + `citations_json`);
- fallback deterministico quando LLM indisponivel.

3. Fase C (orquestracao)
- disparo por canal (dashboard/email/whatsapp) conforme regra e severidade;
- fechamento de loop com status de entrega e acao tomada.

### 3.3 Pipeline de dados (CV -> Copilot)
1. Edge publica eventos e saúde (`vision_atomic_events`, `camera_health_logs`, `edge receipts`).
2. Jobs agregam métricas por janela (15m, 1h, 24h, 72h).
3. Job de `insight builder` escreve `copilot_operational_insights` com evidência.
4. Job de `report builder` consolida 72h em `copilot_reports_72h`.
5. Dashboard lê contexto/snapshots e renderiza estados reais.
6. Copiloto consulta contexto + insights + memória conversacional.

## 4) Calibração (admin e cliente)

### Operação recomendada
- Admin:
  - define baseline por tipo de câmera/cenário;
  - aprova run de calibração quando erro < limiar.
- Cliente (perfil manager/owner):
  - executa checklist guiado de calibração na loja;
  - aplica ajustes de ROI e valida cobertura.

### Métricas de qualidade mínimas
- cobertura ROI (% área útil monitorada)
- estabilidade de detecção por câmera
- latência fim-a-fim
- taxa de eventos válidos por janela
- desvio entre referência manual vs sistema (`error_pct`)

## 5) Confiabilidade, manutenção e backup

- Backup:
  - snapshots diários de tabelas críticas (`vision_atomic_events`, `copilot_*`, `camera_health_logs`).
  - retenção quente (30 dias) + fria (90/180 dias conforme custo).
- Observabilidade:
  - SLO de atualização do contexto do dashboard (ex.: < 5 min).
  - alertas para atrasos de pipeline e falhas de geração de insight.
- Auditoria:
  - rastrear `insight -> evidence` para evitar recomendações sem base.
- Degradação graciosa:
  - quando não houver evidência suficiente, responder com estado “consolidando sinais”, sem inventar análise.

## 7) Norte de valor para ICP multilojista
- O usuario paga para decidir mais rapido e com menos risco.
- O Copilot deve responder: onde agir agora, qual impacto esperado e qual evidência suporta a recomendacao.
- Toda tela principal precisa priorizar:
  1. risco operacional atual,
  2. acao recomendada,
  3. impacto esperado,
  4. nivel de confianca da leitura.

## 8) UX do Copiloto (decisão de produto)
- O Copiloto nao depende de experiencia full-screen para gerar valor.
- Forma principal:
  - painel contextual em `dashboard`, `operations` e `store view`.
- Forma opcional:
  - tela dedicada quando houver necessidade de analise longa.
- Obrigatorio:
  - historico de consulta persistido (`copilot_conversations` + `copilot_messages`);
  - contexto da pergunta persistido (`context_json`);
  - trilha de evidencias (`citations_json`) para resposta auditavel.

## 6) Payload ideal da home (referência)

```json
{
  "org": { "id": "...", "name": "Rede X" },
  "store": { "id": "...", "name": "Loja Centro" },
  "account_state": "plan_active",
  "operational_state": "collecting_data",
  "trial": { "collected_hours": 31, "target_hours": 72, "eta_hours": 41 },
  "coverage": { "cameras_online": 2, "cameras_offline": 1, "cameras_total": 3, "plan_limit": 3 },
  "kpis": [...],
  "insights": [...],
  "report_72h": { "status": "pending", "generated_at": null },
  "copilot": {
    "recommended_prompts": [...],
    "last_summary": null
  },
  "generated_at": "2026-03-12T12:00:00Z"
}
```
