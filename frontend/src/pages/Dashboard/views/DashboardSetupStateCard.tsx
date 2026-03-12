type SetupState = "not_started" | "setup_in_progress" | "collecting_data" | "report_ready"

type ChecklistItem = {
  label: string
  done: boolean
}

interface DashboardSetupStateCardProps {
  state: SetupState
  checklist: ChecklistItem[]
  collectedHours: number
  remainingHours: number
  canManageStore: boolean
  onOpenSetup: () => void
  onOpenCopilot: (prompt?: string) => void
}

const stateCopy = (state: SetupState, remainingHours: number) => {
  if (state === "not_started") {
    return {
      title: "Comece a implantação operacional",
      subtitle: "Conecte a estrutura da loja para iniciar a leitura executiva da operação.",
      status: "Aguardando início",
    }
  }
  if (state === "setup_in_progress") {
    return {
      title: "Implantação operacional em andamento",
      subtitle: "Finalize os itens críticos para liberar uma visão confiável da operação.",
      status: "Implantação em progresso",
    }
  }
  if (state === "collecting_data") {
    return {
      title: "Diagnóstico operacional em preparação",
      subtitle: `Estamos consolidando sinais reais da loja. Previsão do relatório em ~${remainingHours}h.`,
      status: "Coleta de sinais em andamento",
    }
  }
  return {
    title: "Seu diagnóstico operacional está pronto",
    subtitle: "Agora você já pode revisar achados e priorizar ações com apoio do Copiloto.",
    status: "Diagnóstico liberado",
  }
}

export function DashboardSetupStateCard({
  state,
  checklist,
  collectedHours,
  remainingHours,
  canManageStore,
  onOpenSetup,
  onOpenCopilot,
}: DashboardSetupStateCardProps) {
  const copy = stateCopy(state, remainingHours)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-gray-900">{copy.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{copy.subtitle}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
          {copy.status}
        </span>
      </div>

      {(state === "collecting_data" || state === "report_ready") && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {state === "report_ready"
            ? "72h concluídas. Diagnóstico consolidado."
            : `${collectedHours}h de 72h concluídas · faltam aproximadamente ${remainingHours}h`}
        </div>
      )}

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
          onClick={() => onOpenCopilot("Como está o progresso operacional da loja?")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Revisar com o Copiloto
        </button>
      </div>
    </div>
  )
}

