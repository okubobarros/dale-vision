import api from './api';

export interface Store {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  owner_email: string;
}

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

export const storesService = {
  // Listar todas as lojas do usuário
  async getStores(): Promise<Store[]> {
    const response = await api.get('/v1/stores/');
    return response.data;
  },

  // Obter dashboard de uma loja específica
  async getStoreDashboard(storeId: string): Promise<StoreMetrics> {
    const response = await api.get(`/v1/stores/${storeId}/dashboard/`);
    return response.data;
  },

  // Obter visão da rede (todas as lojas)
  async getNetworkDashboard(): Promise<NetworkDashboard> {
    const response = await api.get('/v1/stores/network_dashboard/');
    return response.data;
  },

  // Criar nova loja
  async createStore(storeData: Partial<Store>): Promise<Store> {
    const response = await api.post('/v1/stores/', storeData);
    return response.data;
  },

  // Atualizar loja
  async updateStore(storeId: string, storeData: Partial<Store>): Promise<Store> {
    const response = await api.put(`/v1/stores/${storeId}/`, storeData);
    return response.data;
  },

  // Deletar loja
  async deleteStore(storeId: string): Promise<void> {
    await api.delete(`/v1/stores/${storeId}/`);
  },
};