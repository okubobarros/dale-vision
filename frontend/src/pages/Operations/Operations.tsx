import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  storesService,
  type NetworkDashboard,
  type NetworkEdgeUpdateRolloutSummaryResponse,
  type NetworkEdgeUpdateValidationSummaryResponse,
  type StoreSummary,
} from "../../services/stores"
import { useAlertsEvents } from "../../queries/alerts.queries"
import { meService, type MeAccount, type MeStatus } from "../../services/me"
import { alertsService, type ActionDispatchResponse } from "../../services/alerts"
import { copilotService } from "../../services/copilot"
import { trackJourneyEvent } from "../../services/journey"
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
const OPERATIONAL_SCORE_WEIGHTS = {
  critical: 5,
  warning: 3,
  productivity: 2,
} as const

type QuickFilter = "all" | "critical" | "offline" | "people"
type InterventionStatus = "pending" | "viewed" | "resolved"
type RolloutChannelFilter = "all" | "stable" | "canary"
type OutcomeFeedbackStatus = "resolved" | "partial" | "not_resolved"
type GroupedOperationalEvent = {
  id: string
  store_id: string
  store_name: string
  pillar: OperationalPillar
  category_label: string
  severity: "critical" | "warning" | "info"
  occurred_at: string
  count: number
  status: InterventionStatus
  suggestion: string
}

const interventionLabel: Record<InterventionStatus, string> = {
  pending: "Pendente",
  viewed: "Visualizado pelo Gerente",
  resolved: "Resolvido",
}

const interventionStyles: Record<InterventionStatus, string> = {
  pending: "bg-rose-50 text-rose-700 border-rose-200",
  viewed: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

const outcomeFeedbackLabel: Record<OutcomeFeedbackStatus, string> = {
  resolved: "Resolveu",
  partial: "Parcial",
  not_resolved: "Não resolveu",
}

const outcomeFeedbackBadgeStyle: Record<OutcomeFeedbackStatus, string> = {
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  not_resolved: "border-rose-200 bg-rose-50 text-rose-700",
}

const severityWeight = (severity: string) =>
  severity === "critical" ? 3 : severity === "warning" ? 2 : 1

const resolveInterventionStatus = (statuses: string[]): InterventionStatus => {
  if (statuses.some((status) => String(status).toLowerCase() === "open")) return "pending"
  if (statuses.some((status) => String(status).toLowerCase() === "ignored")) return "viewed"
  return "resolved"
}

const formatGroupedTitle = (group: GroupedOperationalEvent) => {
  const base = group.category_label.toLowerCase()
  return `${group.count} alerta${group.count > 1 ? "s" : ""} de ${base} na ${group.store_name}`
}

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

const formatCurrencyBRL = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })

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

const playbookByPillar = (
  pillar: OperationalPillar,
  severity: "critical" | "warning" | "info"
) => {
  const immediatePrefix = severity === "critical" ? "Agora" : "Próximo ciclo"
  switch (pillar) {
    case "sales":
      return [
        `${immediatePrefix}: abrir cobertura extra de caixa por 30-60min`,
        "Revisar fila em tempo real e realocar staff para frente de loja",
        "Validar impacto em conversão após intervenção",
      ]
    case "productivity":
      return [
        `${immediatePrefix}: ajustar escala no pico atual`,
        "Rebalancear tarefas entre atendimento e retaguarda",
        "Medir redução de ociosidade e fila na próxima hora",
      ]
    case "people_behavior":
      return [
        `${immediatePrefix}: acionar gerente responsável da unidade`,
        "Aplicar checklist de conduta e presença em área crítica",
        "Registrar evidências e status de resolução",
      ]
    default:
      return [
        `${immediatePrefix}: restaurar disponibilidade do edge/câmeras`,
        "Executar playbook técnico da loja no módulo de detalhes",
        "Confirmar retorno de telemetria e normalização de alertas",
      ]
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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const [rolloutActionStoreId, setRolloutActionStoreId] = useState<string | null>(null)
  const [rolloutChannelFilter, setRolloutChannelFilter] = useState<RolloutChannelFilter>("all")
  const [feedbackOutcomeId, setFeedbackOutcomeId] = useState<string | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<OutcomeFeedbackStatus>("resolved")
  const [feedbackComment, setFeedbackComment] = useState("")
  const [savingFeedbackOutcomeId, setSavingFeedbackOutcomeId] = useState<string | null>(null)

  const { data: account } = useQuery<MeAccount | null>({
    queryKey: ["operations-account"],
    queryFn: () => meService.getAccount(),
    staleTime: 60000,
    retry: false,
  })
  const { data: meStatus } = useQuery<MeStatus | null>({
    queryKey: ["operations-status"],
    queryFn: () => meService.getStatus(),
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
  const { data: networkRolloutSummary } = useQuery<NetworkEdgeUpdateRolloutSummaryResponse>({
    queryKey: ["operations-network-edge-rollout-summary", rolloutChannelFilter],
    queryFn: () =>
      storesService.getNetworkEdgeUpdateRolloutSummary(
        rolloutChannelFilter === "all" ? undefined : rolloutChannelFilter
      ),
    staleTime: 30000,
    retry: false,
  })
  const { data: networkValidationSummary } = useQuery<NetworkEdgeUpdateValidationSummaryResponse>({
    queryKey: ["operations-network-edge-validation-summary", rolloutChannelFilter],
    queryFn: () =>
      storesService.getNetworkEdgeUpdateValidationSummary({
        channel: rolloutChannelFilter === "all" ? undefined : rolloutChannelFilter,
        hours: 72,
      }),
    staleTime: 30000,
    retry: false,
  })

  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useAlertsEvents(
    {},
    { enabled: true, retry: false }
  )
  const { data: actionOutcomesResponse, refetch: refetchActionOutcomes } = useQuery({
    queryKey: ["operations-action-outcomes"],
    queryFn: () =>
      copilotService.listNetworkActionOutcomes({
        limit: 10,
      }),
    staleTime: 30000,
    retry: false,
  })

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

  const groupedEvents = useMemo<GroupedOperationalEvent[]>(() => {
    const grouped = new Map<
      string,
      {
        id: string
        store_id: string
        store_name: string
        pillar: OperationalPillar
        category_label: string
        severity: "critical" | "warning" | "info"
        occurred_at: string
        count: number
        statuses: string[]
        suggestion: string
      }
    >()

    operationalEvents.forEach((event) => {
      const key = `${event.store_id}:${event.source_type}:${event.pillar}`
      const current = grouped.get(key)
      if (!current) {
        grouped.set(key, {
          id: key,
          store_id: event.store_id,
          store_name: event.store_name,
          pillar: event.pillar,
          category_label: event.category_label,
          severity: event.severity,
          occurred_at: event.occurred_at,
          count: 1,
          statuses: [event.status],
          suggestion:
            event.suggestion || suggestionByPillar(event.pillar),
        })
        return
      }

      current.count += 1
      current.statuses.push(event.status)
      if (severityWeight(event.severity) > severityWeight(current.severity)) {
        current.severity = event.severity
      }
      const currentDate = new Date(current.occurred_at).getTime()
      const eventDate = new Date(event.occurred_at).getTime()
      if (!Number.isNaN(eventDate) && (Number.isNaN(currentDate) || eventDate > currentDate)) {
        current.occurred_at = event.occurred_at
      }
    })

    return Array.from(grouped.values())
      .map((group) => ({
        id: group.id,
        store_id: group.store_id,
        store_name: group.store_name,
        pillar: group.pillar,
        category_label: group.category_label,
        severity: group.severity,
        occurred_at: group.occurred_at,
        count: group.count,
        status: resolveInterventionStatus(group.statuses),
        suggestion: group.suggestion,
      }))
      .sort((a, b) => {
        const statusWeight = (status: InterventionStatus) =>
          status === "pending" ? 3 : status === "viewed" ? 2 : 1
        const statusDiff = statusWeight(b.status) - statusWeight(a.status)
        if (statusDiff !== 0) return statusDiff
        const severityDiff = severityWeight(b.severity) - severityWeight(a.severity)
        if (severityDiff !== 0) return severityDiff
        return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      })
  }, [operationalEvents])

  const storesTotal = networkDashboard?.total_stores ?? stores.length
  const storesHealthy =
    networkDashboard?.stores?.filter((store) => String(store.status).toLowerCase() === "active")
      .length ?? stores.filter((store) => store.status === "active").length
  const storesAttention = Math.max(storesTotal - storesHealthy, 0)
  const offlineStoreIds = useMemo(() => {
    const set = new Set<string>()
    networkDashboard?.stores?.forEach((store) => {
      const status = String(store.status || "").toLowerCase()
      if (status === "blocked" || status === "inactive" || status === "offline") {
        set.add(store.id)
      }
    })
    stores.forEach((store) => {
      const status = String(store.status || "").toLowerCase()
      if (status === "blocked" || status === "inactive") {
        set.add(store.id)
      }
    })
    return set
  }, [networkDashboard?.stores, stores])

  const filteredGroupedEvents = useMemo(() => {
    if (quickFilter === "all") return groupedEvents
    if (quickFilter === "critical") {
      return groupedEvents.filter((group) => group.severity === "critical")
    }
    if (quickFilter === "offline") {
      return groupedEvents.filter((group) => offlineStoreIds.has(group.store_id))
    }
    return groupedEvents.filter((group) => group.pillar === "people_behavior")
  }, [groupedEvents, quickFilter, offlineStoreIds])

  const priorityGroups = useMemo(() => filteredGroupedEvents.slice(0, 8), [filteredGroupedEvents])
  const actionOutcomes = actionOutcomesResponse?.items ?? []
  const criticalOpenEvents = groupedEvents.filter(
    (event) => event.severity === "critical" && event.status === "pending"
  ).length
  const salesOccurrences = groupedEvents.filter((event) => event.pillar === "sales").length
  const productivityOccurrences = groupedEvents.filter((event) => event.pillar === "productivity").length
  const peopleOccurrences = groupedEvents.filter((event) => event.pillar === "people_behavior").length

  const orgName = account?.orgs?.[0]?.name || "Sua rede"
  const heroStatus = networkStatusLabel(storesHealthy, storesTotal, criticalOpenEvents)
  const { data: networkEfficiencyRanking } = useQuery({
    queryKey: ["operations-network-efficiency-ranking"],
    queryFn: () => copilotService.getNetworkEfficiencyRanking({ days: 30 }),
    staleTime: 30000,
    retry: false,
    enabled: storesTotal > 1,
  })

  const openCopilot = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", prompt ? { detail: { prompt } } : undefined)
    )
  }

  const handleRolloutCopilotAction = async (store: {
    store_id: string
    store_name?: string | null
    health: "degraded" | "in_progress"
    channel: "stable" | "canary"
    target_version?: string | null
    last_event?: string | null
    last_status?: string | null
    reason_code?: string | null
  }) => {
    const storeId = store.store_id
    const storeName = store.store_name || "loja"
    const insightId = `operations-rollout-${storeId}`
    setRolloutActionStoreId(storeId)
    let dispatchResponse: ActionDispatchResponse | null = null
    try {
      dispatchResponse = await alertsService.dispatchAction({
        store_id: storeId,
        insight_id: insightId,
        action_type: "edge_rollout_intervention",
        channel: "copilot",
        source: "operations_rollout",
        confidence_score: store.health === "degraded" ? 85 : 75,
        context: {
          origin: "operations_rollout",
          rollout_health: store.health,
          reason_code: store.reason_code || null,
          last_event: store.last_event || null,
          target_version: store.target_version || null,
        },
      })
      try {
        const createdOutcome = await copilotService.createActionOutcome(storeId, {
          action_event_id: dispatchResponse.event_id ?? null,
          insight_id: insightId,
          action_type: "edge_rollout_intervention",
          channel: "copilot",
          source: "operations_rollout",
          status: "dispatched",
          confidence_score: store.health === "degraded" ? 85 : 75,
          baseline: {
            origin: "operations_rollout",
            rollout_health: store.health,
            reason_code: store.reason_code || null,
          },
        })
        void trackJourneyEvent("operation_action_delegated", {
          source: "operations_rollout",
          store_id: storeId,
          action_id: createdOutcome?.id || null,
          action_event_id: dispatchResponse.event_id || null,
          action_type: "edge_rollout_intervention",
          channel: "copilot",
        })
      } catch {
        // Non-blocking: dispatch already persisted.
      }
      toast.success(`Ação registrada para ${storeName}.`)
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Não foi possível registrar a ação de rollout."
      try {
        await copilotService.createActionOutcome(storeId, {
          insight_id: insightId,
          action_type: "edge_rollout_intervention",
          channel: "copilot",
          source: "operations_rollout",
          status: "failed",
          confidence_score: store.health === "degraded" ? 85 : 75,
          outcome: {
            failed_from: "operations_rollout",
            error_message: message,
            reason_code: store.reason_code || null,
          },
        })
      } catch {
        // Non-blocking: failure already visible in UI.
      }
      toast.error(message)
      setRolloutActionStoreId(null)
      return
    }

    openCopilot(
      `Montar plano imediato para update da ${storeName}. Status: ${store.health}. Evento: ${
        store.last_event || "sem evento"
      }. Motivo: ${store.reason_code || "não informado"}. Versão alvo: ${store.target_version || "não informada"}.`
    )
    setRolloutActionStoreId(null)
  }

  const recommendationOfDay =
    groupedEvents[0]?.suggestion ||
    "Operação estável até o momento. Use o Copiloto para revisar oportunidades por loja."
  const rolloutStatus = networkRolloutSummary?.rollout_health?.status || "no_data"
  const rolloutStatusLabel =
    rolloutStatus === "healthy"
      ? "Rollout estável"
      : rolloutStatus === "degraded"
      ? "Rollout crítico"
      : rolloutStatus === "attention"
      ? "Rollout em atenção"
      : "Sem dados de rollout"
  const rolloutStatusClass =
    rolloutStatus === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : rolloutStatus === "degraded"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : rolloutStatus === "attention"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-700"
  const rolloutMetrics = networkRolloutSummary?.rollout_metrics
  const validationDecision = networkValidationSummary?.summary?.decision || "NO-GO"
  const validationDecisionClass =
    validationDecision === "GO"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700"
  const topOperationalRisk =
    groupedEvents[0]
      ? formatGroupedTitle(groupedEvents[0])
      : "Sem risco crítico aberto neste momento."

  const hasProPlan = useMemo(
    () =>
      stores.some(
        (store) => store.plan === "pro" || store.plan === "enterprise"
      ),
    [stores]
  )
  const isTrialOrStart =
    !meStatus?.has_subscription ||
    storesTotal <= 1 ||
    stores.every(
      (store) =>
        !store.plan ||
        store.plan === "trial" ||
        store.plan === "basic" ||
        store.plan === "start" ||
        store.plan === "paid"
    )
  const shouldShowRanking = hasProPlan && storesTotal > 1 && !isTrialOrStart
  const fallbackRankingRows = useMemo(() => {
    const byStore = new Map<
      string,
      {
        storeId: string
        storeName: string
        critical: number
        warning: number
        productivity: number
        score: number
        performanceBand?: string
        contributionFactors?: Array<{ label: string; value: number }>
      }
    >()

    operationalEvents.forEach((event) => {
      const current = byStore.get(event.store_id) ?? {
        storeId: event.store_id,
        storeName: event.store_name,
        critical: 0,
        warning: 0,
        productivity: 0,
        score: 0,
      }

      if (event.severity === "critical") current.critical += 1
      if (event.severity === "warning") current.warning += 1
      if (event.pillar === "productivity") current.productivity += 1

      current.score =
        current.critical * OPERATIONAL_SCORE_WEIGHTS.critical +
        current.warning * OPERATIONAL_SCORE_WEIGHTS.warning +
        current.productivity * OPERATIONAL_SCORE_WEIGHTS.productivity
      byStore.set(event.store_id, current)
    })

    return Array.from(byStore.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [operationalEvents])
  const rankingRows = useMemo(() => {
    const fromBackend = networkEfficiencyRanking?.items ?? []
    if (fromBackend.length > 0) {
      return fromBackend.slice(0, 5).map((item) => ({
        storeId: item.store_id,
        storeName: item.display_name || item.store_name,
        critical: item.metrics.critical_open,
        warning: item.metrics.warning_open,
        productivity: item.metrics.actions_dispatched - item.metrics.actions_completed,
        score: item.efficiency_score,
        performanceBand: item.performance_band,
        contributionFactors: item.contribution_factors ?? [],
      }))
    }
    return fallbackRankingRows
  }, [fallbackRankingRows, networkEfficiencyRanking?.items])

  const networkRows = networkDashboard?.stores ?? []
  const isEmptyNetwork = !storesLoading && stores.length === 0

  const startOutcomeFeedback = (outcomeId: string, status: OutcomeFeedbackStatus) => {
    setFeedbackOutcomeId(outcomeId)
    setFeedbackStatus(status)
    setFeedbackComment("")
  }

  const submitOutcomeFeedback = async (item: {
    id: string
    store_id: string
    impact_expected_brl: number
  }) => {
    if (!feedbackOutcomeId || feedbackOutcomeId !== item.id || !item.store_id) return
    setSavingFeedbackOutcomeId(item.id)
    const resolved = feedbackStatus === "resolved"
    const partial = feedbackStatus === "partial"
    const realizedValue = resolved
      ? Math.max(0, item.impact_expected_brl || 0)
      : partial
      ? Math.max(0, Math.round((item.impact_expected_brl || 0) * 0.4))
      : 0
    try {
      await copilotService.updateActionOutcome(item.store_id, item.id, {
        status: resolved ? "completed" : "failed",
        outcome_status: feedbackStatus,
        outcome_comment: feedbackComment.trim() || null,
        impact_realized_brl: realizedValue,
        outcome: {
          feedback_by: "operations_ui",
          feedback_from: "operations_execution_center",
          feedback_status: feedbackStatus,
        },
      })
      void trackJourneyEvent("operation_action_feedback_submitted", {
        source: "operations_execution_center",
        store_id: item.store_id,
        action_id: item.id,
        outcome_status: feedbackStatus,
        has_comment: Boolean(feedbackComment.trim()),
      })
      void trackJourneyEvent("operation_action_completed", {
        source: "operations_execution_center",
        store_id: item.store_id,
        action_id: item.id,
        outcome_status: feedbackStatus,
        final_status: resolved ? "completed" : "failed",
      })
      await refetchActionOutcomes()
      setFeedbackOutcomeId(null)
      setFeedbackComment("")
      toast.success("Feedback operacional registrado.")
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Não foi possível registrar o feedback."
      toast.error(message)
    } finally {
      setSavingFeedbackOutcomeId(null)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Central de execução · {orgName}</h1>
            <p className="text-sm text-gray-600">
              Onde agir agora, com prioridade operacional e apoio do Copiloto.
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
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Leitura executiva</p>
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

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Risco ou oportunidade principal</p>
        <h2 className="mt-1 text-lg font-semibold text-indigo-950">{topOperationalRisk}</h2>
        <p className="mt-2 text-sm text-indigo-900">
          {criticalOpenEvents > 0
            ? "Priorize a execução imediata para reduzir impacto operacional."
            : "Sem evento crítico agora. Direcione energia para ganho de conversão e produtividade."}
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Rollout Edge na rede</h2>
            <p className="text-sm text-gray-600 mt-1">Saúde de atualização remota por loja para ação imediata.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {(["all", "stable", "canary"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRolloutChannelFilter(item)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    rolloutChannelFilter === item
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item === "all" ? "Todos" : item}
                </button>
              ))}
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${rolloutStatusClass}`}>
              {rolloutStatusLabel}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Lojas monitoradas</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{networkRolloutSummary?.totals?.stores ?? 0}</p>
            <p className="mt-1 text-xs text-slate-600">
              Com policy ativa {networkRolloutSummary?.totals?.with_policy ?? 0} · atualizadas{" "}
              {networkRolloutSummary?.totals?.version_gap?.up_to_date ?? 0}
            </p>
          </article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Saudáveis</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{networkRolloutSummary?.totals?.health?.healthy ?? 0}</p>
            <p className="mt-1 text-xs text-emerald-700">Canary {networkRolloutSummary?.totals?.channel?.canary ?? 0}</p>
          </article>
          <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Críticas</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">{networkRolloutSummary?.totals?.health?.degraded ?? 0}</p>
            <p className="mt-1 text-xs text-rose-700">
              Em progresso {networkRolloutSummary?.totals?.health?.in_progress ?? 0} · desatualizadas{" "}
              {networkRolloutSummary?.totals?.version_gap?.outdated ?? 0}
            </p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Sem sinal</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{networkRolloutSummary?.totals?.health?.no_data ?? 0}</p>
            <p className="mt-1 text-xs text-amber-700">
              Stable {networkRolloutSummary?.totals?.channel?.stable ?? 0} · gap desconhecido{" "}
              {networkRolloutSummary?.totals?.version_gap?.unknown ?? 0}
            </p>
          </article>
        </div>
        <p className="mt-3 text-xs text-gray-600">
          {networkRolloutSummary?.rollout_health?.recommended_action || "Sem recomendação ativa de rollout."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full border px-2 py-0.5 font-semibold ${validationDecisionClass}`}>
            Validação S4: {validationDecision}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
            Canary: {networkValidationSummary?.checklist?.canary_ready ? "ok" : "pendente"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
            Rollback: {networkValidationSummary?.checklist?.rollback_ready ? "ok" : "pendente"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
            Telemetria: {networkValidationSummary?.checklist?.telemetry_ready ? "ok" : "pendente"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Taxa de sucesso</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {rolloutMetrics?.success_rate_pct?.toFixed(1) ?? "0.0"}%
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {rolloutMetrics?.attempts_successful ?? 0} de {rolloutMetrics?.attempts_total ?? 0} tentativas
            </p>
          </article>
          <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Taxa de falha</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">
              {rolloutMetrics?.failure_rate_pct?.toFixed(1) ?? "0.0"}%
            </p>
            <p className="mt-1 text-xs text-rose-700">
              Falhas {rolloutMetrics?.attempts_failed ?? 0} · rollback {rolloutMetrics?.attempts_rolled_back ?? 0}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Duração média</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rolloutMetrics?.avg_duration_seconds
                ? `${Math.round(rolloutMetrics.avg_duration_seconds)}s`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Incompletas {rolloutMetrics?.attempts_incomplete ?? 0}
            </p>
          </article>
        </div>
        {networkRolloutSummary?.critical_stores?.length ? (
          <div className="mt-3 space-y-2">
            {networkRolloutSummary.critical_stores.slice(0, 4).map((store) => (
              <article key={`${store.store_id}-${store.timestamp || "latest"}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{store.store_name || "Loja"}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {store.last_event || "Sem evento"} · versão atual {store.current_version || "—"} · versão alvo{" "}
                      {store.target_version || "—"} · gap{" "}
                      {store.version_gap === "up_to_date"
                        ? "atualizada"
                        : store.version_gap === "outdated"
                        ? "desatualizada"
                        : "desconhecido"}{" "}
                      · motivo {store.reason_code || "não informado"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/app/edge-help?store_id=${store.store_id}${
                        store.reason_code ? `&reason_code=${encodeURIComponent(store.reason_code)}` : ""
                      }`}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      Runbook
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleRolloutCopilotAction(store)}
                      disabled={rolloutActionStoreId === store.store_id}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {rolloutActionStoreId === store.store_id ? "Acionando..." : "Acionar Copiloto"}
                    </button>
                    <Link
                      to={`/app/operations/stores/${store.store_id}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Abrir loja
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">Sem lojas críticas de update no momento.</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Ranking de prioridade da rede</h2>
            <p className="text-sm text-gray-600 mt-1">
              Priorização automática por impacto operacional das lojas.
            </p>
          </div>
          {shouldShowRanking && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Plano Pro
            </span>
          )}
        </div>

        {shouldShowRanking ? (
          rankingRows.length > 0 ? (
            <div className="mt-4 space-y-3">
              {rankingRows.map((row, index) => (
                <article
                  key={row.storeId}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {index + 1}º {row.storeName}
                      </p>
                      <p className="text-xs text-gray-600">
                        Score {row.score} · críticos {row.critical} · atenção {row.warning}
                        {row.performanceBand ? ` · faixa ${row.performanceBand}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(row.contributionFactors ?? [])
                          .slice(0, 2)
                          .map((factor) => `${factor.label}: ${factor.value}`)
                          .join(" · ") || "Sem fatores explicativos suficientes no período."}
                      </p>
                    </div>
                    <Link
                      to={`/app/operations/stores/${row.storeId}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Abrir loja
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              Sem eventos suficientes para calcular ranking no momento.
            </div>
          )
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
              <span aria-hidden>🔒</span>
              Ranking da rede disponível no plano Pro
            </p>
            <p className="mt-1 text-xs text-slate-700">
              O foco atual permanece em decisão por loja. O ranking multiloja segue bloqueado para este perfil.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Ações prioritárias da rede</h2>
              <p className="text-sm text-gray-600 mt-1">
                Eventos agrupados por tipo e loja para decisão rápida.
              </p>
            </div>
            <Link
              to="/app/alerts"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver painel de alertas
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "all" as const, label: "Todos" },
              { key: "critical" as const, label: "Apenas Críticos" },
              { key: "offline" as const, label: "Apenas Lojas Offline" },
              { key: "people" as const, label: "Apenas Problemas de Equipe" },
            ].map((filter) => {
              const active = quickFilter === filter.key
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQuickFilter(filter.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>

          {eventsLoading ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : priorityGroups.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              Nenhum evento operacional encontrado para este filtro.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {priorityGroups.map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        interventionStyles[event.status]
                      }`}
                    >
                      {interventionLabel[event.status]}
                    </span>
                    <span className="text-xs text-gray-500">{formatTime(event.occurred_at)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">{formatGroupedTitle(event)}</h3>
                  <p className="mt-1 text-xs text-slate-600">{event.store_name} · {event.category_label}</p>
                  <p className="mt-2 text-xs text-gray-600">{event.suggestion}</p>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Playbook de ação
                    </p>
                    <ul className="mt-1 space-y-1">
                      {playbookByPillar(event.pillar, event.severity).map((step) => (
                        <li key={step} className="text-xs text-slate-700">
                          • {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/app/alerts?store_id=${encodeURIComponent(event.store_id)}`}
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
                      onClick={() =>
                        openCopilot(
                          `Como resolver: ${formatGroupedTitle(event)}?`
                        )
                      }
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
            <h2 className="text-xl font-semibold text-gray-900">Fechamento das ações delegadas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Marque o resultado da ação e registre comentário para aprendizado operacional.
            </p>
          </div>
          <Link
            to="/app/reports"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver histórico completo
          </Link>
        </div>
        {!actionOutcomes.length ? (
          <p className="mt-4 text-sm text-gray-600">Sem ações registradas recentemente.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {actionOutcomes.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.action_type}</p>
                    <p className="text-xs text-slate-600">
                      Esperado {formatCurrencyBRL(item.impact_expected_brl || 0)} · Realizado{" "}
                      {formatCurrencyBRL(item.impact_realized_brl || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                      {item.status}
                    </span>
                    {item.outcome_status && (
                      <span
                        className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                          outcomeFeedbackBadgeStyle[item.outcome_status]
                        }`}
                      >
                        {outcomeFeedbackLabel[item.outcome_status]}
                      </span>
                    )}
                  </div>
                </div>

                {item.outcome_comment && (
                  <p className="mt-2 text-xs text-slate-600">Comentário: {item.outcome_comment}</p>
                )}

                {item.status === "dispatched" && feedbackOutcomeId !== item.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startOutcomeFeedback(item.id, "resolved")}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Resolveu
                    </button>
                    <button
                      type="button"
                      onClick={() => startOutcomeFeedback(item.id, "partial")}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      Parcial
                    </button>
                    <button
                      type="button"
                      onClick={() => startOutcomeFeedback(item.id, "not_resolved")}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Não resolveu
                    </button>
                  </div>
                )}

                {feedbackOutcomeId === item.id && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Feedback de fechamento: {outcomeFeedbackLabel[feedbackStatus]}
                    </p>
                    <textarea
                      value={feedbackComment}
                      onChange={(event) => setFeedbackComment(event.target.value)}
                      placeholder="Comentário rápido (opcional): o que funcionou ou falhou?"
                      rows={3}
                      maxLength={1000}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void submitOutcomeFeedback(item)}
                        disabled={savingFeedbackOutcomeId === item.id}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                      >
                        {savingFeedbackOutcomeId === item.id ? "Salvando..." : "Salvar feedback"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackOutcomeId(null)
                          setFeedbackComment("")
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Resumo executivo da rede</h2>
          <p className="text-sm text-gray-600 mt-1">Contexto consolidado para suportar decisão, sem travar a execução.</p>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
            <article key={kpi.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {kpi.state === "ready" ? kpi.value : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">{kpi.helper}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Operations
