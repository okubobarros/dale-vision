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
