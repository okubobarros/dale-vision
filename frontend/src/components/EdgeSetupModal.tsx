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

const DEFAULT_CLOUD_BASE_URL = "https://api.dalevision.com"
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 60000

type SetupStep = "GENERATED" | "DOWNLOADED" | "RUNNING" | "HEARTBEAT_OK"
const STEP_ORDER: SetupStep[] = ["GENERATED", "DOWNLOADED", "RUNNING", "HEARTBEAT_OK"]

const EdgeSetupModal = ({ open, onClose, defaultStoreId }: EdgeSetupModalProps) => {
  const [storeId, setStoreId] = useState(defaultStoreId || "")
  const [edgeToken, setEdgeToken] = useState("")
  const [agentId, setAgentId] = useState("")
  const [cloudBaseUrl, setCloudBaseUrl] = useState(DEFAULT_CLOUD_BASE_URL)
  const [validationMsg, setValidationMsg] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [loadingCreds, setLoadingCreds] = useState(false)
  const [polling, setPolling] = useState(false)
  const [step, setStep] = useState<SetupStep>("GENERATED")
  const [pollMessage, setPollMessage] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [pollTick, setPollTick] = useState(0)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollStartedAt = useRef<number | null>(null)
  const navigate = useNavigate()

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
      setPolling(false)
      setStep("GENERATED")
      setPollMessage(null)
      setPollError(null)
      setPollTick(0)
      pollStartedAt.current = null
      if (pollTimer.current) {
        clearTimeout(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [open, defaultStoreId])

  useEffect(() => {
    if (!open) return
    setStep("GENERATED")
    setPollMessage(null)
    setPollError(null)
    setPolling(false)
    pollStartedAt.current = null
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }, [open, storeId])

  useEffect(() => {
    if (!open && pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
      pollStartedAt.current = null
      setPolling(false)
    }
  }, [open])

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

  const isEdgeOnline = (payload: any) => {
    const status = String(payload?.store_status || "").toLowerCase()
    return status === "online" || status === "degraded"
  }

  const getPollCountdown = (_tick: number) => {
    const startedAt = pollStartedAt.current
    if (!startedAt) return null
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000)
    return Math.max(0, Math.ceil((POLL_TIMEOUT_MS / 1000) - elapsedSec))
  }

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    pollStartedAt.current = null
    setPolling(false)
    setPollTick(0)
  }

  const pollEdgeStatus = async (id: string) => {
    try {
      const res = await api.get(`/v1/stores/${id}/edge-status/`)
      const reason = String(res.data?.store_status_reason || "")
      if (reason === "forbidden") {
        setPollError("Você não tem acesso a esta store.")
      }
      if (reason === "store_not_found") {
        setPollError("Store inválida ou não encontrada.")
      }
      if (isEdgeOnline(res.data)) {
        stopPolling()
        setStep("HEARTBEAT_OK")
        toast.success("Edge conectado ✅")
        setTimeout(() => {
          onClose()
        }, 2000)
        return
      }
    } catch (err) {
      // mantém polling; o backend pode estar acordando
      setPollError("Erro ao consultar status. Tentaremos novamente.")
    }

    const startedAt = pollStartedAt.current || Date.now()
    pollStartedAt.current = startedAt
    const elapsed = Date.now() - startedAt
    if (elapsed >= POLL_TIMEOUT_MS) {
      stopPolling()
      setValidationMsg("Ainda aguardando heartbeat. Tente novamente em instantes.")
      setPollMessage(null)
      return
    }

    setPollMessage("Aguardando heartbeat do Edge Agent...")
    setPollTick((t) => t + 1)
    pollTimer.current = setTimeout(() => pollEdgeStatus(id), POLL_INTERVAL_MS)
  }

  const startPolling = () => {
    if (polling) return
    setPolling(true)
    setPollError(null)
    pollStartedAt.current = Date.now()
    pollEdgeStatus(storeId)
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    window.open(downloadUrl, "_blank", "noopener,noreferrer")
    setStep((prev) => (prev === "GENERATED" ? "DOWNLOADED" : prev))
    toast.success("Download iniciado")
  }

  const handleValidate = async () => {
    if (!storeId) {
      setValidationMsg("Informe o store_id para validar.")
      return
    }
    setValidating(true)
    setValidationMsg(null)
    setPollError(null)
    try {
      const res = await api.get(`/v1/stores/${storeId}/edge-status/`)
      const reason = String(res.data?.store_status_reason || "")
      if (reason === "store_not_found") {
        setValidationMsg("Store inválida ou não encontrada.")
        return
      }
      if (reason === "forbidden") {
        setValidationMsg("Você não tem acesso a esta store.")
        return
      }
      if (step === "GENERATED") setStep("DOWNLOADED")
      setStep("RUNNING")
      setValidationMsg("API ok. Aguardando heartbeat...")
      startPolling()
    } catch (err: any) {
      const status = err?.response?.status
      setValidationMsg(
        status === 401 || status === 403
          ? "Sessão inválida ou sem permissão para validar."
          : err?.response?.data?.detail ||
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
            <div className="text-sm text-gray-700 font-semibold">1) Baixar Edge Agent</div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!downloadUrl}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Baixar Edge Agent
              </button>
              {!downloadUrl && (
                <div className="text-xs text-gray-500">
                  Defina <span className="font-mono">VITE_EDGE_AGENT_DOWNLOAD_URL</span> no
                  ambiente para habilitar o download.
                </div>
              )}
              {step !== "GENERATED" && (
                <div className="text-xs text-green-600 font-semibold">Download confirmado</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-700 font-semibold">2) Iniciar o agent</div>
            <p className="text-xs text-gray-500 mt-1">
              Copie o <span className="font-mono">.env</span> e execute o agent no computador.
            </p>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("RUNNING")}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Já iniciei o agent
              </button>
              {step === "RUNNING" && (
                <div className="text-xs text-green-600 font-semibold">Agent em execução</div>
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
                  toast.success("Copiado")
                } catch (err) {
                  toast.error("Falha ao copiar. Copie manualmente.")
                }
              }}
              className="mt-3 inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Copiar .env
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-700 font-semibold">3) Validar e aguardar heartbeat</div>
            <p className="text-xs text-gray-500 mt-1">
              Após iniciar o agent, valide a conexão para começar o monitoramento.
            </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || polling}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {validating ? "Validando..." : polling ? "Aguardando heartbeat..." : "Validar conexão"}
            </button>
            {validationMsg && <div className="text-sm text-gray-700">{validationMsg}</div>}
          </div>

          {polling && (
            <div className="mt-3 text-xs text-gray-600 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                {pollMessage || "Aguardando heartbeat do Edge Agent..."}
              </span>
              {getPollCountdown(pollTick) !== null && (
                <span className="text-gray-500">
                  Tempo estimado: ~{getPollCountdown(pollTick)}s
                </span>
              )}
            </div>
          )}

          {pollError && (
            <div className="mt-2 text-xs text-red-600">{pollError}</div>
          )}

          {step === "HEARTBEAT_OK" && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-sm font-semibold text-green-700">Heartbeat confirmado ✅</div>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate("/app/dashboard")
                }}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Ir para Dashboard da Loja
              </button>
            </div>
          )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold text-gray-500">Progresso do Setup</div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STEP_ORDER.map((s, idx) => {
                const active = STEP_ORDER.indexOf(step) === idx
                const done = STEP_ORDER.indexOf(step) > idx
                return (
                  <div
                    key={s}
                    className={[
                      "rounded-lg border px-3 py-2 text-xs font-semibold text-center",
                      done
                        ? "border-green-200 bg-green-50 text-green-700"
                        : active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-500",
                    ].join(" ")}
                  >
                    {s === "GENERATED" && "Env gerado"}
                    {s === "DOWNLOADED" && "Download"}
                    {s === "RUNNING" && "Agent rodando"}
                    {s === "HEARTBEAT_OK" && "Heartbeat ok"}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EdgeSetupModal
