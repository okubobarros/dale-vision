import { Suspense, lazy, useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import type { LineChartPoint, LineSeries } from "../../components/Charts/LineChart"
import type { PieChartPoint } from "../../components/Charts/PieChart"
import {
  type CreateStoreVisionCalibrationRunPayload,
  storesService,
  type MetricGovernanceItem,
  type Store,
  type StoreAnalyticsSummary,
  type StoreVisionAuditItem,
  type StoreVisionCalibrationPlanResponse,
  type StoreVisionCalibrationRunsResponse,
  type StoreVisionConfidenceResponse,
} from "../../services/stores"

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
type MetricGovernance = MetricGovernanceItem
type VisionConfidence = StoreVisionConfidenceResponse
type VisionCalibrationPlan = StoreVisionCalibrationPlanResponse
type VisionCalibrationRuns = StoreVisionCalibrationRunsResponse

const governanceStyles: Record<string, string> = {
  official: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proxy: "bg-amber-50 text-amber-700 border-amber-200",
  estimated: "bg-slate-50 text-slate-700 border-slate-200",
  unsupported: "bg-rose-50 text-rose-700 border-rose-200",
}

const confidenceStyles: Record<string, string> = {
  pronto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  parcial: "bg-amber-50 text-amber-700 border-amber-200",
  recalibrar: "bg-rose-50 text-rose-700 border-rose-200",
}

const confidenceLabels: Record<string, string> = {
  pronto: "Pronto operacional",
  parcial: "Cobertura parcial",
  recalibrar: "Recalibrar",
}

const cameraRoleLabels: Record<string, string> = {
  entrada: "Entrada",
  balcao: "Balcão",
  salao: "Salão",
  unknown: "Não classificada",
}

const confidenceReasonLabels: Record<string, string> = {
  roi_not_published: "ROI não publicada",
  camera_not_healthy: "Câmera sem saúde operacional",
  stale_or_missing_events: "Eventos ausentes ou stale",
  low_event_volume: "Volume baixo de eventos",
}

const getGovernance = (
  summary: StoreAnalyticsSummary | null | undefined,
  key: string
): MetricGovernance | null =>
  summary?.meta?.metric_governance?.totals?.[key] ?? null

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
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState("7d")
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [metricView, setMetricView] = useState<"visitantes" | "conversoes" | "fila">("visitantes")
  const [sortKey, setSortKey] = useState<"visitors" | "conversion" | "queue" | "dwell" | "status">("queue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [auditEventType, setAuditEventType] = useState<string>("")
  const [calibrationDraft, setCalibrationDraft] = useState<{
    cameraId: string
    metricType: CreateStoreVisionCalibrationRunPayload["metric_type"]
    metricLabel: string
    roiVersion?: string | null
    systemValue?: number | null
  } | null>(null)
  const [calibrationForm, setCalibrationForm] = useState({
    manualSampleSize: "",
    manualReferenceValue: "",
    systemValue: "",
    notes: "",
  })

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

  const selectedStoreRole = useMemo(
    () => (stores ?? []).find((store) => store.id === defaultStoreId)?.role ?? null,
    [defaultStoreId, stores]
  )
  const canManageCalibration = selectedStoreRole == null || ["owner", "admin", "manager"].includes(selectedStoreRole)

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["analytics-summary", defaultStoreId, period],
    queryFn: () =>
      defaultStoreId
        ? storesService.getStoreAnalyticsSummary(defaultStoreId, { period, bucket: "day" })
        : Promise.resolve(null),
    enabled: Boolean(defaultStoreId),
  })

  const { data: audit, isLoading: loadingAudit } = useQuery({
    queryKey: ["vision-audit", defaultStoreId, periodRange.from, periodRange.to, auditEventType],
    queryFn: () =>
      defaultStoreId
        ? storesService.getStoreVisionAudit(defaultStoreId, {
            from: `${periodRange.from}T00:00:00`,
            to: `${periodRange.to}T23:59:59`,
            event_type: auditEventType || undefined,
            limit: 12,
          })
        : Promise.resolve(null),
    enabled: Boolean(defaultStoreId),
    staleTime: 30000,
  })

  const { data: visionConfidence, isLoading: loadingConfidence } = useQuery<VisionConfidence | null>({
    queryKey: ["vision-confidence", defaultStoreId],
    queryFn: () =>
      defaultStoreId
        ? storesService.getStoreVisionConfidence(defaultStoreId, { window_hours: 24 })
        : Promise.resolve(null),
    enabled: Boolean(defaultStoreId),
    staleTime: 30000,
  })

  const { data: calibrationPlan, isLoading: loadingCalibrationPlan } = useQuery<VisionCalibrationPlan | null>({
    queryKey: ["vision-calibration-plan", defaultStoreId],
    queryFn: () =>
      defaultStoreId
        ? storesService.getStoreVisionCalibrationPlan(defaultStoreId, { window_hours: 24 })
        : Promise.resolve(null),
    enabled: Boolean(defaultStoreId),
    staleTime: 30000,
  })

  const { data: calibrationRuns, isLoading: loadingCalibrationRuns } = useQuery<VisionCalibrationRuns | null>({
    queryKey: ["vision-calibration-runs", defaultStoreId],
    queryFn: () =>
      defaultStoreId
        ? storesService.getStoreVisionCalibrationRuns(defaultStoreId, { limit: 8 })
        : Promise.resolve(null),
    enabled: Boolean(defaultStoreId),
    staleTime: 30000,
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
  const visitorsGovernance = getGovernance(summary, "total_visitors")
  const conversionGovernance = getGovernance(summary, "avg_conversion_rate")
  const queueGovernance = getGovernance(summary, "avg_queue_seconds")
  const dwellGovernance = getGovernance(summary, "avg_dwell_seconds")

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
        )} visitantes, converteu ${formatPercent(conversionRate)} em checkout proxy e teve fila média de ${formatMinutes(
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

  const auditEventTypeOptions = useMemo(
    () => [
      { value: "", label: "Todos os eventos" },
      { value: "vision.crossing.v1", label: "Crossing" },
      { value: "vision.queue_state.v1", label: "Fila" },
      { value: "vision.checkout_proxy.v1", label: "Checkout proxy" },
      { value: "vision.zone_occupancy.v1", label: "Ocupação" },
    ],
    []
  )

  const confidenceSummary = visionConfidence?.summary
  const confidenceGeneratedAt = visionConfidence?.generated_at
    ? new Date(visionConfidence.generated_at).toLocaleString("pt-BR")
    : null
  const calibrationSummary = calibrationPlan?.summary

  const createCalibrationMutation = useMutation({
    mutationFn: (payload: CreateStoreVisionCalibrationRunPayload) => {
      if (!defaultStoreId) throw new Error("Loja não selecionada")
      return storesService.createStoreVisionCalibrationRun(defaultStoreId, payload)
    },
    onSuccess: () => {
      toast.success("Calibração registrada")
      setCalibrationDraft(null)
      setCalibrationForm({
        manualSampleSize: "",
        manualReferenceValue: "",
        systemValue: "",
        notes: "",
      })
      void queryClient.invalidateQueries({ queryKey: ["vision-confidence", defaultStoreId] })
      void queryClient.invalidateQueries({ queryKey: ["vision-calibration-plan", defaultStoreId] })
      void queryClient.invalidateQueries({ queryKey: ["vision-calibration-runs", defaultStoreId] })
    },
    onError: () => {
      toast.error("Falha ao registrar calibração.")
    },
  })

  const auditSummaryEntries = useMemo(
    () => Object.entries(audit?.summary ?? {}).sort((a, b) => b[1] - a[1]),
    [audit]
  )

  const formatAuditValue = useCallback((item: StoreVisionAuditItem) => {
    if (item.event_type === "vision.crossing.v1") {
      return item.direction === "entry" ? "Entrada" : item.direction === "exit" ? "Saída" : "-"
    }
    if (item.event_type === "vision.queue_state.v1") {
      return `${item.count_value} na fila`
    }
    if (item.event_type === "vision.checkout_proxy.v1") {
      return `${item.count_value} atendimento`
    }
    if (item.event_type === "vision.zone_occupancy.v1") {
      return `${item.count_value} na zona`
    }
    return String(item.count_value)
  }, [])

  const openCalibrationDraft = useCallback(
    (
      cameraId: string,
      metricType: CreateStoreVisionCalibrationRunPayload["metric_type"],
      metricLabel: string,
      roiVersion?: string | null,
      systemValue?: number | null
    ) => {
      setCalibrationDraft({ cameraId, metricType, metricLabel, roiVersion, systemValue })
      setCalibrationForm({
        manualSampleSize: "",
        manualReferenceValue: "",
        systemValue: systemValue != null ? String(systemValue) : "",
        notes: "",
      })
    },
    []
  )

  const submitCalibrationDraft = useCallback(() => {
    if (!calibrationDraft) return
    if (!calibrationForm.manualReferenceValue.trim()) {
      toast.error("Informe o valor manual de referência.")
      return
    }
    const payload: CreateStoreVisionCalibrationRunPayload = {
      camera_id: calibrationDraft.cameraId,
      metric_type: calibrationDraft.metricType,
      roi_version: calibrationDraft.roiVersion ?? undefined,
      manual_sample_size: calibrationForm.manualSampleSize ? Number(calibrationForm.manualSampleSize) : undefined,
      manual_reference_value: Number(calibrationForm.manualReferenceValue),
      system_value: calibrationForm.systemValue ? Number(calibrationForm.systemValue) : undefined,
      notes: calibrationForm.notes.trim() || undefined,
      status: "approved",
    }
    createCalibrationMutation.mutate(payload)
  }, [calibrationDraft, calibrationForm, createCalibrationMutation])

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
    governance?: MetricGovernance | null
  }[] = [
    {
      title: "Total de Visitantes",
      value: totalVisitors.toLocaleString("pt-BR"),
      change: periodLabel,
      target: null,
      status: { tone: "neutral", label: "Sem meta" },
      governance: visitorsGovernance,
    },
    {
      title: "Taxa de Conversão (média)",
      value: formatPercent(conversionRate),
      change: periodLabel,
      target: `Meta ${TARGETS.conversion}%`,
      status: conversionStatus,
      metricKey: "conversion",
      governance: conversionGovernance,
    },
    {
      title: "Fila Média (min)",
      value: queueAvgMin.toString(),
      change: periodLabel,
      target: `Meta ${TARGETS.queueMin} min`,
      status: queueStatus,
      metricKey: "queue",
      governance: queueGovernance,
    },
    {
      title: "Permanência Média (min)",
      value: dwellAvgMin.toString(),
      change: periodLabel,
      target: `Meta ${TARGETS.dwellMin} min`,
      status: dwellStatus,
      metricKey: "dwell",
      governance: dwellGovernance,
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                {metric.governance && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      governanceStyles[metric.governance.metric_status]
                    }`}
                  >
                    {metric.governance.label ?? metric.governance.metric_status}
                  </span>
                )}
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[metric.status.tone]}`}
                >
                  {metric.status.label}
                </span>
              </div>
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
            {metric.governance && (
              <p className="text-[11px] text-gray-400 mt-1">
                Método: {metric.governance.source_method}
              </p>
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Confiança Operacional de Visão</h3>
            <p className="text-sm text-gray-500 mt-1">
              Saúde por câmera e métrica para decidir onde recalibrar ROI, cobertura e operação.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {confidenceGeneratedAt ? `Atualizado em ${confidenceGeneratedAt}` : "Sem leitura recente"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Status da loja</div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
                  confidenceStyles[visionConfidence?.store_status ?? "recalibrar"]
                }`}
              >
                {confidenceLabels[visionConfidence?.store_status ?? "recalibrar"]}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">ROIs publicadas</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800">
              {confidenceSummary?.cameras_with_published_roi ?? 0}
              <span className="ml-1 text-sm font-normal text-gray-500">
                / {confidenceSummary?.cameras_total ?? 0}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Métricas prontas</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {confidenceSummary?.metrics_ready ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Recalibrar</div>
            <div className="mt-2 text-2xl font-semibold text-rose-700">
              {confidenceSummary?.metrics_recalibrate ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {loadingConfidence ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 xl:col-span-2">
              Carregando confiança operacional...
            </div>
          ) : (visionConfidence?.cameras ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 xl:col-span-2">
              Nenhuma câmera disponível para avaliação operacional.
            </div>
          ) : (
            (visionConfidence?.cameras ?? []).map((camera) => (
              <div key={camera.camera_id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-gray-800">{camera.camera_name}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {cameraRoleLabels[camera.camera_role] ?? camera.camera_role}
                      {" • "}
                      status câmera: {camera.camera_status}
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                      confidenceStyles[camera.store_status]
                    }`}
                  >
                    {confidenceLabels[camera.store_status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    ROI: {camera.roi_published ? `publicada${camera.roi_version ? ` v${camera.roi_version}` : ""}` : "pendente"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    Último heartbeat: {camera.last_seen_at ? new Date(camera.last_seen_at).toLocaleString("pt-BR") : "-"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {camera.metrics.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
                      Sem métricas atribuídas para esta câmera.
                    </div>
                  ) : (
                    camera.metrics.map((metric) => (
                      <div key={`${camera.camera_id}-${metric.metric_key}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{metric.metric_key}</div>
                            <div className="text-xs text-gray-500">{metric.event_type}</div>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                              confidenceStyles[metric.status]
                            }`}
                          >
                            {confidenceLabels[metric.status]}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Cobertura</div>
                            <div className="mt-1 font-semibold text-gray-800">{metric.coverage_score}/100</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Confiança</div>
                            <div className="mt-1 font-semibold text-gray-800">{metric.confidence_score}/100</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Eventos 24h</div>
                            <div className="mt-1 font-semibold text-gray-800">{metric.events_24h}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(metric.reasons.length === 0 ? ["Sem bloqueios operacionais"] : metric.reasons).map((reason) => (
                            <span
                              key={`${camera.camera_id}-${metric.metric_key}-${reason}`}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                            >
                              {confidenceReasonLabels[reason] ?? reason}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                          {metric.latest_calibration ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <span className="font-medium text-gray-700">
                                Ultima calibracao:{" "}
                                {metric.latest_calibration.approved_at
                                  ? new Date(metric.latest_calibration.approved_at).toLocaleString("pt-BR")
                                  : "sem aprovacao"}
                              </span>
                              <span>
                                erro:{" "}
                                {metric.latest_calibration.error_pct != null
                                  ? `${metric.latest_calibration.error_pct.toFixed(1)}%`
                                  : "-"}
                              </span>
                              <span>
                                amostra: {metric.latest_calibration.manual_sample_size ?? "-"}
                              </span>
                              <span>
                                ROI v{metric.latest_calibration.roi_version ?? metric.roi_version ?? "-"}
                              </span>
                              <span>
                                status: {metric.latest_calibration.status ?? "-"}
                              </span>
                              <span>
                                aprovador: {metric.latest_calibration.approved_by ?? "-"}
                              </span>
                            </div>
                          ) : (
                            <span>Nenhuma calibracao manual registrada para esta metrica.</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() =>
                              openCalibrationDraft(
                                camera.camera_id,
                                metric.metric_key as CreateStoreVisionCalibrationRunPayload["metric_type"],
                                metric.metric_key,
                                metric.roi_version,
                                metric.latest_calibration?.system_value ?? null
                              )
                            }
                            disabled={!canManageCalibration}
                          >
                            Registrar calibração manual
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Plano de Recalibração</h3>
            <p className="text-sm text-gray-500 mt-1">
              Fila priorizada de ações por câmera e métrica para tirar a loja de `recalibrar`.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
              Alta: {calibrationSummary?.high_priority ?? 0}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              Média: {calibrationSummary?.medium_priority ?? 0}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loadingCalibrationPlan ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              Gerando plano de recalibração...
            </div>
          ) : (calibrationPlan?.actions ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              Nenhuma ação pendente. A loja está sem bloqueios operacionais relevantes no momento.
            </div>
          ) : (
            (calibrationPlan?.actions ?? []).map((action) => (
              <div key={`${action.camera_id}-${action.metric_key}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          action.priority === "alta" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {action.priority === "alta" ? "Prioridade alta" : "Prioridade média"}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{action.title}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {action.camera_name} • {cameraRoleLabels[action.camera_role] ?? action.camera_role} • {action.metric_label}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{action.description}</p>
                    <p className="mt-1 text-sm text-gray-500">{action.playbook_hint}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm lg:min-w-64">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Cobertura</div>
                      <div className="mt-1 font-semibold text-gray-800">{action.coverage_score}/100</div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Confiança</div>
                      <div className="mt-1 font-semibold text-gray-800">{action.confidence_score}/100</div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Eventos 24h</div>
                      <div className="mt-1 font-semibold text-gray-800">{action.events_24h}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {action.reasons.map((reason) => (
                    <span
                      key={`${action.camera_id}-${action.metric_key}-${reason}`}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                    >
                      {confidenceReasonLabels[reason] ?? reason}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-gray-500">
                    Último evento: {action.last_event_at ? new Date(action.last_event_at).toLocaleString("pt-BR") : "sem evento recente"}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() =>
                        openCalibrationDraft(
                          action.camera_id,
                          action.metric_key as CreateStoreVisionCalibrationRunPayload["metric_type"],
                          action.metric_label,
                          action.roi_version,
                          null
                        )
                      }
                      disabled={!canManageCalibration}
                    >
                      Registrar calibração
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                      onClick={() => setAuditEventType(action.event_type)}
                    >
                      Filtrar auditoria por este evento
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Registrar Calibração Manual</h3>
            <p className="text-sm text-gray-500 mt-1">
              Validação assistida por câmera e métrica para aprovar a leitura operacional.
            </p>
          </div>
        </div>

        {!canManageCalibration ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Seu perfil está em modo leitura para esta loja. A aprovação manual de calibração exige papel `owner`, `admin` ou `manager`.
          </div>
        ) : null}

        {!calibrationDraft ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Selecione “Registrar calibração” em uma métrica ou ação do plano para preencher a validação.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800">{calibrationDraft.metricLabel}</div>
                <div className="text-xs text-gray-500">
                  câmera {calibrationDraft.cameraId}
                  {calibrationDraft.roiVersion ? ` • ROI v${calibrationDraft.roiVersion}` : ""}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                onClick={() => setCalibrationDraft(null)}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-gray-700">
                <span>Amostra manual</span>
                <input
                  type="number"
                  min="1"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                  value={calibrationForm.manualSampleSize}
                  onChange={(event) => setCalibrationForm((current) => ({ ...current, manualSampleSize: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-gray-700">
                <span>Valor manual de referência</span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                  value={calibrationForm.manualReferenceValue}
                  onChange={(event) => setCalibrationForm((current) => ({ ...current, manualReferenceValue: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-gray-700">
                <span>Valor do sistema</span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                  value={calibrationForm.systemValue}
                  onChange={(event) => setCalibrationForm((current) => ({ ...current, systemValue: event.target.value }))}
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
              <span>Notas da validação</span>
              <textarea
                rows={3}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                value={calibrationForm.notes}
                onChange={(event) => setCalibrationForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                onClick={() => setCalibrationDraft(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={submitCalibrationDraft}
                disabled={createCalibrationMutation.isPending || !canManageCalibration}
              >
                {createCalibrationMutation.isPending ? "Salvando..." : "Salvar calibração"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Histórico de Calibração</h3>
            <p className="text-sm text-gray-500 mt-1">
              Últimas validações manuais aprovadas por câmera e métrica.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="py-2 pr-4 text-left">Câmera</th>
                <th className="py-2 px-2 text-left">Métrica</th>
                <th className="py-2 px-2 text-left">ROI</th>
                <th className="py-2 px-2 text-left">Status</th>
                <th className="py-2 px-2 text-left">Erro</th>
                <th className="py-2 px-2 text-left">Amostra</th>
                <th className="py-2 px-2 text-left">Aprovador</th>
                <th className="py-2 pl-2 text-left">Aprovada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingCalibrationRuns ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400">
                    Carregando histórico de calibração...
                  </td>
                </tr>
              ) : (calibrationRuns?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400">
                    Nenhuma calibração manual registrada.
                  </td>
                </tr>
              ) : (
                (calibrationRuns?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 text-gray-700">{item.camera_id}</td>
                    <td className="py-3 px-2 text-gray-700">{item.metric_type}</td>
                    <td className="py-3 px-2 text-gray-700">{item.roi_version ? `v${item.roi_version}` : "-"}</td>
                    <td className="py-3 px-2 text-gray-700">{item.status}</td>
                    <td className="py-3 px-2 text-gray-700">
                      {item.error_pct != null ? `${item.error_pct.toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-3 px-2 text-gray-700">{item.manual_sample_size ?? "-"}</td>
                    <td className="py-3 px-2 text-gray-700">{item.approved_by ?? "-"}</td>
                    <td className="py-3 pl-2 text-gray-700">
                      {item.approved_at ? new Date(item.approved_at).toLocaleString("pt-BR") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Auditoria de Visão</h3>
            <p className="text-sm text-gray-500 mt-1">
              Inspeção operacional dos eventos atômicos persistidos por câmera, ROI e timestamp.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Filtrar auditoria por evento"
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2"
              value={auditEventType}
              onChange={(event) => setAuditEventType(event.target.value)}
            >
              {auditEventTypeOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {auditSummaryEntries.length === 0 ? (
            <span className="text-sm text-gray-400">Sem eventos no período selecionado.</span>
          ) : (
            auditSummaryEntries.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
              >
                <span>{key}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-sky-800">{value}</span>
              </span>
            ))
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="py-2 pr-4 text-left">Evento</th>
                <th className="py-2 px-2 text-left">Câmera</th>
                <th className="py-2 px-2 text-left">ROI</th>
                <th className="py-2 px-2 text-left">Valor</th>
                <th className="py-2 px-2 text-left">Duração</th>
                <th className="py-2 pl-2 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingAudit ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    Carregando auditoria...
                  </td>
                </tr>
              ) : (audit?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    Nenhum evento atômico encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                (audit?.items ?? []).map((item) => (
                  <tr key={item.receipt_id} className="align-top">
                    <td className="py-3 pr-4 text-gray-700">
                      <div className="font-medium">{item.event_type}</div>
                      <div className="text-xs text-gray-400">{item.metric_type ?? "-"}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">
                      <div>{item.camera_id ?? "-"}</div>
                      <div className="text-xs text-gray-400">{item.camera_role ?? "-"}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">
                      <div>{item.roi_entity_id ?? "-"}</div>
                      <div className="text-xs text-gray-400">{item.zone_id ?? "-"}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{formatAuditValue(item)}</td>
                    <td className="py-3 px-2 text-gray-700">
                      {item.duration_seconds != null ? `${item.duration_seconds}s` : "-"}
                    </td>
                    <td className="py-3 pl-2 text-gray-700">
                      {item.ts ? new Date(item.ts).toLocaleString("pt-BR") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics
