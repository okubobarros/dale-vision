import axios from "axios"
import api from "./api"

export type MeStatus = {
  trial_active: boolean
  trial_ends_at?: string | null
  has_subscription: boolean
  role?: string | null
  is_internal_admin?: boolean
}

export type MeAccount = {
  user: {
    id: string | number
    username?: string
    email?: string
    first_name?: string
    last_name?: string
  }
  orgs: Array<{
    id: string
    name: string
    role?: string
  }>
}

const isTimeoutError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false
  return (
    error.code === "ECONNABORTED" ||
    String(error.message || "").toLowerCase().includes("timeout")
  )
}

export type ReportSummary = {
  period: string
  from?: string | null
  to?: string | null
  store_id?: string | null
  stores_count: number
  kpis: {
    total_visitors: number
    avg_dwell_seconds: number
    avg_queue_seconds: number
    avg_conversion_rate: number
    total_alerts: number
  }
  chart_footfall_by_day: Array<{ ts_bucket: string; footfall: number; dwell_seconds_avg: number }>
  chart_footfall_by_hour: Array<{ hour: number; footfall: number }>
  alert_counts_by_type: Array<{ type: string; count: number }>
  insights: string[]
  method?: {
    id: string
    version: string
    label: string
    description: string
  }
  confidence_governance?: {
    status: "insuficiente" | "parcial" | "confiavel"
    score: number
    source_flags: Record<string, string>
    caveats: string[]
  }
}

export type ReportImpact = ReportSummary & {
  impact: {
    idle_seconds_total: number
    queue_wait_seconds_total: number
    avg_hourly_labor_cost: number
    queue_abandon_rate: number
    cost_idle: number
    cost_queue: number
    potential_monthly_estimated: number
    currency: string
    estimated: boolean
    method: string
    method_version?: string
  }
  segment?: string | null
  features_blocked?: string[]
}

export type ReportRangeParams = {
  store_id?: string | null
  from?: string | null
  to?: string | null
  period?: string | null
}

export type ProductivityCoverageWindow = {
  ts_bucket: string | null
  hour_label: string | null
  footfall: number
  staff_planned_ref: number
  staff_detected_est: number
  coverage_gap: number
  gap_status: "critica" | "atencao" | "adequada"
  source_flags: {
    footfall: "official" | "estimated" | "proxy" | "manual"
    staff_planned_ref: "official" | "estimated" | "proxy" | "manual"
    staff_detected_est: "official" | "estimated" | "proxy" | "manual"
  }
}

export type ProductivityCoverage = {
  period: string
  from?: string | null
  to?: string | null
  store_id?: string | null
  stores_count: number
  method: {
    id: string
    version: string
    label: string
    description: string
  }
  confidence_governance: {
    status: "insuficiente" | "parcial" | "confiavel"
    score: number
    source_flags: Record<string, string>
    caveats: string[]
  }
  summary: {
    gaps_total: number
    critical_windows: number
    warning_windows: number
    adequate_windows: number
    worst_window: ProductivityCoverageWindow | null
    best_window: ProductivityCoverageWindow | null
    peak_flow_window: ProductivityCoverageWindow | null
    opportunity_window: ProductivityCoverageWindow | null
    planned_source_mode?: "manual" | "proxy"
  }
  windows: ProductivityCoverageWindow[]
}

export const meService = {
  async getStatus(): Promise<MeStatus | null> {
    try {
      const response = await api.get("/v1/me/status/", {
        timeoutCategory: "best-effort",
        noRetry: true,
      })
      return response.data as MeStatus
    } catch (error) {
      if (!isTimeoutError(error)) {
        throw error
      }
      if (import.meta.env.DEV) {
        console.warn("[me/status] timeout - returning unknown")
      }
      return null
    }
  },
  async getAccount(): Promise<MeAccount | null> {
    try {
      const response = await api.get("/accounts/me/", {
        timeoutCategory: "best-effort",
        noRetry: true,
      })
      return response.data as MeAccount
    } catch (error) {
      if (!isTimeoutError(error)) {
        throw error
      }
      if (import.meta.env.DEV) {
        console.warn("[accounts/me] timeout - returning unknown")
      }
      return null
    }
  },
  async getReportSummary(
    storeId?: string | null,
    range?: ReportRangeParams
  ): Promise<ReportSummary> {
    const params: Record<string, string> = {}
    if (storeId) params.store_id = storeId
    if (range?.store_id) params.store_id = range.store_id
    if (range?.from) params.from = range.from
    if (range?.to) params.to = range.to
    if (range?.period) params.period = range.period
    const response = await api.get("/v1/report/summary/", { params })
    return response.data as ReportSummary
  },
  async getReportImpact(
    storeId?: string | null,
    range?: ReportRangeParams
  ): Promise<ReportImpact> {
    const params: Record<string, string> = {}
    if (storeId) params.store_id = storeId
    if (range?.store_id) params.store_id = range.store_id
    if (range?.from) params.from = range.from
    if (range?.to) params.to = range.to
    if (range?.period) params.period = range.period
    const response = await api.get("/v1/report/impact/", { params })
    return response.data as ReportImpact
  },
  async getProductivityCoverage(
    storeId?: string | null,
    range?: ReportRangeParams
  ): Promise<ProductivityCoverage> {
    const params: Record<string, string> = {}
    if (storeId) params.store_id = storeId
    if (range?.store_id) params.store_id = range.store_id
    if (range?.from) params.from = range.from
    if (range?.to) params.to = range.to
    if (range?.period) params.period = range.period
    const response = await api.get("/v1/productivity/coverage/", { params })
    return response.data as ProductivityCoverage
  },
  async exportReport(
    format: "csv" | "pdf",
    range?: ReportRangeParams
  ): Promise<Blob> {
    const params: Record<string, string> = { format }
    if (range?.store_id) params.store_id = range.store_id
    if (range?.from) params.from = range.from
    if (range?.to) params.to = range.to
    if (range?.period) params.period = range.period
    const response = await api.get("/v1/report/export/", {
      params,
      responseType: "blob",
    })
    return response.data as Blob
  },
}
