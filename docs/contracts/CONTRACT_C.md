# CONTRATO C — DALE Vision (Pilot) — Event Envelope v1

Data: 2026-02-06  
Objetivo: padronizar eventos (Backend → n8n) com idempotência + cooldown + compatibilidade com edge-agent.

## Por que isso importa AGORA
No piloto, o maior risco é **spam / duplicidade** e **flapping** (“offline/online” rápido).
Este contrato resolve 3 pontos críticos:

1) **Idempotência**: cada transição gera um `receipt_id` determinístico; retries não duplicam.
2) **Cooldown**: reduz spam (por store/câmera) em estados degradados/offline.
3) **Tick (offline sem ingest)**: quando o edge morre, não há heartbeat; o tick emite a queda.

---

## Eventos emitidos (v1)

### 1) `store_status_changed`
Emitido quando o status agregado da store muda.

- `previous_status`: `online|degraded|offline|unknown`
- `current_status`: `online|degraded|offline|unknown`

### 2) `camera_status_changed`
Emitido quando o status de uma câmera muda.

- `previous_status`: `online|degraded|offline|unknown`
- `current_status`: `online|degraded|offline|unknown`

---

## Regras de tempo (config/env)
Valores padrão (pilot):

- `STATUS_STALE_AFTER_SECONDS=120` (2 min)
- `STATUS_EXPIRED_AFTER_SECONDS=300` (5 min)
- `STATUS_COOLDOWN_DEGRADED_SECONDS=600` (10 min)
- `STATUS_COOLDOWN_OFFLINE_SECONDS=1800` (30 min)

Sem isso, o sistema “flappa” e vira ruído para o early user.

---

## Idempotência (a regra de ouro)
O campo **`data.receipt_id`** é o **event_id lógico** da transição.

Ele deve ser:
- **determinístico para a mesma transição**
- estável em retries (não pode depender de `now()` puro)

Estratégia v1:
- usar um **bucket por minuto** do momento da transição (ex.: `YYYY-MM-DDTHH:MM`)
- receipt_id:
  - store: `store:<store_id>:<prev>-><curr>:<bucket>`
  - camera: `camera:<camera_id>:<prev>-><curr>:<bucket>`

---

## Cooldown (anti-spam)
O cooldown é aplicado por:

- store: `cooldown_scope = "store:<store_id>"`
- camera: `cooldown_scope = "camera:<camera_uuid>"`

Cooldown é avaliado por `(cooldown_scope, current_status)`.

Exemplo:
- store offline: no máximo 1 evento a cada 30 min
- camera degraded: no máximo 1 evento a cada 10 min

---

## Tick (offline sem ingest)
Quando o edge/heartbeat para, **não existe ingest** para disparar transição.

O tick roda periodicamente (pilot: 1/min) e:
- lê o status atual calculado
- compara com o último status emitido (event_receipts)
- emite mudança se houve transição e cooldown permitir

---

## Envelope v1 (forma final)
O backend envia para o n8n um JSON com:

- `event_id` (usa `receipt_id`)
- `event_name`
- `event_version`
- `ts` (**igual** a `data.occurred_at`)
- `source` (ex.: `"backend"`)
- `data` (payload do evento)
- `meta` (objeto livre)

Exemplo (store):
```json
{
  "event_id": "store:b259...:online->offline:2026-02-06T04:25",
  "event_name": "store_status_changed",
  "event_version": 1,
  "ts": "2026-02-06T04:25:11.123+00:00",
  "source": "backend",
  "lead_id": null,
  "org_id": "ad418...",
  "data": {
    "event_type": "store_status_changed",
    "schema_version": 1,
    "occurred_at": "2026-02-06T04:25:11.123+00:00",
    "receipt_id": "store:b259...:online->offline:2026-02-06T04:25",
    "cooldown_scope": "store:b259...",
    "store_id": "b259...",
    "camera_id": null,
    "external_id": null,
    "previous_status": "online",
    "current_status": "offline",
    "reason": "heartbeat_expired",
    "age_seconds": 338,
    "counts": { "online": 0, "total": 3 }
  },
  "meta": {}
}

## Status Events (store/camera)

**Objetivo**: eventos de mudança de status (store/camera) enviados do backend → n8n, com idempotência (receipt_id) e cooldown (anti-spam).

### event_type
- `store_status_changed`
- `camera_status_changed`

### Status
`online | degraded | offline | unknown`

### JSON Schema — StatusEventPayload v1
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://dalevision.ai/schemas/status_event_payload_v1.json",
  "title": "StatusEventPayloadV1",
  "type": "object",
  "required": ["event_type","schema_version","ts","receipt_id","store_id","previous_status","current_status","reason"],
  "properties": {
    "event_type": { "type": "string", "enum": ["store_status_changed","camera_status_changed"] },
    "schema_version": { "type": "integer", "const": 1 },
    "ts": { "type": "string", "description": "occurred_at ISO 8601" },
    "receipt_id": { "type": "string" },
    "cooldown_scope": { "type": "string" },
    "store_id": { "type": "string", "format": "uuid" },
    "camera_id": { "type": ["string","null"], "format": "uuid" },
    "external_id": { "type": ["string","null"] },
    "previous_status": { "type": "string", "enum": ["online","degraded","offline","unknown"] },
    "current_status": { "type": "string", "enum": ["online","degraded","offline","unknown"] },
    "reason": { "type": "string" },
    "age_seconds": { "type": ["integer","null"], "minimum": 0 },
    "counts": {
      "type": ["object","null"],
      "properties": {
        "online": { "type": "integer", "minimum": 0 },
        "total": { "type": "integer", "minimum": 0 }
      },
      "additionalProperties": false
    },
    "org_id": { "type": ["string","null"], "format": "uuid" }
  },
  "additionalProperties": true
}
```
