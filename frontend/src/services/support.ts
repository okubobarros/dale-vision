import api from "./api"

export type SupportRequestStatus = "pending" | "granted" | "closed" | "rejected"

export interface SupportRequest {
  id: string
  store_id: string
  store_name?: string | null
  requester_user_uuid: string
  requester_email?: string | null
  requester_name?: string | null
  reason?: string | null
  status: SupportRequestStatus
  requested_at?: string | null
  handled_at?: string | null
  handled_by_user_uuid?: string | null
  handled_notes?: string | null
  expires_at?: string | null
}

const normalizeError = (error: unknown, fallback: string) => {
  const err = error as {
    response?: { data?: { message?: string; detail?: string } }
    message?: string
  }
  const message =
    err.response?.data?.message || err.response?.data?.detail || err.message || fallback
  return new Error(message)
}

export const supportService = {
  async requestStoreSupport(storeId: string, reason?: string) {
    try {
      const response = await api.post(`/v1/stores/${storeId}/support/requests/`, {
        reason,
      })
      return response.data as { ok: boolean; message: string; request: SupportRequest }
    } catch (error) {
      throw normalizeError(error, "Falha ao solicitar suporte.")
    }
  },

  async getMyStoreSupportRequests(storeId: string): Promise<SupportRequest[]> {
    try {
      const response = await api.get(`/v1/stores/${storeId}/support/requests/`, {
        timeoutCategory: "best-effort",
        noRetry: true,
      })
      return Array.isArray(response.data) ? (response.data as SupportRequest[]) : []
    } catch (error) {
      throw normalizeError(error, "Falha ao carregar solicitações de suporte.")
    }
  },

  async getAdminSupportRequests(status: SupportRequestStatus | "all" = "pending"): Promise<SupportRequest[]> {
    try {
      const response = await api.get("/v1/support/requests/", { params: { status } })
      return Array.isArray(response.data) ? (response.data as SupportRequest[]) : []
    } catch (error) {
      throw normalizeError(error, "Falha ao carregar fila de suporte.")
    }
  },

  async grantSupportRequest(requestId: string, durationMinutes = 120, notes?: string) {
    try {
      const response = await api.post(`/v1/support/requests/${requestId}/grant/`, {
        duration_minutes: durationMinutes,
        notes,
      })
      return response.data as {
        ok: boolean
        message: string
        request: SupportRequest
        grant?: { id: string; user_uuid: string; store_id: string; expires_at: string }
      }
    } catch (error) {
      throw normalizeError(error, "Falha ao conceder acesso temporário.")
    }
  },

  async closeSupportRequest(requestId: string, notes?: string) {
    try {
      const response = await api.post(`/v1/support/requests/${requestId}/close/`, {
        notes,
      })
      return response.data as { ok: boolean; message: string; request: SupportRequest }
    } catch (error) {
      throw normalizeError(error, "Falha ao encerrar solicitação.")
    }
  },
}
