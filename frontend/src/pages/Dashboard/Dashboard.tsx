import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { storesService, type Store } from '../../services/stores'
import type { StoreDashboard } from '../../types/dashboard'
import { LineChart } from '../../components/Charts/LineChart';
import { PieChart } from '../../components/Charts/PieChart';
// =======================
// Componentes auxiliares
// =======================

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color: string
  subtitle?: string
}

const MetricCard = ({
  title,
  value,
  icon,
  trend,
  color,
  subtitle
}: MetricCardProps) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      {trend !== undefined && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
    <p className="text-gray-600 font-medium">{title}</p>
    {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
  </div>
)

interface RecommendationCardProps {
  title: string
  description: string
  priority: string
  impact: string
}

const RecommendationCard = ({ title, description, priority, impact }: RecommendationCardProps) => {
  const priorityColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-blue-500 bg-blue-50'
  }

  const priorityLabels = {
    high: 'Alta Prioridade',
    medium: 'Média Prioridade',
    low: 'Baixa Prioridade'
  }

  return (
    <div className={`border-l-4 ${priorityColors[priority as keyof typeof priorityColors]} pl-4 py-3`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          priority === 'high' ? 'bg-red-100 text-red-800' :
          priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {priorityLabels[priority as keyof typeof priorityLabels]}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-2">{description}</p>
      <p className="text-gray-500 text-xs">🎯 Impacto: {impact}</p>
    </div>
  )
}

// =======================
// Dashboard Principal
// =======================

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)

  // Buscar lojas
  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: storesService.getStores,
  })

  // Definir loja padrão
  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id)
    }
  }, [stores, selectedStore])

  // Buscar dashboard quando loja muda
  useEffect(() => {
    if (!selectedStore) return

    setIsLoadingDashboard(true)
    console.log('🎯 Buscando dashboard para loja:', selectedStore)
    
    storesService.getStoreDashboard(selectedStore)
      .then(data => {
        console.log('✅ Dashboard recebido:', data)
        setDashboard(data)
      })
      .catch(error => {
        console.error('❌ Erro ao buscar dashboard:', error)
      })
      .finally(() => {
        setIsLoadingDashboard(false)
      })
  }, [selectedStore])

  // Ícones
  const icons = {
    health: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    productivity: (
      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    visitors: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    conversion: (
      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    cart: (
      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    idle: (
      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {user?.first_name || user?.username}, bem-vindo ao DALE Vision
          </p>
          
          {dashboard && (
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                dashboard.store.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {dashboard.store.status === 'active' ? 'Ativa' : 'Inativa'}
              </span>
              <span className="text-sm text-gray-600">
                Plano: <span className="font-medium">{dashboard.store.plan}</span>
              </span>
              <span className="text-sm text-gray-500">
                {dashboard.store.owner_email}
              </span>
            </div>
          )}
        </div>

        {/* Seletor de loja */}
        {stores && stores.length > 0 && (
        <div className="flex items-center space-x-4">
            <label htmlFor="store-select" className="text-gray-700 font-medium">
            Loja:
            </label>
            <select
            id="store-select"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
            disabled={isLoadingDashboard}
            aria-label="Selecionar loja para visualizar dashboard"
            >
            {stores.map((store) => (
                <option key={store.id} value={store.id}>
                {store.name}
                </option>
            ))}
            </select>
            {isLoadingDashboard && (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            )}
        </div>
        )}
      </div>

      {/* Métricas principais */}
      {dashboard ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Score de Saúde"
              value={`${dashboard.metrics.health_score}%`}
              icon={icons.health}
              color="bg-green-50"
              trend={Math.round(Math.random() * 10) - 3}
              subtitle="Saúde geral da operação"
            />
            
            <MetricCard
              title="Produtividade"
              value={`${dashboard.metrics.productivity}%`}
              icon={icons.productivity}
              color="bg-blue-50"
              trend={Math.round(Math.random() * 8) - 2}
              subtitle="Eficiência da equipe"
            />
            
            <MetricCard
              title="Fluxo de Visitantes"
              value={dashboard.metrics.visitor_flow.toLocaleString('pt-BR')}
              icon={icons.visitors}
              color="bg-purple-50"
              trend={Math.round(Math.random() * 15)}
              subtitle="Pessoas na loja hoje"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Taxa de Conversão"
              value={`${dashboard.metrics.conversion_rate.toFixed(1)}%`}
              icon={icons.conversion}
              color="bg-yellow-50"
              subtitle="Visitantes → Clientes"
            />
            
            <MetricCard
              title="Ticket Médio"
              value={`R$ ${dashboard.metrics.avg_cart_value.toFixed(2)}`}
              icon={icons.cart}
              color="bg-indigo-50"
              subtitle="Valor médio por venda"
            />
            
            <MetricCard
              title="Tempo Ocioso"
              value={`${dashboard.metrics.idle_time}%`}
              icon={icons.idle}
              color="bg-red-50"
              subtitle="Redução de produtividade"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart />
            <PieChart />
          </div>
          {/* Insights e Recomendações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Insights */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Insights da Loja</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">⏰ Horário de Pico</h3>
                  <p className="text-blue-700">Maior movimento: <span className="font-bold">{dashboard.insights.peak_hour}</span></p>
                  <p className="text-blue-600 text-sm mt-1">Recomenda-se alocar mais funcionários neste período</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">🏆 Setor mais Vendendo</h3>
                  <p className="text-green-700"><span className="font-bold">{dashboard.insights.best_selling_zone}</span> lidera em vendas</p>
                  <p className="text-green-600 text-sm mt-1">Garantir estoque adequado neste setor</p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">👥 Desempenho da Equipe</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-green-700 font-medium">🌟 Melhor desempenho:</p>
                      <p className="text-green-600">{dashboard.insights.employee_performance.best}</p>
                    </div>
                    <div>
                      <p className="text-red-700 font-medium">⚠️ Precisa de atenção:</p>
                      <p className="text-red-600">{dashboard.insights.employee_performance.needs_attention}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recomendações */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">💡 Recomendações IA</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {dashboard.recommendations.length} sugestões
                </span>
              </div>
              
              <div className="space-y-4">
                {dashboard.recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={index}
                    title={rec.title}
                    description={rec.description}
                    priority={rec.priority}
                    impact={rec.estimated_impact}
                  />
                ))}
              </div>

              {/* Alertas */}
              {dashboard.alerts.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-4">🚨 Alertas Recentes</h3>
                  <div className="space-y-3">
                    {dashboard.alerts.map((alert, index) => (
                      <div key={index} className={`p-3 rounded-lg ${
                        alert.severity === 'high' ? 'bg-red-50 border border-red-200' :
                        alert.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="flex items-start">
                          <span className={`mr-2 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`}>
                            {alert.severity === 'high' ? '🔴' :
                             alert.severity === 'medium' ? '🟡' : '🔵'}
                          </span>
                          <div>
                            <p className="text-gray-800">{alert.message}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(alert.time).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        // Estado sem dados
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma loja</h3>
          <p className="text-gray-500">Escolha uma loja no menu acima para ver o dashboard</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard