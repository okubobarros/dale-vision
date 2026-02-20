// src/services/alerts.ts
import api from "./api"

export type AlertChannel = "dashboard" | "email" | "whatsapp"

export interface AlertRule {
  id: string
  // backend (DRF) normalmente retorna "store" (FK), mas vamos aceitar os 2
  store?: string
  store_id?: string

  zone?: string | null
  zone_id?: string | null

  type: string
  severity: "critical" | "warning" | "info"
  cooldown_minutes: number
  active: boolean

  channels: {
    dashboard: boolean
    email: boolean
    whatsapp: boolean
  } | null

  threshold?: unknown
  created_at: string
  updated_at: string
}

export interface DetectionEvent {
  id: string
  store_id: string
  org_id?: string
  camera_id?: string | null
  zone_id?: string | null
  type: string
  severity: string
  status: "open" | "resolved" | "ignored"
  title: string
  description: string
  occurred_at: string
  resolved_at?: string | null
  resolved_by_user_id?: string | null
  suppressed_by_rule_id?: string | null
  suppressed_reason?: string | null
  metadata?: unknown
  created_at: string
  media?: EventMedia[]
}

export interface EventMedia {
  id: string
  event_id: string
  media_type: "clip" | "snapshot"
  url: string
  created_at: string
}

export interface NotificationLog {
  id: string
  store_id: string
  event_id?: string | null
  rule_id?: string | null
  channel: AlertChannel
  destination?: string | null
  provider: string
  status: "sent" | "queued" | "failed" | "suppressed"
  error?: string | null
  provider_message_id?: string | null
  receipt_id?: string | null
  sent_at: string
}

export interface AlertIngestPayload {
  store_id: string
  camera_id?: string
  zone_id?: string
  event_type: string
  severity: string
  title?: string
  message?: string
  description?: string
  occurred_at?: string
  clip_url?: string
  snapshot_url?: string
  receipt_id?: string
  metadata?: unknown
  destinations?: {
    email?: string | null
    whatsapp?: string | null
  }
}

type CoreStore = { id: string; name: string }
type UnknownRecord = Record<string, unknown>
type RuleStoreLike = { store_id?: string; store?: string }

// helper: normaliza {results: []} | {data: []} | []
function normalizeArray<T>(input: unknown): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (typeof input === "object" && input) {
    const results = (input as { results?: unknown }).results
    const data = (input as { data?: unknown }).data
    if (Array.isArray(results)) return results as T[]
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

// helper: normaliza store_id de regra (store ou store_id)
function getRuleStoreId(rule: RuleStoreLike): string | undefined {
  return rule.store_id || rule.store
}

export const alertsService = {
  // =====================
  // ALERT RULES (CRUD)
  // =====================

  async listRules(storeId?: string): Promise<AlertRule[]> {
    const params = storeId ? { store_id: storeId } : undefined
    const res = await api.get("/alerts/alert-rules/", { params })
    return normalizeArray<AlertRule>(res.data).map((r) => {
      const rule = r as AlertRule & { store?: string; store_id?: string; zone?: string | null }
      return {
        ...rule,
        store_id: rule.store_id ?? rule.store,
        zone_id: rule.zone_id ?? rule.zone ?? null,
      }
    })
  },

  async getRule(id: string): Promise<AlertRule> {
    const res = await api.get(`/alerts/alert-rules/${id}/`)
    const r = res.data as AlertRule & { store?: string; store_id?: string; zone?: string | null }
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  // IMPORTANTE: enviar "store" (FK) e não "store_id"
  async createRule(payload: Partial<AlertRule> & { store_id?: string }): Promise<AlertRule> {
    const body: UnknownRecord = {
      ...payload,
      store: payload.store ?? payload.store_id, // <- aqui
      zone: payload.zone ?? payload.zone_id ?? null,
    }
    delete body.store_id
    delete body.zone_id

    const res = await api.post("/alerts/alert-rules/", body)
    const r = res.data as AlertRule & { store?: string; store_id?: string; zone?: string | null }
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  async updateRule(id: string, payload: Partial<AlertRule> & { store_id?: string }): Promise<AlertRule> {
    const body: UnknownRecord = {
      ...payload,
      ...(payload.store || payload.store_id ? { store: payload.store ?? payload.store_id } : {}),
      ...(payload.zone || payload.zone_id ? { zone: payload.zone ?? payload.zone_id } : {}),
    }
    delete body.store_id
    delete body.zone_id

    const res = await api.patch(`/alerts/alert-rules/${id}/`, body)
    const r = res.data as AlertRule & { store?: string; store_id?: string; zone?: string | null }
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/alerts/alert-rules/${id}/`)
  },

  // =====================
  // INGEST (CORE)
  // =====================

  async ingest(payload: AlertIngestPayload) {
    const res = await api.post("/alerts/alert-rules/ingest/", payload)
    return res.data as {
      event: DetectionEvent
      n8n: unknown
      suppressed: boolean
    }
  },

  // =====================
  // DETECTION EVENTS
  // =====================

  async listEvents(params?: {
    store_id?: string
    status?: "open" | "resolved" | "ignored"
    severity?: "critical" | "warning" | "info"
    occurred_from?: string
    occurred_to?: string
  }): Promise<DetectionEvent[]> {
    const res = await api.get("/alerts/events/", { params })
    return normalizeArray<DetectionEvent>(res.data).map((event) => {
      const item = event as DetectionEvent & {
        store?: string
        camera?: string
        zone?: string
        org?: string
      }
      return {
        ...item,
        store_id: item.store_id ?? item.store,
        camera_id: item.camera_id ?? item.camera,
        zone_id: item.zone_id ?? item.zone,
        org_id: (item as DetectionEvent & { org_id?: string }).org_id ?? item.org,
      }
    })
  },

  async resolveEvent(eventId: string): Promise<DetectionEvent> {
    const res = await api.post(`/alerts/events/${eventId}/resolve/`)
    return res.data
  },

  async ignoreEvent(eventId: string): Promise<DetectionEvent> {
    const res = await api.post(`/alerts/events/${eventId}/ignore/`)
    return res.data
  },

  async addEventMedia(eventId: string, media: Partial<EventMedia>) {
    const res = await api.post(`/alerts/events/${eventId}/media/`, media)
    return res.data
  },

  // =====================
  // NOTIFICATION LOGS
  // =====================

  async listLogs(params?: { store_id?: string; event_id?: string }): Promise<NotificationLog[]> {
    const res = await api.get("/alerts/notification-logs/", { params })
    return normalizeArray<NotificationLog>(res.data)
  },

  // =====================
  // CORE STORES (UUID) - usado na UI de alertas
  // =====================

  async listCoreStores(): Promise<CoreStore[]> {
    const res = await api.get("/alerts/stores/")
    return normalizeArray<CoreStore>(res.data)
  },
}
