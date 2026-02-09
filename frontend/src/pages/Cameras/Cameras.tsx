import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  storesService,
  type Store,
  type StoreEdgeStatus,
} from "../../services/stores"
import { formatAge, formatReason, formatTimestamp } from "../../utils/edgeReasons"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import { useIsMobile } from "../../hooks/useIsMobile"

const Cameras = () => {
  const [selectedStore, setSelectedStore] = useState("")
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(false)
  const isMobile = useIsMobile(768)
  const [currentUrl, setCurrentUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const qrUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
        currentUrl
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


  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-800">Câmeras</h1>
          <p className="text-gray-600 mt-1">
            Status e saúde das câmeras por loja
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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Status das câmeras
        </h2>
        <button
          type="button"
          onClick={() => setEdgeSetupOpen(true)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Abrir Edge Setup
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Gere o .env do agente e valide a conexão com a API.
      </p>

      {isMobile && currentUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <img
              src={qrUrl}
              alt="QR code da página atual"
              className="h-28 w-28 rounded-lg border border-gray-200"
            />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Continuar no computador
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                O Edge Agent requer desktop. Escaneie o QR code para abrir esta
                página no computador.
              </p>
              <div className="mt-2 text-xs text-blue-600 break-all">
                {currentUrl}
              </div>
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
    </div>
  )
}

export default Cameras
