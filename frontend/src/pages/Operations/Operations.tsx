import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { storesService, type NetworkDashboard, type StoreSummary } from "../../services/stores"
import { useAlertsEvents } from "../../queries/alerts.queries"
import { meService, type MeAccount } from "../../services/me"
import type { DetectionEvent } from "../../services/alerts"
import type { OperationalEvent, OperationalPillar } from "../../types/operations"

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
}

const severityLabel: Record<string, string> = {
  critical: "CRÍTICO",
  warning: "ATENÇÃO",
  info: "INFO",
}

const pillarLabel: Record<OperationalPillar, string> = {
  sales: "Vendas",
  productivity: "Produtividade",
  people_behavior: "RH / Comportamento",
  operational_infra: "Infraestrutura Operacional",
}

const pillarPillStyle: Record<OperationalPillar, string> = {
  sales: "bg-indigo-50 text-indigo-700 border-indigo-200",
  productivity: "bg-emerald-50 text-emerald-700 border-emerald-200",
  people_behavior: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  operational_infra: "bg-slate-50 text-slate-700 border-slate-200",
}

const quickPrompts = [
  "Onde devo agir agora?",
  "Quais lojas exigem atenção hoje?",
  "Há risco de perda de venda agora?",
  "Onde há problema de equipe ou comportamento?",
  "O que devo priorizar nesta tarde?",
]

const formatTime = (iso?: string) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const classifyPillar = (event: DetectionEvent): OperationalPillar => {
  const type = (event.type || "").toLowerCase()
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase()

  if (
    type.includes("queue") ||
    type.includes("checkout") ||
    type.includes("conversion") ||
    text.includes("fila") ||
    text.includes("convers")
  ) {
    return "sales"
  }
  if (
    type.includes("staff") ||
    type.includes("productivity") ||
    type.includes("idle") ||
    text.includes("ocioso") ||
    text.includes("demanda")
  ) {
    return "productivity"
  }
  if (
    type.includes("behavior") ||
    type.includes("cell") ||
    type.includes("absence") ||
    type.includes("abandon") ||
    text.includes("fora da área") ||
    text.includes("abandono") ||
    text.includes("celular")
  ) {
    return "people_behavior"
  }
  return "operational_infra"
}

const suggestionByPillar = (pillar: OperationalPillar) => {
  switch (pillar) {
    case "sales":
      return "Reforçar atendimento no ponto de maior fluxo e monitorar tempo de espera."
    case "productivity":
      return "Rebalancear equipe por faixa horária para reduzir ociosidade e espera."
    case "people_behavior":
      return "Validar escala e supervisão local para corrigir desvio de comportamento."
    default:
      return "Priorizar estabilidade da captação para manter a leitura operacional confiável."
  }
}

const categoryLabel = (event: DetectionEvent, pillar: OperationalPillar) => {
  const type = (event.type || "").toLowerCase()
  if (type === "queue_long") return "Fila acima do esperado"
  if (type === "staff_missing") return "Equipe abaixo da demanda"
  if (type === "suspicious_cancel") return "Comportamento fora do padrão"
  return pillarLabel[pillar]
}

const storeCardVisual = (storeName: string) => {
  const letter = storeName.trim().charAt(0).toUpperCase() || "L"
  return {
    letter,
    bg: "bg-gradient-to-br from-slate-100 via-slate-50 to-white",
  }
}

const networkStatusLabel = (
  healthy: number,
  total: number,
  criticalOpenEvents: number
) => {
  if (total === 0) return "Implantação inicial"
  if (criticalOpenEvents > 0) return "Rede em atenção prioritária"
  if (healthy >= total) return "Rede estável"
  return "Rede com pontos de atenção"
}

const Operations = () => {
  const { data: account } = useQuery<MeAccount | null>({
    queryKey: ["operations-account"],
    queryFn: () => meService.getAccount(),
    staleTime: 60000,
    retry: false,
  })

  const { data: stores = [], isLoading: storesLoading } = useQuery<StoreSummary[]>({
    queryKey: ["operations-stores-summary"],
    queryFn: () => storesService.getStoresSummary(),
    staleTime: 60000,
  })

  const {
    data: networkDashboard,
    isLoading: networkLoading,
    isError: networkError,
  } = useQuery<NetworkDashboard>({
    queryKey: ["operations-network-dashboard"],
    queryFn: () => storesService.getNetworkDashboard(),
    staleTime: 30000,
    retry: false,
  })

  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useAlertsEvents(
    {
      status: "open",
    },
    { enabled: true, retry: false }
  )

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>()
    stores.forEach((store) => map.set(store.id, store.name))
    networkDashboard?.stores?.forEach((store) => map.set(store.id, store.name))
    return map
  }, [stores, networkDashboard?.stores])

  const operationalEvents = useMemo<OperationalEvent[]>(
    () =>
      events.map((event) => {
        const pillar = classifyPillar(event)
        return {
          id: String(event.id),
          store_id: String(event.store_id),
          store_name: storeNameById.get(String(event.store_id)) || "Loja",
          title: event.title || "Evento operacional",
          description: event.description || undefined,
          occurred_at: event.occurred_at,
          severity: (event.severity as "critical" | "warning" | "info") || "info",
          status: event.status,
          pillar,
          category_label: categoryLabel(event, pillar),
          source_type: event.type || "generic_event",
          camera_id: event.camera_id ?? null,
          suggestion: suggestionByPillar(pillar),
          channels_supported: ["dashboard", "email", "whatsapp"],
          channels_state: {
            dashboard: "available",
            email: "pending",
            whatsapp: "pending",
          },
        }
      }),
    [events, storeNameById]
  )

  const prioritizedEvents = useMemo(
    () =>
      [...operationalEvents]
        .sort((a, b) => {
          const weight = (sev: string) => (sev === "critical" ? 3 : sev === "warning" ? 2 : 1)
          return weight(b.severity) - weight(a.severity)
        })
        .slice(0, 8),
    [operationalEvents]
  )

  const storesTotal = networkDashboard?.total_stores ?? stores.length
  const storesHealthy =
    networkDashboard?.stores?.filter((store) => String(store.status).toLowerCase() === "active")
      .length ?? stores.filter((store) => store.status === "active").length
  const storesAttention = Math.max(storesTotal - storesHealthy, 0)
  const criticalOpenEvents = prioritizedEvents.filter((event) => event.severity === "critical").length
  const salesOccurrences = prioritizedEvents.filter((event) => event.pillar === "sales").length
  const productivityOccurrences = prioritizedEvents.filter((event) => event.pillar === "productivity").length
  const peopleOccurrences = prioritizedEvents.filter((event) => event.pillar === "people_behavior").length

  const orgName = account?.orgs?.[0]?.name || "Sua rede"
  const heroStatus = networkStatusLabel(storesHealthy, storesTotal, criticalOpenEvents)

  const openCopilot = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", prompt ? { detail: { prompt } } : undefined)
    )
  }

  const recommendationOfDay =
    prioritizedEvents[0]?.suggestion ||
    "Operação estável até o momento. Use o Copiloto para revisar oportunidades por loja."

  const networkRows = networkDashboard?.stores ?? []
  const isEmptyNetwork = !storesLoading && stores.length === 0

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Operação da Rede · {orgName}</h1>
            <p className="text-sm text-gray-600">
              Central executiva para monitorar lojas, priorizar ações e coordenar decisões com apoio de IA.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                {storesHealthy} lojas saudáveis
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                {storesAttention} em atenção
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-700">
                {criticalOpenEvents} eventos críticos
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 min-w-[260px]">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Status geral</p>
            <p className="mt-1 text-sm font-semibold text-blue-900">{heroStatus}</p>
            <p className="mt-2 text-xs text-blue-800">
              {storesTotal} loja(s) monitoradas no dia.
            </p>
            <button
              type="button"
              onClick={() => openCopilot("Onde devo agir agora na rede?")}
              className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Abrir Copiloto
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          {
            id: "healthy",
            label: "Lojas com operação saudável",
            value: storesHealthy,
            helper: "Status operacional consolidado",
            state: "ready" as const,
          },
          {
            id: "attention",
            label: "Lojas com atenção",
            value: storesAttention,
            helper: "Necessitam intervenção de gestão",
            state: "ready" as const,
          },
          {
            id: "critical",
            label: "Eventos críticos em aberto",
            value: criticalOpenEvents,
            helper: "Ações prioritárias da rede",
            state: "ready" as const,
          },
          {
            id: "sales",
            label: "Oportunidades de conversão",
            value: salesOccurrences,
            helper: salesOccurrences > 0 ? "Pontos com risco de perda de venda" : "Em coleta",
            state: salesOccurrences > 0 ? ("ready" as const) : ("collecting" as const),
          },
          {
            id: "productivity",
            label: "Ocorrências de produtividade",
            value: productivityOccurrences,
            helper:
              productivityOccurrences > 0 ? "Desbalanceamento de equipe e fluxo" : "Disponível em breve",
            state: productivityOccurrences > 0 ? ("ready" as const) : ("collecting" as const),
          },
          {
            id: "people",
            label: "Ocorrências de RH/comportamento",
            value: peopleOccurrences,
            helper: peopleOccurrences > 0 ? "Sinais de comportamento fora do padrão" : "Em calibração",
            state: peopleOccurrences > 0 ? ("ready" as const) : ("collecting" as const),
          },
        ].map((kpi) => (
          <article key={kpi.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {kpi.state === "ready" ? kpi.value : "—"}
            </p>
            <p className="mt-1 text-xs text-gray-500">{kpi.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Ações prioritárias da rede</h2>
              <p className="text-sm text-gray-600 mt-1">
                Eventos operacionais acionáveis para decisão rápida.
              </p>
            </div>
            <Link
              to="/app/alerts"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver painel de alertas
            </Link>
          </div>

          {eventsLoading ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : prioritizedEvents.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              Nenhum evento operacional aberto no momento. A operação aparenta estabilidade.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {prioritizedEvents.map((event) => (
                <article key={event.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        severityStyles[event.severity]
                      }`}
                    >
                      {severityLabel[event.severity]}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        pillarPillStyle[event.pillar]
                      }`}
                    >
                      {pillarLabel[event.pillar]}
                    </span>
                    <span className="text-xs text-gray-500">{formatTime(event.occurred_at)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">{event.title}</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    {event.store_name} · {event.category_label}
                  </p>
                  <p className="mt-2 text-xs text-gray-600">{event.suggestion}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/app/alerts?event_id=${encodeURIComponent(event.id)}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Ver detalhes
                    </Link>
                    <Link
                      to={`/app/operations/stores/${event.store_id}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Abrir loja
                    </Link>
                    <button
                      type="button"
                      onClick={() => openCopilot(`Como resolver: ${event.title} na ${event.store_name}?`)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Resolver com Copiloto
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-[#111827] p-4 text-white">
            <p className="text-xs uppercase tracking-wide text-blue-200 font-semibold">DALE Copiloto</p>
            <h3 className="mt-1 text-lg font-semibold">Seu braço direito operacional</h3>
            <p className="mt-2 text-sm text-gray-200">
              Analisa eventos da rede e orienta prioridades em linguagem executiva.
            </p>
            <div className="mt-3 rounded-lg bg-white/10 p-3 text-xs text-gray-100">
              <p className="font-semibold text-blue-100">Recomendação do dia</p>
              <p className="mt-1">{recommendationOfDay}</p>
            </div>
            <button
              type="button"
              onClick={() => openCopilot("Resumo executivo da rede hoje")}
              className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Conversar agora
            </button>
            <Link
              to="/app/copilot"
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Abrir Copiloto em tela cheia
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => openCopilot(prompt)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Lojas da rede</h2>
            <p className="text-sm text-gray-600 mt-1">
              Visão executiva por unidade para gestão remota da operação.
            </p>
          </div>
          <Link
            to="/app/operations/stores"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver módulo de lojas
          </Link>
        </div>

        {isEmptyNetwork ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
            Nenhuma loja conectada ainda. Avance na implantação para liberar a central operacional.
          </div>
        ) : networkLoading && !networkRows.length ? (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {(networkRows.length ? networkRows : stores).map((store) => {
              const storeId = "id" in store ? store.id : ""
              const storeName = "name" in store ? store.name : "Loja"
              const visual = storeCardVisual(storeName)
              const status =
                "status" in store && typeof store.status === "string"
                  ? store.status.toLowerCase()
                  : "collecting"
              const statusText =
                status === "active"
                  ? "Saudável"
                  : status === "blocked" || status === "inactive"
                    ? "Crítica"
                    : "Atenção"
              const statusClass =
                statusText === "Saudável"
                  ? "bg-emerald-100 text-emerald-700"
                  : statusText === "Crítica"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              const location =
                "location" in store && typeof store.location === "string"
                  ? store.location
                  : undefined
              const conversion =
                "conversion" in store && typeof store.conversion === "number" ? store.conversion : null
              const alertsCount = "alerts" in store && typeof store.alerts === "number" ? store.alerts : null

              return (
                <article key={storeId} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 shrink-0 rounded-xl border border-gray-200 ${visual.bg} flex items-center justify-center text-sm font-semibold text-gray-700`}
                      >
                        {visual.letter}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{storeName}</h3>
                        <p className="text-xs text-gray-500">
                          {location || "Localização em configuração"} · Operação de loja
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
                        {statusText}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600 border border-gray-200">
                        Conversão: {typeof conversion === "number" ? `${Math.round(conversion)}%` : "Em coleta"}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600 border border-gray-200">
                        Alertas: {alertsCount ?? "—"}
                      </span>
                      <Link
                        to={`/app/operations/stores/${storeId}`}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                      >
                        Abrir loja
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {networkError && (
          <p className="mt-3 text-xs text-amber-700">
            Parte das métricas da rede está indisponível no momento. Exibindo dados base de lojas.
          </p>
        )}
      </section>
    </div>
  )
}

export default Operations
