# CONTRACT: Productivity Coverage Executive v1

Status: `active`  
Version: `coverage_operational_window_v1_2026-03-14`  
Language: `pt-BR`

## 1) Objetivo
Contrato de dados para leitura executiva de aderência operacional em rede/loja:
- fluxo de clientes
- staff planejado (proxy/manual)
- staff detectado (CV)
- lacunas de cobertura
- governança de confiança (`official/proxy/estimated`)

## 2) Endpoints

### 2.1 Rede (Reports)
`GET /api/v1/productivity/coverage`  
`GET /api/v1/productivity/coverage/`

Parâmetros:
- `period`: `7d | 30d | 90d | custom`
- `from`: ISO datetime (opcional)
- `to`: ISO datetime (opcional)
- `store_id`: UUID opcional (quando presente, filtra para 1 loja)

### 2.2 Loja (Store View)
`GET /api/v1/stores/{store_id}/productivity/coverage/`

Parâmetros:
- `period`: `7d | 30d | 90d`
- `from`: ISO datetime (opcional)
- `to`: ISO datetime (opcional)

## 3) Payload de resposta (v1)
```json
{
  "period": "7d",
  "from": "2026-03-07T00:00:00Z",
  "to": "2026-03-14T00:00:00Z",
  "store_id": null,
  "stores_count": 3,
  "method": {
    "id": "productivity_coverage",
    "version": "coverage_operational_window_v1_2026-03-14",
    "label": "Cobertura operacional por janela de 5 minutos",
    "description": "Compara fluxo e presença detectada contra referência de staff planejado por janela operacional."
  },
  "confidence_governance": {
    "status": "alto",
    "score": 87,
    "source_flags": {
      "footfall": "official",
      "staff_planned_ref": "proxy",
      "staff_detected_est": "official",
      "coverage_gap": "proxy"
    },
    "caveats": [
      "Escala planejada ainda sem integração ERP/WFM; referência pode ser proxy da loja."
    ]
  },
  "summary": {
    "gaps_total": 14,
    "critical_windows": 3,
    "warning_windows": 5,
    "adequate_windows": 40,
    "worst_window": null,
    "best_window": null,
    "peak_flow_window": null,
    "opportunity_window": null,
    "planned_source_mode": "proxy"
  },
  "windows": [
    {
      "ts_bucket": "2026-03-14T12:35:00Z",
      "hour_label": "09:35",
      "window_minutes": 5,
      "footfall": 16,
      "staff_planned_ref": 3,
      "staff_detected_est": 2.0,
      "coverage_gap": 1,
      "gap_status": "atencao",
      "source_flags": {
        "footfall": "official",
        "staff_planned_ref": "proxy",
        "staff_detected_est": "official",
        "coverage_gap": "proxy"
      },
      "confidence_score": 84,
      "method": {
        "id": "operational_window",
        "version": "operational_window_v1_2026-03-14"
      }
    }
  ]
}
```

## 4) Taxonomia de confiança
- `official`: métrica baseada em fonte observada direta no pipeline atual.
- `proxy`: métrica derivada por regra de negócio/heurística.
- `estimated`: métrica estimada sem fonte oficial (ex.: R$ sem POS).
- `manual`: entrada explícita de usuário (quando aplicável).
- `derived`: cálculo derivado de outras métricas.

## 5) Regra de fallback
Quando não existir materialização em `operational_window_hourly`:
- backend usa fallback legado de cobertura horária.
- frontend deve exibir governança com status apropriado e caveat.

## 6) Evento de ação (delegação)
Para alimentar Value Ledger, o clique de delegação deve gerar evento lógico `action_dispatched`.

Canônico atual:
- `event_name`: `alert_delegate_whatsapp_requested`
- Persistência: `journey_events` + `notification_logs`

Mapeamento para o domínio executivo:
- `action_dispatched.type = whatsapp_delegation`
- `action_dispatched.source = copilot_decision_center`

Payload mínimo recomendado:
```json
{
  "event_name": "action_dispatched",
  "event_version": "v1",
  "store_id": "uuid",
  "insight_id": "string",
  "channel": "whatsapp",
  "expected_impact_brl": 420.0,
  "confidence_score": 84,
  "requested_by_user_id": "uuid-or-int",
  "requested_at": "2026-03-14T12:40:00Z"
}
```

## 7) Como os dados alimentam a UI
1. Edge/CV grava eventos em `vision_atomic_events` + métricas agregadas.
2. Job `copilot_operational_window_tick` roda a cada 5 min.
3. Job materializa `operational_window_hourly`:
   - métricas
   - `metric_status_json`
   - `confidence_score`
4. APIs de reports/store leem `operational_window_hourly`.
5. Frontend renderiza:
   - cards executivos
   - gaps por janela
   - badges de confiança

## 8) Compatibilidade
- Rotas com e sem `/` em `productivity/coverage` são suportadas.
- Contrato é backward compatible via fallback legado.
