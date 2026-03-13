import { Link } from "react-router-dom"
import type { DetectionEvent } from "../../../services/alerts"

interface AlertsSectionProps {
  storeSelected: boolean
  storeName?: string | null
  eventsLoading: boolean
  eventsError: unknown
  events: DetectionEvent[] | undefined
  resolvingEventId: string | null
  ignoringEventId: string | null
  formatTimeSafe: (iso?: string | null) => string
  onResolveEvent: (eventId: string) => void
  onIgnoreEvent: (eventId: string) => void
}

const eventStatusClass = (status: string) =>
  status === "open"
    ? "bg-red-100 text-red-800"
    : status === "resolved"
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-700"

const eventSeverityClass = (severity: string) =>
  severity === "critical" || severity === "high"
    ? "bg-red-100 text-red-800"
    : severity === "warning" || severity === "medium"
    ? "bg-yellow-100 text-yellow-800"
    : "bg-blue-100 text-blue-800"

export function AlertsSection({
  storeSelected,
  storeName,
  eventsLoading,
  eventsError,
  events,
  resolvingEventId,
  ignoringEventId,
  formatTimeSafe,
  onResolveEvent,
  onIgnoreEvent,
}: AlertsSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Últimos alertas</h2>
        <div className="flex items-center gap-2">
          <Link
            to="/app/alerts"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver todos em Alertas
          </Link>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {(events?.length ?? 0) > 0
              ? `${Math.min(events?.length ?? 0, 10)} de ${events?.length ?? 0}`
              : "0"}
          </span>
        </div>
      </div>

      {!storeSelected ? (
        <div className="text-sm text-gray-500">Selecione uma loja para ver alertas.</div>
      ) : eventsLoading ? (
        <div className="text-sm text-gray-500">Carregando alertas...</div>
      ) : eventsError ? (
        <div className="text-sm text-red-600">Falha ao carregar alertas</div>
      ) : !events || events.length === 0 ? (
        <div className="text-sm text-gray-500">Sem alertas operacionais críticos no momento.</div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 10).map((event) => {
            const eventTime = event.occurred_at || event.created_at
            const isResolving = resolvingEventId === event.id
            const isIgnoring = ignoringEventId === event.id
            const isMutating = isResolving || isIgnoring
            return (
              <div key={event.id} className="border border-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">{formatTimeSafe(eventTime)}</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-800 mt-1">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Loja: {storeName || "Loja selecionada"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700">
                      {event.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full ${eventSeverityClass(
                        event.severity
                      )}`}
                    >
                      {event.severity}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full ${eventStatusClass(
                        event.status
                      )}`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
                {event.status === "open" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => onResolveEvent(event.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded border ${
                        isMutating
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      }`}
                    >
                      {isResolving ? "Resolvendo..." : "Resolver"}
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => onIgnoreEvent(event.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded border ${
                        isMutating
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
                      }`}
                    >
                      {isIgnoring ? "Ignorando..." : "Ignorar"}
                    </button>
                  </div>
                )}
                {event.description && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">{event.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
