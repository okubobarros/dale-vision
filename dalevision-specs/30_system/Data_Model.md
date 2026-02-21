# Data Model

## Entidades principais
- Organization, OrgMember
- Store, StoreZone
- Camera, CameraHealthLog
- CameraSnapshot
- DetectionEvent, EventMedia
- AlertRule, NotificationLog
- DemoLead, JourneyEvent
- Subscription, BillingCustomer

## Relacionamentos
- Organization 1..N Store
- Store 1..N Camera
- Camera 1..N CameraSnapshot
- Store 1..N DetectionEvent
- Store 1..N AlertRule

## Observações
- Modelos são `managed = False` (fonte de verdade no Postgres/Supabase).
- Trial padrão definido em Store/Organization via `trial_ends_at`.
- CameraSnapshot (mínimo):
  - `camera_id`, `store_id`, `org_id`
  - `path` (storage)
  - `created_at`
  - `source` (edge|backend)
- Camera:
  - `status` default: `unknown`/`pending_validation`
  - `last_snapshot_url` (signed URL curta duração)
