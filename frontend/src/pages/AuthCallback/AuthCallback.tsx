import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import api from "../../services/api"
import { authService } from "../../services/auth"
import { useAuth } from "../../contexts/AuthContext"

type SetupState = {
  has_store: boolean
  has_edge?: boolean
  store_count?: number
  primary_store_id?: string | null
}

type CallbackStatus = "loading" | "error"

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
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const handleBackToLogin = useCallback(() => {
    navigate("/login", { replace: true })
  }, [navigate])

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const url = new URL(window.location.href)
        const urlError = readUrlError(url)
        if (urlError) {
          throw new Error(decodeURIComponent(urlError))
        }

        const code = url.searchParams.get("code")
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""))
        const accessToken =
          hashParams.get("access_token") || url.searchParams.get("access_token")
        const refreshToken =
          hashParams.get("refresh_token") || url.searchParams.get("refresh_token")

        console.log("[AuthCallback] params", {
          hasCode: !!code,
          hasHashToken: !!hashParams.get("access_token"),
          hasQueryToken: !!url.searchParams.get("access_token"),
        })

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            console.error("[AuthCallback] exchange code failed", {
              message: exchangeError.message,
            })
            throw exchangeError
          }
          window.history.replaceState({}, "", window.location.pathname)
        } else if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (setSessionError) {
            console.error("[AuthCallback] set session failed", {
              message: setSessionError.message,
            })
            throw setSessionError
          }
          window.history.replaceState({}, "", window.location.pathname)
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error("[AuthCallback] get session failed", {
            message: sessionError.message,
          })
          throw sessionError
        }

        const session = data.session
        if (!session || !session.user) {
          throw new Error("Sessão inválida. Faça login novamente.")
        }

        authService.saveSupabaseSession(session, session.user, session.user.email || "")
        refreshAuth()

        try {
          await api.post("/accounts/supabase/")
        } catch (bootstrapError) {
          console.warn("[AuthCallback] supabase bootstrap failed", {
            message: getErrorMessage(bootstrapError, "bootstrap_error"),
          })
        }

        let setupState: SetupState
        try {
          const response = await api.get<SetupState>("/me/setup-state/")
          setupState = response.data
        } catch (setupError) {
          console.warn("[AuthCallback] setup-state failed", {
            message: getErrorMessage(setupError, "setup_state_error"),
          })
          throw new Error("Não foi possível verificar seu setup.")
        }

        const hasStore = Boolean(setupState.has_store)
        const nextUrl = hasStore
          ? "/app/dashboard?openEdgeSetup=1"
          : "/onboarding"

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
      }
    }

    run()
    return () => {
      active = false
    }
  }, [navigate, refreshAuth])

  const title = useMemo(() => {
    if (status === "error") {
      return "Não foi possível validar seu acesso"
    }
    return "Confirmando seu e-mail…"
  }, [status])

  const subtitle = useMemo(() => {
    if (status === "error") {
      return "Verifique o link de confirmação ou tente novamente."
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
        {status === "error" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar para Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
