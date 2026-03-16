# CONTRACT: Edge Auto-Update v1

Status: `draft-active`  
Version: `edge_update_v1_2026-03-16`  
Language: `pt-BR`

## 1) Objetivo
Padronizar auto-update do edge-agent para reduzir operação manual em lojas remotas, com:
- rollout controlado por canal (`stable`/`canary`);
- verificação de integridade de pacote;
- health gate pós-update;
- rollback automático com telemetria.

## 2) Escopo
- Repo de controle: `dale-vision` (backend/API/política de rollout).
- Repo de execução: `dalevision-edge-agent` (download, swap de versão, health check, rollback).

## 3) Endpoints (backend)

### 3.0 Status operacional por loja (app)
`GET /api/v1/stores/{store_id}/edge-update-status/`

Uso:
- leitura operacional para dashboard/ops com:
  - policy ativa (`channel`, `target_version`);
  - último evento de update;
  - status resumido de rollout (`healthy|degraded|in_progress|no_data`).

### 3.0.1 Gestão de policy por loja (app/admin)
`GET /api/v1/stores/{store_id}/edge-update-policy/`  
`PUT /api/v1/stores/{store_id}/edge-update-policy/`

Uso:
- `GET`: leitura da policy efetiva da loja para operação/suporte.
- `PUT`: atualização da policy por papéis de gestão (`owner|admin|manager`).

Payload mínimo do `PUT`:
```json
{
  "target_version": "1.5.0",
  "package": {
    "url": "https://cdn.dalevision.com/edge/1.5.0/edge-agent-windows.zip",
    "sha256": "hexstring"
  }
}
```

Campos opcionais:
- `channel`, `current_min_supported`, `rollout_window`, `health_gate`, `rollback_policy`, `active`.

### 3.0.2 Feed de eventos de update por loja (app/ops)
`GET /api/v1/stores/{store_id}/edge-update-events/`

Query params:
- `limit` (default `20`, max `100`)
- `status` (opcional)
- `agent_id` (opcional)

Uso:
- timeline de execução do auto-update para suporte e auditoria operacional.
- cada item retorna `playbook_hint` quando `reason_code` tiver mapeamento conhecido.

### 3.0.3 Runbook estruturado por motivo (app/ops)
`GET /api/v1/stores/{store_id}/edge-update-runbook/`

Query params:
- `reason_code` (opcional; se ausente, usa último `failed|rolled_back` da loja)

Uso:
- retornar checklist operacional estruturado para diagnóstico e resolução.

Resposta (resumo):
```json
{
  "store_id": "...",
  "store_name": "...",
  "generated_at": "2026-03-16T10:30:00Z",
  "runbook": {
    "reason_code": "NETWORK_ERROR",
    "known_reason": true,
    "title": "Falha de conectividade no update",
    "severity": "alta",
    "summary": "...",
    "immediate_actions": ["..."],
    "diagnostic_steps": ["..."],
    "evidence_to_collect": ["..."]
  }
}
```

### 3.0.4 Telemetria de abertura de runbook (app/ops)
`POST /api/v1/stores/{store_id}/edge-update-runbook/opened/`

Payload:
```json
{
  "reason_code": "NETWORK_ERROR",
  "source_page": "edge_help"
}
```

Uso:
- registrar que o time abriu runbook contextual para medição de adoção e tempo de resolução.

### 3.0.5 Resumo de rollout em nível de rede (app/ops executivo)
`GET /api/v1/stores/network/edge-update-rollout-summary/`

Uso:
- visão consolidada da rede para operação executiva, com:
  - contagem de lojas por `health` (`healthy|degraded|in_progress|no_data`);
  - distribuição por canal (`stable|canary`);
  - lista priorizada de lojas críticas para intervenção imediata.

Resposta (resumo):
```json
{
  "scope": "network",
  "totals": {
    "stores": 12,
    "with_policy": 10,
    "channel": { "stable": 8, "canary": 2 },
    "health": { "healthy": 7, "degraded": 2, "in_progress": 1, "no_data": 2 }
  },
  "rollout_health": {
    "status": "degraded",
    "recommended_action": "Lojas com falha/rollback detectado. Priorizar runbook e estabilização."
  },
  "critical_stores": [
    {
      "store_id": "...",
      "store_name": "Loja Centro",
      "health": "degraded",
      "channel": "canary",
      "target_version": "1.5.0",
      "last_event": "edge_update_failed",
      "last_status": "failed",
      "reason_code": "NETWORK_ERROR",
      "timestamp": "2026-03-16T10:32:00Z"
    }
  ],
  "generated_at": "2026-03-16T10:35:00Z"
}
```

### 3.0.6 Resumo de validação S4 (GO/NO-GO) em nível de rede
`GET /api/v1/stores/network/edge-update-validation-summary/`

Query params:
- `channel` (opcional: `stable|canary`; default `all`)
- `hours` (opcional; default `72`; max operacional definido no backend)

Uso:
- consolidar decisão operacional de campo (`GO` ou `NO-GO`) com checklist objetivo;
- servir Dashboard/Operations/Reports com leitura única de readiness da Sprint 4;
- reduzir dependência de comando manual para leitura executiva diária.

Resposta (resumo):
```json
{
  "scope": "network",
  "filters": {
    "channel": "all",
    "hours": 72
  },
  "summary": {
    "stores_total": 12,
    "stores_with_healthy_attempt": 3,
    "stores_with_failure_attempt": 2,
    "stores_with_rollback_attempt": 1,
    "attempts_total": 18,
    "healthy_attempts": 10,
    "failed_attempts": 5,
    "rollback_attempts": 2,
    "incomplete_attempts": 1,
    "success_rate_pct": 55.56,
    "failure_rate_pct": 27.78,
    "rollback_rate_pct": 11.11,
    "avg_duration_seconds": 92.4,
    "decision": "NO-GO"
  },
  "checklist": {
    "canary_ready": true,
    "rollback_ready": true,
    "telemetry_ready": true
  },
  "stores": [
    {
      "store_id": "47daec5a-11c3-4556-8dd8-fd2b00aa1bb0",
      "attempts_total": 4,
      "healthy_attempts": 2,
      "failed_attempts": 1,
      "rollback_attempts": 1,
      "incomplete_attempts": 0,
      "has_healthy_attempt": true,
      "has_failure_attempt": true,
      "has_rollback_attempt": true
    }
  ],
  "generated_at": "2026-03-16T22:55:00Z"
}
```

### 3.1 Policy pull (agent -> cloud)
`GET /api/v1/edge/update-policy/`

Headers esperados:
- `X-EDGE-TOKEN`
- `X-AGENT-ID` (opcional; usado para telemetria/contexto)

Resposta (exemplo):
```json
{
  "store_id": "47daec5a-11c3-4556-8dd8-fd2b00aa1bb0",
  "agent_id": "edge-kiosk-01",
  "policy_id": "0f63c745-8d6f-49b5-ae9d-bf5e58b6b7c1",
  "policy_updated_at": "2026-03-16T10:20:00Z",
  "policy_fingerprint": "9f6c8a8a0f6f7f4a4c9a9a3f8f6e8aa65f7be2e8d8a7b7a08b665d7b9aa4a121",
  "channel": "stable",
  "target_version": "1.4.2",
  "current_min_supported": "1.3.0",
  "rollout_window": {
    "start_local": "02:00",
    "end_local": "05:00",
    "timezone": "America/Sao_Paulo"
  },
  "package": {
    "url": "https://cdn.dalevision.com/edge/1.4.2/edge-agent-windows.zip",
    "sha256": "hexstring",
    "size_bytes": 73400320
  },
  "health_gate": {
    "max_boot_seconds": 120,
    "require_heartbeat_seconds": 180,
    "require_camera_health_count": 3
  },
  "rollback_policy": {
    "enabled": true,
    "max_failed_attempts": 1
  },
  "generated_at": "2026-03-15T23:40:00Z"
}
```

### 3.2 Update report (agent -> cloud)
`POST /api/v1/edge/update-report/`

Payload (exemplo):
```json
{
  "store_id": "47daec5a-11c3-4556-8dd8-fd2b00aa1bb0",
  "agent_id": "edge-kiosk-01",
  "from_version": "1.4.1",
  "to_version": "1.4.2",
  "channel": "stable",
  "status": "healthy",
  "phase": "health_check",
  "event": "edge_update_healthy",
  "attempt": 1,
  "elapsed_ms": 48210,
  "reason_code": null,
  "reason_detail": null,
  "meta": {
    "rollback_triggered": false,
    "heartbeat_ok": true,
    "camera_health_ok": true
  },
  "timestamp": "2026-03-15T23:42:11Z"
}
```

Campo adicional recomendado:
- `idempotency_key` (string <= 128) para deduplicar retries do agente no backend.

Payload com idempotência:
```json
{
  "store_id": "47daec5a-11c3-4556-8dd8-fd2b00aa1bb0",
  "agent_id": "edge-kiosk-01",
  "event": "edge_update_healthy",
  "status": "healthy",
  "idempotency_key": "edge-kiosk-01:1.4.2:healthy:attempt-1"
}
```

Resposta canônica:
- novo evento persistido: `201` com `"deduped": false`;
- retry deduplicado: `200` com `"deduped": true` e mesmo `event_id`.

Status/eventos canônicos:
- `started`
- `downloaded`
- `verified`
- `activated`
- `healthy`
- `rolled_back`
- `failed`

## 4) Regras de execução (agent)
1. Só atualizar dentro da `rollout_window`, exceto patch crítico.
2. Validar `sha256` antes de ativar versão.
3. Swap atômico de versão (`releases/<version>` + ponteiro `current`).
4. Health gate obrigatório:
- heartbeat publicado em até `require_heartbeat_seconds`;
- câmera health mínimo conforme policy.
5. Se health gate falhar:
- rollback automático para versão anterior;
- reportar `rolled_back` + `reason_code`.

## 5) Reason codes mínimos
- `NETWORK_ERROR`
- `DOWNLOAD_FAILED`
- `CHECKSUM_MISMATCH`
- `ACTIVATION_FAILED`
- `HEALTH_GATE_TIMEOUT`
- `ROLLBACK_FAILED`
- `UNSUPPORTED_VERSION`

## 6) SLOs de update (v1)
- taxa de sucesso de update: `>= 98%`
- rollback automático após falha: `<= 5 min`
- lojas em versão suportada em 7 dias: `>= 95%`

## 7) Segurança
- token edge obrigatório em ambos endpoints.
- URL de pacote com expiração curta (signed URL).
- nunca enviar segredos sensíveis no payload de report.

## 8) Compatibilidade e evolução
- v1 cobre política + telemetria + rollback.
- v1.1 adiciona idempotência persistente de update-report (`store_id + idempotency_key`) e fingerprint da policy.
- v2 deve incluir:
- rollout por coorte/região;
- bloqueio por hardware profile;
- assinatura criptográfica além de checksum.
