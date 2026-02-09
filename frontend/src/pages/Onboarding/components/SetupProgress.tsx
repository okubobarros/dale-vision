type Step = 1 | 2 | 3 | 4

export default function SetupProgress({
  step,
  titleRight,
  className = "",
}: {
  step: Step
  titleRight?: string
  className?: string
}) {
  const steps = [
    { n: 1, label: "Conta" },
    { n: 2, label: "Loja" },
    { n: 3, label: "Equipe" },
    { n: 4, label: "Ativação" },
  ] as const

  const pct = Math.round((step / 4) * 100)

  const isDone = (n: number) => n < step
  const isActive = (n: number) => n === step

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-medium text-slate-700">Etapa {step} de 4</span>
        <span>{titleRight || steps[step - 1].label}</span>
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-slate-200/70 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
        {steps.map((s) => (
          <div key={s.n} className="flex items-center gap-2">
            <span
              className={[
                "h-5 w-5 rounded-full flex items-center justify-center font-bold",
                isDone(s.n)
                  ? "bg-emerald-400 text-black"
                  : isActive(s.n)
                    ? "bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 text-black"
                    : "border border-slate-300 text-slate-500",
              ].join(" ")}
              aria-label={`Passo ${s.n} ${s.label}`}
            >
              {isDone(s.n) ? "✓" : s.n}
            </span>

            <span
              className={[
                isActive(s.n) ? "font-medium text-slate-900" : "text-slate-500",
              ].join(" ")}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
