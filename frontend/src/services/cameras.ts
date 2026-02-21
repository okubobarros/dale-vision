import api from "./api"

export type CameraStatus = "online" | "degraded" | "offline" | "unknown" | "error"

export interface Camera {
  id: string
  store: string
  name: string
  external_id?: string | null
  brand?: string | null
  ip?: string | null
  username?: string | null
  rtsp_url_masked?: string | null
  active?: boolean
  status?: CameraStatus
  latency_ms?: number | null
  last_seen_at?: string | null
  last_error?: string | null
  last_snapshot_url?: string | null
  created_at?: string
  updated_at?: string
}

export type CreateCameraPayload = {
  name: string
  brand?: string
  model?: string
  ip?: string
  username?: string
  password?: string
  rtsp_url?: string
  external_id?: string | null
  active?: boolean
}

export type UpdateCameraPayload = Partial<CreateCameraPayload>

export interface CameraROIConfig {
  camera: string
  version: number
  config_json: unknown
  updated_at?: string | null
  updated_by?: string | null
}

export interface StoreLimits {
  store_id: string
  plan: "trial" | "paid"
  limits: {
    cameras: number | null
    stores: number | null
  }
  usage: {
    cameras: number
    stores: number
  }
}

type ApiErrorLike = {
  response?: { status?: number; data?: { detail?: string; code?: string; message?: string; upgrade_url?: string } }
  message?: string
  code?: string
}

const normalizeApiError = (error: unknown, fallbackMessage: string) => {
  const err = (error || {}) as ApiErrorLike
  const rawData = err.response?.data
  const detail =
    err.response?.data?.message ||
    err.response?.data?.detail ||
    err.message ||
    fallbackMessage
  const normalizedData =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? {
          ...(rawData as Record<string, unknown>),
          detail:
            (rawData as { detail?: string; message?: string }).detail ||
            (rawData as { detail?: string; message?: string }).message ||
            detail,
          code: (rawData as { code?: string }).code,
          upgrade_url: (rawData as { upgrade_url?: string }).upgrade_url,
        }
      : {
          detail,
          code: err.response?.data?.code,
          upgrade_url: err.response?.data?.upgrade_url,
        }
  const normalized = new Error(detail)
  ;(normalized as ApiErrorLike).response = {
    status: err.response?.status,
    data: normalizedData,
  }
  ;(normalized as ApiErrorLike).code = err.response?.data?.code || err.code
  return normalized
}

export const camerasService = {
  async getStoreCameras(storeId: string): Promise<Camera[]> {
    try {
      const response = await api.get(`/v1/stores/${storeId}/cameras/`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      throw normalizeApiError(error, "Falha ao carregar câmeras.")
    }
  },

  async createStoreCamera(storeId: string, payload: CreateCameraPayload): Promise<Camera> {
    try {
      const response = await api.post(`/v1/stores/${storeId}/cameras/`, payload)
      return response.data
    } catch (error) {
      throw normalizeApiError(error, "Falha ao criar câmera.")
    }
  },

  async updateCamera(cameraId: string, payload: UpdateCameraPayload): Promise<Camera> {
    try {
      const response = await api.patch(`/v1/cameras/${cameraId}/`, payload)
      return response.data
    } catch (error) {
      throw normalizeApiError(error, "Falha ao atualizar câmera.")
    }
  },

  async deleteCamera(cameraId: string): Promise<void> {
    try {
      await api.delete(`/v1/cameras/${cameraId}/`)
    } catch (error) {
      throw normalizeApiError(error, "Falha ao remover câmera.")
    }
  },

  async getRoi(cameraId: string): Promise<CameraROIConfig> {
    try {
      const response = await api.get(`/v1/cameras/${cameraId}/roi/`)
      return response.data
    } catch (error) {
      throw normalizeApiError(error, "Falha ao carregar ROI.")
    }
  },

  async updateRoi(cameraId: string, configJson: unknown): Promise<CameraROIConfig> {
    try {
      const response = await api.put(`/v1/cameras/${cameraId}/roi/`, {
        config_json: configJson,
      })
      return response.data
    } catch (error) {
      throw normalizeApiError(error, "Falha ao salvar ROI.")
    }
  },

  async getStoreLimits(storeId: string): Promise<StoreLimits> {
    try {
      const response = await api.get(`/v1/stores/${storeId}/limits/`)
      return response.data
    } catch (error) {
      throw normalizeApiError(error, "Falha ao carregar limites.")
    }
  },

  async getCamera(cameraId: string): Promise<Camera> {
    try {
      const response = await api.get(`/v1/cameras/${cameraId}/`)
      return response.data
    } catch (error) {
      throw normalizeApiError(error, "Falha ao carregar câmera.")
    }
  },

  async testConnection(
    cameraId: string
  ): Promise<{ ok: boolean; queued: boolean; status: number }> {
    try {
      const response = await api.post(`/v1/cameras/${cameraId}/test-connection/`)
      const payload =
        response.data && typeof response.data === "object"
          ? (response.data as { ok?: boolean; queued?: boolean })
          : {}
      return {
        ok: payload.ok ?? true,
        queued: payload.queued ?? response.status === 202,
        status: response.status,
      }
    } catch (error) {
      throw normalizeApiError(error, "Falha ao testar conexão.")
    }
  },
}
