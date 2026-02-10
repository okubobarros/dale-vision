// src/pages/Login/Login.tsx
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import logo from "../../assets/logo.png"
import { useAuth } from "../../contexts/AuthContext"
import { supabase } from "../../lib/supabase"
import { getAuthCallbackUrl } from "../../lib/siteUrl"

const Login = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [showResend, setShowResend] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const HOME_URL = "https://app.dalevision.com/"
  const DEMO_URL = "https://app.dalevision.com/agendar-demo"
  const PRIVACY_URL = "https://app.dalevision.com/politica-de-privacidade"

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("verified") === "1") {
      setError("E-mail verificado. Agora faça login.")
    }
  }, [location.search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShowResend(false)
    setResendMessage("")
    setIsLoading(true)

    try {
      await login({ username, password })
      navigate("/app/dashboard")
    } catch (err: any) {
      const errMessage = err?.message || ""
      const errCode = String(err?.code || "").toLowerCase()
      const isEmailNotConfirmed =
        errCode === "email_not_confirmed" ||
        errMessage.toLowerCase().includes("email not confirmed") ||
        errMessage.toLowerCase().includes("confirm") ||
        errMessage.toLowerCase().includes("confirma")

      if (isEmailNotConfirmed) {
        setError("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.")
        setShowResend(true)
      } else {
        const errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          err.message ||
          "Usuário ou senha incorretos"
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    const email = username.trim()
    if (!email || !email.includes("@")) {
      setResendMessage("Informe um e-mail válido para reenviar.")
      return
    }
    setResendLoading(true)
    setResendMessage("")
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      })
      if (resendError) {
        setResendMessage(resendError.message || "Não foi possível reenviar o e-mail.")
      } else {
        setResendMessage("E-mail de confirmação reenviado.")
      }
    } catch {
      setResendMessage("Não foi possível reenviar o e-mail.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      {/* Brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-35 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
        <div className="absolute -bottom-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-purple-500 via-cyan-300 to-blue-400" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              type="button"
              onClick={() => window.location.assign(HOME_URL)}
              className="group inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition"
              aria-label="Ir para a home"
            >
              <div className="absolute opacity-0 group-hover:opacity-100 transition pointer-events-none w-16 h-16 rounded-2xl blur-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
              <img src={logo} alt="DALE Vision" className="relative h-12 w-auto" />
            </button>

            <h1 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">DALE Vision</h1>
            <p className="text-slate-500 mt-2">Gestão inteligente para suas lojas</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-[2px]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
                {showResend && (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {resendLoading ? "Reenviando..." : "Reenviar e-mail"}
                    </button>
                    {resendMessage && (
                      <span className="text-xs text-red-700">{resendMessage}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                  E-mail
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400
                             shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                             focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                  placeholder="Digite seu e-mail"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400
                               shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                               focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                  placeholder="Digite sua senha"
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={isLoading}
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                        <path d="M9.88 4.24A9.94 9.94 0 0112 4c5.05 0 9.27 3.11 11 8-0.56 1.58-1.49 3-2.7 4.12" />
                        <path d="M6.23 6.23A11.76 11.76 0 001 12c1.73 4.89 5.95 8 11 8 1.59 0 3.12-.31 4.52-.87" />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* CTA (brand gradient) */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-extrabold text-black
                           shadow-[0_18px_40px_rgba(59,130,246,0.18)] hover:opacity-95 transition
                           disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition blur-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
                <span className="relative">
                  {isLoading ? (
                    <span className="inline-flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Entrando...
                    </span>
                  ) : (
                    "Entrar"
                  )}
                </span>
              </button>

              {/* Política */}
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Ao continuar, você concorda com a{" "}
                <a
                  href={PRIVACY_URL}
                  className="underline underline-offset-4 hover:text-slate-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  Política de Privacidade
                </a>{" "}
                da DaleVision.
              </p>

              {/* Demo */}
              <p className="text-sm text-slate-600 text-center">
                Não tem uma conta?{" "}
                <a
                  href={DEMO_URL}
                  className="font-semibold text-slate-900 underline underline-offset-4 hover:opacity-80"
                >
                  Agende uma demonstração
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </div>
  )
}

export default Login
