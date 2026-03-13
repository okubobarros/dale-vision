import api from "./api"
import type {
  CopilotConversationMessage,
  CopilotDashboardContext,
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
}
