// frontend/src/pages/Register/Register.tsx
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import logo from "../../assets/logo.png"
import SetupProgress from "../Onboarding/components/SetupProgress"

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

    await new Promise((r) => setTimeout(r, 700))

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
    <div className="relative min-h-screen w-full bg-gradient-to-b from-white to-slate-50 text-slate-900 flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl opacity-35 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
        <div className="absolute -bottom-36 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-purple-500 via-cyan-300 to-blue-400" />
      </div>

      <div className="relative w-full max-w-md">
        
        <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-6">
        
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
              <img src={logo} alt="DaleVision" className="relative h-10 w-auto" />
            </div>
            <div>
              <div className="font-semibold text-lg">Dale Vision</div>
              <div className="text-xs text-slate-500">Setup rápido • Trial 48h</div>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold leading-tight">
            Assuma o controle total da sua operação com IA
          </h1>
          <p className="mt-3 text-slate-500">
            Inicie sua jornada na plataforma de gestão multi-lojas mais inteligente do varejo.
          </p>
          {/* Progress (jornada) */}
          <SetupProgress step={1} titleRight="Registro" className="mb-5" />

          {/* Form */}
          <div className="mt-8 space-y-5">
            <div>
              <label className="text-sm text-slate-700">Nome Completo</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus-within:ring-4 focus-within:ring-cyan-100 focus-within:border-cyan-300 transition">
                <span className="text-slate-400">👤</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                  placeholder="Ex: João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              {errors.fullName && <p className="mt-2 text-xs text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label className="text-sm text-slate-700">E-mail Profissional</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus-within:ring-4 focus-within:ring-cyan-100 focus-within:border-cyan-300 transition">
                <span className="text-slate-400">✉️</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email && <p className="mt-2 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="text-sm text-slate-700">Nome da Empresa</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus-within:ring-4 focus-within:ring-cyan-100 focus-within:border-cyan-300 transition">
                <span className="text-slate-400">🏢</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                  placeholder="Sua rede de lojas"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              {errors.company && <p className="mt-2 text-xs text-red-600">{errors.company}</p>}
            </div>

            <div>
              <label className="text-sm text-slate-700">Senha</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus-within:ring-4 focus-within:ring-cyan-100 focus-within:border-cyan-300 transition">
                <span className="text-slate-400">🔒</span>
                <input
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                  type={showPass ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="text-slate-500 hover:text-slate-900"
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-xs text-red-600">{errors.password}</p>}
            </div>

            {/* CTA (brand gradient) */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="relative mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-4 font-semibold text-black
                         shadow-[0_18px_40px_rgba(59,130,246,0.18)] hover:opacity-95 transition disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition blur-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
              <span className="relative">{loading ? "Criando..." : "Criar Conta →"}</span>
            </button>

            <p className="text-center text-sm text-slate-600">
              Já possui uma conta?{" "}
              <Link to="/login" className="font-semibold text-slate-900 underline underline-offset-4 hover:opacity-80">
                Entrar
              </Link>
            </p>

            <p className="mt-4 text-center text-[11px] text-slate-500">
              AO SE REGISTRAR, VOCÊ CONCORDA COM NOSSOS <span className="underline">TERMOS DE USO</span> E{" "}
              <span className="underline">POLÍTICA DE PRIVACIDADE</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
