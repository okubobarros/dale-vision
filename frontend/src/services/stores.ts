// src/services/stores.ts
import api from './api';
import type { StoreDashboard } from '../types/dashboard';

export type StoreStatus = 'active' | 'inactive' | 'maintenance' | 'trial' | 'blocked';
export type StorePlan = 'trial' | 'basic' | 'pro' | 'enterprise';

export interface Store {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  business_type?: string | null;
  business_type_other?: string | null;
  pos_system?: string | null;
  pos_other?: string | null;
  hours_weekdays?: string | null;
  hours_saturday?: string | null;
  hours_sunday_holiday?: string | null;
  employees_count?: number | null;
  cameras_count?: number | null;
  plan: StorePlan;
  status: StoreStatus;
  last_seen_at?: string | null;
  edge_online?: boolean | null;
  online?: boolean | null;
  last_error?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  blocked_reason?: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string;
  role?: "owner" | "admin" | "manager" | "viewer" | null;
}

export interface StoreMinimal {
  id: string;
  name: string;
  created_at: string | null;
  is_active: boolean;
}

export interface StoreSummary {
  id: string;
  name: string;
  status: StoreStatus | null;
  blocked_reason?: string | null;
  trial_ends_at?: string | null;
  plan?: StorePlan | null;
  role?: "owner" | "admin" | "manager" | "viewer" | null;
}

type StoreWriteFields = {
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: StoreStatus;
  business_type?: string;
  business_type_other?: string;
  pos_system?: string;
  pos_other?: string;
  hours_weekdays?: string;
  hours_saturday?: string;
  hours_sunday_holiday?: string;
  employees_count?: number;
  cameras_count?: number;
};

export type CreateStorePayload = StoreWriteFields & {
  name: string;
};
export type UpdateStorePayload = Partial<StoreWriteFields & { name: string }>;

export interface StoreMetrics {
  total_cameras: number;
  active_cameras: number;
  today_events: number;
  avg_customer_count: number;
  peak_hour: string;
  alerts_today: number;
}

export interface StoreAnalyticsSummary {
  store_id: string;
  from: string;
  to: string;
  bucket: "hour" | "day";
  totals: {
    total_visitors: number;
    avg_dwell_seconds: number;
    avg_queue_seconds: number;
    avg_staff_active: number;
    avg_conversion_rate: number;
  };
  series: {
    traffic: Array<{
      ts_bucket: string;
      footfall: number;
      dwell_seconds_avg: number;
    }>;
    conversion: Array<{
      ts_bucket: string;
      queue_avg_seconds: number;
      staff_active_est: number;
      conversion_rate: number;
    }>;
  };
  zones: Array<{
    zone_id: string;
    name: string;
    footfall: number;
    dwell_seconds_avg: number;
  }>;
}

export interface NetworkDashboard {
  total_stores: number;
  active_stores: number;
  total_visitors: number;
  avg_conversion: number;
  stores: Array<{
    id: string;
    name: string;
    status: string;
    location?: string | null;
    health?: number | null;
    visitor_flow?: number | null;
    conversion?: number | null;
    alerts?: number | null;
  }>;
}

export interface StoreEdgeStatus {
  store_id: string;
  ok?: boolean;
  online?: boolean;
  store_status?: string;
  store_status_age_seconds?: number | null;
  store_status_reason?: string | null;
  last_heartbeat: string | null;
  last_heartbeat_at?: string | null;
  last_seen_at?: string | null;
  last_metric_bucket: string | null;
  last_error: string | null;
  cameras_total?: number;
  cameras_online?: number;
  cameras_degraded?: number;
  cameras_offline?: number;
  cameras_unknown?: number;
  cameras: Array<{
    camera_id: string;
    external_id?: string | null;
    name: string;
    last_snapshot_url?: string | null;
    status: string;
    age_seconds?: number | null;
    reason?: string | null;
    camera_last_heartbeat_ts?: string | null;
  }>;
}

export interface StoreEdgeSetupPayload {
  store_id: string;
  edge_token?: string | null;
  agent_id_suggested?: string | null;
  agent_id_default?: string | null;
  cloud_base_url?: string | null;
  has_active_token?: boolean;
  token_created_at?: string | null;
  token_last_used_at?: string | null;
}

export type RotateEdgeTokenResult =
  | ({ supported: true } & StoreEdgeSetupPayload)
  | { supported: false };


const omitEmpty = <T extends Record<string, unknown>>(payload: T): Partial<T> => {
  const result: Partial<T> = {};

  (Object.keys(payload) as Array<keyof T>).forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value === '') return;
    result[key] = value;
  });

  return result;
};

type ApiErrorLike = {
  response?: { status?: number; data?: { detail?: string; code?: string; message?: string; details?: unknown; upgrade_url?: string } };
  message?: string;
  code?: string;
};

const normalizeApiError = (error: unknown, fallbackMessage: string) => {
  const err = (error || {}) as ApiErrorLike;
  const detail =
    err.response?.data?.message ||
    err.response?.data?.detail ||
    err.message ||
    fallbackMessage;
  const normalized = new Error(detail);
  (normalized as ApiErrorLike).response = {
    status: err.response?.status,
    data: {
      message: err.response?.data?.message,
      detail,
      details: err.response?.data?.details,
      code: err.response?.data?.code,
      upgrade_url: err.response?.data?.upgrade_url,
    },
  };
  (normalized as ApiErrorLike).code = err.response?.data?.code || err.code;
  return normalized;
};

const normalizeEdgeSetup = (
  data: Partial<StoreEdgeSetupPayload> | null | undefined,
  storeId: string
): StoreEdgeSetupPayload => ({
  store_id: data?.store_id ?? storeId,
  edge_token: data?.edge_token ?? null,
  agent_id_suggested: data?.agent_id_suggested,
  agent_id_default: data?.agent_id_default,
  cloud_base_url: data?.cloud_base_url,
  has_active_token: Boolean(data?.has_active_token),
  token_created_at: data?.token_created_at ?? null,
  token_last_used_at: data?.token_last_used_at ?? null,
});

const normalizeEdgeStatus = (
  data: Partial<StoreEdgeStatus> | null | undefined,
  storeId: string
): StoreEdgeStatus => ({
  store_id: data?.store_id ?? storeId,
  ok: data?.ok,
  online: typeof data?.online === "boolean" ? data.online : undefined,
  store_status: data?.store_status,
  store_status_age_seconds: data?.store_status_age_seconds ?? null,
  store_status_reason: data?.store_status_reason ?? null,
  last_heartbeat: data?.last_heartbeat ?? null,
  last_heartbeat_at: data?.last_heartbeat_at ?? null,
  last_seen_at:
    data?.last_seen_at ??
    data?.last_heartbeat_at ??
    data?.last_heartbeat ??
    null,
  last_metric_bucket: data?.last_metric_bucket ?? null,
  last_error: data?.last_error ?? null,
  cameras_total: data?.cameras_total ?? 0,
  cameras_online: data?.cameras_online ?? 0,
  cameras_degraded: data?.cameras_degraded ?? 0,
  cameras_offline: data?.cameras_offline ?? 0,
  cameras_unknown: data?.cameras_unknown ?? 0,
  cameras: Array.isArray(data?.cameras) ? data?.cameras ?? [] : [],
});

export const storesService = {
  // Listar lojas com payload mínimo (para telas rápidas)
  async getStoresMinimal(): Promise<StoreMinimal[]> {
    console.log("🔄 Buscando lojas (view=min)...")
    try {
      const response = await api.get("/v1/stores/", {
        params: { view: "min" },
        timeout: 20000,
      });
      const payload = response.data;
      const stores = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
        ? payload.results
        : [];
      console.log(`✅ Encontradas ${stores?.length || 0} lojas (min)`);
      return stores;
    } catch (error) {
      console.error("❌ Erro ao buscar lojas (min):", error);
      throw normalizeApiError(error, "Falha ao carregar lojas.");
    }
  },

  // Listar lojas com payload summary (status/role/plan)
  async getStoresSummary(): Promise<StoreSummary[]> {
    console.log("🔄 Buscando lojas (view=summary)...")
    try {
      const response = await api.get("/v1/stores/", {
        params: { view: "summary" },
        timeout: 20000,
      });
      const payload = response.data;
      const stores = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
        ? payload.results
        : [];
      console.log(`✅ Encontradas ${stores?.length || 0} lojas (summary)`);
      return stores;
    } catch (error) {
      console.error("❌ Erro ao buscar lojas (summary):", error);
      throw normalizeApiError(error, "Falha ao carregar lojas.");
    }
  },

  // Listar todas as lojas do usuário
  async getStores(): Promise<Store[]> {
    console.log("🔄 Buscando lojas... (fetching stores)")
    try {
      const response = await api.get('/v1/stores/');
      console.log('📦 Resposta completa:', response);

      const payload = response.data;
      const stores = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
        ? payload.results
        : [];
      console.log(`✅ Encontradas ${stores?.length || 0} lojas`);

      return stores;
    } catch (error) {
      console.error('❌ Erro ao buscar lojas:', error);
      throw normalizeApiError(error, 'Falha ao carregar lojas.');
    }
  },

  // Obter dashboard completo (novo formato)
  async getStoreDashboard(storeId: string): Promise<StoreDashboard> {
    console.log(`🔄 Buscando dashboard para loja ${storeId}`);
    try {
      const response = await api.get(`/v1/stores/${storeId}/dashboard/`);
      console.log('✅ Dashboard response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar dashboard:', error);
      throw error;
    }
  },

  // Obter métricas no formato antigo (para compatibilidade se necessário)
  // NOTE: keep storeId in signature for API compatibility; reference it to avoid TS6133.
  async getStoreMetrics(storeId: string): Promise<StoreMetrics> {
    void storeId;
    return {
      total_cameras: 0,
      active_cameras: 0,
      today_events: 0,
      avg_customer_count: 0,
      peak_hour: "",
      alerts_today: 0,
    };
  },

  async getStoreAnalyticsSummary(storeId: string, params?: { period?: string; from?: string; to?: string; bucket?: "hour" | "day" }): Promise<StoreAnalyticsSummary> {
    const response = await api.get(`/v1/stores/${storeId}/metrics/summary/`, { params })
    return response.data as StoreAnalyticsSummary
  },

  // Obter visão da rede (todas as lojas)
  async getNetworkDashboard(): Promise<NetworkDashboard> {
    try {
      const response = await api.get('/v1/stores/network_dashboard/');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar network dashboard:', error);
      throw error;
    }
  },

  async getEdgeSetup(storeId: string): Promise<StoreEdgeSetupPayload> {
    try {
      const response = await api.get(`/v1/stores/${storeId}/edge-setup/`);
      return normalizeEdgeSetup(response.data, storeId);
    } catch (error) {
      console.error('❌ Erro ao obter credenciais do edge:', error);
      throw normalizeApiError(error, 'Falha ao obter credenciais do edge.');
    }
  },

  async getStoreEdgeSetup(storeId: string): Promise<StoreEdgeSetupPayload> {
    return this.getEdgeSetup(storeId);
  },

  async rotateEdgeToken(storeId: string): Promise<RotateEdgeTokenResult> {
    try {
      const response = await api.post(`/v1/stores/${storeId}/edge-token/rotate/`);
      return { supported: true, ...normalizeEdgeSetup(response.data, storeId) };
    } catch (error) {
      const apiError = error as ApiErrorLike;
      if (apiError.response?.status === 404) {
        return { supported: false };
      }
      console.error('❌ Erro ao rotacionar token do edge:', error);
      throw normalizeApiError(error, 'Falha ao gerar novo token do edge.');
    }
  },

  async getStoreEdgeStatus(storeId: string): Promise<StoreEdgeStatus> {
    try {
      const response = await api.get(`/v1/stores/${storeId}/edge-status/`);
      return normalizeEdgeStatus(response.data, storeId);
    } catch (error) {
      console.error('❌ Erro ao consultar status do edge:', error);
      throw normalizeApiError(error, 'Falha ao consultar status do edge.');
    }
  },

  // Criar nova loja
  async createStore(storeData: CreateStorePayload): Promise<Store> {
    const {
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    } = storeData;
    const payload = omitEmpty({
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    });
    const response = await api.post('/v1/stores/', payload);
    return response.data;
  },

  // Atualizar loja
  async updateStore(storeId: string, storeData: UpdateStorePayload): Promise<Store> {
    const {
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    } = storeData;
    const payload = omitEmpty({
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    });
    const response = await api.patch(`/v1/stores/${storeId}/`, payload);
    return response.data;
  },

  // Deletar loja
  async deleteStore(storeId: string): Promise<void> {
    await api.delete(`/v1/stores/${storeId}/`);
  }
};
