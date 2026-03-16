# CONTRACT: Edge Auto-Update v1

Status: `draft-active`  
Version: `edge_update_v1_2026-03-15`  
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

### 3.1 Policy pull (agent -> cloud)
`GET /api/v1/edge/update-policy/`

Headers esperados:
- `X-EDGE-TOKEN`
- `X-STORE-ID` (opcional quando token já vincula loja)

Resposta (exemplo):
```json
{
  "store_id": "47daec5a-11c3-4556-8dd8-fd2b00aa1bb0",
  "agent_id": "edge-kiosk-01",
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
- v2 deve incluir:
- rollout por coorte/região;
- bloqueio por hardware profile;
- assinatura criptográfica além de checksum.
