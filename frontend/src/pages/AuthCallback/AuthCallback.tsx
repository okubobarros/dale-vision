import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { supabase } from "../../lib/supabase"
import { API_BASE_URL } from "../../lib/api"
import { authService } from "../../services/auth"
import { useAuth } from "../../contexts/useAuth"

type SetupState = {
  ok?: boolean
  state?: "no_store" | "ready"
  has_store?: boolean
  has_edge?: boolean
  store_count?: number
  primary_store_id?: string | null
  code?: string
  message?: string
  request_id?: string
}

type CallbackStatus = "loading" | "error" | "timeout"
type DiagnosticInfo = { status?: number; code?: string; requestId?: string }

const CALLBACK_TIMEOUT_MS = 10000
const SETUP_STATE_TIMEOUT_MS = 10000

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const message = (error as { message?: string }).message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }
  return fallback
}

const readUrlError = (url: URL) => {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""))
  return (
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    hashParams.get("error_description") ||
    hashParams.get("error") ||
    ""
  )
}

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<CallbackStatus>("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null)
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const handleBackToLogin = useCallback(() => {
    navigate("/login", { replace: true })
  }, [navigate])

  const handleRetry = useCallback(() => {
    setAttempt((prev) => prev + 1)
  }, [])

  const handleCopyDiagnostic = useCallback(async () => {
    if (!diagnostic) {
      return
    }
    const payload = {
      status: diagnostic.status ?? "n/a",
      code: diagnostic.code ?? "n/a",
      request_id: diagnostic.requestId ?? "n/a",
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      toast.success("Diagnóstico copiado")
    } catch (error) {
      console.warn("[AuthCallback] clipboard failed", error)
      toast.error("Não foi possível copiar o diagnóstico.")
    }
  }, [diagnostic])

  useEffect(() => {
    let active = true
    setStatus("loading")
    setErrorMessage("")
    setDiagnostic(null)

    const timeoutId = window.setTimeout(() => {
      if (active) {
        setStatus("timeout")
      }
    }, CALLBACK_TIMEOUT_MS)

    const run = async () => {
      try {
        const url = new URL(window.location.href)
        const urlError = readUrlError(url)
        if (urlError) {
          throw new Error(decodeURIComponent(urlError))
        }

        const code = url.searchParams.get("code")
        let session = null
        let user = null

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            console.error("[AuthCallback] exchange code failed", {
              message: exchangeError.message,
            })
            throw exchangeError
          }
          session = data?.session ?? null
          user = data?.user ?? data?.session?.user ?? null
          window.history.replaceState({}, "", window.location.pathname)
        }

        if (!session) {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) {
            console.error("[AuthCallback] get session failed", {
              message: sessionError.message,
            })
            throw sessionError
          }
          session = data.session
        }

        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.warn("[AuthCallback] get user failed", {
            message: userError.message,
          })
        }
        user = userData?.user ?? session?.user ?? null

        if (!session || !session.access_token || !user) {
          throw new Error("Sessão inválida. Faça login novamente.")
        }

        console.log("[AuthCallback] session ready", {
          hasUser: !!user,
          hasToken: !!session.access_token,
        })

        authService.saveSupabaseSession(session, user, user.email || "")
        refreshAuth()

        const accessToken = session.access_token
        let setupState: SetupState | null = null
        try {
          const response = await axios.get<SetupState>(
            `${API_BASE_URL}/api/me/setup-state/`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              timeout: SETUP_STATE_TIMEOUT_MS,
            }
          )
          setupState = response.data
        } catch (setupError) {
          if (axios.isAxiosError(setupError)) {
            const statusCode = setupError.response?.status
            const data = (setupError.response?.data || {}) as SetupState
            const errorCode = data.code

            if (errorCode === "SUPABASE_MISSING_CONFIG") {
              if (active) {
                setDiagnostic({
                  status: statusCode,
                  code: errorCode,
                  requestId: data.request_id,
                })
                setErrorMessage(
                  "Estamos finalizando a configuração do ambiente. Tente novamente em alguns minutos."
                )
                setStatus("error")
              }
              return
            }

            if (statusCode === 401 || errorCode === "SUPABASE_TOKEN_INVALID") {
              await authService.logout()
              if (active) {
                toast.error("Sessão expirada, faça login novamente.")
                navigate("/login", { replace: true })
              }
              return
            }
            if (statusCode === 404) {
              setupState = (setupError.response?.data as SetupState) || { state: "no_store" }
            } else {
              console.warn("[AuthCallback] setup-state failed", {
                status: statusCode,
              })
              if (
                setupError.code === "ECONNABORTED" ||
                String(setupError.message || "").toLowerCase().includes("timeout")
              ) {
                throw new Error("Não foi possível confirmar seu acesso a tempo.")
              }
              throw new Error("Não foi possível verificar seu acesso.")
            }
          } else {
            throw setupError
          }
        }

        const hasStore = Boolean(setupState?.has_store)
        const isNoStore = setupState?.state === "no_store" || !hasStore
        const nextUrl = isNoStore
          ? "/onboarding"
          : "/app/dashboard?openEdgeSetup=1"

        console.log("[AuthCallback] redirect", {
          hasStore,
          hasEdge: setupState?.has_edge ?? null,
          nextUrl,
        })

        if (active) {
          navigate(nextUrl, { replace: true })
        }
      } catch (error) {
        const message = getErrorMessage(error, "Falha ao validar o login.")
        console.error("[AuthCallback] error", { message })
        if (active) {
          setErrorMessage(message)
          setStatus("error")
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    run()
    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [attempt, navigate, refreshAuth])

  const title = useMemo(() => {
    if (status === "error") {
      return "Não foi possível validar seu acesso"
    }
    if (status === "timeout") {
      return "Isso está demorando mais do que o esperado"
    }
    return "Confirmando seu e-mail…"
  }, [status])

  const subtitle = useMemo(() => {
    if (status === "error") {
      return "Verifique o link de confirmação ou tente novamente."
    }
    if (status === "timeout") {
      return "Ainda estamos tentando confirmar seu acesso."
    }
    return "Validando sua conta e preparando o acesso."
  }, [status])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        {status === "loading" && (
          <p className="mt-4 text-sm text-slate-500">Aguarde alguns segundos.</p>
        )}
        {status === "timeout" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">
              Se o link expirou, tente novamente. Você também pode voltar ao login.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={handleBackToLogin}
              className="block w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Voltar para Login
            </button>
          </div>
        )}
        {status === "error" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Voltar para Login
              </button>
            </div>
            {diagnostic && (
              <button
                type="button"
                onClick={handleCopyDiagnostic}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Copiar diagnóstico
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
