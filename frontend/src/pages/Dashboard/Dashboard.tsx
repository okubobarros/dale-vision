import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "../../contexts/AuthContext"
import { storesService, type Store } from "../../services/stores"
import type { StoreDashboard } from "../../types/dashboard"
import { LineChart } from "../../components/Charts/LineChart"
import { PieChart } from "../../components/Charts/PieChart"

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
  subtitle,
}: MetricCardProps) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow min-w-0">
    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>

      {trend !== undefined && (
        <span
          className={`text-xs sm:text-sm font-medium ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>

    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 break-words">
      {value}
    </h3>
    <p className="text-gray-700 font-semibold text-sm sm:text-base">{title}</p>
    {subtitle && (
      <p className="text-gray-400 text-xs sm:text-sm mt-1">{subtitle}</p>
    )}
  </div>
)

interface RecommendationCardProps {
  title: string
  description: string
  priority: string
  impact: string
}

const RecommendationCard = ({
  title,
  description,
  priority,
  impact,
}: RecommendationCardProps) => {
  const priorityColors = {
    high: "border-red-500 bg-red-50",
    medium: "border-yellow-500 bg-yellow-50",
    low: "border-blue-500 bg-blue-50",
  }

  const priorityLabels = {
    high: "Alta Prioridade",
    medium: "Média Prioridade",
    low: "Baixa Prioridade",
  }

  return (
    <div
      className={`border-l-4 ${
        priorityColors[priority as keyof typeof priorityColors]
      } pl-4 py-3 pr-3 rounded-r-lg`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-800 leading-snug">{title}</h4>
        <span
          className={`shrink-0 px-2 py-1 text-[11px] font-semibold rounded ${
            priority === "high"
              ? "bg-red-100 text-red-800"
              : priority === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {priorityLabels[priority as keyof typeof priorityLabels]}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-2">{description}</p>
      <p className="text-gray-500 text-xs">🎯 Impacto: {impact}</p>
    </div>
  )
}

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id)
    }
  }, [stores, selectedStore])

  useEffect(() => {
    if (!selectedStore) return

    setIsLoadingDashboard(true)
    storesService
      .getStoreDashboard(selectedStore)
      .then((data) => setDashboard(data))
      .catch((error) => console.error("❌ Erro ao buscar dashboard:", error))
      .finally(() => setIsLoadingDashboard(false))
  }, [selectedStore])

  const icons = {
    health: (
      <svg
        className="w-6 h-6 text-green-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    productivity: (
      <svg
        className="w-6 h-6 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    visitors: (
      <svg
        className="w-6 h-6 text-purple-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    conversion: (
      <svg
        className="w-6 h-6 text-yellow-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    cart: (
      <svg
        className="w-6 h-6 text-indigo-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    idle: (
      <svg
        className="w-6 h-6 text-red-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header (mobile-first) */}
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {user?.first_name || user?.username}, bem-vindo ao DALE Vision
          </p>

          {dashboard && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                  dashboard.store.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {dashboard.store.status === "active" ? "Ativa" : "Inativa"}
              </span>

              <span className="text-xs sm:text-sm text-gray-600">
                Plano: <span className="font-semibold">{dashboard.store.plan}</span>
              </span>

              <span className="text-xs sm:text-sm text-gray-500 truncate max-w-[220px]">
                {dashboard.store.owner_email}
              </span>
            </div>
          )}
        </div>

        {/* Seletor de loja */}
        {stores && stores.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label
              htmlFor="store-select"
              className="text-gray-700 font-semibold text-sm"
            >
              Loja
            </label>

            <div className="flex items-center gap-2">
              <select
                id="store-select"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full sm:w-[320px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
              )}
            </div>
          </div>
        )}
      </div>

      {dashboard ? (
        <>
          {/* Métricas topo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              value={dashboard.metrics.visitor_flow.toLocaleString("pt-BR")}
              icon={icons.visitors}
              color="bg-purple-50"
              trend={Math.round(Math.random() * 15)}
              subtitle="Pessoas na loja hoje"
            />
          </div>

          {/* Métricas 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <LineChart />
            <PieChart />
          </div>

          {/* Insights + Recomendações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">
                📊 Insights da Loja
              </h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    ⏰ Horário de Pico
                  </h3>
                  <p className="text-blue-700 text-sm sm:text-base">
                    Maior movimento:{" "}
                    <span className="font-bold">{dashboard.insights.peak_hour}</span>
                  </p>
                  <p className="text-blue-600 text-xs sm:text-sm mt-1">
                    Recomenda-se alocar mais funcionários neste período
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">
                    🏆 Setor mais Vendendo
                  </h3>
                  <p className="text-green-700 text-sm sm:text-base">
                    <span className="font-bold">
                      {dashboard.insights.best_selling_zone}
                    </span>{" "}
                    lidera em vendas
                  </p>
                  <p className="text-green-600 text-xs sm:text-sm mt-1">
                    Garantir estoque adequado neste setor
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    👥 Desempenho da Equipe
                  </h3>
                  <div className="space-y-3 text-sm sm:text-base">
                    <div>
                      <p className="text-green-700 font-semibold">
                        🌟 Melhor desempenho:
                      </p>
                      <p className="text-green-600">
                        {dashboard.insights.employee_performance.best}
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 font-semibold">
                        ⚠️ Precisa de atenção:
                      </p>
                      <p className="text-red-600">
                        {dashboard.insights.employee_performance.needs_attention}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  💡 Recomendações IA
                </h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold rounded-full">
                  {dashboard.recommendations.length} sugestões
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
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

              {dashboard.alerts.length > 0 && (
                <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">🚨 Alertas Recentes</h3>
                  <div className="space-y-3">
                    {dashboard.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          alert.severity === "high"
                            ? "bg-red-50 border border-red-200"
                            : alert.severity === "medium"
                            ? "bg-yellow-50 border border-yellow-200"
                            : "bg-blue-50 border border-blue-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">
                            {alert.severity === "high"
                              ? "🔴"
                              : alert.severity === "medium"
                              ? "🟡"
                              : "🔵"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-gray-800 text-sm sm:text-base">
                              {alert.message}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(alert.time).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Selecione uma loja
          </h3>
          <p className="text-gray-500">
            Escolha uma loja no seletor para ver o dashboard
          </p>
        </div>
      )}
    </div>
  )
}

export default Dashboard
