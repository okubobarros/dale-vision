import api from "./api"

export type AdminControlTowerSummary = {
  generated_at: string
  users: {
    total: number | null
    active: number | null
    staff: number | null
    superusers: number | null
  }
  organizations: {
    total: number | null
    trial_expiring_7d: number | null
  }
  stores: {
    total: number | null
    active: number | null
    trial: number | null
    blocked: number | null
    inactive: number | null
    signal_recent_5m: number | null
    signal_stale: number | null
    signal_missing: number | null
  }
  cameras: {
    total: number | null
    active: number | null
    online: number | null
    offline: number | null
  }
  subscriptions: {
    total: number | null
    trialing: number | null
    active: number | null
    past_due: number | null
    blocked: number | null
    canceled: number | null
    incomplete: number | null
  }
  incidents: {
    notification_failed_24h: number | null
    blocked_stores: number | null
    stores_without_recent_signal: number | null
  }
  onboarding: {
    total_rows: number | null
    completed: number | null
    in_progress: number | null
    not_started: number | null
  }
  value_loop?: {
    outcomes_24h: number | null
    outcomes_completed_24h: number | null
    ledger_rows_24h: number | null
    stores_with_outcomes_24h: number | null
    stores_with_ledger_update_24h: number | null
    ledger_coverage_rate: number | null
    outcome_completion_rate: number | null
    health: "healthy" | "partial" | "degraded" | "no_data" | "unknown" | string
  }
}

export type CalibrationActionItem = {
  id: string
  org_id: string
  store_id: string
  store_name?: string | null
  camera_id?: string | null
  camera_name?: string | null
  issue_code: string
  recommended_action: string
  owner_role: string
  status: "open" | "in_progress" | "waiting_validation" | "validated" | "rejected" | "closed" | string
  priority: "low" | "medium" | "high" | "critical" | string
  source: string
  assigned_to_user_uuid?: string | null
  created_by_user_uuid?: string | null
  sla_due_at?: string | null
  metadata?: Record<string, unknown>
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
  evidences_total?: number
  results_total?: number
  results_passed_total?: number
}

export type CalibrationActionListResponse = {
  items: CalibrationActionItem[]
  total: number
}

export type CalibrationEvidencePayload = {
  snapshot_before_url?: string
  snapshot_after_url?: string
  clip_before_url?: string
  clip_after_url?: string
  captured_at?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export type CalibrationEvidenceResponse = {
  id: string
  action_id: string
  snapshot_before_url?: string | null
  snapshot_after_url?: string | null
  clip_before_url?: string | null
  clip_after_url?: string | null
  captured_at?: string | null
  captured_by_user_uuid?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type CalibrationResultPayload = {
  metric_name: string
  baseline_value?: number | null
  after_value?: number | null
  threshold_value?: number | null
  passed: boolean
  notes?: string
  validated_at?: string
}

export type CalibrationResultResponse = {
  id: string
  action_id: string
  metric_name: string
  baseline_value?: number | null
  after_value?: number | null
  delta_value?: number | null
  threshold_value?: number | null
  passed: boolean
  validated_by_user_uuid?: string | null
  validated_at?: string | null
  notes?: string | null
}

export type CalibrationAutoGenerateResponse = {
  dry_run: boolean
  max_actions: number
  created_total: number
  created: Array<Record<string, unknown>>
  skipped_total: number
  skipped: Array<Record<string, unknown>>
}

export type CalibrationImpactIssueRow = {
  issue_code: string
  actions_total: number
  actions_validated: number
  results_total: number
  results_passed: number
  pass_rate: number | null
  avg_delta: number | null
}

export type CalibrationImpactSummaryResponse = {
  period: string
  from: string | null
  to: string | null
  totals: {
    actions_total: number
    actions_validated: number
    results_total: number
    results_passed: number
    pass_rate: number | null
    avg_delta: number | null
  }
  by_issue: CalibrationImpactIssueRow[]
}

export type AdminIngestionFunnelGapRow = {
  store_id: string
  org_id?: string | null
  store_name?: string | null
  vision_events: number
  last_vision_ts?: string | null
}

export type AdminIngestionFunnelGapResponse = {
  window_hours: number
  from: string
  to: string
  store_id?: string | null
  rows_total: number
  rows: AdminIngestionFunnelGapRow[]
}

export type AdminIngestionFunnelGapRepairResponse = {
  window_hours: number
  from: string
  to: string
  store_id?: string | null
  candidates_total: number
  repaired_total: number
  repaired_store_ids: string[]
}

export type AdminPipelineObservabilityRow = {
  store_id?: string | null
  store_name?: string | null
  camera_id?: string | null
  camera_name?: string | null
  frames_received: number
  events_accepted: number
  events_generated: number
  drop_rate?: number | null
  latency_ms_avg?: number | null
  latest_event_at?: string | null
}

export type AdminPipelineObservabilityResponse = {
  window_hours: number
  from: string
  to: string
  store_id?: string | null
  totals: {
    rows_total: number
    frames_received: number
    events_accepted: number
    events_generated: number
    drop_rate?: number | null
    latency_ms_avg?: number | null
  }
  rows: AdminPipelineObservabilityRow[]
}

export type AdminReleaseGateCheck = {
  value?: number | null
  threshold?: number | null
  operator?: string
  pass: boolean
  samples?: number
  missing?: number
  received_total?: number
  accepted_total?: number
  active_signal_total?: number
  active_with_funnel_total?: number
}

export type AdminReleaseGateResponse = {
  generated_at: string
  window: {
    from_30d: string
    from_24h: string
    to: string
  }
  thresholds: {
    null_rate_critical_max: number
    pipeline_success_min: number
  }
  checks: {
    null_rate_critical: AdminReleaseGateCheck
    pipeline_success: AdminReleaseGateCheck
    funnel_non_zero_active_store: AdminReleaseGateCheck
  }
  overall_pass: boolean
  status: "go" | "no_go" | string
}

export type AdminCvQualityBaselineRow = {
  store_id?: string | null
  store_name?: string | null
  camera_id?: string | null
  camera_name?: string | null
  metric_name: string
  samples_total: number
  passed_total: number
  pass_rate?: number | null
  avg_delta?: number | null
  latest_validated_at?: string | null
}

export type AdminCvQualityBaselineResponse = {
  period: "7d" | "30d" | string
  from: string
  to: string
  store_id?: string | null
  totals: {
    rows_total: number
    samples_total: number
    passed_total: number
    pass_rate?: number | null
    avg_delta?: number | null
  }
  rows: AdminCvQualityBaselineRow[]
}

export const adminService = {
  async getControlTowerSummary(): Promise<AdminControlTowerSummary> {
    const response = await api.get("/v1/me/admin/control-tower/summary/", {
      timeoutCategory: "critical",
    })
    return response.data as AdminControlTowerSummary
  },

  async getCalibrationActions(params?: {
    status?: string
    store_id?: string
    camera_id?: string
    limit?: number
  }): Promise<CalibrationActionListResponse> {
    const response = await api.get("/v1/calibration/actions/", {
      params: params || undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CalibrationActionListResponse
  },

  async patchCalibrationAction(
    actionId: string,
    payload: {
      status?: string
      priority?: string
      notes?: string
      assigned_to_user_uuid?: string | null
    }
  ): Promise<CalibrationActionItem> {
    const response = await api.patch(`/v1/calibration/actions/${actionId}/`, payload, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CalibrationActionItem
  },

  async createCalibrationEvidence(
    actionId: string,
    payload: CalibrationEvidencePayload
  ): Promise<CalibrationEvidenceResponse> {
    const response = await api.post(`/v1/calibration/actions/${actionId}/evidence/`, payload, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CalibrationEvidenceResponse
  },

  async createCalibrationResult(
    actionId: string,
    payload: CalibrationResultPayload
  ): Promise<CalibrationResultResponse> {
    const response = await api.post(`/v1/calibration/actions/${actionId}/result/`, payload, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CalibrationResultResponse
  },

  async autoGenerateCalibrationActions(payload?: {
    store_id?: string
    dry_run?: boolean
    max_actions?: number
  }): Promise<CalibrationAutoGenerateResponse> {
    const response = await api.post("/v1/calibration/actions/auto-generate/", payload || {}, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CalibrationAutoGenerateResponse
  },

  async getCalibrationImpactSummary(params?: {
    period?: "7d" | "30d" | "90d"
    store_id?: string
  }): Promise<CalibrationImpactSummaryResponse> {
    const response = await api.get("/v1/calibration/actions/impact-summary/", {
      params: params || undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CalibrationImpactSummaryResponse
  },

  async getIngestionFunnelGap(params?: {
    window_hours?: number
    store_id?: string
    limit?: number
  }): Promise<AdminIngestionFunnelGapResponse> {
    const response = await api.get("/v1/me/admin/ingestion-funnel-gap/", {
      params: params || undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as AdminIngestionFunnelGapResponse
  },

  async repairIngestionFunnelGap(payload?: {
    window_hours?: number
    store_id?: string
    limit?: number
  }): Promise<AdminIngestionFunnelGapRepairResponse> {
    const response = await api.post("/v1/me/admin/ingestion-funnel-gap/", payload || {}, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as AdminIngestionFunnelGapRepairResponse
  },

  async getPipelineObservability(params?: {
    window_hours?: number
    store_id?: string
    limit?: number
  }): Promise<AdminPipelineObservabilityResponse> {
    const response = await api.get("/v1/me/admin/pipeline-observability/", {
      params: params || undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as AdminPipelineObservabilityResponse
  },

  async getReleaseGate(): Promise<AdminReleaseGateResponse> {
    const response = await api.get("/v1/me/admin/release-gate/", {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as AdminReleaseGateResponse
  },

  async getCvQualityBaseline(params?: {
    period?: "7d" | "30d"
    store_id?: string
    limit?: number
  }): Promise<AdminCvQualityBaselineResponse> {
    const response = await api.get("/v1/me/admin/cv-quality-baseline/", {
      params: params || undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as AdminCvQualityBaselineResponse
  },
}
