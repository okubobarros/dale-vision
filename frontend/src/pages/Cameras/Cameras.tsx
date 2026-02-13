import { useCallback, useEffect, useMemo, useState } from "react"
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

const Cameras = () => {
  const [selectedStore, setSelectedStore] = useState("")
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(false)
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null)
  const [roiCamera, setRoiCamera] = useState<Camera | null>(null)
  const isMobile = useIsMobile(768)
  const [origin, setOrigin] = useState("")
  const location = useLocation()
  const queryClient = useQueryClient()

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
    if (storeFromQuery) {
      setSelectedStore(storeFromQuery)
    }
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
  })

  const {
    data: edgeStatus,
    isLoading: edgeStatusLoading,
    error: edgeStatusError,
  } = useQuery<StoreEdgeStatus>({
    queryKey: ["store-edge-status", selectedStore],
    queryFn: () => storesService.getStoreEdgeStatus(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
  })

  const {
    data: cameras,
    isLoading: camerasLoading,
    error: camerasError,
  } = useQuery<Camera[]>({
    queryKey: ["store-cameras", selectedStore],
    queryFn: () => camerasService.getStoreCameras(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
  })

  const { data: limits } = useQuery({
    queryKey: ["store-limits", selectedStore],
    queryFn: () => camerasService.getStoreLimits(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
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
      const code = (err as { code?: string })?.code
      if (code === "LIMIT_CAMERAS_REACHED") {
        toast.error("Limite de câmeras do trial atingido.")
        return
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
  }, [])

  const openEditModal = useCallback((camera: Camera) => {
    setEditingCamera(camera)
    setCameraModalOpen(true)
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
                onChange={(e) => setSelectedStore(e.target.value)}
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

      {!selectedStore || selectedStore === "all" ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
          Selecione uma loja para gerenciar câmeras.
        </div>
      ) : (
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
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={limitReached}
              title={
                limitReached
                  ? "Limite de câmeras do trial atingido."
                  : "Adicionar câmera"
              }
              className={`inline-flex w-full sm:w-auto items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                limitReached
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
                        {camera.status ?? "unknown"}
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(camera)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoiCamera(camera)}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      ROI
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(camera.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
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
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Status das câmeras
          </h2>
          <p className="text-xs text-gray-500">
            Gere o .env do agente e valide a conexão com a API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEdgeSetupOpen(true)}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Abrir Edge Setup
        </button>
      </div>

      {isMobile && edgeSetupLink && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Continuar no computador
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

      {!isMobile && edgeSetupLink && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <img
            src={qrUrl}
            alt="QR code do Edge Setup"
            className="h-24 w-24 rounded-lg border border-gray-200"
          />
          <div>
            <div className="text-sm font-semibold text-gray-800">
              Continue no celular (opcional)
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

      <EdgeSetupModal
        open={edgeSetupOpen}
        onClose={() => setEdgeSetupOpen(false)}
        defaultStoreId={selectedStore && selectedStore !== "all" ? selectedStore : ""}
      />

      <CameraModal
        open={cameraModalOpen}
        camera={editingCamera}
        onClose={() => {
          setCameraModalOpen(false)
          setEditingCamera(null)
        }}
        onSave={handleSaveCamera}
        saving={createCameraMutation.isPending || updateCameraMutation.isPending}
      />

      <CameraRoiEditor
        open={Boolean(roiCamera)}
        camera={roiCamera}
        onClose={() => setRoiCamera(null)}
      />
    </div>
  )
}

type CameraModalProps = {
  open: boolean
  camera: Camera | null
  saving: boolean
  onClose: () => void
  onSave: (payload: CreateCameraPayload) => void
}

const CameraModal = ({
  open,
  camera,
  saving,
  onClose,
  onSave,
}: CameraModalProps) => {
  const [name, setName] = useState("")
  const [rtspUrl, setRtspUrl] = useState("")
  const [externalId, setExternalId] = useState("")
  const [active, setActive] = useState(true)

  useEffect(() => {
    setName(camera?.name ?? "")
    setRtspUrl("")
    setExternalId(camera?.external_id ?? "")
    setActive(camera?.active ?? true)
  }, [camera, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
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

        <div className="mt-5 space-y-4">
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() =>
              onSave({
                name: name.trim(),
                rtsp_url: rtspUrl.trim() || undefined,
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

export default Cameras
