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

  threshold?: any
  created_at: string
  updated_at: string
}

export interface DetectionEvent {
  id: string
  store_id: string
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
  metadata?: any
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
  metadata?: any
  destinations?: {
    email?: string | null
    whatsapp?: string | null
  }
}

type CoreStore = { id: string; name: string }

// helper: normaliza {results: []} | {data: []} | []
function normalizeArray<T = any>(input: any): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.results)) return input.results
  if (Array.isArray(input.data)) return input.data
  return []
}

// helper: normaliza store_id de regra (store ou store_id)
function getRuleStoreId(rule: any): string | undefined {
  return rule?.store_id || rule?.store
}

export const alertsService = {
  // =====================
  // ALERT RULES (CRUD)
  // =====================

  async listRules(storeId?: string): Promise<AlertRule[]> {
    const params = storeId ? { store_id: storeId } : undefined
    const res = await api.get("/alerts/alert-rules/", { params })
    return normalizeArray<AlertRule>(res.data).map((r: any) => ({
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }))
  },

  async getRule(id: string): Promise<AlertRule> {
    const res = await api.get(`/alerts/alert-rules/${id}/`)
    const r: any = res.data
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  // IMPORTANTE: enviar "store" (FK) e não "store_id"
  async createRule(payload: Partial<AlertRule> & { store_id?: string }): Promise<AlertRule> {
    const body: any = {
      ...payload,
      store: payload.store ?? payload.store_id, // <- aqui
      zone: payload.zone ?? payload.zone_id ?? null,
    }
    delete body.store_id
    delete body.zone_id

    const res = await api.post("/alerts/alert-rules/", body)
    const r: any = res.data
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  async updateRule(id: string, payload: Partial<AlertRule> & { store_id?: string }): Promise<AlertRule> {
    const body: any = {
      ...payload,
      ...(payload.store || payload.store_id ? { store: payload.store ?? payload.store_id } : {}),
      ...(payload.zone || payload.zone_id ? { zone: payload.zone ?? payload.zone_id } : {}),
    }
    delete body.store_id
    delete body.zone_id

    const res = await api.patch(`/alerts/alert-rules/${id}/`, body)
    const r: any = res.data
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
      n8n: any
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
    return normalizeArray<DetectionEvent>(res.data).map((event: any) => ({
      ...event,
      store_id: event?.store_id ?? event?.store,
      camera_id: event?.camera_id ?? event?.camera,
      zone_id: event?.zone_id ?? event?.zone,
      org_id: event?.org_id ?? event?.org,
    }))
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

