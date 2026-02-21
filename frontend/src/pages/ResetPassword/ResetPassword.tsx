import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const MIN_PASSWORD_LENGTH = 8

const isWeakPassword = (value: string) => value.trim().length < MIN_PASSWORD_LENGTH

const shouldShowLinkError = (message: string) => {
  const lowered = message.toLowerCase()
  return (
    lowered.includes("expired") ||
    lowered.includes("invalid") ||
    lowered.includes("token") ||
    lowered.includes("recovery")
  )
}

const ResetPassword = () => {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let active = true
    const loadSession = async () => {
      setIsChecking(true)
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const hasSession = Boolean(data?.session)
      setSessionReady(hasSession)
      setIsChecking(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(Boolean(session))
        setIsChecking(false)
      }
    })

    void loadSession()
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const validationError = useMemo(() => {
    if (!password && !confirmPassword) return ""
    if (isWeakPassword(password)) {
      return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }
    if (password !== confirmPassword) {
      return "As senhas não conferem."
    }
    return ""
  }, [password, confirmPassword])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        throw updateError
      }
      await supabase.auth.signOut()
      navigate("/login?reset=1", { replace: true })
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "")
          : ""
      if (shouldShowLinkError(message)) {
        setError("Link inválido ou expirado. Solicite um novo link de redefinição.")
      } else {
        setError("Não foi possível redefinir sua senha. Tente novamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
        <div className="relative w-full max-w-md">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-8">
            <h1 className="text-2xl font-extrabold text-slate-900">Link inválido</h1>
            <p className="text-slate-600 mt-2">
              Abra o link do e-mail novamente ou solicite um novo link.
            </p>
            <div className="mt-6">
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 px-4 py-2 font-semibold text-black"
              >
                Solicitar novo link
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Defina sua nova senha
            </h1>
            <p className="text-slate-500 mt-2">Crie uma senha segura para entrar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                           focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Digite sua nova senha"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                           focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Confirme sua nova senha"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={Boolean(validationError) || isLoading}
              className="relative w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-extrabold text-black
                         shadow-[0_18px_40px_rgba(59,130,246,0.18)] hover:opacity-95 transition
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="relative">{isLoading ? "Salvando..." : "Salvar nova senha"}</span>
            </button>

            <div className="text-center text-sm text-slate-600">
              <Link to="/login" className="underline underline-offset-4 hover:text-slate-900">
                Voltar para login
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </div>
  )
}

export default ResetPassword
