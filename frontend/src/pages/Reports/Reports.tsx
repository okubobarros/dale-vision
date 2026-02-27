import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { meService, type ReportSummary } from "../../services/me"
import { storesService, type StoreSummary } from "../../services/stores"

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

const Reports = () => {
  const { data: stores } = useQuery<StoreSummary[]>({
    queryKey: ["stores-summary"],
    queryFn: storesService.getStoresSummary,
    staleTime: 60000,
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

  const { data, isLoading, error } = useQuery<ReportSummary>({
    queryKey: ["reports-summary", rangeParams],
    queryFn: () => meService.getReportSummary(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: 1,
  })

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-sm text-gray-600 mt-1">
          Relatório contínuo com período customizado e exportação.
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
            {stores?.map((store) => (
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
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => void handleExport("csv")}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={exporting !== null}
          >
            {exporting === "csv" ? "Exportando..." : "Exportar CSV"}
          </button>
          <button
            type="button"
            onClick={() => void handleExport("pdf")}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? "Exportando..." : "Exportar PDF"}
          </button>
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
          <h2 className="text-lg font-bold text-gray-800">Alertas (Top 5)</h2>
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
    </div>
  )
}

export default Reports
