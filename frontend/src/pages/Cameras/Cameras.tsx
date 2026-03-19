import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  storesService,
  type Store,
  type StoreEdgeStatus,
} from "../../services/stores"
import {
  camerasService,
  type Camera,
  type CreateCameraPayload,
} from "../../services/cameras"
import {
  onboardingService,
  type OnboardingProgressResponse,
  type OnboardingNextStepResponse,
} from "../../services/onboarding"
import { supportService } from "../../services/support"
import { formatReason, formatStatusLabel, formatTimestamp } from "../../utils/edgeReasons"
import { useAuth } from "../../contexts/useAuth"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import CameraRoiEditor from "../../components/CameraRoiEditor"

const isPrivateIp = (ip: string) => {
  const trimmed = ip.trim()
  if (!trimmed) return false
  const parts = trimmed.split(".").map((p) => Number.parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

const isPrivateHost = (host: string) => isPrivateIp(host) || host === "localhost"
const EDGE_HEARTBEAT_FRESH_SECONDS = 120
const TEST_COOLDOWN_MS = 8000
const CAMERA_SYNC_RECENT_SECONDS = 300

const formatAgeLabel = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return null
  if (seconds < 60) return "agora"
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.floor(seconds / 60))
    return `${minutes} min`
  }
  const hours = Math.max(1, Math.floor(seconds / 3600))
  return `${hours} h`
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  ip: "IP",
  username: "Usuário",
  password: "Senha",
  rtsp_url: "RTSP URL",
  brand: "Marca",
  model: "Modelo",
  external_id: "ID externo",
  active: "Ativo",
}

const Cameras = () => {
  const location = useLocation()
  const initialParams = new URLSearchParams(location.search)
  const initialStoreFromQuery =
    initialParams.get("store_id") || initialParams.get("store") || ""
  const initialOpenEdgeSetup =
    initialParams.get("openEdgeSetup") === "1" || initialParams.get("edgeSetup") === "1"
  const initialZoneId = initialParams.get("zone_id") || ""
  const initialOpenRoi = initialParams.get("openRoi") === "1"
  const initialOnboardingMode = initialParams.get("onboarding") === "true"

  const [selectedStoreOverride, setSelectedStoreOverride] = useState<string | null>(
    initialStoreFromQuery ? initialStoreFromQuery : null
  )
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(initialOpenEdgeSetup)
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [createErrorDetails, setCreateErrorDetails] = useState<string[]>([])
  const [createErrorFields, setCreateErrorFields] = useState<Record<string, string[]>>(
    {}
  )
  const [showUpgradeCta, setShowUpgradeCta] = useState(false)
  const [connectionHelpOpen, setConnectionHelpOpen] = useState(false)
  const [roiCamera, setRoiCamera] = useState<Camera | null>(null)
  const [testingCameraId, setTestingCameraId] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testCooldownCameraId, setTestCooldownCameraId] = useState<string | null>(null)
  const testCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoneOpenHandled = useRef(false)
  const onboardingMode = initialOnboardingMode
  const queryClient = useQueryClient()
  const diagnoseUrl = "/app/edge-help"
  const { user } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const openEdgeSetup =
      params.get("openEdgeSetup") === "1" || params.get("edgeSetup") === "1"
    if (!openEdgeSetup) return
    params.delete("openEdgeSetup")
    params.delete("edgeSetup")
    params.delete("store")
    const next = params.toString()
    const newUrl = `${location.pathname}${next ? `?${next}` : ""}`
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", newUrl)
    }
  }, [location.pathname, location.search])

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
    staleTime: 60000,
  })

  const selectedStore = useMemo(() => {
    if (selectedStoreOverride !== null) return selectedStoreOverride
    if (onboardingMode) {
      if ((stores ?? []).length >= 1) {
        return stores?.[0]?.id ?? ""
      }
      return ""
    }
    if ((stores ?? []).length === 1) {
      return stores?.[0]?.id ?? ""
    }
    if ((stores ?? []).length > 1) {
      return "all"
    }
    return ""
  }, [selectedStoreOverride, stores, onboardingMode])

  const selectedStoreItem = useMemo(
    () =>
      selectedStore && selectedStore !== "all"
        ? (stores ?? []).find((s) => s.id === selectedStore) ?? null
        : null,
    [stores, selectedStore]
  )
  const selectedStoreRole = selectedStoreItem?.role ?? null
  const baseCanManageStore =
    selectedStore !== "all" &&
      (selectedStoreRole ? ["owner", "admin", "manager"].includes(selectedStoreRole) : true)

  const { data: onboardingNextStep } = useQuery<OnboardingNextStepResponse | null>({
    queryKey: ["onboarding-next-step", "cameras", selectedStore],
    queryFn: () => onboardingService.getNextStep(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    staleTime: 30000,
    retry: false,
  })

  const { data: onboardingProgress } = useQuery<OnboardingProgressResponse | null>({
    queryKey: ["onboarding-progress", "cameras", selectedStore],
    queryFn: () => onboardingService.getProgress(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    staleTime: 30000,
    retry: false,
  })

  const { data: edgeStatus } = useQuery<StoreEdgeStatus>({
    queryKey: ["store-edge-status", selectedStore],
    queryFn: () => storesService.getStoreEdgeStatus(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    refetchInterval: (query) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return false
      }
      const data = query.state.data as StoreEdgeStatus | undefined
      if (!data?.online) return 30000
      return 20000
    },
    refetchIntervalInBackground: false,
  })

  const {
    data: cameras,
    isLoading: camerasLoading,
    error: camerasError,
  } = useQuery<Camera[]>({
    queryKey: ["store-cameras", selectedStore],
    queryFn: () =>
      selectedStore === "all"
        ? camerasService.getCameras()
        : camerasService.getStoreCameras(selectedStore),
    enabled: Boolean(selectedStore),
    staleTime: 15000,
  })

  const edgeOnline =
    (edgeStatus?.connectivity_status
      ? ["online", "degraded"].includes(String(edgeStatus.connectivity_status))
      : Boolean(edgeStatus?.online)) ||
    (edgeStatus?.connectivity_age_seconds !== null &&
      edgeStatus?.connectivity_age_seconds !== undefined &&
      edgeStatus.connectivity_age_seconds <= EDGE_HEARTBEAT_FRESH_SECONDS)

  const cameraSourceSummary = useMemo(() => {
    const mode = edgeStatus?.camera_source_mode_detected ?? "unknown"
    const ageLabel = formatAgeLabel(edgeStatus?.camera_sync_age_seconds)
    if (mode === "api_first") {
      if (ageLabel) {
        return {
          text: `Fonte das câmeras: backend sincronizado (último sync ${ageLabel} atrás).`,
          className: "text-emerald-700",
        }
      }
      return {
        text: "Fonte das câmeras: backend sincronizado.",
        className: "text-emerald-700",
      }
    }
    if (mode === "local_only_or_unknown") {
      if (
        edgeStatus?.camera_sync_age_seconds !== null &&
        edgeStatus?.camera_sync_age_seconds !== undefined &&
        edgeStatus.camera_sync_age_seconds <= CAMERA_SYNC_RECENT_SECONDS
      ) {
        return {
          text: "Fonte das câmeras: backend sincronizado (instável).",
          className: "text-amber-700",
        }
      }
      return {
        text: "Fonte das câmeras: contingência local (.env / CAMERAS_JSON).",
        className: "text-amber-700",
      }
    }
    return {
      text: "Fonte das câmeras: aguardando detecção.",
      className: "text-gray-500",
    }
  }, [
    edgeStatus?.camera_source_mode_detected,
    edgeStatus?.camera_sync_age_seconds,
  ])

  const edgeCameraMap = useMemo(() => {
    const map = new Map<string, NonNullable<StoreEdgeStatus["cameras"]>[number]>()
    const rows = edgeStatus?.cameras ?? []
    rows.forEach((row) => {
      if (row?.camera_id) {
        map.set(String(row.camera_id), row)
      }
    })
    return map
  }, [edgeStatus?.cameras])

  const { data: limits } = useQuery({
    queryKey: ["store-limits", selectedStore],
    queryFn: () => camerasService.getStoreLimits(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    staleTime: 30000,
  })

  const { data: mySupportRequests } = useQuery({
    queryKey: ["store-support-requests", selectedStore],
    queryFn: () => supportService.getMyStoreSupportRequests(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    staleTime: 30000,
  })

  const latestSupportRequest = useMemo(() => {
    const rows = mySupportRequests ?? []
    if (rows.length === 0) return null
    return rows[0]
  }, [mySupportRequests])

  const hasActiveSupportGrant = useMemo(() => {
    if (!latestSupportRequest) return false
    if (latestSupportRequest.status !== "granted") return false
    if (!latestSupportRequest.expires_at) return false
    const expiresAt = new Date(latestSupportRequest.expires_at)
    if (Number.isNaN(expiresAt.getTime())) return false
    return expiresAt.getTime() > Date.now()
  }, [latestSupportRequest])

  const canManageStore = baseCanManageStore || hasActiveSupportGrant
  const canEditRoi = canManageStore || Boolean(user?.is_staff || user?.is_superuser)

  useEffect(() => {
    if (!initialOpenRoi || !initialZoneId) return
    if (zoneOpenHandled.current) return
    if (!cameras || cameras.length === 0) return
    const cameraMatch = cameras.find((camera) => camera.zone_id === initialZoneId)
    zoneOpenHandled.current = true
    if (!cameraMatch) {
      toast.error("Nenhuma câmera encontrada para esta zona.")
      return
    }
    if (!canEditRoi) {
      toast.error("Sem permissão para abrir o ROI desta câmera.")
      return
    }
    setRoiCamera(cameraMatch)
  }, [initialOpenRoi, initialZoneId, cameras, canEditRoi])

  const requestSupportMutation = useMutation({
    mutationFn: () =>
      supportService.requestStoreSupport(
        selectedStore,
        "Solicitação via página Câmeras: usuário em modo leitura precisa apoio para cadastro/ROI."
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["store-support-requests", selectedStore] })
      toast.success(result.message || "Solicitação enviada ao suporte.")
    },
    onError: (error: unknown) => {
      const message = (error as { message?: string })?.message || "Falha ao solicitar suporte."
      toast.error(message)
    },
  })

  const createCameraMutation = useMutation({
    mutationFn: (payload: CreateCameraPayload) =>
      camerasService.createStoreCamera(selectedStore, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-cameras", selectedStore] })
      queryClient.invalidateQueries({ queryKey: ["store-limits", selectedStore] })
      toast.success("Câmera criada")
      setCameraModalOpen(false)
      setEditingCamera(null)
      setCreateErrorMessage(null)
      setCreateErrorDetails([])
      setCreateErrorFields({})
      setShowUpgradeCta(false)
    },
    onError: (err: unknown) => {
      const response = (err as { response?: { status?: number; data?: unknown } })?.response
      const status = response?.status
      const data = response?.data as
        | {
            code?: string
            message?: string
            detail?: string
            details?: Record<string, unknown>
          }
        | undefined
      const code = data?.code || (err as { code?: string })?.code
      const message =
        data?.message ||
        data?.detail ||
        (err as { message?: string })?.message ||
        "Falha ao criar câmera."
      const details = data?.details

      const isPaywall =
        code === "PAYWALL_TRIAL_LIMIT" || code === "LIMIT_CAMERAS_REACHED"

      if (status === 400 || status === 402 || status === 409) {
        if (isPaywall) {
          toast.custom((t) => (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
              <div className="text-sm text-gray-700">{message}</div>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                onClick={() => {
                  toast.dismiss(t.id)
                  window.location.href = "/app/billing"
                }}
              >
                Ir para billing
              </button>
            </div>
          ))
        } else {
          toast.error(message)
        }
      }

      if (status === 400) {
        const fieldMap: Record<string, string[]> = {}
        if (details && typeof details === "object" && !Array.isArray(details)) {
          Object.entries(details).forEach(([field, value]) => {
            if (Array.isArray(value)) {
              fieldMap[field] = value.map((entry) => String(entry))
            } else if (typeof value === "string") {
              fieldMap[field] = [value]
            }
          })
        }
        const detailsWithLabels =
          Object.keys(fieldMap).length > 0
            ? Object.entries(fieldMap).flatMap(([field, messages]) => {
                const label = FIELD_LABELS[field] || field
                return messages.map((msg) => `${label}: ${msg}`)
              })
            : []
        setCreateErrorMessage(message || "Verifique os campos obrigatórios.")
        setCreateErrorDetails(detailsWithLabels)
        setCreateErrorFields(fieldMap)
        setShowUpgradeCta(false)
        if (import.meta.env.DEV) {
          console.warn("[Cameras] create camera 400", err)
        }
        return
      }

      if (status === 403) {
        setCreateErrorMessage(message || "Você não tem permissão para cadastrar câmera nesta loja.")
        setCreateErrorDetails([])
        setCreateErrorFields({})
        setShowUpgradeCta(false)
        return
      }
      if (status === 404) {
        setCreateErrorMessage(message || "Loja não encontrada.")
        setCreateErrorDetails([])
        setCreateErrorFields({})
        setShowUpgradeCta(false)
        return
      }
      if (status === 402 || status === 409) {
        setCreateErrorMessage(message)
        setCreateErrorDetails([])
        setCreateErrorFields({})
        setShowUpgradeCta(isPaywall)
        return
      }
      if (import.meta.env.DEV) {
        console.warn("[Cameras] create camera failed", err)
      }
      setCreateErrorMessage(message)
      setCreateErrorDetails([])
      setCreateErrorFields({})
      setShowUpgradeCta(false)
    },
  })

  const updateCameraMutation = useMutation({
    mutationFn: (payload: { id: string; data: CreateCameraPayload }) =>
      camerasService.updateCamera(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-cameras", selectedStore] })
      toast.success("Câmera atualizada")
      setCameraModalOpen(false)
      setEditingCamera(null)
    },
    onError: () => toast.error("Falha ao atualizar câmera."),
  })

  const deleteCameraMutation = useMutation({
    mutationFn: (cameraId: string) => camerasService.deleteCamera(cameraId),
    onMutate: async (cameraId: string) => {
      await queryClient.cancelQueries({ queryKey: ["store-cameras", selectedStore] })
      if (testingCameraId === cameraId) {
        setTestingCameraId(null)
        setTestMessage(null)
        setTestError(null)
      }
      if (testCooldownCameraId === cameraId) {
        setTestCooldownCameraId(null)
      }
      queryClient.setQueryData<Camera[]>(
        ["store-cameras", selectedStore],
        (current) => (current ? current.filter((cam) => cam.id !== cameraId) : current)
      )
      return { cameraId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-cameras", selectedStore] })
      queryClient.invalidateQueries({ queryKey: ["store-limits", selectedStore] })
      if (testingCameraId) {
        setTestingCameraId(null)
        setTestMessage(null)
        setTestError(null)
      }
      toast.success("Câmera removida")
    },
    onError: () => toast.error("Falha ao remover câmera."),
  })

  const camerasUsed = limits?.usage?.cameras ?? cameras?.length ?? 0
  const camerasLimit = limits?.limits?.cameras ?? null
  const isTrial = limits?.plan === "trial"
  const limitReached =
    camerasLimit !== null && typeof camerasLimit === "number"
      ? camerasUsed >= camerasLimit
      : false

  const openCreateModal = useCallback(() => {
    if (selectedStore === "all") {
      toast.error("Escolha uma loja para cadastrar câmeras.")
      return
    }
    if (!canManageStore) {
      toast.error("Você não tem permissão para adicionar câmeras nesta loja.")
      return
    }
    setEditingCamera(null)
    setCameraModalOpen(true)
    setCreateErrorMessage(null)
    setCreateErrorDetails([])
    setCreateErrorFields({})
    setShowUpgradeCta(false)
    setConnectionHelpOpen(false)
  }, [canManageStore, selectedStore])

  const openEditModal = useCallback(
    (camera: Camera) => {
      if (!canManageStore) {
        toast.error("Você não tem permissão para editar câmeras nesta loja.")
        return
      }
    setEditingCamera(camera)
    setCameraModalOpen(true)
    setCreateErrorMessage(null)
    setCreateErrorDetails([])
    setCreateErrorFields({})
    setShowUpgradeCta(false)
    setConnectionHelpOpen(false)
    },
    [canManageStore]
  )

  const handleDelete = useCallback(
    (cameraId: string) => {
      if (!window.confirm("Tem certeza que deseja remover esta câmera?")) return
      deleteCameraMutation.mutate(cameraId)
    },
    [deleteCameraMutation]
  )

  const handleSaveCamera = useCallback(
    (payload: CreateCameraPayload) => {
      if (editingCamera) {
        updateCameraMutation.mutate({ id: editingCamera.id, data: payload })
      } else {
        createCameraMutation.mutate(payload)
      }
    },
    [createCameraMutation, editingCamera, updateCameraMutation]
  )

  const stepStates = useMemo(() => {
    const hasCamera = (cameras?.length || 0) > 0
    const healthOk = (cameras || []).some((cam) => {
      const status = cam.camera_health?.status ?? cam.status
      return status === "online" || status === "degraded"
    })
    const roiPublished = Boolean(onboardingProgress?.steps?.roi_published?.completed)
    const monitoringStarted = Boolean(
      onboardingProgress?.steps?.monitoring_started?.completed
    )
    const roiDone =
      hasCamera &&
      (roiPublished ||
        monitoringStarted ||
        onboardingNextStep?.stage === "collecting_data" ||
        onboardingNextStep?.stage === "active")
    const canDrawRoi = hasCamera && (healthOk || edgeOnline)
    type StepState = "done" | "next" | "pending"
    const cameraState: StepState = hasCamera ? "done" : "next"
    const edgeState: StepState = healthOk ? "done" : hasCamera ? "next" : "pending"
    const roiState: StepState = roiDone ? "done" : canDrawRoi ? "next" : "pending"
    return [
      { label: "Adicionar câmera", state: cameraState },
      { label: "Verificar status no Edge", state: edgeState },
      { label: "Desenhar ROI", state: roiState },
    ]
  }, [
    cameras,
    edgeOnline,
    onboardingNextStep?.stage,
    onboardingProgress?.steps?.roi_published?.completed,
    onboardingProgress?.steps?.monitoring_started?.completed,
  ])

  const handleTestConnection = useCallback(
    async (cameraId: string) => {
      setTestingCameraId(cameraId)
      setTestError(null)
      setTestMessage(null)
      try {
        await queryClient.refetchQueries({ queryKey: ["store-cameras", selectedStore] })
        const current = queryClient.getQueryData<Camera[]>([
          "store-cameras",
          selectedStore,
        ])
        const camera = current?.find((cam) => cam.id === cameraId)
        const health = camera?.camera_health
        const status = health?.status ?? camera?.status ?? "unknown"
        const latency = health?.latency_ms ?? null
        const error = health?.error ?? null
        const checkedAt = health?.checked_at ?? camera?.last_seen_at ?? null

        if (status === "online" || status === "degraded") {
          const latencyLabel =
            latency !== null && latency !== undefined ? ` (${latency} ms)` : ""
          const timeLabel = checkedAt ? ` em ${formatTimestamp(checkedAt)}` : ""
          setTestMessage(`Status do Edge: ${formatStatusLabel(status)}${latencyLabel}${timeLabel}.`)
          toast.success("Status do Edge atualizado.")
        } else if (error) {
          setTestError(`Edge reportou erro: ${error}`)
          toast.error("Edge reportou erro.")
        } else {
          setTestError("Sem status recente do Edge. Aguarde o heartbeat do agente.")
        }

        setTestCooldownCameraId(cameraId)
        if (testCooldownTimerRef.current) {
          clearTimeout(testCooldownTimerRef.current)
        }
        testCooldownTimerRef.current = setTimeout(() => {
          setTestCooldownCameraId(null)
        }, TEST_COOLDOWN_MS)
      } catch (err) {
        const detail = (err as { message?: string })?.message
        setTestError(detail || "Falha ao atualizar status do Edge.")
      } finally {
        setTestingCameraId(null)
      }
    },
    [queryClient, selectedStore]
  )

  useEffect(() => {
    return () => {
      if (testCooldownTimerRef.current) {
        clearTimeout(testCooldownTimerRef.current)
        testCooldownTimerRef.current = null
      }
    }
  }, [])




  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Inteligência operacional
            </p>
            <h1 className="text-3xl font-bold text-gray-800">Monitoramento de câmeras</h1>
            <p className="text-gray-600 mt-1">
              Suas câmeras estão conectadas, monitoradas e prontas para gerar insights da loja.
            </p>
          </div>

          {stores && stores.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                  disabled={storesLoading}
                  aria-label="Selecionar loja para visualizar câmeras"
                >
                  {!onboardingMode && stores.length > 1 && (
                    <option value="all">Todas as lojas</option>
                  )}
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>

                {storesLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {onboardingMode && selectedStore && selectedStore !== "all" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900">
          <div className="text-sm font-semibold">Passo 2 de 4 — Conecte sua primeira câmera</div>
          <p className="text-xs text-blue-800 mt-1">
            Preencha o IP e as credenciais. O Edge Agent testa automaticamente e atualiza o status.
          </p>
        </div>
      )}

      {onboardingMode && selectedStore && selectedStore !== "all" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-semibold text-gray-800">Passo a passo</div>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div>1. Você precisa estar na mesma rede do NVR/câmeras (ex.: PC 192.168.15.x).</div>
            <div>2. Digite o IP do NVR + usuário/senha.</div>
            <div>3. Selecione o canal (NVR) ou informe o RTSP.</div>
            <div>4. Aguarde o status do Edge aparecer na lista.</div>
          </div>
        </div>
      )}

      {!selectedStore ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
          Nenhuma loja disponível para exibir câmeras.
        </div>
      ) : (
        <div className="space-y-4">
          {selectedStore !== "all" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Status do Edge
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {edgeOnline
                      ? "Agente online"
                      : "Agente offline — abra o Edge Agent para retomar o monitoramento."}
                  </p>
                  <p className={`text-xs mt-1 ${cameraSourceSummary.className}`}>
                    {cameraSourceSummary.text}
                  </p>
                </div>
                {!edgeOnline && (
                  <button
                    type="button"
                    onClick={() => setEdgeSetupOpen(true)}
                    disabled={!canManageStore}
                    className={`inline-flex w-full sm:w-auto items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      !canManageStore
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    Abrir Edge Setup
                  </button>
                )}
              </div>

              {edgeOnline && (edgeStatus?.cameras_total ?? 0) === 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Você só precisa do IP + login da câmera/NVR.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={openCreateModal}
                      disabled={limitReached || !canManageStore}
                      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                        limitReached || !canManageStore
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      Adicionar primeira câmera (guiado)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {stepStates.map((step) => (
                  <span
                    key={step.label}
                    className={`px-3 py-1 text-xs rounded-full font-semibold ${
                      step.state === "done"
                        ? "bg-green-100 text-green-700"
                        : step.state === "next"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
              {stepStates.some((step) => step.label === "Desenhar ROI" && step.state === "next") && (
                <p className="text-xs text-blue-700">
                  Próximo passo: abra o ROI de uma câmera e publique a versão.
                </p>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Gerenciar câmeras
              </h2>
              {selectedStore === "all" && (
                <p className="text-xs text-gray-500 mt-1">
                  Visualizando câmeras de todas as lojas.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {camerasLimit !== null
                  ? `${camerasUsed}/${camerasLimit} câmeras ${
                      isTrial ? "(Trial)" : ""
                    }`
                  : `${camerasUsed} câmeras cadastradas`}
              </p>
              {!canManageStore && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800">
                    Acesso somente leitura. Você não pode editar ou atualizar status nesta loja.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => requestSupportMutation.mutate()}
                      disabled={
                        selectedStore === "all" ||
                        requestSupportMutation.isPending ||
                        latestSupportRequest?.status === "pending"
                      }
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        selectedStore === "all" ||
                        requestSupportMutation.isPending ||
                        latestSupportRequest?.status === "pending"
                          ? "cursor-not-allowed bg-amber-100 text-amber-500"
                          : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      {latestSupportRequest?.status === "pending"
                        ? "Suporte já solicitado"
                        : requestSupportMutation.isPending
                        ? "Enviando..."
                        : "Solicitar suporte para câmera/ROI"}
                    </button>
                    {latestSupportRequest && (
                      <span className="text-xs text-amber-700">
                        Última solicitação: {latestSupportRequest.status}{" "}
                        {latestSupportRequest.requested_at
                          ? `(${formatTimestamp(latestSupportRequest.requested_at)})`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                O status vem do Edge na loja (não é teste do servidor). Se aparecer offline,
                confirme o agente e a rede local.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={selectedStore === "all" || limitReached || !canManageStore}
              title={
                selectedStore === "all"
                  ? "Escolha uma loja para adicionar câmera."
                  :
                limitReached
                  ? "Limite de câmeras do trial atingido."
                  : !canManageStore
                  ? "Sem permissão para adicionar câmera."
                  : "Adicionar câmera"
              }
              className={`inline-flex w-full sm:w-auto items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                selectedStore === "all" || limitReached || !canManageStore
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Adicionar câmera
            </button>
          </div>

          {camerasLoading ? (
            <div className="text-sm text-gray-500">Carregando câmeras...</div>
          ) : camerasError ? (
            <div className="text-sm text-red-600">Falha ao carregar câmeras</div>
          ) : cameras && cameras.length > 0 ? (
            <div className="space-y-3">
              {cameras.map((camera) => {
                const realtime = edgeCameraMap.get(String(camera.id))
                const storeName =
                  camera.store_name ||
                  stores?.find((store) => store.id === camera.store)?.name ||
                  null
                const statusValue =
                  realtime?.status ?? camera.camera_health?.status ?? camera.status ?? "unknown"
                const normalizedStatus = String(statusValue || "unknown").toLowerCase()
                const isAwaitingValidation =
                  normalizedStatus === "unknown" || normalizedStatus === "awaiting_validation"
                const latencyValue =
                  camera.camera_health?.latency_ms ?? camera.latency_ms ?? null
                const errorValue =
                  camera.camera_health?.error ?? camera.last_error ?? null
                const checkedAt =
                  realtime?.camera_last_heartbeat_ts ??
                  camera.camera_health?.checked_at ??
                  camera.last_seen_at ??
                  null
                const snapshotUrl =
                  camera.camera_health?.snapshot_url ?? camera.last_snapshot_url ?? null
                const realtimeReason = realtime?.reason ?? null
                const showInlineTestResult =
                  (testingCameraId === camera.id || testCooldownCameraId === camera.id) &&
                  (testMessage || testError || latencyValue || errorValue || snapshotUrl)
                return (
                <div
                  key={camera.id}
                  className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {camera.name}
                      </p>
                      {isAwaitingValidation && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Em validação
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          statusValue === "online"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : statusValue === "degraded"
                            ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                            : statusValue === "error"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : statusValue === "offline"
                            ? "border-rose-200 bg-rose-50 text-rose-800"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {formatStatusLabel(statusValue)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Loja: {storeName || "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      RTSP: {camera.rtsp_url_masked ?? "não informado"}
                    </p>
                    {checkedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Último status operacional: {formatTimestamp(checkedAt)}
                      </p>
                    )}
                    {realtimeReason && (
                      <p className="text-xs text-gray-500 mt-1">
                        Motivo: {formatReason(realtimeReason)}
                      </p>
                    )}
                    {latencyValue !== null && latencyValue !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Latência: {latencyValue} ms
                      </p>
                    )}
                    {errorValue && (
                      <p className="text-xs text-red-600 mt-1">
                        Erro: {errorValue}
                      </p>
                    )}
                    {snapshotUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-600 truncate">
                          Snapshot: {snapshotUrl}
                        </p>
                        <img
                          src={snapshotUrl}
                          alt={`Snapshot ${camera.name}`}
                          className="mt-2 h-24 w-full max-w-xs rounded-lg border border-gray-200 object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(camera)}
                      disabled={!canManageStore}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        !canManageStore
                          ? "border-gray-200 text-gray-400 cursor-not-allowed"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestConnection(camera.id)}
                      disabled={
                        !canManageStore ||
                        testingCameraId === camera.id ||
                        testCooldownCameraId === camera.id
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        !canManageStore ||
                        testingCameraId === camera.id ||
                        testCooldownCameraId === camera.id
                          ? "border-emerald-100 text-emerald-300 cursor-not-allowed"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {testingCameraId === camera.id ? "Atualizando..." : "Atualizar status (Edge)"}
                    </button>
                      {canEditRoi && (
                        <button
                          type="button"
                          onClick={() => setRoiCamera(camera)}
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        ROI
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(camera.id)}
                      disabled={!canManageStore}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        !canManageStore
                          ? "border-red-100 text-red-300 cursor-not-allowed"
                          : "border-red-200 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      Remover
                    </button>
                  </div>
                  {(testingCameraId === camera.id || testCooldownCameraId === camera.id) && testMessage && (
                    <div className="text-xs text-emerald-700">{testMessage}</div>
                  )}
                  {(testingCameraId === camera.id || testCooldownCameraId === camera.id) && testError && (
                    <div className="text-xs text-red-600">{testError}</div>
                  )}
                  {showInlineTestResult && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {latencyValue !== null && latencyValue !== undefined && (
                        <div>Latência: {latencyValue} ms</div>
                      )}
                      {errorValue && <div className="text-red-600">Erro: {errorValue}</div>}
                      {snapshotUrl && (
                        <div className="text-blue-600 truncate">Snapshot: {snapshotUrl}</div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {selectedStore === "all"
                ? "Nenhuma câmera cadastrada."
                : "Nenhuma câmera cadastrada nesta loja."}
            </div>
          )}
        </div>
        </div>
      )}

      {/* Status das câmeras / QR code removidos conforme solicitação. */}

      <EdgeSetupModal
        open={edgeSetupOpen}
        onClose={() => setEdgeSetupOpen(false)}
        defaultStoreId={selectedStore && selectedStore !== "all" ? selectedStore : ""}
      />

      <CameraModal
        key={`${cameraModalOpen ? "open" : "closed"}-${editingCamera?.id ?? "new"}`}
        open={cameraModalOpen}
        camera={editingCamera}
        testing={
          testingCameraId === editingCamera?.id ||
          testCooldownCameraId === editingCamera?.id
        }
        testMessage={testMessage}
        testError={testError}
        createErrorMessage={createErrorMessage}
        createErrorDetails={createErrorDetails}
        createErrorFields={createErrorFields}
        showUpgradeCta={showUpgradeCta}
        onClose={() => {
          setCameraModalOpen(false)
          setEditingCamera(null)
          setTestMessage(null)
          setTestError(null)
          setCreateErrorMessage(null)
          setCreateErrorDetails([])
          setCreateErrorFields({})
          setShowUpgradeCta(false)
        }}
        onSave={handleSaveCamera}
        onTest={handleTestConnection}
        isSaving={createCameraMutation.isPending || updateCameraMutation.isPending}
        edgeOnline={edgeOnline}
        onOpenHelp={() => setConnectionHelpOpen(true)}
      />

      <CameraRoiEditor
        key={`${roiCamera?.id ?? "none"}-${roiCamera ? "open" : "closed"}`}
        open={Boolean(roiCamera)}
        camera={roiCamera}
        canEditRoi={canEditRoi}
        onClose={() => setRoiCamera(null)}
      />

      <ConnectionHelpModal
        open={connectionHelpOpen}
        onClose={() => setConnectionHelpOpen(false)}
        diagnoseUrl={diagnoseUrl}
      />
    </div>
  )
}

type CameraModalProps = {
  open: boolean
  camera: Camera | null
  testing: boolean
  testMessage: string | null
  testError: string | null
  createErrorMessage: string | null
  createErrorDetails: string[]
  createErrorFields: Record<string, string[]>
  showUpgradeCta: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (payload: CreateCameraPayload) => void
  onTest: (cameraId: string) => void
  edgeOnline: boolean
  onOpenHelp: () => void
}

  const CameraModal = ({
    open,
    camera,
    testing,
    testMessage,
    testError,
  createErrorMessage,
  createErrorDetails,
  createErrorFields,
  showUpgradeCta,
  isSaving,
  onClose,
  onSave,
  onTest,
  edgeOnline,
    onOpenHelp,
  }: CameraModalProps) => {
    const [form, setForm] = useState(() => ({
      name: camera?.name ?? "",
      ip: camera?.ip ?? "",
      username: "",
      password: "",
      brand: camera?.brand ?? "intelbras",
      channel: 1,
      subtype: 1,
      externalId: camera?.external_id ?? "",
      active: camera?.active ?? true,
    }))
  const [showPassword, setShowPassword] = useState(false)
  const [connectionType, setConnectionType] = useState<"ip_camera" | "nvr">(
    "ip_camera"
  )
  const [rtspUrl, setRtspUrl] = useState("")
  const [showRtsp, setShowRtsp] = useState(false)
  const [localValidationError, setLocalValidationError] = useState<string | null>(null)

  const hasFieldError = useCallback(
    (field: string) => Boolean(createErrorFields[field]?.length),
    [createErrorFields]
  )

  const brandNormalized = form.brand.trim().toLowerCase()
  const isIntelbras = brandNormalized.includes("intelbras")
  const showIntelbrasFields = connectionType === "nvr" && isIntelbras

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : ""
  const showNetworkWarning =
    edgeOnline && isPrivateIp(form.ip) && !isPrivateHost(hostname)
  const trimmedName = form.name.trim()
  const trimmedIp = form.ip.trim()
  const trimmedRtsp = rtspUrl.trim()
  const missingConnectionInput = !camera && !trimmedIp && !trimmedRtsp
  const saveDisabled = isSaving || !trimmedName || missingConnectionInput

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 p-6">
          <h3 className="text-lg font-semibold text-gray-800">
            {camera ? "Editar câmera" : "Nova câmera"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Não sabe RTSP? Sem problema — informe IP e credenciais da câmera/NVR.
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <input
                value={form.name}
                onChange={(e) => {
                  setLocalValidationError(null)
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }}
                placeholder="Ex: Entrada"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  hasFieldError("name")
                    ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                    : "border-gray-200"
                }`}
              />
            </div>
            <div>
              <label htmlFor="connection-type" className="text-sm font-medium text-gray-700">
                Tipo de conexão
              </label>
              <select
                id="connection-type"
                value={connectionType}
                onChange={(e) => {
                  setLocalValidationError(null)
                  setConnectionType(e.target.value as "ip_camera" | "nvr")
                }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="ip_camera">Câmera IP (RTSP direto)</option>
                <option value="nvr">NVR / CFTV IP</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">IP</label>
              <input
                value={form.ip}
                onChange={(e) => {
                  setLocalValidationError(null)
                  setForm((prev) => ({ ...prev, ip: e.target.value }))
                }}
                placeholder="192.168.0.10"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  hasFieldError("ip")
                    ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                    : "border-gray-200"
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Não sabe o IP? Normalmente começa com 192.168… Confira no app da câmera ou no roteador.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Usuário</label>
              <input
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="admin"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  hasFieldError("username")
                    ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                    : "border-gray-200"
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para manter as credenciais atuais.
              </p>
            </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className={`w-full rounded-lg border px-3 py-2 pr-20 text-sm ${
                      hasFieldError("password")
                        ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                        : "border-gray-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para manter as credenciais atuais.
                </p>
              </div>
            {connectionType === "nvr" && (
              <div>
                <label htmlFor="nvr-channel" className="text-sm font-medium text-gray-700">
                  Canal (NVR)
                </label>
                <input
                  id="nvr-channel"
                  type="number"
                  min={1}
                  value={form.channel}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setForm((prev) => ({
                      ...prev,
                      channel: Number.isNaN(next) ? 1 : next,
                    }))
                  }}
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            )}
            {showIntelbrasFields && (
              <div>
                <label htmlFor="intelbras-subtype" className="text-sm font-medium text-gray-700">
                  Subtipo (Intelbras)
                </label>
                <select
                  id="intelbras-subtype"
                  value={form.subtype}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setForm((prev) => ({
                      ...prev,
                      subtype: Number.isNaN(next) ? 1 : next,
                    }))
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="1">1 (economia de banda)</option>
                  <option value="0">0 (principal)</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Marca (opcional)
              </label>
              <input
                value={form.brand}
                onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                placeholder="Intelbras"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  hasFieldError("brand")
                    ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                    : "border-gray-200"
                }`}
              />
            </div>
            {connectionType === "ip_camera" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Câmeras cloud-only (iC4/Mibo) não expõem RTSP — recomendamos usar NVR.
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => setShowRtsp((prev) => !prev)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {showRtsp ? "Ocultar RTSP manual" : "Inserir RTSP manualmente"}
              </button>
            </div>
            {showRtsp && (
              <div>
                <label className="text-sm font-medium text-gray-700">RTSP URL</label>
                <input
                  value={rtspUrl}
                  onChange={(e) => {
                    setLocalValidationError(null)
                    setRtspUrl(e.target.value)
                  }}
                  placeholder="rtsp://usuario:senha@host/stream"
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                    hasFieldError("rtsp_url")
                      ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                      : "border-gray-200"
                  }`}
                />
                {camera?.rtsp_url_masked && (
                  <p className="text-xs text-gray-400 mt-1">
                    Atual: {camera.rtsp_url_masked}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">
                ID externo (opcional)
              </label>
              <input
                value={form.externalId}
                onChange={(e) => setForm((prev) => ({ ...prev, externalId: e.target.value }))}
                placeholder="cam-001"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  hasFieldError("external_id")
                    ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                    : "border-gray-200"
                }`}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              Câmera ativa
            </label>
          </div>

          {showNetworkWarning && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Parece que você não está na rede da loja. Cadastre a câmera quando estiver na loja
              ou peça para o gerente rodar o Diagnose e compartilhar o ZIP.
            </div>
          )}

          {createErrorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <div className="font-semibold">Não foi possível cadastrar</div>
              <p className="mt-1">{createErrorMessage}</p>
              {createErrorDetails.length > 0 && (
                <div className="mt-2 space-y-1">
                  {createErrorDetails.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              )}
              {showUpgradeCta && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/app/billing"
                  }}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Ir para billing
                </button>
              )}
              <button
                type="button"
                onClick={onOpenHelp}
                className="mt-2 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Rodar Diagnose
              </button>
            </div>
          )}
          {!camera && (
            <p className="mt-2 text-xs text-gray-500">
              Após salvar, aguarde o status do Edge ser atualizado.
            </p>
          )}
          {testMessage && (
            <p className="mt-3 text-xs text-emerald-700">{testMessage}</p>
          )}
          {testError && (
            <p className="mt-3 text-xs text-red-600">{testError}</p>
          )}
          {localValidationError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {localValidationError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          {camera && (
            <button
              type="button"
              onClick={() => onTest(camera.id)}
              disabled={testing}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                testing ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {testing ? "Atualizando..." : "Atualizar status (Edge)"}
            </button>
          )}
          <button
            type="button"
            disabled={saveDisabled}
            onClick={() => {
              const cleanedName = form.name.trim()
              const cleanedIp = form.ip.trim()
              const cleanedUsername = form.username.trim()
              const cleanedPassword = form.password.trim()
              const cleanedBrand = form.brand.trim()
              const cleanedRtsp = rtspUrl.trim()
              setLocalValidationError(null)

              if (!cleanedName) {
                setLocalValidationError("Informe um nome para a câmera.")
                return
              }

              if (!camera && !cleanedIp && !cleanedRtsp) {
                setLocalValidationError("Informe o IP da câmera/NVR ou preencha o RTSP manual.")
                return
              }

              if (
                connectionType === "nvr" &&
                !cleanedRtsp &&
                (!Number.isFinite(Number(form.channel)) || Number(form.channel) < 1)
              ) {
                setLocalValidationError("Informe um canal de NVR válido (maior que zero).")
                return
              }

              const inferredRtsp =
                cleanedRtsp ||
                buildRtspUrl({
                  connectionType,
                  ip: cleanedIp,
                  username: cleanedUsername,
                  password: cleanedPassword,
                  channel: String(form.channel),
                  brand: cleanedBrand,
                  subtype: String(form.subtype),
                }) ||
                undefined
              const inferredExternalId =
                form.externalId ||
                (connectionType === "nvr" && form.channel
                  ? `ch${form.channel}-sub${form.subtype}`
                  : null)
              const payload: CreateCameraPayload = {
                name: cleanedName,
                ip: cleanedIp || undefined,
                brand: cleanedBrand || undefined,
                external_id: inferredExternalId,
                active: form.active,
                rtsp_url: inferredRtsp,
              }
              if (cleanedUsername) {
                payload.username = cleanedUsername
              }
              if (cleanedPassword) {
                payload.password = cleanedPassword
              }
              onSave(payload)
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              saveDisabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

const buildRtspUrl = (args: {
  connectionType: "ip_camera" | "nvr"
  ip: string
  username: string
  password: string
  channel: string
  brand: string
  subtype: string
}) => {
  if (!args.ip) return ""
  const auth =
    args.username || args.password
      ? `${encodeURIComponent(args.username)}:${encodeURIComponent(args.password)}@`
      : ""
  if (args.connectionType === "nvr") {
    const channel = args.channel || "1"
    const brand = args.brand.trim().toLowerCase()
    const subtype = args.subtype || "1"
    if (brand.includes("intelbras")) {
      return `rtsp://${auth}${args.ip}:554/cam/realmonitor?channel=${channel}&subtype=${subtype}`
    }
    return `rtsp://${auth}${args.ip}:554/Streaming/Channels/${channel}`
  }
  return `rtsp://${auth}${args.ip}:554/stream`
}

type ConnectionHelpModalProps = {
  open: boolean
  onClose: () => void
  diagnoseUrl: string
}

const ConnectionHelpModal = ({ open, onClose, diagnoseUrl }: ConnectionHelpModalProps) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Instruções de conexão</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Fechar
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-gray-600">
          <div>1. Confirme que o computador está na mesma rede do NVR/câmeras.</div>
          <div>2. Verifique IP, usuário e senha do NVR.</div>
          <div>3. Para Intelbras, informe o canal e mantenha o subtipo em 1.</div>
          <div>
            4. Se estiver remoto, peça para o gerente rodar o{" "}
            <span className="font-mono">Diagnose.bat</span> e enviar o ZIP gerado.
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <a
            href={diagnoseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Abrir instruções + Diagnose
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cameras
