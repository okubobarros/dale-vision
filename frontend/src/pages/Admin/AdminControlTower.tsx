import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

import PostLoginExplainer from "../../components/PostLoginExplainer"
import { useAuth } from "../../contexts/useAuth"
import { adminService, type CalibrationActionItem } from "../../services/admin"
import { meService } from "../../services/me"
import { storesService, type StoreSummary } from "../../services/stores"
import { supportService } from "../../services/support"

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR").format(value)
}

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`
}

const formatRatioPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value * 100)}%`
}

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—"
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleString("pt-BR")
}

const formatFreshness = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—"
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  return `${Math.round(seconds / 3600)}h`
}

const getSlaStatus = (slaDueAt?: string | null, referenceNowMs?: number | null) => {
  if (!slaDueAt) return { label: "Sem SLA", className: "text-gray-500" }
  if (!referenceNowMs || referenceNowMs <= 0) return { label: "Aguardando", className: "text-gray-500" }
  const dt = new Date(slaDueAt)
  if (Number.isNaN(dt.getTime())) return { label: "SLA inválido", className: "text-gray-500" }
  const diffMs = dt.getTime() - referenceNowMs
  if (diffMs <= 0) return { label: "Vencido", className: "text-rose-700" }
  const minutes = Math.round(diffMs / (1000 * 60))
  if (minutes < 60) return { label: `${minutes} min`, className: "text-amber-700" }
  return { label: `${Math.round(minutes / 60)}h`, className: "text-emerald-700" }
}

const getPipelineStatusLabel = (status?: string | null) => {
  if (status === "healthy") return "Saudável"
  if (status === "stale") return "Desatualizado"
  if (status === "no_signal") return "Sem sinal"
  if (status === "no_data") return "Sem dados"
  return "—"
}

const ISSUE_LABELS: Record<string, string> = {
  edge_signal_stale: "Edge sem sinal recente",
  camera_signal_unhealthy: "Câmera com sinal ruim/offline",
  conversion_identity_null_rate_high: "Nulos altos em conversão",
  pdv_signal_missing_7d: "Sem sinal PDV em 7 dias",
  vision_funnel_reconciliation_gap_24h: "Gap visão -> funil (24h)",
}

const formatIssueCode = (issueCode?: string | null) => {
  const key = String(issueCode || "").trim()
  return ISSUE_LABELS[key] || key || "—"
}

const daysUntil = (iso?: string | null) => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const ms = date.getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const Card = ({ title, value, hint }: { title: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
  </div>
)

export default function AdminControlTower() {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const statusQuery = useQuery({
    queryKey: ["admin", "me-status"],
    queryFn: () => meService.getStatus(),
    staleTime: 60_000,
    retry: 2,
  })
  const isInternalAdmin = Boolean(
    user?.is_staff || user?.is_superuser || statusQuery.data?.is_internal_admin
  )
  const waitingStatusValidation = isAuthenticated && !user?.is_staff && !user?.is_superuser && statusQuery.isLoading

  const summaryQuery = useQuery({
    queryKey: ["admin", "control-tower", "summary"],
    queryFn: adminService.getControlTowerSummary,
    enabled: isInternalAdmin,
    refetchInterval: 30_000,
  })

  const storesSummaryQuery = useQuery({
    queryKey: ["admin", "stores", "summary"],
    queryFn: storesService.getStoresSummary,
    enabled: isInternalAdmin,
    refetchInterval: 60_000,
  })

  const supportRequestsQuery = useQuery({
    queryKey: ["admin", "support", "requests", "pending"],
    queryFn: () => supportService.getAdminSupportRequests("pending"),
    enabled: isInternalAdmin,
    refetchInterval: 30_000,
  })

  const journeyFunnelQuery = useQuery({
    queryKey: ["admin", "journey-funnel", "30d"],
    queryFn: () => meService.getJourneyFunnel({ period: "30d" }, { include_global_leads: true }),
    enabled: isInternalAdmin,
    refetchInterval: 60_000,
  })

  const pdvHealthQuery = useQuery({
    queryKey: ["admin", "pdv-ingestion-health", "30d"],
    queryFn: () => storesService.getPdvIngestionHealth({ period: "30d" }),
    enabled: isInternalAdmin,
    refetchInterval: 60_000,
  })

  const completeness30dQuery = useQuery({
    queryKey: ["admin", "data-completeness", "30d"],
    queryFn: () => storesService.getDataCompleteness({ period: "30d" }),
    enabled: isInternalAdmin,
    refetchInterval: 60_000,
  })

  const completeness7dQuery = useQuery({
    queryKey: ["admin", "data-completeness", "7d"],
    queryFn: () => storesService.getDataCompleteness({ period: "7d" }),
    enabled: isInternalAdmin,
    refetchInterval: 60_000,
  })

  const networkIngestion24hQuery = useQuery({
    queryKey: ["admin", "network-vision-ingestion-summary", "24h"],
    queryFn: () => storesService.getNetworkVisionIngestionSummary({ event_source: "all", window_hours: 24 }),
    enabled: isInternalAdmin,
    refetchInterval: 30_000,
  })

  const calibrationActionsQuery = useQuery({
    queryKey: ["admin", "calibration-actions", "active"],
    queryFn: () => adminService.getCalibrationActions({ status: "all", limit: 100 }),
    enabled: isInternalAdmin,
    refetchInterval: 30_000,
  })

  const ingestionGapQuery = useQuery({
    queryKey: ["admin", "ingestion-funnel-gap", "24h"],
    queryFn: () => adminService.getIngestionFunnelGap({ window_hours: 24, limit: 100 }),
    enabled: isInternalAdmin,
    refetchInterval: 30_000,
  })
  const pipelineObservabilityQuery = useQuery({
    queryKey: ["admin", "pipeline-observability", "24h"],
    queryFn: () => adminService.getPipelineObservability({ window_hours: 24, limit: 120 }),
    enabled: isInternalAdmin,
    refetchInterval: 30_000,
  })
  const releaseGateQuery = useQuery({
    queryKey: ["admin", "release-gate"],
    queryFn: () => adminService.getReleaseGate(),
    enabled: isInternalAdmin,
    refetchInterval: 60_000,
  })

  const grantSupportMutation = useMutation({
    mutationFn: (requestId: string) => supportService.grantSupportRequest(requestId, 120),
    onSuccess: () => {
      toast.success("Acesso temporário concedido por 2h.")
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "requests", "pending"] })
    },
    onError: (error: unknown) => {
      toast.error((error as { message?: string })?.message || "Falha ao conceder acesso.")
    },
  })

  const closeSupportMutation = useMutation({
    mutationFn: (requestId: string) => supportService.closeSupportRequest(requestId),
    onSuccess: () => {
      toast.success("Solicitação encerrada.")
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "requests", "pending"] })
    },
    onError: (error: unknown) => {
      toast.error((error as { message?: string })?.message || "Falha ao encerrar solicitação.")
    },
  })

  const patchCalibrationActionMutation = useMutation({
    mutationFn: ({
      actionId,
      payload,
    }: {
      actionId: string
      payload: { status?: string; priority?: string; notes?: string }
    }) => adminService.patchCalibrationAction(actionId, payload),
    onSuccess: () => {
      toast.success("Ação de calibração atualizada.")
      queryClient.invalidateQueries({ queryKey: ["admin", "calibration-actions", "active"] })
    },
    onError: (error: unknown) => {
      toast.error((error as { message?: string })?.message || "Falha ao atualizar ação.")
    },
  })

  const autoGenerateCalibrationMutation = useMutation({
    mutationFn: () => adminService.autoGenerateCalibrationActions({ dry_run: false, max_actions: 40 }),
    onSuccess: (result) => {
      toast.success(`Geração automática concluída: ${result.created_total} ações novas.`)
      queryClient.invalidateQueries({ queryKey: ["admin", "calibration-actions", "active"] })
    },
    onError: (error: unknown) => {
      toast.error((error as { message?: string })?.message || "Falha ao gerar ações automáticas.")
    },
  })

  const repairIngestionGapMutation = useMutation({
    mutationFn: (payload?: { store_id?: string }) =>
      adminService.repairIngestionFunnelGap({ window_hours: 24, ...(payload || {}) }),
    onSuccess: (result) => {
      toast.success(`Reconciliação concluída: ${result.repaired_total}/${result.candidates_total} lojas.`)
      queryClient.invalidateQueries({ queryKey: ["admin", "ingestion-funnel-gap", "24h"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "journey-funnel", "30d"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "network-vision-ingestion-summary", "24h"] })
    },
    onError: (error: unknown) => {
      toast.error((error as { message?: string })?.message || "Falha ao executar reconciliação.")
    },
  })

  const activeCalibrationActions = useMemo(() => {
    const items = calibrationActionsQuery.data?.items || []
    return (items as CalibrationActionItem[]).filter((item) => item.status !== "closed").slice(0, 20)
  }, [calibrationActionsQuery.data?.items])
  const slaReferenceNowMs = calibrationActionsQuery.dataUpdatedAt || null
  const calibrationOverdueTotal = useMemo(
    () =>
      activeCalibrationActions.filter((item) => {
        if (!item.sla_due_at) return false
        const dt = new Date(item.sla_due_at)
        return !Number.isNaN(dt.getTime()) && !!slaReferenceNowMs && dt.getTime() <= slaReferenceNowMs
      }).length,
    [activeCalibrationActions, slaReferenceNowMs]
  )

  const storeRisks = useMemo(() => {
    const rows = (storesSummaryQuery.data || []) as StoreSummary[]
    return rows
      .map((store) => {
        const trialDays = daysUntil(store.trial_ends_at)
        const trialRisk = trialDays !== null && trialDays <= 7
        const blocked = store.status === "blocked"
        const score = Number(blocked) * 2 + Number(trialRisk)
        return {
          id: store.id,
          name: store.name,
          status: store.status || "unknown",
          blockedReason: store.blocked_reason || null,
          trialEndsAt: store.trial_ends_at || null,
          trialDays,
          score,
        }
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [storesSummaryQuery.data])

  const dataQuality = useMemo(() => {
    const funnel = journeyFunnelQuery.data
    const pdv = pdvHealthQuery.data
    const completeness30d = completeness30dQuery.data
    const completeness7d = completeness7dQuery.data
    const missingRates = (funnel?.stages || []).map((row) => Number(row.payload_missing_rate || 0))
    const avgMissingRate =
      missingRates.length > 0 ? missingRates.reduce((acc, item) => acc + item, 0) / missingRates.length : null
    const payloadScore = avgMissingRate === null ? null : Math.max(0, 100 - avgMissingRate * 100)
    const processingScore =
      pdv?.processing_rate !== null && pdv?.processing_rate !== undefined
        ? Math.max(0, Math.min(100, pdv.processing_rate * 100))
        : null
    const failurePenalty =
      pdv?.failure_rate !== null && pdv?.failure_rate !== undefined ? Math.max(0, pdv.failure_rate * 100) : 0
    if (payloadScore === null && processingScore === null) {
      return {
        score: null,
        avgMissingRate: null,
        nullRate30d: completeness30d?.overall_null_rate ?? null,
        nullRate7d: completeness7d?.overall_null_rate ?? null,
      }
    }
    const weighted =
      (payloadScore === null ? 0 : payloadScore * 0.55) +
      (processingScore === null ? 0 : processingScore * 0.45) -
      failurePenalty * 0.2
    return {
      score: Math.max(0, Math.min(100, Math.round(weighted))),
      avgMissingRate,
      nullRate30d: completeness30d?.overall_null_rate ?? null,
      nullRate7d: completeness7d?.overall_null_rate ?? null,
    }
  }, [journeyFunnelQuery.data, pdvHealthQuery.data, completeness30dQuery.data, completeness7dQuery.data])

  if (waitingStatusValidation) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin SaaS</h1>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Validando permissões de admin interno...
        </div>
      </div>
    )
  }

  if (!isInternalAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin SaaS</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Acesso restrito ao time interno (staff/superuser).
        </div>
        {statusQuery.isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Não foi possível validar seu status agora (API indisponível/cold start). Tente atualizar em alguns segundos.
          </div>
        ) : null}
      </div>
    )
  }

  const summary = summaryQuery.data
  const loading = summaryQuery.isLoading
  const networkIngestion = networkIngestion24hQuery.data
  const firstMetricsStageCount =
    (journeyFunnelQuery.data?.stages || []).find((stage) => stage.stage_key === "first_metrics_received")?.count ?? 0
  const reconciliationGapStatus =
    (networkIngestion?.vision_summary?.total || 0) > 0 && Number(firstMetricsStageCount || 0) === 0
      ? "crítico"
      : "ok"
  const topVisionEvents = Object.entries(networkIngestion?.vision_summary?.by_event_type || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topRetailEvents = Object.entries(networkIngestion?.retail_summary?.by_event_name || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const ingestionGapRows = ingestionGapQuery.data?.rows || []
  const pipelineRows = pipelineObservabilityQuery.data?.rows || []
  const releaseGate = releaseGateQuery.data

  return (
    <div className="space-y-6">
      <PostLoginExplainer />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin SaaS - Control Tower</h1>
          <p className="text-sm text-gray-600">
            Visão consolidada de usuários, lojas, edge, cobrança e risco operacional.
          </p>
        </div>
        <div className="text-xs text-gray-500">
          Atualizado: {summary?.generated_at ? new Date(summary.generated_at).toLocaleString("pt-BR") : "—"}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Carregando resumo administrativo...
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Usuários e organizações</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Usuários totais" value={formatNumber(summary?.users.total)} />
              <Card title="Usuários ativos" value={formatNumber(summary?.users.active)} />
              <Card title="Staff" value={formatNumber(summary?.users.staff)} />
              <Card title="Orgs totais" value={formatNumber(summary?.organizations.total)} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Lojas e edge</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Lojas totais" value={formatNumber(summary?.stores.total)} />
              <Card title="Sinal recente (5m)" value={formatNumber(summary?.stores.signal_recent_5m)} />
              <Card title="Sinal stale" value={formatNumber(summary?.stores.signal_stale)} />
              <Card title="Sem sinal" value={formatNumber(summary?.stores.signal_missing)} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Billing e risco comercial</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Assinaturas ativas" value={formatNumber(summary?.subscriptions.active)} />
              <Card title="Past due" value={formatNumber(summary?.subscriptions.past_due)} />
              <Card title="Trial expirando 7d" value={formatNumber(summary?.organizations.trial_expiring_7d)} />
              <Card title="Lojas bloqueadas" value={formatNumber(summary?.stores.blocked)} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Incidentes e qualidade operacional</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Falhas notif 24h" value={formatNumber(summary?.incidents.notification_failed_24h)} />
              <Card title="Lojas sem sinal recente" value={formatNumber(summary?.incidents.stores_without_recent_signal)} />
              <Card title="Onboarding em progresso" value={formatNumber(summary?.onboarding.in_progress)} />
              <Card title="Câmeras offline" value={formatNumber(summary?.cameras.offline)} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Loop de valor do Copilot (24h)</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Outcomes 24h" value={formatNumber(summary?.value_loop?.outcomes_24h)} />
              <Card title="Outcomes concluídos" value={formatNumber(summary?.value_loop?.outcomes_completed_24h)} />
              <Card title="Cobertura ledger" value={formatPercent(summary?.value_loop?.ledger_coverage_rate)} />
              <Card title="Health loop" value={String(summary?.value_loop?.health ?? "—")} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Funil Produto (PM/Admin) - 30d</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Signups" value={formatNumber(journeyFunnelQuery.data?.kpis?.signups_total)} />
              <Card title="Ativados" value={formatNumber(journeyFunnelQuery.data?.kpis?.activated_total)} />
              <Card title="Taxa ativação" value={formatRatioPercent(journeyFunnelQuery.data?.kpis?.activation_rate)} />
              <Card title="Taxa paid" value={formatRatioPercent(journeyFunnelQuery.data?.kpis?.paid_rate)} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Passagem por etapa e qualidade de payload</h3>
                <span className="text-xs text-gray-500">
                  Queda crítica:{" "}
                  {journeyFunnelQuery.data?.quality?.top_drop_stage
                    ? `${journeyFunnelQuery.data.quality.top_drop_stage.from_stage} -> ${journeyFunnelQuery.data.quality.top_drop_stage.to_stage}`
                    : "—"}
                </span>
              </div>
              {!journeyFunnelQuery.data?.stages?.length ? (
                <div className="mt-3 text-sm text-gray-600">Sem dados de funil no período selecionado.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Etapa</th>
                        <th className="px-3 py-2 text-left font-semibold">Volume</th>
                        <th className="px-3 py-2 text-left font-semibold">Conversão etapa</th>
                        <th className="px-3 py-2 text-left font-semibold">Payload incompleto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {journeyFunnelQuery.data.stages.map((row) => (
                        <tr key={row.stage_key}>
                          <td className="px-3 py-2">{row.stage_label}</td>
                          <td className="px-3 py-2">{formatNumber(row.count)}</td>
                          <td className="px-3 py-2">{formatRatioPercent(row.conversion_from_previous)}</td>
                          <td className="px-3 py-2">{formatRatioPercent(row.payload_missing_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Plano redução agressiva de nulos</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card title="Score qualidade (meta 95)" value={formatNumber(dataQuality.score)} />
              <Card title="Payload faltante médio" value={formatRatioPercent(dataQuality.avgMissingRate)} />
              <Card title="Null rate 30d" value={formatRatioPercent(dataQuality.nullRate30d)} />
              <Card title="Null rate 7d" value={formatRatioPercent(dataQuality.nullRate7d)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Card title="PDV processing rate" value={formatRatioPercent(pdvHealthQuery.data?.processing_rate)} />
              <Card title="PDV failure rate" value={formatRatioPercent(pdvHealthQuery.data?.failure_rate)} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-800">Completude por tabela/campo (30d)</h3>
              {!completeness30dQuery.data?.tables?.length ? (
                <div className="mt-3 text-sm text-gray-600">Sem dados de completude no período.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Tabela</th>
                        <th className="px-3 py-2 text-left font-semibold">Rows</th>
                        <th className="px-3 py-2 text-left font-semibold">Null rate</th>
                        <th className="px-3 py-2 text-left font-semibold">Campos críticos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {completeness30dQuery.data.tables.map((table) => (
                        <tr key={table.table}>
                          <td className="px-3 py-2">{table.label}</td>
                          <td className="px-3 py-2">{formatNumber(table.rows_total)}</td>
                          <td className="px-3 py-2">{formatRatioPercent(table.null_rate)}</td>
                          <td className="px-3 py-2">
                            {table.fields
                              .filter((field) => field.null_rate > 0)
                              .slice(0, 3)
                              .map((field) => `${field.field} (${Math.round(field.null_rate * 1000) / 10}%)`)
                              .join(", ") || "Sem nulos críticos"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-800">Backlog executivo (próximos 14 dias)</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Frente</th>
                      <th className="px-3 py-2 text-left font-semibold">Objetivo</th>
                      <th className="px-3 py-2 text-left font-semibold">Dono</th>
                      <th className="px-3 py-2 text-left font-semibold">SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2">Contrato de eventos</td>
                      <td className="px-3 py-2">Zerar payload faltante em `signup/store/camera/roi` ({'<= 2%'})</td>
                      <td className="px-3 py-2">Backend + Frontend</td>
                      <td className="px-3 py-2">D+5</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Integração PDV</td>
                      <td className="px-3 py-2">Failure rate ingestão {'<= 1%'} e pending = 0 em 24h</td>
                      <td className="px-3 py-2">Data/Integrações</td>
                      <td className="px-3 py-2">D+7</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Funil ICP</td>
                      <td className="px-3 py-2">Mapear e atacar maior drop-stage no onboarding</td>
                      <td className="px-3 py-2">Produto + Growth</td>
                      <td className="px-3 py-2">D+10</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Governança Admin</td>
                      <td className="px-3 py-2">Padronizar métricas `official/proxy/estimated` em todos os cards</td>
                      <td className="px-3 py-2">Produto + Dados</td>
                      <td className="px-3 py-2">D+14</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {pdvHealthQuery.data?.top_errors?.length ? (
                <div className="mt-3 text-xs text-gray-600">
                  Top erros PDV:{" "}
                  {pdvHealthQuery.data.top_errors
                    .map((item) => `${item.error} (${item.count})`)
                    .join(", ")}
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Gate automático de release</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">
                  Liberação permitida somente com `null rate crítico` {"<="} 2%, `pipeline success` {">="} 99% e `funil` {">"} 0 em loja ativa.
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                    releaseGate?.overall_pass
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-rose-300 bg-rose-50 text-rose-700"
                  }`}
                >
                  {releaseGate?.overall_pass ? "GO" : "NO-GO"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card
                  title="Null rate crítico"
                  value={formatRatioPercent(releaseGate?.checks?.null_rate_critical?.value)}
                  hint={`${releaseGate?.checks?.null_rate_critical?.pass ? "OK" : "Falhou"} · limite 2%`}
                />
                <Card
                  title="Pipeline success"
                  value={formatRatioPercent(releaseGate?.checks?.pipeline_success?.value)}
                  hint={`${releaseGate?.checks?.pipeline_success?.pass ? "OK" : "Falhou"} · mínimo 99%`}
                />
                <Card
                  title="Funil em lojas ativas"
                  value={`${formatNumber(releaseGate?.checks?.funnel_non_zero_active_store?.active_with_funnel_total)} / ${formatNumber(
                    releaseGate?.checks?.funnel_non_zero_active_store?.active_signal_total
                  )}`}
                  hint={`${releaseGate?.checks?.funnel_non_zero_active_store?.pass ? "OK" : "Falhou"} · deve cobrir 100%`}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Observabilidade de ingestão (rede 24h)
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card
                title="Status pipeline"
                value={getPipelineStatusLabel(networkIngestion?.operational_summary?.pipeline_status)}
                hint={networkIngestion?.operational_summary?.recommended_action || undefined}
              />
              <Card title="Eventos visão" value={formatNumber(networkIngestion?.vision_summary?.total)} />
              <Card title="Eventos retail" value={formatNumber(networkIngestion?.retail_summary?.total)} />
              <Card title="Total eventos" value={formatNumber(networkIngestion?.operational_summary?.events_total)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card
                title="Último evento"
                value={formatDateTime(networkIngestion?.operational_summary?.latest_event_at)}
              />
              <Card
                title="Freshness janela"
                value={formatFreshness(networkIngestion?.operational_summary?.operational_window?.freshness_seconds)}
              />
              <Card
                title="Cobertura lojas"
                value={formatRatioPercent(networkIngestion?.operational_summary?.operational_window?.coverage_rate)}
                hint={`${formatNumber(networkIngestion?.operational_summary?.operational_window?.coverage_stores)} lojas com sinal`}
              />
              <Card
                title="Status janela"
                value={getPipelineStatusLabel(networkIngestion?.operational_summary?.operational_window?.status)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card
                title="First metrics no funil (30d)"
                value={formatNumber(firstMetricsStageCount)}
                hint="Etapa first_metrics_received no journey funnel"
              />
              <Card
                title="Gap reconciliação visão->funil"
                value={reconciliationGapStatus}
                hint={
                  reconciliationGapStatus === "crítico"
                    ? "Há eventos de visão, mas funil segue sem first_metrics_received."
                    : "Sinal de visão e funil sem gap crítico."
                }
              />
              <Card
                title="Ação imediata"
                value={reconciliationGapStatus === "crítico" ? "Rodar reconciliação" : "Monitorar"}
                hint="Próximo passo operacional"
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-800">Top eventos processados (24h)</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Visão (vision_atomic_events)</div>
                  {topVisionEvents.length === 0 ? (
                    <div className="mt-2 text-sm text-gray-600">Sem eventos de visão no período.</div>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-gray-700">
                      {topVisionEvents.map(([eventType, count]) => (
                        <li key={eventType} className="flex items-center justify-between gap-3">
                          <span className="truncate">{eventType}</span>
                          <span className="font-semibold text-gray-900">{formatNumber(count)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Retail (event_receipts)</div>
                  {topRetailEvents.length === 0 ? (
                    <div className="mt-2 text-sm text-gray-600">Sem eventos retail no período.</div>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-gray-700">
                      {topRetailEvents.map(([eventName, count]) => (
                        <li key={eventName} className="flex items-center justify-between gap-3">
                          <span className="truncate">{eventName}</span>
                          <span className="font-semibold text-gray-900">{formatNumber(count)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800">Lojas com gap visão → funil</h3>
                <button
                  type="button"
                  onClick={() => repairIngestionGapMutation.mutate()}
                  disabled={repairIngestionGapMutation.isPending || ingestionGapRows.length === 0}
                  className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reprocessar todas
                </button>
              </div>
              {ingestionGapQuery.isLoading ? (
                <div className="mt-3 text-sm text-gray-600">Carregando gaps de reconciliação...</div>
              ) : ingestionGapRows.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600">Sem gaps críticos na janela de 24h.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Loja</th>
                        <th className="px-3 py-2 text-left font-semibold">Eventos visão (24h)</th>
                        <th className="px-3 py-2 text-left font-semibold">Último evento visão</th>
                        <th className="px-3 py-2 text-left font-semibold">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ingestionGapRows.slice(0, 20).map((row) => (
                        <tr key={row.store_id}>
                          <td className="px-3 py-2">{row.store_name || row.store_id}</td>
                          <td className="px-3 py-2">{formatNumber(row.vision_events)}</td>
                          <td className="px-3 py-2">{formatDateTime(row.last_vision_ts)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => repairIngestionGapMutation.mutate({ store_id: row.store_id })}
                              disabled={repairIngestionGapMutation.isPending}
                              className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Reprocessar loja
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800">Pipeline técnico por loja/câmera (24h)</h3>
                <span className="text-xs text-gray-500">
                  {formatNumber(pipelineObservabilityQuery.data?.totals?.rows_total)} linhas
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
                <Card title="Frames recebidos" value={formatNumber(pipelineObservabilityQuery.data?.totals?.frames_received)} />
                <Card title="Eventos aceitos" value={formatNumber(pipelineObservabilityQuery.data?.totals?.events_accepted)} />
                <Card title="Eventos gerados" value={formatNumber(pipelineObservabilityQuery.data?.totals?.events_generated)} />
                <Card title="Drop rate" value={formatRatioPercent(pipelineObservabilityQuery.data?.totals?.drop_rate)} />
                <Card
                  title="Latência média"
                  value={
                    pipelineObservabilityQuery.data?.totals?.latency_ms_avg === null ||
                    pipelineObservabilityQuery.data?.totals?.latency_ms_avg === undefined
                      ? "—"
                      : `${formatNumber(pipelineObservabilityQuery.data?.totals?.latency_ms_avg)} ms`
                  }
                />
              </div>
              {pipelineObservabilityQuery.isLoading ? (
                <div className="mt-3 text-sm text-gray-600">Carregando observabilidade técnica...</div>
              ) : pipelineRows.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600">Sem sinal técnico de ingestão no período.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Loja/Câmera</th>
                        <th className="px-3 py-2 text-left font-semibold">Frames recebidos</th>
                        <th className="px-3 py-2 text-left font-semibold">Eventos aceitos</th>
                        <th className="px-3 py-2 text-left font-semibold">Eventos gerados</th>
                        <th className="px-3 py-2 text-left font-semibold">Drop rate</th>
                        <th className="px-3 py-2 text-left font-semibold">Latência média</th>
                        <th className="px-3 py-2 text-left font-semibold">Último evento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pipelineRows.slice(0, 20).map((row, index) => (
                        <tr key={`${row.store_id || "store"}-${row.camera_id || "camera"}-${index}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{row.store_name || row.store_id || "—"}</div>
                            <div className="text-xs text-gray-500">{row.camera_name || row.camera_id || "camera_unknown"}</div>
                          </td>
                          <td className="px-3 py-2">{formatNumber(row.frames_received)}</td>
                          <td className="px-3 py-2">{formatNumber(row.events_accepted)}</td>
                          <td className="px-3 py-2">{formatNumber(row.events_generated)}</td>
                          <td className="px-3 py-2">{formatRatioPercent(row.drop_rate)}</td>
                          <td className="px-3 py-2">
                            {row.latency_ms_avg === null || row.latency_ms_avg === undefined
                              ? "—"
                              : `${formatNumber(row.latency_ms_avg)} ms`}
                          </td>
                          <td className="px-3 py-2">{formatDateTime(row.latest_event_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Ações de calibração (admin + cliente)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => autoGenerateCalibrationMutation.mutate()}
                  disabled={autoGenerateCalibrationMutation.isPending}
                  className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Gerar ações automáticas
                </button>
                <span className="text-xs text-gray-500">{activeCalibrationActions.length} abertas</span>
                <span className="text-xs text-rose-600">{calibrationOverdueTotal} vencidas</span>
              </div>
            </div>
            {calibrationActionsQuery.isLoading ? (
              <div className="mt-3 text-sm text-gray-600">Carregando backlog de calibração...</div>
            ) : activeCalibrationActions.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Sem ações pendentes no momento.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Loja/Câmera</th>
                      <th className="px-3 py-2 text-left font-semibold">Issue</th>
                      <th className="px-3 py-2 text-left font-semibold">Ação recomendada</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Prioridade</th>
                      <th className="px-3 py-2 text-left font-semibold">SLA</th>
                      <th className="px-3 py-2 text-left font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeCalibrationActions.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{row.store_name || row.store_id}</div>
                          <div className="text-xs text-gray-500">{row.camera_name || row.camera_id || "Todas as câmeras"}</div>
                        </td>
                        <td className="px-3 py-2">{formatIssueCode(row.issue_code)}</td>
                        <td className="px-3 py-2">{row.recommended_action}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{row.priority}</td>
                        <td className="px-3 py-2">
                          <div className={`text-xs font-semibold ${getSlaStatus(row.sla_due_at, slaReferenceNowMs).className}`}>
                            {getSlaStatus(row.sla_due_at, slaReferenceNowMs).label}
                          </div>
                          <div className="text-xs text-gray-500">{formatDateTime(row.sla_due_at)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                patchCalibrationActionMutation.mutate({
                                  actionId: row.id,
                                  payload: { status: "in_progress" },
                                })
                              }
                              disabled={patchCalibrationActionMutation.isPending}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Em execução
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                patchCalibrationActionMutation.mutate({
                                  actionId: row.id,
                                  payload: { status: "waiting_validation" },
                                })
                              }
                              disabled={patchCalibrationActionMutation.isPending}
                              className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Aguard. validação
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                patchCalibrationActionMutation.mutate({
                                  actionId: row.id,
                                  payload: { status: "validated" },
                                })
                              }
                              disabled={patchCalibrationActionMutation.isPending}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                            >
                              Validar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Fila de suporte (câmeras/ROI)
              </h2>
              <span className="text-xs text-gray-500">
                {(supportRequestsQuery.data || []).length} pendentes
              </span>
            </div>
            {supportRequestsQuery.isLoading ? (
              <div className="mt-3 text-sm text-gray-600">Carregando fila de suporte...</div>
            ) : (supportRequestsQuery.data || []).length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Sem solicitações pendentes.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Loja</th>
                      <th className="px-3 py-2 text-left font-semibold">Solicitante</th>
                      <th className="px-3 py-2 text-left font-semibold">Motivo</th>
                      <th className="px-3 py-2 text-left font-semibold">Solicitado em</th>
                      <th className="px-3 py-2 text-left font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(supportRequestsQuery.data || []).map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">{row.store_name || row.store_id}</td>
                        <td className="px-3 py-2">{row.requester_email || row.requester_name || "—"}</td>
                        <td className="px-3 py-2">{row.reason || "—"}</td>
                        <td className="px-3 py-2">
                          {row.requested_at ? new Date(row.requested_at).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => grantSupportMutation.mutate(row.id)}
                              disabled={grantSupportMutation.isPending}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                            >
                              Conceder 2h
                            </button>
                            <button
                              type="button"
                              onClick={() => closeSupportMutation.mutate(row.id)}
                              disabled={closeSupportMutation.isPending}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Encerrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Top riscos por loja
              </h2>
              <span className="text-xs text-gray-500">{storeRisks.length} itens</span>
            </div>
            {storesSummaryQuery.isLoading ? (
              <div className="mt-3 text-sm text-gray-600">Carregando riscos por loja...</div>
            ) : storeRisks.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Sem riscos críticos detectados no momento.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Loja</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Bloqueio</th>
                      <th className="px-3 py-2 text-left font-semibold">Trial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {storeRisks.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{row.blockedReason || "—"}</td>
                        <td className="px-3 py-2">
                          {row.trialDays !== null ? `${row.trialDays} dias` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
