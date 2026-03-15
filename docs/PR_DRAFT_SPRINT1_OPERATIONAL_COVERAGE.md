# PR Draft: Sprint 1 - Aderência Operacional (Fluxo vs Staff)

## Title
`feat(sprint-1): operacionalizar contrato de cobertura com janela 5min e governança de confiança`

## Contexto
Esta PR transforma a base de leitura de produtividade de uma visão analítica genérica para um contrato executivo acionável:
- planejamento de staff (proxy/manual)
- presença detectada por CV
- lacunas de cobertura por janela operacional
- confiança explícita (`official/proxy/estimated`)

## Escopo Entregue
- Materialização de `operational_window_hourly`.
- Job recorrente (`copilot_operational_window_tick`) para 5/10 minutos.
- Retenção diária de `operational_window_hourly` com comando de cleanup e workflow dedicado.
- Contrato `/api/v1/productivity/coverage` com método versionado.
- Endpoint por loja `/api/v1/stores/{store_id}/productivity/coverage/`.
- Endpoints de saúde de ingestão:
  - `/api/v1/stores/{store_id}/vision/ingestion-summary/`
  - `/api/v1/stores/network/vision/ingestion-summary/`
- Bloco `operational_window` adicionado no `operational_summary` dos endpoints de ingestão.
- Ajustes de UI em `/app/dashboard`, `/app/reports` e Store View para:
  - badges de confiança;
  - saúde do pipeline;
  - saúde da materialização operacional.
- Scheduler via GitHub Actions para ambientes sem Render Jobs.
- Registro de ação executiva (`action_dispatched`) integrado ao fluxo de delegação.

## Contratos
- `docs/contracts/CONTRACT_PRODUCTIVITY_COVERAGE_EXECUTIVE_V1.md`
- `docs/contracts/schemas/productivity_coverage_executive_v1.schema.json`
- `POST /api/v1/alerts/actions/dispatch/` (contrato descrito em `CONTRACT_PRODUCTIVITY_COVERAGE_EXECUTIVE_V1.md`, seção 6)

## Fluxo de Dados
1. Eventos CV/edge (`vision_atomic_events`, métricas de tráfego/conversão).
2. Tick recorrente consolida janela operacional.
3. API de cobertura retorna payload executivo.
4. APIs de ingestão retornam saúde de pipeline + saúde da materialização (`operational_window`).
5. Dashboard/Reports/Store View renderizam KPIs e confiança.
6. Delegações/aprovações registram `action_dispatched` para trilha de valor.

## Critérios de Aceite
- [x] Workflow `Copilot Operational Window Tick` rodando com sucesso.
- [x] Workflow `Copilot Operational Window Cleanup` rodando diariamente.
- [x] Reports com `method.version = coverage_operational_window_v1_2026-03-14`.
- [x] Store View com tabela de aderência por janela de 5min.
- [x] Badges de confiança exibidos em métricas críticas.
- [x] Saúde de ingestão + materialização exibida em Dashboard, Reports e Store View.
- [x] Fluxo de delegação registra `action_dispatched` (evento + endpoint genérico).

## Evidências (commits)
- `cdae3a9` endpoint de ingestão de rede.
- `5b3111f` saúde de ingestão no dashboard executivo.
- `b8c255f` saúde de ingestão na visão da loja.
- `73131b3` filtro `event_type` na ingestão.
- `2f1aa6d` filtro de ingestão em dashboard e store.
- `cdeabcb` emissão `action_dispatched` na delegação WhatsApp por evento.
- `e5ec82b` cleanup de retenção + workflow diário.
- `0af1117` hardening Node24 em workflows.
- `baaeadb` `operational_window` no resumo de ingestão (store/rede).
- `65aa0f7` saúde de ingestão/materialização em reports.
- `99e2ce1` endpoint genérico `POST /alerts/actions/dispatch/`.
- `058c818` aprovação de intervenção em reports também despacha ação.

## Plano de Testes
Backend:
```bash
python manage.py test apps.copilot.tests_operational_window apps.copilot.tests_operational_window_command -v 2
python manage.py test apps.core.tests_productivity_coverage apps.stores.tests_productivity_coverage -v 2
python manage.py test apps.stores.tests_vision_audit apps.stores.tests_network_ingestion_summary -v 2
python manage.py test apps.alerts.tests.test_action_dispatch -v 2
```

Frontend:
```bash
pnpm -C frontend lint
pnpm -C frontend build
```

Smoke:
```bash
python manage.py copilot_operational_window_tick --max-stores 5 --window-minutes 5
```

## Riscos / Pontos de Atenção
- Enum legado de `camera_status` sem `degraded` (há fallback aplicado).
- Verificar periodicamente se `retention_days=30` atende histórico necessário antes de ajustar.
- Cron do GitHub pode ter atraso de alguns minutos em horários de pico.
- `action_dispatched` ainda sem medição de `outcome` automatizada (fase seguinte: ledger de resultado).
