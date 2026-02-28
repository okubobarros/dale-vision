import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import { useAuth } from "../../contexts/useAuth"
import {
  storesService,
  type StoreSummary,
  type StoreEdgeStatus,
  type StoreCeoDashboard,
} from "../../services/stores"
import type { StoreDashboard } from "../../types/dashboard"
import { camerasService } from "../../services/cameras"
import { formatReason, formatTimestamp } from "../../utils/edgeReasons"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import {
  useAlertsEvents,
  useIgnoreEvent,
  useResolveEvent,
} from "../../queries/alerts.queries"
import SetupProgress from "../Onboarding/components/SetupProgress"
import { useIsMobile } from "../../hooks/useIsMobile"
import {
  onboardingService,
  type OnboardingNextStepResponse,
} from "../../services/onboarding"

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color: string
  subtitle?: string
}

const MetricCard = ({
  title,
  value,
  icon,
  trend,
  color,
  subtitle,
}: MetricCardProps) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow min-w-0">
    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>

      {trend !== undefined && (
        <span
          className={`text-xs sm:text-sm font-medium ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>

    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 break-words">
      {value}
    </h3>
    <p className="text-gray-700 font-semibold text-sm sm:text-base">{title}</p>
    {subtitle && (
      <p className="text-gray-400 text-xs sm:text-sm mt-1">{subtitle}</p>
    )}
  </div>
)


const ONLINE_MAX_AGE_SEC = 120

const isRecentTimestamp = (iso?: string | null, maxAgeSec = ONLINE_MAX_AGE_SEC) => {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const diffSec = (Date.now() - date.getTime()) / 1000
  return diffSec >= 0 && diffSec <= maxAgeSec
}

const getLastSeenAt = (status?: StoreEdgeStatus | null) =>
  status?.last_seen_at || status?.last_heartbeat_at || status?.last_heartbeat || null

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return "Nunca"
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
  if (!iso) return "Nunca"
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


const Dashboard = () => {
  const { user, authReady, isAuthenticated } = useAuth()
  const location = useLocation()
  const initialParams = new URLSearchParams(location.search)
  const initialStoreFromQuery = initialParams.get("store") || ""
  const initialOpenEdgeSetup = initialParams.get("openEdgeSetup") === "1"
  const initialFromOnboarding = (() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem("dv_from_onboarding") === "1"
    } catch {
      // ignore storage access issues
      return false
    }
  })()
  const [selectedStoreOverride, setSelectedStoreOverride] = useState<string>(
    initialStoreFromQuery || ALL_STORES_VALUE
  )
  const [resolvingEventId, setResolvingEventId] = useState<string | null>(null)
  const [ignoringEventId, setIgnoringEventId] = useState<string | null>(null)
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(initialOpenEdgeSetup)
  const [showActivationProgress, setShowActivationProgress] = useState(
    initialOpenEdgeSetup || initialFromOnboarding
  )
  const [activationBannerDismissed, setActivationBannerDismissed] = useState(false)
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const isMobile = useIsMobile(768)

  const canFetchAuth = authReady && isAuthenticated

  const { data: stores, isLoading: storesLoading } = useQuery<StoreSummary[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      try {
        return await storesService.getStoresSummary()
      } catch (error) {
        console.warn("⚠️ Falha ao buscar stores summary. Usando view=min.", error)
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

  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
    error: dashboardErrorRaw,
  } = useQuery<StoreDashboard>({
    queryKey: ["store-dashboard", selectedStore],
    queryFn: () => storesService.getStoreDashboard(selectedStore),
    enabled: canFetchAuth && selectedStore !== ALL_STORES_VALUE && !isTrialCeoMode,
    staleTime: 30000,
  })
  const dashboardError =
    dashboardErrorRaw instanceof Error ? dashboardErrorRaw.message : null

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
        return false
      }
      const data = query.state.data as StoreEdgeStatus | undefined
      if (!data?.online) return 30000
      return edgeSetupOpen ? 15000 : 20000
    },
    refetchIntervalInBackground: false,
  })
  const selectedStoreRole = selectedStoreItem?.role ?? null
  const canManageStore = selectedStoreRole
    ? ["owner", "admin", "manager"].includes(selectedStoreRole)
    : true
  const storeLastSeenAt = null
  const lastSeenAt = storeLastSeenAt ?? getLastSeenAt(edgeStatus)
  const isEdgeOnlineByLastSeen = isRecentTimestamp(lastSeenAt, ONLINE_MAX_AGE_SEC)
  const selectedStorePlan =
    selectedStoreItem?.plan ??
    (selectedStoreStatus === "trial" ? "trial" : null)
  const selectedStoreOwner = user?.email || null

  const { data: storeLimits } = useQuery({
    queryKey: ["store-limits", selectedStore],
    queryFn: () => camerasService.getStoreLimits(selectedStore),
    enabled: canFetchAuth && Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE),
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
    canFetchAuth && (selectedStore !== ALL_STORES_VALUE || (stores ?? []).length === 0)
  const {
    data: onboardingNextStep,
    isLoading: onboardingNextStepLoading,
    error: onboardingNextStepErrorRaw,
  } = useQuery<OnboardingNextStepResponse>({
    queryKey: ["onboarding-next-step", selectedStore],
    queryFn: () =>
      onboardingService.getNextStep(
        selectedStore !== ALL_STORES_VALUE ? selectedStore : undefined
      ),
    enabled: shouldFetchOnboardingNextStep,
    staleTime: 30000,
    retry: 1,
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

  useEffect(() => {
    if (selectedStore === ALL_STORES_VALUE) return
    if (!isEdgeOnlineByLastSeen) return
    try {
      localStorage.removeItem("dv_from_onboarding")
    } catch {
      // ignore storage access issues
    }
  }, [selectedStore, isEdgeOnlineByLastSeen])

  const dismissActivationProgress = () => {
    try {
      localStorage.removeItem("dv_from_onboarding")
    } catch {
      // ignore storage access issues
    }
    setShowActivationProgress(false)
    setActivationBannerDismissed(true)
  }

  const edgeSetupLink = useMemo(() => {
    if (!origin) return ""
    const params = new URLSearchParams()
    if (selectedStore && selectedStore !== ALL_STORES_VALUE) {
      params.set("store", selectedStore)
    }
    params.set("openEdgeSetup", "1")
    return `${origin}/app/dashboard?${params.toString()}`
  }, [origin, selectedStore])

  const edgeSetupLinkShort = edgeSetupLink
    ? edgeSetupLink.replace(/^https?:\/\//, "")
    : ""


  const shouldShowActivationBanner =
    !activationBannerDismissed &&
    (showActivationProgress || (selectedStore !== ALL_STORES_VALUE && !isEdgeOnlineByLastSeen))

  const onboardingStage = onboardingNextStep?.stage || null
  const nextStepCta = useMemo(() => {
    if (!canManageStore) return null
    if (!onboardingNextStep?.cta_url || !onboardingNextStep?.cta_label) return null
    return { label: onboardingNextStep.cta_label, href: onboardingNextStep.cta_url }
  }, [canManageStore, onboardingNextStep])

  const showNextStepBanner =
    canManageStore &&
    Boolean(nextStepCta) &&
    selectedStore !== ALL_STORES_VALUE &&
    onboardingStage !== "active"

  const activationBanner = shouldShowActivationBanner ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <SetupProgress
        step={4}
        titleRight="Ativação"
        className="mb-4"
      />
      <h3 className="text-lg font-bold text-gray-800">Ativação do Trial</h3>
      <p className="text-sm text-gray-600 mt-1">
        Você só precisa de um computador na loja com acesso às câmeras. Nós guiamos o passo a passo.
      </p>

      {selectedStore !== ALL_STORES_VALUE && isEdgeOnlineByLastSeen && (
        <span className="mt-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Loja Online
        </span>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        {canManageStore ? (
          <button
            type="button"
            onClick={() => {
              setEdgeSetupOpen(true)
              dismissActivationProgress()
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Abrir Assistente de Conexão
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            Ação restrita: peça ao admin da loja para concluir o Edge Setup.
          </div>
        )}

      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Checklist</h4>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Selecione a loja</li>
          <li>Abra o Assistente de Conexão (Edge Setup)</li>
          <li>Baixe o Edge Agent</li>
          <li>
            Copie o <span className="font-mono">.env</span> e cole na pasta do agent
          </li>
          <li>Inicie o agent no computador da loja</li>
          <li>Aguarde a confirmação “Loja Online” (heartbeat)</li>
        </ul>
      </div>

      {edgeSetupLink && isMobile && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="text-sm font-semibold text-gray-800">
            Continuar no computador
          </div>
          <p className="text-xs text-gray-600">
            Abra este link no computador que fica na loja.
          </p>
          <div className="text-xs text-blue-600 break-all">{edgeSetupLinkShort}</div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(edgeSetupLink)
                toast.success("Link copiado")
              } catch {
                toast.error("Falha ao copiar link")
              }
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Copiar link
          </button>
        </div>
      )}

      

      {dashboardError && (
        <p className="text-xs text-gray-500 mt-3">{dashboardError}</p>
      )}
    </div>
  ) : null

  const health = onboardingNextStep?.health
  const camerasTotal = health?.cameras_total ?? edgeStatus?.cameras_total ?? 0
  const camerasOnline = health?.cameras_online ?? edgeStatus?.cameras_online ?? 0
  const camerasOffline = health?.cameras_offline ?? Math.max(camerasTotal - camerasOnline, 0)
  const camerasLimit = storeLimits?.limits?.cameras ?? 3
  const edgeStatusValue = (health?.edge_status || edgeStatus?.store_status || "").toLowerCase()
  const isEdgeOnlineByHealth = ["online", "degraded", "online_no_cameras"].includes(edgeStatusValue)
  const edgeOnlineLabel = isEdgeOnlineByHealth
    ? "Online"
    : "Offline"
  const edgeLastSeenLabel = formatLastSeenDisplay(lastSeenAt)
  const showFirstCameraCards = onboardingStage === "add_cameras"

  const minimalStatusCards =
    selectedStore !== ALL_STORES_VALUE ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Status do Edge"
          value={edgeOnlineLabel}
          icon={<span>📡</span>}
          color={isEdgeOnlineByHealth ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}
          subtitle={`Último sinal: ${edgeLastSeenLabel}`}
        />
        <MetricCard
          title="Câmeras online/offline"
          value={`${camerasOnline} online · ${camerasOffline} offline`}
          icon={<span>🎥</span>}
          color="bg-blue-100 text-blue-800"
          subtitle={`Total: ${camerasTotal} · Limite: ${camerasLimit}`}
        />
        <MetricCard
          title="Próximo passo"
          value={canManageStore ? onboardingNextStep?.title || "—" : "Somente leitura"}
          icon={<span>✅</span>}
          color="bg-amber-100 text-amber-800"
          subtitle={
            canManageStore
              ? onboardingNextStep?.description || "Continue a configuração guiada"
              : "Peça ao admin para avançar"
          }
        />
      </div>
    ) : null

  const firstCameraCards = showFirstCameraCards ? (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Edge Online"
        value="Conectado"
        icon={<span>🟢</span>}
        color="bg-green-100 text-green-800"
        subtitle={`Último sinal: ${edgeLastSeenLabel}`}
      />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-800">🎥</div>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          {onboardingNextStep?.title || "Adicionar sua primeira câmera"}
        </h3>
        <p className="text-gray-600 text-sm mb-3">
          {onboardingNextStep?.description ||
            "Leva menos de 2 minutos com IP + usuário + senha do NVR."}
        </p>
        {canManageStore ? (
          <Link
            to={nextStepCta?.href || `/app/cameras?store_id=${selectedStore}&onboarding=true`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {nextStepCta?.label || "Adicionar primeira câmera"}
          </Link>
        ) : (
          <div className="text-sm text-gray-500">
            Ação restrita: peça ao admin para adicionar câmeras.
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <div className="p-3 rounded-lg bg-amber-100 text-amber-800">⏱️</div>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">O que você verá em 72h</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>1 snapshot publicado no dashboard</li>
          <li>ROI configurado e ativo</li>
          <li>Primeiro alerta ou insight gerado</li>
        </ul>
      </div>
    </div>
  ) : null

  const statusCards = showFirstCameraCards ? firstCameraCards : minimalStatusCards
  const onboardingStateCards = onboardingNextStepLoading ? (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 animate-pulse h-28" />
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 animate-pulse h-28" />
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 animate-pulse h-28" />
    </div>
  ) : onboardingNextStepError ? (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      Não foi possível carregar o próximo passo. {onboardingNextStepError}
    </div>
  ) : onboardingStage === "no_store" ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-800">
        {onboardingNextStep?.title || "Crie sua primeira loja"}
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        {onboardingNextStep?.description ||
          "Cadastre uma loja para liberar o dashboard completo."}
      </p>
      {nextStepCta && (
        <div className="mt-4">
          <Link
            to={nextStepCta.href}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {nextStepCta.label}
          </Link>
        </div>
      )}
    </div>
  ) : (
    statusCards
  )
  const emptySubtitle = "Conecte uma câmera para começar"

  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [selectedEvidenceHour, setSelectedEvidenceHour] = useState<string | null>(null)
  const evidenceEvents = (events ?? []).slice(0, 6)

  const openEvidence = (hourLabel?: string | null) => {
    setSelectedEvidenceHour(hourLabel || null)
    setEvidenceOpen(true)
  }

  const closeEvidence = () => {
    setEvidenceOpen(false)
  }

  const ceoFlow = ceoDashboard?.series?.flow_by_hour ?? []
  const ceoIdle = ceoDashboard?.series?.idle_index_by_hour ?? []
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
  const nextStepBanner = showNextStepBanner ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-800">Próximo passo</h3>
      <p className="text-sm text-gray-600 mt-1">
        {onboardingNextStep?.description ||
          "Complete a próxima etapa para liberar o primeiro insight do trial."}
      </p>
      {nextStepCta && (
        <div className="mt-4">
          <Link
            to={nextStepCta.href}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {nextStepCta.label}
          </Link>
        </div>
      )}
    </div>
  ) : null


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

  const edgeStatusLabel = isEdgeOnlineByLastSeen ? "Online" : "Offline"

  const edgeStatusClass = isEdgeOnlineByLastSeen
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

  const showStoreIndicators =
    Boolean(selectedStore) && selectedStore !== ALL_STORES_VALUE && !isTrialCeoMode
  const hasRealDashboardData = Boolean(dashboard?.metrics || dashboard?.insights)

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
      {onboardingStateCards}
      {nextStepBanner}
      {activationBanner}
      {/* Header (mobile-first) */}
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {user?.first_name || user?.username}, bem-vindo ao DALE Vision
          </p>

          {selectedStoreItem && selectedStore !== ALL_STORES_VALUE && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${selectedStoreStatusClass}`}
              >
                {selectedStoreStatusLabel}
              </span>

              <span className="text-xs sm:text-sm text-gray-600">
                Plano:{" "}
                <span className="font-semibold">
                  {selectedStorePlan || "—"}
                </span>
              </span>

              {selectedStoreOwner && (
                <span className="text-xs sm:text-sm text-gray-500 truncate max-w-[220px]">
                  {selectedStoreOwner}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Seletor de loja */}
        {stores && stores.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label
              htmlFor="store-select"
              className="text-gray-700 font-semibold text-sm"
            >
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
                    Sem dados de ociosidade ainda.
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="text-sm text-gray-500">Tempo médio na fila</div>
                  <div className="text-2xl font-bold text-gray-800 mt-2">
                    {ceoDashboard ? `${Math.round(ceoDashboard.kpis.avg_queue_seconds / 60)}m` : "—"}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="text-sm text-gray-500">Pessoas na fila agora</div>
                  <div className="text-2xl font-bold text-gray-800 mt-2">
                    {ceoDashboard ? ceoDashboard.kpis.queue_now_people : "—"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Estimativa baseada no último bucket
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="text-sm font-semibold text-gray-800 mb-4">
                  Pulso do Fluxo (Vendas)
                </div>
                {ceoLoading ? (
                  <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                ) : ceoFlow.length === 0 ? (
                  <div className="text-sm text-gray-500">Sem dados de fluxo por hora.</div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    Store Health
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Última comunicação:{" "}
                    <span className="font-semibold text-gray-700">
                      {formatLastSeenDisplay(lastSeenAt)}
                    </span>
                  </p>
                  {edgeStatus?.store_status_reason && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatReason(edgeStatus.store_status_reason)}
                    </p>
                  )}
                  {edgeStatus?.last_error && (
                    <p className="text-xs text-red-600 mt-2">
                      Erro: {edgeStatus.last_error}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${edgeStatusClass}`}
                >
                  {edgeStatusLabel}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">Câmeras online</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {edgeStatusLoading
                      ? "—"
                      : `${edgeStatus?.cameras_online ?? 0}/${
                          edgeStatus?.cameras_total ?? 0
                        }`}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {edgeStatusLoading
                      ? "—"
                      : (formatReason(edgeStatus?.store_status_reason) ?? "—")}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">Última comunicação</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatLastSeenDisplay(lastSeenAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Câmeras
                </h3>

                {edgeStatusLoading ? (
                  <div className="text-sm text-gray-500">
                    Carregando status...
                  </div>
                ) : edgeStatus && edgeStatus.cameras.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {edgeStatus.cameras.map((cam) => (
                      <div
                        key={cam.camera_id}
                        className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {cam.name}
                          </p>
                          <p className="text-xs text-gray-500">{cam.camera_id}</p>
                          <p className="text-[11px] text-gray-400">
                            Último: {formatTimestamp(cam.camera_last_heartbeat_ts)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              cam.status === "online"
                                ? "bg-green-100 text-green-800"
                                : cam.status === "degraded"
                                ? "bg-yellow-100 text-yellow-800"
                                : cam.status === "offline"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {cam.status}
                          </span>
                          {cam.reason && (
                            <span className="text-[11px] text-gray-500">
                              {formatReason(cam.reason)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Nenhuma câmera encontrada.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    Últimos alertas
                  </h2>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {(events?.length ?? 0) > 0
                      ? `${Math.min(events?.length ?? 0, 10)} de ${
                          events?.length ?? 0
                        }`
                      : "0"}
                  </span>
                </div>

                {!selectedStore || selectedStore === ALL_STORES_VALUE ? (
                  <div className="text-sm text-gray-500">
                    Selecione uma loja para ver alertas.
                  </div>
                ) : eventsLoading ? (
                  <div className="text-sm text-gray-500">Carregando alertas...</div>
                ) : eventsError ? (
                  <div className="text-sm text-red-600">Falha ao carregar alertas</div>
                ) : !events || events.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhum alerta em aberto</div>
                ) : (
                  <div className="space-y-3">
                    {events.slice(0, 10).map((event) => {
                      const eventTime = event.occurred_at || event.created_at
                      const isResolving = resolvingEventId === event.id
                      const isIgnoring = ignoringEventId === event.id
                      const isMutating = isResolving || isIgnoring
                      return (
                        <div
                          key={event.id}
                          className="border border-gray-100 rounded-lg px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-500">
                                {formatTimeSafe(eventTime)}
                              </p>
                              <p className="text-sm sm:text-base font-semibold text-gray-800 mt-1">
                                {event.title}
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
                                onClick={() => {
                                  setResolvingEventId(event.id)
                                  resolveEvent.mutate(event.id, {
                                    onSettled: () => setResolvingEventId(null),
                                  })
                                }}
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
                                onClick={() => {
                                  setIgnoringEventId(event.id)
                                  ignoreEvent.mutate(event.id, {
                                    onSettled: () => setIgnoringEventId(null),
                                  })
                                }}
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
                            <p className="text-xs sm:text-sm text-gray-500 mt-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
          </div>
        </div>
      )}

          {showStoreIndicators ? (
            isLoadingDashboard ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
                Carregando indicadores...
              </div>
            ) : (
              <>
                {!hasRealDashboardData && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">Ainda sem dados</div>
                    <p className="mt-2 text-gray-600">
                      Conecte as câmeras e deixe rodar por 72h para gerar métricas
                      reais. Enquanto isso, use o Edge Setup para validar a conexão.
                    </p>
                  </div>
                )}
                {/* Métricas topo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <MetricCard
                    title="Score de Saúde"
                    value="Sem dados ainda"
                    icon={icons.health}
                    color="bg-green-50"
                    subtitle={emptySubtitle}
                  />
                  <MetricCard
                    title="Produtividade"
                    value="Sem dados ainda"
                    icon={icons.productivity}
                    color="bg-blue-50"
                    subtitle={emptySubtitle}
                  />
                  <MetricCard
                    title="Fluxo de Visitantes"
                    value="Sem dados ainda"
                    icon={icons.visitors}
                    color="bg-purple-50"
                    subtitle={emptySubtitle}
                  />
                </div>

                {/* Métricas 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <MetricCard
                    title="Taxa de Conversão"
                    value="Sem dados ainda"
                    icon={icons.conversion}
                    color="bg-yellow-50"
                    subtitle={emptySubtitle}
                  />
                  <MetricCard
                    title="Ticket Médio"
                    value="Sem dados ainda"
                    icon={icons.cart}
                    color="bg-indigo-50"
                    subtitle={emptySubtitle}
                  />
                  <MetricCard
                    title="Tempo Ocioso"
                    value="Sem dados ainda"
                    icon={icons.idle}
                    color="bg-red-50"
                    subtitle={emptySubtitle}
                  />
                </div>
              </>
            )
          ) : (
            !isTrialCeoMode && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
                Selecione uma loja para ver os indicadores
              </div>
            )
          )}

          {showStoreIndicators && (
            <>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="text-sm font-semibold text-gray-800">Tendência</div>
                  <div className="mt-4 text-sm text-gray-600">
                    Sem dados ainda. Conecte uma câmera para começar.
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="text-sm font-semibold text-gray-800">Distribuição</div>
                  <div className="mt-4 text-sm text-gray-600">
                    Sem dados ainda. Conecte uma câmera para começar.
                  </div>
                </div>
              </div>

              {/* Insights + Recomendações */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">
                    📊 Insights da Loja
                  </h2>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    Sem dados ainda. Conecte uma câmera para começar.
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                      💡 Recomendações IA
                    </h2>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs sm:text-sm font-semibold rounded-full">
                      0 sugestões
                    </span>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    Sem recomendações ainda. Conecte uma câmera para começar.
                  </div>
                </div>
              </div>
            </>
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

            {evidenceEvents.length === 0 ? (
              <div className="mt-6 text-sm text-gray-500">
                Nenhum evento registrado. Evidências reais aparecem após ativar CV.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {evidenceEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="relative aspect-video bg-slate-200">
                      <div className="absolute inset-0 bg-slate-300 blur-md" />
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-600 text-center px-3">
                        Evidência disponível após ativar CV
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-gray-400">
                        {formatTimeSafe(event.occurred_at || event.created_at)}
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
