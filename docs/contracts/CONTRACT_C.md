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

---

## JSON Schema — Event Envelope v1

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://dalevision.ai/schemas/event-envelope-v1.json",
  "title": "DALE Vision Event Envelope v1",
  "type": "object",
  "required": ["event_name", "event_version", "ts", "source", "data", "meta"],
  "properties": {
    "event_id": { "type": ["string","null"], "description": "Optional logical id; for status events we set to receipt_id when available." },
    "event_name": { "type": "string" },
    "event_version": { "type": "integer", "minimum": 1, "default": 1 },
    "ts": { "type": "string", "format": "date-time", "description": "Occurred_at of the business event (not send time)." },
    "source": { "type": "string", "description": "Producer identifier, e.g. edge-agent/edge-status-tick/backend" },
    "lead_id": { "type": ["string","null"], "format": "uuid" },
    "org_id": { "type": ["string","null"], "format": "uuid" },
    "data": { "type": "object" },
    "meta": {
      "type": "object",
      "properties": {
        "receipt_id": { "type": "string" },
        "idempotency_key": { "type": ["string","null"] }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": true
}
```

## JSON Schema — Status Events v1 (`store_status_changed` / `camera_status_changed`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://dalevision.ai/schemas/status-events-v1.json",
  "title": "DALE Vision Status Events v1",
  "type": "object",
  "required": ["event_type","entity_type","store_id","previous_status","current_status","reason","occurred_at","receipt_id"],
  "properties": {
    "event_type": { "type": "string", "enum": ["store_status_changed","camera_status_changed"] },
    "entity_type": { "type": "string", "enum": ["store","camera"] },

    "store_id": { "type": "string", "format": "uuid" },
    "store_name": { "type": ["string","null"] },

    "camera_id": { "type": ["string","null"], "format": "uuid" },
    "camera_name": { "type": ["string","null"] },

    "previous_status": { "type": "string", "enum": ["online","degraded","offline","unknown"] },
    "current_status": { "type": "string", "enum": ["online","degraded","offline","unknown"] },

    "reason": { "type": "string" },
    "age_seconds": { "type": ["integer","null"], "minimum": 0 },

    "cameras_online": { "type": ["integer","null"], "minimum": 0 },
    "cameras_total": { "type": ["integer","null"], "minimum": 0 },

    "occurred_at": { "type": "string", "format": "date-time" },
    "receipt_id": { "type": "string" },

    "channels": {
      "type": "object",
      "properties": {
        "email": { "type": "boolean" },
        "whatsapp": { "type": "boolean" },
        "dashboard": { "type": "boolean" }
      },
      "additionalProperties": true
    },
    "destinations": {
      "type": "object",
      "properties": {
        "email": { "type": "string" }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": true
}
```
