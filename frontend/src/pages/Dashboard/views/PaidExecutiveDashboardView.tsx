import { Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import type { StoreSummary } from "../../../services/stores"
import { useAuth } from "../../../contexts/useAuth"

interface PaidExecutiveDashboardViewProps {
  stores: StoreSummary[]
  copilotPrompts: string[]
  onOpenCopilot: (prompt?: string) => void
  selectedStoreId: string
  onSelectStore: (storeId: string) => void
  todayRevenueBRL: number
  todayRevenueDeltaPct: number
  revenueSeries: Array<{ label: string; value: number }>
  flowSeries: Array<{ label: string; value: number }>
  revenueAtRiskBRL: number
  conversionAvgPct: number | null
  queueAvgMin: number | null
  staffEfficiencyPct: number | null
  recentEvents: Array<{ id: string; title: string; severity: string; occurredAt?: string | null; riskBRL: number }>
  copilotHighlight: {
    message: string
    actionLabel: string
    actionHref: string
  }
  showPosIntegrationCta: boolean
}

const STORE_ALL = "all"

const getStoreState = (store: StoreSummary) => {
  if (store.status === "active" || store.status === "trial") return "online"
  if (store.status === "blocked" || store.status === "inactive") return "offline"
  return "attention"
}

const statusDotClass: Record<"online" | "offline" | "attention", string> = {
  online: "bg-emerald-500",
  offline: "bg-rose-500",
  attention: "bg-amber-500",
}

const getGreetingByHour = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

export function PaidExecutiveDashboardView({
  stores,
  copilotPrompts,
  onOpenCopilot,
  selectedStoreId,
  onSelectStore,
  todayRevenueBRL,
  todayRevenueDeltaPct,
  revenueSeries,
  flowSeries,
  revenueAtRiskBRL,
  conversionAvgPct,
  queueAvgMin,
  staffEfficiencyPct,
  recentEvents,
  copilotHighlight,
  showPosIntegrationCta,
}: PaidExecutiveDashboardViewProps) {
  const { user } = useAuth()
  const [period, setPeriod] = useState<"today" | "yesterday" | "7d">("today")
  const [now, setNow] = useState(() => new Date())
  const [goalMonth, setGoalMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [goalInput, setGoalInput] = useState<string>("")

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const goalStorageKey = useMemo(
    () => `dv_month_goal_${selectedStoreId || STORE_ALL}_${goalMonth}`,
    [goalMonth, selectedStoreId]
  )

  const savedGoal = (() => {
    if (typeof window === "undefined") return 0
    const raw = localStorage.getItem(goalStorageKey)
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  })()

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const formatTimeAgo = (iso?: string | null) => {
    if (!iso) return "agora"
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "agora"
    const diffMinutes = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60000))
    if (diffMinutes < 60) return `há ${diffMinutes} min`
    return `há ${Math.floor(diffMinutes / 60)}h`
  }

  const chartScaleMax = Math.max(...revenueSeries.map((point) => point.value), 1)
  const flowScaleMax = Math.max(...flowSeries.map((point) => point.value), 1)
  const periodLabel = period === "today" ? "hoje" : period === "yesterday" ? "ontem" : "últimos 7 dias"
  const currentStoreLabel =
    selectedStoreId === STORE_ALL
      ? "Todas as lojas"
      : stores.find((store) => store.id === selectedStoreId)?.name || "Loja selecionada"
  const deltaTone = todayRevenueDeltaPct >= 0 ? "text-emerald-700" : "text-rose-700"
  const healthyStores = stores.filter((store) => getStoreState(store) === "online").length

  const daysInMonth = useMemo(() => {
    const [year, month] = goalMonth.split("-").map(Number)
    if (!year || !month) return 30
    return new Date(year, month, 0).getDate()
  }, [goalMonth])
  const dailyGoal = savedGoal > 0 ? savedGoal / Math.max(daysInMonth, 1) : 0
  const dailyProgressPct = dailyGoal > 0 ? Math.min(200, Math.round((todayRevenueBRL / dailyGoal) * 100)) : 0

  const handleSaveGoal = () => {
    const next = Number(goalInput)
    if (!Number.isFinite(next) || next <= 0) return
    localStorage.setItem(goalStorageKey, String(Math.round(next)))
    setGoalInput("")
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              Y
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{getGreetingByHour()}, {user?.first_name || user?.username || "Gestor"}!</p>
              <p className="text-sm text-gray-600">Bem-vindo de volta ao seu painel executivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Assistente Yara</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as "today" | "yesterday" | "7d")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              aria-label="Período de visualização"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7d">Últimos 7 dias</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectStore(STORE_ALL)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              selectedStoreId === STORE_ALL
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Todas as lojas
          </button>
          {stores.map((store) => {
            const state = getStoreState(store)
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => onSelectStore(store.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  selectedStoreId === store.id
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${statusDotClass[state]}`} />
                {store.name}
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
        <div className="space-y-5">
          <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Receita Bruta Hoje</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(todayRevenueBRL)}</p>
                <p className={`mt-1 text-sm font-semibold ${deltaTone}`}>
                  {todayRevenueDeltaPct >= 0 ? "+" : ""}
                  {todayRevenueDeltaPct.toFixed(1)}% vs mesmo período de ontem
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Vendas consolidadas de {currentStoreLabel} ({periodLabel}) ·{" "}
                  {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}{" "}
                  {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                {healthyStores}/{stores.length || 1} lojas saudáveis
              </div>
            </div>
            <div className="mt-4 flex h-28 items-end gap-1.5 rounded-xl bg-gradient-to-b from-blue-50 to-white p-3">
              {revenueSeries.map((point) => (
                <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-md bg-blue-500/80"
                    style={{
                      height: `${Math.max(8, Math.round((point.value / chartScaleMax) * 80))}px`,
                    }}
                    title={`${point.label}: ${formatCurrency(point.value)}`}
                  />
                  <span className="text-[10px] text-gray-500">{point.label}</span>
                </div>
              ))}
            </div>
          </article>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-medium text-rose-700">Receita em risco</p>
              <p className="mt-2 text-2xl font-bold text-rose-900">{formatCurrency(revenueAtRiskBRL)}</p>
              <p className="mt-1 text-xs text-rose-700">Fila e cobertura</p>
            </article>
            <article className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-blue-700">Conversão média</p>
                <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  proxy
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {conversionAvgPct !== null ? `${conversionAvgPct.toFixed(1)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-blue-700">Conecte PDV para dado oficial</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-amber-700">Fila média</p>
                <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  official
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-900">
                {queueAvgMin !== null ? `${Math.max(1, Math.round(queueAvgMin))} min` : "—"}
              </p>
              <p className="mt-1 text-xs text-amber-700">Espera no caixa</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-emerald-700">Eficiência staff</p>
                <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  estimated
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-900">
                {staffEfficiencyPct !== null ? `${Math.round(staffEfficiencyPct)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-emerald-700">Produtividade</p>
            </article>
          </div>

          <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-semibold text-gray-900">Fluxo de Clientes (últimas 24h)</h4>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                {currentStoreLabel}
              </span>
            </div>
            <div className="mt-4 flex h-40 items-end gap-2 rounded-xl bg-gradient-to-b from-slate-50 to-white p-3">
              {flowSeries.map((point) => (
                <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <div
                    className="w-full rounded-md bg-slate-700/80"
                    style={{ height: `${Math.max(10, Math.round((point.value / flowScaleMax) * 120))}px` }}
                    title={`${point.label}: ${point.value} visitantes`}
                  />
                  <span className="text-[10px] text-gray-500">{point.label}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <aside className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Copiloto Financeiro</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{copilotHighlight.message}</p>
            <div className="mt-3 flex gap-2">
              <Link
                to={copilotHighlight.actionHref}
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {copilotHighlight.actionLabel}
              </Link>
              <button
                type="button"
                onClick={() => onOpenCopilot(copilotPrompts[0] || "Resumo executivo da operação hoje")}
                className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Delegar via WhatsApp
              </button>
            </div>
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-900">Alertas e eventos recentes</h4>
            <div className="mt-3 space-y-2">
              {recentEvents.map((event) => (
                <article key={event.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {event.severity === "critical" ? "🔴" : event.severity === "warning" ? "🟡" : "🔵"} {event.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {formatTimeAgo(event.occurredAt)} · {event.riskBRL > 0 ? `${formatCurrency(event.riskBRL)} em risco` : "Impacto em monitoramento"}
                  </p>
                </article>
              ))}
              {recentEvents.length === 0 && (
                <p className="text-sm text-gray-500">Sem alertas recentes.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-900">Meta do Mês</h4>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <input
                type="month"
                value={goalMonth}
                onChange={(event) => setGoalMonth(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={goalInput}
                  onChange={(event) => setGoalInput(event.target.value)}
                  placeholder="Meta mensal (R$)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Salvar
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Meta diária</p>
              <p className="text-lg font-semibold text-slate-900">{dailyGoal > 0 ? formatCurrency(dailyGoal) : "—"}</p>
              <p className="mt-1 text-xs text-slate-600">
                Hoje: {formatCurrency(todayRevenueBRL)} {dailyGoal > 0 ? `(${dailyProgressPct}% da meta)` : ""}
              </p>
            </div>
          </section>

          {showPosIntegrationCta && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
              <h4 className="text-sm font-semibold text-amber-900">Integração PDV pendente</h4>
              <p className="mt-1 text-sm text-amber-800">
                Conecte seu PDV e veja a conversão real. Estimativa de ganho: {formatCurrency(Math.max(500, Math.round(revenueAtRiskBRL * 0.25)))}/dia.
              </p>
              <Link
                to="/app/settings"
                className="mt-3 inline-flex items-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Integrar agora
              </Link>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}
