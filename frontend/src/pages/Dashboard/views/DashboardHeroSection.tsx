type DashboardType = "trial" | "paid_setup" | "paid_executive"
type AccountState = "trial_active" | "trial_expired" | "plan_active" | "unknown"
type NetworkState = "no_store" | "setup_incomplete" | "operating" | "incident"

interface DashboardHeroSectionProps {
  dashboardType: DashboardType
  networkName: string
  storeName: string
  title: string
  subtitle: string
  etaText: string
  trialCollectedHours: number
  trialProgressPct: number
  accountState: AccountState
  networkState: NetworkState
  canManageStore: boolean
  onOpenSetup: () => void
  onOpenCopilot: () => void
}

const accountLabel = (state: AccountState) => {
  if (state === "plan_active") return "Plano ativo"
  if (state === "trial_active") return "Trial ativo"
  if (state === "trial_expired") return "Trial expirado"
  return "Indefinido"
}

const networkLabel = (state: NetworkState) => {
  if (state === "operating") return "Operando"
  if (state === "setup_incomplete") return "Implantação"
  if (state === "incident") return "Atenção"
  return "Sem lojas"
}

export function DashboardHeroSection({
  dashboardType,
  networkName,
  storeName,
  title,
  subtitle,
  etaText,
  trialCollectedHours,
  trialProgressPct,
  accountState,
  networkState,
  canManageStore,
  onOpenSetup,
  onOpenCopilot,
}: DashboardHeroSectionProps) {
  const isTrial = dashboardType === "trial"
  const isExecutive = dashboardType === "paid_executive"

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-5 sm:p-7 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
            {isExecutive ? "Centro Executivo de Operações" : "Operações Inteligentes"} ·{" "}
            {networkName}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-200">{subtitle}</p>
          <p className="mt-2 text-xs text-slate-300">Loja em foco: {storeName}</p>
          {!isExecutive && <p className="mt-3 text-xs sm:text-sm text-slate-300">{etaText}</p>}
        </div>
        <div className="w-full sm:max-w-[280px] rounded-xl border border-white/15 bg-white/5 p-4">
          {isTrial ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span>Progresso do trial</span>
                <span>{trialCollectedHours}h / 72h</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${trialProgressPct}%` }}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 text-xs text-slate-200">
              <div className="flex items-center justify-between">
                <span>Estado da conta</span>
                <span className="font-semibold">{accountLabel(accountState)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estado da rede</span>
                <span className="font-semibold">{networkLabel(networkState)}</span>
              </div>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (canManageStore) onOpenSetup()
              }}
              className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300"
            >
              {isTrial ? "Ver checklist de ativação" : "Ver plano de implantação"}
            </button>
            <button
              type="button"
              onClick={onOpenCopilot}
              className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Perguntar ao Copiloto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
