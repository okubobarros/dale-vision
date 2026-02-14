import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import { useAuth } from "../../contexts/AuthContext"
import {
  storesService,
  type NetworkDashboard,
  type Store,
  type StoreEdgeStatus,
} from "../../services/stores"
import { formatReason, formatTimestamp } from "../../utils/edgeReasons"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import { USE_MOCK_DATA } from "../../lib/mock"
import {
  useAlertsEvents,
  useIgnoreEvent,
  useResolveEvent,
} from "../../queries/alerts.queries"
import type { StoreDashboard } from "../../types/dashboard"
import { LineChart } from "../../components/Charts/LineChart"
import { PieChart } from "../../components/Charts/PieChart"
import SetupProgress from "../Onboarding/components/SetupProgress"
import { useIsMobile } from "../../hooks/useIsMobile"
import { onboardingService, type OnboardingStep } from "../../services/onboarding"

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

interface RecommendationCardProps {
  title: string
  description: string
  priority: string
  impact: string
}

const RecommendationCard = ({
  title,
  description,
  priority,
  impact,
}: RecommendationCardProps) => {
  const priorityColors = {
    high: "border-red-500 bg-red-50",
    medium: "border-yellow-500 bg-yellow-50",
    low: "border-blue-500 bg-blue-50",
  }

  const priorityLabels = {
    high: "Alta Prioridade",
    medium: "Média Prioridade",
    low: "Baixa Prioridade",
  }

  return (
    <div
      className={`border-l-4 ${
        priorityColors[priority as keyof typeof priorityColors]
      } pl-4 py-3 pr-3 rounded-r-lg`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-800 leading-snug">{title}</h4>
        <span
          className={`shrink-0 px-2 py-1 text-[11px] font-semibold rounded ${
            priority === "high"
              ? "bg-red-100 text-red-800"
              : priority === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {priorityLabels[priority as keyof typeof priorityLabels]}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-2">{description}</p>
      <p className="text-gray-500 text-xs">🎯 Impacto: {impact}</p>
    </div>
  )
}

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

const ALL_STORES_VALUE = "all"

const buildNetworkDashboard = (
  network: NetworkDashboard | null,
  stores: Store[]
): StoreDashboard | null => {
  if (!USE_MOCK_DATA) {
    return null
  }

  const storeCount = network?.total_stores ?? stores.length
  const activeAlerts = network?.active_alerts ?? Math.max(0, storeCount - 1)

  const healthScore = Math.min(95, 70 + storeCount * 2)
  const productivity = Math.min(92, 65 + storeCount * 3)
  const idleTime = Math.max(8, 20 - storeCount)
  const visitorFlow = Math.max(0, storeCount * 500)
  const conversionRate = Math.min(78, 45 + storeCount * 2)
  const avgCartValue = 120 + storeCount * 4

  return {
    store: {
      id: ALL_STORES_VALUE,
      name: "Todas as lojas",
      owner_email: "Visao agregada",
      plan: "network",
      status: "active",
    },
    metrics: {
      health_score: healthScore,
      productivity,
      idle_time: idleTime,
      visitor_flow: visitorFlow,
      conversion_rate: conversionRate,
      avg_cart_value: avgCartValue,
    },
    insights: {
      peak_hour: "10:00-12:00",
      best_selling_zone: "Mix de zonas",
      employee_performance: {
        best: "Equipe com melhor desempenho",
        needs_attention: "Equipe com menor desempenho",
      },
    },
    recommendations: [
      {
        id: "network_rec_1",
        title: "Reforcar equipes nos horarios de pico",
        description: "Distribuir equipes conforme a demanda agregada da rede.",
        priority: "high",
        action: "staffing",
        estimated_impact: "Reducao de filas e melhor conversao.",
      },
      {
        id: "network_rec_2",
        title: "Padronizar boas praticas",
        description: "Replicar processos das lojas com melhor desempenho.",
        priority: "medium",
        action: "process",
        estimated_impact: "Aumento gradual de produtividade.",
      },
    ],
    alerts:
      activeAlerts > 0
        ? [
            {
              type: "network_alerts",
              message: `${activeAlerts} alertas ativos na rede`,
              severity: activeAlerts > 5 ? "high" : "medium",
              time: new Date().toISOString(),
            },
          ]
        : [],
  }
}

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedStore, setSelectedStore] = useState<string>(ALL_STORES_VALUE)
  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [resolvingEventId, setResolvingEventId] = useState<string | null>(null)
  const [ignoringEventId, setIgnoringEventId] = useState<string | null>(null)
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(false)
  const [showActivationProgress, setShowActivationProgress] = useState(false)
  const [activationBannerDismissed, setActivationBannerDismissed] = useState(false)
  const [origin, setOrigin] = useState("")
  const isMobile = useIsMobile(768)
  const location = useLocation()

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  const checkoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL || "/agendar-demo"

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
    enabled: selectedStore !== ALL_STORES_VALUE,
    refetchInterval: edgeSetupOpen ? 15000 : 20000,
    refetchIntervalInBackground: true,
  })
  const selectedStoreItem = useMemo(
    () => (stores ?? []).find((s) => s.id === selectedStore) ?? null,
    [stores, selectedStore]
  )
  const storeLastSeenAt = selectedStoreItem?.last_seen_at ?? null
  const lastSeenAt = storeLastSeenAt ?? getLastSeenAt(edgeStatus)
  const isEdgeOnlineByLastSeen = isRecentTimestamp(lastSeenAt, ONLINE_MAX_AGE_SEC)

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useAlertsEvents({
    store_id: selectedStore === ALL_STORES_VALUE ? undefined : selectedStore,
    status: "open",
  }, {
    enabled: Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE),
  })

  const resolveEvent = useResolveEvent()
  const ignoreEvent = useIgnoreEvent()

  const { data: onboardingProgress } = useQuery({
    queryKey: ["onboarding-progress", selectedStore],
    queryFn: () =>
      onboardingService.getProgress(
        selectedStore !== ALL_STORES_VALUE ? selectedStore : undefined
      ),
    enabled: Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE),
    staleTime: 30000,
    retry: 1,
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const storeFromQuery = params.get("store") || ""
    if (storeFromQuery) {
      setSelectedStore(storeFromQuery)
    }
    if (params.get("openEdgeSetup") === "1") {
      setEdgeSetupOpen(true)
      setShowActivationProgress(true)
      setActivationBannerDismissed(false)
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
    if (typeof window === "undefined") return
    try {
      if (localStorage.getItem("dv_from_onboarding") === "1") {
        setShowActivationProgress(true)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!showActivationProgress) return
    if (selectedStore !== ALL_STORES_VALUE && isEdgeOnlineByLastSeen) {
      try {
        localStorage.removeItem("dv_from_onboarding")
      } catch {}
      setShowActivationProgress(false)
      setActivationBannerDismissed(true)
    }
  }, [showActivationProgress, selectedStore, isEdgeOnlineByLastSeen])

  const dismissActivationProgress = () => {
    try {
      localStorage.removeItem("dv_from_onboarding")
    } catch {}
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
    (showActivationProgress || (!isLoadingDashboard && !dashboard))

  const nextStep = (onboardingProgress?.next_step || null) as OnboardingStep | null
  const nextStepCta = useMemo(() => {
    if (!nextStep) return null
    switch (nextStep) {
      case "edge_connected":
        return { label: "Conectar Edge", href: edgeSetupLink || "/app/dashboard" }
      case "camera_added":
        return {
          label: "Adicionar câmera",
          href:
            selectedStore !== ALL_STORES_VALUE
              ? `/app/cameras?store_id=${selectedStore}&onboarding=true`
              : "/app/cameras",
        }
      case "camera_health_ok":
        return {
          label: "Testar câmera",
          href:
            selectedStore !== ALL_STORES_VALUE
              ? `/app/cameras?store_id=${selectedStore}&onboarding=true`
              : "/app/cameras",
        }
      case "roi_published":
        return {
          label: "Configurar ROI",
          href:
            selectedStore !== ALL_STORES_VALUE
              ? `/app/cameras?store_id=${selectedStore}&onboarding=true`
              : "/app/cameras",
        }
      case "monitoring_started":
        return { label: "Iniciar monitoramento", href: "/app/dashboard" }
      case "first_insight":
        return { label: "Gerar primeiro insight", href: "/app/dashboard" }
      default:
        return null
    }
  }, [nextStep, selectedStore, edgeSetupLink])

  const showNextStepBanner =
    Boolean(nextStepCta) &&
    selectedStore !== ALL_STORES_VALUE &&
    nextStep !== "first_insight"

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

      

      {!dashboard && dashboardError && (
        <p className="text-xs text-gray-500 mt-3">{dashboardError}</p>
      )}
    </div>
  ) : null

  const nextStepBanner = showNextStepBanner ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-800">Próximo passo</h3>
      <p className="text-sm text-gray-600 mt-1">
        Complete a próxima etapa para liberar o primeiro insight do trial.
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

  useEffect(() => {
    if (!stores || stores.length === 0) {
      setDashboard(null)
      setIsLoadingDashboard(false)
      return
    }

    setIsLoadingDashboard(true)
    setDashboardError(null)
    const loadDashboard = async () => {
      try {
        if (selectedStore === ALL_STORES_VALUE) {
          if (!USE_MOCK_DATA) {
            setDashboard(null)
            setDashboardError("Sem dados para dashboard agregado.")
            return
          }
          const network = await storesService.getNetworkDashboard()
          const built = buildNetworkDashboard(network, stores)
          setDashboard(built)
          if (!built) setDashboardError("Sem dados para dashboard agregado.")
          return
        }

        if (USE_MOCK_DATA && !edgeStatusLoading && !isEdgeOnlineByLastSeen) {
          setDashboard(null)
          setDashboardError("Sem dados ainda. Aguardando conexão do Edge Agent.")
          return
        }

        const storeDashboard = await storesService.getStoreDashboard(selectedStore)
        setDashboard(storeDashboard)
      } catch (error) {
        console.error("? Erro ao buscar dashboard:", error)
        setDashboard(null)
        setDashboardError("Sem dados para dashboard.")
      } finally {
        setIsLoadingDashboard(false)
      }
    }

    loadDashboard()
  }, [selectedStore, stores, edgeStatusLoading, isEdgeOnlineByLastSeen])

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

  const showStoreIndicators =
    Boolean(selectedStore) && selectedStore !== ALL_STORES_VALUE

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
          Nenhuma loja cadastrada
        </h3>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Crie sua primeira loja para visualizar o dashboard.
        </p>
        <Link
          to="/app/stores"
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center"
        >
          Criar loja
        </Link>
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
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Assinar agora
            </a>
            <Link
              to="/agendar-demo"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Falar com especialista
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isLoadingDashboard && !dashboard) {
    return (
      <div className="space-y-6 sm:space-y-8">
        {nextStepBanner}
        {activationBanner}

        <EdgeSetupModal
          open={edgeSetupOpen}
          onClose={() => setEdgeSetupOpen(false)}
          defaultStoreId={selectedStore !== ALL_STORES_VALUE ? selectedStore : ""}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
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

          {dashboard && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                  dashboard.store.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {dashboard.store.status === "active" ? "Ativa" : "Inativa"}
              </span>

              <span className="text-xs sm:text-sm text-gray-600">
                Plano: <span className="font-semibold">{dashboard.store.plan}</span>
              </span>

              <span className="text-xs sm:text-sm text-gray-500 truncate max-w-[220px]">
                {dashboard.store.owner_email}
              </span>
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
                onChange={(e) => setSelectedStore(e.target.value)}
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

      {dashboard ? (
        <>
          {selectedStore !== ALL_STORES_VALUE && (
            <div className="space-y-4 sm:space-y-6">
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
                                {eventTime
                                  ? new Date(eventTime).toLocaleTimeString(
                                      "pt-BR",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )
                                  : "—"}
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
            ) : dashboard?.metrics ? (
              <>
                {/* Métricas topo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <MetricCard
                    title="Score de Saúde"
                    value={`${dashboard.metrics.health_score}%`}
                    icon={icons.health}
                    color="bg-green-50"
                    trend={Math.round(Math.random() * 10) - 3}
                    subtitle="Saúde geral da operação"
                  />
                  <MetricCard
                    title="Produtividade"
                    value={`${dashboard.metrics.productivity}%`}
                    icon={icons.productivity}
                    color="bg-blue-50"
                    trend={Math.round(Math.random() * 8) - 2}
                    subtitle="Eficiência da equipe"
                  />
                  <MetricCard
                    title="Fluxo de Visitantes"
                    value={dashboard.metrics.visitor_flow.toLocaleString("pt-BR")}
                    icon={icons.visitors}
                    color="bg-purple-50"
                    trend={Math.round(Math.random() * 15)}
                    subtitle="Pessoas na loja hoje"
                  />
                </div>

                {/* Métricas 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <MetricCard
                    title="Taxa de Conversão"
                    value={`${dashboard.metrics.conversion_rate.toFixed(1)}%`}
                    icon={icons.conversion}
                    color="bg-yellow-50"
                    subtitle="Visitantes → Clientes"
                  />
                  <MetricCard
                    title="Ticket Médio"
                    value={`R$ ${dashboard.metrics.avg_cart_value.toFixed(2)}`}
                    icon={icons.cart}
                    color="bg-indigo-50"
                    subtitle="Valor médio por venda"
                  />
                  <MetricCard
                    title="Tempo Ocioso"
                    value={`${dashboard.metrics.idle_time}%`}
                    icon={icons.idle}
                    color="bg-red-50"
                    subtitle="Redução de produtividade"
                  />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
                Indicadores indisponíveis no momento.
              </div>
            )
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
              Selecione uma loja para ver os indicadores
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <LineChart />
            <PieChart />
          </div>

          {/* Insights + Recomendações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">
                📊 Insights da Loja
              </h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    ⏰ Horário de Pico
                  </h3>
                  <p className="text-blue-700 text-sm sm:text-base">
                    Maior movimento:{" "}
                    <span className="font-bold">{dashboard.insights.peak_hour}</span>
                  </p>
                  <p className="text-blue-600 text-xs sm:text-sm mt-1">
                    Recomenda-se alocar mais funcionários neste período
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">
                    🏆 Setor mais Vendendo
                  </h3>
                  <p className="text-green-700 text-sm sm:text-base">
                    <span className="font-bold">
                      {dashboard.insights.best_selling_zone}
                    </span>{" "}
                    lidera em vendas
                  </p>
                  <p className="text-green-600 text-xs sm:text-sm mt-1">
                    Garantir estoque adequado neste setor
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    👥 Desempenho da Equipe
                  </h3>
                  <div className="space-y-3 text-sm sm:text-base">
                    <div>
                      <p className="text-green-700 font-semibold">
                        🌟 Melhor desempenho:
                      </p>
                      <p className="text-green-600">
                        {dashboard.insights.employee_performance.best}
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 font-semibold">
                        ⚠️ Precisa de atenção:
                      </p>
                      <p className="text-red-600">
                        {dashboard.insights.employee_performance.needs_attention}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  💡 Recomendações IA
                </h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold rounded-full">
                  {dashboard.recommendations.length} sugestões
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {dashboard.recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={index}
                    title={rec.title}
                    description={rec.description}
                    priority={rec.priority}
                    impact={rec.estimated_impact}
                  />
                ))}
              </div>

              {dashboard.alerts.length > 0 && (
                <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">🚨 Alertas Recentes</h3>
                  <div className="space-y-3">
                    {dashboard.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          alert.severity === "high"
                            ? "bg-red-50 border border-red-200"
                            : alert.severity === "medium"
                            ? "bg-yellow-50 border border-yellow-200"
                            : "bg-blue-50 border border-blue-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">
                            {alert.severity === "high"
                              ? "🔴"
                              : alert.severity === "medium"
                              ? "🟡"
                              : "🔵"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-gray-800 text-sm sm:text-base">
                              {alert.message}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(alert.time).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            {isLoadingDashboard ? (
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            ) : (
              <svg
                className="w-8 h-8 text-gray-400"
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
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {isLoadingDashboard ? "Carregando dashboard" : "Dashboard indisponivel"}
          </h3>
          <p className="text-gray-500">
            {isLoadingDashboard
              ? "Estamos reunindo os dados da rede."
              : "Tente novamente em alguns instantes."}
          </p>
        </div>
      )}

      <EdgeSetupModal
        open={edgeSetupOpen}
        onClose={() => setEdgeSetupOpen(false)}
        defaultStoreId={selectedStore !== ALL_STORES_VALUE ? selectedStore : ""}
      />
    </div>
  )
}

export default Dashboard
