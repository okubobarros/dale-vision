import type { StoreEdgeStatus } from "../../../services/stores"
import { formatReason, formatTimestamp } from "../../../utils/edgeReasons"

interface InfrastructureSectionProps {
  edgeStatusLoading: boolean
  edgeStatus: StoreEdgeStatus | undefined
  edgeStatusLabel: string
  edgeStatusClass: string
  lastSeenLabel: string
}

const cameraDisplayName = (name: string, index: number) => {
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)
  if (uuidLike || !name.trim()) return `Câmera ${index + 1}`
  return name
}

export function InfrastructureSection({
  edgeStatusLoading,
  edgeStatus,
  edgeStatusLabel,
  edgeStatusClass,
  lastSeenLabel,
}: InfrastructureSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Infraestrutura da loja</h2>
          <p className="text-sm text-gray-500 mt-1">
            Última comunicação: <span className="font-semibold text-gray-700">{lastSeenLabel}</span>
          </p>
          {edgeStatus?.store_status_reason && (
            <p className="text-xs text-gray-500 mt-1">
              {formatReason(edgeStatus.store_status_reason)}
            </p>
          )}
          {edgeStatus?.last_error && (
            <p className="text-xs text-red-600 mt-2">Erro: {edgeStatus.last_error}</p>
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
              : `${edgeStatus?.cameras_online ?? 0}/${edgeStatus?.cameras_total ?? 0} em operação`}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 px-3 py-2">
          <p className="text-xs text-gray-500">Situação da captação</p>
          <p className="text-sm font-semibold text-gray-800">
            {edgeStatusLoading ? "—" : formatReason(edgeStatus?.store_status_reason) ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 px-3 py-2">
          <p className="text-xs text-gray-500">Última comunicação</p>
          <p className="text-sm font-semibold text-gray-800">{lastSeenLabel}</p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Câmeras</h3>

        {edgeStatusLoading ? (
          <div className="text-sm text-gray-500">Carregando status...</div>
        ) : edgeStatus && edgeStatus.cameras.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {edgeStatus.cameras.map((cam, idx) => (
              <div
                key={cam.camera_id}
                className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {cameraDisplayName(cam.name, idx)}
                  </p>
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
                    {cam.status === "online"
                      ? "operação ativa"
                      : cam.status === "degraded"
                      ? "com instabilidade"
                      : cam.status === "offline"
                      ? "operação interrompida"
                      : "status indefinido"}
                  </span>
                  {cam.reason && (
                    <span className="text-[11px] text-gray-500">{formatReason(cam.reason)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Nenhuma câmera encontrada.</div>
        )}
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700 flex items-center justify-between">
          <span>Detalhes técnicos da infraestrutura</span>
          <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-xs text-gray-500">
          Detalhes técnicos em segundo plano para suporte operacional.
        </p>
      </details>
    </div>
  )
}
