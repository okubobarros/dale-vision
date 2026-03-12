import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../../contexts/useAuth"
import {
  storesService,
  type MetricGovernanceItem,
  type StoreSummary,
  type StoreEdgeStatus,
  type StoreCeoDashboard,
  type StoreEvidenceResponse,
} from "../../services/stores"
import type { StoreDashboard } from "../../types/dashboard"
import { camerasService } from "../../services/cameras"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import {
  useAlertsEvents,
  useIgnoreEvent,
  useResolveEvent,
} from "../../queries/alerts.queries"
import {
  onboardingService,
  type OnboardingNextStepResponse,
} from "../../services/onboarding"
import { meService } from "../../services/me"
import { getDashboardExperience } from "./dashboardExperience"
import { TrialDashboardView } from "./views/TrialDashboardView"
import { PaidSetupDashboardView } from "./views/PaidSetupDashboardView"
import { PaidExecutiveDashboardView } from "./views/PaidExecutiveDashboardView"
import { DashboardHeroSection } from "./views/DashboardHeroSection"
import { DashboardKpiStrip } from "./views/DashboardKpiStrip"
import { InfrastructureSection } from "./views/InfrastructureSection"
import { AlertsSection } from "./views/AlertsSection"
import { OperationalDiagnosisSection } from "./views/OperationalDiagnosisSection"

const ONLINE_MAX_AGE_SEC = 120

const isRecentTimestamp = (iso?: string | null, maxAgeSec = ONLINE_MAX_AGE_SEC) => {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const diffSec = (Date.now() - date.getTime()) / 1000
  return diffSec >= 0 && diffSec <= maxAgeSec
}

const getConnectivityStatus = (status?: StoreEdgeStatus | null) => {
  const value = String(status?.connectivity_status || "").toLowerCase()
  if (value === "online" || value === "degraded" || value === "offline") return value
  if (typeof status?.online === "boolean") return status.online ? "online" : "offline"
  return "offline"
}

const getLastSeenAt = (status?: StoreEdgeStatus | null) =>
  status?.last_comm_at ||
    status?.last_seen_at ||
    status?.last_heartbeat_at ||
    status?.last_heartbeat ||
    null

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 10) return "agora"
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })
  if (diffSec < 60) return rtf.format(-diffSec, "second")
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return rtf.format(-diffMin, "minute")
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return rtf.format(-diffHour, "hour")
  const diffDay = Math.floor(diffHour / 24)
  return rtf.format(-diffDay, "day")
}

const formatTimestampShort = (iso?: string | null) => {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const datePart = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  const timePart = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${datePart} ${timePart}`
}

const formatLastSeenDisplay = (iso?: string | null) => {
  if (!iso) return "—"
  const relative = formatRelativeTime(iso)
  const absolute = formatTimestampShort(iso)
  return absolute ? `${relative} · ${absolute}` : relative
}

const formatTimeSafe = (iso?: string | null) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

const ALL_STORES_VALUE = "all"
const CEO_PERIOD: "day" | "7d" = "day"
type DashboardMetricGovernance = MetricGovernanceItem

const governanceStyles: Record<string, string> = {
  official: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proxy: "bg-amber-50 text-amber-700 border-amber-200",
  estimated: "bg-slate-50 text-slate-700 border-slate-200",
  unsupported: "bg-rose-50 text-rose-700 border-rose-200",
}

const GovernanceBadge = ({ item }: { item?: DashboardMetricGovernance | null }) => {
  if (!item) return null
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
        governanceStyles[item.metric_status]
      }`}
    >
      {item.label ?? item.metric_status}
    </span>
  )
}


const Dashboard = () => {
  const { user, authReady, isAuthenticated } = useAuth()
  const location = useLocation()
  const initialParams = new URLSearchParams(location.search)
  const initialStoreFromQuery =
    initialParams.get("store") ||
    initialParams.get("store_id") ||
    ""
  const initialOpenEdgeSetup = initialParams.get("openEdgeSetup") === "1"
  const [selectedStoreOverride, setSelectedStoreOverride] = useState<string>(
    initialStoreFromQuery || ALL_STORES_VALUE
  )
  const [resolvingEventId, setResolvingEventId] = useState<string | null>(null)
  const [ignoringEventId, setIgnoringEventId] = useState<string | null>(null)
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(initialOpenEdgeSetup)

  const canFetchAuth = authReady && isAuthenticated

  const { data: stores, isLoading: storesLoading } = useQuery<StoreSummary[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      try {
        return await storesService.getStoresSummary()
      } catch (error) {
        console.warn("⚠️ Falha ao buscar stores summary. Usando view=min.", error)
        const cachedSummary = storesService.getCachedStoresSummary()
        if (cachedSummary?.length) {
          return cachedSummary
        }
        const minimal = await storesService.getStoresMinimal()
        return minimal.map((store) => ({
          id: store.id,
          name: store.name,
          status: null,
          blocked_reason: null,
          trial_ends_at: null,
          plan: null,
          role: null,
        }))
      }
    },
    staleTime: 60000,
    enabled: canFetchAuth,
  })

  const selectedStore = useMemo(() => {
    if (selectedStoreOverride && selectedStoreOverride !== ALL_STORES_VALUE) {
      return selectedStoreOverride
    }
    if ((stores ?? []).length === 1) {
      return stores?.[0]?.id ?? ALL_STORES_VALUE
    }
    return selectedStoreOverride || ALL_STORES_VALUE
  }, [selectedStoreOverride, stores])

  const selectedStoreItem = useMemo(
    () => (stores ?? []).find((s) => s.id === selectedStore) ?? null,
    [stores, selectedStore]
  )
  const selectedStoreStatus = selectedStoreItem?.status ?? null
  const isTrialCeoMode =
    selectedStore !== ALL_STORES_VALUE && selectedStoreStatus === "trial"

  const { data: meStatus } = useQuery({
    queryKey: ["me-status-dashboard"],
    queryFn: () => meService.getStatus(),
    enabled: canFetchAuth,
    staleTime: 60000,
    retry: false,
  })

  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
  } = useQuery<StoreDashboard>({
    queryKey: ["store-dashboard", selectedStore],
    queryFn: () => storesService.getStoreDashboard(selectedStore),
    enabled: canFetchAuth && selectedStore !== ALL_STORES_VALUE && !isTrialCeoMode,
    staleTime: 30000,
    retry: false,
  })
  const trialBlockedStore = useMemo(() => {
    return (stores ?? []).find(
      (s) => s.status === "blocked" && s.blocked_reason === "trial_expired"
    ) ?? null
  }, [stores])

  const trialEndsAtLabel = useMemo(() => {
    if (!trialBlockedStore?.trial_ends_at) return null
    try {
      return new Date(trialBlockedStore.trial_ends_at).toLocaleString("pt-BR")
    } catch {
      return null
    }
  }, [trialBlockedStore])

  const isTrialBlocked = Boolean(trialBlockedStore)

  const {
    data: edgeStatus,
    isLoading: edgeStatusLoading,
  } = useQuery<StoreEdgeStatus>({
    queryKey: ["store-edge-status", selectedStore],
    queryFn: () => storesService.getStoreEdgeStatus(selectedStore),
    enabled: canFetchAuth && selectedStore !== ALL_STORES_VALUE,
    refetchInterval: (query) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return 30000
      }
      if (query.state.status !== "success") {
        return 10000
      }
      const data = query.state.data as StoreEdgeStatus | undefined
      if (!data?.online) return 10000
      return edgeSetupOpen ? 10000 : 15000
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
    refetchOnMount: "always",
    retry: false,
  })
  const selectedStoreRole = selectedStoreItem?.role ?? null
  const canManageStore = selectedStoreRole
    ? ["owner", "admin", "manager"].includes(selectedStoreRole)
    : true
  const storesOnlineCount = (stores ?? []).filter((store) => store.status === "active").length
  const storesOfflineCount = (stores ?? []).filter(
    (store) => store.status === "blocked" || store.status === "inactive"
  ).length
  const storesAttentionCount = (stores ?? []).filter((store) => store.status === "trial").length
  const filterDashboardByStoreStatus = (status: "active" | "blocked" | "inactive" | "trial") => {
    const firstMatch = (stores ?? []).find((store) =>
      status === "blocked"
        ? store.status === "blocked" || store.status === "inactive"
        : store.status === status
    )
    setSelectedStoreOverride(firstMatch?.id ?? ALL_STORES_VALUE)
  }
  const storeLastSeenAt = null
  const lastSeenAt = storeLastSeenAt ?? getLastSeenAt(edgeStatus)
  const edgeConnectivityStatus = getConnectivityStatus(edgeStatus)
  const isEdgeConnected =
    edgeConnectivityStatus === "online" ||
    edgeConnectivityStatus === "degraded" ||
    isRecentTimestamp(lastSeenAt, ONLINE_MAX_AGE_SEC)
  const selectedStorePlan =
    selectedStoreItem?.plan ??
    (meStatus?.has_subscription
      ? "paid"
      : selectedStoreStatus === "trial" || meStatus?.trial_active
      ? "trial"
      : null)
  const selectedStoreOwner = user?.email || null

  const { data: storeLimits } = useQuery({
    queryKey: ["store-limits", selectedStore],
    queryFn: () => camerasService.getStoreLimits(selectedStore),
    enabled: canFetchAuth && Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE),
    retry: false,
  })

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useAlertsEvents({
    store_id: selectedStore === ALL_STORES_VALUE ? undefined : selectedStore,
    status: "open",
  }, {
    enabled: canFetchAuth && Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE),
    retry: false,
  })

  const {
    data: ceoDashboard,
    isLoading: ceoLoading,
    error: ceoErrorRaw,
  } = useQuery<StoreCeoDashboard>({
    queryKey: ["store-ceo-dashboard", selectedStore, CEO_PERIOD],
    queryFn: () => storesService.getStoreCeoDashboard(selectedStore, { period: CEO_PERIOD }),
    enabled: canFetchAuth && isTrialCeoMode,
    staleTime: 30000,
    retry: 1,
  })
  const ceoError =
    ceoErrorRaw instanceof Error ? ceoErrorRaw.message : null

  const resolveEvent = useResolveEvent()
  const ignoreEvent = useIgnoreEvent()

  const shouldFetchOnboardingNextStep =
    canFetchAuth && !storesLoading && selectedStore !== ALL_STORES_VALUE
  const {
    data: onboardingNextStep,
    isLoading: onboardingNextStepLoading,
    error: onboardingNextStepErrorRaw,
  } = useQuery<OnboardingNextStepResponse | null>({
    queryKey: ["onboarding-next-step", selectedStore],
    queryFn: () =>
      onboardingService.getNextStep(
        selectedStore !== ALL_STORES_VALUE ? selectedStore : undefined
      ),
    enabled: shouldFetchOnboardingNextStep,
    staleTime: 30000,
    retry: false,
  })
  const onboardingNextStepError =
    onboardingNextStepErrorRaw instanceof Error
      ? onboardingNextStepErrorRaw.message
      : null

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("openEdgeSetup") === "1") {
      params.delete("openEdgeSetup")
      params.delete("store")
      const next = params.toString()
      const newUrl = `${location.pathname}${next ? `?${next}` : ""}`
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", newUrl)
      }
    }
  }, [location.pathname, location.search])

  const onboardingStage = onboardingNextStep?.stage || null
  const nextStepCta = useMemo(() => {
    if (!canManageStore) return null
    if (!onboardingNextStep?.cta_url || !onboardingNextStep?.cta_label) return null
    return { label: onboardingNextStep.cta_label, href: onboardingNextStep.cta_url }
  }, [canManageStore, onboardingNextStep])

  const health = onboardingNextStep?.health
  const camerasTotal = health?.cameras_total ?? edgeStatus?.cameras_total ?? 0
  const camerasOnline = health?.cameras_online ?? edgeStatus?.cameras_online ?? 0
  const camerasOffline = health?.cameras_offline ?? Math.max(camerasTotal - camerasOnline, 0)
  const camerasLimit = storeLimits?.limits?.cameras ?? 3
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [selectedEvidenceHour, setSelectedEvidenceHour] = useState<string | null>(null)
  const openEvidence = (hourLabel?: string | null) => {
    setSelectedEvidenceHour(hourLabel || null)
    setEvidenceOpen(true)
  }

  const closeEvidence = () => {
    setEvidenceOpen(false)
  }

  const ceoFlow = ceoDashboard?.series?.flow_by_hour ?? []
  const ceoIdle = ceoDashboard?.series?.idle_index_by_hour ?? []
  const ceoGovernance = ceoDashboard?.meta?.metric_governance ?? {}
  const maxFootfall = ceoFlow.length
    ? Math.max(...ceoFlow.map((item) => item.footfall), 1)
    : 1
  const maxIdle = ceoIdle.length
    ? Math.max(...ceoIdle.map((item) => item.idle_index), 1)
    : 1
  const ceoPeakIdle = ceoIdle.reduce(
    (acc, cur) => (cur.idle_index > acc.idle_index ? cur : acc),
    { idle_index: -1, ts_bucket: null, staff_active_est: 0, footfall: 0 }
  )

  const {
    data: evidenceData,
    isLoading: evidenceLoading,
    error: evidenceErrorRaw,
  } = useQuery<StoreEvidenceResponse>({
    queryKey: ["store-evidence", selectedStore, selectedEvidenceHour],
    queryFn: () =>
      storesService.getProductivityEvidence(
        selectedStore,
        selectedEvidenceHour || ""
      ),
    enabled:
      evidenceOpen &&
      Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE && selectedEvidenceHour),
    staleTime: 30000,
    retry: 1,
  })
  const evidenceError =
    evidenceErrorRaw instanceof Error ? evidenceErrorRaw.message : null
  const icons = {
    health: (
      <svg
        className="w-6 h-6 text-green-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    productivity: (
      <svg
        className="w-6 h-6 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    visitors: (
      <svg
        className="w-6 h-6 text-purple-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    conversion: (
      <svg
        className="w-6 h-6 text-yellow-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    cart: (
      <svg
        className="w-6 h-6 text-indigo-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    idle: (
      <svg
        className="w-6 h-6 text-red-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  }

  const edgeStatusLabel = isEdgeConnected ? "Online" : "Offline"

  const edgeStatusClass = isEdgeConnected
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-800"
  const selectedStoreStatusLabel =
    selectedStoreStatus === "active"
      ? "Ativa"
      : selectedStoreStatus === "trial"
      ? "Trial"
      : selectedStoreStatus === "blocked"
      ? "Bloqueada"
      : "Inativa"
  const selectedStoreStatusClass =
    selectedStoreStatus === "active"
      ? "bg-green-100 text-green-800"
      : selectedStoreStatus === "trial"
      ? "bg-yellow-100 text-yellow-800"
      : selectedStoreStatus === "blocked"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800"

  const hasOperationalData = Boolean(
    dashboard?.metrics?.visitor_flow ||
      dashboard?.metrics?.conversion_rate ||
      dashboard?.metrics?.productivity ||
      dashboard?.insights?.peak_hour ||
      ceoDashboard?.series?.flow_by_hour?.length ||
      ceoDashboard?.series?.idle_index_by_hour?.length
  )

  // Regra central: estado comercial da conta + estado operacional da loja definem a experiência.
  const dashboardExperience = getDashboardExperience({
    meStatus,
    stores,
    selectedStore: selectedStoreItem,
    edgeStatus,
    onboarding: onboardingNextStep,
    hasOperationalData,
    camerasOnline,
  })

  type TrialUiState = "not_started" | "activation" | "collecting" | "report_ready"
  const trialUiState: TrialUiState =
    dashboardExperience.dashboardType !== "trial"
      ? "report_ready"
      : onboardingStage === "no_store"
      ? "not_started"
      : onboardingStage === "active"
      ? "report_ready"
      : onboardingStage === "collecting_data"
      ? "collecting"
      : "activation"

  const trialCollectedHours = (() => {
    if (trialUiState === "not_started") return 0
    if (trialUiState === "report_ready") return 72
    if (trialUiState === "activation") {
      return Math.min(18, (isEdgeConnected ? 6 : 0) + camerasOnline * 4)
    }
    return Math.min(71, Math.max(24, 24 + camerasOnline * 6 + (events?.length ?? 0)))
  })()
  const trialProgressPct = Math.max(0, Math.min(100, Math.round((trialCollectedHours / 72) * 100)))
  const trialHoursRemaining = Math.max(0, 72 - trialCollectedHours)
  const trialEtaText =
    dashboardExperience.dashboardType === "trial"
      ? trialUiState === "report_ready"
        ? "Relatório operacional liberado"
        : `Relatório operacional liberado em aproximadamente ${trialHoursRemaining}h`
      : dashboardExperience.dashboardType === "paid_setup"
      ? "Conclua a implantação da loja para liberar visão operacional completa."
      : "Operação consolidada com atualização contínua de insights."

  const trialHeroTitle =
    dashboardExperience.dashboardType === "trial"
      ? `Trial em andamento — ${trialCollectedHours}h de 72h concluídas`
      : dashboardExperience.dashboardType === "paid_setup"
      ? "Visão da rede em evolução"
      : "Visão executiva da rede em tempo real"

  const trialHeroSubtitle =
    dashboardExperience.dashboardType === "trial"
      ? trialUiState === "not_started"
        ? "Vamos iniciar a leitura da sua loja para gerar um diagnóstico operacional completo."
        : trialUiState === "activation"
        ? "Estamos conectando os sinais operacionais da loja para iniciar a leitura executiva."
        : "Estamos analisando fluxo, filas e padrões de atendimento com inteligência contínua."
      : dashboardExperience.dashboardType === "paid_setup"
      ? "Seu plano está ativo. Estamos consolidando a leitura da rede para liberar visão plena da operação."
      : "Acompanhe desempenho, risco e prioridade das lojas com foco em resultado operacional."

  const metricValueOrState = (
    value: number | null | undefined,
    format: (v: number) => string
  ) => {
    if (typeof value === "number" && value > 0) return format(value)
    if (dashboardExperience.dashboardType === "paid_executive") return "Disponível"
    if (trialUiState === "collecting") return "Em calibração"
    if (trialUiState === "activation" || dashboardExperience.dashboardType === "paid_setup")
      return "Coleta inicial"
    return "Aguardando ativação"
  }

  const metricSubtitleByState =
    dashboardExperience.dashboardType === "paid_executive"
      ? "Indicador consolidado para gestão"
      : dashboardExperience.dashboardType === "paid_setup"
      ? "Disponível após concluir implantação operacional"
      : trialUiState === "collecting"
      ? "Estamos consolidando este indicador"
      : trialUiState === "activation"
      ? "Disponível após validação da operação"
      : "Será liberado após iniciar o trial"

  const trialChecklist = [
    { label: "Loja conectada", done: selectedStore !== ALL_STORES_VALUE },
    { label: "Edge ativo", done: isEdgeConnected },
    { label: "Coleta inicial concluída", done: trialCollectedHours >= 24 },
    {
      label: "Visão executiva habilitada",
      done: trialUiState === "report_ready" || dashboardExperience.dashboardType === "paid_executive",
    },
  ]

  const shouldShowTrialArtifacts = dashboardExperience.dashboardType === "trial"
  const shouldShowPaidSetupArtifacts = dashboardExperience.dashboardType === "paid_setup"
  const shouldShowExecutiveArtifacts = dashboardExperience.dashboardType === "paid_executive"
  const openCopilot = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", prompt ? { detail: { prompt } } : undefined)
    )
  }

  const copilotPrompts = shouldShowExecutiveArtifacts
    ? [
        "Quais lojas exigem ação imediata hoje?",
        "Onde estamos perdendo conversão na rede?",
        "Qual priorização operacional para esta semana?",
        "Como reduzir fila sem aumentar custo de equipe?",
        "Qual insight mais acionável agora?",
      ]
    : [
        "Como está o progresso do meu trial?",
        "O que falta para liberar meu relatório?",
        "Quais indicadores vocês já conseguem analisar?",
        "Como melhorar a conversão da minha loja?",
        "Qual o próximo passo mais importante agora?",
      ]

  const operationalInsights = [
    isEdgeConnected
      ? "Operação ativa e sincronizando dados de desempenho da loja."
      : "Operação interrompida no momento. Retome a conexão para continuar o diagnóstico.",
    camerasOnline > 0
      ? `Já temos ${camerasOnline} câmera(s) válidas para leitura de fluxo e atendimento.`
      : shouldShowTrialArtifacts
      ? "Ainda não há câmera validada. Ative pelo menos uma câmera para acelerar o trial."
      : "Ainda não há câmera validada. Ative pelo menos uma câmera para concluir a implantação.",
    trialUiState === "collecting" || trialUiState === "report_ready"
      ? "Já existe base inicial para leitura de fluxo e comportamento de atendimento."
      : "Estamos calibrando a base da loja antes de consolidar os indicadores executivos.",
  ]
  const kpiItems = [
    {
      title: "Fluxo de Visitantes",
      value: metricValueOrState(dashboard?.metrics?.visitor_flow, (value) => `${value}`),
      icon: icons.visitors,
      color: "bg-violet-50",
      subtitle: metricSubtitleByState,
    },
    {
      title: "Taxa de Conversão",
      value: metricValueOrState(
        dashboard?.metrics?.conversion_rate,
        (value) => `${value.toFixed(1)}%`
      ),
      icon: icons.conversion,
      color: "bg-amber-50",
      subtitle: metricSubtitleByState,
    },
    {
      title: "Tempo Médio de Fila",
      value: metricValueOrState(
        isTrialCeoMode ? ceoDashboard?.kpis?.avg_queue_seconds : null,
        (value) => `${Math.max(1, Math.round(value / 60))} min`
      ),
      icon: icons.health,
      color: "bg-emerald-50",
      subtitle: metricSubtitleByState,
    },
    {
      title: "Tempo Ocioso Estimado",
      value: metricValueOrState(dashboard?.metrics?.idle_time, (value) => `${value} min`),
      icon: icons.idle,
      color: "bg-rose-50",
      subtitle: metricSubtitleByState,
    },
    {
      title: "Score de Saúde Operacional",
      value: metricValueOrState(
        dashboard?.metrics?.health_score,
        (value) => `${Math.round(value)}`
      ),
      icon: icons.health,
      color: "bg-green-50",
      subtitle: metricSubtitleByState,
    },
    {
      title: "Produtividade",
      value: metricValueOrState(
        dashboard?.metrics?.productivity,
        (value) => `${Math.round(value)}`
      ),
      icon: icons.productivity,
      color: "bg-sky-50",
      subtitle: metricSubtitleByState,
    },
  ]

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (stores && stores.length === 0) {
    if (onboardingNextStepLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      )
    }
    if (onboardingNextStepError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
          Não foi possível carregar o onboarding. {onboardingNextStepError}
        </div>
      )
    }
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {onboardingNextStep?.title || "Nenhuma loja cadastrada"}
        </h3>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          {onboardingNextStep?.description ||
            "Crie sua primeira loja para visualizar o dashboard."}
        </p>
        {nextStepCta && (
          <Link
            to={nextStepCta.href}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center"
          >
            {nextStepCta.label}
          </Link>
        )}
      </div>
    )
  }

  if (isTrialBlocked) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Seu trial terminou
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                A loja{" "}
                <span className="font-semibold">
                  {trialBlockedStore?.name ?? "do trial"}
                </span>{" "}
                está bloqueada porque o período de teste acabou.
              </p>
              {trialEndsAtLabel && (
                <p className="text-xs text-gray-500 mt-2">
                  Expirou em: <span className="font-mono">{trialEndsAtLabel}</span>
                </p>
              )}
            </div>
            <div className="hidden sm:flex items-center justify-center rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 border border-red-200">
              Trial expirado
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              "Alertas em tempo real",
              "Relatórios e evidências",
              "Monitoramento multi-lojas",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/app/upgrade"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Assinar agora
            </Link>
            <button
              type="button"
              onClick={() =>
                window.open(
                  "https://api.whatsapp.com/send/?phone=5511996918070&text&type=phone_number&app_absent=0",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Falar com especialista
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header (mobile-first) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Dashboard da rede
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Olá, {user?.first_name || user?.username}. Aqui está sua operação hoje.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => filterDashboardByStoreStatus("active")}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                🟢 {storesOnlineCount} lojas online
              </button>
              <button
                type="button"
                onClick={() => filterDashboardByStoreStatus("blocked")}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
              >
                🔴 {storesOfflineCount} lojas offline
              </button>
              <button
                type="button"
                onClick={() => filterDashboardByStoreStatus("trial")}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
              >
                ⚠️ {storesAttentionCount} alertas ativos
              </button>
            </div>

            {selectedStoreItem && selectedStore !== ALL_STORES_VALUE && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${selectedStoreStatusClass}`}
                >
                  {selectedStoreStatusLabel}
                </span>

                <span className="text-xs sm:text-sm text-gray-600">
                  Plano: <span className="font-semibold">{selectedStorePlan || "—"}</span>
                </span>

                {selectedStoreOwner && (
                  <span className="text-xs sm:text-sm text-gray-500 truncate max-w-[220px]">
                    {selectedStoreOwner}
                  </span>
                )}
              </div>
            )}
          </div>

          {stores && stores.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor="store-select" className="text-gray-700 font-semibold text-sm">
                Loja
              </label>

              <div className="flex items-center gap-2">
                <select
                  id="store-select"
                  value={selectedStore}
                  onChange={(e) => setSelectedStoreOverride(e.target.value)}
                  className="w-full sm:w-[320px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoadingDashboard}
                  aria-label="Selecionar loja para visualizar dashboard"
                >
                  <option value={ALL_STORES_VALUE}>Todas as lojas</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>

                {isLoadingDashboard && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStore !== ALL_STORES_VALUE && (
        <section className="space-y-4 sm:space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-gray-800">
                Cobertura de câmeras
              </p>
              <button
                type="button"
                onClick={() => canManageStore && setEdgeSetupOpen(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Abrir assistente de conexão
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {camerasOnline} ativas · {camerasOffline} indisponíveis (Total: {camerasTotal} ·
              Limite do plano: {camerasLimit})
            </p>
          </div>

          <DashboardHeroSection
            dashboardType={dashboardExperience.dashboardType}
            storeName={selectedStoreItem?.name ?? "Loja selecionada"}
            title={trialHeroTitle}
            subtitle={trialHeroSubtitle}
            etaText={trialEtaText}
            trialCollectedHours={trialCollectedHours}
            trialProgressPct={trialProgressPct}
            accountState={dashboardExperience.accountState}
            networkState={dashboardExperience.networkState}
            canManageStore={canManageStore}
            onOpenSetup={() => setEdgeSetupOpen(true)}
            onOpenCopilot={() => openCopilot()}
          />

          <div className="space-y-2">
            <h2 className="text-[18px] font-semibold text-gray-900">
              {shouldShowExecutiveArtifacts
                ? "Métricas executivas da rede"
                : "Métricas que estamos começando a medir"}
            </h2>
            <p className="text-sm text-gray-600">
              {shouldShowExecutiveArtifacts
                ? "Visão consolidada para orientar decisões operacionais."
                : "Esses indicadores entram em evolução contínua conforme a operação amadurece."}
            </p>
          </div>
          <DashboardKpiStrip items={kpiItems} />

          {shouldShowTrialArtifacts ? (
            <TrialDashboardView
              trialUiState={trialUiState}
              trialChecklist={trialChecklist}
              operationalInsights={operationalInsights}
              copilotPrompts={copilotPrompts}
              canManageStore={canManageStore}
              onOpenSetup={() => setEdgeSetupOpen(true)}
              onOpenCopilot={openCopilot}
            />
          ) : shouldShowPaidSetupArtifacts ? (
            <PaidSetupDashboardView
              trialChecklist={trialChecklist}
              operationalInsights={operationalInsights}
              copilotPrompts={copilotPrompts}
              canManageStore={canManageStore}
              onOpenSetup={() => setEdgeSetupOpen(true)}
              onOpenCopilot={openCopilot}
            />
          ) : (
            <PaidExecutiveDashboardView
              stores={stores ?? []}
              copilotPrompts={copilotPrompts}
              onOpenCopilot={openCopilot}
            />
          )}
        </section>
      )}

      {selectedStore !== ALL_STORES_VALUE && (
        <div className="space-y-4 sm:space-y-6">
          {isTrialCeoMode && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                      Pulso da Produtividade (RH)
                    </h2>
                    <p className="text-sm text-gray-500">
                      Índice de ociosidade por hora (estimado).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEvidence(ceoPeakIdle?.ts_bucket || null)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Ver evidências
                  </button>
                </div>

                {ceoLoading ? (
                  <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                ) : ceoError ? (
                  <div className="text-sm text-red-600">{ceoError}</div>
                ) : ceoIdle.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    Calibrando leitura de ociosidade. Este indicador será liberado com mais horas de operação.
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
                    <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
                      {[0, 1, 2, 3].map((line) => (
                        <div key={line} className="border-t border-dashed border-slate-200/70" />
                      ))}
                    </div>
                    <div className="relative flex items-end gap-2 h-40 overflow-x-auto">
                      {ceoIdle.map((entry, idx) => {
                        const height = Math.max(10, Math.round((entry.idle_index / maxIdle) * 120))
                        return (
                          <button
                            key={`${entry.ts_bucket}-${idx}`}
                            type="button"
                            onClick={() => openEvidence(entry.ts_bucket || null)}
                            className="flex flex-col items-center gap-2 min-w-[26px] focus:outline-none"
                          >
                            <div
                              className="w-full rounded-md bg-amber-400/80"
                              style={{ height }}
                              title={`Ociosidade ${(entry.idle_index * 100).toFixed(0)}%`}
                            />
                            <span className="text-[10px] text-gray-500">
                              {ceoFlow.find((flow) => flow.ts_bucket === entry.ts_bucket)
                                ?.hour_label || "—"}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-gray-500">
                  Os dados apresentados são de apoio à gestão. Toda decisão disciplinar é de responsabilidade exclusiva do cliente, conforme Termos de Uso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-500">Tempo médio na fila</div>
                    <GovernanceBadge item={ceoGovernance.avg_queue_seconds} />
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mt-2">
                    {ceoDashboard ? `${Math.round(ceoDashboard.kpis.avg_queue_seconds / 60)}m` : "—"}
                  </div>
                  {ceoGovernance.avg_queue_seconds && (
                    <div className="text-[11px] text-gray-400 mt-1">
                      Método: {ceoGovernance.avg_queue_seconds.source_method}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-500">Pessoas na fila agora</div>
                    <GovernanceBadge item={ceoGovernance.queue_now_people} />
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mt-2">
                    {ceoDashboard ? ceoDashboard.kpis.queue_now_people : "—"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Estimativa baseada no último bucket
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="text-sm font-semibold text-gray-800">
                    Pulso do Fluxo
                  </div>
                  <GovernanceBadge item={ceoGovernance.flow_by_hour} />
                </div>
                {ceoLoading ? (
                  <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                ) : ceoFlow.length === 0 ? (
                  <div className="text-sm text-gray-500">Coletando fluxo inicial para consolidar este indicador.</div>
                ) : (
                  <div className="relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
                    <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
                      {[0, 1, 2, 3].map((line) => (
                        <div key={line} className="border-t border-dashed border-slate-200/70" />
                      ))}
                    </div>
                    <div className="relative flex items-end gap-2 h-40 overflow-x-auto">
                      {ceoFlow.map((entry, idx) => (
                        <div key={`${entry.ts_bucket}-${idx}`} className="flex flex-col items-center gap-2 min-w-[26px]">
                          <div
                            className="w-full rounded-md bg-blue-500/80"
                            style={{
                              height: Math.max(10, Math.round((entry.footfall / maxFootfall) * 120)),
                            }}
                            title={`${entry.hour_label} · ${entry.footfall}`}
                          />
                          <span className="text-[10px] text-gray-500">{entry.hour_label || "—"}</span>
                        </div>
                      ))}
                    </div>
                    {ceoDashboard?.overlay?.message && (
                      <div className="mt-3 text-xs text-gray-500">
                        {ceoDashboard.overlay.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isTrialCeoMode && (
            <InfrastructureSection
              edgeStatusLoading={edgeStatusLoading}
              edgeStatus={edgeStatus}
              edgeStatusLabel={edgeStatusLabel}
              edgeStatusClass={edgeStatusClass}
              lastSeenLabel={formatLastSeenDisplay(lastSeenAt)}
            />
          )}

          <AlertsSection
            storeSelected={Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE)}
            eventsLoading={eventsLoading}
            eventsError={eventsError}
            events={events}
            resolvingEventId={resolvingEventId}
            ignoringEventId={ignoringEventId}
            formatTimeSafe={formatTimeSafe}
            onResolveEvent={(eventId) => {
              setResolvingEventId(eventId)
              resolveEvent.mutate(eventId, {
                onSettled: () => setResolvingEventId(null),
              })
            }}
            onIgnoreEvent={(eventId) => {
              setIgnoringEventId(eventId)
              ignoreEvent.mutate(eventId, {
                onSettled: () => setIgnoringEventId(null),
              })
            }}
          />
        </div>
      )}

      {selectedStore !== ALL_STORES_VALUE && (
        <OperationalDiagnosisSection
          isLoading={isLoadingDashboard}
          reportReady={trialUiState === "report_ready"}
          peakHour={dashboard?.insights?.peak_hour}
          trialHoursRemaining={trialHoursRemaining}
        />
      )}
      {evidenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Evidências do pico de ociosidade
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedEvidenceHour
                    ? `Horário selecionado: ${new Date(selectedEvidenceHour).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                    : "Horário selecionado"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEvidence}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {evidenceLoading ? (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : evidenceError ? (
              <div className="mt-6 text-sm text-red-600">{evidenceError}</div>
            ) : (evidenceData?.events?.length ?? 0) === 0 ? (
              <div className="mt-6 text-sm text-gray-500">
                Nenhum evento registrado. Evidências reais aparecem após ativar CV.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {evidenceData?.events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="relative aspect-video bg-slate-200">
                      <div className="absolute inset-0 bg-slate-300 blur-md" />
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-600 text-center px-3">
                        Evidência disponível após ativar CV
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-gray-400">
                        {formatTimeSafe(event.occurred_at)}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 mt-1 line-clamp-2">
                        {event.title}
                      </div>
                      <div className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                        {event.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <EdgeSetupModal
        open={edgeSetupOpen && canManageStore}
        onClose={() => setEdgeSetupOpen(false)}
        defaultStoreId={selectedStore !== ALL_STORES_VALUE ? selectedStore : ""}
      />
    </div>
  )
}

export default Dashboard
