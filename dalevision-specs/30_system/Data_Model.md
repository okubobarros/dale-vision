# Data Model

## Entidades principais
- Organization, OrgMember
- Store, StoreZone
- Camera, CameraHealthLog
- DetectionEvent, EventMedia
- AlertRule, NotificationLog
- DemoLead, JourneyEvent
- Subscription, BillingCustomer

## Relacionamentos
- Organization 1..N Store
- Store 1..N Camera
- Store 1..N DetectionEvent
- Store 1..N AlertRule

## Observações
- Modelos são `managed = False` (fonte de verdade no Postgres/Supabase).
- Trial padrão definido em Store/Organization via `trial_ends_at`.
