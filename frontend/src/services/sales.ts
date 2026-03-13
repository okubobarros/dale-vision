import axios from "axios"
import api from "./api"

export type RevenueProgressState = "connected" | "not_configured" | "syncing"

export interface RevenueProgressData {
  state: RevenueProgressState
  current_revenue: number
  target_revenue: number
  currency: string
  last_sync_at?: string | null
}

const DEFAULT_TARGET = 1_000_000
let salesProgressEndpointUnavailable = false

const fallbackNotConfigured = (): RevenueProgressData => ({
  state: "not_configured",
  current_revenue: 0,
  target_revenue: DEFAULT_TARGET,
  currency: "BRL",
  last_sync_at: null,
})

export const salesService = {
  async getRevenueProgress(): Promise<RevenueProgressData> {
    if (salesProgressEndpointUnavailable) {
      return fallbackNotConfigured()
    }
    try {
      const response = await api.get("/v1/sales/progress/", {
        timeoutCategory: "best-effort",
        noRetry: true,
      })
      const data = response.data as Partial<RevenueProgressData> | undefined
      return {
        state: (data?.state as RevenueProgressState) || "connected",
        current_revenue: Number(data?.current_revenue ?? 0),
        target_revenue: Number(data?.target_revenue ?? DEFAULT_TARGET),
        currency: String(data?.currency || "BRL"),
        last_sync_at: data?.last_sync_at ?? null,
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        if (status === 404 || status === 501 || status === 503) {
          salesProgressEndpointUnavailable = true
          return fallbackNotConfigured()
        }
      }
      if (import.meta.env.DEV) {
        console.warn("[sales/progress] fallback to not_configured", error)
      }
      return fallbackNotConfigured()
    }
  },
}
