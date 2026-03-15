import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import { useAuth } from "../../contexts/useAuth"
import {
  storesService,
  type MetricGovernanceItem,
  type NetworkDashboard,
  type NetworkVisionIngestionSummary,
  type StoreAnalyticsSummary,
  type StoreSummary,
  type StoreEdgeStatus,
  type StoreCeoDashboard,
  type StoreEvidenceResponse,
} from "../../services/stores"
import type { StoreDashboard } from "../../types/dashboard"
import { camerasService } from "../../services/cameras"
import { alertsService } from "../../services/alerts"
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
import { DashboardKpiStrip } from "./views/DashboardKpiStrip"
import { InfrastructureSection } from "./views/InfrastructureSection"
import { AlertsSection } from "./views/AlertsSection"

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

const formatCurrencyBRL = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })

const parseMaybeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const normalizePlanCode = (plan?: string | null) => {
  if (!plan) return null
  const value = plan.toLowerCase()
  if (value === "trial" || value === "free") return "trial"
  if (value === "basic" || value === "start" || value === "starter" || value === "paid") return "start"
  if (value === "pro") return "pro"
  if (value === "growth") return "growth"
  if (value === "enterprise" || value === "entreprise") return "enterprise"
  return value
}

const PLAN_CAMERA_LIMITS: Record<string, number | null> = {
  trial: 3,
  free: 3,
  start: 3,
  basic: 3,
  paid: 3,
  pro: 12,
  growth: null,
  enterprise: null,
  entrepise: null,
}

const ALL_STORES_VALUE = "all"
const CEO_PERIOD: "day" | "7d" = "day"
type DashboardMetricGovernance = MetricGovernanceItem
type NetworkPeriod = "day" | "7d" | "30d"
type IngestionEventTypeFilter = "" | "queue_length" | "staff_detected" | "person_enter" | "sale_completed" | "zone_dwell"

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

const trustStyles: Record<"official" | "proxy" | "estimated", string> = {
  official: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proxy: "bg-amber-50 text-amber-700 border-amber-200",
  estimated: "bg-slate-50 text-slate-700 border-slate-200",
}

const normalizeTrustStatus = (value?: string | null): "official" | "proxy" | "estimated" => {
  const normalized = String(value || "").toLowerCase()
  if (normalized === "official") return "official"
  if (normalized === "proxy" || normalized === "manual") return "proxy"
  return "estimated"
}

const TrustBadge = ({ status }: { status?: string | null }) => {
  const normalized = normalizeTrustStatus(status)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${trustStyles[normalized]}`}
    >
      {normalized}
    </span>
  )
}

const getGreetingByHour = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

const networkPeriodOptions: Array<{ value: NetworkPeriod; label: string }> = [
  { value: "day", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
]

const ingestionEventFilterOptions: Array<{ value: IngestionEventTypeFilter; label: string }> = [
  { value: "", label: "Todos eventos" },
  { value: "queue_length", label: "Fila" },
  { value: "staff_detected", label: "Staff detectado" },
  { value: "person_enter", label: "Entrada de pessoas" },
  { value: "sale_completed", label: "Checkout/Sale" },
  { value: "zone_dwell", label: "Permanência em zona" },
]


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
  const [delegatingEventId, setDelegatingEventId] = useState<string | null>(null)
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(initialOpenEdgeSetup)
  const [networkPeriod, setNetworkPeriod] = useState<NetworkPeriod>("7d")
  const [networkIngestionEventType, setNetworkIngestionEventType] = useState<IngestionEventTypeFilter>("")

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
    return selectedStoreOverride || ALL_STORES_VALUE
  }, [selectedStoreOverride])
  const isNetworkMode = selectedStore === ALL_STORES_VALUE

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
    enabled: canFetchAuth && !isNetworkMode && !isTrialCeoMode,
    staleTime: 30000,
    retry: false,
  })
  const { data: metricsSummary } = useQuery<StoreAnalyticsSummary>({
    queryKey: ["store-metrics-summary-dashboard", selectedStore],
    queryFn: () =>
      storesService.getStoreAnalyticsSummary(selectedStore, {
        period: "7d",
        bucket: "hour",
      }),
    enabled: canFetchAuth && !isNetworkMode,
    staleTime: 30000,
    retry: false,
  })
  const { data: networkDashboard, isLoading: networkDashboardLoading } = useQuery<NetworkDashboard>({
    queryKey: ["network-dashboard-home"],
    queryFn: () => storesService.getNetworkDashboard(),
    enabled: canFetchAuth,
    staleTime: 30000,
    retry: false,
  })
  const { data: networkIngestionSummary } = useQuery<NetworkVisionIngestionSummary>({
    queryKey: ["network-vision-ingestion-summary-dashboard", networkIngestionEventType],
    queryFn: () =>
      storesService.getNetworkVisionIngestionSummary({
        event_source: "all",
        window_hours: 24,
        event_type: networkIngestionEventType || undefined,
      }),
    enabled: canFetchAuth && isNetworkMode,
    staleTime: 30000,
    retry: false,
  })
  const { data: networkReportSummary } = useQuery({
    queryKey: ["network-report-summary-dashboard", networkPeriod],
    queryFn: () => meService.getReportSummary(undefined, { period: networkPeriod }),
    enabled: canFetchAuth && isNetworkMode,
    staleTime: 30000,
    retry: false,
  })
  const { data: networkCoverageSummary } = useQuery({
    queryKey: ["network-coverage-dashboard", networkPeriod],
    queryFn: () => meService.getProductivityCoverage(undefined, { period: networkPeriod }),
    enabled: canFetchAuth && isNetworkMode,
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
    enabled: canFetchAuth && !isNetworkMode,
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
  const { data: storeLimits } = useQuery({
    queryKey: ["store-limits", selectedStore],
    queryFn: () => camerasService.getStoreLimits(selectedStore),
    enabled: canFetchAuth && Boolean(selectedStore && !isNetworkMode),
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
    enabled: canFetchAuth,
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
    canFetchAuth && !storesLoading && !isNetworkMode
  const {
    data: onboardingNextStep,
    isLoading: onboardingNextStepLoading,
    error: onboardingNextStepErrorRaw,
  } = useQuery<OnboardingNextStepResponse | null>({
    queryKey: ["onboarding-next-step", selectedStore],
    queryFn: () =>
      onboardingService.getNextStep(
        !isNetworkMode ? selectedStore : undefined
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
  const camerasOffline = Math.max(camerasTotal - camerasOnline, 0)
  const camerasLimit = storeLimits?.limits?.cameras ?? null
  const normalizedStoreLimitPlan = normalizePlanCode(storeLimits?.plan ?? null)
  const camerasLimitLabel =
    typeof camerasLimit === "number"
      ? String(camerasLimit)
      : normalizedStoreLimitPlan && normalizedStoreLimitPlan !== "trial"
      ? "Sem limite"
      : "—"
  const totalStoresCount = networkDashboard?.total_stores ?? stores?.length ?? 0
  const networkAlertsCount =
    networkDashboard?.stores?.reduce((acc, store) => {
      const value = typeof store.alerts === "number" ? store.alerts : 0
      return acc + value
    }, 0) ?? 0
  const activeEvents = useMemo(() => events ?? [], [events])
  const alertsActiveCount =
    isNetworkMode ? Math.max(networkAlertsCount, activeEvents.length) : activeEvents.length
  const inferredNetworkCamerasTotal = (stores ?? []).reduce((acc, store) => {
    const camerasCount = (store as StoreSummary & { cameras_count?: number }).cameras_count
    return acc + (typeof camerasCount === "number" ? camerasCount : 0)
  }, 0)
  const networkPlanLimit = (stores ?? []).reduce<number | null>((acc, store) => {
    const normalized = normalizePlanCode(store.plan ?? null)
    const limit = normalized ? PLAN_CAMERA_LIMITS[normalized] : null
    if (limit === null || limit === undefined) return null
    if (acc === null) return null
    return acc + limit
  }, 0)
  const coverageCamerasTotal =
    isNetworkMode ? inferredNetworkCamerasTotal : camerasTotal
  const coverageCamerasOnline =
    isNetworkMode
      ? null
      : camerasOnline
  const coverageCamerasOffline =
    isNetworkMode
      ? null
      : camerasOffline
  const coverageLimitLabel =
    isNetworkMode
      ? networkPlanLimit === null
        ? "Sob consulta"
        : String(networkPlanLimit)
      : camerasLimitLabel
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
    isNetworkMode
      ? networkDashboard?.total_visitors ||
        networkDashboard?.avg_conversion ||
        (networkDashboard?.stores?.length ?? 0) > 0
      : dashboard?.metrics?.visitor_flow ||
        dashboard?.metrics?.conversion_rate ||
        dashboard?.metrics?.productivity ||
        dashboard?.insights?.peak_hour ||
        metricsSummary?.totals?.total_visitors ||
        metricsSummary?.totals?.avg_conversion_rate ||
        metricsSummary?.totals?.avg_queue_seconds ||
        metricsSummary?.totals?.avg_staff_active ||
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
  const trialHoursRemaining = Math.max(0, 72 - trialCollectedHours)

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
  const metricSubtitleForValue = (value?: number | null) =>
    typeof value === "number" && value > 0
      ? "Leitura operacional baseada nos dados atuais"
      : metricSubtitleByState

  const summaryTotals = metricsSummary?.totals
  const avgIdleIndex =
    ceoIdle.length > 0
      ? ceoIdle.reduce((acc, item) => acc + (item.idle_index || 0), 0) / ceoIdle.length
      : null
  const computedVisitorFlow =
    (isNetworkMode ? networkDashboard?.total_visitors : summaryTotals?.total_visitors) ??
    dashboard?.metrics?.visitor_flow ??
    null
  const computedConversionRate =
    (isNetworkMode ? networkDashboard?.avg_conversion : summaryTotals?.avg_conversion_rate) ??
    dashboard?.metrics?.conversion_rate ??
    null
  const computedQueueSeconds =
    isNetworkMode
      ? null
      :
    (isTrialCeoMode ? ceoDashboard?.kpis?.avg_queue_seconds : null) ??
    summaryTotals?.avg_queue_seconds ??
    ceoDashboard?.kpis?.avg_queue_seconds ??
    null
  const computedProductivity =
    isNetworkMode
      ? null
      : summaryTotals?.avg_staff_active ?? dashboard?.metrics?.productivity ?? null
  const computedIdleMinutes =
    (isNetworkMode ? null : dashboard?.metrics?.idle_time) ??
    (typeof avgIdleIndex === "number" ? Math.round(avgIdleIndex * 60) : null)
  const computedHealthScore = (() => {
    if (dashboard?.metrics?.health_score && dashboard.metrics.health_score > 0) {
      return dashboard.metrics.health_score
    }
    if (
      typeof computedQueueSeconds !== "number" &&
      typeof computedVisitorFlow !== "number" &&
      typeof computedProductivity !== "number"
    ) {
      return null
    }
    const critical = activeEvents.filter((e) => String(e.severity).toLowerCase() === "critical").length
    const warning = activeEvents.filter((e) => String(e.severity).toLowerCase() === "warning").length
    const queuePenalty = typeof computedQueueSeconds === "number" ? Math.min(45, computedQueueSeconds / 15) : 0
    const incidentPenalty = critical * 12 + warning * 6
    const connectivityPenalty = isEdgeConnected ? 0 : 20
    return Math.max(0, Math.min(100, Math.round(100 - queuePenalty - incidentPenalty - connectivityPenalty)))
  })()

  const trialChecklist = [
    { label: "Loja conectada", done: !isNetworkMode },
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
  const copilotRecommendationNow = useMemo(() => {
    const orderedEvents = [...activeEvents].sort((a, b) => {
      const weight = (severity?: string) =>
        severity === "critical" ? 3 : severity === "warning" ? 2 : 1
      return weight(b.severity) - weight(a.severity)
    })
    const topEvent = orderedEvents[0]
    if (topEvent) {
      return {
        title: topEvent.title || "Evento operacional em aberto",
        action:
          topEvent.type === "queue_long"
            ? "Abrir segundo caixa e redistribuir equipe no pico."
            : topEvent.type === "staff_missing"
            ? "Reforçar cobertura no ponto de maior fluxo."
            : "Priorizar intervenção da liderança local nesta loja.",
        impact:
          topEvent.type === "queue_long"
            ? "Reduzir tempo médio de espera e risco de perda de venda."
            : "Mitigar impacto operacional e estabilizar atendimento.",
        storeId: String(topEvent.store_id),
      }
    }

    if (!isEdgeConnected) {
      return {
        title: "Conexão da loja interrompida",
        action: "Restabelecer conexão do Edge para retomar a leitura operacional.",
        impact: "Reativar visão da operação e recomendações em tempo real.",
        storeId: selectedStore,
      }
    }

    if (isNetworkMode) {
      const highestRiskStore = [...(networkDashboard?.stores ?? [])]
        .sort((a, b) => (b.alerts ?? 0) - (a.alerts ?? 0))[0]
      if (highestRiskStore?.id) {
        return {
          title: `${highestRiskStore.name} exige atenção imediata`,
          action: "Reforçar cobertura no pico e revisar fila com o gerente local.",
          impact: "Reduzir risco operacional e perda de conversão na rede.",
          storeId: highestRiskStore.id,
        }
      }
    }

    return {
      title: "Operação estável neste momento",
      action: "Revisar prioridades com o Copiloto para antecipar riscos do dia.",
      impact: "Manter consistência operacional e acelerar tomada de decisão.",
      storeId: selectedStore,
    }
  }, [activeEvents, isEdgeConnected, isNetworkMode, networkDashboard?.stores, selectedStore])
  const priorityActions = useMemo(() => {
    const ordered = [...activeEvents].sort((a, b) => {
      const weight = (severity?: string) =>
        severity === "critical" ? 3 : severity === "warning" ? 2 : 1
      return weight(b.severity) - weight(a.severity)
    })
    const executiveEstimatedGap =
      parseMaybeNumber(
        (dashboard?.executive as { estimated_revenue_gap_brl?: unknown } | undefined)
          ?.estimated_revenue_gap_brl
      ) ?? null
    const fallbackImpactByAction =
      executiveEstimatedGap !== null && ordered.length > 0
        ? Math.round(executiveEstimatedGap / Math.max(ordered.length, 1))
        : null
    return ordered.slice(0, 3).map((event) => ({
      id: String(event.id),
      title: event.title || "Ação operacional",
      storeId: String(event.store_id),
      occurredAt: event.occurred_at,
      evidenceUrl: event.media?.[0]?.url || null,
      severity: String(event.severity || "info").toLowerCase(),
      expectedImpactBrl:
        parseMaybeNumber((event.metadata as { expected_impact_brl?: unknown } | undefined)?.expected_impact_brl) ??
        parseMaybeNumber((event.metadata as { revenue_risk_brl?: unknown } | undefined)?.revenue_risk_brl) ??
        fallbackImpactByAction,
      confidenceScore:
        parseMaybeNumber((event.metadata as { confidence_score?: unknown } | undefined)?.confidence_score) ?? null,
      impact:
        event.type === "queue_long"
          ? "Risco de perda de conversão em horário de pico."
          : event.type === "staff_missing"
          ? "Risco de queda na produtividade da equipe."
          : "Risco operacional aberto com potencial impacto em atendimento.",
      action:
        event.type === "queue_long"
          ? "Abrir segundo caixa no pico."
          : event.type === "staff_missing"
          ? "Reforçar cobertura da equipe."
          : "Atuar com liderança local.",
    }))
  }, [activeEvents, dashboard?.executive])

  const buildDelegationMessage = (action: {
    title: string
    impact: string
    action: string
    occurredAt?: string | null
    evidenceUrl?: string | null
  }) =>
    `Delegar ação operacional\n\nProblema: ${action.title}\nImpacto: ${action.impact}\nAção sugerida: ${
      action.action
    }\nHorário: ${action.occurredAt ? formatTimestampShort(action.occurredAt) : "agora"}\n${
      action.evidenceUrl ? `Evidência: ${action.evidenceUrl}` : "Evidência: disponível no dashboard"
    }`

  const handleDelegateWhatsapp = async (action: {
    id: string
    title: string
    impact: string
    action: string
    occurredAt?: string | null
    evidenceUrl?: string | null
    expectedImpactBrl?: number | null
    confidenceScore?: number | null
  }) => {
    setDelegatingEventId(action.id)
    try {
      const note = buildDelegationMessage(action)
      const response = await alertsService.delegateEventWhatsapp(action.id, {
        note,
        insight_id: `event-${action.id}`,
        source: "copilot_decision_center",
        expected_impact_brl:
          typeof action.expectedImpactBrl === "number" ? Math.max(0, action.expectedImpactBrl) : undefined,
        confidence_score:
          typeof action.confidenceScore === "number"
            ? Math.max(0, Math.min(100, Math.round(action.confidenceScore)))
            : undefined,
      })
      if (response?.ok) {
        toast.success(
          response?.employee?.name
            ? `Delegação enviada para ${response.employee.name}.`
            : "Delegação enviada para fila de entrega via WhatsApp."
        )
        return
      }
      throw new Error(response?.message || "Falha ao delegar")
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.employee_phone === "string" && payload.employee_phone) ||
        (typeof payload?.employee_id === "string" && payload.employee_id) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Delegação indisponível: vincule um telefone válido a um colaborador da loja."
      toast.error(message)
    } finally {
      setDelegatingEventId(null)
    }
  }

  const avgQueueSecondsForRoi =
    computedQueueSeconds ?? summaryTotals?.avg_queue_seconds ?? ceoDashboard?.kpis?.avg_queue_seconds ?? 0
  const avgVisitorsPerHour =
    ceoFlow.length > 0
      ? ceoFlow.reduce((acc, row) => acc + (row.footfall || 0), 0) / ceoFlow.length
      : summaryTotals?.total_visitors
      ? summaryTotals.total_visitors / (24 * 7)
      : 0
  const estimatedAbandonRate = Math.max(0, Math.min(0.35, (avgQueueSecondsForRoi - 180) / 1200))
  const estimatedLostCustomers = Math.round(avgVisitorsPerHour * estimatedAbandonRate * 8)
  const estimatedTicket = 85
  const estimatedRevenueGapComputed = Math.max(0, estimatedLostCustomers * estimatedTicket)
  const estimatedRevenueGap =
    dashboard?.executive?.estimated_revenue_gap_brl ?? estimatedRevenueGapComputed
  const criticalAlertsOpen =
    dashboard?.executive?.critical_alerts_open ??
    activeEvents.filter((e) => String(e.severity).toLowerCase() === "critical").length
  const networkHealthScore = (() => {
    const storeHealth = typeof computedHealthScore === "number" ? computedHealthScore : 0
    const healthFromNetwork =
      networkDashboard?.active_stores && networkDashboard.total_stores
        ? Math.round((networkDashboard.active_stores / Math.max(networkDashboard.total_stores, 1)) * 100)
        : null
    if (typeof healthFromNetwork === "number" && storeHealth > 0) {
      return Math.round((healthFromNetwork + storeHealth) / 2)
    }
    if (typeof healthFromNetwork === "number") return healthFromNetwork
    return storeHealth > 0 ? storeHealth : 0
  })()

  const executiveKpis = [
    {
      title: "Score de Saúde da Rede",
      value: networkHealthScore > 0 ? `${networkHealthScore}` : "—",
      subtitle: "Média operacional das lojas",
      tone: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      title: "Taxa de Conversão Real",
      value: computedConversionRate ? `${computedConversionRate.toFixed(1)}%` : "—",
      subtitle: "Visitantes x transações estimadas",
      tone: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      title: "Gap de Receita Estimado",
      value: estimatedRevenueGap > 0 ? formatCurrencyBRL(estimatedRevenueGap) : "—",
      subtitle: "Perda potencial por fila e ociosidade",
      tone: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      title: "Alertas Críticos Ativos",
      value: `${criticalAlertsOpen}`,
      subtitle: "Eventos críticos em aberto",
      tone: criticalAlertsOpen > 0 ? "text-rose-700" : "text-slate-700",
      bg: criticalAlertsOpen > 0 ? "bg-rose-50" : "bg-slate-50",
    },
  ] as const

  const rankingRows = (networkDashboard?.stores ?? [])
    .map((store) => {
      const efficiency = typeof store.health === "number" ? Math.round(store.health) : null
      const conversion = typeof store.conversion === "number" ? Number(store.conversion.toFixed(1)) : null
      return {
        id: store.id,
        name: store.name,
        efficiency,
        conversion,
        status: store.status,
      }
    })
    .sort((a, b) => (b.efficiency ?? -1) - (a.efficiency ?? -1))
  const storeNameById = useMemo(
    () =>
      new Map(
        (stores ?? []).map((store) => [store.id, store.name] as const)
      ),
    [stores]
  )
  const revenueAtRiskDay = Math.max(0, Math.round(estimatedRevenueGap))
  const conversionPreservedBRL = Math.max(0, Math.round(revenueAtRiskDay * 0.35))
  const staffEfficiencyBRL = Math.max(
    0,
    Math.round((networkCoverageSummary?.summary?.warning_windows ?? 0) * 140)
  )
  const coverageConfidenceScore = networkCoverageSummary?.confidence_governance?.score ?? 0
  const showConfidenceCalibrationFallback = isNetworkMode && coverageConfidenceScore > 0 && coverageConfidenceScore < 60
  const greeting = getGreetingByHour()
  const efficiencySubtitle =
    networkHealthScore > 0
      ? `Sua rede operou com ${networkHealthScore}% de eficiência na janela monitorada.`
      : "Estamos consolidando a eficiência operacional da rede."
  const pipelineStatus = networkIngestionSummary?.operational_summary?.pipeline_status || "no_signal"
  const pipelineStatusLabel =
    pipelineStatus === "healthy"
      ? "Pipeline saudável"
      : pipelineStatus === "stale"
      ? "Pipeline desatualizado"
      : "Sem sinal operacional"
  const pipelineStatusClass =
    pipelineStatus === "healthy"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : pipelineStatus === "stale"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-700 border-slate-200"

  const wealthCards = [
    {
      title: "Conversão Preservada",
      value: formatCurrencyBRL(conversionPreservedBRL),
      subtitle: "Valor recuperável por intervenções de atendimento.",
      tone: "text-emerald-700",
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      status: "estimated",
    },
    {
      title: "Eficiência de Staff",
      value: formatCurrencyBRL(staffEfficiencyBRL),
      subtitle: "Economia potencial por ajuste de cobertura.",
      tone: "text-indigo-700",
      border: "border-indigo-200",
      bg: "bg-indigo-50",
      status: "proxy",
    },
    {
      title: "Receita Sob Risco",
      value: formatCurrencyBRL(revenueAtRiskDay),
      subtitle: "Perda potencial atual por fila e baixa cobertura.",
      tone: revenueAtRiskDay > 0 ? "text-rose-700" : "text-slate-700",
      border: revenueAtRiskDay > 0 ? "border-rose-200" : "border-slate-200",
      bg: revenueAtRiskDay > 0 ? "bg-rose-50" : "bg-slate-50",
      status: "estimated",
    },
  ] as const

  const moneyLeakItems = useMemo(() => {
    const lossByType = new Map<
      string,
      { label: string; cause: string; loss: number; count: number }
    >()
    const eventLossBase = (eventType?: string) => {
      if (eventType === "queue_long") return 2100
      if (eventType === "staff_missing") return 1800
      if (eventType === "conversion_drop") return 2600
      return 900
    }
    const eventCause = (eventType?: string) => {
      if (eventType === "queue_long") return "Fila acima do ideal"
      if (eventType === "staff_missing") return "Cobertura de equipe insuficiente"
      if (eventType === "conversion_drop") return "Conversão abaixo da meta"
      return "Desvio operacional"
    }
    activeEvents.forEach((event) => {
      const type = String(event.type || "other")
      const current = lossByType.get(type)
      const severityFactor =
        String(event.severity || "").toLowerCase() === "critical" ? 1.3 : 1
      const loss = Math.round(eventLossBase(type) * severityFactor)
      if (!current) {
        lossByType.set(type, {
          label: type,
          cause: eventCause(type),
          loss,
          count: 1,
        })
      } else {
        current.loss += loss
        current.count += 1
      }
    })
    const list = [...lossByType.values()].sort((a, b) => b.loss - a.loss)
    return list.slice(0, 3)
  }, [activeEvents])
  const topStores = rankingRows.slice(0, 3)
  const bottomStores = [...rankingRows].reverse().slice(0, 3)
  const timelineItems = useMemo(
    () =>
      [...activeEvents]
        .sort((a, b) => {
          const at = new Date(a.occurred_at || a.created_at || 0).getTime()
          const bt = new Date(b.occurred_at || b.created_at || 0).getTime()
          return bt - at
        })
        .slice(0, 6),
    [activeEvents]
  )
  const projectedFlowNextHours = useMemo(() => {
    const baseFlow = Math.max(0, Math.round((computedVisitorFlow ?? 0) / 10))
    const criticalCount = activeEvents.filter(
      (event) => String(event.severity || "").toLowerCase() === "critical"
    ).length
    return [1, 2, 3].map((hour, idx) => ({
      hour,
      flow: Math.round(baseFlow * (1 + idx * 0.08)),
      queueMin: Math.max(3, Math.round((computedQueueSeconds ?? 240) / 60) + criticalCount + idx),
    }))
  }, [activeEvents, computedQueueSeconds, computedVisitorFlow])
  const networkReportKpis = networkReportSummary?.kpis
  const networkCoverageWindows = networkCoverageSummary?.windows ?? []
  const networkStaffDetectedAvg =
    networkCoverageWindows.length > 0
      ? Math.round(
          networkCoverageWindows.reduce((acc, window) => acc + (window.staff_detected_est || 0), 0) /
            Math.max(networkCoverageWindows.length, 1)
        )
      : null
  const realOperationMetrics = [
    {
      title: "Footfall consolidado",
      value: `${networkReportKpis?.total_visitors ?? computedVisitorFlow ?? 0}`,
      subtitle: "Visitantes no período operacional",
      status: networkReportSummary?.confidence_governance?.source_flags?.total_visitors || "official",
    },
    {
      title: "Fila média",
      value:
        typeof networkReportKpis?.avg_queue_seconds === "number"
          ? `${Math.max(1, Math.round(networkReportKpis.avg_queue_seconds / 60))} min`
          : "—",
      subtitle: "Tempo médio de espera da rede",
      status: networkReportSummary?.confidence_governance?.source_flags?.avg_queue_seconds || "estimated",
    },
    {
      title: "Staff detectado",
      value: networkStaffDetectedAvg !== null ? `${networkStaffDetectedAvg}` : "—",
      subtitle: "Presença média detectada por hora",
      status: networkCoverageSummary?.confidence_governance?.source_flags?.staff_detected_est || "estimated",
    },
    {
      title: "Alertas operacionais",
      value: `${alertsActiveCount}`,
      subtitle: "Eventos ativos na rede",
      status: "official",
    },
  ] as const
  const kpiItems = [
    {
      title: "Fluxo de Visitantes",
      value: metricValueOrState(computedVisitorFlow, (value) => `${value}`),
      icon: icons.visitors,
      color: "bg-violet-50",
      subtitle: metricSubtitleForValue(computedVisitorFlow),
    },
    {
      title: "Taxa de Conversão",
      value: metricValueOrState(computedConversionRate, (value) => `${value.toFixed(1)}%`),
      icon: icons.conversion,
      color: "bg-amber-50",
      subtitle: metricSubtitleForValue(computedConversionRate),
    },
    {
      title: "Tempo Médio de Fila",
      value: metricValueOrState(computedQueueSeconds, (value) => `${Math.max(1, Math.round(value / 60))} min`),
      icon: icons.health,
      color: "bg-emerald-50",
      subtitle: metricSubtitleForValue(computedQueueSeconds),
    },
    {
      title: "Tempo Ocioso Estimado",
      value: metricValueOrState(computedIdleMinutes, (value) => `${value} min`),
      icon: icons.idle,
      color: "bg-rose-50",
      subtitle: metricSubtitleForValue(computedIdleMinutes),
    },
    {
      title: "Score de Saúde Operacional",
      value: metricValueOrState(computedHealthScore, (value) => `${Math.round(value)}`),
      icon: icons.health,
      color: "bg-green-50",
      subtitle: metricSubtitleForValue(computedHealthScore),
    },
    {
      title: "Produtividade",
      value: metricValueOrState(computedProductivity, (value) => `${Math.round(value)}`),
      icon: icons.productivity,
      color: "bg-sky-50",
      subtitle: metricSubtitleForValue(computedProductivity),
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
          {onboardingNextStep?.title || "Você ainda não cadastrou nenhuma loja."}
        </h3>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          {onboardingNextStep?.description ||
            "Cadastre a primeira loja para começar a leitura executiva da rede."}
        </p>
        {nextStepCta && (
          <Link
            to={nextStepCta.href}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center"
          >
            Cadastrar primeira loja
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
              {greeting}, {user?.first_name || user?.username}! {efficiencySubtitle}
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
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                ⚠️ {alertsActiveCount} alertas ativos
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                🏬 {totalStoresCount} lojas cadastradas
              </span>
            </div>

            {selectedStoreItem && selectedStore !== ALL_STORES_VALUE && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${selectedStoreStatusClass}`}
                >
                  {selectedStoreStatusLabel}
                </span>
                <span className="text-xs sm:text-sm text-gray-600">{selectedStoreItem.name}</span>
              </div>
            )}
          </div>

          {stores && stores.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <label htmlFor="store-select" className="text-gray-700 font-semibold text-sm">
                Filtros
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                  id="store-select"
                  value={selectedStore}
                  onChange={(e) => setSelectedStoreOverride(e.target.value)}
                  className="w-full sm:w-[260px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isNetworkMode ? networkDashboardLoading : isLoadingDashboard}
                  aria-label="Selecionar loja para visualizar dashboard"
                >
                  <option value={ALL_STORES_VALUE}>Todas as Lojas</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                {isNetworkMode && (
                  <select
                    value={networkPeriod}
                    onChange={(e) => setNetworkPeriod(e.target.value as NetworkPeriod)}
                    className="w-full sm:w-[160px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Selecionar período da visão de rede"
                  >
                    {networkPeriodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {isNetworkMode && (
                  <select
                    value={networkIngestionEventType}
                    onChange={(e) => setNetworkIngestionEventType(e.target.value as IngestionEventTypeFilter)}
                    className="w-full sm:w-[180px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Filtrar saúde de ingestão por tipo de evento"
                  >
                    {ingestionEventFilterOptions.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {(isNetworkMode ? networkDashboardLoading : isLoadingDashboard) && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
                )}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {isNetworkMode ? (
            <div>
              <p className="text-sm font-semibold text-gray-800">Resumo executivo do período</p>
              <p className="mt-1 text-sm text-gray-600">
                Saúde {networkHealthScore}/100 · {alertsActiveCount} alertas ativos na rede
              </p>
              <p className="text-xs text-gray-500">
                Prioridade atual: {moneyLeakItems[0]?.cause || "Operação estável sem gargalo crítico"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${pipelineStatusClass}`}>
                  {pipelineStatusLabel}
                </span>
                <span className="text-[11px] text-gray-600">
                  {networkIngestionSummary?.operational_summary?.events_total ?? 0} eventos na janela de 24h
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {networkIngestionSummary?.operational_summary?.recommended_action ||
                  "Monitorando ingestão da rede para recomendações mais confiáveis."}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Materialização operacional:{" "}
                {networkIngestionSummary?.operational_summary?.operational_window?.status || "no_data"} ·
                cobertura {networkIngestionSummary?.operational_summary?.operational_window?.coverage_rate ?? 0}%
              </p>
              <div className="mt-3">
                <Link
                  to="/app/reports"
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Abrir relatório executivo
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Farol operacional da loja</p>
                <p className="mt-1 text-sm text-gray-600">
                  {coverageCamerasOnline === null || coverageCamerasOffline === null
                    ? "— ativas · — indisponíveis"
                    : `${coverageCamerasOnline} ativas · ${coverageCamerasOffline} indisponíveis`}
                </p>
                <p className="text-xs text-gray-500">
                  Total: {coverageCamerasTotal} · Limite do plano: {coverageLimitLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  canManageStore &&
                  selectedStore !== ALL_STORES_VALUE &&
                  setEdgeSetupOpen(true)
                }
                disabled={selectedStore === ALL_STORES_VALUE}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Abrir assistente de conexão
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="space-y-4 sm:space-y-6">
        {isNetworkMode ? (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {wealthCards.map((card) => (
                <article
                  key={card.title}
                  className={`rounded-2xl border ${card.border} ${card.bg} p-4 shadow-sm`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.title}</p>
                    <TrustBadge status={card.status} />
                  </div>
                  <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-gray-700">{card.subtitle}</p>
                </article>
              ))}
            </section>

            <section className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-slate-900 to-indigo-900 p-5 text-white shadow-sm">
              <div className="grid grid-cols-1 xl:grid-cols-10 gap-4">
                <div className="xl:col-span-7">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">1. Decision Center</p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight">{copilotRecommendationNow.title}</h2>
                  <p className="mt-2 text-sm text-slate-200">
                    <span className="font-semibold text-white">Onde agir:</span> {copilotRecommendationNow.action}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    <span className="font-semibold text-white">Impacto esperado:</span>{" "}
                    {revenueAtRiskDay > 0
                      ? `recuperar até ${formatCurrencyBRL(conversionPreservedBRL)} hoje`
                      : copilotRecommendationNow.impact}
                  </p>
                  <div className="mt-3">
                    <TrustBadge status="estimated" />
                  </div>
                </div>
                <div className="xl:col-span-3 rounded-xl border border-white/20 bg-white/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-100">
                    Ações rápidas
                  </p>
                  <div className="mt-3 space-y-2">
                    {priorityActions[0] ? (
                      <button
                        type="button"
                        onClick={() => handleDelegateWhatsapp(priorityActions[0])}
                        disabled={delegatingEventId === priorityActions[0].id}
                        className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-70"
                      >
                        {delegatingEventId === priorityActions[0].id
                          ? "Delegando..."
                          : "Delegar solução via WhatsApp"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white/80"
                      >
                        Sem ação crítica para delegar
                      </button>
                    )}
                    <Link
                      to="/app/cameras"
                      className="block w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-white/20"
                    >
                      Ver câmeras em tempo real
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        openCopilot(`Gerar plano de execução imediato para: ${copilotRecommendationNow.title}`)
                      }
                      className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                    >
                      Aprovar intervenção
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-indigo-100">
                    Receita em risco agora: {formatCurrencyBRL(revenueAtRiskDay)}
                  </p>
                </div>
              </div>
            </section>

            {showConfidenceCalibrationFallback && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">IA em fase de calibração</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Algumas métricas estão com confiança abaixo de 60%. O Copiloto segue monitorando até estabilizar os sinais da rede.
                    </p>
                  </div>
                  <TrustBadge status="estimated" />
                </div>
              </section>
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">2. Métricas reais da operação</h3>
                  <p className="text-sm text-gray-600 mt-1">Base operacional disponível hoje no backend.</p>
                </div>
                <Link
                  to="/app/reports"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ver análise histórica
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {realOperationMetrics.map((metric) => (
                  <article key={metric.title} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{metric.title}</p>
                      <TrustBadge status={metric.status} />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="mt-1 text-xs text-gray-600">{metric.subtitle}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">3. Saúde operacional</h3>
                  <p className="text-sm text-gray-600 mt-1">Leitura executiva combinando sinais oficiais e proxies.</p>
                </div>
                <TrustBadge status="proxy" />
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Score de saúde</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">{networkHealthScore}/100</p>
                  <p className="mt-1 text-xs text-emerald-700">Risco {networkHealthScore >= 75 ? "baixo" : networkHealthScore >= 55 ? "moderado" : "alto"} na operação.</p>
                </article>
                <article className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Conversão consolidada</p>
                    <TrustBadge status="proxy" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-amber-700">
                    {typeof computedConversionRate === "number" ? `${computedConversionRate.toFixed(1)}%` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">Proxy de checkout sobre fluxo de entrada.</p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Cobertura operacional</p>
                    <TrustBadge status={networkCoverageSummary?.confidence_governance?.source_flags?.coverage_gap || "estimated"} />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {networkCoverageSummary?.summary?.critical_windows ?? 0} janela(s) crítica(s)
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Gap total: {networkCoverageSummary?.summary?.gaps_total ?? 0} | Modo: {networkCoverageSummary?.summary?.planned_source_mode || "proxy"}
                  </p>
                </article>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">4. Money Leak Detector</h3>
                  <p className="text-sm text-gray-600 mt-1">Onde a rede está perdendo valor agora.</p>
                </div>
                <Link
                  to="/app/operations"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ver operação detalhada
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <TrustBadge status="estimated" />
                <TrustBadge status="proxy" />
              </div>
              {moneyLeakItems.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Sem perdas críticas abertas no momento. Continue monitorando a janela de pico.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {moneyLeakItems.map((item, index) => (
                    <article key={`${item.label}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{index + 1}. {item.cause}</p>
                        <p className="text-sm font-semibold text-rose-700">{formatCurrencyBRL(item.loss)}</p>
                      </div>
                      <p className="mt-1 text-xs text-gray-700">
                        {item.count} ocorrência(s) com impacto financeiro estimado.
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">5. Previsão operacional</h3>
                  <p className="text-sm text-gray-600 mt-1">Projeção de fluxo e fila para antecipar decisão.</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrustBadge status="proxy" />
                  <TrustBadge status="estimated" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {projectedFlowNextHours.map((entry) => (
                  <div key={entry.hour} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-sm text-gray-800">+{entry.hour}h</p>
                    <p className="text-sm text-gray-700">Fluxo esperado {entry.flow}</p>
                    <p className="text-sm font-semibold text-amber-700">Fila projetada {entry.queueMin} min</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">6. Ranking de lojas</h3>
                  <p className="text-sm text-gray-600 mt-1">Top e bottom performance para direcionar atuação da liderança.</p>
                </div>
                <TrustBadge status="proxy" />
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Top 3 lojas</p>
                  <div className="mt-2 space-y-2">
                    {topStores.map((row) => (
                      <div key={`top-${row.id}`} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
                        <p className="font-semibold text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-700">Eficiência {row.efficiency ?? "—"} · Conversão {row.conversion !== null ? `${row.conversion.toFixed(1)}%` : "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Bottom 3 lojas</p>
                  <div className="mt-2 space-y-2">
                    {bottomStores.map((row) => (
                      <div key={`bottom-${row.id}`} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm">
                        <p className="font-semibold text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-700">Eficiência {row.efficiency ?? "—"} · Conversão {row.conversion !== null ? `${row.conversion.toFixed(1)}%` : "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">7. Timeline do dia</h3>
                  <p className="text-sm text-gray-600 mt-1">Eventos de maior impacto para acompanhamento executivo.</p>
                </div>
                <Link
                  to="/app/alerts"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ver alertas completos
                </Link>
              </div>
              <div className="mt-3">
                <TrustBadge status="official" />
              </div>
              {timelineItems.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">Sem eventos críticos registrados hoje.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {timelineItems.map((event) => (
                    <div key={event.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900">{event.title || "Evento operacional"}</p>
                      <p className="text-xs text-gray-700 mt-1">
                        {storeNameById.get(String(event.store_id)) || "Loja da rede"} · {formatTimeSafe(event.occurred_at || event.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {executiveKpis.map((item) => (
                <article
                  key={item.title}
                  className={`rounded-2xl border border-gray-200 ${item.bg} p-5 shadow-sm`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.title}</p>
                  <p className={`mt-2 text-3xl font-bold ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-xs text-gray-600">{item.subtitle}</p>
                </article>
              ))}
            </div>
            <article className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                Recomendação do Dia
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-tight">{copilotRecommendationNow.title}</h2>
              <p className="mt-2 text-sm text-slate-200">
                <span className="font-semibold text-white">Ação:</span> {copilotRecommendationNow.action}
              </p>
              <p className="mt-1 text-sm text-slate-200">
                <span className="font-semibold text-white">Impacto:</span> {copilotRecommendationNow.impact}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={`/app/operations/stores/${copilotRecommendationNow.storeId}`}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-95"
                >
                  Abrir loja
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openCopilot(`Refine esta recomendação para execução imediata: ${copilotRecommendationNow.title}`)
                  }
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Revisar com Copiloto
                </button>
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Ações Prioritárias</h3>
                <p className="text-sm text-gray-600 mt-1">Gestão por exceção: resolver o que afeta resultado agora.</p>
              </div>
              <Link
                to="/app/operations"
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ver execução da rede
              </Link>
            </div>
            {priorityActions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Nenhuma ação crítica aberta agora. Recomendado revisar oportunidades com o Copiloto.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {priorityActions.map((action) => (
                  <article key={action.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          action.severity === "critical"
                            ? "bg-red-100 text-red-700"
                            : action.severity === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {action.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-700">
                      <span className="font-semibold">Impacto:</span> {action.impact}
                    </p>
                    <p className="mt-1 text-xs text-gray-700">
                      <span className="font-semibold">Ação:</span> {action.action}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        to={`/app/operations/stores/${action.storeId}`}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        Abrir loja
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelegateWhatsapp(action)}
                        disabled={delegatingEventId === action.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                      >
                        {delegatingEventId === action.id
                          ? "Delegando..."
                          : "Delegar para Gerente via WhatsApp"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openCopilot(`Qual plano de ação para: ${action.title}?`)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                      >
                        Orientar ação
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {!hasOperationalData ? (
            <section className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Carregando Inteligência</h3>
              <p className="mt-1 text-sm text-gray-700">
                {isNetworkMode
                  ? "Estamos iniciando a leitura operacional da sua rede. Assim que as lojas enviarem dados, os indicadores aparecerão aqui."
                  : "Estamos consolidando os sinais operacionais para liberar recomendações prescritivas com maior precisão."}
              </p>
            </section>
          ) : null}

          {!isNetworkMode && shouldShowTrialArtifacts && !hasOperationalData ? (
            <TrialDashboardView
              trialUiState={trialUiState}
              trialCollectedHours={trialCollectedHours}
              trialHoursRemaining={trialHoursRemaining}
              trialChecklist={trialChecklist}
              operationalInsights={operationalInsights}
              copilotPrompts={copilotPrompts}
              canManageStore={canManageStore}
              onOpenSetup={() => setEdgeSetupOpen(true)}
              onOpenCopilot={openCopilot}
            />
          ) : !isNetworkMode && shouldShowPaidSetupArtifacts && !hasOperationalData ? (
            <PaidSetupDashboardView
              setupState={
                trialUiState === "not_started"
                  ? "not_started"
                  : trialUiState === "activation"
                  ? "setup_in_progress"
                  : trialUiState === "collecting"
                  ? "collecting_data"
                  : "report_ready"
              }
              trialCollectedHours={trialCollectedHours}
              trialHoursRemaining={trialHoursRemaining}
              trialChecklist={trialChecklist}
              copilotPrompts={copilotPrompts}
              canManageStore={canManageStore}
              onOpenSetup={() => setEdgeSetupOpen(true)}
              onOpenCopilot={openCopilot}
            />
          ) : !isNetworkMode && hasOperationalData ? (
            <PaidExecutiveDashboardView
              stores={stores ?? []}
              copilotPrompts={copilotPrompts}
              onOpenCopilot={openCopilot}
            />
          ) : null}

          {rankingRows.length > 0 ? (
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Ranking de Performance</h3>
                  <p className="text-sm text-gray-600 mt-1">Comparativo por eficiência de equipe e conversão.</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Loja</th>
                      <th className="pb-2 pr-4 font-medium">Eficiência de equipe</th>
                      <th className="pb-2 pr-4 font-medium">Conversão</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rankingRows.slice(0, 8).map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-4 font-semibold text-gray-900">{row.name}</td>
                        <td className="py-2 pr-4 text-gray-700">{row.efficiency !== null ? `${row.efficiency}` : "—"}</td>
                        <td className="py-2 pr-4 text-gray-700">{row.conversion !== null ? `${row.conversion.toFixed(1)}%` : "—"}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <div className="space-y-2">
            <h2 className="text-[18px] font-semibold text-gray-900">
              Resumo de métricas executivas
            </h2>
            <p className="text-sm text-gray-600">
              Indicadores consolidados para apoiar decisão diária de gestão.
            </p>
          </div>
          <DashboardKpiStrip items={kpiItems} />
          </>
        )}
      </section>

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
            <>
              {!isNetworkMode && (
                <AlertsSection
                  storeSelected={Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE)}
                  storeName={selectedStoreItem?.name ?? null}
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
              )}
              {!isNetworkMode && (
                <InfrastructureSection
                  edgeStatusLoading={edgeStatusLoading}
                  edgeStatus={edgeStatus}
                  edgeStatusLabel={edgeStatusLabel}
                  edgeStatusClass={edgeStatusClass}
                  lastSeenLabel={formatLastSeenDisplay(lastSeenAt)}
                />
              )}
            </>
          )}
          {isTrialCeoMode && (
            <AlertsSection
              storeSelected={Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE)}
              storeName={selectedStoreItem?.name ?? null}
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
          )}
      </div>

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
