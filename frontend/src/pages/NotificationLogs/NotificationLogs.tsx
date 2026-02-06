import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { storesService, type Store } from "../../services/stores"
import { alertsService, type NotificationLog } from "../../services/alerts"

function formatDateBR(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-BR")
}

export default function NotificationLogs() {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [eventIdFilter, setEventIdFilter] = useState<string>("")

  // Stores
  const {
    data: stores,
    isLoading: storesLoading,
    error: storesError,
  } = useQuery({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  useEffect(() => {
    if (!selectedStoreId && stores && stores.length > 0) {
      setSelectedStoreId(String(stores[0].id))
    }
  }, [stores, selectedStoreId])

  const selectedStore = useMemo(() => {
    if (!stores || !selectedStoreId) return null
    return stores.find((s: Store) => String(s.id) === String(selectedStoreId)) ?? null
  }, [stores, selectedStoreId])

  const logsQueryKey = useMemo(
    () => [
      "notificationLogs",
      { store_id: selectedStoreId || "", event_id: eventIdFilter || "" },
    ],
    [selectedStoreId, eventIdFilter]
  )

  const {
    data: logs,
    isLoading: logsLoading,
    error: logsError,
    refetch,
  } = useQuery({
    queryKey: logsQueryKey,
    enabled: !!selectedStoreId,
    queryFn: async (): Promise<NotificationLog[]> => {
      return await alertsService.listLogs({
        store_id: selectedStoreId,
        event_id: eventIdFilter ? eventIdFilter.trim() : undefined,
      })
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logs de Notificação</h2>
          <p className="text-sm text-gray-600">
            Auditoria de envios (dashboard/email/whatsapp) por loja e evento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
          disabled={!selectedStoreId}
          aria-label="Atualizar logs"
          title="Atualizar logs"
        >
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Store */}
          <div>
            <label htmlFor="storeLogsSelect" className="block text-sm font-medium text-gray-900">
              Loja
            </label>

            {storesError ? (
              <div className="mt-2 text-sm text-red-600">Erro ao carregar lojas.</div>
            ) : (
              <select
                id="storeLogsSelect"
                name="storeLogsSelect"
                className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 bg-white"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                disabled={storesLoading}
                aria-label="Selecionar loja para logs"
                title="Selecionar loja"
              >
                {(stores ?? []).map((s: Store) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name ?? `Loja ${s.id}`}
                  </option>
                ))}
              </select>
            )}

            {selectedStore && (
              <div className="mt-1 text-xs text-gray-500">
                Selecionada:{" "}
                <span className="font-medium text-gray-700">{selectedStore.name}</span>
              </div>
            )}
          </div>

          {/* Event ID */}
          <div>
            <label htmlFor="eventIdFilter" className="block text-sm font-medium text-gray-900">
              Filtrar por Event ID (opcional)
            </label>
            <input
              id="eventIdFilter"
              name="eventIdFilter"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
              value={eventIdFilter}
              onChange={(e) => setEventIdFilter(e.target.value)}
              placeholder="ex: 123 ou UUID"
              aria-label="Filtrar logs por Event ID"
              title="Filtrar por Event ID"
            />
            <p className="mt-1 text-xs text-gray-500">
              Deixe vazio para ver todos os logs da loja.
            </p>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Dica</p>
            <p className="mt-1 text-xs text-gray-600">
              Se algum envio falhar, o campo <span className="font-mono">error</span> ajuda a debugar
              o n8n/integrações.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Registros</h3>
          <span className="text-xs text-gray-500">{logs?.length ?? 0} itens</span>
        </div>

        {logsError ? (
          <div className="p-4 text-sm text-red-600">Erro ao carregar logs.</div>
        ) : logsLoading ? (
          <div className="p-4 text-sm text-gray-600">Carregando logs...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            Nenhum log encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Quando</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Canal</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Status</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Destino</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Event ID</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Receipt</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Provider ID</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Erro</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {logs.map((l) => (
                  <tr key={String(l.id)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateBR(l.sent_at)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                        {l.channel ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                        {l.status ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 min-w-[220px]">
                      <span className="text-gray-700">{l.destination ?? "—"}</span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {l.event_id ? (
                        <a
                          className="font-mono text-xs text-blue-600 hover:underline"
                          href={`/app/alerts?event_id=${encodeURIComponent(
                            String(l.event_id)
                          )}`}
                        >
                          {String(l.event_id)}
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-gray-700">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {l.receipt_id ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard) {
                              navigator.clipboard.writeText(String(l.receipt_id))
                            }
                          }}
                          className="font-mono text-xs text-blue-600 hover:underline"
                          title="Copiar receipt_id"
                        >
                          {String(l.receipt_id)}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-700">
                        {l.provider_message_id ? String(l.provider_message_id) : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 min-w-[280px]">
                      {l.error ? (
                        <span className="text-red-700 text-xs">{l.error}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
// frontend/src/pages/NotificationLogs/NotificationLogs.tsx
