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
  operationalInsights,
  copilotPrompts,
  canManageStore,
  onOpenSetup,
  onOpenCopilot,
}: PaidSetupDashboardViewProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Implantação operacional em andamento
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Sua conta já está paga. Estamos concluindo conexão e coleta das lojas para liberar visão executiva completa.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {trialChecklist.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border px-3 py-2 text-sm ${
                item.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              {item.done ? "✓" : "•"} {item.label}
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
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Sinais operacionais durante implantação
          </h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {operationalInsights.map((insight) => (
              <li key={insight}>• {insight}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900">Copiloto DaleVision</h3>
        <p className="mt-1 text-sm text-gray-600">
          Seu braço direito para acelerar a implantação com clareza executiva.
        </p>
        <div className="mt-3 space-y-2">
          {copilotPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onOpenCopilot(prompt)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

