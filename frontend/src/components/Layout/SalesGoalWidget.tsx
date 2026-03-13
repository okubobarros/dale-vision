import { useEffect, useMemo, useRef, useState } from "react"

type SalesGoalWidgetProps = {
  currentRevenue?: number
  isIntegrationConfigured?: boolean
  className?: string
}

type RevenueTier = {
  min: number
  max: number
}

const SUPPORT_URL =
  "https://wa.me/5511996918070?text=Olá,%20tenho%20interesse%20em%20integrar%20meu%20sistema%20de%20vendas%20ao%20app."

const REVENUE_TIERS: RevenueTier[] = [
  { min: 0, max: 100_000 },
  { min: 100_000, max: 1_000_000 },
  { min: 1_000_000, max: 5_000_000 },
  { min: 5_000_000, max: 10_000_000 },
]

export const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value))

export const getRevenueTier = (currentRevenue: number): RevenueTier => {
  const safeRevenue = Math.max(0, currentRevenue)
  const tier = REVENUE_TIERS.find((item) => safeRevenue < item.max)
  return tier ?? REVENUE_TIERS[REVENUE_TIERS.length - 1]
}

export const getTierProgress = (currentRevenue: number, tier: RevenueTier): number => {
  const tierRange = Math.max(1, tier.max - tier.min)
  const safeRevenue = Math.max(0, currentRevenue)
  const progress = ((safeRevenue - tier.min) / tierRange) * 100
  return Math.max(0, Math.min(100, progress))
}

const SalesGoalWidget = ({
  currentRevenue = 0,
  isIntegrationConfigured = false,
  className = "",
}: SalesGoalWidgetProps) => {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const displayRevenue = isIntegrationConfigured ? Math.max(0, currentRevenue) : 0
  const tier = useMemo(() => getRevenueTier(displayRevenue), [displayRevenue])
  const progressPercent = useMemo(() => getTierProgress(displayRevenue, tier), [displayRevenue, tier])
  const isOpen = open || pinned

  useEffect(() => {
    if (!pinned) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPinned(false)
      }
    }
    window.addEventListener("mousedown", onPointerDown)
    return () => window.removeEventListener("mousedown", onPointerDown)
  }, [pinned])

  const handleInterest = () => {
    window.open(SUPPORT_URL, "_blank", "noopener,noreferrer")
  }

  const topValue = `${formatCurrencyBRL(displayRevenue)} / ${formatCurrencyBRL(tier.max)}`

  return (
    <div
      ref={containerRef}
      className={`relative h-12 min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="w-full text-left outline-none"
        onClick={() => setPinned((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Meta de Vendas"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED]" />
            <span className="truncate text-[11px] font-semibold text-slate-800">Meta de Vendas</span>
          </div>
          <span className="shrink-0 text-[11px] font-medium text-slate-700">{topValue}</span>
        </div>

        <div className="mt-1 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] p-[1px] transition-shadow duration-200 hover:shadow-[0_0_0_2px_rgba(99,102,241,0.12)]">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] transition-[width] duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+8px)] z-40 w-[min(92vw,380px)] origin-top-right rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        role="dialog"
        aria-hidden={!isOpen}
      >
        {isIntegrationConfigured ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Meta de vendas da faixa atual</div>
            <p className="text-xs text-slate-600">
              Você está na faixa {formatCurrencyBRL(tier.min)} → {formatCurrencyBRL(tier.max)}.
            </p>
            <p className="text-xs text-slate-700">Progresso atual: {Math.round(progressPercent)}%</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Integração de vendas não configurada</div>
            <p className="text-xs leading-relaxed text-slate-600">
              Conecte seu sistema de vendas (PDV ou gateway de pagamento) e acompanhe automaticamente o faturamento da
              sua operação dentro do app.
            </p>
            <p className="text-xs font-medium text-slate-800">Libere indicadores de vendas automáticos dentro do app.</p>
            <p className="text-xs text-slate-600">Isso conecta vendas, inteligência e valor do produto em um só lugar.</p>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• faturamento em tempo real</li>
              <li>• evolução de metas</li>
              <li>• indicadores automáticos de desempenho</li>
              <li>• visão consolidada das vendas</li>
            </ul>
            <button
              type="button"
              onClick={handleInterest}
              className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Tenho interesse em integrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SalesGoalWidget
