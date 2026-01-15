import { useMemo, useState } from "react"

type Severity = "critical" | "warning" | "info"
type AlertType = "loss" | "queue" | "conversion" | "staff" | "security"

type AlertItem = {
  id: string
  title: string
  description: string
  store: string
  time: string // ISO ou HH:mm
  severity: Severity
  type: AlertType
  status: "open" | "resolved"
}

const severityStyles: Record<Severity, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  info: "border-blue-200 bg-blue-50 text-blue-700",
}

const severityLabel: Record<Severity, string> = {
  critical: "CRÍTICO",
  warning: "ATENÇÃO",
  info: "INFO",
}

const allowedFilters = ["all", "critical", "warning", "info"] as const
type Filter = (typeof allowedFilters)[number]

export default function Alerts() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const data: AlertItem[] = useMemo(
    () => [
      {
        id: "a1",
        title: "Suspeita de fraude no Caixa 02",
        description:
          "Cancelamento de item sem supervisor presente em transação de alto valor.",
        store: "Loja Jardins",
        time: "2026-01-15T14:22:00",
        severity: "critical",
        type: "security",
        status: "open",
      },
      {
        id: "a2",
        title: "Fila longa (Checkout 4)",
        description:
          "Mais de 5 clientes aguardando por mais de 8 minutos. Sugestão: abrir Caixa 06.",
        store: "Loja Paulista",
        time: "2026-01-15T13:45:00",
        severity: "warning",
        type: "queue",
        status: "open",
      },
      {
        id: "a3",
        title: "Queda na conversão",
        description:
          "Conversão caiu 12% na última hora vs. média histórica (possível falta de staff).",
        store: "Loja Pinheiros",
        time: "2026-01-14T18:10:00",
        severity: "info",
        type: "conversion",
        status: "resolved",
      },
    ],
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return data.filter((a) => {
      const matchQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.store.toLowerCase().includes(q)

      const matchFilter = filter === "all" ? true : a.severity === filter
      return matchQuery && matchFilter
    })
  }, [data, query, filter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Alertas</h1>
          <p className="text-gray-600 mt-1">
            Feed de eventos e recomendações acionáveis (mobile-first)
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <label htmlFor="alerts-search" className="sr-only">
              Buscar alertas
            </label>
            <input
              id="alerts-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar loja, tipo ou alerta..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Buscar loja, tipo ou alerta"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400">
              ⌕
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <label htmlFor="alerts-filter" className="sr-only">
              Filtrar por severidade
            </label>
            <select
              id="alerts-filter"
              value={filter}
              onChange={(e) => {
                const next = e.target.value
                if (allowedFilters.includes(next as any)) {
                  setFilter(next as Filter)
                }
              }}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2"
              aria-label="Filtrar por severidade"
            >
              <option value="all">Todos</option>
              <option value="critical">Crítico</option>
              <option value="warning">Atenção</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {filtered.map((a) => {
          const d = new Date(a.time)
          const hhmm = isNaN(d.getTime())
            ? a.time
            : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

          return (
            <div
              key={a.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${severityStyles[a.severity]}`}
                    >
                      {severityLabel[a.severity]}
                    </span>

                    <span className="text-xs text-gray-500">
                      {hhmm} • {a.store}
                    </span>

                    {a.status === "resolved" && (
                      <span className="text-xs text-gray-500">• RESOLVIDO</span>
                    )}
                  </div>

                  <h3 className="mt-2 font-bold text-gray-900 leading-snug">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{a.description}</p>
                </div>

                <button
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Abrir menu do alerta"
                  type="button"
                >
                  ⋯
                </button>
              </div>

              {/* Ações */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => alert("Abrir câmera (placeholder)")}
                  type="button"
                >
                  Ver Câmera
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => alert("Resolver (placeholder)")}
                  type="button"
                >
                  Resolver
                </button>
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
    </div>
  )
}
