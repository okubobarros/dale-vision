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
import { formatAge, formatReason, formatTimestamp } from "../../utils/edgeReasons"
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

const Cameras = () => {
  const [selectedStore, setSelectedStore] = useState("")
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(false)
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [connectionHelpOpen, setConnectionHelpOpen] = useState(false)
  const [roiCamera, setRoiCamera] = useState<Camera | null>(null)
  const [testingCameraId, setTestingCameraId] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const testTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const testStartedAtRef = useRef<number | null>(null)
  const [onboardingMode, setOnboardingMode] = useState(false)
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false)
  const isMobile = useIsMobile(768)
  const [origin, setOrigin] = useState("")
  const location = useLocation()
  const queryClient = useQueryClient()
  const diagnoseUrl = "/app/edge-help"

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const openEdgeSetup =
      params.get("openEdgeSetup") === "1" || params.get("edgeSetup") === "1"
    const storeFromQuery = params.get("store_id") || params.get("store") || ""
    const onboardingFromQuery = params.get("onboarding") === "true"
    if (storeFromQuery) {
      setSelectedStore(storeFromQuery)
    }
    setOnboardingMode(onboardingFromQuery)
    if (openEdgeSetup) {
      setEdgeSetupOpen(true)
      params.delete("openEdgeSetup")
      params.delete("edgeSetup")
      params.delete("store")
      const next = params.toString()
      const newUrl = `${location.pathname}${next ? `?${next}` : ""}`
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", newUrl)
      }
    }
  }, [location.pathname, location.search])

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

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
    staleTime: 60000,
  })

  useEffect(() => {
    if (selectedStore) return
    if ((stores ?? []).length === 1) {
      setSelectedStore((stores ?? [])[0].id)
    }
  }, [stores, selectedStore])

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
    },
    onError: (err: unknown) => {
      const payload = (err as { response?: { data?: { code?: string } } })?.response?.data
      if (payload?.code === "SUBSCRIPTION_REQUIRED") {
        toast.custom((t) => (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
            <div className="text-sm text-gray-700">
              Trial expirado. Assine para continuar.
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => {
                toast.dismiss(t.id)
                window.location.href = "/app/billing"
              }}
            >
              Ver planos
            </button>
          </div>
        ))
        return
      }
      const code = (err as { code?: string })?.code
      if (code === "LIMIT_CAMERAS_REACHED") {
        toast.error("Limite de câmeras do trial atingido.")
        return
      }
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400) {
        setCreateErrorMessage(
          "Você está fora da rede da loja ou faltam campos (ex.: canal)."
        )
        setConnectionHelpOpen(true)
        if (import.meta.env.DEV) {
          console.warn("[Cameras] create camera 400", err)
        }
        return
      }
      if (import.meta.env.DEV) {
        console.warn("[Cameras] create camera failed", err)
      }
      toast.error("Falha ao criar câmera.")
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
    setEditingCamera(null)
    setCameraModalOpen(true)
    setCreateErrorMessage(null)
    setConnectionHelpOpen(false)
  }, [])

  const openEditModal = useCallback((camera: Camera) => {
    setEditingCamera(camera)
    setCameraModalOpen(true)
    setCreateErrorMessage(null)
    setConnectionHelpOpen(false)
  }, [])

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
        } catch {
          // ignore errors during polling
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
        await camerasService.testConnection(cameraId)
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Entrada"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de conexão</label>
              <select
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
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.0.10"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Não sabe o IP? Normalmente começa com 192.168… Confira no app da câmera ou no roteador.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Usuário</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {connectionType === "nvr" && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Canal (NVR)
                </label>
                <input
                  type="number"
                  min={1}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            )}
            {showIntelbrasFields && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subtipo (Intelbras)
                </label>
                <select
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
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
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Intelbras"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="cam-001"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
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
              <button
                type="button"
                onClick={onOpenHelp}
                className="mt-2 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Abrir instruções de conexão
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
            disabled={saving || !name.trim()}
            onClick={() =>
              onSave({
                name: name.trim(),
                brand: brand.trim() || undefined,
                ip: ip.trim() || undefined,
                username: username.trim() || undefined,
                password: password || undefined,
                rtsp_url:
                  rtspUrl.trim() ||
                  buildRtspUrl({
                    connectionType,
                    ip: ip.trim(),
                    username: username.trim(),
                    password,
                    channel: channel.trim(),
                    brand: brand.trim(),
                    subtype: subtype.trim(),
                  }) ||
                  undefined,
                external_id: externalId.trim() || undefined,
                active,
              })
            }
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              saving || !name.trim()
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Salvando..." : "Salvar"}
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
          <div>4. Se estiver remoto, peça para o gerente rodar o Diagnose e enviar o ZIP.</div>
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
