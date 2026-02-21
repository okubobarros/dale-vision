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
import { formatAge, formatReason, formatStatusLabel, formatTimestamp } from "../../utils/edgeReasons"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import CameraRoiEditor from "../../components/CameraRoiEditor"
import { useIsMobile } from "../../hooks/useIsMobile"

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
  const testTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const testStartedAtRef = useRef<number | null>(null)
  const onboardingMode = initialOnboardingMode
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false)
  const isMobile = useIsMobile(768)
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const queryClient = useQueryClient()
  const diagnoseUrl = "/app/edge-help"

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
    if ((stores ?? []).length === 1) {
      return stores?.[0]?.id ?? ""
    }
    return ""
  }, [selectedStoreOverride, stores])

  const selectedStoreItem = useMemo(
    () => (stores ?? []).find((s) => s.id === selectedStore) ?? null,
    [stores, selectedStore]
  )
  const selectedStoreRole = selectedStoreItem?.role ?? null
  const canManageStore = selectedStoreRole
    ? ["owner", "admin", "manager"].includes(selectedStoreRole)
    : true

  const edgeSetupLink = useMemo(() => {
    if (!origin) return ""
    const params = new URLSearchParams()
    if (selectedStore && selectedStore !== "all") {
      params.set("store", selectedStore)
    }
    params.set("openEdgeSetup", "1")
    return `${origin}/app/cameras?${params.toString()}`
  }, [origin, selectedStore])

  const qrUrl = edgeSetupLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
        edgeSetupLink
      )}`
    : ""

  const {
    data: edgeStatus,
    isLoading: edgeStatusLoading,
    error: edgeStatusError,
  } = useQuery<StoreEdgeStatus>({
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
    queryFn: () => camerasService.getStoreCameras(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    staleTime: 15000,
  })

  const { data: limits } = useQuery({
    queryKey: ["store-limits", selectedStore],
    queryFn: () => camerasService.getStoreLimits(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    staleTime: 30000,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-cameras", selectedStore] })
      queryClient.invalidateQueries({ queryKey: ["store-limits", selectedStore] })
      if (testingCameraId) {
        stopTestPolling()
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
  }, [canManageStore])

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
    const healthOk = (cameras || []).some(
      (cam) => cam.status === "online" || cam.status === "degraded"
    )
    const roiDone = false
    return [
      { label: "Adicionar câmera", done: hasCamera },
      { label: "Verificar conexão", done: healthOk },
      { label: "Desenhar ROI", done: roiDone },
    ]
  }, [cameras])

  const stopTestPolling = useCallback(() => {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current)
      testTimerRef.current = null
    }
    testStartedAtRef.current = null
  }, [])

  const startTestPolling = useCallback(
    (cameraId: string) => {
      stopTestPolling()
      setTestingCameraId(cameraId)
      setTestMessage("Testando conexão com o Edge...")
      setTestError(null)
      testStartedAtRef.current = Date.now()

      testTimerRef.current = setInterval(async () => {
        const startedAt = testStartedAtRef.current || Date.now()
        const elapsed = Date.now() - startedAt
        if (elapsed > 120000) {
          stopTestPolling()
          setTestingCameraId(null)
          setTestError("Sem resposta do Edge em 2 minutos. Verifique a câmera.")
          return
        }

        try {
          const latest = await camerasService.getCamera(cameraId)
          const lastSeen = latest.last_seen_at ? new Date(latest.last_seen_at).getTime() : 0
          const ageSeconds = lastSeen ? Math.floor((Date.now() - lastSeen) / 1000) : null
          if (latest.status === "online" && (ageSeconds === null || ageSeconds <= 60)) {
            stopTestPolling()
            setTestingCameraId(null)
            setTestMessage("Câmera online.")
            queryClient.invalidateQueries({ queryKey: ["store-cameras", selectedStore] })
            return
          }
          if (latest.status === "error" || latest.last_error) {
            stopTestPolling()
            setTestingCameraId(null)
            setTestError(latest.last_error || "Falha ao conectar na câmera.")
            return
          }
        } catch (err) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 404) {
            stopTestPolling()
            setTestingCameraId(null)
            setTestError("Câmera não encontrada. Atualize a lista.")
          }
        }
      }, 5000)
    },
    [queryClient, selectedStore, stopTestPolling]
  )

  const handleTestConnection = useCallback(
    async (cameraId: string) => {
      setTestError(null)
      setTestMessage(null)
      try {
        const result = await camerasService.testConnection(cameraId)
        if (result.queued || result.status === 202) {
          toast.success("Teste iniciado. Aguardando resposta do Edge...")
          setTestMessage("Teste iniciado. Aguardando resposta do Edge...")
        }
        startTestPolling(cameraId)
      } catch (err) {
        const detail = (err as { message?: string })?.message
        setTestError(detail || "Falha ao solicitar teste.")
      }
    },
    [startTestPolling]
  )

  useEffect(() => {
    return () => {
      stopTestPolling()
    }
  }, [stopTestPolling])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-800">Câmeras</h1>
          <p className="text-gray-600 mt-1">
            Cadastre câmeras, desenhe ROIs e monitore status.
          </p>
        </div>

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
                  disabled={storesLoading}
                  aria-label="Selecionar loja para visualizar câmeras"
              >
                <option value="">Selecione uma loja</option>
                <option value="all">Todas as lojas</option>
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
            <div>4. Clique em Verificar conexão.</div>
          </div>
        </div>
      )}

      {!selectedStore || selectedStore === "all" ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
          Selecione uma loja para gerenciar câmeras.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Status do Edge
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {edgeStatus?.online
                    ? "Agente online"
                    : "Agente offline — abra o Edge Agent para retomar o monitoramento."}
                </p>
              </div>
              {!edgeStatus?.online && (
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

            {edgeStatus?.online && (edgeStatus?.cameras_total ?? 0) === 0 && (
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
                    step.done
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Gerenciar câmeras
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {camerasLimit !== null
                  ? `${camerasUsed}/${camerasLimit} câmeras ${
                      isTrial ? "(Trial)" : ""
                    }`
                  : `${camerasUsed} câmeras cadastradas`}
              </p>
              {!canManageStore && (
                <p className="text-xs text-amber-700 mt-2">
                  Acesso somente leitura. Você não pode editar ou testar câmeras nesta loja.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={limitReached || !canManageStore}
              title={
                limitReached
                  ? "Limite de câmeras do trial atingido."
                  : !canManageStore
                  ? "Sem permissão para adicionar câmera."
                  : "Adicionar câmera"
              }
              className={`inline-flex w-full sm:w-auto items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                limitReached || !canManageStore
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
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {camera.name}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          camera.status === "online"
                            ? "bg-green-100 text-green-800"
                            : camera.status === "degraded"
                            ? "bg-yellow-100 text-yellow-800"
                            : camera.status === "error"
                            ? "bg-red-100 text-red-800"
                            : camera.status === "offline"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {formatStatusLabel(camera.status ?? "unknown")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      RTSP: {camera.rtsp_url_masked ?? "não informado"}
                    </p>
                    {camera.last_seen_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Última verificação: {formatTimestamp(camera.last_seen_at)}
                      </p>
                    )}
                    {camera.latency_ms !== null && camera.latency_ms !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Latência: {camera.latency_ms} ms
                      </p>
                    )}
                    {camera.last_error && (
                      <p className="text-xs text-red-600 mt-1">
                        Erro: {camera.last_error}
                      </p>
                    )}
                    {camera.last_snapshot_url && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-600 truncate">
                          Snapshot: {camera.last_snapshot_url}
                        </p>
                        <img
                          src={camera.last_snapshot_url}
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
                      disabled={!canManageStore}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        !canManageStore
                          ? "border-emerald-100 text-emerald-300 cursor-not-allowed"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      Testar conexão
                    </button>
                    {canManageStore && (
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Nenhuma câmera cadastrada nesta loja.
            </div>
          )}
        </div>
        </div>
      )}

      {!onboardingMode && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Status das câmeras
              </h2>
              <p className="text-xs text-gray-500">
                Gere o .env do agente e valide a conexão com a API.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
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
              <button
                type="button"
                onClick={() => setShowAdvancedHelp((prev) => !prev)}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {showAdvancedHelp ? "Ocultar avançado" : "Avançado"}
              </button>
            </div>
          </div>

          {showAdvancedHelp && isMobile && edgeSetupLink && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Ajuda rápida
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Envie o link para abrir o Edge Setup no PC.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Copiar link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Abra este link no computador para configurar o Edge Agent:\n${edgeSetupLink}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white text-center hover:bg-green-700"
                >
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
          )}

          {showAdvancedHelp && !isMobile && edgeSetupLink && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <img
                src={qrUrl}
                alt="QR code do Edge Setup"
                className="h-24 w-24 rounded-lg border border-gray-200"
              />
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  Ajuda (QR Code)
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Escaneie para abrir o Edge Setup no celular.
                </div>
                <div className="mt-2 text-xs text-blue-600 break-all">
                  {edgeSetupLink}
                </div>
              </div>
            </div>
          )}

          {!selectedStore || selectedStore === "all" ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
              Selecione uma loja para ver status das câmeras.
            </div>
          ) : edgeStatusLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
              Carregando status...
            </div>
          ) : edgeStatusError ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-red-600">
              Falha ao carregar status das câmeras
            </div>
          ) : edgeStatus && edgeStatus.cameras.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Status da loja</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {edgeStatus.store_status === "online"
                        ? "Loja Online"
                        : edgeStatus.store_status === "degraded"
                        ? "Loja Instável"
                        : edgeStatus.store_status === "offline"
                        ? "Loja Offline"
                        : "Status desconhecido"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Último heartbeat há{" "}
                      <span className="font-semibold text-gray-700">
                        {formatAge(edgeStatus.store_status_age_seconds)}
                      </span>
                    </p>
                    {edgeStatus.store_status_reason && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatReason(edgeStatus.store_status_reason)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      edgeStatus.store_status === "online"
                        ? "bg-green-100 text-green-800"
                        : edgeStatus.store_status === "degraded"
                        ? "bg-yellow-100 text-yellow-800"
                        : edgeStatus.store_status === "offline"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {edgeStatus.store_status ?? "unknown"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {edgeStatus.cameras.map((cam) => (
                  <div
                    key={cam.camera_id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {cam.name}
                        </p>
                        <p className="text-xs text-gray-500">{cam.camera_id}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
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
                    </div>

                    <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">Idade:</span>
                      <span>{formatAge(cam.age_seconds)}</span>
                    </div>

                    <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">Último:</span>
                      <span>{formatTimestamp(cam.camera_last_heartbeat_ts)}</span>
                    </div>

                    {cam.reason && (
                      <p className="text-xs text-gray-500 mt-2">
                        {formatReason(cam.reason)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
              <p className="mb-3">Nenhuma câmera encontrada.</p>
              <button
                type="button"
                onClick={() => setEdgeSetupOpen(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Abrir Edge Setup
              </button>
            </div>
          )}
        </>
      )}

      <EdgeSetupModal
        open={edgeSetupOpen}
        onClose={() => setEdgeSetupOpen(false)}
        defaultStoreId={selectedStore && selectedStore !== "all" ? selectedStore : ""}
      />

      <CameraModal
        key={`${cameraModalOpen ? "open" : "closed"}-${editingCamera?.id ?? "new"}`}
        open={cameraModalOpen}
        camera={editingCamera}
        testing={testingCameraId === editingCamera?.id}
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
        edgeOnline={Boolean(edgeStatus?.online)}
        onOpenHelp={() => setConnectionHelpOpen(true)}
      />

      <CameraRoiEditor
        key={`${roiCamera?.id ?? "none"}-${roiCamera ? "open" : "closed"}`}
        open={Boolean(roiCamera)}
        camera={roiCamera}
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
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
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
                onChange={(e) =>
                  setConnectionType(e.target.value as "ip_camera" | "nvr")
                }
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
                onChange={(e) => setForm((prev) => ({ ...prev, ip: e.target.value }))}
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
                  onChange={(e) => setRtspUrl(e.target.value)}
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
              Após salvar, clique em Verificar conexão para confirmar.
            </p>
          )}
          {testMessage && (
            <p className="mt-3 text-xs text-emerald-700">{testMessage}</p>
          )}
          {testError && (
            <p className="mt-3 text-xs text-red-600">{testError}</p>
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
              {testing ? "Testando..." : "Verificar conexão"}
            </button>
          )}
          <button
            type="button"
            disabled={isSaving || !form.name?.trim()}
            onClick={() => {
              const cleanedIp = form.ip.trim()
              const cleanedUsername = form.username.trim()
              const cleanedPassword = form.password
              const cleanedBrand = form.brand.trim()
              const cleanedRtsp = rtspUrl.trim()
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
                name: form.name,
                ip: cleanedIp || undefined,
                username: cleanedUsername || undefined,
                password: cleanedPassword || undefined,
                brand: cleanedBrand || undefined,
                external_id: inferredExternalId,
                active: form.active,
                rtsp_url: inferredRtsp,
              }
              onSave(payload)
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              isSaving || !form.name?.trim()
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
