export type DashboardOperationalState =
  | "not_started"
  | "setup_in_progress"
  | "collecting_data"
  | "report_ready"
  | "operating"
  | "incident"

export interface CopilotDashboardContext {
  org_id: string
  org_name: string
  store_id: string
  store_name: string
  account_state: "trial_active" | "trial_expired" | "plan_active" | "unknown"
  operational_state: DashboardOperationalState
  trial: {
    collected_hours: number
    target_hours: number
    eta_hours: number
  }
  coverage: {
    cameras_total: number
    cameras_online: number
    cameras_offline: number
    edge_online: boolean
    last_heartbeat_at?: string | null
  }
  generated_at: string
}

export interface CopilotOperationalInsight {
  id: string
  org_id: string
  store_id: string
  category:
    | "flow"
    | "queue"
    | "conversion"
    | "staff_productivity"
    | "health"
    | "anomaly"
    | "recommendation"
  severity: "info" | "warning" | "critical"
  headline: string
  description: string
  evidence: {
    source: "traffic_metrics" | "conversion_metrics" | "vision_atomic_events" | "detection_events"
    time_window_from: string
    time_window_to: string
    metric_refs: string[]
    confidence: number
  }
  actions: Array<{
    label: string
    type: "open_store" | "open_camera" | "open_report" | "open_setup" | "ask_copilot"
    payload?: Record<string, unknown>
  }>
  created_at: string
}

export interface CopilotReport72h {
  id: string
  org_id: string
  store_id: string
  status: "pending" | "ready" | "failed"
  status_detail?: string
  next_refresh_suggested_seconds?: number
  readiness?: {
    status: "pending" | "ready" | "failed"
    reason: string
    message: string
    collected_hours: number
    target_hours: number
    evidence?: Record<string, unknown>
  }
  generated_at?: string | null
  summary?: {
    headline: string
    key_findings: string[]
    opportunities: string[]
    recommended_plan: string[]
  } | null
  sections?: Array<{
    key: string
    title: string
    content: string
    confidence: number
  }>
}

export interface CopilotConversationMessage {
  id: string
  role: "system" | "assistant" | "user"
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}
