type ChecklistItem = {
  label: string
  done: boolean
}

interface PaidSetupDashboardViewProps {
  trialChecklist: ChecklistItem[]
  operationalInsights: string[]
  copilotPrompts: string[]
  canManageStore: boolean
  onOpenSetup: () => void
  onOpenCopilot: (prompt?: string) => void
}

export function PaidSetupDashboardView({
  trialChecklist,
  copilotPrompts,
  canManageStore,
  onOpenSetup,
  onOpenCopilot,
}: PaidSetupDashboardViewProps) {
  const checklist = trialChecklist.slice(0, 4)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-[18px] font-semibold text-gray-900">
          Implantação operacional em andamento
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Sua conta já está paga. Conclua a implantação para liberar visão executiva completa.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border px-3 py-2 text-sm ${
                item.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              {item.done ? "✓" : "○"} {item.label}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => canManageStore && onOpenSetup()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ver plano de implantação
          </button>
          <button
            type="button"
            onClick={() => onOpenCopilot()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Revisar com o Copiloto
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111827] p-4 sm:p-6 text-white shadow-sm">
        <h3 className="text-[18px] font-semibold">DALE Copiloto</h3>
        <p className="mt-1 text-sm text-slate-300">
          Seu assistente para decisões operacionais da rede.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {copilotPrompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onOpenCopilot(prompt)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value=""
            placeholder="Pergunte algo sobre sua operação..."
            onFocus={() => onOpenCopilot()}
            className="w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={() => onOpenCopilot()}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
          >
            ➤
          </button>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => onOpenCopilot()}
            className="w-full rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Abrir Copiloto em tela cheia
          </button>
        </div>
      </div>
    </div>
  )
}
