import { useEffect, useMemo, useRef, useState } from "react"
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
  "https://wa.me/5511996918070?text=Olá,%20tenho%20interesse%20em%20integrar%20meu%20sistema%20de%20vendas%20ao%20app."
const DEFAULT_TARGET = 100_000

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.max(0, value))

const RevenueProgressBar = ({
  state,
  currentRevenue,
  targetRevenue,
  currency = "BRL",
  onConnectSystem: _onConnectSystem,
  className = "",
}: RevenueProgressBarProps) => {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const safeCurrentRevenue = Math.max(0, currentRevenue)
  const safeTarget =
    state === "not_configured" ? DEFAULT_TARGET : Math.max(1, Number(targetRevenue || DEFAULT_TARGET))
  const progressPct = useMemo(
    () => Math.max(0, Math.min(100, (safeCurrentRevenue / safeTarget) * 100)),
    [safeCurrentRevenue, safeTarget]
  )
  const isOpen = open || pinned

  const valueLabel = `${formatCurrency(safeCurrentRevenue, currency)} / ${formatCurrency(safeTarget, currency)}`

  const handleSupport = () => {
    window.open(SUPPORT_URL, "_blank", "noopener,noreferrer")
  }

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

  return (
    <div
      ref={containerRef}
      className={`relative h-12 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="w-full text-left outline-none"
        onClick={() => setPinned((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Faturamento e integração de vendas"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600" />
          <span className="text-[11px] font-semibold text-slate-800">Faturamento</span>
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-slate-700">{valueLabel}</div>

        <div className="mt-1">
          {state === "connected" ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] transition-[width] duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : state === "syncing" ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED]" />
            </div>
          ) : (
            <div className="rounded-full p-[1px] transition-shadow duration-200 hover:shadow-[0_0_0_2px_rgba(99,102,241,0.12)]">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED]">
                <div
                  className="h-full w-full rounded-full"
                  style={{ background: "linear-gradient(white, white) padding-box" }}
                />
              </div>
            </div>
          )}
        </div>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+8px)] z-40 w-[min(92vw,360px)] origin-top-right rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        role="dialog"
        aria-hidden={!isOpen}
      >
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">Integração de vendas não configurada</div>
          <p className="text-xs leading-relaxed text-slate-600">
            Conecte seu sistema de vendas (PDV ou gateway de pagamento) e acompanhe automaticamente o faturamento da
            sua operação dentro do app.
          </p>
          <div className="text-xs text-slate-700">Com a integração ativa você passa a visualizar:</div>
          <ul className="space-y-1 text-xs text-slate-600">
            <li>• faturamento em tempo real</li>
            <li>• evolução de metas</li>
            <li>• indicadores automáticos de desempenho</li>
            <li>• visão consolidada das vendas</li>
          </ul>
          <button
            type="button"
            onClick={handleSupport}
            className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Tenho interesse em integrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default RevenueProgressBar
