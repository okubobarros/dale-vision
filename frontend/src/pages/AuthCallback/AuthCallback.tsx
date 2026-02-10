import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import api from "../../services/api"
import { authService } from "../../services/auth"

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            throw exchangeError
          }
        }

        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")
          if (accessToken && refreshToken) {
            const { error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (setError) {
              throw setError
            }
          }
          const cleanUrl = `${window.location.pathname}${window.location.search}`
          window.history.replaceState({}, "", cleanUrl)
        }

        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (!session || !session.user) {
          if (active) {
            navigate("/login?verified=1", { replace: true })
            return
          }
        }

        if (session && session.user) {
          authService.saveSupabaseSession(session, session.user, session.user.email || "")
        }

        try {
          await api.post("/accounts/supabase/")
        } catch {
          // bootstrap best-effort
        }

        if (active) {
          navigate("/app/dashboard", { replace: true })
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || "Falha ao validar o login.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Confirmando seu e-mail…
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Validando sua conta e preparando o acesso.
        </p>
        {loading && !error && (
          <p className="mt-4 text-sm text-slate-500">Aguarde alguns segundos.</p>
        )}
        {error && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
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
