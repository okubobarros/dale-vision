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
- `GET /api/accounts/supabase/`
- `GET /api/me/setup-state/`

- `GET /api/v1/onboarding/progress/`
- `POST /api/v1/onboarding/step/complete/`

- `GET|POST /api/v1/stores/`
- `GET|PUT|PATCH|DELETE /api/v1/stores/{store_id}/`
- `GET /api/v1/stores/{store_id}/edge-status/`
- `GET /api/v1/stores/{store_id}/edge-setup/`
- `GET /api/v1/stores/{store_id}/edge-token/`
- `POST /api/v1/stores/{store_id}/edge-token/rotate/`
- `GET /api/v1/stores/{store_id}/edge-credentials/`
- `GET /api/v1/stores/{store_id}/limits/`
- `GET /api/v1/stores/{store_id}/dashboard/`
- `GET /api/v1/stores/network_dashboard/`
- `GET|POST /api/v1/stores/{store_id}/cameras/`
- `PATCH /api/v1/stores/{store_id}/cameras/{camera_id}/` (ativa/desativa câmera)

- `GET|POST /api/v1/cameras/`
- `GET|PUT|PATCH|DELETE /api/v1/cameras/{camera_id}/`
- `POST /api/v1/cameras/{camera_id}/test-snapshot/`
- `POST /api/v1/cameras/{camera_id}/test-connection/`
- `POST /api/v1/cameras/{camera_id}/snapshot/upload/`
- `GET /api/v1/cameras/{camera_id}/snapshot/`
- `GET|PUT /api/v1/cameras/{camera_id}/roi/`
- `GET /api/v1/cameras/{camera_id}/roi/latest/`
- `POST /api/v1/cameras/{camera_id}/health/` (edge)
- `GET /api/v1/camera-health-logs/`

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

Campos obrigatórios:
- `receipt_id` (string, idempotência)
- `event_name` (string, ver SPEC-007)
- `ts` (timestamp ISO8601)
- `store_id` (uuid)
- `org_id` (uuid, quando aplicável)
- `source` (string: `edge` | `backend` | `system`)

Campos opcionais:
- `camera_id` (uuid)
- `zone_id` (uuid)
- `payload` (json)
- `meta` (json)

Observação: detalhes de validação e regras de ingestão devem referenciar `SPEC-007-Event-Pipeline.md`.

## Endpoints TBD (não implementar sem definição)
- Relatórios semanais por Store (SPEC-005)
- Relatórios mensais por Org (SPEC-005)
- ROI Dashboard (SPEC-005)
- Exportação de relatórios (SPEC-005)

## Perguntas abertas
- Existe OpenAPI oficial atualizado além do Swagger gerado?
