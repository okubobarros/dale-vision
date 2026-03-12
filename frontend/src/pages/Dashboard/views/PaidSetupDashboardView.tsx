import { DashboardSetupStateCard } from "./DashboardSetupStateCard"

type ChecklistItem = {
  label: string
  done: boolean
}

interface PaidSetupDashboardViewProps {
  setupState: "not_started" | "setup_in_progress" | "collecting_data" | "report_ready"
  trialCollectedHours: number
  trialHoursRemaining: number
  trialChecklist: ChecklistItem[]
  copilotPrompts: string[]
  canManageStore: boolean
  onOpenSetup: () => void
  onOpenCopilot: (prompt?: string) => void
}

export function PaidSetupDashboardView({
  setupState,
  trialCollectedHours,
  trialHoursRemaining,
  trialChecklist,
  copilotPrompts,
  canManageStore,
  onOpenSetup,
  onOpenCopilot,
}: PaidSetupDashboardViewProps) {
  const checklist = trialChecklist.slice(0, 4)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <DashboardSetupStateCard
        state={setupState}
        checklist={checklist}
        collectedHours={trialCollectedHours}
        remainingHours={trialHoursRemaining}
        canManageStore={canManageStore}
        onOpenSetup={onOpenSetup}
        onOpenCopilot={onOpenCopilot}
      />

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
