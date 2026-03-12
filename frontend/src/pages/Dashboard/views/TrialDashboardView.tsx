import { Link } from "react-router-dom"
import { DashboardSetupStateCard } from "./DashboardSetupStateCard"

type TrialUiState = "not_started" | "activation" | "collecting" | "report_ready"

type ChecklistItem = {
  label: string
  done: boolean
}

interface TrialDashboardViewProps {
  trialUiState: TrialUiState
  trialCollectedHours: number
  trialHoursRemaining: number
  trialChecklist: ChecklistItem[]
  operationalInsights: string[]
  copilotPrompts: string[]
  canManageStore: boolean
  onOpenSetup: () => void
  onOpenCopilot: (prompt?: string) => void
}

export function TrialDashboardView({
  trialUiState,
  trialCollectedHours,
  trialHoursRemaining,
  trialChecklist,
  operationalInsights,
  copilotPrompts,
  canManageStore,
  onOpenSetup,
  onOpenCopilot,
}: TrialDashboardViewProps) {
  const setupState =
    trialUiState === "not_started"
      ? "not_started"
      : trialUiState === "activation"
      ? "setup_in_progress"
      : trialUiState === "collecting"
      ? "collecting_data"
      : "report_ready"
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="space-y-4">
        <DashboardSetupStateCard
          state={setupState}
          checklist={trialChecklist.slice(0, 4)}
          collectedHours={trialCollectedHours}
          remainingHours={trialHoursRemaining}
          canManageStore={canManageStore}
          onOpenSetup={onOpenSetup}
          onOpenCopilot={onOpenCopilot}
        />
        {trialUiState === "report_ready" && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">Relatório operacional</h4>
            <p className="mt-2 text-sm text-slate-700">
              Seu diagnóstico já está disponível para revisão detalhada.
            </p>
            <div className="mt-3">
              <Link
                to="/app/report"
                className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ver relatório
              </Link>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Sinais operacionais iniciais
          </h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {operationalInsights.map((insight) => (
              <li key={insight}>• {insight}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#111827] p-4 sm:p-6 text-white shadow-sm">
        <h3 className="text-[18px] font-semibold">DALE Copiloto</h3>
        <p className="mt-1 text-sm text-slate-300">
          Seu assistente para interpretar progresso e próximos passos.
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
            placeholder="Pergunte algo sobre seu trial..."
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
