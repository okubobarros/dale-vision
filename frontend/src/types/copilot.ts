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

export interface CopilotStaffPlanUpdateResult {
  ok: boolean
  store_id: string
  previous_staff_planned_week: number
  staff_planned_week: number
  reason?: string | null
  source: string
  method: {
    id: string
    version: string
  }
}

export interface CopilotActionOutcome {
  id: string
  org_id: string
  store_id: string
  action_event_id?: string | null
  insight_id: string
  action_type: string
  channel: string
  source: string
  status: "dispatched" | "completed" | "failed" | "canceled"
  baseline?: Record<string, unknown>
  outcome?: Record<string, unknown>
  impact_expected_brl: number
  impact_realized_brl: number
  confidence_score: number
  dispatched_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface CopilotActionOutcomeSummary {
  actions_dispatched: number
  actions_completed: number
  impact_expected_brl: number
  impact_realized_brl: number
  confidence_score_avg: number
}

export interface CopilotActionOutcomeListResponse {
  store_id: string
  summary: CopilotActionOutcomeSummary
  breakdown_by_store?: Array<{
    store_id: string
    actions_dispatched: number
    actions_completed: number
    impact_expected_brl: number
    impact_realized_brl: number
    confidence_score_avg: number
  }>
  items: CopilotActionOutcome[]
}

export interface CopilotValueLedgerDailyItem {
  id: string
  org_id: string
  store_id: string
  ledger_date: string
  value_recovered_brl: number
  value_at_risk_brl: number
  actions_dispatched: number
  actions_completed: number
  confidence_score_avg: number
  method_version: string
  created_at: string
  updated_at: string
}

export interface CopilotValueLedgerDailyResponse {
  store_id: string
  days: number
  totals: {
    value_recovered_brl: number
    value_at_risk_brl: number
    actions_dispatched: number
    actions_completed: number
    confidence_score_avg: number
  }
  breakdown_by_store?: Array<{
    store_id: string
    value_recovered_brl: number
    value_at_risk_brl: number
    actions_dispatched: number
    actions_completed: number
    confidence_score_avg: number
  }>
  items: CopilotValueLedgerDailyItem[]
}
