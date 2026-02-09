import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import api from "../services/api"
import { storesService, type Store } from "../services/stores"

type EdgeSetupModalProps = {
  open: boolean
  onClose: () => void
  defaultStoreId?: string
}

const DEFAULT_CLOUD_BASE_URL = "https://api.dalevision.com"

const EdgeSetupModal = ({ open, onClose, defaultStoreId }: EdgeSetupModalProps) => {
  const [storeId, setStoreId] = useState(defaultStoreId || "")
  const [edgeToken, setEdgeToken] = useState("")
  const [agentId, setAgentId] = useState("")
  const [cloudBaseUrl, setCloudBaseUrl] = useState(DEFAULT_CLOUD_BASE_URL)
  const [validationMsg, setValidationMsg] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [loadingCreds, setLoadingCreds] = useState(false)

  const downloadUrl = (import.meta.env.VITE_EDGE_AGENT_DOWNLOAD_URL || "").trim()

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
    enabled: open && !defaultStoreId,
  })

  useEffect(() => {
    if (open) {
      setStoreId(defaultStoreId || "")
      setCloudBaseUrl(DEFAULT_CLOUD_BASE_URL)
      setValidationMsg(null)
      setValidating(false)
      setLoadingCreds(false)
    }
  }, [open, defaultStoreId])

  useEffect(() => {
    const loadCreds = async () => {
      if (!open || !storeId) return
      setLoadingCreds(true)
      setValidationMsg(null)
      try {
        const res = await api.get(`/v1/stores/${storeId}/edge-setup/`)
        const data = res.data || {}
        setEdgeToken(data.edge_token || "")
        setAgentId(data.agent_id_suggested || data.agent_id_default || "")
        setCloudBaseUrl(data.cloud_base_url || DEFAULT_CLOUD_BASE_URL)
      } catch (err: any) {
        setEdgeToken("")
        setAgentId("")
        setCloudBaseUrl(DEFAULT_CLOUD_BASE_URL)
        setValidationMsg(
          err?.response?.data?.detail ||
            err?.message ||
            "Falha ao obter credenciais do edge."
        )
      } finally {
        setLoadingCreds(false)
      }
    }

    loadCreds()
  }, [open, storeId])

  const envContent = useMemo(() => {
    const lines = [
      `CLOUD_BASE_URL=${cloudBaseUrl || ""}`,
      `EDGE_TOKEN=${edgeToken || ""}`,
      `STORE_ID=${storeId || ""}`,
      `AGENT_ID=${agentId || ""}`,
      "HEARTBEAT_INTERVAL_SECONDS=30",
      "CAMERA_HEARTBEAT_INTERVAL_SECONDS=30",
    ]
    return lines.join("\n")
  }, [cloudBaseUrl, edgeToken, storeId, agentId])

  const handleValidate = async () => {
    if (!storeId) {
      setValidationMsg("Informe o store_id para validar.")
      return
    }
    setValidating(true)
    setValidationMsg(null)
    try {
      await api.get(`/v1/stores/${storeId}/edge-status/`)
      setValidationMsg("API ok. Agora inicie o agent e aguarde heartbeat.")
    } catch (err: any) {
      setValidationMsg(
        err?.response?.data?.detail ||
          err?.message ||
          "Falha ao validar. Verifique o store_id e a API."
      )
    } finally {
      setValidating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Edge Setup Wizard</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-700 font-semibold">1) Download do Edge Agent</div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Download do Edge Agent
                </a>
              ) : (
                <div className="text-xs text-gray-500">
                  Configurar VITE_EDGE_AGENT_DOWNLOAD_URL
                </div>
              )}
            </div>
          </div>

          {!defaultStoreId && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Selecionar loja</label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione uma loja</option>
                {(stores || []).map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">store_id</label>
              <input
                value={storeId}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="UUID da store"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">edge_token</label>
              <input
                value={edgeToken}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={loadingCreds ? "Carregando..." : "Token do Edge"}
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">agent_id</label>
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="edge-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">cloud_base_url</label>
              <input
                value={cloudBaseUrl}
                onChange={(e) => setCloudBaseUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://api.dalevision.com"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">2) Conteúdo do .env</div>
            <textarea
              value={envContent}
              readOnly
              rows={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-700"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(envContent)
                  toast.success("Conteúdo copiado ✅")
                } catch (err) {
                  toast.error("Falha ao copiar. Copie manualmente.")
                }
              }}
              className="mt-3 inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Copiar
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {validating ? "Validando..." : "Validar conexão"}
            </button>
            {validationMsg && (
              <div className="text-sm text-gray-700">{validationMsg}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EdgeSetupModal
