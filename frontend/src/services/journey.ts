import api from "./api"

export type JourneyEventName =
  | "activation_callback_started"
  | "activation_callback_failed"
  | "activation_resend_clicked"
  | "activation_callback_completed"
  | "post_login_explainer_shown"
  | "post_login_explainer_cta_clicked"
  | "post_login_explainer_dismissed"
  | "edge_checklist_viewed"
  | "edge_checklist_step_clicked"
  | "edge_first_signal_achieved"
  | "incident_escalate_clicked"
  | "incident_escalate_opened_edge_help"
  | "incident_escalate_completed"
  | "alert_resolution_started"
  | "alert_resolution_completed"
  | "alert_resolution_escalated"
  | "alert_rule_quality_viewed"
  | "alert_rule_suggestion_shown"
  | "alert_rule_suggestion_applied"
  | "upgrade_proof_viewed"
  | "upgrade_proof_cta_clicked"
  | "upgrade_proof_insufficient_data_shown"
  | "signup_completed"
  | "store_created"
  | "camera_added"
  | "camera_validated"
  | "roi_saved"
  | "first_metrics_received"
  | "trial_expired_shown"
  | "upgrade_viewed"
  | "upgrade_clicked"

export type JourneyEventPayload = Record<string, unknown>

const oncePrefix = "dv_journey_once:"

export const trackJourneyEvent = async (
  eventName: JourneyEventName,
  payload: JourneyEventPayload = {}
) => {
  try {
    await api.post("/v1/alerts/journey-events/", {
      event_name: eventName,
      payload,
      source: "app",
    })
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[journey] failed to log", eventName, err)
    }
  }
}

export const trackJourneyEventOnce = async (
  key: string,
  eventName: JourneyEventName,
  payload: JourneyEventPayload = {}
) => {
  if (typeof window === "undefined") return
  const storageKey = `${oncePrefix}${key}`
  if (sessionStorage.getItem(storageKey) === "1") return
  sessionStorage.setItem(storageKey, "1")
  await trackJourneyEvent(eventName, payload)
}
