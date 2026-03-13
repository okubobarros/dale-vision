import { useMemo, useState } from "react"
import type { RevenueProgressState } from "../../services/sales"

type RevenueProgressBarProps = {
  state: RevenueProgressState
  currentRevenue: number
  targetRevenue: number
  currency?: string
  lastSyncAt?: string | null
  onConnectSystem?: () => void
  className?: string
}

const SUPPORT_URL =
  "https://wa.me/5511996918070?text=Olá,%20preciso%20de%20ajuda%20para%20conectar%20meu%20sistema%20de%20vendas%20no%20app."
const MILESTONE_TARGETS = [100_000, 1_000_000, 5_000_000]

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.max(0, value))

const RevenueProgressBar = ({
  state,
  currentRevenue,
  targetRevenue: _targetRevenue,
  currency = "BRL",
  lastSyncAt,
  onConnectSystem,
  className = "",
}: RevenueProgressBarProps) => {
  const [open, setOpen] = useState(false)
  const safeCurrentRevenue = Math.max(0, currentRevenue)
  const milestoneTarget =
    MILESTONE_TARGETS.find((value) => safeCurrentRevenue < value) ??
    MILESTONE_TARGETS[MILESTONE_TARGETS.length - 1]
  const safeTarget = milestoneTarget > 0 ? milestoneTarget : 1
  const progressPct = useMemo(
    () => Math.max(0, Math.min(100, (safeCurrentRevenue / safeTarget) * 100)),
    [safeCurrentRevenue, safeTarget]
  )

  const connectedLabel = `${formatCurrency(safeCurrentRevenue, currency)} / ${formatCurrency(
    milestoneTarget,
    currency
  )}`
  const tooltipText =
    "Conecte seu sistema de vendas (PDV ou gateway de pagamento) para acompanhar seu faturamento automaticamente."

  const handleSupport = () => {
    window.open(SUPPORT_URL, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      className={`relative min-w-[220px] rounded-lg border border-indigo-200 bg-white px-3 py-2 shadow-sm ${className}`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600" />
            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">Faturamento</span>
          </div>
          {state === "connected" && (
            <span className="text-[11px] font-semibold text-slate-700 truncate">{connectedLabel}</span>
          )}
          {state === "syncing" && (
            <span className="text-[11px] font-medium text-amber-700 whitespace-nowrap">
              Sincronizando...
            </span>
          )}
        </div>

        <div className="mt-2">
          {state === "connected" ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0066FF] to-[#7C3AED] transition-[width] duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-slate-500">{Math.round(progressPct)}% da meta atual</div>
            </>
          ) : state === "syncing" ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#0066FF] to-[#7C3AED]" />
              </div>
              <div className="mt-1 text-[10px] text-amber-700">Sincronizando dados de vendas...</div>
            </>
          ) : (
            <div className="group relative mt-1 inline-flex">
              <span className="text-[11px] text-slate-600">Integração de vendas não configurada</span>
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500">
                ?
              </span>
              <div className="pointer-events-none absolute left-0 top-6 z-30 hidden w-72 rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-lg group-hover:block">
                {tooltipText}
              </div>
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          {state === "connected" ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Progresso de faturamento</div>
              <div className="text-xs text-slate-600">{connectedLabel}</div>
              <div className="text-[11px] text-slate-500">
                Metas progressivas: R$ 100 mil → R$ 1 mi → R$ 5 mi
              </div>
              {lastSyncAt ? (
                <div className="text-[11px] text-slate-500">
                  Última sincronização: {new Date(lastSyncAt).toLocaleString("pt-BR")}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Sem horário de sincronização informado.</div>
              )}
            </div>
          ) : state === "syncing" ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Sincronização em andamento</div>
              <div className="text-xs text-slate-600">Sincronizando dados de vendas...</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-800">Integração de vendas não configurada</div>
              <p className="text-xs text-slate-600">{tooltipText}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onConnectSystem}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Conectar sistema
                </button>
                <button
                  type="button"
                  onClick={handleSupport}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Falar com suporte
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RevenueProgressBar
