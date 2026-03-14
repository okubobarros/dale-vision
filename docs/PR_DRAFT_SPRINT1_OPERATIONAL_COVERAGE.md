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
- Contrato `/api/v1/productivity/coverage` com método versionado.
- Endpoint por loja `/api/v1/stores/{store_id}/productivity/coverage/`.
- Ajustes de UI em `/app/reports` e Store View para badges de confiança.
- Scheduler via GitHub Actions para ambientes sem Render Jobs.

## Contratos
- `docs/contracts/CONTRACT_PRODUCTIVITY_COVERAGE_EXECUTIVE_V1.md`
- `docs/contracts/schemas/productivity_coverage_executive_v1.schema.json`

## Fluxo de Dados
1. Eventos CV/edge (`vision_atomic_events`, métricas de tráfego/conversão).
2. Tick recorrente consolida janela operacional.
3. API de cobertura retorna payload executivo.
4. Dashboard/Reports/Store View renderizam KPIs e confiança.

## Critérios de Aceite
- [ ] Workflow `Copilot Operational Window Tick` rodando com sucesso.
- [ ] Reports com `method.version = coverage_operational_window_v1_2026-03-14`.
- [ ] Store View com tabela de aderência por janela de 5min.
- [ ] Badges de confiança exibidos em métricas críticas.

## Plano de Testes
Backend:
```bash
python manage.py test apps.copilot.tests_operational_window apps.copilot.tests_operational_window_command -v 2
python manage.py test apps.core.tests_productivity_coverage apps.stores.tests_productivity_coverage -v 2
```

Frontend:
```bash
pnpm -C frontend lint
```

Smoke:
```bash
python manage.py copilot_operational_window_tick --max-stores 5 --window-minutes 5
```

## Riscos / Pontos de Atenção
- Enum legado de `camera_status` sem `degraded` (há fallback aplicado).
- Crescimento de `operational_window_hourly` exige política de retenção.
- Cron do GitHub pode ter atraso de alguns minutos em horários de pico.
