import { Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import type { StoreSummary } from "../../../services/stores"

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
  topRiskStores: Array<{ id: string; name: string; metric: string }>
  topBestStores: Array<{ id: string; name: string; metric: string }>
  recentEvents: Array<{ id: string; title: string; severity: string; occurredAt?: string | null; riskBRL: number }>
  copilotHighlight: {
    message: string
    actionLabel: string
    actionHref: string
  }
  showPosIntegrationCta: boolean
}

const getStoreState = (store: StoreSummary) => {
  if (store.status === "active") return "healthy"
  if (store.status === "blocked" || store.status === "inactive") return "critical"
  return "attention"
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
  topRiskStores,
  topBestStores,
  recentEvents,
  copilotHighlight,
  showPosIntegrationCta,
}: PaidExecutiveDashboardViewProps) {
  const summary = useMemo(() => {
    const healthy = stores.filter((store) => getStoreState(store) === "healthy").length
    const critical = stores.filter((store) => getStoreState(store) === "critical").length
    const attention = stores.filter((store) => getStoreState(store) === "attention").length
    return { healthy, attention, critical, total: stores.length }
  }, [stores])
  const [period, setPeriod] = useState<"today" | "yesterday" | "7d">("today")
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

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
    const diffHours = Math.floor(diffMinutes / 60)
    return `há ${diffHours}h`
  }

  const chartScaleMax = Math.max(...revenueSeries.map((point) => point.value), 1)
  const flowScaleMax = Math.max(...flowSeries.map((point) => point.value), 1)
  const periodLabel = period === "today" ? "hoje" : period === "yesterday" ? "ontem" : "últimos 7 dias"
  const currentStoreLabel =
    selectedStoreId === "all"
      ? "Todas as lojas"
      : stores.find((store) => store.id === selectedStoreId)?.name || "Loja selecionada"
  const deltaTone = todayRevenueDeltaPct >= 0 ? "text-emerald-700" : "text-rose-700"

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Resumo financeiro e operacional</h3>
            <p className="mt-1 text-sm text-gray-600">
              {now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}{" "}
              ·{" "}
              {now.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <select
              value={selectedStoreId}
              onChange={(event) => onSelectStore(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              aria-label="Loja selecionada"
            >
              <option value="all">Todas as lojas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
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
                  Vendas consolidadas de {currentStoreLabel} ({periodLabel})
                </p>
              </div>
              <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                {summary.healthy}/{summary.total} lojas saudáveis
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
              <p className="text-xs font-medium text-blue-700">Conversão média</p>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {conversionAvgPct !== null ? `${conversionAvgPct.toFixed(1)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                {conversionAvgPct !== null ? "Meta diária" : "Sem PDV"}
              </p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">Fila média da rede</p>
              <p className="mt-2 text-2xl font-bold text-amber-900">
                {queueAvgMin !== null ? `${Math.max(1, Math.round(queueAvgMin))} min` : "—"}
              </p>
              <p className="mt-1 text-xs text-amber-700">Espera no caixa</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700">Eficiência de staff</p>
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
                Fluxo total
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
                Abrir copiloto
              </button>
            </div>
          </aside>

          <section className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <article className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                <p className="text-xs font-semibold text-rose-700">Top 3 piores</p>
                <div className="mt-2 space-y-2">
                  {topRiskStores.map((store) => (
                    <div key={store.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.metric}</p>
                      </div>
                      <Link
                        to={`/app/operations/stores/${store.id}`}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Ver
                      </Link>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="text-xs font-semibold text-emerald-700">Top 3 melhores</p>
                <div className="mt-2 space-y-2">
                  {topBestStores.map((store) => (
                    <div key={store.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.metric}</p>
                      </div>
                      <Link
                        to={`/app/operations/stores/${store.id}`}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Ver
                      </Link>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-900">Eventos recentes</h4>
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
