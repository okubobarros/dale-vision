# CONTRACT: Action Outcome + Value Ledger v1

Status: `draft-active`  
Version: `value_ledger_v1_2026-03-15`  
Language: `pt-BR`

## 1) Objetivo
Fechar o loop de valor operacional:
- ação despachada
- resultado observado
- impacto esperado vs realizado
- consolidação diária por loja

## 2) Endpoints

### 2.1 Action Outcomes (store scoped)
`GET /api/v1/copilot/stores/{store_id}/actions/outcomes/`

Query params:
- `limit` (default `30`, max `200`)
- `status` (`dispatched|completed|failed|canceled`, opcional)

Resposta:
- `summary` com totais agregados
- `items` com histórico de outcomes

`POST /api/v1/copilot/stores/{store_id}/actions/outcomes/`

Payload mínimo:
```json
{
  "insight_id": "reports-priority-abc",
  "status": "dispatched"
}
```

Payload recomendado:
```json
{
  "action_event_id": "uuid-opcional",
  "insight_id": "reports-priority-abc",
  "action_type": "whatsapp_delegation",
  "channel": "whatsapp",
  "source": "reports_decision_center",
  "status": "completed",
  "impact_expected_brl": 420.0,
  "impact_realized_brl": 280.0,
  "confidence_score": 84,
  "baseline": { "queue_seconds": 420 },
  "outcome": { "queue_seconds": 210 }
}
```

### 2.2 Value Ledger Daily (store scoped)
`GET /api/v1/copilot/stores/{store_id}/value-ledger/daily/`

Query params:
- `days` (default `30`, max `180`)

Resposta:
- `method_version_current` (versão atual do método de cálculo em uso)
- `totals` da janela solicitada
- `items` por dia (`ledger_date`)

### 2.3 Action Outcomes (network scoped)
`GET /api/v1/copilot/network/actions/outcomes/`

Query params:
- `limit` (default `30`, max `200`)
- `status` (`dispatched|completed|failed|canceled`, opcional)

Resposta:
- `store_id: "all"`
- `summary` consolidado da rede (tenant atual)
- `breakdown_by_store` (top lojas por impacto esperado, com `store_id` e `store_name`)
- `items` com outcomes recentes da rede

### 2.4 Value Ledger Daily (network scoped)
`GET /api/v1/copilot/network/value-ledger/daily/`

Query params:
- `days` (default `30`, max `180`)

Resposta:
- `method_version_current` (versão atual do método de cálculo em uso)
- `store_id: "all"`
- `pipeline_health` (status `healthy|stale|no_data`, frescor e cobertura de lojas)
- `totals` consolidados da rede (tenant atual)
- `breakdown_by_store` (top lojas por risco no período, com `store_id` e `store_name`)
- `items` com série diária consolidada

## 3) Regras v1
- `ActionOutcome` sempre pertence a uma loja (`store_id`) e org (`org_id`).
- `POST outcome` sincroniza `value_ledger_daily` do dia de `dispatched_at`.
- `confidence_score_avg` no ledger é média simples diária dos outcomes.
- Monetização segue transparência:
  - sem POS oficial, `impact_realized_brl` pode iniciar como `proxy|estimated`.

## 4) Compatibilidade e evolução
- v1 prioriza trilha de valor por loja.
- v2 deve incluir:
  - breakdown nativo por loja e por turno dentro dos endpoints de rede;
  - regras de attribution por janela/turno;
  - reconciliação com POS quando disponível.
