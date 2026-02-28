import api from "./api"

export type MeStatus = {
  trial_active: boolean
  trial_ends_at?: string | null
  has_subscription: boolean
  role?: string | null
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
}

export type ReportRangeParams = {
  store_id?: string | null
  from?: string | null
  to?: string | null
  period?: string | null
}

export const meService = {
  async getStatus(): Promise<MeStatus> {
    const response = await api.get("/v1/me/status/", { timeout: 2000 })
    return response.data as MeStatus
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
