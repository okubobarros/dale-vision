import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  meService,
  type ReportSummary,
  type ReportImpact,
  type ProductivityCoverage,
} from "../../services/me"
import { storesService, type Store } from "../../services/stores"

const BAR_COLORS = ["#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"]
const PRO_PLANS = new Set(["pro", "growth", "enterprise", "paid"])

type OperationalWindow = {
  startHour: number
  endHour: number
  source: "opening_hours" | "fallback_flow"
}

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  if (value < 60) return `${value}s`
  const minutes = Math.round(value / 60)
  return `${minutes}m`
}

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return `${Math.round(value * 100)}%`
}

const formatCurrencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
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

const mergeWindows = (
  windows: Array<{ startHour: number; endHour: number }>
): { startHour: number; endHour: number } | null => {
  if (!windows.length) return null
  const normalized = windows.map((window) => ({
    startHour: window.startHour,
    endHour: window.endHour === 0 ? 24 : window.endHour,
  }))
  const startHour = Math.min(...normalized.map((window) => window.startHour))
  const endHour = Math.max(...normalized.map((window) => window.endHour))
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null
  return { startHour, endHour: endHour > 23 ? 0 : endHour }
}

const hourInWindow = (hour: number, window: { startHour: number; endHour: number }) => {
  if (window.startHour === window.endHour) return true
  if (window.startHour < window.endHour) {
    return hour >= window.startHour && hour < window.endHour
  }
  return hour >= window.startHour || hour < window.endHour
}

const fallbackOperationalWindow = (
  bars: Array<{ hour: number; footfall: number }>
): OperationalWindow => {
  const activeHours = bars
    .filter((entry) => entry.footfall > 0)
    .map((entry) => entry.hour)
    .sort((a, b) => a - b)
  if (activeHours.length === 0) {
    return { startHour: 8, endHour: 22, source: "fallback_flow" }
  }
  const first = Math.max(0, activeHours[0] - 1)
  const last = Math.min(23, activeHours[activeHours.length - 1] + 1)
  return { startHour: first, endHour: last === 23 ? 0 : last, source: "fallback_flow" }
}

const formatWindowLabel = (window: { startHour: number; endHour: number }) =>
  `${String(window.startHour).padStart(2, "0")}:00 às ${String(window.endHour).padStart(2, "0")}:00`

const Reports = () => {
  const { data: storesFull = [] } = useQuery<Store[]>({
    queryKey: ["stores-full-report"],
    queryFn: storesService.getStores,
    staleTime: 60000,
    retry: false,
  })

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
    retry: 1,
  })

  const selectedStoreMeta = useMemo(
    () => storesFull.find((store) => store.id === selectedStore) ?? null,
    [storesFull, selectedStore]
  )

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

  const summaryData = summaryQ.data
  const impactData = impactQ.data
  const coverageData = coverageQ.data

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

  const maxFootfall = useMemo(() => {
    if (!hourBars.length) return 1
    return Math.max(...hourBars.map((entry) => entry.footfall), 1)
  }, [hourBars])

  const peakHour = useMemo(() => {
    if (!hourBars.length) return { label: "—", footfall: 0 }
    return hourBars.reduce((acc, cur) => (cur.footfall > acc.footfall ? cur : acc), hourBars[0])
  }, [hourBars])

  const mainGargalo = useMemo(() => {
    const worst = coverageData?.summary?.worst_window
    if (worst && worst.hour_label) {
      return `Cobertura insuficiente às ${worst.hour_label} com lacuna de ${worst.coverage_gap} pessoa(s).`
    }
    if ((summaryData?.kpis?.avg_queue_seconds || 0) >= 120) {
      return "Fila média elevada no período, com risco de perda de venda no atendimento."
    }
    return "Sem gargalo crítico isolado; manter monitoramento contínuo."
  }, [coverageData?.summary?.worst_window, summaryData?.kpis?.avg_queue_seconds])

  const mainOpportunity = useMemo(() => {
    const best = coverageData?.summary?.best_window
    if (best && best.hour_label) {
      return `Melhor aderência às ${best.hour_label}; replicar padrão de cobertura em janelas de maior fluxo.`
    }
    if ((summaryData?.kpis?.avg_dwell_seconds || 0) >= 300) {
      return "Permanência elevada indica oportunidade de melhorar conversão com abordagem ativa."
    }
    return "Oportunidade principal: aumentar consistência entre fluxo e cobertura da equipe."
  }, [coverageData?.summary?.best_window, summaryData?.kpis?.avg_dwell_seconds])

  const executiveRecommendation = useMemo(() => {
    const worst = coverageData?.summary?.worst_window
    const peak = coverageData?.summary?.peak_flow_window
    if (worst?.hour_label && peak?.hour_label) {
      return `Reforçar cobertura entre ${worst.hour_label} e ${peak.hour_label} para reduzir fila e capturar demanda do pico.`
    }
    if ((coverageData?.summary?.critical_windows || 0) > 0) {
      return "Priorizar ajuste por exceção nas janelas críticas identificadas."
    }
    return "Manter escala atual e usar evidências para calibrar próximos turnos."
  }, [coverageData?.summary?.critical_windows, coverageData?.summary?.peak_flow_window, coverageData?.summary?.worst_window])

  const currentPlan = (selectedStoreMeta?.plan || "trial").toLowerCase()
  const isPro = PRO_PLANS.has(currentPlan)
  const showProBlock = !isPro

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
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (summaryQ.error || impactQ.error || coverageQ.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Erro ao carregar relatório executivo.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Relatórios Executivos</h1>
        <p className="text-sm text-gray-600 mt-1">
          Leitura de gargalos, oportunidades e impacto operacional com prova de valor da DaleVision.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600">Loja</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todas as lojas</option>
            {storesFull.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Período</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="custom">Customizado</option>
          </select>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Janela operacional aplicada</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{formatWindowLabel(operationalWindow)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {operationalWindow.source === "opening_hours"
              ? "Baseada no horário de operação cadastrado."
              : "Fallback inteligente por padrão real de fluxo."}
          </p>
        </div>
      </div>

      {period === "custom" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">Data inicial</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Data final</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-800">Resumo executivo do período</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Visitantes</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summaryData?.kpis?.total_visitors ?? 0}</p>
          </article>
          <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Fila média</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatSeconds(summaryData?.kpis?.avg_queue_seconds)}</p>
          </article>
          <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Conversão média</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(summaryData?.kpis?.avg_conversion_rate)}</p>
          </article>
          <article className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Valor recuperável estimado</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {formatCurrencyBRL(impactData?.impact?.potential_monthly_estimated)}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1">Prova de valor potencial em 30 dias</p>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-red-600 font-semibold">Principal gargalo observado</p>
          <p className="mt-2 text-sm text-slate-800">{mainGargalo}</p>
        </article>
        <article className="bg-white rounded-xl border border-emerald-100 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-emerald-700 font-semibold">Principal oportunidade observada</p>
          <p className="mt-2 text-sm text-slate-800">{mainOpportunity}</p>
        </article>
        <article className="bg-white rounded-xl border border-amber-100 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-amber-700 font-semibold">Janela de maior risco</p>
          <p className="mt-2 text-sm text-slate-800">
            {coverageData?.summary?.worst_window?.hour_label
              ? `${coverageData.summary.worst_window.hour_label} (lacuna ${coverageData.summary.worst_window.coverage_gap})`
              : "Sem janela crítica identificada."}
          </p>
        </article>
        <article className="bg-white rounded-xl border border-blue-100 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-blue-700 font-semibold">Janela de melhor desempenho</p>
          <p className="mt-2 text-sm text-slate-800">
            {coverageData?.summary?.best_window?.hour_label
              ? `${coverageData.summary.best_window.hour_label} (cobertura adequada)`
              : "Sem referência suficiente no período."}
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800">Alertas e gargalos relevantes</h2>
          {summaryData?.alert_counts_by_type?.length ? (
            <ul className="mt-4 space-y-3">
              {summaryData.alert_counts_by_type.slice(0, 5).map((alert, idx) => (
                <li key={alert.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{idx + 1}. {alert.type}</span>
                    <span className="text-gray-500">{alert.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((alert.count / Math.max(1, summaryData.alert_counts_by_type[0].count)) * 100))}%`,
                        backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-3">Sem alertas relevantes no período.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800">Insight automático do Copiloto</h2>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm text-blue-900">{executiveRecommendation}</p>
          </div>
          {summaryData?.insights?.length ? (
            <ul className="mt-3 space-y-2">
              {summaryData.insights.slice(0, 4).map((insight, idx) => (
                <li key={`${insight}-${idx}`} className="text-sm text-slate-700">
                  • {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-3">Sem insights automáticos adicionais.</p>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-800">Evolução do fluxo na janela operacional</h2>
        <div className="mt-4 relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
          <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="border-t border-dashed border-slate-200/70" />
            ))}
          </div>
          <div className="relative flex items-end gap-2 h-44 overflow-x-auto">
            {hourBars.length === 0 && <div className="text-sm text-gray-500">Sem dados de fluxo por hora.</div>}
            {hourBars.map((entry, idx) => (
              <div key={entry.hour} className="flex flex-col items-center gap-2 min-w-[28px]">
                <div className="flex flex-col items-center gap-1">
                  {entry.footfall > 0 && <span className="text-[10px] font-semibold text-slate-500">{entry.footfall}</span>}
                  <div
                    className={`w-full rounded-md shadow-sm ${
                      entry.footfall === peakHour.footfall && peakHour.footfall > 0
                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white"
                        : ""
                    }`}
                    style={{
                      height: `${Math.max(10, Math.round((entry.footfall / maxFootfall) * 140))}px`,
                      backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                    }}
                    title={`${entry.label} · ${entry.footfall}`}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{entry.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Pico de fluxo: {peakHour.label} • {peakHour.footfall} visitantes · Janela {formatWindowLabel(operationalWindow)}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-800">Evidências de aderência operacional</h2>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          Método: {coverageData?.method?.label} · versão {coverageData?.method?.version} · confiança {coverageData?.confidence_governance?.score}/100
          {coverageData?.summary?.planned_source_mode && (
            <span> · planejamento: {coverageData.summary.planned_source_mode}</span>
          )}
        </div>
        <div className="mt-3 rounded-lg border border-slate-100">
          <div className="grid grid-cols-[72px_repeat(4,minmax(0,1fr))] bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
            <span>Hora</span>
            <span>Fluxo</span>
            <span>Planejado*</span>
            <span>Detectado*</span>
            <span>Lacuna</span>
          </div>
          {coverageData?.windows?.length ? (
            <div className="divide-y divide-slate-100">
              {coverageData.windows.slice(-8).map((entry) => (
                <div key={`${entry.ts_bucket}-${entry.hour_label}`} className={`grid grid-cols-[72px_repeat(4,minmax(0,1fr))] items-center px-3 py-2 text-sm ${entry.coverage_gap > 0 ? "bg-red-50/40" : "bg-white"}`}>
                  <span className="font-medium text-slate-700">{entry.hour_label || "—"}</span>
                  <span className="text-slate-700">{entry.footfall}</span>
                  <span className="text-slate-700">{entry.staff_planned_ref}</span>
                  <span className="text-slate-700">{entry.staff_detected_est}</span>
                  <span className={`font-semibold ${entry.coverage_gap >= 2 ? "text-red-700" : entry.coverage_gap === 1 ? "text-amber-700" : "text-emerald-700"}`}>
                    {entry.coverage_gap === 0 ? "OK" : `-${entry.coverage_gap}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500">Sem dados de cobertura para o período selecionado.</div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          *Escala planejada em modo de referência (proxy) e presença detectada em modo estimado nesta fase.
        </p>
      </section>

      {showProBlock && (
        <section className="bg-white rounded-xl border border-indigo-100 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-indigo-900">Recursos Pro para múltiplas lojas</h2>
              <p className="text-sm text-indigo-800 mt-1">
                Compare unidades, ranqueie recuperação potencial e faça benchmark interno da rede.
              </p>
            </div>
            <a
              href="/app/upgrade"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Desbloquear plano Pro
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              "Comparação entre lojas",
              "Ranking de recuperação de receita",
              "Benchmark interno da rede",
            ].map((feature) => (
              <article key={feature} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-sm font-semibold text-indigo-900">{feature}</p>
                <p className="text-xs text-indigo-700 mt-1">Disponível no plano Pro para gestão multiunidade.</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-gray-800">Exportação</h2>
            <p className="text-xs text-gray-500">Disponível para compartilhamento executivo.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              disabled={exporting !== null}
            >
              {exporting === "csv" ? "Exportando..." : "Exportar CSV"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
