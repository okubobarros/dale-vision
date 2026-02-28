import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { storesService, type StoreOverview } from "../../services/stores"

const ONLINE_MAX_AGE_SEC = 120

const isRecent = (iso?: string | null, maxAgeSec = ONLINE_MAX_AGE_SEC) => {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const diffSec = (Date.now() - date.getTime()) / 1000
  return diffSec >= 0 && diffSec <= maxAgeSec
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

const severityColor = (severity?: string | null) => {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700"
    case "warning":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-blue-100 text-blue-700"
  }
}

const statusLabel = (status?: string | null) =>
  status === "active"
    ? "Ativa"
    : status === "trial"
    ? "Trial"
    : status === "blocked"
    ? "Bloqueada"
    : "Inativa"

const statusClass = (status?: string | null) =>
  status === "active"
    ? "bg-green-100 text-green-800"
    : status === "trial"
    ? "bg-yellow-100 text-yellow-800"
    : status === "blocked"
    ? "bg-red-100 text-red-800"
    : "bg-gray-100 text-gray-800"

const StoreDetails = () => {
  const { id } = useParams()

  const {
    data,
    isLoading,
    error,
  } = useQuery<StoreOverview>({
    queryKey: ["store-overview", id],
    queryFn: () => storesService.getStoreOverview(String(id)),
    enabled: Boolean(id),
  })

  const metrics = data?.metrics_summary?.totals
  const cameras = useMemo(() => data?.cameras ?? [], [data?.cameras])
  const employees = data?.employees ?? []
  const alerts = data?.last_alerts ?? []

  const camerasOnline = useMemo(
    () =>
      cameras.filter((cam) =>
        ["online", "degraded"].includes(String(cam.status || "").toLowerCase())
      ).length,
    [cameras]
  )
  const camerasOffline = Math.max(cameras.length - camerasOnline, 0)

  const lastSeenAt = data?.edge_health?.last_seen_at || null
  const edgeOnline = isRecent(lastSeenAt)
  const edgeStatusLabel = edgeOnline ? "Online" : "Offline"
  const edgeStatusClass = edgeOnline
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-800"

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
          Erro ao carregar detalhes: {(error as Error).message}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg">
          Nenhum dado disponível para esta loja.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {data.store.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {data.store.city || "Cidade"}{data.store.state ? `, ${data.store.state}` : ""}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${statusClass(
              data.store.status
            )}`}
          >
            {statusLabel(data.store.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Visitantes (7d)</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {metrics?.total_visitors ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Permanência média</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {formatSeconds(metrics?.avg_dwell_seconds)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Fila média</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {formatSeconds(metrics?.avg_queue_seconds)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Conversão média</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            {formatPercent(metrics?.avg_conversion_rate)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Operação agora</h2>
            <p className="text-sm text-gray-600">Saúde do Edge e câmeras</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${edgeStatusClass}`}>
            Edge {edgeStatusLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Câmeras online/offline</div>
            <div className="text-lg font-semibold text-gray-800 mt-2">
              {camerasOnline} online · {camerasOffline} offline
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total: {cameras.length}
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Último sinal do Edge</div>
            <div className="text-lg font-semibold text-gray-800 mt-2">
              {lastSeenAt
                ? new Date(lastSeenAt).toLocaleString("pt-BR")
                : "Nunca"}
            </div>
            {data.edge_health?.last_error && (
              <div className="text-xs text-red-600 mt-2">
                Erro: {data.edge_health.last_error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800">Funcionários</h2>
          {employees.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">Nenhum funcionário ativo.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {employees.map((employee) => (
                <li
                  key={employee.id}
                  className="flex items-center justify-between text-sm text-gray-700"
                >
                  <span className="font-medium">{employee.full_name}</span>
                  <span className="text-gray-500">{employee.role || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800">Alertas recentes</h2>
            <Link
              to={`/app/alerts?store_id=${data.store.id}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todos
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">Sem alertas recentes.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      {alert.title || "Alerta"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold ${severityColor(
                        alert.severity
                      )}`}
                    >
                      {(alert.severity || "info").toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {alert.occurred_at
                      ? new Date(alert.occurred_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default StoreDetails
