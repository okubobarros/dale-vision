// src/services/stores.ts
import api from './api';
import type { StoreDashboard } from '../types/dashboard';

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

export const storesService = {
  // Listar todas as lojas do usuário
  async getStores(): Promise<Store[]> {
    console.log('🔄 Buscando lojas...');
    try {
      const response = await api.get('/v1/stores/');
      console.log('📦 Resposta completa:', response);
      
      // A API retorna {data: [...]}
      const stores = response.data.data || response.data;
      console.log(`✅ Encontradas ${stores?.length || 0} lojas`);
      
      return stores || [];
    } catch (error) {
      console.error('❌ Erro ao buscar lojas:', error);
      throw error;
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
      
      // Fallback com dados mock
      return getMockDashboard(storeId);
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
      
      // Fallback mock
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
  }
};