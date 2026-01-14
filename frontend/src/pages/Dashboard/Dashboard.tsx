import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../../contexts/AuthContext'
import {
  storesService,
  type Store,
  type StoreMetrics,
} from '../../services/stores'

/* =======================
   Componentes auxiliares
======================= */

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color: string
}

const MetricCard = ({
  title,
  value,
  icon,
  trend,
  color,
}: MetricCardProps) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>

      {typeof trend === 'number' && (
        <span
          className={`text-sm font-medium ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend > 0 ? '+' : ''}
          {trend}%
        </span>
      )}
    </div>

    <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
    <p className="text-gray-600">{title}</p>
  </div>
)

/* =======================
   Dashboard
======================= */

const Dashboard = () => {
  const { user } = useAuth()

  const [selectedStore, setSelectedStore] = useState<string>('')
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null)

  /* ===== Buscar lojas ===== */
  const {
    data: stores,
    isLoading: storesLoading,
  } = useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: storesService.getStores,
  })

  /* ===== Definir loja padrão ===== */
  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id)
    }
  }, [stores, selectedStore])

  /* ===== Buscar métricas ===== */
  useEffect(() => {
    if (!selectedStore) return

    storesService
      .getStoreDashboard(selectedStore)
      .then(setMetrics)
      .catch(console.error)
  }, [selectedStore])

  /* ===== Ícones ===== */
  const icons = {
    camera: (
      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    users: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
      </svg>
    ),
    alert: (
      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    chart: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
      </svg>
    ),
  }

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {user?.first_name || user?.username}, bem-vindo ao DALE Vision
          </p>
        </div>

        {stores && stores.length > 0 && (
          <label className="flex items-center space-x-3 text-gray-700">
            <span>Loja:</span>
            <select
              aria-label="Selecionar loja"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Câmeras Ativas"
          value={metrics ? `${metrics.active_cameras}/${metrics.total_cameras}` : '0/0'}
          icon={icons.camera}
          color="bg-blue-50"
        />

        <MetricCard
          title="Eventos Hoje"
          value={metrics?.today_events ?? 0}
          icon={icons.users}
          color="bg-green-50"
        />

        <MetricCard
          title="Alertas Hoje"
          value={metrics?.alerts_today ?? 0}
          icon={icons.alert}
          color="bg-red-50"
        />

        <MetricCard
          title="Pico de Clientes"
          value={metrics?.peak_hour ?? 'N/A'}
          icon={icons.chart}
          color="bg-purple-50"
        />
      </div>
    </div>
  )
}

export default Dashboard
