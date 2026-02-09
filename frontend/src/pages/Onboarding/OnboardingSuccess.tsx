// frontend/src/pages/Onboarding/OnboardingSuccess.tsx
import { useEffect, useMemo, useState } from "react"

type ConfettiPiece = {
  id: string
  left: number
  delay: number
  duration: number
  rotate: number
  size: number
  opacity: number
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

type Phase = "celebrate" | "preparing" | "redirecting"

export default function OnboardingSuccess() {
  // Se seu login é rota interna, use "/login".
  // Se precisa garantir domínio, use a URL completa.
  const LOGIN_URL = "https://app.dalevision.com/login"

  const [phase, setPhase] = useState<Phase>("celebrate")
  const [showConfetti, setShowConfetti] = useState(true)
  const [countdown, setCountdown] = useState(6)

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 70 }).map((_, i) => ({
      id: String(i),
      left: rand(0, 100),
      delay: rand(0, 0.6),
      duration: rand(1.4, 2.2),
      rotate: rand(0, 720),
      size: rand(6, 12),
      opacity: rand(0.6, 1),
    }))
  }, [])

  // Sequência “vitória → preparando → redirecionando”
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("preparing"), 1100)
    const t2 = setTimeout(() => setPhase("redirecting"), 3800)
    const t3 = setTimeout(() => setShowConfetti(false), 2100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  // Countdown + redirect
  useEffect(() => {
    if (phase !== "redirecting") return

    if (countdown <= 0) {
      // Marcar que veio do onboarding (útil pro login redirecionar para wizard)
      try {
        localStorage.setItem("dv_from_onboarding", "1")
      } catch {}

      window.location.assign(LOGIN_URL)
      return
    }

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  const goLoginNow = () => {
    try {
      localStorage.setItem("dv_from_onboarding", "1")
    } catch {}
    window.location.assign(LOGIN_URL)
  }

  const progressWidth =
    phase === "celebrate" ? "w-[35%]" : phase === "preparing" ? "w-[78%]" : "w-full"

  const steps = [
    { label: "Cadastro", status: "done" as const },
    { label: "Dados do negócio", status: "done" as const },
    { label: "Ambiente do trial", status: phase === "celebrate" ? "todo" : phase === "preparing" ? "doing" : "done" },
    { label: "Login para ativar 1ª loja", status: phase === "redirecting" ? "doing" : "todo" },
  ]

  const activationChecklist = [
    "Criar loja (campos rápidos)",
    "Gerar credenciais do Edge (store_id + edge_token)",
    "Baixar e rodar o Edge Agent (colar .env e start)",
    "Receber heartbeat ✅ (Loja Online)",
    "Conectar 1 câmera ✅",
    "Ativar 1 regra pronta ✅",
    "Ver 1º alerta + dashboard ✅",
  ]

  return (
    <div className="min-h-screen w-full bg-[#05110A] text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {pieces.map((p) => (
            <span
              key={p.id}
              className="confetti-piece absolute top-[-20px]"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size * 0.6}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                transform: `rotate(${p.rotate}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-green-400/20 bg-gradient-to-b from-green-500/10 to-transparent p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                <span className="text-xl">👁️</span>
              </div>
              <div>
                <div className="font-semibold leading-none">Dale Vision</div>
                <div className="text-xs text-white/45 mt-1">
                  Trial liberado • preparando seu ambiente
                </div>
              </div>
            </div>

            <button
              className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Ajuda"
              onClick={() => window.location.assign("https://app.dalevision.com/support")}
            >
              ?
            </button>
          </div>

          {/* Progresso + Stepper */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">Progresso</div>
              <div className="text-xs text-white/45">
                {phase === "celebrate" && "Validando…"}
                {phase === "preparing" && "Preparando…"}
                {phase === "redirecting" && `Login em ${countdown}s…`}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className={[
                      "h-6 w-6 rounded-full flex items-center justify-center border text-xs",
                      s.status === "done" ? "bg-green-500/20 border-green-400/40 text-green-200" : "",
                      s.status === "doing" ? "bg-white/10 border-white/20 text-white" : "",
                      s.status === "todo" ? "bg-transparent border-white/10 text-white/35" : "",
                    ].join(" ")}
                  >
                    {s.status === "done" ? "✓" : s.status === "doing" ? "…" : "•"}
                  </div>
                  <div className={s.status === "todo" ? "text-white/40 text-sm" : "text-sm"}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={[
                  "h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300 transition-all duration-700",
                  progressWidth,
                ].join(" ")}
              />
            </div>
          </div>

          {/* Vitória */}
          <div className="mt-6 rounded-3xl border border-green-400/20 bg-green-500/5 p-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center pop-in">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-black font-extrabold">
                ✓
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="px-5 py-2 rounded-full border border-green-400/30 bg-green-500/10 text-green-200 font-semibold tracking-widest text-xs">
                {phase === "redirecting" ? "PRONTO PARA ATIVAR" : "SYSTEM ONLINE"}
              </div>
            </div>
          </div>

          {/* Copy (orientada ao uau) */}
          <h1 className="mt-7 text-3xl font-extrabold leading-tight fade-up">
            ✅ Conta criada. Agora vamos colocar sua 1ª loja online.
          </h1>

          <p className="mt-3 text-white/60 fade-up" style={{ animationDelay: "90ms" }}>
            Em poucos minutos você vai ver: <b>Loja Online (heartbeat)</b> → <b>1 câmera online</b> →{" "}
            <b>dashboard saindo de “sem dados”</b> → <b>1 alerta real</b>.
          </p>

          {/* Checklist teaser (sensação de caminho claro) */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50 mb-3">O que vem agora</div>
            <ul className="space-y-2 text-sm">
              {activationChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-white/80">
                  <span className="mt-[2px] h-5 w-5 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xs text-white/60">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA (login inevitável) */}
          <div className="mt-6 space-y-3">
            <button
              onClick={goLoginNow}
              className="w-full rounded-2xl bg-green-500 text-black font-extrabold p-4 hover:bg-green-400 transition flex items-center justify-between"
            >
              <span>Entrar agora e ativar minha 1ª loja</span>
              <span className="text-black/70">→</span>
            </button>

            <button
              onClick={() => window.location.assign("https://app.dalevision.com/support?topic=camera")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Preciso de ajuda para conectar câmera</div>
                  <div className="text-sm text-white/60 mt-1">
                    Nosso time te guia em 5 minutos.
                  </div>
                </div>
                <div className="text-white/70 font-bold">›</div>
              </div>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-white/50">
            Você será redirecionado automaticamente para o login.
          </p>
        </div>
      </div>

      <style>{`
        .confetti-piece {
          border-radius: 2px;
          background: linear-gradient(90deg, rgba(59,130,246,1), rgba(168,85,247,1));
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(.2,.7,.2,1);
          animation-fill-mode: forwards;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .fade-up {
          opacity: 0;
          transform: translateY(8px);
          animation: fadeUp 420ms ease forwards;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .pop-in {
          animation: popIn 320ms ease forwards;
        }
        @keyframes popIn {
          0% { transform: scale(.92); opacity: .85; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
