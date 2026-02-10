import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import api from "../../services/api"
import { authService } from "../../services/auth"

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null)

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

        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (!session || !session.user) {
          throw new Error("Sessão não encontrada")
        }

        authService.saveSupabaseSession(session, session.user, session.user.email || "")

        try {
          await api.post("/accounts/supabase/")
        } catch {
          // bootstrap best-effort
        }

        if (active) {
          window.location.assign("/onboarding")
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || "Falha ao validar o login.")
        }
      }
    }

    run()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Finalizando login…</h1>
        <p className="mt-2 text-sm text-slate-600">
          Validando sua conta e preparando o onboarding.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error} Tente novamente em alguns instantes.
          </p>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
