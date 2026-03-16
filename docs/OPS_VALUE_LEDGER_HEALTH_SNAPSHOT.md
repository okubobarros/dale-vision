# OPS: Value Ledger Health Snapshot

## Finalidade
Gerar evidência operacional objetiva da trilha `dispatch -> outcome -> value_ledger` por loja/rede, com foco em:
- cobertura de lojas com ledger;
- frescor vs SLO;
- risco líquido (`value_net_gap_brl`);
- status por loja (`healthy | stale | no_data`).

## Comando
```bash
python manage.py copilot_value_ledger_health_snapshot --days 7 --max-stores 500 --slo-target-seconds 900
```

## Parâmetros
- `--store-id <uuid>`: audita somente uma loja.
- `--days <1..180>`: janela de consolidação (default `7`).
- `--max-stores <n>`: limite em modo rede (default `500`).
- `--slo-target-seconds <n>`: SLO de frescor em segundos (default `900` = 15 min).
- `--json-output <path>`: salva payload JSON para evidência.

## Exemplo com artifact
```bash
python manage.py copilot_value_ledger_health_snapshot \
  --days 7 \
  --max-stores 500 \
  --slo-target-seconds 900 \
  --json-output artifacts/value_ledger_health_snapshot.json
```

## Saída esperada
- Resumo em stdout:
  - total de lojas auditadas;
  - cobertura com ledger;
  - contagem por status (`healthy`, `stale`, `no_data`).
- JSON com:
  - metadados do snapshot;
  - métricas agregadas;
  - lista por loja com `freshness_seconds`, `last_updated_at`, `completion_rate`, `recovery_rate` e `value_net_gap_brl`.

## Uso na Sprint 2
- Rodar diariamente para produzir evidência multi-loja.
- Critério mínimo sugerido de aceite:
  - `coverage_rate >= 80%`
  - `stale` em tendência de queda
  - `no_data` somente para lojas explicitamente sem operação no período.

## Automação via GitHub Actions
Workflow:
- `.github/workflows/copilot_value_ledger_health_snapshot.yml`

Comportamento:
- `schedule`: executa de hora em hora (`0 * * * *`).
- `workflow_dispatch`: execução manual com parâmetros (`days`, `max_stores`, `slo_target_seconds`).
- gera artifact `value-ledger-health-snapshot` com o JSON do snapshot.

Secrets obrigatórios:
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`

Variáveis opcionais (Repository Variables):
- `COPILOT_LEDGER_SNAPSHOT_DAYS`
- `COPILOT_LEDGER_SNAPSHOT_MAX_STORES`
- `COPILOT_LEDGER_SNAPSHOT_SLO_SECONDS`

## Relatório diário de aceite (GO/NO-GO)
Comando:
```bash
python manage.py copilot_value_ledger_acceptance_report \
  --days 7 \
  --max-stores 500 \
  --slo-target-seconds 900 \
  --coverage-min 80 \
  --stale-rate-max 20 \
  --no-data-rate-max 20
```

Saída default:
- `dalevision-specs/70_ops/Sprint2_Acceptance_Report_YYYY-MM-DD.md`

Objetivo:
- transformar o snapshot técnico em decisão operacional diária de sprint (`GO` ou `NO-GO`) com critérios explícitos.

Automação:
- workflow `.github/workflows/copilot_sprint2_acceptance_report.yml`
- agenda diária às `23:30 UTC` + execução manual.
- artifact: `sprint2-acceptance-report` (Markdown consolidado).

Variáveis opcionais (Repository Variables):
- `COPILOT_ACCEPTANCE_REPORT_DAYS`
- `COPILOT_ACCEPTANCE_REPORT_MAX_STORES`
- `COPILOT_ACCEPTANCE_REPORT_SLO_SECONDS`
- `COPILOT_ACCEPTANCE_REPORT_COVERAGE_MIN`
- `COPILOT_ACCEPTANCE_REPORT_STALE_RATE_MAX`
- `COPILOT_ACCEPTANCE_REPORT_NO_DATA_RATE_MAX`

## Pacote final de evidencias (checklist centralizado)
Comando:
```bash
python manage.py copilot_sprint2_evidence_pack \
  --days 7 \
  --max-stores 500 \
  --slo-target-seconds 900 \
  --coverage-min 80 \
  --stale-rate-max 20 \
  --no-data-rate-max 20
```

Saida default:
- `dalevision-specs/70_ops/Sprint2_Evidence_Pack_YYYY-MM-DD.md`

Conteudo:
- decisao `GO/NO-GO`;
- checklist final de fechamento da Sprint 2;
- KPIs de aceite (coverage/stale/no_data/completion/recovery/gap);
- top lojas por risco liquido;
- referencias de workflows/docs para auditoria.

Automação recomendada (principal):
- workflow `.github/workflows/copilot_sprint2_evidence_pack.yml`
- agenda diária às `23:45 UTC` + execução manual.
- artifact: `sprint2-evidence-pack` (Markdown único para decisão executiva).

Variáveis opcionais (Repository Variables):
- `COPILOT_EVIDENCE_PACK_DAYS`
- `COPILOT_EVIDENCE_PACK_MAX_STORES`
- `COPILOT_EVIDENCE_PACK_SLO_SECONDS`
- `COPILOT_EVIDENCE_PACK_COVERAGE_MIN`
- `COPILOT_EVIDENCE_PACK_STALE_RATE_MAX`
- `COPILOT_EVIDENCE_PACK_NO_DATA_RATE_MAX`
