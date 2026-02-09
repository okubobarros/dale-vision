// frontend/src/pages/Register/Register.tsx
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import logo from "../../assets/logo.png"
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!fullName.trim()) e.fullName = "Informe seu nome completo."
    if (!email.trim() || !isValidEmail(email)) e.email = "Informe um e-mail válido."
    if (!company.trim()) e.company = "Informe o nome da empresa."
    if (!password || password.length < 8) e.password = "Senha precisa ter no mínimo 8 caracteres."
    return e
  }, [fullName, email, company, password])

  const canSubmit = Object.keys(errors).length === 0

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)

    // ✅ Sem backend: simula criação de conta
    await new Promise((r) => setTimeout(r, 700))

    // Você pode salvar no localStorage só pra demo:
    localStorage.setItem(
      "demo_user",
      JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        company: company.trim(),
      })
    )

    setLoading(false)
    navigate("/onboarding")
  }

  return (
    <div className="min-h-screen w-full bg-[#070B18] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <img src={logo} alt="DaleVision" className="h-10 w-auto" />
            </div>
            <div>
              <div className="font-semibold text-lg">Dale Vision</div>
              <div className="text-xs text-white/60">Setup rápido • Trial 48h</div>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold leading-tight">
            Assuma o controle total da sua operação com IA
          </h1>
          <p className="mt-3 text-white/60">
            Inicie sua jornada na plataforma de gestão multi-lojas mais inteligente do varejo.
          </p>

          {/* Form */}
          <div className="mt-8 space-y-5">
            <div>
              <label className="text-sm text-white/80">Nome Completo</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-white/60">👤</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                  placeholder="Ex: João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              {errors.fullName && <p className="mt-2 text-xs text-red-300">{errors.fullName}</p>}
            </div>

            <div>
              <label className="text-sm text-white/80">E-mail Corporativo</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-white/60">✉️</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email && <p className="mt-2 text-xs text-red-300">{errors.email}</p>}
            </div>

            <div>
              <label className="text-sm text-white/80">Nome da Empresa</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-white/60">🏢</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                  placeholder="Sua rede de lojas"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              {errors.company && <p className="mt-2 text-xs text-red-300">{errors.company}</p>}
            </div>

            <div>
              <label className="text-sm text-white/80">Senha</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-white/60">🔒</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                  type={showPass ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="text-white/60 hover:text-white"
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-xs text-red-300">{errors.password}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar Conta →"}
            </button>

            <p className="text-center text-sm text-white/60">
              Já possui uma conta?{" "}
              <Link to="/login" className="text-blue-300 hover:text-blue-200">
                Entrar
              </Link>
            </p>

            <p className="mt-4 text-center text-[11px] text-white/35">
              AO SE REGISTRAR, VOCÊ CONCORDA COM NOSSOS{" "}
              <span className="underline">TERMOS DE USO</span> E{" "}
              <span className="underline">POLÍTICA DE PRIVACIDADE</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
