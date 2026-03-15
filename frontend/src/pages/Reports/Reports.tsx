import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  meService,
  type ProductivityCoverage,
  type ReportImpact,
  type ReportSummary,
} from "../../services/me"
import {
  storesService,
  type NetworkDashboard,
  type NetworkVisionIngestionSummary,
  type Store,
  type StoreVisionIngestionSummary,
} from "../../services/stores"

type OperationalWindow = {
  startHour: number
  endHour: number
  source: "opening_hours" | "fallback_flow"
}

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  if (value < 60) return `${value}s`
  return `${Math.round(value / 60)}m`
}

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return `${Math.round(value * 1000) / 10}%`
}

const formatCurrencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

const parseOpeningHours = (value?: string | null): { startHour: number; endHour: number } | null => {
  if (!value) return null
  const match = value.match(/(\d{1,2})[:h]?(\d{2})?\s*[-–a]\s*(\d{1,2})[:h]?(\d{2})?/i)
  if (!match) return null
  const startHour = Number(match[1])
  const endHour = Number(match[3])
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) return null
  return { startHour, endHour }
}

const mergeWindows = (windows: Array<{ startHour: number; endHour: number }>) => {
  if (!windows.length) return null
  const normalized = windows.map((item) => ({
    startHour: item.startHour,
    endHour: item.endHour === 0 ? 24 : item.endHour,
  }))
  const startHour = Math.min(...normalized.map((item) => item.startHour))
  const endHour = Math.max(...normalized.map((item) => item.endHour))
  return { startHour, endHour: endHour > 23 ? 0 : endHour }
}

const hourInWindow = (hour: number, window: { startHour: number; endHour: number }) => {
  if (window.startHour === window.endHour) return true
  if (window.startHour < window.endHour) return hour >= window.startHour && hour < window.endHour
  return hour >= window.startHour || hour < window.endHour
}

const fallbackOperationalWindow = (
  bars: Array<{ hour: number; footfall: number }>
): OperationalWindow => {
  const activeHours = bars
    .filter((entry) => entry.footfall > 0)
    .map((entry) => entry.hour)
    .sort((a, b) => a - b)
  if (!activeHours.length) return { startHour: 8, endHour: 22, source: "fallback_flow" }
  const first = Math.max(0, activeHours[0] - 1)
  const last = Math.min(23, activeHours[activeHours.length - 1] + 1)
  return { startHour: first, endHour: last === 23 ? 0 : last, source: "fallback_flow" }
}

const formatWindowLabel = (window: { startHour: number; endHour: number }) =>
  `${String(window.startHour).padStart(2, "0")}:00 às ${String(window.endHour).padStart(2, "0")}:00`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const TrustBadge = ({ status }: { status?: string | null }) => {
  const normalized = String(status || "estimated").toLowerCase()
  const map: Record<string, { label: string; className: string }> = {
    official: { label: "Oficial", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    proxy: { label: "Proxy", className: "border-amber-200 bg-amber-50 text-amber-700" },
    estimated: { label: "Estimado", className: "border-slate-200 bg-slate-100 text-slate-600" },
    manual: { label: "Manual", className: "border-sky-200 bg-sky-50 text-sky-700" },
    derived: { label: "Derivado", className: "border-violet-200 bg-violet-50 text-violet-700" },
  }
  const item = map[normalized] || map.estimated
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.className}`}>
      {item.label}
    </span>
  )
}

const Reports = () => {
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [period, setPeriod] = useState<string>("30d")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)

  const rangeParams = useMemo(() => {
    if (period === "custom") {
      return { store_id: selectedStore || null, from: from || null, to: to || null }
    }
    return { store_id: selectedStore || null, period }
  }, [selectedStore, period, from, to])

  const storesQ = useQuery<Store[]>({
    queryKey: ["stores-full-report"],
    queryFn: storesService.getStores,
    staleTime: 60000,
    retry: false,
  })
  const summaryQ = useQuery<ReportSummary>({
    queryKey: ["reports-summary", rangeParams],
    queryFn: () => meService.getReportSummary(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: 1,
  })
  const impactQ = useQuery<ReportImpact>({
    queryKey: ["reports-impact", rangeParams],
    queryFn: () => meService.getReportImpact(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: 1,
  })
  const coverageQ = useQuery<ProductivityCoverage>({
    queryKey: ["reports-coverage", rangeParams],
    queryFn: () => meService.getProductivityCoverage(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: false,
  })
  const networkQ = useQuery<NetworkDashboard>({
    queryKey: ["reports-network-dashboard"],
    queryFn: storesService.getNetworkDashboard,
    staleTime: 60000,
    retry: false,
    enabled: !selectedStore,
  })
  const ingestionQ = useQuery<NetworkVisionIngestionSummary | StoreVisionIngestionSummary>({
    queryKey: ["reports-ingestion-summary", selectedStore || "all"],
    queryFn: () =>
      selectedStore
        ? storesService.getStoreVisionIngestionSummary(selectedStore, {
            event_source: "all",
            window_hours: 24,
          })
        : storesService.getNetworkVisionIngestionSummary({
            event_source: "all",
            window_hours: 24,
          }),
    staleTime: 60000,
    retry: false,
  })

  const stores = storesQ.data ?? []
  const summaryData = summaryQ.data
  const impactData = impactQ.data
  const coverageData = coverageQ.data
  const selectedStoreMeta = stores.find((store) => store.id === selectedStore) ?? null
  const ingestionOperational = ingestionQ.data?.operational_summary
  const ingestionPipelineStatus = ingestionOperational?.pipeline_status || "no_signal"
  const ingestionPipelineLabel =
    ingestionPipelineStatus === "healthy"
      ? "Pipeline saudável"
      : ingestionPipelineStatus === "stale"
      ? "Pipeline desatualizado"
      : "Sem sinal operacional"
  const ingestionPipelineClass =
    ingestionPipelineStatus === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : ingestionPipelineStatus === "stale"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-700"

  const openingWindow = useMemo(() => {
    if (!selectedStoreMeta) return null
    const windows = [
      parseOpeningHours(selectedStoreMeta.hours_weekdays),
      parseOpeningHours(selectedStoreMeta.hours_saturday),
      parseOpeningHours(selectedStoreMeta.hours_sunday_holiday),
    ].filter((value): value is { startHour: number; endHour: number } => Boolean(value))
    const merged = mergeWindows(windows)
    if (!merged) return null
    return { ...merged, source: "opening_hours" as const }
  }, [selectedStoreMeta])

  const hourBars = useMemo(() => {
    if (!summaryData) return []
    const baseBars = summaryData.chart_footfall_by_hour.map((entry) => ({
      ...entry,
      label: `${String(entry.hour).padStart(2, "0")}:00`,
    }))
    const operationalWindow = openingWindow || fallbackOperationalWindow(baseBars)
    return baseBars.filter((entry) => hourInWindow(entry.hour, operationalWindow))
  }, [summaryData, openingWindow])

  const operationalWindow = useMemo(() => {
    if (openingWindow) return openingWindow
    return fallbackOperationalWindow(summaryData?.chart_footfall_by_hour ?? [])
  }, [summaryData?.chart_footfall_by_hour, openingWindow])

  const revenueAtRiskToday = useMemo(() => {
    if (!impactData?.impact) return 0
    const periodCost = (impactData.impact.cost_idle || 0) + (impactData.impact.cost_queue || 0)
    const fromDate = impactData.from ? new Date(impactData.from) : null
    const toDate = impactData.to ? new Date(impactData.to) : null
    const days =
      fromDate && toDate && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())
        ? Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 30
    return periodCost > 0 ? periodCost / days : (impactData.impact.potential_monthly_estimated || 0) / 30
  }, [impactData])

  const consolidatedScore = useMemo(() => {
    const queueSeconds = summaryData?.kpis?.avg_queue_seconds || 0
    const conversionRate = (summaryData?.kpis?.avg_conversion_rate || 0) * 100
    const confidence = coverageData?.confidence_governance?.score || 0
    let score = 82
    score -= Math.min(24, queueSeconds / 9)
    score += Math.min(10, Math.max(-10, (conversionRate - 14) * 1.8))
    score += (confidence - 60) / 6
    return Math.round(clamp(score, 0, 100))
  }, [coverageData?.confidence_governance?.score, summaryData?.kpis?.avg_conversion_rate, summaryData?.kpis?.avg_queue_seconds])

  const scoreTrendPoints = useMemo(() => {
    const series = summaryData?.chart_footfall_by_day ?? []
    if (!series.length) return "0,22 30,18 60,17 90,16 120,15"
    const maxValue = Math.max(...series.map((item) => item.footfall), 1)
    return series
      .slice(-7)
      .map((item, idx, arr) => {
        const x = arr.length === 1 ? 0 : Math.round((idx / (arr.length - 1)) * 120)
        const y = Math.round(22 - (item.footfall / maxValue) * 16)
        return `${x},${y}`
      })
      .join(" ")
  }, [summaryData?.chart_footfall_by_day])

  const copilotSummary = useMemo(() => {
    const risk = coverageData?.summary?.worst_window
    if (risk?.hour_label) {
      return `Rede estável, mas a janela ${risk.hour_label} concentra lacuna de cobertura. Recomendo realocar equipe para reduzir abandono de fila.`
    }
    return "Rede sob controle. Recomendo validar apenas as lojas com pior conversão relativa nesta janela."
  }, [coverageData?.summary?.worst_window])

  const triggerCopilotAction = () => {
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", {
        detail: {
          prompt:
            "Aprovar intervenção imediata nas lojas com maior risco de fila e gerar plano de ação por gerente.",
        },
      })
    )
  }

  const ranking = useMemo(() => {
    const items = (networkQ.data?.stores ?? []).filter((store) => typeof store.conversion === "number")
    const sorted = [...items].sort((a, b) => (b.conversion || 0) - (a.conversion || 0))
    return { top: sorted.slice(0, 3), bottom: sorted.slice(-3).reverse() }
  }, [networkQ.data?.stores])

  const interventionCards = useMemo(() => {
    const storesList = networkQ.data?.stores ?? []
    if (!storesList.length) return []
    const totalAlerts = storesList.reduce((acc, store) => acc + (store.alerts || 0), 0)
    const baseline = Math.max(1, totalAlerts)
    const sortedByAttention = [...storesList].sort((a, b) => {
      const scoreA = (a.alerts || 0) * 2 + Math.max(0, 12 - (a.conversion || 0))
      const scoreB = (b.alerts || 0) * 2 + Math.max(0, 12 - (b.conversion || 0))
      return scoreB - scoreA
    })
    return sortedByAttention.slice(0, 4).map((store) => {
      const share = (store.alerts || 0) / baseline
      const riskValue = revenueAtRiskToday * (share > 0 ? share : 0.15)
      return {
        id: store.id,
        name: store.name,
        problem:
          (store.alerts || 0) > 0
            ? `Pico de fila e alertas operacionais (${store.alerts})`
            : "Conversão abaixo da média da rede",
        riskValue,
      }
    })
  }, [networkQ.data?.stores, revenueAtRiskToday])

  const handleDelegateStoreIntervention = (item: {
    id: string
    name: string
    problem: string
    riskValue: number
  }) => {
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", {
        detail: {
          prompt: `Delegar intervenção operacional para a loja ${item.name}. Problema: ${item.problem}. Impacto estimado: ${formatCurrencyBRL(
            item.riskValue
          )} em risco hoje. Gere mensagem objetiva para gerente com ação imediata e checklist de execução.`,
        },
      })
    )
    toast.success(`Delegação preparada no Copiloto para ${item.name}.`)
  }

  const handleExport = async (format: "csv" | "pdf") => {
    if (exporting) return
    setExporting(format)
    try {
      const blob = await meService.exportReport(format, rangeParams)
      const filename = `relatorio_${period === "custom" ? "custom" : period}.${format}`
      downloadBlob(blob, filename)
    } finally {
      setExporting(null)
    }
  }

  if (summaryQ.isLoading || impactQ.isLoading || coverageQ.isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 rounded bg-slate-200 animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (summaryQ.error || impactQ.error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
          Erro ao carregar cockpit executivo.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">CEO Decision Cockpit</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão por exceção, dollarization da dor e recomendação prescritiva.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-900 text-white">
            Visão Executiva
          </button>
          <button className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            Relatórios Detalhados
          </button>
          <button className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            Saúde da Infraestrutura
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Score Consolidado</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{consolidatedScore}/100</p>
            <svg viewBox="0 0 120 24" className="mt-3 h-6 w-full">
              <polyline
                fill="none"
                stroke="#334155"
                strokeWidth="2"
                points={scoreTrendPoints}
              />
            </svg>
            <p className="text-[11px] text-slate-500 mt-2">Tendência dos últimos dias</p>
          </article>

          <article className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Receita em Risco Hoje</p>
            <p className="text-3xl font-semibold text-rose-600 mt-2">{formatCurrencyBRL(revenueAtRiskToday)}</p>
            <p className="text-[11px] text-slate-500 mt-2">Perda potencial por fila e ociosidade (estimada)</p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Conversão Média</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {formatPercent(summaryData?.kpis?.avg_conversion_rate)}
            </p>
            <p className="text-[11px] text-slate-500 mt-2">vs meta de 15%</p>
          </article>
        </div>

        <div className="xl:col-span-2 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.1em] text-indigo-200">Copiloto Chief of Staff</p>
          <p className="text-sm leading-relaxed text-slate-100 mt-2">{copilotSummary}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-indigo-200">
              Janela operacional: {formatWindowLabel(operationalWindow)}
            </span>
            <button
              type="button"
              onClick={triggerCopilotAction}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              Aprovar Intervenção
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Loja</label>
            <select
              value={selectedStore}
              onChange={(event) => setSelectedStore(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Toda a rede</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Período</label>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Customizado</option>
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
            <p className="text-xs text-slate-500">Janela operacional aplicada</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{formatWindowLabel(operationalWindow)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {operationalWindow.source === "opening_hours"
                ? "Baseada em horário cadastrado da loja."
                : "Fallback inteligente por comportamento real de fluxo."}
            </p>
          </div>
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Data inicial</label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Data final</label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Onde agir agora</h2>
            <span className="text-xs text-slate-500">Gestão por exceção</span>
          </div>
          {!interventionCards.length ? (
            <p className="text-sm text-slate-500 mt-3">Sem lojas críticas para intervenção imediata.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {interventionCards.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.problem}</p>
                  <p className="text-sm font-semibold text-rose-600 mt-2">
                    {formatCurrencyBRL(item.riskValue)} em risco hoje
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelegateStoreIntervention(item)}
                    className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Delegar ao Gerente
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Ranking de Eficiência</h2>
          {selectedStore ? (
            <p className="text-sm text-slate-500 mt-3">
              Limpe o filtro de loja para comparar top 3 e bottom 3 da rede.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Top 3</p>
                <ul className="mt-2 space-y-2">
                  {ranking.top.map((store) => (
                    <li key={store.id} className="text-sm text-slate-800">
                      {store.name} · {formatPercent((store.conversion || 0) / 100)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Bottom 3</p>
                <ul className="mt-2 space-y-2">
                  {ranking.bottom.map((store) => (
                    <li key={store.id} className="text-sm text-slate-800">
                      {store.name} · {formatPercent((store.conversion || 0) / 100)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Insights automáticos</h2>
          <ul className="mt-3 space-y-2">
            {(summaryData?.insights ?? []).slice(0, 4).map((insight, idx) => (
              <li key={`${insight}-${idx}`} className="text-sm text-slate-700">
                • {insight}
              </li>
            ))}
          </ul>
          {!summaryData?.insights?.length && (
            <p className="text-sm text-slate-500 mt-3">Sem novos insights no período.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Evidências e aderência operacional</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ingestionPipelineClass}`}>
              {ingestionPipelineLabel}
            </span>
            <span className="text-[11px] text-slate-500">
              {ingestionOperational?.events_total ?? 0} eventos/24h
            </span>
            <span className="text-[11px] text-slate-500">
              Materialização: {ingestionOperational?.operational_window?.status || "no_data"} · cobertura{" "}
              {ingestionOperational?.operational_window?.coverage_rate ?? 0}%
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {coverageData?.method?.label} · v{coverageData?.method?.version} · confiança{" "}
            {coverageData?.confidence_governance?.score ?? 0}/100
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Status da governança: {coverageData?.confidence_governance?.status || "insuficiente"}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Fila média</span>
                <TrustBadge status={summaryData?.confidence_governance?.source_flags?.avg_queue_seconds} />
              </div>
              <span className="font-semibold text-slate-900">{formatSeconds(summaryData?.kpis?.avg_queue_seconds)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Lacunas críticas</span>
                <TrustBadge status={coverageData?.confidence_governance?.source_flags?.coverage_gap} />
              </div>
              <span className="font-semibold text-rose-600">
                {coverageData?.summary?.critical_windows ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Melhor janela</span>
                <TrustBadge status={coverageData?.confidence_governance?.source_flags?.staff_detected_est} />
              </div>
              <span className="font-semibold text-emerald-600">
                {coverageData?.summary?.best_window?.hour_label || "—"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Planejamento: {coverageData?.summary?.planned_source_mode || "proxy"}.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Evolução do fluxo na janela operacional</h2>
        <div className="mt-3 relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
          <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="border-t border-dashed border-slate-200/70" />
            ))}
          </div>
          <div className="relative flex items-end gap-2 h-40 overflow-x-auto">
            {hourBars.length === 0 && <div className="text-sm text-slate-500">Sem dados de fluxo por hora.</div>}
            {hourBars.map((entry) => {
              const maxFootfall = Math.max(...hourBars.map((item) => item.footfall), 1)
              return (
                <div key={entry.hour} className="flex flex-col items-center gap-2 min-w-[28px]">
                  <div
                    className="w-full rounded bg-slate-700/80"
                    style={{ height: `${Math.max(10, Math.round((entry.footfall / maxFootfall) * 120))}px` }}
                    title={`${entry.label} · ${entry.footfall}`}
                  />
                  <span className="text-[10px] text-slate-500">{entry.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Exportação</h2>
            <p className="text-xs text-slate-500">Compartilhamento executivo.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={exporting !== null}
            >
              {exporting === "csv" ? "Exportando..." : "Exportar CSV"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? "Exportando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Reports
