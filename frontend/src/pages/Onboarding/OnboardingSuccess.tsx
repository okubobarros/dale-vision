// frontend/src/pages/Onboarding/OnboardingSuccess.tsx
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

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

export default function OnboardingSuccess() {
  const navigate = useNavigate()
  const [showConfetti, setShowConfetti] = useState(true)

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: String(i),
      left: rand(0, 100),
      delay: rand(0, 0.6),
      duration: rand(1.6, 2.6),
      rotate: rand(0, 720),
      size: rand(6, 12),
      opacity: rand(0.6, 1),
    }))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2600)
    return () => clearTimeout(t)
  }, [])

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                <span className="text-xl">👁️</span>
              </div>
              <div className="font-semibold">Dale Vision</div>
            </div>
            <button
              className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Ajuda"
            >
              ?
            </button>
          </div>

          <div className="mt-8 rounded-3xl border border-green-400/20 bg-green-500/5 p-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-black font-extrabold">
                ✓
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="px-5 py-2 rounded-full border border-green-400/30 bg-green-500/10 text-green-200 font-semibold tracking-widest text-xs">
                SYSTEM ONLINE
              </div>
            </div>
          </div>

          <h1 className="mt-8 text-3xl font-extrabold leading-tight">
            Tudo Pronto! Sua operação agora é inteligente.
          </h1>

          <p className="mt-3 text-white/60">
            A Dale Vision está conectada e começando a processar dados em tempo real.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Ir para o Dashboard <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                  </div>
                  <div className="text-sm text-white/60 mt-1">
                    Visualize seus dados em tempo real agora mesmo.
                  </div>
                </div>
                <div className="text-green-300 font-bold">ACESSAR →</div>
              </div>
            </button>

            <button
              onClick={() => navigate("/alerts/rules")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Explorar Alertas</div>
                  <div className="text-sm text-white/60 mt-1">
                    Configure suas primeiras notificações inteligentes.
                  </div>
                </div>
                <div className="text-white/70 font-bold">›</div>
              </div>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-white/50">
            Precisa de ajuda com a configuração? Fale com nosso time.
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
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
