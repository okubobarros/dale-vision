// src/services/alerts.ts
import api from "./api";

export type AlertChannel = "dashboard" | "email" | "whatsapp";

export interface AlertRule {
  id: string;
  store_id: string;
  zone_id?: string | null;
  type: string;
  severity: string;
  cooldown_minutes: number;
  active: boolean;
  channels: {
    dashboard: boolean;
    email: boolean;
    whatsapp: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface DetectionEvent {
  id: string;
  store_id: string;
  camera_id?: string | null;
  zone_id?: string | null;
  type: string;
  severity: string;
  status: "open" | "resolved" | "ignored";
  title: string;
  description: string;
  occurred_at: string;
  resolved_at?: string | null;
  resolved_by_user_id?: string | null;
  suppressed_by_rule_id?: string | null;
  suppressed_reason?: string | null;
  metadata?: any;
  created_at: string;
  media?: EventMedia[];
}

export interface EventMedia {
  id: string;
  event_id: string;
  media_type: "clip" | "snapshot";
  url: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  store_id: string;
  event_id?: string | null;
  rule_id?: string | null;
  channel: AlertChannel;
  destination?: string | null;
  provider: string;
  status: "sent" | "queued" | "failed" | "suppressed";
  error?: string | null;
  provider_message_id?: string | null;
  sent_at: string;
}

/**
 * Payload para ingest manual (útil para testes e n8n)
 */
export interface AlertIngestPayload {
  store_id: string;
  camera_id?: string;
  zone_id?: string;
  event_type: string;
  severity: string;
  title?: string;
  message?: string;
  description?: string;
  occurred_at?: string;
  clip_url?: string;
  snapshot_url?: string;
  metadata?: any;
  destinations?: {
    email?: string | null;
    whatsapp?: string | null;
  };
}

/**
 * ===========================
 * ALERTS SERVICE
 * Base path: /api/v1/alerts/
 * ===========================
 */
export const alertsService = {
  // =====================
  // ALERT RULES (CRUD)
  // =====================

  async listRules(storeId?: string): Promise<AlertRule[]> {
    const params = storeId ? { store_id: storeId } : undefined;
    const res = await api.get("/alerts/alert-rules/", { params });
    return res.data;
  },

  async getRule(id: string): Promise<AlertRule> {
    const res = await api.get(`/alerts/alert-rules/${id}/`);
    return res.data;
  },

  async createRule(payload: Partial<AlertRule>): Promise<AlertRule> {
    const res = await api.post("/alerts/alert-rules/", payload);
    return res.data;
  },

  async updateRule(id: string, payload: Partial<AlertRule>): Promise<AlertRule> {
    const res = await api.patch(`/alerts/alert-rules/${id}/`, payload);
    return res.data;
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/alerts/alert-rules/${id}/`);
  },

  // =====================
  // INGEST (CORE)
  // =====================

  async ingest(payload: AlertIngestPayload) {
    const res = await api.post("/alerts/alert-rules/ingest/", payload);
    return res.data as {
      event: DetectionEvent;
      n8n: any;
      suppressed: boolean;
    };
  },

  // =====================
  // DETECTION EVENTS
  // =====================

  async listEvents(params?: {
    store_id?: string;
    status?: "open" | "resolved" | "ignored";
  }): Promise<DetectionEvent[]> {
    const res = await api.get("/alerts/events/", { params });
    return res.data;
  },

  async resolveEvent(eventId: string): Promise<DetectionEvent> {
    const res = await api.post(`/alerts/events/${eventId}/resolve/`);
    return res.data;
  },

  async ignoreEvent(eventId: string): Promise<DetectionEvent> {
    const res = await api.post(`/alerts/events/${eventId}/ignore/`);
    return res.data;
  },

  async addEventMedia(eventId: string, media: Partial<EventMedia>) {
    const res = await api.post(`/alerts/events/${eventId}/media/`, media);
    return res.data;
  },

  // =====================
  // NOTIFICATION LOGS
  // =====================

  async listLogs(params?: {
    store_id?: string;
    event_id?: string;
  }): Promise<NotificationLog[]> {
    const res = await api.get("/alerts/notification-logs/", { params });
    return res.data;
  },
};
