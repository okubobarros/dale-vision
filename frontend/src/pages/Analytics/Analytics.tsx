import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LineChart, type LineChartPoint } from "../../components/Charts/LineChart"
import { PieChart, type PieChartPoint } from "../../components/Charts/PieChart"
import { storesService, type Store } from "../../services/stores"

const Analytics = () => {
  const [period, setPeriod] = useState("7d")
  const [selectedStore, setSelectedStore] = useState<string>("")

  const periodLabel = useMemo(() => {
    switch (period) {
      case "30d":
        return "Últimos 30 dias"
      case "90d":
        return "Últimos 90 dias"
      default:
        return "Últimos 7 dias"
    }
  }, [period])

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
    staleTime: 60000,
  })

  const defaultStoreId = useMemo(() => {
    if (selectedStore) return selectedStore
    if ((stores ?? []).length === 1) return stores?.[0]?.id ?? ""
    return ""
  }, [selectedStore, stores])

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["analytics-summary", defaultStoreId, period],
    queryFn: () =>
      defaultStoreId
        ? storesService.getStoreAnalyticsSummary(defaultStoreId, { period, bucket: "day" })
        : Promise.resolve(null),
    enabled: Boolean(defaultStoreId),
  })

  const totalVisitors = summary?.totals.total_visitors ?? 0
  const conversionRate = summary?.totals.avg_conversion_rate ?? 0
  const queueAvgMin = Math.round((summary?.totals.avg_queue_seconds ?? 0) / 60)
  const dwellAvgMin = Math.round((summary?.totals.avg_dwell_seconds ?? 0) / 60)

  const lineData: LineChartPoint[] = useMemo(() => {
    if (!summary) return []
    return summary.series.traffic.map((t) => {
      const conv = summary.series.conversion.find((c) => c.ts_bucket === t.ts_bucket)
      const convRate = conv?.conversion_rate ?? 0
      const conversions = Math.round((t.footfall || 0) * (convRate / 100))
      const label = new Date(t.ts_bucket).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
      return { label, visitantes: t.footfall, conversoes: conversions }
    })
  }, [summary])

  const pieData: PieChartPoint[] = useMemo(() => {
    if (!summary || summary.zones.length === 0) return []
    const total = summary.zones.reduce((acc, z) => acc + (z.footfall || 0), 0) || 1
    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#6b7280"]
    return summary.zones.map((z, idx) => ({
      name: z.name,
      value: Math.round((z.footfall / total) * 100),
      color: colors[idx % colors.length],
    }))
  }, [summary])

  const metrics = [
    { title: "Total de Visitantes", value: totalVisitors.toLocaleString("pt-BR"), change: periodLabel },
    { title: "Taxa de Conversão (média)", value: `${conversionRate.toFixed(1)}%`, change: periodLabel },
    { title: "Fila Média (min)", value: queueAvgMin.toString(), change: periodLabel },
    { title: "Permanência Média (min)", value: dwellAvgMin.toString(), change: periodLabel },
  ]

  return (
    <div className="space-y-6">
      {/* Header mobile-first */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-1">Análises avançadas e insights detalhados</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="period" className="sr-only">
            Selecionar período
          </label>

          <select
            id="period"
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2"
            aria-label="Selecionar período"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          <label htmlFor="store" className="sr-only">
            Selecionar loja
          </label>
          <select
            id="store"
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2"
            aria-label="Selecionar loja"
            value={selectedStore || defaultStoreId}
            onChange={(event) => setSelectedStore(event.target.value)}
          >
            <option value="">Selecione uma loja</option>
            {(stores ?? []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled
            className="w-full sm:w-auto bg-blue-500/70 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
          >
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {metric.title}
            </h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold text-gray-800 mr-2">
                {metric.value}
              </span>
              <span
                className="text-sm font-medium text-gray-400"
              >
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Período selecionado
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {periodLabel}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {summary ? `${summary.from} → ${summary.to}` : "Sem dados ainda"}
            </p>
          </div>
        </div>
      </div>

      {/* Blocos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Evolução de Métricas
          </h3>
          <div className="h-[260px] sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            {loadingSummary || !summary ? (
              <p className="text-gray-500">Sem dados disponíveis</p>
            ) : (
              <LineChart data={lineData} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Distribuição por Zona
          </h3>
          <div className="h-[260px] sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            {loadingSummary || !summary ? (
              <p className="text-gray-500">Sem dados disponíveis</p>
            ) : (
              <PieChart data={pieData} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
