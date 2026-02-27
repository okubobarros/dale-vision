import api from "./api"

export type JourneyEventName =
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
