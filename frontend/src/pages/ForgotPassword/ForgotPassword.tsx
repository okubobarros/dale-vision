import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { getResetPasswordUrl } from "../../lib/siteUrl"

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim())

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const canSubmit = useMemo(() => isValidEmail(email) && !isLoading, [email, isLoading])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")

    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido.")
      return
    }

    setIsLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: getResetPasswordUrl(),
        }
      )
      if (resetError && import.meta.env.DEV) {
        console.warn("[forgot-password] reset email failed", resetError)
      }
      setMessage(
        "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha."
      )
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[forgot-password] unexpected error", err)
      }
      setMessage(
        "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-35 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
        <div className="absolute -bottom-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-purple-500 via-cyan-300 to-blue-400" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Redefinir senha
            </h1>
            <p className="text-slate-500 mt-2">
              Enviaremos um link para você criar uma nova senha.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                           focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Digite seu e-mail"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="relative w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-extrabold text-black
                         shadow-[0_18px_40px_rgba(59,130,246,0.18)] hover:opacity-95 transition
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="relative">
                {isLoading ? "Enviando..." : "Enviar link de redefinição"}
              </span>
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

export default ForgotPassword
