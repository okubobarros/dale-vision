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

export interface CopilotDailyBriefing {
  generated_at: string
  briefing_state: "calm" | "attention" | "critical" | string
  headline: string
  message: string
  store_id?: string | null
  store_name?: string | null
  metrics: {
    critical_open_total: number
    actions_dispatched: number
    actions_completed: number
    completion_rate: number
    value_recovered_brl: number
    value_at_risk_brl: number
    value_net_gap_brl: number
  }
  cta: {
    label: string
    href: string
  }
  moment_of_pride?: {
    show: boolean
    title: string
    description: string
  }
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
  outcome_status?: "resolved" | "partial" | "not_resolved" | null
  outcome_comment?: string | null
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
  completion_rate?: number
  recovery_rate?: number
  confidence_score_avg: number
}

export interface CopilotActionOutcomeListResponse {
  store_id: string
  summary: CopilotActionOutcomeSummary
  breakdown_by_store?: Array<{
    store_id: string
    store_name?: string | null
    actions_dispatched: number
    actions_completed: number
    impact_expected_brl: number
    impact_realized_brl: number
    completion_rate?: number
    recovery_rate?: number
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
  value_status?: "official" | "validated" | "estimated"
  confidence_tier?: "official" | "validated" | "estimated"
  recovery_rate?: number
  created_at: string
  updated_at: string
}

export interface CopilotValueLedgerDailyResponse {
  store_id: string
  days: number
  method_version_current?: string
  sprint2_acceptance?: {
    decision: "GO" | "NO-GO"
    coverage_min: number
    stale_rate_max: number
    no_data_rate_max: number
    coverage_rate: number
    stale_rate: number
    no_data_rate: number
    reason: string
  }
  pipeline_health?: {
    status: "healthy" | "stale" | "no_data"
    freshness_seconds: number | null
    last_updated_at: string | null
    stores_with_ledger: number
    stores_total: number
    coverage_rate: number
    slo_target_seconds: number
    slo_breached?: boolean
    recommended_action: string
  }
  totals: {
    value_recovered_brl: number
    value_at_risk_brl: number
    value_net_gap_brl?: number
    actions_dispatched: number
    actions_completed: number
    completion_rate?: number
    recovery_rate?: number
    confidence_score_avg: number
    value_status?: "official" | "validated" | "estimated"
    confidence_tier?: "official" | "validated" | "estimated"
  }
  value_status_summary?: {
    official: number
    validated: number
    estimated: number
  }
  breakdown_by_store?: Array<{
    store_id: string
    store_name?: string | null
    value_recovered_brl: number
    value_at_risk_brl: number
    value_net_gap_brl?: number
    actions_dispatched: number
    actions_completed: number
    completion_rate?: number
    recovery_rate?: number
    confidence_score_avg: number
    value_status?: "official" | "validated" | "estimated"
  }>
  items: CopilotValueLedgerDailyItem[]
}
