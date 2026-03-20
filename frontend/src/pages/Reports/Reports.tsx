import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  meService,
  type ProductivityCoverage,
  type ReportImpact,
  type ReportSummary,
} from "../../services/me"
import { alertsService } from "../../services/alerts"
import { copilotService } from "../../services/copilot"
import {
  storesService,
  type NetworkDashboard,
  type NetworkEdgeUpdateRolloutSummaryResponse,
  type NetworkEdgeUpdateValidationSummaryResponse,
  type NetworkVisionIngestionSummary,
  type Store,
  type StoreVisionIngestionSummary,
} from "../../services/stores"

type OperationalWindow = {
  startHour: number
  endHour: number
  source: "opening_hours" | "fallback_flow"
}
type RolloutChannelFilter = "all" | "stable" | "canary"

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  if (value < 60) return `${value}s`
  return `${Math.round(value / 60)}m`
}

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return `${Math.round(value * 1000) / 10}%`
}

const formatCurrencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

const parseOpeningHours = (value?: string | null): { startHour: number; endHour: number } | null => {
  if (!value) return null
  const match = value.match(/(\d{1,2})[:h]?(\d{2})?\s*[-–a]\s*(\d{1,2})[:h]?(\d{2})?/i)
  if (!match) return null
  const startHour = Number(match[1])
  const endHour = Number(match[3])
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) return null
  return { startHour, endHour }
}

const mergeWindows = (windows: Array<{ startHour: number; endHour: number }>) => {
  if (!windows.length) return null
  const normalized = windows.map((item) => ({
    startHour: item.startHour,
    endHour: item.endHour === 0 ? 24 : item.endHour,
  }))
  const startHour = Math.min(...normalized.map((item) => item.startHour))
  const endHour = Math.max(...normalized.map((item) => item.endHour))
  return { startHour, endHour: endHour > 23 ? 0 : endHour }
}

const hourInWindow = (hour: number, window: { startHour: number; endHour: number }) => {
  if (window.startHour === window.endHour) return true
  if (window.startHour < window.endHour) return hour >= window.startHour && hour < window.endHour
  return hour >= window.startHour || hour < window.endHour
}

const fallbackOperationalWindow = (
  bars: Array<{ hour: number; footfall: number }>
): OperationalWindow => {
  const activeHours = bars
    .filter((entry) => entry.footfall > 0)
    .map((entry) => entry.hour)
    .sort((a, b) => a - b)
  if (!activeHours.length) return { startHour: 8, endHour: 22, source: "fallback_flow" }
  const first = Math.max(0, activeHours[0] - 1)
  const last = Math.min(23, activeHours[activeHours.length - 1] + 1)
  return { startHour: first, endHour: last === 23 ? 0 : last, source: "fallback_flow" }
}

const formatWindowLabel = (window: { startHour: number; endHour: number }) =>
  `${String(window.startHour).padStart(2, "0")}:00 às ${String(window.endHour).padStart(2, "0")}:00`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

const targetStatusClass = (status?: "go" | "no_go" | "no_data") => {
  if (status === "go") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "no_go") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-600"
}

const targetStatusLabel = (status?: "go" | "no_go" | "no_data") => {
  if (status === "go") return "GO"
  if (status === "no_go") return "NO-GO"
  return "SEM DADO"
}

const outcomeStatusLabel: Record<"resolved" | "partial" | "not_resolved", string> = {
  resolved: "Resolveu",
  partial: "Parcial",
  not_resolved: "Não resolveu",
}

const TrustBadge = ({ status }: { status?: string | null }) => {
  const normalized = String(status || "estimated").toLowerCase()
  const map: Record<string, { label: string; className: string }> = {
    official: { label: "Oficial", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    proxy: { label: "Proxy", className: "border-amber-200 bg-amber-50 text-amber-700" },
    estimated: { label: "Estimado", className: "border-slate-200 bg-slate-100 text-slate-600" },
    manual: { label: "Manual", className: "border-sky-200 bg-sky-50 text-sky-700" },
    derived: { label: "Derivado", className: "border-violet-200 bg-violet-50 text-violet-700" },
  }
  const item = map[normalized] || map.estimated
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.className}`}>
      {item.label}
    </span>
  )
}

const Reports = () => {
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [period, setPeriod] = useState<string>("30d")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)
  const [delegatingStoreId, setDelegatingStoreId] = useState<string | null>(null)
  const [rolloutActionStoreId, setRolloutActionStoreId] = useState<string | null>(null)
  const [approvingIntervention, setApprovingIntervention] = useState(false)
  const [completingOutcomeId, setCompletingOutcomeId] = useState<string | null>(null)
  const [failingOutcomeId, setFailingOutcomeId] = useState<string | null>(null)
  const [outcomeStatusFilter, setOutcomeStatusFilter] = useState<"all" | "dispatched" | "completed" | "failed">("all")
  const [rolloutChannelFilter, setRolloutChannelFilter] = useState<RolloutChannelFilter>("all")

  const rangeParams = useMemo(() => {
    if (period === "custom") {
      return { store_id: selectedStore || null, from: from || null, to: to || null }
    }
    return { store_id: selectedStore || null, period }
  }, [selectedStore, period, from, to])

  const storesQ = useQuery<Store[]>({
    queryKey: ["stores-full-report"],
    queryFn: storesService.getStores,
    staleTime: 60000,
    retry: false,
  })
  const summaryQ = useQuery<ReportSummary>({
    queryKey: ["reports-summary", rangeParams],
    queryFn: () => meService.getReportSummary(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: 1,
  })
  const impactQ = useQuery<ReportImpact>({
    queryKey: ["reports-impact", rangeParams],
    queryFn: () => meService.getReportImpact(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: 1,
  })
  const coverageQ = useQuery<ProductivityCoverage>({
    queryKey: ["reports-coverage", rangeParams],
    queryFn: () => meService.getProductivityCoverage(selectedStore || null, rangeParams),
    staleTime: 60000,
    retry: false,
  })
  const networkQ = useQuery<NetworkDashboard>({
    queryKey: ["reports-network-dashboard"],
    queryFn: storesService.getNetworkDashboard,
    staleTime: 60000,
    retry: false,
    enabled: !selectedStore,
  })
  const ingestionQ = useQuery<NetworkVisionIngestionSummary | StoreVisionIngestionSummary>({
    queryKey: ["reports-ingestion-summary", selectedStore || "all"],
    queryFn: () =>
      selectedStore
        ? storesService.getStoreVisionIngestionSummary(selectedStore, {
            event_source: "all",
            window_hours: 24,
          })
        : storesService.getNetworkVisionIngestionSummary({
            event_source: "all",
            window_hours: 24,
          }),
    staleTime: 60000,
    retry: false,
  })
  const rolloutSummaryQ = useQuery<NetworkEdgeUpdateRolloutSummaryResponse>({
    queryKey: ["reports-edge-rollout-summary", rolloutChannelFilter],
    queryFn: () =>
      storesService.getNetworkEdgeUpdateRolloutSummary(
        rolloutChannelFilter === "all" ? undefined : rolloutChannelFilter
      ),
    staleTime: 60000,
    retry: false,
    enabled: !selectedStore,
  })
  const validationSummaryQ = useQuery<NetworkEdgeUpdateValidationSummaryResponse>({
    queryKey: ["reports-edge-validation-summary", rolloutChannelFilter],
    queryFn: () =>
      storesService.getNetworkEdgeUpdateValidationSummary({
        channel: rolloutChannelFilter === "all" ? undefined : rolloutChannelFilter,
        hours: 72,
      }),
    staleTime: 60000,
    retry: false,
    enabled: !selectedStore,
  })
  const ledgerQ = useQuery({
    queryKey: ["reports-value-ledger", selectedStore, period],
    queryFn: () =>
      selectedStore
        ? copilotService.getValueLedgerDaily(selectedStore, { days: period === "7d" ? 7 : period === "90d" ? 90 : 30 })
        : copilotService.getNetworkValueLedgerDaily({ days: period === "7d" ? 7 : period === "90d" ? 90 : 30 }),
    enabled: true,
    staleTime: 60000,
    retry: false,
  })
  const outcomesQ = useQuery({
    queryKey: ["reports-action-outcomes", selectedStore, period, outcomeStatusFilter],
    queryFn: () =>
      selectedStore
        ? copilotService.listActionOutcomes(selectedStore, {
            limit: 12,
            status: outcomeStatusFilter === "all" ? undefined : outcomeStatusFilter,
          })
        : copilotService.listNetworkActionOutcomes({
            limit: 12,
            status: outcomeStatusFilter === "all" ? undefined : outcomeStatusFilter,
          }),
    enabled: true,
    staleTime: 60000,
    retry: false,
  })

  const stores = useMemo(() => storesQ.data ?? [], [storesQ.data])
  const summaryData = summaryQ.data
  const incidentResponse = summaryData?.incident_response
  const actionExecution = summaryData?.action_execution
  const impactData = impactQ.data
  const coverageData = coverageQ.data
  const selectedStoreMeta = stores.find((store) => store.id === selectedStore) ?? null
  const storeNameById = useMemo(
    () =>
      stores.reduce<Record<string, string>>((acc, row) => {
        acc[row.id] = row.name
        return acc
      }, {}),
    [stores]
  )
  const ingestionOperational = ingestionQ.data?.operational_summary
  const rolloutSummary = rolloutSummaryQ.data
  const validationSummary = validationSummaryQ.data
  const ingestionPipelineStatus = ingestionOperational?.pipeline_status || "no_signal"
  const ingestionPipelineLabel =
    ingestionPipelineStatus === "healthy"
      ? "Pipeline saudável"
      : ingestionPipelineStatus === "stale"
      ? "Pipeline desatualizado"
      : "Sem sinal operacional"
  const ingestionPipelineClass =
    ingestionPipelineStatus === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : ingestionPipelineStatus === "stale"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-700"
  const ledgerTotals = ledgerQ.data?.totals
  const networkLedgerBreakdown = ledgerQ.data?.breakdown_by_store ?? []
  const sprint2Acceptance = !selectedStore ? ledgerQ.data?.sprint2_acceptance : undefined
  const outcomesSummary = outcomesQ.data?.summary
  const actionOutcomes = outcomesQ.data?.items ?? []

  const openingWindow = useMemo(() => {
    if (!selectedStoreMeta) return null
    const windows = [
      parseOpeningHours(selectedStoreMeta.hours_weekdays),
      parseOpeningHours(selectedStoreMeta.hours_saturday),
      parseOpeningHours(selectedStoreMeta.hours_sunday_holiday),
    ].filter((value): value is { startHour: number; endHour: number } => Boolean(value))
    const merged = mergeWindows(windows)
    if (!merged) return null
    return { ...merged, source: "opening_hours" as const }
  }, [selectedStoreMeta])

  const hourBars = useMemo(() => {
    if (!summaryData) return []
    const baseBars = summaryData.chart_footfall_by_hour.map((entry) => ({
      ...entry,
      label: `${String(entry.hour).padStart(2, "0")}:00`,
    }))
    const operationalWindow = openingWindow || fallbackOperationalWindow(baseBars)
    return baseBars.filter((entry) => hourInWindow(entry.hour, operationalWindow))
  }, [summaryData, openingWindow])

  const operationalWindow = useMemo(() => {
    if (openingWindow) return openingWindow
    return fallbackOperationalWindow(summaryData?.chart_footfall_by_hour ?? [])
  }, [summaryData?.chart_footfall_by_hour, openingWindow])

  const revenueAtRiskToday = useMemo(() => {
    if (!impactData?.impact) return 0
    const periodCost = (impactData.impact.cost_idle || 0) + (impactData.impact.cost_queue || 0)
    const fromDate = impactData.from ? new Date(impactData.from) : null
    const toDate = impactData.to ? new Date(impactData.to) : null
    const days =
      fromDate && toDate && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())
        ? Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 30
    return periodCost > 0 ? periodCost / days : (impactData.impact.potential_monthly_estimated || 0) / 30
  }, [impactData])

  const consolidatedScore = useMemo(() => {
    const queueSeconds = summaryData?.kpis?.avg_queue_seconds || 0
    const conversionRateBase =
      summaryData?.pos_integration?.conversion_rate_official ??
      summaryData?.kpis?.avg_conversion_rate ??
      0
    const conversionRate = conversionRateBase * 100
    const confidence = coverageData?.confidence_governance?.score || 0
    let score = 82
    score -= Math.min(24, queueSeconds / 9)
    score += Math.min(10, Math.max(-10, (conversionRate - 14) * 1.8))
    score += (confidence - 60) / 6
    return Math.round(clamp(score, 0, 100))
  }, [
    coverageData?.confidence_governance?.score,
    summaryData?.kpis?.avg_conversion_rate,
    summaryData?.kpis?.avg_queue_seconds,
    summaryData?.pos_integration?.conversion_rate_official,
  ])

  const officialConversionRate = summaryData?.pos_integration?.conversion_rate_official
  const conversionRateDisplay = officialConversionRate ?? summaryData?.kpis?.avg_conversion_rate
  const conversionIsOfficial = officialConversionRate !== null && officialConversionRate !== undefined

  const scoreTrendPoints = useMemo(() => {
    const series = summaryData?.chart_footfall_by_day ?? []
    if (!series.length) return "0,22 30,18 60,17 90,16 120,15"
    const maxValue = Math.max(...series.map((item) => item.footfall), 1)
    return series
      .slice(-7)
      .map((item, idx, arr) => {
        const x = arr.length === 1 ? 0 : Math.round((idx / (arr.length - 1)) * 120)
        const y = Math.round(22 - (item.footfall / maxValue) * 16)
        return `${x},${y}`
      })
      .join(" ")
  }, [summaryData?.chart_footfall_by_day])

  const copilotSummary = useMemo(() => {
    const risk = coverageData?.summary?.worst_window
    if (risk?.hour_label) {
      return `Rede estável, mas a janela ${risk.hour_label} concentra lacuna de cobertura. Recomendo realocar equipe para reduzir abandono de fila.`
    }
    return "Rede sob controle. Recomendo validar apenas as lojas com pior conversão relativa nesta janela."
  }, [coverageData?.summary?.worst_window])

  const triggerCopilotAction = async () => {
    const targetStoreId = selectedStore || interventionCards[0]?.id || ""
    const targetStoreName =
      stores.find((store) => store.id === targetStoreId)?.name ||
      interventionCards[0]?.name ||
      "rede"
    const insightId = `reports-priority-${targetStoreId || "network"}-${Date.now()}`

    if (targetStoreId) {
      setApprovingIntervention(true)
      let dispatchedEventId: string | undefined
      try {
        const dispatchResponse = await alertsService.dispatchAction({
          store_id: targetStoreId,
          insight_id: insightId,
          action_type: "priority_intervention_approval",
          channel: "copilot",
          source: "reports_decision_center",
          expected_impact_brl: Math.max(0, Math.round(revenueAtRiskToday)),
          confidence_score: coverageData?.confidence_governance?.score ?? undefined,
          context: {
            origin: "reports_decision_center",
            period,
            selected_store: selectedStore || null,
            window_label: formatWindowLabel(operationalWindow),
          },
        })
        dispatchedEventId = dispatchResponse.event_id
        try {
          await copilotService.createActionOutcome(targetStoreId, {
            action_event_id: dispatchedEventId ?? null,
            insight_id: insightId,
            action_type: "priority_intervention_approval",
            channel: "copilot",
            source: "reports_decision_center",
            status: "dispatched",
            impact_expected_brl: Math.max(0, Math.round(revenueAtRiskToday)),
            confidence_score: coverageData?.confidence_governance?.score ?? undefined,
            baseline: {
              period,
              selected_store: selectedStore || null,
              window_label: formatWindowLabel(operationalWindow),
            },
          })
        } catch {
          // Non-blocking: dispatch is already registered.
        }
      } catch (error) {
        const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
        const message =
          (typeof payload?.message === "string" && payload.message) ||
          (typeof payload?.detail === "string" && payload.detail) ||
          "Não foi possível aprovar a intervenção agora."
        try {
          await copilotService.createActionOutcome(targetStoreId, {
            action_event_id: dispatchedEventId ?? null,
            insight_id: insightId,
            action_type: "priority_intervention_approval",
            channel: "copilot",
            source: "reports_decision_center",
            status: "failed",
            impact_expected_brl: Math.max(0, Math.round(revenueAtRiskToday)),
            confidence_score: coverageData?.confidence_governance?.score ?? undefined,
            outcome: {
              failed_from: "reports_decision_center",
              error_message: message,
              period,
            },
          })
        } catch {
          // Non-blocking: dispatch failure already visible in UI.
        }
        toast.error(message)
        setApprovingIntervention(false)
        return
      } finally {
        setApprovingIntervention(false)
      }
    }

    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", {
        detail: {
          prompt: `Aprovar intervenção imediata para ${
            targetStoreName
          }. Priorizar fila e cobertura operacional na janela ${formatWindowLabel(
            operationalWindow
          )}. Impacto esperado: ${formatCurrencyBRL(revenueAtRiskToday)} hoje.`,
        },
      })
    )
    toast.success("Intervenção aprovada e enviada para o Copiloto.")
  }

  const ranking = useMemo(() => {
    const items = (networkQ.data?.stores ?? []).filter((store) => typeof store.conversion === "number")
    const sorted = [...items].sort((a, b) => (b.conversion || 0) - (a.conversion || 0))
    return { top: sorted.slice(0, 3), bottom: sorted.slice(-3).reverse() }
  }, [networkQ.data?.stores])

  const interventionCards = useMemo(() => {
    const storesList = networkQ.data?.stores ?? []
    if (!storesList.length) return []
    const totalAlerts = storesList.reduce((acc, store) => acc + (store.alerts || 0), 0)
    const baseline = Math.max(1, totalAlerts)
    const sortedByAttention = [...storesList].sort((a, b) => {
      const scoreA = (a.alerts || 0) * 2 + Math.max(0, 12 - (a.conversion || 0))
      const scoreB = (b.alerts || 0) * 2 + Math.max(0, 12 - (b.conversion || 0))
      return scoreB - scoreA
    })
    return sortedByAttention.slice(0, 4).map((store) => {
      const share = (store.alerts || 0) / baseline
      const riskValue = revenueAtRiskToday * (share > 0 ? share : 0.15)
      return {
        id: store.id,
        name: store.name,
        problem:
          (store.alerts || 0) > 0
            ? `Pico de fila e alertas operacionais (${store.alerts})`
            : "Conversão abaixo da média da rede",
        riskValue,
      }
    })
  }, [networkQ.data?.stores, revenueAtRiskToday])

  const handleDelegateStoreIntervention = async (item: {
    id: string
    name: string
    problem: string
    riskValue: number
  }) => {
    setDelegatingStoreId(item.id)
    const insightId = `reports-${item.id}-${Date.now()}`
    try {
      const dispatchResponse = await alertsService.dispatchAction({
        store_id: item.id,
        insight_id: insightId,
        action_type: "whatsapp_delegation",
        channel: "whatsapp",
        source: "reports_executive",
        expected_impact_brl: Math.max(0, Math.round(item.riskValue)),
        context: {
          problem: item.problem,
          origin: "reports_where_to_act_now",
        },
      })
      try {
        await copilotService.createActionOutcome(item.id, {
          action_event_id: dispatchResponse.event_id ?? null,
          insight_id: insightId,
          action_type: "whatsapp_delegation",
          channel: "whatsapp",
          source: "reports_executive",
          status: "dispatched",
          impact_expected_brl: Math.max(0, Math.round(item.riskValue)),
          confidence_score: coverageData?.confidence_governance?.score ?? undefined,
          baseline: {
            problem: item.problem,
            origin: "reports_where_to_act_now",
            period,
          },
        })
      } catch {
        // Non-blocking: dispatch is already registered.
      }
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Não foi possível registrar a delegação agora."
      try {
        await copilotService.createActionOutcome(item.id, {
          insight_id: insightId,
          action_type: "whatsapp_delegation",
          channel: "whatsapp",
          source: "reports_executive",
          status: "failed",
          impact_expected_brl: Math.max(0, Math.round(item.riskValue)),
          confidence_score: coverageData?.confidence_governance?.score ?? undefined,
          outcome: {
            failed_from: "reports_where_to_act_now",
            error_message: message,
            period,
          },
        })
      } catch {
        // Non-blocking: failure already visible in UI.
      }
      toast.error(message)
      setDelegatingStoreId(null)
      return
    }
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", {
        detail: {
          prompt: `Delegar intervenção operacional para a loja ${item.name}. Problema: ${item.problem}. Impacto estimado: ${formatCurrencyBRL(
            item.riskValue
          )} em risco hoje. Gere mensagem objetiva para gerente com ação imediata e checklist de execução.`,
        },
      })
    )
    toast.success(`Delegação preparada no Copiloto para ${item.name}.`)
    setDelegatingStoreId(null)
  }

  const handleCompleteOutcome = async (storeId: string, outcomeId: string, expectedValue: number) => {
    if (!storeId) return
    setCompletingOutcomeId(outcomeId)
    try {
      await copilotService.updateActionOutcome(storeId, outcomeId, {
        status: "completed",
        outcome_status: "resolved",
        impact_realized_brl: Math.max(0, expectedValue),
        outcome: { completed_by: "reports_ui", completed_from: "executive_outcomes" },
      })
      await Promise.all([ledgerQ.refetch(), outcomesQ.refetch()])
      toast.success("Ação marcada como concluída.")
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Não foi possível concluir a ação."
      toast.error(message)
    } finally {
      setCompletingOutcomeId(null)
    }
  }

  const handleFailOutcome = async (storeId: string, outcomeId: string) => {
    if (!storeId) return
    setFailingOutcomeId(outcomeId)
    try {
      await copilotService.updateActionOutcome(storeId, outcomeId, {
        status: "failed",
        outcome_status: "not_resolved",
        outcome: { failed_by: "reports_ui", failed_from: "executive_outcomes" },
      })
      await Promise.all([ledgerQ.refetch(), outcomesQ.refetch()])
      toast.success("Ação marcada como falha.")
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Não foi possível marcar a ação como falha."
      toast.error(message)
    } finally {
      setFailingOutcomeId(null)
    }
  }

  const handleRolloutCopilotAction = async (item: {
    store_id: string
    store_name?: string | null
    health: "degraded" | "in_progress"
    channel: "stable" | "canary"
    target_version?: string | null
    last_event?: string | null
    last_status?: string | null
    reason_code?: string | null
  }) => {
    const storeId = item.store_id
    const storeName = item.store_name || "loja"
    const insightId = `reports-rollout-${storeId}-${Date.now()}`
    const expectedImpact = Math.max(0, Math.round(revenueAtRiskToday * 0.2))
    setRolloutActionStoreId(storeId)
    try {
      const dispatchResponse = await alertsService.dispatchAction({
        store_id: storeId,
        insight_id: insightId,
        action_type: "edge_rollout_intervention",
        channel: "copilot",
        source: "reports_rollout",
        expected_impact_brl: expectedImpact || undefined,
        confidence_score: item.health === "degraded" ? 85 : 75,
        context: {
          origin: "reports_rollout",
          rollout_health: item.health,
          reason_code: item.reason_code || null,
          last_event: item.last_event || null,
          target_version: item.target_version || null,
        },
      })
      try {
        await copilotService.createActionOutcome(storeId, {
          action_event_id: dispatchResponse.event_id ?? null,
          insight_id: insightId,
          action_type: "edge_rollout_intervention",
          channel: "copilot",
          source: "reports_rollout",
          status: "dispatched",
          impact_expected_brl: expectedImpact || undefined,
          confidence_score: item.health === "degraded" ? 85 : 75,
          baseline: {
            origin: "reports_rollout",
            rollout_health: item.health,
            reason_code: item.reason_code || null,
          },
        })
      } catch {
        // Non-blocking: dispatch already persisted.
      }
      toast.success(`Ação registrada para ${storeName}.`)
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
      const message =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.detail === "string" && payload.detail) ||
        "Não foi possível registrar a ação de rollout."
      try {
        await copilotService.createActionOutcome(storeId, {
          insight_id: insightId,
          action_type: "edge_rollout_intervention",
          channel: "copilot",
          source: "reports_rollout",
          status: "failed",
          impact_expected_brl: expectedImpact || undefined,
          confidence_score: item.health === "degraded" ? 85 : 75,
          outcome: {
            failed_from: "reports_rollout",
            error_message: message,
            reason_code: item.reason_code || null,
          },
        })
      } catch {
        // Non-blocking: failure already visible in UI.
      }
      toast.error(message)
      setRolloutActionStoreId(null)
      return
    }
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", {
        detail: {
          prompt: `Montar plano imediato para update da ${storeName}. Status: ${item.health}. Evento: ${
            item.last_event || "sem evento"
          }. Motivo: ${item.reason_code || "não informado"}. Versão alvo: ${item.target_version || "não informada"}.`,
        },
      })
    )
    setRolloutActionStoreId(null)
  }

  const handleExport = async (format: "csv" | "pdf") => {
    if (exporting) return
    setExporting(format)
    try {
      const blob = await meService.exportReport(format, rangeParams)
      const filename = `relatorio_${period === "custom" ? "custom" : period}.${format}`
      downloadBlob(blob, filename)
    } finally {
      setExporting(null)
    }
  }

  if (summaryQ.isLoading || impactQ.isLoading || coverageQ.isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 rounded bg-slate-200 animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (summaryQ.error || impactQ.error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
          Erro ao carregar cockpit executivo.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">CEO Decision Cockpit</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão por exceção, dollarization da dor e recomendação prescritiva.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-900 text-white">
            Visão Executiva
          </button>
          <button className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            Relatórios Detalhados
          </button>
          <button className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            Saúde da Infraestrutura
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Score Consolidado</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{consolidatedScore}/100</p>
            <svg viewBox="0 0 120 24" className="mt-3 h-6 w-full">
              <polyline
                fill="none"
                stroke="#334155"
                strokeWidth="2"
                points={scoreTrendPoints}
              />
            </svg>
            <p className="text-[11px] text-slate-500 mt-2">Tendência dos últimos dias</p>
          </article>

          <article className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Receita em Risco Hoje</p>
            <p className="text-3xl font-semibold text-rose-600 mt-2">{formatCurrencyBRL(revenueAtRiskToday)}</p>
            <p className="text-[11px] text-slate-500 mt-2">Perda potencial por fila e ociosidade (estimada)</p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Conversão Média</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {formatPercent(conversionRateDisplay)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <TrustBadge status={conversionIsOfficial ? "official" : "proxy"} />
              <p className="text-[11px] text-slate-500">
                {conversionIsOfficial
                  ? `${summaryData?.pos_integration?.transactions_total || 0} transações PDV`
                  : "Sem PDV conectado (proxy CV)"}
              </p>
            </div>
          </article>
        </div>

        <div className="xl:col-span-2 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.1em] text-indigo-200">Copiloto Chief of Staff</p>
          <p className="text-sm leading-relaxed text-slate-100 mt-2">{copilotSummary}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-indigo-200">
              Janela operacional: {formatWindowLabel(operationalWindow)}
            </span>
            <button
              type="button"
              onClick={() => void triggerCopilotAction()}
              disabled={approvingIntervention}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              {approvingIntervention ? "Aprovando..." : "Aprovar Intervenção"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!selectedStore && sprint2Acceptance && (
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Estado Sprint 2</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{sprint2Acceptance.reason}</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  sprint2Acceptance.decision === "GO"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {sprint2Acceptance.decision}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
              <p>
                Cobertura {sprint2Acceptance.coverage_rate}% (mín. {sprint2Acceptance.coverage_min}%)
              </p>
              <p>
                Stale {sprint2Acceptance.stale_rate}% (máx. {sprint2Acceptance.stale_rate_max}%)
              </p>
              <p>
                No data {sprint2Acceptance.no_data_rate}% (máx. {sprint2Acceptance.no_data_rate_max}%)
              </p>
            </div>
          </article>
        )}
        <article className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Valor Recuperado (Ledger)</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-2">
            {formatCurrencyBRL(ledgerTotals?.value_recovered_brl ?? 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            {selectedStore ? "Período selecionado da loja" : "Período selecionado da rede"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <TrustBadge status="estimated" />
            <span className="text-[11px] text-slate-500">
              Método {ledgerQ.data?.method_version_current || "value_ledger_v1_2026-03-15"}
            </span>
          </div>
          {!selectedStore && ledgerQ.data?.pipeline_health && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  ledgerQ.data.pipeline_health.status === "healthy"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : ledgerQ.data.pipeline_health.status === "stale"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                Ledger {ledgerQ.data.pipeline_health.status}
              </span>
              <span className="text-[11px] text-slate-500">
                Cobertura {ledgerQ.data.pipeline_health.stores_with_ledger}/{ledgerQ.data.pipeline_health.stores_total} lojas
              </span>
              <span className="text-[11px] text-slate-500">
                SLO alvo {(ledgerQ.data.pipeline_health.slo_target_seconds / 60).toFixed(0)} min
              </span>
              {ledgerQ.data.pipeline_health.slo_breached && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  SLO violado
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                Atualizado em {formatDateTime(ledgerQ.data.pipeline_health.last_updated_at)}
              </span>
            </div>
          )}
          {selectedStore && ledgerQ.data?.pipeline_health && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  ledgerQ.data.pipeline_health.status === "healthy"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : ledgerQ.data.pipeline_health.status === "stale"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                Ledger {ledgerQ.data.pipeline_health.status}
              </span>
              <span className="text-[11px] text-slate-500">
                Freshness {ledgerQ.data.pipeline_health.freshness_seconds ?? "—"}s
              </span>
              <span className="text-[11px] text-slate-500">
                SLO alvo {(ledgerQ.data.pipeline_health.slo_target_seconds / 60).toFixed(0)} min
              </span>
              {ledgerQ.data.pipeline_health.slo_breached && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  SLO violado
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                Atualizado em {formatDateTime(ledgerQ.data.pipeline_health.last_updated_at)}
              </span>
            </div>
          )}
          {ledgerQ.data?.pipeline_health?.recommended_action && (
            <p className="text-[11px] text-slate-600 mt-2">
              Próxima ação: {ledgerQ.data.pipeline_health.recommended_action}
            </p>
          )}
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Ações Despachadas</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">
            {ledgerTotals?.actions_dispatched ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">Intervenções registradas no ledger</p>
          <p className="text-[11px] text-rose-600 mt-1">
            Saldo em risco {formatCurrencyBRL(ledgerTotals?.value_net_gap_brl ?? 0)}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Ações Concluídas</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">
            {ledgerTotals?.actions_completed ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Confiança média {Math.round(ledgerTotals?.confidence_score_avg ?? 0)}/100
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Conclusão {(ledgerTotals?.completion_rate ?? 0).toFixed(1)}% · Recuperação{" "}
            {(ledgerTotals?.recovery_rate ?? 0).toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Outcomes: conclusão {(outcomesSummary?.completion_rate ?? 0).toFixed(1)}% · recuperação{" "}
            {(outcomesSummary?.recovery_rate ?? 0).toFixed(1)}%
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Resposta a incidentes de update</h2>
          <span className="text-xs text-slate-500">
            {incidentResponse?.method?.version || "edge_incident_response_v1_2026-03-16"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${targetStatusClass(
              incidentResponse?.target_status?.overall
            )}`}
          >
            Sprint Gate {targetStatusLabel(incidentResponse?.target_status?.overall)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${targetStatusClass(
              incidentResponse?.target_status?.runbook_coverage
            )}`}
          >
            Cobertura {targetStatusLabel(incidentResponse?.target_status?.runbook_coverage)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${targetStatusClass(
              incidentResponse?.target_status?.time_to_runbook
            )}`}
          >
            TTR {targetStatusLabel(incidentResponse?.target_status?.time_to_runbook)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <article className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-rose-700">Falhas + rollback</p>
            <p className="mt-2 text-2xl font-semibold text-rose-800">
              {(incidentResponse?.failures_total ?? 0) + (incidentResponse?.rollbacks_total ?? 0)}
            </p>
          </article>
          <article className="rounded-lg border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-sky-700">Runbooks abertos</p>
            <p className="mt-2 text-2xl font-semibold text-sky-800">
              {incidentResponse?.runbook_opened_total ?? 0}
            </p>
          </article>
          <article className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-indigo-700">Cobertura de resposta</p>
            <p className="mt-2 text-2xl font-semibold text-indigo-800">
              {(incidentResponse?.runbook_coverage_rate ?? 0).toFixed(1)}%
            </p>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-amber-700">Tempo até runbook</p>
            <p className="mt-2 text-2xl font-semibold text-amber-800">
              {formatSeconds(incidentResponse?.avg_time_to_runbook_seconds ?? null)}
            </p>
          </article>
        </div>
        <div className="mt-3 text-xs text-slate-600 space-y-1">
          <p>Última falha: {formatDateTime(incidentResponse?.latest_failure_at)}</p>
          <p>Última abertura de runbook: {formatDateTime(incidentResponse?.latest_runbook_opened_at)}</p>
          <p>
            Meta cobertura ≥ {(incidentResponse?.targets?.runbook_coverage_rate_min ?? 90).toFixed(0)}% ·
            Meta tempo ≤ {Math.round((incidentResponse?.targets?.time_to_runbook_seconds_max ?? 600) / 60)} min
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Execução de ações por origem</h2>
          <span className="text-xs text-slate-500">
            {actionExecution?.method?.version || "action_execution_v1_2026-03-16"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-600">Despachadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {actionExecution?.actions_dispatched_total ?? 0}
            </p>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-emerald-700">Concluídas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800">
              {actionExecution?.actions_completed_total ?? 0}
            </p>
          </article>
          <article className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-rose-700">Falharam</p>
            <p className="mt-2 text-2xl font-semibold text-rose-800">
              {actionExecution?.actions_failed_total ?? 0}
            </p>
          </article>
          <article className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-indigo-700">Taxa de conclusão</p>
            <p className="mt-2 text-2xl font-semibold text-indigo-800">
              {(actionExecution?.completion_rate ?? 0).toFixed(1)}%
            </p>
            <p className="mt-1 text-[11px] text-indigo-700">
              Falha {(actionExecution?.failure_rate ?? 0).toFixed(1)}%
            </p>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-amber-700">Top origem</p>
            <p className="mt-2 text-lg font-semibold text-amber-800">
              {actionExecution?.top_source || "—"}
            </p>
            <p className="mt-1 text-[11px] text-amber-700">
              Rollout {(actionExecution?.rollout?.completion_rate ?? 0).toFixed(1)}% · Falha{" "}
              {(actionExecution?.rollout?.failure_rate ?? 0).toFixed(1)}%
            </p>
          </article>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
          {(["dashboard", "reports", "operations", "other"] as const).map((sourceKey) => (
            <div key={sourceKey} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="font-semibold text-slate-700 uppercase">{sourceKey}</p>
              <p className="mt-1 text-slate-600">
                {actionExecution?.sources?.[sourceKey]?.dispatched ?? 0} despachadas ·{" "}
                {actionExecution?.sources?.[sourceKey]?.completed ?? 0} concluídas ·{" "}
                {actionExecution?.sources?.[sourceKey]?.failed ?? 0} falharam
              </p>
              <p className="mt-1 text-slate-500">
                Conclusão {(actionExecution?.sources?.[sourceKey]?.completion_rate ?? 0).toFixed(1)}% · Falha{" "}
                {(actionExecution?.sources?.[sourceKey]?.failure_rate ?? 0).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      {!selectedStore && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Rollout do Edge na rede</h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {(["all", "stable", "canary"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRolloutChannelFilter(item)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      rolloutChannelFilter === item
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item === "all" ? "Todos" : item}
                  </button>
                ))}
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${targetStatusClass(
                  rolloutSummary?.rollout_health?.status === "healthy"
                    ? "go"
                    : rolloutSummary?.rollout_health?.status === "degraded"
                    ? "no_go"
                    : "no_data"
                )}`}
              >
                {rolloutSummary?.rollout_health?.status === "healthy"
                  ? "Estável"
                  : rolloutSummary?.rollout_health?.status === "degraded"
                  ? "Crítico"
                  : rolloutSummary?.rollout_health?.status === "attention"
                  ? "Atenção"
                  : "Sem dados"}
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-600">Lojas monitoradas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{rolloutSummary?.totals?.stores ?? 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Com policy ativa {rolloutSummary?.totals?.with_policy ?? 0} · atualizadas{" "}
                {rolloutSummary?.totals?.version_gap?.up_to_date ?? 0}
              </p>
            </article>
            <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-emerald-700">Lojas saudáveis</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {rolloutSummary?.totals?.health?.healthy ?? 0}
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">Canary {rolloutSummary?.totals?.channel?.canary ?? 0}</p>
            </article>
            <article className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-rose-700">Lojas críticas</p>
              <p className="mt-2 text-2xl font-semibold text-rose-800">
                {rolloutSummary?.totals?.health?.degraded ?? 0}
              </p>
              <p className="text-[11px] text-rose-700 mt-1">
                Em progresso {rolloutSummary?.totals?.health?.in_progress ?? 0} · desatualizadas{" "}
                {rolloutSummary?.totals?.version_gap?.outdated ?? 0}
              </p>
            </article>
            <article className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-amber-700">Sem sinal de update</p>
              <p className="mt-2 text-2xl font-semibold text-amber-800">
                {rolloutSummary?.totals?.health?.no_data ?? 0}
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Stable {rolloutSummary?.totals?.channel?.stable ?? 0} · gap desconhecido{" "}
                {rolloutSummary?.totals?.version_gap?.unknown ?? 0}
              </p>
            </article>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            {rolloutSummary?.rollout_health?.recommended_action || "Sem recomendação de rollout no momento."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`rounded-full border px-2 py-0.5 font-semibold ${
                validationSummary?.summary?.decision === "GO"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              Validação S4: {validationSummary?.summary?.decision || "NO-GO"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
              Canary: {validationSummary?.checklist?.canary_ready ? "ok" : "pendente"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
              Rollback: {validationSummary?.checklist?.rollback_ready ? "ok" : "pendente"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
              Telemetria: {validationSummary?.checklist?.telemetry_ready ? "ok" : "pendente"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-emerald-700">Taxa de sucesso</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {rolloutSummary?.rollout_metrics?.success_rate_pct?.toFixed(1) ?? "0.0"}%
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">
                {rolloutSummary?.rollout_metrics?.attempts_successful ?? 0} de{" "}
                {rolloutSummary?.rollout_metrics?.attempts_total ?? 0} tentativas
              </p>
            </article>
            <article className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-rose-700">Taxa de falha</p>
              <p className="mt-2 text-2xl font-semibold text-rose-800">
                {rolloutSummary?.rollout_metrics?.failure_rate_pct?.toFixed(1) ?? "0.0"}%
              </p>
              <p className="text-[11px] text-rose-700 mt-1">
                Falhas {rolloutSummary?.rollout_metrics?.attempts_failed ?? 0} · rollback{" "}
                {rolloutSummary?.rollout_metrics?.attempts_rolled_back ?? 0}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-700">Duração média</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {rolloutSummary?.rollout_metrics?.avg_duration_seconds
                  ? `${Math.round(rolloutSummary.rollout_metrics.avg_duration_seconds)}s`
                  : "—"}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Incompletas {rolloutSummary?.rollout_metrics?.attempts_incomplete ?? 0}
              </p>
            </article>
          </div>
          {!rolloutSummary?.critical_stores?.length ? (
            <p className="mt-3 text-sm text-slate-500">Sem lojas críticas de update neste momento.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {rolloutSummary.critical_stores.slice(0, 5).map((item) => (
                <article
                  key={`${item.store_id}-${item.timestamp || "latest"}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.store_name || "Loja"}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        item.health === "degraded"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.health === "degraded" ? "Falha/rollback" : "Em progresso"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                      {item.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.last_event || "Sem evento"} · versão atual {item.current_version || "—"} · versão alvo{" "}
                    {item.target_version || "—"} · gap{" "}
                    {item.version_gap === "up_to_date"
                      ? "atualizada"
                      : item.version_gap === "outdated"
                      ? "desatualizada"
                      : "desconhecido"}{" "}
                    · motivo {item.reason_code || "não informado"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={`/app/edge-help?store_id=${item.store_id}${
                        item.reason_code ? `&reason_code=${encodeURIComponent(item.reason_code)}` : ""
                      }`}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      Abrir runbook
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleRolloutCopilotAction(item)}
                      disabled={rolloutActionStoreId === item.store_id}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {rolloutActionStoreId === item.store_id ? "Acionando..." : "Acionar Copiloto"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Ações e Outcome</h2>
          <span className="text-xs text-slate-500">
            {selectedStore ? "Fechamento do loop de valor" : "Visão consolidada da rede"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "Todas" },
              { key: "dispatched", label: "Despachadas" },
              { key: "completed", label: "Concluídas" },
              { key: "failed", label: "Falharam" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setOutcomeStatusFilter(item.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                outcomeStatusFilter === item.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {!actionOutcomes.length ? (
          <p className="mt-3 text-sm text-slate-500">
            {selectedStore
              ? "Sem ações registradas para este filtro na loja."
              : "Sem ações registradas para este filtro na rede."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {actionOutcomes.slice(0, 6).map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.action_type}</p>
                  <p className="text-xs text-slate-500">
                    Esperado {formatCurrencyBRL(item.impact_expected_brl)} · Realizado{" "}
                    {formatCurrencyBRL(item.impact_realized_brl)}
                  </p>
                  {item.outcome_status && (
                    <p className="text-xs text-slate-500">
                      Resultado: {outcomeStatusLabel[item.outcome_status]}
                    </p>
                  )}
                  {item.outcome_comment && (
                    <p className="text-xs text-slate-500">Comentário: {item.outcome_comment}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                      item.status === "completed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : item.status === "failed"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.status !== "completed" && item.status !== "failed" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCompleteOutcome(item.store_id, item.id, item.impact_expected_brl || 0)
                        }
                        disabled={completingOutcomeId === item.id || failingOutcomeId === item.id}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {completingOutcomeId === item.id ? "Concluindo..." : "Marcar concluída"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleFailOutcome(item.store_id, item.id)}
                        disabled={completingOutcomeId === item.id || failingOutcomeId === item.id}
                        className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        {failingOutcomeId === item.id ? "Marcando..." : "Marcar falha"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>


      {!selectedStore && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Lojas com maior risco no período</h2>
            <span className="text-xs text-slate-500">Priorização executiva da rede</span>
          </div>
          {!networkLedgerBreakdown.length ? (
            <p className="mt-3 text-sm text-slate-500">Sem dados de risco por loja no período.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {networkLedgerBreakdown.slice(0, 5).map((item) => (
                <article
                  key={item.store_id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.store_name || storeNameById[item.store_id] || `Loja ${item.store_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Recuperado {formatCurrencyBRL(item.value_recovered_brl)} · Ações {item.actions_dispatched}
                    </p>
                    <p className="text-xs text-slate-500">
                      Conclusão {(item.completion_rate ?? 0).toFixed(1)}% · Recuperação{" "}
                      {(item.recovery_rate ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-rose-600">
                      Saldo em risco {formatCurrencyBRL(item.value_net_gap_brl ?? 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-rose-600">
                      {formatCurrencyBRL(item.value_at_risk_brl)} em risco
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedStore(item.store_id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Abrir loja
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Loja</label>
            <select
              value={selectedStore}
              onChange={(event) => setSelectedStore(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Toda a rede</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Período</label>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Customizado</option>
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
            <p className="text-xs text-slate-500">Janela operacional aplicada</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{formatWindowLabel(operationalWindow)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {operationalWindow.source === "opening_hours"
                ? "Baseada em horário cadastrado da loja."
                : "Fallback inteligente por comportamento real de fluxo."}
            </p>
          </div>
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Data inicial</label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Data final</label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Onde agir agora</h2>
            <span className="text-xs text-slate-500">Gestão por exceção</span>
          </div>
          {!interventionCards.length ? (
            <p className="text-sm text-slate-500 mt-3">Sem lojas críticas para intervenção imediata.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {interventionCards.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.problem}</p>
                  <p className="text-sm font-semibold text-rose-600 mt-2">
                    {formatCurrencyBRL(item.riskValue)} em risco hoje
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleDelegateStoreIntervention(item)}
                    disabled={delegatingStoreId === item.id}
                    className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {delegatingStoreId === item.id ? "Delegando..." : "Delegar ao Gerente"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Ranking de Eficiência</h2>
          {selectedStore ? (
            <p className="text-sm text-slate-500 mt-3">
              Limpe o filtro de loja para comparar top 3 e bottom 3 da rede.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Top 3</p>
                <ul className="mt-2 space-y-2">
                  {ranking.top.map((store) => (
                    <li key={store.id} className="text-sm text-slate-800">
                      {store.name} · {formatPercent((store.conversion || 0) / 100)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Bottom 3</p>
                <ul className="mt-2 space-y-2">
                  {ranking.bottom.map((store) => (
                    <li key={store.id} className="text-sm text-slate-800">
                      {store.name} · {formatPercent((store.conversion || 0) / 100)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Insights automáticos</h2>
          <ul className="mt-3 space-y-2">
            {(summaryData?.insights ?? []).slice(0, 4).map((insight, idx) => (
              <li key={`${insight}-${idx}`} className="text-sm text-slate-700">
                • {insight}
              </li>
            ))}
          </ul>
          {!summaryData?.insights?.length && (
            <p className="text-sm text-slate-500 mt-3">Sem novos insights no período.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Evidências e aderência operacional</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ingestionPipelineClass}`}>
              {ingestionPipelineLabel}
            </span>
            <span className="text-[11px] text-slate-500">
              {ingestionOperational?.events_total ?? 0} eventos/24h
            </span>
            <span className="text-[11px] text-slate-500">
              Materialização: {ingestionOperational?.operational_window?.status || "no_data"} · cobertura{" "}
              {ingestionOperational?.operational_window?.coverage_rate ?? 0}%
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {coverageData?.method?.label} · v{coverageData?.method?.version} · confiança{" "}
            {coverageData?.confidence_governance?.score ?? 0}/100
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Status da governança: {coverageData?.confidence_governance?.status || "insuficiente"}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Fila média</span>
                <TrustBadge status={summaryData?.confidence_governance?.source_flags?.avg_queue_seconds} />
              </div>
              <span className="font-semibold text-slate-900">{formatSeconds(summaryData?.kpis?.avg_queue_seconds)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Lacunas críticas</span>
                <TrustBadge status={coverageData?.confidence_governance?.source_flags?.coverage_gap} />
              </div>
              <span className="font-semibold text-rose-600">
                {coverageData?.summary?.critical_windows ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Melhor janela</span>
                <TrustBadge status={coverageData?.confidence_governance?.source_flags?.staff_detected_est} />
              </div>
              <span className="font-semibold text-emerald-600">
                {coverageData?.summary?.best_window?.hour_label || "—"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Planejamento: {coverageData?.summary?.planned_source_mode || "proxy"}.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Evolução do fluxo na janela operacional</h2>
        <div className="mt-3 relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
          <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="border-t border-dashed border-slate-200/70" />
            ))}
          </div>
          <div className="relative flex items-end gap-2 h-40 overflow-x-auto">
            {hourBars.length === 0 && <div className="text-sm text-slate-500">Sem dados de fluxo por hora.</div>}
            {hourBars.map((entry) => {
              const maxFootfall = Math.max(...hourBars.map((item) => item.footfall), 1)
              return (
                <div key={entry.hour} className="flex flex-col items-center gap-2 min-w-[28px]">
                  <div
                    className="w-full rounded bg-slate-700/80"
                    style={{ height: `${Math.max(10, Math.round((entry.footfall / maxFootfall) * 120))}px` }}
                    title={`${entry.label} · ${entry.footfall}`}
                  />
                  <span className="text-[10px] text-slate-500">{entry.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Exportação</h2>
            <p className="text-xs text-slate-500">Compartilhamento executivo.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={exporting !== null}
            >
              {exporting === "csv" ? "Exportando..." : "Exportar CSV"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? "Exportando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Reports
