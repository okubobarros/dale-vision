// src/services/stores.ts
import api from './api';
import type { StoreDashboard } from '../types/dashboard';
import { USE_MOCK_DATA } from '../lib/mock';

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
}

type StoreWriteFields = {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  status?: StoreStatus;
};

export type CreateStorePayload = StoreWriteFields;
export type UpdateStorePayload = StoreWriteFields;

export interface StoreMetrics {
  total_cameras: number;
  active_cameras: number;
  today_events: number;
  avg_customer_count: number;
  peak_hour: string;
  alerts_today: number;
}

export interface NetworkDashboard {
  total_stores: number;
  total_cameras: number;
  active_alerts: number;
  stores: Array<{
    id: string;
    name: string;
    status: string;
    camera_count: number;
    last_activity: string;
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

// Funções auxiliares (não exportadas)
const getMockDashboard = (storeId: string): StoreDashboard => {
  console.log('🔄 Usando dados mock para dashboard');
  
  const mockNames = ['Loja Principal', 'Filial Centro', 'Loja Shopping'];
  const mockSectors = ['Setor A', 'Setor B', 'Setor C', 'Setor D'];
  const employees = ['Maria Silva', 'João Santos', 'Ana Oliveira', 'Pedro Costa'];
  
  return {
    store: {
      id: storeId,
      name: mockNames[Math.floor(Math.random() * mockNames.length)],
      owner_email: "user@example.com",
      plan: ["trial", "basic", "pro"][Math.floor(Math.random() * 3)],
      status: "active"
    },
    metrics: {
      health_score: 80 + Math.floor(Math.random() * 20),
      productivity: 70 + Math.floor(Math.random() * 25),
      idle_time: 10 + Math.floor(Math.random() * 15),
      visitor_flow: 800 + Math.floor(Math.random() * 400),
      conversion_rate: 55 + Math.random() * 30,
      avg_cart_value: 80 + Math.random() * 70
    },
    insights: {
      peak_hour: `${10 + Math.floor(Math.random() * 6)}:00-${12 + Math.floor(Math.random() * 6)}:00`,
      best_selling_zone: mockSectors[Math.floor(Math.random() * mockSectors.length)],
      employee_performance: {
        best: `${employees[Math.floor(Math.random() * employees.length)]} (${85 + Math.floor(Math.random() * 15)}%)`,
        needs_attention: `${employees[Math.floor(Math.random() * employees.length)]} (${50 + Math.floor(Math.random() * 20)}%)`
      }
    },
    recommendations: [
      {
        id: "rec_1",
        title: "Otimizar horários de pico",
        description: "Ajustar escalas para cobrir o horário de maior movimento",
        priority: ["high", "medium", "low"][Math.floor(Math.random() * 3)],
        action: "adjust_schedules",
        estimated_impact: "Aumento de 15-25% na produtividade"
      },
      {
        id: "rec_2",
        title: "Repor estoque crítico",
        description: "Produtos mais vendidos com estoque abaixo do mínimo",
        priority: ["high", "medium", "low"][Math.floor(Math.random() * 3)],
        action: "restock",
        estimated_impact: `Evitar perda de R$ ${(2000 + Math.random() * 3000).toFixed(0)} em vendas`
      },
      {
        id: "rec_3",
        title: "Treinamento de equipe",
        description: "Capacitação para melhorar atendimento ao cliente",
        priority: ["high", "medium", "low"][Math.floor(Math.random() * 3)],
        action: "training",
        estimated_impact: "Aumento de 10% na taxa de conversão"
      }
    ],
    alerts: [
      {
        type: "high_idle_time",
        message: "Funcionário com tempo ocioso acima da média",
        severity: "medium",
        time: new Date().toISOString()
      },
      {
        type: "low_conversion",
        message: "Taxa de conversão abaixo da média histórica",
        severity: "high",
        time: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  };
};

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
  response?: { status?: number; data?: { detail?: string } };
  message?: string;
  code?: string;
};

const normalizeApiError = (error: unknown, fallbackMessage: string) => {
  const err = (error || {}) as ApiErrorLike;
  const detail =
    err.response?.data?.detail ||
    err.message ||
    fallbackMessage;
  const normalized = new Error(detail);
  (normalized as ApiErrorLike).response = {
    status: err.response?.status,
    data: { detail },
  };
  (normalized as ApiErrorLike).code = err.code;
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
  // Listar todas as lojas do usuário
  async getStores(): Promise<Store[]> {
    console.log('🔄 Buscando lojas...');
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
      
      if (USE_MOCK_DATA) {
        return getMockDashboard(storeId);
      }
      throw error;
    }
  },

  // Obter métricas no formato antigo (para compatibilidade se necessário)
  async getStoreMetrics(storeId: string): Promise<StoreMetrics> {
    const dashboard = await this.getStoreDashboard(storeId);
    
    // Converter do novo formato para o formato antigo
    return {
      total_cameras: 4,
      active_cameras: 3,
      today_events: Math.round(dashboard.metrics.visitor_flow / 30),
      avg_customer_count: Math.round(dashboard.metrics.visitor_flow / 8),
      peak_hour: dashboard.insights.peak_hour,
      alerts_today: dashboard.alerts.length
    };
  },

  // Obter visão da rede (todas as lojas)
  async getNetworkDashboard(): Promise<NetworkDashboard> {
    try {
      const response = await api.get('/v1/stores/network_dashboard/');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar network dashboard:', error);
      
      if (USE_MOCK_DATA) {
        const stores = await this.getStores();
        return {
          total_stores: stores.length,
          total_cameras: stores.length * 3,
          active_alerts: stores.length * 2,
          stores: stores.map(store => ({
            id: store.id,
            name: store.name,
            status: store.status,
            camera_count: 3,
            last_activity: new Date().toISOString()
          }))
        };
      }
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
      phone,
      email,
      status,
    } = storeData;
    const payload = omitEmpty({
      name,
      description,
      address,
      city,
      state,
      phone,
      email,
      status,
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
      phone,
      email,
      status,
    } = storeData;
    const payload = omitEmpty({
      name,
      description,
      address,
      city,
      state,
      phone,
      email,
      status,
    });
    const response = await api.put(`/v1/stores/${storeId}/`, payload);
    return response.data;
  },

  // Deletar loja
  async deleteStore(storeId: string): Promise<void> {
    await api.delete(`/v1/stores/${storeId}/`);
  }
};
