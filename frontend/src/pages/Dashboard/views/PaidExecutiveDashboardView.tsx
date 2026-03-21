import { Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import type { RegisterPdvInterestPayload, StoreSummary } from "../../../services/stores"
import { useAuth } from "../../../contexts/useAuth"

interface PaidExecutiveDashboardViewProps {
  stores: StoreSummary[]
  copilotPrompts: string[]
  onOpenCopilot: (prompt?: string) => void
  selectedStoreId: string
  onSelectStore: (storeId: string) => void
  todayRevenueBRL: number
  todayRevenueDeltaPct: number | null
  revenueSeries: Array<{ label: string; value: number }>
  flowSeries: Array<{ label: string; value: number }>
  revenueAtRiskBRL: number
  conversionAvgPct: number | null
  queueAvgMin: number | null
  staffEfficiencyPct: number | null
  healthScorePct: number | null
  recentEvents: Array<{ id: string; title: string; severity: string; occurredAt?: string | null; riskBRL: number }>
  copilotHighlight: {
    message: string
    actionLabel: string
    actionHref: string
  }
  showPosIntegrationCta: boolean
  salesGoal: {
    state: "connected" | "not_configured" | "syncing"
    targetRevenue: number
    currentRevenue: number
    month?: string
    daysMode?: "calendar" | "business"
  }
  onSaveSalesGoalConfig: (
    targetRevenue: number,
    month: string,
    daysMode: "calendar" | "business"
  ) => Promise<void>
  isSavingSalesGoal: boolean
  onRegisterPdvInterest: (payload: RegisterPdvInterestPayload) => Promise<void>
  isSavingPdvInterest: boolean
  calculationRationale: string[]
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
  healthScorePct,
  recentEvents,
  copilotHighlight,
  showPosIntegrationCta,
  salesGoal,
  onSaveSalesGoalConfig,
  isSavingSalesGoal,
  onRegisterPdvInterest,
  isSavingPdvInterest,
  calculationRationale,
}: PaidExecutiveDashboardViewProps) {
  const { user } = useAuth()
  const [period, setPeriod] = useState<"today" | "yesterday" | "7d" | "month" | "custom">("today")
  const [comparison, setComparison] = useState<"yesterday" | "prev_period">("yesterday")
  const [salesGranularity, setSalesGranularity] = useState<"hour" | "day" | "month">("hour")
  const [now, setNow] = useState(() => new Date())
  const [goalMonth, setGoalMonth] = useState(() => salesGoal.month || new Date().toISOString().slice(0, 7))
  const [goalDaysMode, setGoalDaysMode] = useState<"calendar" | "business">(salesGoal.daysMode || "calendar")
  const [goalInput, setGoalInput] = useState<string>("")
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [pdvModalOpen, setPdvModalOpen] = useState(false)
  const [pdvSubmitted, setPdvSubmitted] = useState(false)
  const [pdvStoreId, setPdvStoreId] = useState<string>(selectedStoreId === STORE_ALL ? stores[0]?.id || "" : selectedStoreId)
  const [pdvSystem, setPdvSystem] = useState<string>("")
  const [pdvOther, setPdvOther] = useState<string>("")
  const [pdvEmail, setPdvEmail] = useState<string>(user?.email || "")
  const [pdvPhone, setPdvPhone] = useState<string>("")

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const monthlyGoal = Math.max(0, salesGoal.targetRevenue || 0)

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

  const flowScaleMax = Math.max(...flowSeries.map((point) => point.value), 1)
  const currentStoreLabel =
    selectedStoreId === STORE_ALL
      ? "Todas as lojas"
      : stores.find((store) => store.id === selectedStoreId)?.name || "Loja selecionada"
  const deltaTone =
    todayRevenueDeltaPct === null
      ? "text-gray-500"
      : todayRevenueDeltaPct >= 0
      ? "text-emerald-700"
      : "text-rose-700"
  const healthyStores = stores.filter((store) => getStoreState(store) === "online").length
  const storesInAttention = Math.max(0, stores.length - healthyStores)

  const daysInMonth = useMemo(() => {
    const [year, month] = goalMonth.split("-").map(Number)
    if (!year || !month) return 30
    return new Date(year, month, 0).getDate()
  }, [goalMonth])
  const businessDaysInMonth = useMemo(() => {
    const [year, month] = goalMonth.split("-").map(Number)
    if (!year || !month) return 22
    let count = 0
    const totalDays = new Date(year, month, 0).getDate()
    for (let day = 1; day <= totalDays; day += 1) {
      const weekday = new Date(year, month - 1, day).getDay()
      if (weekday !== 0 && weekday !== 6) count += 1
    }
    return count
  }, [goalMonth])
  const goalDaysBase = (salesGoal.daysMode || "calendar") === "business" ? businessDaysInMonth : daysInMonth
  const dailyGoal = monthlyGoal > 0 ? monthlyGoal / Math.max(goalDaysBase, 1) : 0
  const dailyProgressPct = dailyGoal > 0 ? Math.min(200, Math.round((todayRevenueBRL / dailyGoal) * 100)) : 0
  const criticalEvents = recentEvents.filter((event) => event.severity === "critical").length
  const warningEvents = recentEvents.filter((event) => event.severity === "warning").length
  const scopedStores =
    selectedStoreId === STORE_ALL ? stores : stores.filter((store) => store.id === selectedStoreId)
  const scopedStoreCount = Math.max(0, scopedStores.length)
  const scopedCameraCount = scopedStores.reduce(
    (acc, store) => acc + Math.max(0, Number(store.cameras_count || 0)),
    0
  )
  const currentPlan = scopedStores[0]?.plan || null
  const planCameraLimit = currentPlan === "trial" || currentPlan === "start" || currentPlan === "basic" || currentPlan === "paid" ? 3 : null
  const planStoreLimit = currentPlan ? 1 : null
  const estimatedSalesSeries = revenueSeries.map((point) => ({
    label: point.label,
    value: Math.max(0, Math.round(point.value)),
  }))
  const salesSeriesByDay = useMemo(() => {
    const nowDate = new Date()
    return estimatedSalesSeries.map((point, index) => {
      const date = new Date(nowDate)
      const offset = estimatedSalesSeries.length - index - 1
      date.setDate(nowDate.getDate() - offset)
      return {
        label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: point.value,
      }
    })
  }, [estimatedSalesSeries])
  const salesSeriesByMonth = useMemo(() => {
    const buckets = Math.max(1, Math.min(6, estimatedSalesSeries.length))
    const chunkSize = Math.max(1, Math.ceil(estimatedSalesSeries.length / buckets))
    const monthPoints: Array<{ label: string; value: number }> = []
    for (let i = 0; i < buckets; i += 1) {
      const start = i * chunkSize
      const chunk = estimatedSalesSeries.slice(start, start + chunkSize)
      if (chunk.length === 0) continue
      const value = Math.round(chunk.reduce((acc, item) => acc + item.value, 0))
      const date = new Date()
      const monthOffset = buckets - i - 1
      date.setMonth(date.getMonth() - monthOffset)
      monthPoints.push({
        label: date.toLocaleDateString("pt-BR", { month: "short" }),
        value,
      })
    }
    return monthPoints
  }, [estimatedSalesSeries])
  const salesSeries =
    salesGranularity === "hour"
      ? estimatedSalesSeries
      : salesGranularity === "day"
      ? salesSeriesByDay
      : salesSeriesByMonth
  const salesScaleMax = Math.max(...salesSeries.map((point) => point.value), 1)
  const flowChartMinWidth = Math.max(320, flowSeries.length * 36)
  const salesChartMinWidth = Math.max(320, salesSeries.length * 40)
  const shouldShowCompactTick = (index: number, total: number) => {
    if (total <= 8) return true
    if (total <= 14) return index % 2 === 0
    return index % 3 === 0
  }

  const openPdvModal = () => {
    setPdvStoreId(selectedStoreId !== STORE_ALL ? selectedStoreId : stores[0]?.id || "")
    setPdvEmail(user?.email || "")
    setPdvModalOpen(true)
  }

  const handleSaveGoal = async () => {
    const next = Number(goalInput)
    if (!Number.isFinite(next) || next <= 0) return
    await onSaveSalesGoalConfig(Math.round(next), goalMonth, goalDaysMode)
    setGoalInput("")
    setGoalModalOpen(false)
  }

  const handleSavePdvInterest = async () => {
    const fallbackStoreId =
      selectedStoreId !== STORE_ALL ? selectedStoreId : stores[0]?.id || ""
    const storeId = pdvStoreId || fallbackStoreId
    const system = pdvSystem === "other" ? pdvOther.trim() : pdvSystem
    if (!storeId || !system || !pdvEmail.trim()) return
    await onRegisterPdvInterest({
      store_id: storeId,
      pdv_system: system,
      contact_email: pdvEmail.trim(),
      contact_phone: pdvPhone.trim() || undefined,
    })
    setPdvSubmitted(true)
    setPdvModalOpen(false)
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as "today" | "yesterday" | "7d" | "month" | "custom")
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              aria-label="Período de visualização"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="month">Este mês</option>
              <option value="custom">Personalizado</option>
            </select>
            <select
              value={comparison}
              onChange={(event) =>
                setComparison(event.target.value as "yesterday" | "prev_period" | "none")
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              aria-label="Comparar com"
            >
              <option value="yesterday">Comparar: Ontem</option>
              <option value="prev_period">Comparar: Período anterior</option>
            </select>
            <select
              value={selectedStoreId}
              onChange={(event) => onSelectStore(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              aria-label="Filtro de lojas"
            >
              <option value={STORE_ALL}>Todas as lojas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
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

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={openPdvModal}
          className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receita Bruta</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(todayRevenueBRL)}</p>
          {todayRevenueDeltaPct !== null ? (
            <p className={`mt-1 text-xs font-semibold ${deltaTone}`}>
              {todayRevenueDeltaPct >= 0 ? "+" : ""}
              {todayRevenueDeltaPct.toFixed(1)}% vs {comparison === "yesterday" ? "ontem" : "período anterior"}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">Sem base consolidada para comparação no período.</p>
          )}
          {todayRevenueBRL <= 0 && showPosIntegrationCta && (
            <div className="mt-3">
              <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Integração PDV pendente
              </span>
              <div>
                <span className="mt-2 inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                  Integrar PDV para ver meus números
                </span>
              </div>
            </div>
          )}
        </button>
        <Link
          to="/app/operations"
          className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receita em Risco</p>
          <p className="mt-2 text-2xl font-bold text-rose-700">{formatCurrency(revenueAtRiskBRL)}</p>
          <p className="mt-1 text-xs text-gray-600">
            Fila média {queueAvgMin !== null ? `${Math.round(queueAvgMin)} min` : "—"} · Cobertura operacional
          </p>
        </Link>
        <article className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Conversão Média</p>
            <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              proxy
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900">
            {conversionAvgPct !== null ? `${conversionAvgPct.toFixed(1)}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-blue-700">Conecte PDV para dado oficial</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lojas e Câmeras</p>
            <div className="text-right text-[11px] leading-4">
              <p className="text-emerald-700">{healthyStores} lojas saudáveis</p>
              <p className="text-amber-700">{storesInAttention} em atenção</p>
              <p className="text-rose-700">{criticalEvents} eventos críticos</p>
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {planStoreLimit ? `${scopedStoreCount}/${planStoreLimit}` : scopedStoreCount} lojas
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-700">
            {planCameraLimit ? `${scopedCameraCount}/${planCameraLimit}` : scopedCameraCount} câmeras
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {currentPlan ? `Plano ${String(currentPlan).toUpperCase()}` : "Plano em validação"}
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">Saúde da rede</p>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  operacional
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {healthScorePct !== null ? Math.round(healthScorePct) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                {healthyStores} saudáveis · {storesInAttention} atenção · {criticalEvents} críticos
              </p>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-gray-900">Fluxo de Clientes (últimas 24h)</h4>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                  {currentStoreLabel}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl bg-gradient-to-b from-slate-50 to-white p-3">
                <div
                  className="flex h-40 items-end gap-2"
                  style={{ minWidth: `${flowChartMinWidth}px` }}
                >
                  {flowSeries.map((point, index) => (
                    <div
                      key={point.label}
                      className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <div
                        className="w-full rounded-md bg-slate-700/80"
                        style={{ height: `${Math.max(10, Math.round((point.value / flowScaleMax) * 120))}px` }}
                        title={`${point.label}: ${point.value} visitantes`}
                      />
                      <span className="text-[10px] text-gray-500">
                        {shouldShowCompactTick(index, flowSeries.length) ? point.label : "·"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    {salesGranularity === "hour"
                      ? "Vendas por Horário"
                      : salesGranularity === "day"
                      ? "Vendas por Dia"
                      : "Vendas por Mês"}
                  </h4>
                  <p className="text-xs text-gray-500">Filtro alinhado ao calendário real.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={salesGranularity}
                    onChange={(event) => setSalesGranularity(event.target.value as "hour" | "day" | "month")}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
                    aria-label="Granularidade de vendas"
                  >
                    <option value="hour">Hora</option>
                    <option value="day">Dia</option>
                    <option value="month">Mês</option>
                  </select>
                  {showPosIntegrationCta && (
                    <button
                      type="button"
                      onClick={openPdvModal}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      Integração PDV pendente · Integrar agora
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl bg-gradient-to-b from-blue-50 to-white p-3">
                <div
                  className="flex h-40 items-end gap-2"
                  style={{ minWidth: `${salesChartMinWidth}px` }}
                >
                  {salesSeries.map((point, index) => (
                    <div
                      key={`${salesGranularity}-${point.label}-${index}`}
                      className="flex min-w-7 flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <div
                        className="w-full rounded-md bg-blue-500/80"
                        style={{ height: `${Math.max(10, Math.round((point.value / salesScaleMax) * 120))}px` }}
                        title={`${point.label}: ${formatCurrency(point.value)}`}
                      />
                      <span className="text-[10px] text-gray-500">
                        {shouldShowCompactTick(index, salesSeries.length) ? point.label : "·"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta Realizada</p>
                  <button
                    type="button"
                    onClick={() => {
                      setGoalInput(monthlyGoal > 0 ? String(Math.round(monthlyGoal)) : "")
                      setGoalMonth(salesGoal.month || new Date().toISOString().slice(0, 7))
                      setGoalDaysMode(salesGoal.daysMode || "calendar")
                      setGoalModalOpen(true)
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Configurar meta
                  </button>
                </div>
                <p className="mt-2 text-lg font-bold text-gray-900">{dailyGoal > 0 ? `${dailyProgressPct}%` : "—"}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {monthlyGoal > 0 ? `${formatCurrency(dailyGoal)} meta diária` : "Meta mensal não configurada"}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Hoje: {formatCurrency(todayRevenueBRL)}
                  {dailyGoal > 0 ? ` · ${dailyProgressPct}% da meta` : ""}
                </p>
                {monthlyGoal > 0 && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full ${dailyProgressPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(100, dailyProgressPct)}%` }}
                    />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Estimativa baseada em fluxo e conversão proxy. Conecte o PDV para valores oficiais.
              </p>
            </article>
          </div>
        </div>

        <div className="space-y-5">
          <aside className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                Y
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Copiloto Financeiro</p>
            </div>
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

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-900">Alertas e eventos recentes</h4>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">Críticos: {criticalEvents}</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">Alertas: {warningEvents}</span>
            </div>
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

          {calculationRationale.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <h4 className="text-sm font-semibold text-slate-900">Racional dos cálculos</h4>
              <ul className="mt-2 space-y-1">
                {calculationRationale.map((item) => (
                  <li key={item} className="text-xs text-slate-700">
                    • {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pdvSubmitted && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
              <p className="text-xs font-semibold text-emerald-700">
                Interesse de integração PDV registrado. Nosso time entrará em contato.
              </p>
            </section>
          )}
        </div>
      </section>

      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Configurar Meta Mensal</h3>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Mês</label>
                <input
                  type="month"
                  value={goalMonth}
                  onChange={(event) => setGoalMonth(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Meta mensal (R$)</label>
                <input
                  type="number"
                  min={0}
                  value={goalInput}
                  onChange={(event) => setGoalInput(event.target.value)}
                  placeholder="Ex.: 50000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Base de cálculo diária</label>
                <select
                  value={goalDaysMode}
                  onChange={(event) => setGoalDaysMode(event.target.value as "calendar" | "business")}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="calendar">Todos os dias do mês</option>
                  <option value="business">Apenas dias úteis</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveGoal()}
                disabled={isSavingSalesGoal}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingSalesGoal ? "Salvando..." : "Salvar meta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Interesse de Integração PDV</h3>
              <button
                type="button"
                onClick={() => setPdvModalOpen(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Loja</label>
                <select
                  value={pdvStoreId || (selectedStoreId !== STORE_ALL ? selectedStoreId : stores[0]?.id || "")}
                  onChange={(event) => setPdvStoreId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Sistema PDV</label>
                <select
                  value={pdvSystem}
                  onChange={(event) => setPdvSystem(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecione</option>
                  <option value="linx">Linx</option>
                  <option value="bling">Bling</option>
                  <option value="tiny">Tiny</option>
                  <option value="totvs">TOTVS</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              {pdvSystem === "other" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700">Qual sistema?</label>
                  <input
                    type="text"
                    value={pdvOther}
                    onChange={(event) => setPdvOther(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-700">E-mail de contato</label>
                <input
                  type="email"
                  value={pdvEmail}
                  onChange={(event) => setPdvEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={pdvPhone}
                  onChange={(event) => setPdvPhone(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPdvModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSavePdvInterest()}
                disabled={isSavingPdvInterest}
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPdvInterest ? "Registrando..." : "Registrar interesse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
