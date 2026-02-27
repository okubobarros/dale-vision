import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { meService, type ReportSummary } from "../../services/me"
import { storesService, type StoreSummary } from "../../services/stores"
import { trackJourneyEvent, trackJourneyEventOnce } from "../../services/journey"

const BAR_COLORS = ["#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"]

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

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

const severityClass = (severity?: string | null) => {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700"
    case "warning":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-blue-100 text-blue-700"
  }
}

const Report = () => {
  const { data: stores } = useQuery<StoreSummary[]>({
    queryKey: ["stores-summary"],
    queryFn: storesService.getStoresSummary,
    staleTime: 60000,
  })
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)

  const { data, isLoading, error } = useQuery<ReportSummary>({
    queryKey: ["report-summary", selectedStore],
    queryFn: () => meService.getReportSummary(selectedStore || null),
    staleTime: 60000,
    retry: 1,
  })

  useEffect(() => {
    void trackJourneyEventOnce("upgrade_viewed_report", "upgrade_viewed", {
      path: "/app/report",
      source: "report",
    })
  }, [])

  const handleExport = async (format: "csv" | "pdf") => {
    if (exporting) return
    setExporting(format)
    try {
      const blob = await meService.exportReport(format, {
        store_id: selectedStore || null,
        period: "7d",
      })
      downloadBlob(blob, `relatorio_trial.${format}`)
    } finally {
      setExporting(null)
    }
  }

  const hourBars = useMemo(() => {
    if (!data) return []
    return data.chart_footfall_by_hour.map((entry) => ({
      ...entry,
      label: `${String(entry.hour).padStart(2, "0")}:00`,
    }))
  }, [data])
  const maxFootfall = useMemo(() => {
    if (!hourBars.length) return 1
    return Math.max(...hourBars.map((entry) => entry.footfall), 1)
  }, [hourBars])
  const peakHour = useMemo(() => {
    if (!hourBars.length) return { label: "—", footfall: 0 }
    return hourBars.reduce((acc, cur) => (cur.footfall > acc.footfall ? cur : acc), hourBars[0])
  }, [hourBars])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Erro ao carregar relatório: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <div className="font-semibold">Trial expirou</div>
        <p className="text-sm mt-1">
          Seu trial terminou. Você ainda pode visualizar este relatório final e fazer
          upgrade para continuar.
        </p>
        <div className="mt-3">
          <Link
            to="/app/upgrade"
            onClick={() =>
              void trackJourneyEvent("upgrade_clicked", {
                source: "report_banner",
              })
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Fazer upgrade
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          O que aconteceu no seu trial
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Resumo executivo para decidir o próximo passo.
        </p>
      </div>

      {stores && stores.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="text-xs font-semibold text-gray-600">Loja</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="mt-2 w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todas as lojas</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Visitantes</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {data?.kpis?.total_visitors ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Permanência média</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {formatSeconds(data?.kpis?.avg_dwell_seconds)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Fila média</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {formatSeconds(data?.kpis?.avg_queue_seconds)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Conversão média</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {formatPercent(data?.kpis?.avg_conversion_rate)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <div className="text-sm font-semibold text-gray-800 mb-4">
          Visitantes por hora
        </div>
        <div className="relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
          <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="border-t border-dashed border-slate-200/70" />
            ))}
          </div>
        <div className="relative flex items-end gap-2 h-44 overflow-x-auto">
          {hourBars.length === 0 && (
            <div className="col-span-full text-sm text-gray-500">
              Sem dados de visitantes por hora.
            </div>
          )}
          {hourBars.map((entry, idx) => (
            <div key={entry.hour} className="flex flex-col items-center gap-2 min-w-[28px]">
              <div className="flex flex-col items-center gap-1">
                {entry.footfall > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500">
                    {entry.footfall}
                  </span>
                )}
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
          Pico horário: {peakHour.label} • {peakHour.footfall} visitantes
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800">Alertas (Top 5)</h2>
          </div>
          {data?.alert_counts_by_type?.length ? (
            <ul className="mt-4 space-y-3">
              {data.alert_counts_by_type.slice(0, 5).map((alert, idx) => (
                <li key={alert.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {idx + 1}. {alert.type}
                    </span>
                    <span className="text-gray-500">{alert.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((alert.count / Math.max(1, data.alert_counts_by_type[0].count)) * 100)
                        )}%`,
                        backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-3">Sem alertas registrados.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800">Insights automáticos</h2>
          {data?.insights?.length ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {data.insights.map((insight, idx) => (
                <div
                  key={`${insight}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <div>{insight}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-3">Nenhum insight gerado.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Exportar relatório</h2>
            <p className="text-sm text-gray-500">Disponível em CSV ou PDF.</p>
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              Continue com insights em tempo real
            </div>
            <div className="text-xs text-gray-500">
              Upgrade para liberar monitoramento e alertas ao vivo.
            </div>
          </div>
          <Link
            to="/app/upgrade"
            onClick={() =>
              void trackJourneyEvent("upgrade_clicked", {
                source: "report_sticky_cta",
              })
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Fazer upgrade agora
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Report
