# Support Playbook

## Objetivo
Padronizar suporte e reduzir tempo de resolução.

## Fluxo de atendimento
1. Triagem
2. Coleta de dados
3. Diagnóstico
4. Resolução
5. Follow-up

## Dados mínimos
- Store ID
- Org ID
- Logs do edge-agent
- Erro no backend

## Coleta rápida (Edge Agent)
- `Diagnose.bat` (gera ZIP de diagnóstico)
- `logs\agent.log`
- `logs\update.log`
- Runbook de limpeza/reinstalação:
  - `70_ops/Edge_Autostart_Clean_Reset_Runbook.md`

## Checagem rápida de Storage (ROI Snapshot)
- `GET /api/v1/system/storage-status/` (somente staff)
- Verificar `configured`, `supabase_url_present`, `service_role_present`, `bucket`
- Bucket esperado: `camera-snapshots`

## Escalonamento
- Quando envolver infra, billing ou segurança

## Runbook: Outcome e Value Ledger (Sprint 2)

### Quando usar
- Reports sem atualização de valor (`pipeline_health.status = stale`).
- Ações despachadas sem evolução para concluídas.
- Diferença anômala entre `value_at_risk_brl` e `value_recovered_brl`.

### Checklist de triagem
1. Confirmar escopo:
- `store_id` (modo loja) ou `all` (modo rede).
2. Validar saúde do pipeline:
- `GET /api/v1/copilot/stores/:store_id/value-ledger/daily/?days=7`
- `GET /api/v1/copilot/network/value-ledger/daily/?days=7`
3. Conferir campos:
- `pipeline_health.status`
- `pipeline_health.freshness_seconds`
- `pipeline_health.slo_target_seconds`
- `pipeline_health.slo_breached`
- `pipeline_health.last_updated_at`
4. Confirmar trilha de ação:
- `GET /api/v1/copilot/stores/:store_id/actions/outcomes/?limit=30`
- `GET /api/v1/copilot/network/actions/outcomes/?limit=30`

### Regras operacionais (SLO)
- Alvo de frescor do ledger: `<= 900s` (15 min).
- `healthy`: dentro do alvo.
- `stale`: acima do alvo, exige intervenção.
- `no_data`: sem materialização no período selecionado.

### Diagnóstico rápido por sintoma
- `stale` com `slo_breached = true`:
  - verificar job `copilot_operational_window_tick` e logs do worker.
  - verificar quedas de ingestão de eventos.
- `no_data` com loja ativa:
  - verificar se existem dispatches/outcomes no período.
  - validar associação de loja/câmeras e cobertura de eventos.
- `actions_dispatched` alto e `actions_completed` baixo:
  - investigar gargalo de execução operacional (gerente/equipe).
  - revisar canal de delegação e confirmação de conclusão.

### Evidência mínima para fechamento de incidente
- Print/JSON do endpoint afetado antes e depois.
- Horário UTC do início/fim da degradação.
- Causa raiz classificada (`ingestao`, `materializacao`, `operacao`, `dados`).
- Ação corretiva aplicada e status final (`healthy` ou `no_data justificado`).
