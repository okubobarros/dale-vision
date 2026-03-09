import { Suspense, lazy, useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import type { LineChartPoint, LineSeries } from "../../components/Charts/LineChart"
import type { PieChartPoint } from "../../components/Charts/PieChart"
import { storesService, type Store } from "../../services/stores"

const LineChart = lazy(() =>
  import("../../components/Charts/LineChart").then((module) => ({
    default: module.LineChart,
  }))
)
const PieChart = lazy(() =>
  import("../../components/Charts/PieChart").then((module) => ({
    default: module.PieChart,
  }))
)

const ChartFallback = () => (
  <div className="h-full w-full rounded-lg bg-gray-200/70 animate-pulse" />
)

const TARGETS = Object.freeze({
  conversion: 30,
  queueMin: 3,
  dwellMin: 4,
})

type StatusTone = "good" | "warn" | "bad" | "neutral"
type MetricStatus = { tone: StatusTone; label: string }

const getMetricStatus = (
  hasSummary: boolean,
  value: number,
  target: number,
  direction: "higher" | "lower"
): MetricStatus => {
  if (!hasSummary) {
    return { tone: "neutral", label: "Sem dados" }
  }
  if (direction === "higher") {
    if (value >= target) return { tone: "good", label: "Dentro da meta" }
    if (value >= target * 0.8) return { tone: "warn", label: "Atenção" }
    return { tone: "bad", label: "Abaixo da meta" }
  }
  if (value <= target) return { tone: "good", label: "Dentro da meta" }
  if (value <= target * 1.3) return { tone: "warn", label: "Atenção" }
  return { tone: "bad", label: "Acima da meta" }
}

const Analytics = () => {
  const navigate = useNavigate()
  const [period, setPeriod] = useState("7d")
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [metricView, setMetricView] = useState<"visitantes" | "conversoes" | "fila">("visitantes")
  const [sortKey, setSortKey] = useState<"visitors" | "conversion" | "queue" | "dwell" | "status">("queue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

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

  const periodDays = useMemo(() => {
    switch (period) {
      case "30d":
        return 30
      case "90d":
        return 90
      default:
        return 7
    }
  }, [period])

  const periodRange = useMemo(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(now.getDate() - (periodDays - 1))
    const to = new Date(now)
    const formatDate = (date: Date) => date.toISOString().slice(0, 10)
    return { from: formatDate(from), to: formatDate(to) }
  }, [periodDays])

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

  const selectedStoreName = useMemo(() => {
    if (!defaultStoreId) return "Sua loja"
    return (stores ?? []).find((store) => store.id === defaultStoreId)?.name ?? "Sua loja"
  }, [defaultStoreId, stores])

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

  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  const formatMinutes = (value: number) => `${value} min`
  const hasSummary = Boolean(summary)
  const conversionStatus = getMetricStatus(hasSummary, conversionRate, TARGETS.conversion, "higher")
  const queueStatus = getMetricStatus(hasSummary, queueAvgMin, TARGETS.queueMin, "lower")
  const dwellStatus = getMetricStatus(hasSummary, dwellAvgMin, TARGETS.dwellMin, "lower")

  const statusStyles: Record<StatusTone, string> = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-gray-50 text-gray-500 border-gray-200",
  }

  const executiveSummary = !summary || !defaultStoreId
    ? "Selecione uma loja para gerar o resumo executivo."
    : (() => {
        const painCandidates = [
          queueAvgMin > TARGETS.queueMin ? "fila acima da meta" : null,
          conversionRate < TARGETS.conversion ? "conversão abaixo da meta" : null,
          dwellAvgMin > TARGETS.dwellMin ? "permanência acima da meta" : null,
        ].filter(Boolean) as string[]

        const mainPain = painCandidates[0]
        const painText = mainPain
          ? `Sua principal dor hoje é ${mainPain}.`
          : "Saúde dentro das metas principais."

        return `Na ${selectedStoreName}, nos ${periodLabel.toLowerCase()} você recebeu ${totalVisitors.toLocaleString(
          "pt-BR"
        )} visitantes, converteu ${formatPercent(conversionRate)} em vendas e teve fila média de ${formatMinutes(
          queueAvgMin
        )}. ${painText}`
      })()

  const lineData: LineChartPoint[] = useMemo(() => {
    if (!summary) return []
    return summary.series.traffic.map((t) => {
      const conv = summary.series.conversion.find((c) => c.ts_bucket === t.ts_bucket)
      const convRate = conv?.conversion_rate ?? 0
      const conversions = Math.round((t.footfall || 0) * (convRate / 100))
      const queueMin = Math.round((conv?.queue_avg_seconds ?? 0) / 60)
      const label = new Date(t.ts_bucket).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
      return { label, visitantes: t.footfall, conversoes: conversions, fila: queueMin }
    })
  }, [summary])

  const metricSeries = useMemo<LineSeries[]>(() => {
    switch (metricView) {
      case "conversoes":
        return [{ key: "conversoes", label: "Conversões", color: "#8b5cf6" }]
      case "fila":
        return [{ key: "fila", label: "Fila (min)", color: "#f59e0b" }]
      default:
        return [{ key: "visitantes", label: "Visitantes", color: "#3b82f6" }]
    }
  }, [metricView])

  const pieData: PieChartPoint[] = useMemo(() => {
    if (!summary || summary.zones.length === 0) return []
    const total = summary.zones.reduce((acc, z) => acc + (z.footfall || 0), 0) || 1
    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#6b7280"]
    return summary.zones.map((z, idx) => ({
      id: z.zone_id,
      name: z.name,
      value: Math.round((z.footfall / total) * 100),
      color: colors[idx % colors.length],
    }))
  }, [summary])

  const { data: networkSummaries, isLoading: loadingNetwork } = useQuery({
    queryKey: ["analytics-network", period, (stores ?? []).map((s) => s.id).join(",")],
    queryFn: async () => {
      const list = stores ?? []
      const results = await Promise.all(
        list.map(async (store) => {
          try {
            const storeSummary = await storesService.getStoreAnalyticsSummary(store.id, {
              period,
              bucket: "day",
            })
            return { store, summary: storeSummary }
          } catch {
            return { store, summary: null }
          }
        })
      )
      return results
    },
    enabled: (stores ?? []).length > 0,
    staleTime: 60000,
  })

  const storeRows = !networkSummaries
    ? []
    : networkSummaries.map(({ store, summary: storeSummary }) => {
        const visitors = storeSummary?.totals.total_visitors ?? 0
        const conversion = storeSummary?.totals.avg_conversion_rate ?? 0
        const queueMin = Math.round((storeSummary?.totals.avg_queue_seconds ?? 0) / 60)
        const dwellMin = Math.round((storeSummary?.totals.avg_dwell_seconds ?? 0) / 60)
        const hasStoreSummary = Boolean(storeSummary)
        const conversionTone = getMetricStatus(
          hasStoreSummary,
          conversion,
          TARGETS.conversion,
          "higher"
        ).tone
        const queueTone = getMetricStatus(hasStoreSummary, queueMin, TARGETS.queueMin, "lower").tone
        const dwellTone = getMetricStatus(hasStoreSummary, dwellMin, TARGETS.dwellMin, "lower").tone
        const tones = [conversionTone, queueTone, dwellTone]
        const status: StatusTone =
          tones.includes("bad") ? "bad" : tones.includes("warn") ? "warn" : tones.includes("good") ? "good" : "neutral"
        return {
          id: store.id,
          name: store.name,
          visitors,
          conversion,
          queueMin,
          dwellMin,
          status,
        }
      })

  const sortedStoreRows = (() => {
    const rows = [...storeRows]
    const statusRank: Record<StatusTone, number> = { bad: 3, warn: 2, good: 1, neutral: 0 }
    const getValue = (row: (typeof storeRows)[number]) => {
      switch (sortKey) {
        case "visitors":
          return row.visitors
        case "conversion":
          return row.conversion
        case "queue":
          return row.queueMin
        case "dwell":
          return row.dwellMin
        case "status":
          return statusRank[row.status]
        default:
          return 0
      }
    }
    rows.sort((a, b) => {
      const av = getValue(a)
      const bv = getValue(b)
      if (av === bv) return 0
      return sortDir === "asc" ? av - bv : bv - av
    })
    return rows
  })()

  const handleSort = useCallback(
    (key: "visitors" | "conversion" | "queue" | "dwell" | "status") => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
        return
      }
      setSortKey(key)
      setSortDir(key === "conversion" ? "desc" : "desc")
    },
    [sortKey]
  )

  const metrics: {
    title: string
    value: string
    change: string
    target: string | null
    status: MetricStatus
    metricKey?: "conversion" | "queue" | "dwell"
  }[] = [
    {
      title: "Total de Visitantes",
      value: totalVisitors.toLocaleString("pt-BR"),
      change: periodLabel,
      target: null,
      status: { tone: "neutral", label: "Sem meta" },
    },
    {
      title: "Taxa de Conversão (média)",
      value: formatPercent(conversionRate),
      change: periodLabel,
      target: `Meta ${TARGETS.conversion}%`,
      status: conversionStatus,
      metricKey: "conversion",
    },
    {
      title: "Fila Média (min)",
      value: queueAvgMin.toString(),
      change: periodLabel,
      target: `Meta ${TARGETS.queueMin} min`,
      status: queueStatus,
      metricKey: "queue",
    },
    {
      title: "Permanência Média (min)",
      value: dwellAvgMin.toString(),
      change: periodLabel,
      target: `Meta ${TARGETS.dwellMin} min`,
      status: dwellStatus,
      metricKey: "dwell",
    },
  ]

  const buildAlertsUrl = useCallback(
    (metric: "conversion" | "queue" | "dwell") => {
      if (!defaultStoreId) return null
      const queryMap = {
        conversion: "conversion",
        queue: "queue",
        dwell: "dwell",
      } as const
      const params = new URLSearchParams()
      params.set("store_id", defaultStoreId)
      params.set("status", "open")
      params.set("severity", "critical")
      params.set("q", queryMap[metric])
      params.set("from", periodRange.from)
      params.set("to", periodRange.to)
      return `/app/alerts?${params.toString()}`
    },
    [defaultStoreId, periodRange.from, periodRange.to]
  )

  const handleMetricClick = useCallback(
    (metric: "conversion" | "queue" | "dwell") => {
      const url = buildAlertsUrl(metric)
      if (!url) return
      navigate(url)
    },
    [buildAlertsUrl, navigate]
  )

  const handleZoneClick = useCallback(
    (zone?: PieChartPoint) => {
      if (!zone?.id || !defaultStoreId) return
      const params = new URLSearchParams()
      params.set("store_id", defaultStoreId)
      params.set("zone_id", zone.id)
      params.set("openRoi", "1")
      navigate(`/app/cameras?${params.toString()}`)
    },
    [defaultStoreId, navigate]
  )

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
        {metrics.map((metric) => {
          const isActionable = metric.status.tone === "bad"
          const actionMetric = metric.metricKey ?? null
          const handleClick =
            isActionable && actionMetric
              ? () => handleMetricClick(actionMetric)
              : undefined
          return (
          <div
            key={metric.title}
            className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 ${
              isActionable ? "cursor-pointer hover:border-rose-200" : ""
            }`}
            onClick={handleClick}
            role={isActionable ? "button" : undefined}
            tabIndex={isActionable ? 0 : -1}
            onKeyDown={(event) => {
              if (!handleClick) return
              if (event.key === "Enter") handleClick()
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-medium text-gray-500">
                {metric.title}
              </h3>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[metric.status.tone]}`}
              >
                {metric.status.label}
              </span>
            </div>
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
            {metric.target && (
              <p className="text-xs text-gray-400 mt-2">{metric.target}</p>
            )}
          </div>
        )})}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wide text-gray-400">Resumo Executivo</p>
        <p className="text-sm sm:text-base text-gray-700 mt-2">
          {executiveSummary}
        </p>
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
              <Suspense fallback={<ChartFallback />}>
                <LineChart data={lineData} series={metricSeries} />
              </Suspense>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "visitantes", label: "Visitantes" },
              { key: "conversoes", label: "Conversão" },
              { key: "fila", label: "Fila" },
            ].map((button) => (
              <button
                key={button.key}
                type="button"
                onClick={() => setMetricView(button.key as "visitantes" | "conversoes" | "fila")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  metricView === button.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {button.label}
              </button>
            ))}
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
              <Suspense fallback={<ChartFallback />}>
                <PieChart data={pieData} onSliceClick={(point) => handleZoneClick(point)} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Lojas da Rede</h3>
            <p className="text-sm text-gray-500">Compare rapidamente onde a rede precisa de atenção</p>
          </div>
          <div className="text-xs text-gray-400">
            {loadingNetwork ? "Carregando..." : `${sortedStoreRows.length} lojas`}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="text-left py-2 pr-4">Loja</th>
                <th className="text-right py-2 px-2">
                  <button type="button" onClick={() => handleSort("visitors")}>
                    Visitantes
                  </button>
                </th>
                <th className="text-right py-2 px-2">
                  <button type="button" onClick={() => handleSort("conversion")}>
                    Conversão
                  </button>
                </th>
                <th className="text-right py-2 px-2">
                  <button type="button" onClick={() => handleSort("queue")}>
                    Fila
                  </button>
                </th>
                <th className="text-right py-2 px-2">
                  <button type="button" onClick={() => handleSort("dwell")}>
                    Permanência
                  </button>
                </th>
                <th className="text-center py-2 pl-2">
                  <button type="button" onClick={() => handleSort("status")}>
                    Status
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStoreRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    Sem dados para comparar lojas.
                  </td>
                </tr>
              ) : (
                sortedStoreRows.map((row) => {
                  const statusLabel =
                    row.status === "bad"
                      ? "Crítico"
                      : row.status === "warn"
                      ? "Atenção"
                      : row.status === "good"
                      ? "Ok"
                      : "Sem dados"
                  const statusDot =
                    row.status === "bad"
                      ? "bg-rose-500"
                      : row.status === "warn"
                      ? "bg-amber-500"
                      : row.status === "good"
                      ? "bg-emerald-500"
                      : "bg-gray-300"
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedStore(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setSelectedStore(row.id)
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="py-3 pr-4 font-medium text-gray-700">{row.name}</td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {row.visitors.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {formatPercent(row.conversion)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {formatMinutes(row.queueMin)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {formatMinutes(row.dwellMin)}
                      </td>
                      <td className="py-3 pl-2 text-center">
                        <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics
