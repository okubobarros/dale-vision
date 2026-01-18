// src/pages/Alerts/Alerts.tsx
import { useMemo, useState } from "react"
import { useAlertsEvents, useAlertLogs, useIgnoreEvent, useResolveEvent } from "../../queries/alerts.queries"
import { useQuery } from "@tanstack/react-query"
import { storesService } from "../../services/stores"

type FilterSeverity = "all" | "critical" | "warning" | "info"
type FilterStatus = "all" | "open" | "resolved" | "ignored"

const severityStyles: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  info: "border-blue-200 bg-blue-50 text-blue-700",
}

const severityLabel: Record<string, string> = {
  critical: "CRÍTICO",
  warning: "ATENÇÃO",
  info: "INFO",
}

function formatHHMM(iso?: string) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export default function Alerts() {
  const [query, setQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("open")
  const [storeId, setStoreId] = useState<string>("")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // lojas (pra filtro)
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  // eventos
  const eventsQuery = useAlertsEvents({
    store_id: storeId || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  })

  const events = eventsQuery.data || []

  // logs do evento selecionado
  const logsQuery = useAlertLogs({
    event_id: selectedEventId || undefined,
  })

  const resolveMut = useResolveEvent()
  const ignoreMut = useIgnoreEvent()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return events.filter((e) => {
      const matchQuery =
        !q ||
        (e.title || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.type || "").toLowerCase().includes(q) ||
        String(e.store_id || "").toLowerCase().includes(q)

      const matchSeverity =
        severityFilter === "all" ? true : e.severity === severityFilter

      return matchQuery && matchSeverity
    })
  }, [events, query, severityFilter])

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null
    return events.find((e) => String(e.id) === String(selectedEventId)) || null
  }, [events, selectedEventId])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Alertas</h1>
          <p className="text-gray-600 mt-1">
            Feed de eventos e recomendações acionáveis (dados reais)
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* store */}
          <div className="w-full sm:w-60">
            <label className="sr-only" htmlFor="alerts-store">
              Loja
            </label>
            <select
              id="alerts-store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              disabled={storesLoading}
            >
              <option value="">Todas as lojas</option>
              {stores.map((s: any) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* search */}
          <div className="relative w-full sm:w-72">
            <label htmlFor="alerts-search" className="sr-only">
              Buscar alertas
            </label>
            <input
              id="alerts-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, tipo, descrição..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400">
              ⌕
            </span>
          </div>

          {/* severity */}
          <div className="w-full sm:w-auto">
            <label htmlFor="alerts-filter-sev" className="sr-only">
              Filtrar por severidade
            </label>
            <select
              id="alerts-filter-sev"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2"
            >
              <option value="all">Severidade: todas</option>
              <option value="critical">Crítico</option>
              <option value="warning">Atenção</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* status */}
          <div className="w-full sm:w-auto">
            <label htmlFor="alerts-filter-status" className="sr-only">
              Filtrar por status
            </label>
            <select
              id="alerts-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2"
            >
              <option value="open">Status: abertos</option>
              <option value="resolved">Resolvidos</option>
              <option value="ignored">Ignorados</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* States */}
      {eventsQuery.isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          Carregando alertas...
        </div>
      )}

      {eventsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          Erro ao carregar alertas. Verifique o token e a rota da API.
        </div>
      )}

      {/* Lista */}
      {!eventsQuery.isLoading && !eventsQuery.isError && (
        <div className="space-y-4">
          {filtered.map((e) => {
            const sev = e.severity || "info"
            const hhmm = formatHHMM(e.occurred_at)

            return (
              <div
                key={String(e.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${
                          severityStyles[sev] || severityStyles.info
                        }`}
                      >
                        {severityLabel[sev] || "INFO"}
                      </span>

                      <span className="text-xs text-gray-500">
                        {hhmm} • store_id {String(e.store_id)}
                      </span>

                      {e.status !== "open" && (
                        <span className="text-xs text-gray-500">
                          • {String(e.status).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 font-bold text-gray-900 leading-snug">
                      {e.title || "Evento detectado"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {e.description || "-"}
                    </p>
                  </div>

                  <button
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Detalhes"
                    type="button"
                    onClick={() => setSelectedEventId(String(e.id))}
                  >
                    ⋯
                  </button>
                </div>

                {/* Ações */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    onClick={() => setSelectedEventId(String(e.id))}
                    type="button"
                  >
                    Ver detalhes
                  </button>

                  {e.status === "open" ? (
                    <button
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      onClick={() => resolveMut.mutate(String(e.id))}
                      disabled={resolveMut.isPending}
                      type="button"
                    >
                      {resolveMut.isPending ? "Resolvendo..." : "Resolver"}
                    </button>
                  ) : (
                    <button
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      onClick={() => ignoreMut.mutate(String(e.id))}
                      disabled={ignoreMut.isPending}
                      type="button"
                    >
                      Marcar ignorado
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              Nenhum alerta encontrado.
            </div>
          )}
        </div>
      )}

      {/* Drawer/Modal simples */}
      {selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-5">
              <div>
                <div className="text-xs text-gray-500">
                  Event ID: {selectedEventId}
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  {selectedEvent?.title || "Detalhes do alerta"}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {selectedEvent?.description || "-"}
                </div>
              </div>
              <button
                className="rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-50"
                onClick={() => setSelectedEventId(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Media */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-800">
                  Evidências (media)
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {!selectedEvent?.media?.length ? (
                    <span>Nenhuma mídia anexada ainda.</span>
                  ) : (
                    <ul className="list-disc pl-5">
                      {selectedEvent.media.map((m: any) => (
                        <li key={String(m.id)}>
                          <span className="font-medium">{m.media_type}:</span>{" "}
                          <a
                            className="text-blue-600 hover:underline"
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            abrir
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Logs */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-800">
                  Logs de notificação
                </div>

                {logsQuery.isLoading && (
                  <div className="mt-2 text-sm text-gray-600">Carregando logs...</div>
                )}

                {logsQuery.isError && (
                  <div className="mt-2 text-sm text-red-600">
                    Erro ao carregar logs.
                  </div>
                )}

                {!logsQuery.isLoading && !logsQuery.isError && (
                  <div className="mt-2 space-y-2">
                    {(logsQuery.data || []).length === 0 ? (
                      <div className="text-sm text-gray-600">
                        Nenhum log encontrado para este evento.
                      </div>
                    ) : (
                      (logsQuery.data || []).map((l: any) => (
                        <div
                          key={String(l.id)}
                          className="rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold">{l.channel}</span>{" "}
                              • {l.status} • {formatHHMM(l.sent_at)}
                            </div>
                            {l.destination && (
                              <div className="text-xs text-gray-500">
                                {l.destination}
                              </div>
                            )}
                          </div>
                          {l.error && (
                            <div className="mt-1 text-xs text-red-600">
                              {l.error}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">
              {selectedEvent?.status === "open" && (
                <button
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={() => {
                    resolveMut.mutate(String(selectedEvent.id))
                  }}
                  disabled={resolveMut.isPending}
                >
                  Resolver
                </button>
              )}

              <button
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setSelectedEventId(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
