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
}

export const adminService = {
  async getControlTowerSummary(): Promise<AdminControlTowerSummary> {
    const response = await api.get("/v1/me/admin/control-tower/summary/", {
      timeoutCategory: "critical",
    })
    return response.data as AdminControlTowerSummary
  },
}

