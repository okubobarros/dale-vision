// src/types/dashboard.ts
export interface StoreDashboard {
  store: {
    id: string;
    name: string;
    owner_email: string;
    plan: string;
    status: string;
  };
  metrics: {
    health_score: number;
    productivity: number;
    idle_time: number;
    visitor_flow: number;
    conversion_rate: number;
    avg_cart_value: number;
  };
  insights: {
    peak_hour: string;
    best_selling_zone: string;
    employee_performance: {
      best: string;
      needs_attention: string;
    };
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    action: string;
    estimated_impact: string;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: string;
    time: string;
  }>;
}

export interface StoreMetrics {
  total_cameras: number;
  active_cameras: number;
  today_events: number;
  avg_customer_count: number;
  peak_hour: string;
  alerts_today: number;
}