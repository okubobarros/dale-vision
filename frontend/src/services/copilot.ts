import api from "./api"
import type {
  CopilotActionOutcome,
  CopilotActionOutcomeListResponse,
  CopilotConversationMessage,
  CopilotDashboardContext,
  CopilotValueLedgerDailyResponse,
  CopilotOperationalInsight,
  CopilotReport72h,
  CopilotStaffPlanUpdateResult,
} from "../types/copilot"

// Contratos para evolução do Copiloto como camada central da operação.
// Endpoints ainda podem estar em construção no backend; manter chamadas isoladas aqui.
export const copilotService = {
  async getDashboardContext(storeId: string): Promise<CopilotDashboardContext> {
    const response = await api.get(`/v1/copilot/stores/${storeId}/context/`)
    return response.data as CopilotDashboardContext
  },

  async getInsights(storeId: string): Promise<CopilotOperationalInsight[]> {
    const response = await api.get(`/v1/copilot/stores/${storeId}/insights/`)
    return response.data?.items ?? []
  },

  async getReport72h(storeId: string, options?: { refresh?: boolean }): Promise<CopilotReport72h | null> {
    const response = await api.get(`/v1/copilot/stores/${storeId}/report-72h/`, {
      params: options?.refresh ? { refresh: 1 } : undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return (response.data ?? null) as CopilotReport72h | null
  },

  async getConversation(storeId: string, limit = 50): Promise<CopilotConversationMessage[]> {
    const response = await api.get(`/v1/copilot/stores/${storeId}/conversations/`, {
      params: { limit },
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data?.items ?? []
  },

  async updateStaffPlan(
    storeId: string,
    payload: { staff_planned_week: number; reason?: string; source?: string }
  ): Promise<CopilotStaffPlanUpdateResult> {
    const response = await api.post(
      `/v1/copilot/stores/${storeId}/actions/staff-plan/`,
      payload
    )
    return response.data as CopilotStaffPlanUpdateResult
  },

  async listActionOutcomes(
    storeId: string,
    options?: { limit?: number; status?: "dispatched" | "completed" | "failed" | "canceled" }
  ): Promise<CopilotActionOutcomeListResponse> {
    const response = await api.get(`/v1/copilot/stores/${storeId}/actions/outcomes/`, {
      params: {
        limit: options?.limit ?? 30,
        status: options?.status,
      },
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CopilotActionOutcomeListResponse
  },

  async listNetworkActionOutcomes(
    options?: { limit?: number; status?: "dispatched" | "completed" | "failed" | "canceled" }
  ): Promise<CopilotActionOutcomeListResponse> {
    const response = await api.get(`/v1/copilot/network/actions/outcomes/`, {
      params: {
        limit: options?.limit ?? 30,
        status: options?.status,
      },
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CopilotActionOutcomeListResponse
  },

  async createActionOutcome(
    storeId: string,
    payload: {
      action_event_id?: string | null
      insight_id: string
      action_type?: string
      channel?: string
      source?: string
      status?: "dispatched" | "completed" | "failed" | "canceled"
      baseline?: Record<string, unknown>
      outcome?: Record<string, unknown>
      impact_expected_brl?: number
      impact_realized_brl?: number
      confidence_score?: number
      dispatched_at?: string
      completed_at?: string | null
    }
  ) {
    const response = await api.post(`/v1/copilot/stores/${storeId}/actions/outcomes/`, payload)
    return response.data
  },

  async updateActionOutcome(
    storeId: string,
    outcomeId: string,
    payload: {
      status?: "dispatched" | "completed" | "failed" | "canceled"
      outcome?: Record<string, unknown>
      impact_realized_brl?: number
      confidence_score?: number
      completed_at?: string | null
    }
  ): Promise<CopilotActionOutcome> {
    const response = await api.patch(`/v1/copilot/stores/${storeId}/actions/outcomes/${outcomeId}/`, payload)
    return response.data as CopilotActionOutcome
  },

  async getValueLedgerDaily(
    storeId: string,
    options?: { days?: number }
  ): Promise<CopilotValueLedgerDailyResponse> {
    const response = await api.get(`/v1/copilot/stores/${storeId}/value-ledger/daily/`, {
      params: { days: options?.days ?? 30 },
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CopilotValueLedgerDailyResponse
  },

  async getNetworkValueLedgerDaily(options?: { days?: number }): Promise<CopilotValueLedgerDailyResponse> {
    const response = await api.get(`/v1/copilot/network/value-ledger/daily/`, {
      params: { days: options?.days ?? 30 },
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as CopilotValueLedgerDailyResponse
  },
}
