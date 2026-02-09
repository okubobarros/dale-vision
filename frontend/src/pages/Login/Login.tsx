// src/pages/Login/Login.tsx
// src/pages/Login/Login.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import logo from "../../assets/logo.png"
import { useAuth } from "../../contexts/AuthContext"

const Login = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const HOME_URL = "https://app.dalevision.com/"
  const DEMO_URL = "https://app.dalevision.com/agendar-demo"
  const PRIVACY_URL = "https://app.dalevision.com/politica-de-privacidade" // ajuste se a rota for diferente

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login({ username, password })
      navigate("/app/dashboard")
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        "Usuário ou senha incorretos"

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#06130B] via-[#081A10] to-[#07170E] p-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-2xl p-8">
          <div className="text-center mb-8">
            <button
              type="button"
              onClick={() => window.location.assign(HOME_URL)}
              className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4 hover:opacity-95 transition"
              aria-label="Ir para a home"
            >
              <img src={logo} alt="DALE Vision" className="h-12 w-auto" />
            </button>

            <h1 className="text-3xl font-bold text-white">DALE Vision</h1>
            <p className="text-white/60 mt-2">Gestão inteligente para suas lojas</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-2">
                  Usuário
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/35
                             focus:ring-2 focus:ring-green-400/40 focus:border-transparent transition"
                  placeholder="Digite seu usuário"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/35
                             focus:ring-2 focus:ring-green-400/40 focus:border-transparent transition"
                  placeholder="Digite sua senha"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-400 text-black font-extrabold py-3 px-4 rounded-lg
                           shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center"
              >
                {isLoading ? (
                  <>
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
                  </>
                ) : (
                  "Entrar"
                )}
              </button>

              {/* Política */}
              <p className="text-xs text-white/45 text-center leading-relaxed">
                Ao continuar, você concorda com a{" "}
                <a
                  href={PRIVACY_URL}
                  className="underline underline-offset-4 hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  Política de Privacidade
                </a>{" "}
                da DaleVision.
              </p>

              {/* Demo */}
              <p className="text-sm text-white/65 text-center">
                Não tem uma conta?{" "}
                <a
                  href={DEMO_URL}
                  className="font-semibold text-white underline underline-offset-4 hover:text-green-200"
                >
                  Agende uma demonstração
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
