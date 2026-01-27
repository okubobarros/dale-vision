// frontend/src/pages/Onboarding/components/OnboardingProgress.tsx
interface Props {
  currentStep: number
  totalSteps: number
}

export default function OnboardingProgress({ currentStep, totalSteps }: Props) {
  const steps = ["Lojas", "Funcionários", "Câmeras"]
  const pct = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Configurar suas Lojas
          </h2>
          <p className="text-white/60 text-sm mt-1">
            Passo {currentStep} de {totalSteps}
          </p>
        </div>

        <div className="text-sm text-white/60">{pct}% completo</div>
      </div>

      <div className="w-full h-2 rounded-full overflow-hidden border border-white/10 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {steps.map((label, idx) => {
          const n = idx + 1
          const active = n <= currentStep
          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <div
                className={[
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white/5 text-white/50 border border-white/10",
                ].join(" ")}
              >
                {n}
              </div>
              <p className={active ? "text-sm font-medium" : "text-sm text-white/50"}>
                {label}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/70">
          <span className="font-semibold text-white">Trial 48h:</span>{" "}
          1 loja • até 3 câmeras • até 5 funcionários. Você pode ajustar depois.
        </p>
      </div>
    </div>
  )
}
