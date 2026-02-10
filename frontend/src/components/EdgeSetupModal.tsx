import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import api from "../services/api"
import { storesService, type Store } from "../services/stores"

type EdgeSetupModalProps = {
  open: boolean
  onClose: () => void
  defaultStoreId?: string
}

type EdgeStatusPayload = {
  store_status?: string
  store_status_reason?: string
  last_heartbeat?: string | null
  last_seen_at?: string | null
  last_heartbeat_at?: string | null
}

type EdgeSetupPayload = {
  edge_token?: string
  agent_id_suggested?: string
  agent_id_default?: string
  cloud_base_url?: string
}

type ApiErrorLike = {
  response?: { status?: number; data?: { detail?: string } }
  message?: string
  code?: string
}

const DEFAULT_CLOUD_BASE_URL = "https://api.dalevision.com"
const DEFAULT_AGENT_ID = "edge-001"
const POLL_INTERVAL_MS = 4000
const POLL_MAX_DURATION_MS = 120000

const getApiError = (err: unknown): ApiErrorLike => {
  if (err && typeof err === "object") {
    return err as ApiErrorLike
  }
  return {}
}

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

const EdgeSetupModal = ({ open, onClose, defaultStoreId }: EdgeSetupModalProps) => {
  const [storeId, setStoreId] = useState(defaultStoreId || "")
  const [edgeToken, setEdgeToken] = useState("")
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID)
  const [cloudBaseUrl, setCloudBaseUrl] = useState(DEFAULT_CLOUD_BASE_URL)
  const [loadingCreds, setLoadingCreds] = useState(false)

  const [downloadConfirmed, setDownloadConfirmed] = useState(false)
  const [agentRunningConfirmed, setAgentRunningConfirmed] = useState(false)
  const [heartbeatOk, setHeartbeatOk] = useState(false)

  const [validationMsg, setValidationMsg] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const [polling, setPolling] = useState(false)
  const [pollMessage, setPollMessage] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null)
  const [showTroubleshoot, setShowTroubleshoot] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [downloadBlocked, setDownloadBlocked] = useState(false)

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollStartedAt = useRef<number | null>(null)
  const navigate = useNavigate()

  const downloadUrl = (import.meta.env.VITE_EDGE_AGENT_DOWNLOAD_URL || "").trim()
  const canDownload = Boolean(downloadUrl)

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
    enabled: open,
  })

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    pollStartedAt.current = null
    setPolling(false)
  }

  useEffect(() => {
    if (!open) return
    setStoreId(defaultStoreId || "")
    setEdgeToken("")
    setAgentId(DEFAULT_AGENT_ID)
    setCloudBaseUrl(DEFAULT_CLOUD_BASE_URL)
    setLoadingCreds(false)
    setDownloadConfirmed(false)
    setAgentRunningConfirmed(false)
    setHeartbeatOk(false)
    setValidationMsg(null)
    setValidationError(null)
    setPolling(false)
    setPollMessage(null)
    setPollError(null)
    setLastHeartbeat(null)
    setShowTroubleshoot(false)
    setShowChecklist(false)
    setDownloadBlocked(false)
    stopPolling()
  }, [open, defaultStoreId])

  useEffect(() => {
    if (!open) return
    setDownloadConfirmed(false)
    setAgentRunningConfirmed(false)
    setHeartbeatOk(false)
    setValidationMsg(null)
    setValidationError(null)
    setPolling(false)
    setPollMessage(null)
    setPollError(null)
    setLastHeartbeat(null)
    setShowTroubleshoot(false)
    setShowChecklist(false)
    setDownloadBlocked(false)
    stopPolling()
  }, [open, storeId])

  useEffect(() => {
    if (!open) {
      stopPolling()
    }
  }, [open])

  useEffect(() => {
    const loadCreds = async () => {
      if (!open || !storeId) return
      setLoadingCreds(true)
      setValidationError(null)
      setValidationMsg(null)
      try {
        const res = await api.get<EdgeSetupPayload>(`/v1/stores/${storeId}/edge-setup/`)
        const data = res.data || {}
        setEdgeToken(data.edge_token || "")
        setAgentId(data.agent_id_suggested || data.agent_id_default || DEFAULT_AGENT_ID)
        setCloudBaseUrl(data.cloud_base_url || DEFAULT_CLOUD_BASE_URL)
      } catch (err) {
        const apiErr = getApiError(err)
        setEdgeToken("")
        setAgentId(DEFAULT_AGENT_ID)
        setCloudBaseUrl(DEFAULT_CLOUD_BASE_URL)
        setValidationError(
          apiErr.response?.data?.detail ||
            apiErr.message ||
            "Falha ao obter credenciais do edge."
        )
      } finally {
        setLoadingCreds(false)
      }
    }

    loadCreds()
  }, [open, storeId])

  const envReady = Boolean(storeId && edgeToken && !loadingCreds)
  const resolvedCloudBaseUrl = cloudBaseUrl || DEFAULT_CLOUD_BASE_URL

  const envContent = useMemo(() => {
    const lines = [
      `CLOUD_BASE_URL=${resolvedCloudBaseUrl}`,
      `STORE_ID=${storeId || ""}`,
      `EDGE_TOKEN=${edgeToken || ""}`,
      `AGENT_ID=${agentId || DEFAULT_AGENT_ID}`,
      "HEARTBEAT_INTERVAL_SECONDS=30",
      "CAMERA_HEARTBEAT_INTERVAL_SECONDS=30",
    ]
    return lines.join("\n")
  }, [resolvedCloudBaseUrl, storeId, edgeToken, agentId])

  const pollRemainingSec = () => {
    const startedAt = pollStartedAt.current
    if (!startedAt) return null
    const elapsed = Date.now() - startedAt
    return Math.max(0, Math.ceil((POLL_MAX_DURATION_MS - elapsed) / 1000))
  }

  const isEdgeOnline = (payload: EdgeStatusPayload) => {
    const status = String(payload?.store_status || "").toLowerCase()
    const heartbeatTs =
      payload?.last_heartbeat || payload?.last_seen_at || payload?.last_heartbeat_at
    return status === "online" || status === "degraded" || Boolean(heartbeatTs)
  }

  const pollEdgeStatus = async (id: string) => {
    try {
      const res = await api.get<EdgeStatusPayload>(`/v1/stores/${id}/edge-status/`)
      const data = res.data || {}
      const reason = String(data?.store_status_reason || "")
      const heartbeatTs =
        data?.last_heartbeat || data?.last_seen_at || data?.last_heartbeat_at
      setLastHeartbeat(heartbeatTs || null)
      setPollError(null)

      if (reason === "forbidden") {
        setPollError("Você não tem acesso a esta loja.")
        stopPolling()
        return
      }
      if (reason === "store_not_found") {
        setPollError("Loja inválida ou não encontrada.")
        stopPolling()
        return
      }

      if (isEdgeOnline(data)) {
        setHeartbeatOk(true)
        stopPolling()
        setPollMessage("Heartbeat confirmado ✅")
        toast.success("Edge conectado ✅")
        return
      }
    } catch (err) {
      const apiErr = getApiError(err)
      const status = apiErr.response?.status
      const msg = String(apiErr.message || "").toLowerCase()
      const isTimeout = apiErr.code === "ECONNABORTED" || msg.includes("timeout")

      if (status === 401 || status === 403) {
        setPollError("Token inválido ou sem permissão.")
        stopPolling()
        return
      }
      if (status && status >= 500) {
        setPollError("Servidor indisponível. Tentaremos novamente.")
      } else if (isTimeout) {
        setPollError("Timeout ao consultar status. Tentaremos novamente.")
      } else {
        setPollError("Erro ao consultar status. Tentaremos novamente.")
      }
    }

    const startedAt = pollStartedAt.current || Date.now()
    pollStartedAt.current = startedAt
    const elapsed = Date.now() - startedAt
    if (elapsed >= POLL_MAX_DURATION_MS) {
      stopPolling()
      setShowTroubleshoot(true)
      setPollMessage(null)
      return
    }

    setPollMessage("Aguardando heartbeat do Edge Agent...")
    pollTimer.current = setTimeout(() => pollEdgeStatus(id), POLL_INTERVAL_MS)
  }

  const startPolling = () => {
    if (polling) return
    setPolling(true)
    setPollError(null)
    setPollMessage("Aguardando heartbeat do Edge Agent...")
    pollStartedAt.current = Date.now()
    pollEdgeStatus(storeId)
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    setDownloadBlocked(false)
    try {
      const opened = window.open(downloadUrl, "_blank", "noopener,noreferrer")
      if (!opened) {
        setDownloadBlocked(true)
        setDownloadConfirmed(false)
        toast.error("Seu navegador bloqueou o pop-up. Abra em nova aba.")
        return
      }
      setDownloadConfirmed(true)
      setValidationError(null)
      setPollError(null)
    } catch {
      setDownloadBlocked(true)
      setDownloadConfirmed(false)
      toast.error("Falha ao abrir o download. Tente novamente.")
    }
  }

  const handleCopyEnv = async () => {
    if (!envReady) {
      toast.error("Selecione uma loja antes de copiar.")
      return
    }
    try {
      await navigator.clipboard.writeText(envContent)
      toast.success("Copiado")
    } catch {
      toast.error("Falha ao copiar. Copie manualmente.")
    }
  }

  const handleConfirmRunning = () => {
    setAgentRunningConfirmed(true)
  }

  const handleValidate = async () => {
    if (!storeId) {
      setValidationError("Selecione uma loja para validar.")
      return
    }
    if (!agentRunningConfirmed) {
      setValidationError("Confirme que o agent está rodando antes de validar.")
      return
    }
    setValidating(true)
    setValidationMsg(null)
    setValidationError(null)
    setPollError(null)
    try {
      await api.get(`/v1/stores/${storeId}/edge-setup/`)
      setValidationMsg("Conexão com a API ok. Monitorando heartbeat...")
      startPolling()
    } catch (err) {
      const apiErr = getApiError(err)
      const status = apiErr.response?.status
      const msg = String(apiErr.message || "").toLowerCase()
      const isTimeout = apiErr.code === "ECONNABORTED" || msg.includes("timeout")

      if (status === 401 || status === 403) {
        setValidationError("Token inválido ou sessão expirada.")
      } else if (status && status >= 500) {
        setValidationError("Servidor indisponível. Tente novamente em instantes.")
      } else if (isTimeout) {
        setValidationError("Timeout ao validar conexão. Tente novamente.")
      } else {
        setValidationError(
          apiErr.response?.data?.detail ||
            apiErr.message ||
            "Falha ao validar. Verifique a loja e a API."
        )
      }
    } finally {
      setValidating(false)
    }
  }

  const handleRegenerateToken = async () => {
    if (!storeId) return
    setLoadingCreds(true)
    setValidationError(null)
    try {
      const res = await api.post<EdgeSetupPayload>(
        `/v1/stores/${storeId}/edge-setup/`,
        { rotate: true }
      )
      const data = res.data || {}
      if (data.edge_token) {
        setEdgeToken(data.edge_token)
        setDownloadConfirmed(false)
        setAgentRunningConfirmed(false)
        setHeartbeatOk(false)
        setPollError(null)
        setValidationMsg("Token regenerado. Atualize o .env do agent.")
      }
    } catch (err) {
      const apiErr = getApiError(err)
      if (apiErr.response?.status === 405 || apiErr.response?.status === 404) {
        setValidationError("Rotação de token ainda não habilitada no backend.")
      } else {
        setValidationError("Não foi possível regenerar o token.")
      }
    } finally {
      setLoadingCreds(false)
    }
  }

  const handleClose = () => {
    stopPolling()
    onClose()
  }

  const statusLabel = (() => {
    if (pollError || validationError) return "Erro"
    if (!envReady) return "Aguardando"
    if (heartbeatOk) return "Heartbeat ok"
    if (agentRunningConfirmed) return "Rodando"
    if (downloadConfirmed) return "Baixado"
    return "Gerado"
  })()

  const statusClass = (() => {
    if (pollError || validationError) return "bg-red-100 text-red-700"
    if (!envReady) return "bg-gray-100 text-gray-700"
    if (heartbeatOk) return "bg-green-100 text-green-700"
    if (agentRunningConfirmed) return "bg-yellow-100 text-yellow-800"
    if (downloadConfirmed) return "bg-blue-100 text-blue-700"
    return "bg-gray-100 text-gray-700"
  })()

  const isStoreSelected = Boolean(storeId)
  const lastHeartbeatLabel = formatRelativeTime(lastHeartbeat)
  const statusStepIndex = heartbeatOk
    ? 3
    : agentRunningConfirmed
    ? 2
    : downloadConfirmed
    ? 1
    : 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-xl border border-gray-100 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Edge Setup Wizard</h2>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Selecionar loja
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione uma loja</option>
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {!storeId && (
              <p className="mt-2 text-xs text-gray-500">
                Selecione a loja para liberar as próximas etapas.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                  {statusLabel}
                </span>
                <span className="text-xs text-gray-500">
                  Última comunicação: {lastHeartbeatLabel}
                </span>
              </div>
              {heartbeatOk && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose()
                    navigate("/app/cameras")
                  }}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
                >
                  Ir para Câmeras
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["Gerado", "Baixado", "Rodando", "Heartbeat ok"].map((label, idx) => {
                const done = idx < statusStepIndex
                const active = idx === statusStepIndex
                return (
                  <div
                    key={label}
                    className={[
                      "rounded-lg border px-3 py-2 text-xs font-semibold text-center",
                      done
                        ? "border-green-200 bg-green-50 text-green-700"
                        : active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-500",
                    ].join(" ")}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={!isStoreSelected ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700 font-semibold">1) Baixar Edge Agent</div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!canDownload || !envReady}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Baixar Edge Agent
                </button>
                {!canDownload && (
                  <div className="text-xs text-gray-500">
                    Download indisponível. Configure{" "}
                    <span className="font-mono">VITE_EDGE_AGENT_DOWNLOAD_URL</span>.
                  </div>
                )}
                {downloadBlocked && (
                  <div className="text-xs text-amber-700">
                    Seu navegador bloqueou o pop-up. Clique com o botão direito e abra em nova aba:
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 break-all text-blue-700 underline"
                    >
                      {downloadUrl}
                    </a>
                  </div>
                )}
                {downloadConfirmed && (
                  <div className="text-xs text-green-600 font-semibold">Download confirmado</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">2) Copiar .env</div>
              <p className="text-xs text-gray-500 mb-3">
                Crie um arquivo chamado <span className="font-mono">.env</span> na
                pasta do agent (mesma do executável) e cole o conteúdo abaixo.
              </p>
              <textarea
                value={envContent}
                readOnly
                rows={6}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-700"
              />
              <button
                type="button"
                onClick={handleCopyEnv}
                disabled={!envReady}
                className="mt-3 inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Copiar .env
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700 font-semibold">3) Rodar o agent</div>
              <p className="text-xs text-gray-500 mt-1">
                Após copiar o <span className="font-mono">.env</span>, execute o agent
                no computador da loja.
              </p>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmRunning}
                  disabled={!downloadConfirmed}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Já iniciei o agent
                </button>
                {agentRunningConfirmed && (
                  <div className="text-xs text-green-600 font-semibold">Agent em execução</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700 font-semibold">
                4) Validar e acompanhar
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Clique em “Validar conexão” para iniciar o monitoramento de heartbeat.
              </p>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={validating || polling || !agentRunningConfirmed}
                  className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {validating ? "Validando..." : polling ? "Aguardando heartbeat..." : "Validar conexão"}
                </button>
                {validationMsg && <div className="text-sm text-gray-700">{validationMsg}</div>}
              </div>

              {validationError && (
                <div className="mt-2 text-xs text-red-600">{validationError}</div>
              )}

              {polling && (
                <div className="mt-3 text-xs text-gray-600 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    {pollMessage || "Aguardando heartbeat do Edge Agent..."}
                  </span>
                  {pollRemainingSec() !== null && (
                    <span className="text-gray-500">
                      Tempo restante: ~{pollRemainingSec()}s
                    </span>
                  )}
                </div>
              )}

              {pollError && <div className="mt-2 text-xs text-red-600">{pollError}</div>}
            </div>

            {showTroubleshoot && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                <div className="text-sm font-semibold text-yellow-800">
                  Sem heartbeat após 2 minutos
                </div>
                <p className="mt-1 text-xs text-yellow-700">
                  Possíveis causas: token inválido, agent rodando em outra pasta,
                  firewall bloqueando ou API ainda acordando.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                  >
                    Regerar token
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChecklist((prev) => !prev)}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                  >
                    Ver checklist
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText("edge-agent")}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                  >
                    Copiar comando de execução
                  </button>
                </div>
                {showChecklist && (
                  <div className="mt-3 text-xs text-yellow-800 space-y-1">
                    <div>1. Confirme que o arquivo .env está na mesma pasta do agent.</div>
                    <div>2. Verifique se STORE_ID e EDGE_TOKEN estão corretos.</div>
                    <div>3. Execute o agent como administrador (Windows) se necessário.</div>
                    <div>4. Veja os logs no terminal onde o agent está rodando.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EdgeSetupModal
