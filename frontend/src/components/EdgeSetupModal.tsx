import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import api from "../services/api"
import { storesService, type Store } from "../services/stores"
import { API_BASE_URL } from "../lib/api"

type EdgeSetupModalProps = {
  open: boolean
  onClose: () => void
  defaultStoreId?: string
}

type EdgeStatusPayload = {
  ok?: boolean
  online?: boolean
  store_status?: string
  store_status_reason?: string
  last_heartbeat?: string | null
  last_heartbeat_at?: string | null
  last_seen_at?: string | null
  agent_id?: string | null
  version?: string | null
}

type ApiErrorLike = {
  response?: { status?: number; data?: { detail?: string } }
  message?: string
  code?: string
}

const DEFAULT_CLOUD_BASE_URL = API_BASE_URL
const DEFAULT_AGENT_ID = "edge-001"
const HEARTBEAT_INTERVAL_SECONDS = 30
const POLL_INTERVAL_MS = 3000
const POLL_MAX_DURATION_MS = 120000
const HEARTBEAT_FRESHNESS_SECONDS = 120

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

const getLastSeenAt = (payload?: EdgeStatusPayload | null) => {
  if (!payload) return null
  return (
    payload.last_seen_at ||
    payload.last_heartbeat_at ||
    payload.last_heartbeat ||
    null
  )
}

const getHeartbeatTimestamp = (payload?: EdgeStatusPayload | null) => {
  if (!payload) return null
  return payload.last_heartbeat_at || payload.last_heartbeat || payload.last_seen_at || null
}

const getAgeSeconds = (iso?: string | null) => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
}

const EdgeSetupModal = ({ open, onClose, defaultStoreId }: EdgeSetupModalProps) => {
  const [storeId, setStoreId] = useState(defaultStoreId || "")
  const [edgeToken, setEdgeToken] = useState("")
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID)
  const [cloudBaseUrl, setCloudBaseUrl] = useState(DEFAULT_CLOUD_BASE_URL)
  const [loadingCreds, setLoadingCreds] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [rotatingToken, setRotatingToken] = useState(false)

  const [downloadConfirmed, setDownloadConfirmed] = useState(false)
  const [envCopied, setEnvCopied] = useState(false)
  const [agentRunningConfirmed, setAgentRunningConfirmed] = useState(false)
  const [heartbeatOk, setHeartbeatOk] = useState(false)

  const [validationMsg, setValidationMsg] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const [polling, setPolling] = useState(false)
  const [pollMessage, setPollMessage] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null)
  const [edgeOnline, setEdgeOnline] = useState(false)
  const [edgeReason, setEdgeReason] = useState<string | null>(null)
  const [showTroubleshoot, setShowTroubleshoot] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)
  const [autoRedirectAt, setAutoRedirectAt] = useState<number | null>(null)
  const [redirectRemainingSec, setRedirectRemainingSec] = useState<number | null>(null)

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollStartedAt = useRef<number | null>(null)
  const navigate = useNavigate()

  const primaryCtaClass =
    "inline-flex w-full sm:w-auto items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white " +
    "bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm hover:opacity-95 transition disabled:opacity-60"
  const downloadUrl = (import.meta.env.VITE_EDGE_AGENT_DOWNLOAD_URL || "").trim()
  const siteUrl = (import.meta.env.VITE_SITE_URL || "").trim()
  const docsUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/docs/edge-agent` : "/docs/edge-agent"
  const canDownload = Boolean(downloadUrl)

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
    enabled: open,
    staleTime: 60000,
  })

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    pollStartedAt.current = null
    setPolling(false)
    setRemainingSec(null)
  }

  useEffect(() => {
    if (!open) return
    setStoreId(defaultStoreId || "")
    setEdgeToken("")
    setAgentId(DEFAULT_AGENT_ID)
    setCloudBaseUrl(DEFAULT_CLOUD_BASE_URL)
    setLoadingCreds(false)
    setSetupError(null)
    setRotatingToken(false)
    setDownloadConfirmed(false)
    setEnvCopied(false)
    setAgentRunningConfirmed(false)
    setHeartbeatOk(false)
    setValidationMsg(null)
    setValidationError(null)
    setPolling(false)
    setPollMessage(null)
    setPollError(null)
    setLastSeenAt(null)
    setLastHeartbeatAt(null)
    setShowTroubleshoot(false)
    setShowChecklist(false)
    stopPolling()
    setAutoRedirectAt(null)
    setRedirectRemainingSec(null)
  }, [open, defaultStoreId])

  useEffect(() => {
    if (!open) return
    setDownloadConfirmed(false)
    setEnvCopied(false)
    setAgentRunningConfirmed(false)
    setHeartbeatOk(false)
    setValidationMsg(null)
    setValidationError(null)
    setPolling(false)
    setPollMessage(null)
    setPollError(null)
    setLastSeenAt(null)
    setLastHeartbeatAt(null)
    setShowTroubleshoot(false)
    setShowChecklist(false)
    setSetupError(null)
    setRotatingToken(false)
    stopPolling()
    setAutoRedirectAt(null)
    setRedirectRemainingSec(null)
  }, [open, storeId])

  useEffect(() => {
    if (!open) {
      stopPolling()
    }
  }, [open])

  useEffect(() => {
    if (!canDownload) {
      setDownloadConfirmed(false)
    }
  }, [canDownload])

  useEffect(() => {
    const loadCreds = async () => {
      if (!open || !storeId) return
      setLoadingCreds(true)
      setValidationError(null)
      setValidationMsg(null)
      setSetupError(null)
      try {
        const data = await storesService.getEdgeSetup(storeId)
        setEdgeToken(data.edge_token || "")
        setAgentId(data.agent_id_suggested || data.agent_id_default || DEFAULT_AGENT_ID)
        setCloudBaseUrl(data.cloud_base_url || DEFAULT_CLOUD_BASE_URL)
        if (!data.edge_token) {
          setSetupError("EDGE_TOKEN não foi retornado. Gere um novo token para continuar.")
        }
      } catch (err) {
        const apiErr = getApiError(err)
        setEdgeToken("")
        setAgentId(DEFAULT_AGENT_ID)
        setCloudBaseUrl(DEFAULT_CLOUD_BASE_URL)
        setSetupError(
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

  const resolvedCloudBaseUrl = cloudBaseUrl || DEFAULT_CLOUD_BASE_URL

  const envContent = useMemo(() => {
    const lines = [`CLOUD_BASE_URL=${resolvedCloudBaseUrl}`]
    if (storeId) {
      lines.push(`STORE_ID=${storeId}`)
    }
    if (edgeToken) {
      lines.push(`EDGE_TOKEN=${edgeToken}`)
    }
    lines.push(
      `AGENT_ID=${agentId || DEFAULT_AGENT_ID}`,
      `HEARTBEAT_INTERVAL_SECONDS=${HEARTBEAT_INTERVAL_SECONDS}`,
      `CAMERA_HEARTBEAT_INTERVAL_SECONDS=${HEARTBEAT_INTERVAL_SECONDS}`
    )
    return lines.join("\n")
  }, [resolvedCloudBaseUrl, storeId, edgeToken, agentId])

  const pollRemainingSec = () => {
    const startedAt = pollStartedAt.current
    if (!startedAt) return null
    const elapsed = Date.now() - startedAt
    return Math.max(0, Math.ceil((POLL_MAX_DURATION_MS - elapsed) / 1000))
  }

  const isEdgeOnline = (payload: EdgeStatusPayload) => payload?.online === true
  const hasRecentHeartbeat = (payload: EdgeStatusPayload) => {
    const ageSeconds = getAgeSeconds(getHeartbeatTimestamp(payload))
    return ageSeconds !== null && ageSeconds <= HEARTBEAT_FRESHNESS_SECONDS
  }
  const isSetupHeartbeatReady = (payload: EdgeStatusPayload) => {
    if (isEdgeOnline(payload)) return true
    const reason = String(payload?.store_status_reason || "")
    return reason === "no_cameras" && hasRecentHeartbeat(payload)
  }

  const pollEdgeStatus = async (id: string) => {
    try {
      const res = await api.get<EdgeStatusPayload>(`/v1/stores/${id}/edge-status/`)
      const data = res.data || {}
      const reason = String(data?.store_status_reason || "")
      setEdgeOnline(Boolean(data?.online))
      setEdgeReason(reason || null)
      const lastSeenAt = getLastSeenAt(data)
      const heartbeatAt = data?.last_heartbeat_at || data?.last_heartbeat || null
      setLastSeenAt(lastSeenAt)
      setLastHeartbeatAt(heartbeatAt)
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

      if (isSetupHeartbeatReady(data)) {
        setHeartbeatOk(true)
        stopPolling()
        if (reason === "no_cameras") {
          setPollMessage("Sinal recebido (loja sem câmeras cadastradas).")
          toast.success("Sinal recebido")
        } else {
          setPollMessage("Loja Online")
          toast.success("Loja Online")
        }
        setAutoRedirectAt(Date.now() + 3000)
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
      const lastAgeSeconds = getAgeSeconds(lastHeartbeatAt)
      if (lastAgeSeconds !== null) {
        const ageMinutes = Math.floor(lastAgeSeconds / 60)
      setPollError(
        `Último sinal recebido há ${ageMinutes} min. Verifique token, .env, Start_DaleVision_Agent.bat e logs.`
      )
      }
      setShowTroubleshoot(true)
      setPollMessage(null)
      return
    }

    setPollMessage("Aguardando sinal do Edge Agent...")
    pollTimer.current = setTimeout(() => pollEdgeStatus(id), POLL_INTERVAL_MS)
  }

  const startPolling = () => {
    if (polling) return
    setPolling(true)
    setPollError(null)
    setPollMessage("Aguardando sinal do Edge Agent...")
    pollStartedAt.current = Date.now()
    setRemainingSec(Math.ceil(POLL_MAX_DURATION_MS / 1000))
    pollEdgeStatus(storeId)
  }

  const handleConfirmDownload = () => {
    setDownloadConfirmed(true)
    setValidationError(null)
    setPollError(null)
    toast.success("Download confirmado")
  }

  const buildEnvContent = (token: string) => {
    const lines = [`CLOUD_BASE_URL=${resolvedCloudBaseUrl}`]
    if (storeId) {
      lines.push(`STORE_ID=${storeId}`)
    }
    if (token) {
      lines.push(`EDGE_TOKEN=${token}`)
    }
    lines.push(
      `AGENT_ID=${agentId || DEFAULT_AGENT_ID}`,
      `HEARTBEAT_INTERVAL_SECONDS=${HEARTBEAT_INTERVAL_SECONDS}`,
      `CAMERA_HEARTBEAT_INTERVAL_SECONDS=${HEARTBEAT_INTERVAL_SECONDS}`
    )
    return lines.join("\n")
  }

  const rotateTokenForSetup = async (): Promise<string | null> => {
    if (!storeId) return null
    setRotatingToken(true)
    setSetupError(null)
    try {
      const rotated = await storesService.rotateEdgeToken(storeId)
      if (!rotated.supported) {
        setSetupError("Geração de novo token não disponível nesta API.")
        return null
      }
      const nextToken = rotated.edge_token || ""
      setEdgeToken(nextToken)
      setAgentId(rotated.agent_id_suggested || rotated.agent_id_default || DEFAULT_AGENT_ID)
      setCloudBaseUrl(rotated.cloud_base_url || DEFAULT_CLOUD_BASE_URL)
      if (!nextToken) {
        setSetupError("Não foi possível gerar EDGE_TOKEN para esta loja.")
        return null
      }
      setEnvCopied(false)
      toast.success("Novo token gerado")
      return nextToken
    } catch (err) {
      const apiErr = getApiError(err)
      setSetupError(
        apiErr.response?.data?.detail ||
          apiErr.message ||
          "Falha ao gerar novo token."
      )
      return null
    } finally {
      setRotatingToken(false)
    }
  }

  const handleCopyEnv = async () => {
    if (!storeId) {
      toast.error("Selecione uma loja antes de copiar.")
      return
    }
    if (loadingCreds) {
      toast.error("Aguarde as credenciais do Edge carregarem.")
      return
    }
    let tokenToCopy = edgeToken
    if (!tokenToCopy) {
      tokenToCopy = (await rotateTokenForSetup()) || ""
    }
    if (!tokenToCopy) {
      toast.error("Não foi possível obter EDGE_TOKEN.")
      return
    }
    try {
      await navigator.clipboard.writeText(buildEnvContent(tokenToCopy))
      setEnvCopied(true)
      setSetupError(null)
      toast.success("Copiado")
    } catch {
      setEnvCopied(false)
      toast.error("Falha ao copiar. Copie manualmente.")
    }
  }

  const handleRotateToken = async () => {
    if (!storeId) {
      toast.error("Selecione uma loja antes de gerar token.")
      return
    }
    await rotateTokenForSetup()
  }

  const handleConfirmRunning = () => {
    setAgentRunningConfirmed(true)
  }

  const handleValidate = async () => {
    if (!storeId) {
      setValidationError("Selecione uma loja para validar.")
      return
    }
    if (!downloadConfirmed) {
      setValidationError("Confirme o download antes de iniciar a verificação.")
      return
    }
    if (!agentRunningConfirmed) {
      setValidationError("Inicie o agent antes de começar a verificação.")
      return
    }
    stopPolling()
    setHeartbeatOk(false)
    setPollMessage(null)
    setPollError(null)
    setLastHeartbeatAt(null)
    setShowTroubleshoot(false)
    setValidating(true)
    setValidationMsg(null)
    setValidationError(null)
    try {
      await api.get(`/v1/stores/${storeId}/edge-setup/`)
      setValidationMsg("Conexão com a API ok. Monitorando sinal...")
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

  const handleClose = () => {
    stopPolling()
    setAutoRedirectAt(null)
    setRedirectRemainingSec(null)
    onClose()
  }

  const isStoreSelected = Boolean(storeId)
  const lastSeenLabel = formatRelativeTime(lastSeenAt)
  const lastHeartbeatLabel = lastHeartbeatAt ? formatRelativeTime(lastHeartbeatAt) : null
  const canStartAgent = downloadConfirmed && envCopied && Boolean(edgeToken)
  const canCopyEnv = isStoreSelected && downloadConfirmed && !loadingCreds && !rotatingToken
  const logCommand = "Get-Content .\\logs\\agent.log -Tail 80"
  const step2Enabled = isStoreSelected
  const step3Enabled = downloadConfirmed
  const step4Enabled = envCopied && Boolean(edgeToken)
  const step5Enabled = downloadConfirmed && agentRunningConfirmed
  const canStartVerification = downloadConfirmed && agentRunningConfirmed
  const verificationBlockMsg = !downloadConfirmed
    ? "Confirme o download e extração para liberar a verificação."
    : !agentRunningConfirmed
    ? "Inicie o agent para liberar a verificação."
    : null
  const pollStatusLabel =
    pollMessage && remainingSec !== null
      ? `${pollMessage} (restam ${remainingSec}s)`
      : pollMessage || "Aguardando sinal do Edge Agent..."

  const statusSteps = [
    { label: "Loja", done: isStoreSelected },
    { label: "Download", done: downloadConfirmed },
    { label: "Copiar .env", done: envCopied },
    { label: "Rodar", done: agentRunningConfirmed },
    { label: "Online", done: heartbeatOk },
  ]
  const firstIncomplete = statusSteps.findIndex((step) => !step.done)
  const activeStepIndex = firstIncomplete === -1 ? statusSteps.length - 1 : firstIncomplete
  const isActiveStep = (label: string) => {
    const idx = statusSteps.findIndex((s) => s.label === label)
    return idx === activeStepIndex
  }

  useEffect(() => {
    if (!polling || !pollStartedAt.current) return
    setRemainingSec(pollRemainingSec())
    const timer = setInterval(() => {
      setRemainingSec(pollRemainingSec())
    }, 1000)
    return () => clearInterval(timer)
  }, [polling])

  useEffect(() => {
    if (!autoRedirectAt || !heartbeatOk) return
    setRedirectRemainingSec(
      Math.max(0, Math.ceil((autoRedirectAt - Date.now()) / 1000))
    )
    const delay = autoRedirectAt - Date.now()
    if (delay <= 0) {
      if (storeId) {
        navigate(`/app/cameras?store_id=${storeId}&onboarding=true`)
      } else {
        navigate("/app/cameras")
      }
      return
    }
    const timer = setTimeout(() => {
      if (storeId) {
        navigate(`/app/cameras?store_id=${storeId}&onboarding=true`)
      } else {
        navigate("/app/cameras")
      }
    }, delay)
    const countdown = setInterval(() => {
      setRedirectRemainingSec(
        Math.max(0, Math.ceil((autoRedirectAt - Date.now()) / 1000))
      )
    }, 500)
    return () => {
      clearTimeout(timer)
      clearInterval(countdown)
    }
  }, [autoRedirectAt, heartbeatOk, navigate, storeId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90svh] sm:max-h-[90vh] rounded-2xl bg-white shadow-xl border border-gray-100 flex min-h-0 flex-col overflow-hidden">
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
              1. Selecionar loja
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
                Selecione a loja para liberar o passo a passo.
              </p>
            )}
            {storeId && (
              <p className="mt-2 text-xs text-green-600 font-semibold">
                Loja confirmada
              </p>
            )}
            <div className="text-xs text-gray-500 mb-3 space-y-1">
                <div>Você precisa estar no computador da loja, mesma rede das câmeras/NVR (Network Video Recorder).</div>
  
              </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-500 space-y-1">
                <div>Última comunicação: {lastSeenLabel}</div>
                {lastHeartbeatLabel && (
                  <div>Último sinal: {lastHeartbeatLabel}</div>
                )}
                {edgeOnline && edgeReason === "no_cameras" && (
                  <div className="text-green-700 font-semibold">
                    Agente Online ✅ (nenhuma câmera ainda)
                  </div>
                )}
              </div>
              {heartbeatOk && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose()
                      if (storeId) {
                        navigate(`/app/cameras?store_id=${storeId}&onboarding=true`)
                      } else {
                        navigate("/app/cameras")
                      }
                    }}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Configurar primeira câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose()
                      navigate("/app/dashboard")
                    }}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Ir para dashboard
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statusSteps.map((step, idx) => {
                const done = step.done
                const active = idx === activeStepIndex
                return (
                  <div
                    key={step.label}
                    className={[
                      "rounded-lg border px-3 py-2 text-xs font-semibold text-center",
                      done
                        ? "border-green-200 bg-green-50 text-green-700"
                        : active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-500",
                    ].join(" ")}
                  >
                    {step.label}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={!isStoreSelected ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
            <div
              className={
                step2Enabled
                  ? "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                  : "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 opacity-60 pointer-events-none"
              }
            >
              <div className="text-sm text-gray-700 font-semibold">2. Download do Edge Agent</div>
              <p className="mt-1 text-xs text-gray-500">
                Baixe e extraia o pacote no computador da loja.
              </p>
              <div className="mt-3 space-y-2 text-xs text-gray-600">
                {canDownload ? (
                  <div>
                    Download:{" "}
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      Baixar Edge Agent
                    </a>
                  </div>
                ) : (
                  <div className="text-amber-700">
                    Download indisponível. Veja as instruções em{" "}
                    <a
                      href={docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      docs do Edge Agent
                    </a>
                    .
                  </div>
                )}
                <div>
                  Abra a pasta extraída e confirme que existem{" "}
                  <span className="font-mono">Start_DaleVision_Agent.bat</span> e{" "}
                  <span className="font-mono">README.txt</span>.
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmDownload}
                disabled={!isStoreSelected}
                className={`mt-3 ${primaryCtaClass}`}
              >
                Já baixei e extraí
              </button>
              {downloadConfirmed && (
                <div className="mt-2 text-xs text-green-600 font-semibold">
                  Download confirmado
                </div>
              )}
            </div>

            <div className={step3Enabled ? "rounded-xl border border-gray-200 bg-gray-50 p-4" : "rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-60 pointer-events-none"}>
              <div className="text-sm font-semibold text-gray-700 mb-2">3. Copiar .env</div>
              <div className="text-xs text-gray-500 mb-3 space-y-1">
                <div>1) Clique no botão Copiar.env ou selecione o conteúdo abaixo</div>

              </div>
              <textarea
                value={envContent}
                readOnly
                rows={6}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-700"
              />
              <button
                type="button"
                onClick={handleCopyEnv}
                disabled={!canCopyEnv}
                className={`mt-3 ${primaryCtaClass} text-xs`}
              >
                {rotatingToken ? "Gerando token..." : "Copiar .env"}
              </button>
              <div className="text-xs text-gray-500 mb-3 space-y-1">
                <div>2) Procure o arquivo .env na pasta extraída, abra ele, e substitua o conteúdo atual por toda a informação copiada</div>
                <div> 3) Edite somente o arquivo <span className="font-mono">.env</span> (tipo "Arquivo
                  ENV"). Ignore <span className="font-mono">.env.example</span> se ele aparecer.
                </div>
                <div>
                  4) Salve o arquivo antes de fechar.
                </div>
              </div>
               
              {!downloadConfirmed && (
                <div className="mt-2 text-xs text-amber-700">
                  Se você baixou manualmente, clique em “Já baixei e extraí” no passo 2 para
                  liberar o restante.
                </div>
              )}
              {loadingCreds && (
                <div className="mt-2 text-xs text-gray-500">Aguarde as credenciais do Edge...</div>
              )}
              {!loadingCreds && !edgeToken && (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="text-xs text-amber-700">
                    EDGE_TOKEN ausente. Gere um novo token para continuar.
                  </div>
                  <button
                    type="button"
                    onClick={handleRotateToken}
                    disabled={rotatingToken || !storeId}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                  >
                    {rotatingToken ? "Gerando..." : "Gerar novo token"}
                  </button>
                </div>
              )}
              {!loadingCreds && setupError && (
                <div className="mt-2 text-xs text-red-600">{setupError}</div>
              )}
              {envCopied && (
                <div className="mt-2 text-xs text-green-600 font-semibold">.env copiado</div>
              )}
            </div>

            <div className={step4Enabled ? "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3" : "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 opacity-60 pointer-events-none"}>
              <div className="text-sm text-gray-700 font-semibold">4. Iniciar Agent</div>
              <div className="mt-1 text-xs text-gray-500 space-y-1">
                <div>
                  Clique em{" "}
                  <span className="font-mono">Start_DaleVision_Agent.bat</span> e mantenha a
                  janela aberta.
                </div>
                <div>
                  Se der erro ou você estiver remoto: clique em{" "}
                  <span className="font-mono">Diagnose.bat</span> e envie o ZIP.
                </div>
                <div>
                  Opcional: <span className="font-mono">install-service.ps1</span> (apenas administrador).
                </div>
              </div>
              <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                Se o Windows bloquear: “Mais informações” → “Executar assim mesmo”.
                <div className="mt-1">
                  Arquivos avançados (evite se não solicitado):{" "}
                  <span className="font-mono">run.bat</span>,{" "}
                  <span className="font-mono">run_once.bat</span>,{" "}
                  <span className="font-mono">dalevision-edge-agent.exe</span>.
                </div>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <div>Feito o processo anterior, clique em “Já iniciei o agent”.</div>
                <button
                  type="button"
                  onClick={handleConfirmRunning}
                  disabled={!canStartAgent}
                  className={primaryCtaClass}
                >
                  Já iniciei o agent
                </button>
                {agentRunningConfirmed && (
                  <div className="text-xs text-green-600 font-semibold">Teste de conexão iniciada</div>
                )}
              </div>
            </div>

            <div className={step5Enabled ? "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3" : "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 opacity-60 pointer-events-none"}>
              <div className="text-sm text-gray-700 font-semibold">5. Verificação online</div>
              <p className="text-xs text-gray-500 mt-1">
                Clique em “Começar verificação”. Vamos monitorar por até 2 minutos.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Se a loja ainda não tiver câmera cadastrada, a validação conclui ao receber sinal recente do agent.
              </p>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={validating || polling || !canStartVerification}
                  className={`w-full sm:w-auto rounded-lg px-4 py-2.5 text-sm font-semibold ${
                    heartbeatOk
                      ? "bg-green-600 text-white"
                      : isActiveStep("Online")
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } disabled:opacity-60`}
                >
                  {heartbeatOk
                    ? "Verificado ✅"
                    : validating
                    ? "Verificando..."
                    : polling
                    ? "Aguardando sinal..."
                    : "Começar verificação"}
                </button>
                {validationMsg && <div className="text-sm text-gray-700">{validationMsg}</div>}
              </div>
              {verificationBlockMsg && (
                <div className="mt-2 text-xs text-amber-700">{verificationBlockMsg}</div>
              )}

              {validationError && (
                <div className="mt-2 text-xs text-red-600">{validationError}</div>
              )}
              {heartbeatOk && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <div className="font-semibold">🎉 Agente conectado com sucesso!</div>
                  <div className="text-xs text-green-700 mt-1">
                    Conectado. Próximo passo: configurar sua primeira câmera.
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Mantenha a janela do Edge Agent aberta durante a configuração.
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose()
                        if (storeId) {
                          navigate(`/app/cameras?store_id=${storeId}&onboarding=true`)
                        } else {
                          navigate("/app/cameras")
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Ir agora
                    </button>
                    {autoRedirectAt && (
                      <>
                        <span className="text-xs text-green-700">
                          Redirecionando em {redirectRemainingSec ?? 3}s…
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAutoRedirectAt(null)
                            setRedirectRemainingSec(null)
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Ficar aqui
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {polling && (
                <div className="mt-3 text-xs text-gray-600 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    {pollStatusLabel}
                  </span>
                  {remainingSec !== null && (
                    <span className="text-gray-500">
                      Tempo restante: {String(Math.floor(remainingSec / 60)).padStart(2, "0")}:
                      {String(remainingSec % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              )}

              {pollError && <div className="mt-2 text-xs text-red-600">{pollError}</div>}
            </div>

            {showTroubleshoot && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                <div className="text-sm font-semibold text-yellow-800">
                  Sem sinal após 2 minutos
                </div>
                <p className="mt-1 text-xs text-yellow-700">
                  Possíveis causas: ZIP não extraído, token desatualizado, agent rodando
                  fora da pasta correta, edição no arquivo errado (.env.example) ou bloqueio
                  de rede/firewall.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleRotateToken}
                    disabled={rotatingToken || !storeId}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100 disabled:opacity-60"
                  >
                    {rotatingToken ? "Gerando..." : "Gerar novo token"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChecklist((prev) => !prev)}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                  >
                    Ver instruções
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(`${resolvedCloudBaseUrl}/health/`, "_blank", "noopener,noreferrer")}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                  >
                    Testar conectividade
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(logCommand)
                        toast.success("Comando copiado")
                      } catch {
                        toast.error("Falha ao copiar comando")
                      }
                    }}
                    className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                  >
                    Copiar comando de logs
                  </button>
                </div>
                {showChecklist && (
                  <div className="mt-3 text-xs text-yellow-800 space-y-1">
                    <div>1. Confirme que você editou o arquivo .env (não .env.example).</div>
                    <div>2. Verifique se STORE_ID e EDGE_TOKEN estão corretos.</div>
                    <div>
                      3. Abra a pasta e dê duplo clique em Start_DaleVision_Agent.bat.
                    </div>
                    <div>4. Verifique rede/firewall/antivírus que possam bloquear o acesso.</div>
                    <div>5. Execute o agent como administrador (Windows) se necessário.</div>
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
