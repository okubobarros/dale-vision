# API Contracts

## Regras
- Não inventar endpoints.
- Endpoints não confirmados devem ser marcados como TBD.

## Autenticação
- Knox token para usuários.
- Edge usa `X-EDGE-TOKEN` em endpoints específicos.

## Endpoints (confirmados no backend)
- `GET /` (home + links)
- `GET /swagger/`, `GET /redoc/`
- `POST /api/accounts/register/`
- `POST /api/accounts/login/`
- `POST /api/accounts/logout/`
- `POST /api/accounts/logoutall/`
- `GET /api/accounts/me/`
- `POST /api/accounts/supabase/`
- `GET /api/me/setup-state/`
- `GET /api/v1/me/status/`
- `GET /api/health/auth/`
- `GET /api/health/schema/`

- `GET /api/v1/onboarding/progress/`
- `POST /api/v1/onboarding/step/complete/`
- `GET /api/v1/onboarding/next-step/` (query: `store_id`, obrigatório)

- `GET|POST /api/v1/stores/`
- `GET|PUT|PATCH|DELETE /api/v1/stores/{store_id}/`
- `GET /api/v1/stores/{store_id}/overview/`
- `GET|POST /api/v1/employees/`
- `GET /api/v1/stores/{store_id}/edge-status/`
- `GET /api/v1/stores/{store_id}/edge-setup/`
- `GET /api/v1/stores/{store_id}/edge-token/`
- `POST /api/v1/stores/{store_id}/edge-token/rotate/`
- `GET /api/v1/stores/{store_id}/edge-credentials/`
- `GET /api/v1/stores/{store_id}/limits/`
- `GET /api/v1/stores/{store_id}/dashboard/`
- `GET /api/v1/stores/{store_id}/ceo-dashboard/` (query: `period=day|7d`)
- `GET /api/v1/stores/{store_id}/productivity/evidence/` (query: `hour_bucket`)
- `GET /api/v1/stores/network_dashboard/`
- `GET /api/v1/stores/{store_id}/vision/audit/` (query: `event_source=vision|retail|all`, `event_type`, `camera_id`, `zone_id`, `roi_entity_id`, `from`, `to`, `limit`)
- `GET|POST /api/v1/stores/{store_id}/cameras/`
- `PATCH /api/v1/stores/{store_id}/cameras/{camera_id}/` (ativa/desativa câmera)
- `GET /api/v1/stores/{store_id}/metrics/summary/`

Notas de payload (stores):
- `avg_hourly_labor_cost` (numeric): custo médio/hora por funcionário (usado no diagnóstico do trial).
- `pos_integration_interest` (boolean): interesse em integrar PDV.

- `GET|POST /api/v1/cameras/`
- `GET|PUT|PATCH|DELETE /api/v1/cameras/{camera_id}/`
- `POST /api/v1/cameras/{camera_id}/test-snapshot/`
- `POST /api/v1/cameras/{camera_id}/test-connection/` (200 sync, <=8s, payload padronizado)
- `POST /api/v1/cameras/{camera_id}/snapshot/upload/`
- `GET /api/v1/cameras/{camera_id}/snapshot/`
- `GET|PUT /api/v1/cameras/{camera_id}/roi/`
- `GET /api/v1/cameras/{camera_id}/roi/latest/`
- `POST /api/v1/cameras/{camera_id}/health/` (edge)
- `GET /api/v1/camera-health-logs/`

- `GET /api/v1/system/storage-status/` (staff-only)

- `GET /api/v1/report/summary/`
- `GET /api/v1/report/impact/`
- `GET /api/v1/report/export/` (query: `format=csv|pdf`, `store_id`, `period`, `from`, `to`)

- `GET|POST /api/alerts/alert-rules/`
- `GET|PUT|PATCH|DELETE /api/alerts/alert-rules/{id}/`
- `POST /api/alerts/alert-rules/ingest/`
- `GET|POST /api/alerts/events/`
- `GET|POST /api/alerts/notification-logs/`
- `GET|POST /api/alerts/journey-events/`
- `GET /api/alerts/stores/`
- `POST /api/alerts/demo-leads/`
- `POST /api/v1/demo-leads/` (alias)

- `POST /api/edge/events/` (edge events)

## Contrato de eventos (v1)
Aplicável a `POST /api/edge/events/`.

Envelope obrigatório:
- `event_name` (string)
- `source` (string: `edge` | `backend` | `system`)
- `data` (json)

`data` obrigatório:
- `store_id` (uuid)
- `ts` (timestamp ISO8601)

`data` opcional:
- `agent_id` (string)
- `camera_id` (uuid/external_id)
- `status` (string)
- `latency_ms` (int)
- `error` (string)
- `snapshot_url` (string)

Idempotência:
- `receipt_id` é opcional no request; se ausente, o backend calcula.
- `idempotency_key` pode ser enviado como alias de `receipt_id`.
- para `retail.event.v1`, o backend também suporta receipt determinístico por bucket de 5 minutos.

### Contrato complementar: `retail.event.v1`
Uso:
- evento padronizado para timeline operacional de varejo (edge-first, sem envio de vídeo).

Campos obrigatórios em `data`:
- `store_id` (uuid)
- `ts` (ISO8601)
- `event_type` (enum):
  - `person_enter`
  - `person_exit`
  - `queue_detected`
  - `queue_length`
  - `sale_completed`
  - `staff_detected`
  - `zone_dwell`
- `value` (numérico ou objeto)
- `source` (string)
- `confidence` (0..1 ou 0..100)

Comportamento no backend:
- valida contrato antes de persistir (`reason=retail_event_contract_invalid` em erro 400);
- normaliza `event_name` persistido em `event_receipts` com prefixo `retail_` (ex.: `retail_queue_length`) para evitar colisão de nomes.

Schema:
- `docs/contracts/schemas/retail_event_v1.schema.json`

Observação: detalhes completos em `SPEC-007-Event-Pipeline.md`.

## Endpoints TBD (não implementar sem definição)
 (não implementar sem definição)
- Relatórios mensais por Org (SPEC-005)
- ROI Dashboard (SPEC-005)

## Perguntas abertas
- Existe OpenAPI oficial atualizado além do Swagger gerado?

## Notas de resposta
- `GET /api/me/setup-state/` pode retornar `X-Schema-Warnings: ORG_SCHEMA_OUTDATED` quando o schema do banco estiver desatualizado (ex.: ausência de `organizations.trial_ends_at`).
- `GET /api/v1/cameras/{camera_id}/snapshot/` retorna `snapshot_url` (signed URL curta), `storage_key` (quando existir) e `expires_in`.
- `GET /api/v1/system/storage-status/` retorna flags sem segredos: `configured`, `bucket`, `supabase_url_present`, `service_role_present`.
- `GET /api/v1/onboarding/next-step/` retorna `400` com `error=store_id_invalid` quando `store_id` ausente ou inválido.

- `POST /api/v1/cameras/{camera_id}/test-connection/` retorna `{ok, status, elapsed_ms, detail}`; `status="timeout"` e `detail="rtsp_probe_timeout"` quando estoura o limite.
