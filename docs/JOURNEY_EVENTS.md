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

### `alert_delegate_whatsapp_requested`
When: manager delegation via WhatsApp is requested for an operational event.
Emitted by: backend `DetectionEventViewSet.delegate_whatsapp`.
Payload:
- `event_category` (`alert`)
- `type` (`operational_delegation`)
- `channel` (`whatsapp`)
- `store_id`
- `org_id`
- `event_id`
- `title`
- `description`
- `severity`
- `event_type`
- `occurred_at`
- `destination`
- `manager_name`
- `employee_id`
- `employee_name`
- `note`
- `evidence_url`
- `media`
- `metadata`
- `status`

### `action_dispatched`
When: an executive action is explicitly dispatched from Copilot/Decision Center.
Emitted by: backend `DetectionEventViewSet.delegate_whatsapp`.
Payload:
- `event_name` (`action_dispatched`)
- `event_version` (`v1`)
- `store_id`
- `insight_id`
- `channel` (`whatsapp`)
- `expected_impact_brl` (nullable)
- `confidence_score` (nullable)
- `requested_by_user_id`
- `requested_at`
- `source` (`copilot_decision_center` default)
- `event_id`

### `activation_callback_started`
When: início do callback de ativação/autenticação.
Emitted by: frontend `AuthCallback`.

### `activation_callback_failed`
When: callback de ativação falha.
Emitted by: frontend `AuthCallback`.

### `activation_resend_clicked`
When: usuário solicita reenvio de ativação.
Emitted by: frontend `AuthCallback`.

### `activation_callback_completed`
When: callback de ativação concluído com sucesso.
Emitted by: frontend `AuthCallback`.

### `post_login_explainer_shown`
When: explicação pós-login é exibida.
Emitted by: frontend `PostLoginExplainer`.

### `post_login_explainer_cta_clicked`
When: CTA do explicador pós-login é clicado.
Emitted by: frontend `PostLoginExplainer`.

### `post_login_explainer_dismissed`
When: explicador pós-login é fechado.
Emitted by: frontend `PostLoginExplainer`.

### `edge_checklist_viewed`
When: checklist de ativação edge é visualizado.
Emitted by: frontend `EdgeActivationChecklist`.

### `edge_checklist_step_clicked`
When: passo do checklist edge é acionado.
Emitted by: frontend `EdgeActivationChecklist`.

### `incident_escalate_clicked`
When: usuário inicia escalonamento de incidente.
Emitted by: frontend `Alerts`, `Stores`.

### `incident_escalate_opened_edge_help`
When: escalonamento abre fluxo Edge Help.
Emitted by: frontend `EdgeHelp`.

### `incident_escalate_completed`
When: escalonamento finalizado.
Emitted by: frontend `EdgeHelp`.

### `alert_resolution_started`
When: fluxo de resolução de alerta iniciado.
Emitted by: frontend `Alerts`.

### `alert_resolution_completed`
When: resolução de alerta concluída.
Emitted by: frontend `Alerts`.

### `alert_resolution_escalated`
When: alerta escalado durante resolução.
Emitted by: frontend `Alerts`.

### `alert_rule_quality_viewed`
When: usuário visualiza qualidade de regra.
Emitted by: frontend `AlertRules`.

### `alert_rule_suggestion_shown`
When: sugestão de ajuste de regra exibida.
Emitted by: frontend `AlertRules`.

### `alert_rule_suggestion_applied`
When: sugestão de regra aplicada.
Emitted by: frontend `AlertRules`.

### `store_context_link_clicked`
When: link entre módulos é clicado com contexto de loja.
Emitted by: frontend `Alerts`.

### `store_context_preserved`
When: contexto de loja é preservado entre rotas.
Emitted by: frontend `Alerts`.

### `store_context_missing_fallback`
When: contexto de loja ausente e fallback aplicado.
Emitted by: frontend `Alerts`.

### `camera_diagnosis_viewed`
When: diagnóstico de câmera é exibido.
Emitted by: frontend `Cameras`.

### `camera_diagnosis_action_clicked`
When: ação de diagnóstico de câmera é acionada.
Emitted by: frontend `Cameras`, `EdgeHelp`.

### `camera_diagnosis_resolved`
When: resolução de diagnóstico de câmera registrada.
Emitted by: frontend `Cameras`.

### `upgrade_proof_viewed`
When: bloco de prova de valor para upgrade é exibido.
Emitted by: frontend `Upgrade`.

### `upgrade_proof_cta_clicked`
When: CTA da prova de upgrade é clicado.
Emitted by: frontend `Upgrade`.

### `upgrade_proof_insufficient_data_shown`
When: UI indica dados insuficientes para prova.
Emitted by: frontend `Upgrade`.

### `operation_action_delegated`
When: ação operacional delegada.
Emitted by: frontend `Operations`, `Reports`, `Dashboard`.

### `operation_action_feedback_submitted`
When: feedback do resultado operacional enviado.
Emitted by: frontend `Operations`, `Reports`.

### `operation_action_completed`
When: ação operacional concluída (ou falha final).
Emitted by: frontend `Operations`, `Reports`.

### `owner_goal_defined`
When: objetivo do dono é definido/atualizado.
Emitted by: frontend `Onboarding`, `Settings`.

### `notification_tone_updated`
When: tom de notificação é alterado.
Emitted by: frontend `Onboarding`, `Settings`.

### `notification_preferences_saved`
When: preferências de notificação são salvas.
Emitted by: frontend `Onboarding`, `Settings`.

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
