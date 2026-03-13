export type OperationalPillar =
  | "sales"
  | "productivity"
  | "people_behavior"
  | "operational_infra"

export type OperationalSeverity = "critical" | "warning" | "info"

export type OperationalEventStatus = "open" | "resolved" | "ignored"

// Normalized operational event used by /app/operations UI.
export type OperationalEvent = {
  id: string
  store_id: string
  store_name: string
  title: string
  description?: string
  occurred_at: string
  severity: OperationalSeverity
  status: OperationalEventStatus
  pillar: OperationalPillar
  category_label: string
  source_type: string
  camera_id?: string | null
  suggestion?: string | null
  channels_supported?: Array<"dashboard" | "email" | "whatsapp">
  channels_state?: {
    dashboard: "available" | "disabled" | "pending"
    email: "available" | "disabled" | "pending"
    whatsapp: "available" | "disabled" | "pending"
  }
}

export type OperationsHomeKpi = {
  id:
    | "healthy_stores"
    | "attention_stores"
    | "critical_open_events"
    | "sales_opportunities"
    | "productivity_occurrences"
    | "people_occurrences"
  label: string
  value: number | null
  state: "ready" | "collecting"
  helper: string
}

// Suggested payload contract for future backend endpoint:
// GET /v1/operations/home/
export type OperationsHomePayload = {
  network: {
    org_id: string
    org_name: string
    monitored_stores: number
    healthy_stores: number
    attention_stores: number
    critical_stores: number
    generated_at: string
  }
  kpis: OperationsHomeKpi[]
  prioritized_events: OperationalEvent[]
  stores: Array<{
    id: string
    name: string
    city?: string | null
    segment?: string | null
    status: "healthy" | "attention" | "critical" | "collecting"
    queue_state?: "healthy" | "attention" | "critical" | "collecting"
    productivity_state?: "healthy" | "attention" | "critical" | "collecting"
    people_state?: "healthy" | "attention" | "critical" | "collecting"
    last_insight?: string | null
    image_url?: string | null
  }>
  copilot: {
    recommendation_of_day?: string | null
    quick_prompts: string[]
  }
}

