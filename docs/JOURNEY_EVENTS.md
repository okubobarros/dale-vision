# Journey Events Dictionary

This document defines the canonical event dictionary for `journey_events` and
`event_receipts` (source = `app`). It is the single source of truth for
analytics and funnel tracking in DALE Vision.

## Conventions
- Event names: lowercase snake_case (e.g. `signup_completed`).
- Payload: JSON object with contextual identifiers. Avoid PII.
- Source: `app` for UI/backoffice events; `edge` for agent events.
- Dedupe: frontend uses session-based dedupe for exposure events.

## Event List

### `signup_completed`
When: user registration finishes.
Emitted by: backend `RegisterView`.
Payload:
- `user_id`: UUID from `user_id_map`.

### `store_created`
When: store created successfully.
Emitted by: backend `StoreViewSet.perform_create`.
Payload:
- `store_id`
- `status` (trial/active)

### `camera_added`
When: camera created successfully.
Emitted by: backend `CameraViewSet.perform_create` and `StoreViewSet.cameras`.
Payload:
- `store_id`
- `camera_id`

### `camera_validated`
When: camera becomes online after being unknown/offline.
Emitted by:
- backend `CameraViewSet.health` (manual/health updates)
- edge heartbeat ingestion (`EdgeEventsIngestView`)
Payload:
- `store_id`
- `camera_id`
- `status`
- `latency_ms` (if present)

### `roi_saved`
When: ROI is saved (draft or published).
Emitted by: backend `CameraViewSet.roi`.
Payload:
- `store_id`
- `camera_id`
- `roi_status` (draft/published)
- `roi_version`

### `first_metrics_received`
When: first traffic/conversion metrics are stored.
Emitted by: backend `apply_vision_metrics`.
Payload:
- `store_id`
- `ts_bucket`

### `trial_expired_shown`
When: trial paywall is shown (API 402 or guard redirect).
Emitted by:
- backend middleware (`TrialEnforcementMiddleware`) once per ~15 min per org
- frontend `SubscriptionGuard` once per session
Payload:
- `path`
- `trial_ended_at` (backend)

### `upgrade_viewed`
When: upgrade page is viewed.
Emitted by: frontend `/app/upgrade` once per session.
Payload:
- `path`

### `upgrade_clicked`
When: upgrade CTA is clicked.
Emitted by: frontend (Upgrade and Report pages).
Payload:
- `source` (e.g. `report_banner`, `report_sticky_cta`, `upgrade_plan_card`)
- `plan_id` (when available)

### `lead_created`
When: demo lead is created from public form.
Emitted by: backend `DemoLeadCreateView`.
Payload:
- `lead_id`
- `email` (avoid storing PII elsewhere)
- `operation_type`
- `stores_range`
- `cameras_range`

### `alert_triggered`
When: alert is triggered and notification flow runs.
Emitted by: backend `AlertRuleViewSet.ingest`.
Payload:
- `event_id`
- `store_id`
- `severity`
- `event_type`
- `channels`

### `alert_suppressed`
When: alert is suppressed by cooldown.
Emitted by: backend `AlertRuleViewSet.ingest`.
Payload:
- `event_id`
- `store_id`
- `cooldown_minutes`
- `suppressed_reason`

## Dedupe Rules
- `upgrade_viewed`: session-based dedupe (1 per tab/session).
- `trial_expired_shown`: session-based dedupe on frontend; backend also throttles per org.

## Notes
- Events must not block UI. Failures should be logged but ignored.
- Avoid adding PII in payloads (email, phone, full name).

## Lint
Run to validate that every event used in code is listed here:

```bash
python scripts/validate_journey_events.py
```

Optional (pre-commit):

```bash
pre-commit install
pre-commit run journey-events-lint
```
