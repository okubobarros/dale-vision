import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

import { useAuth } from "../../contexts/useAuth"
import { adminService } from "../../services/admin"
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
  const { user } = useAuth()
  const isInternalAdmin = Boolean(user?.is_staff || user?.is_superuser)
  const queryClient = useQueryClient()

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
      }
    }
    const weighted =
      (payloadScore === null ? 0 : payloadScore * 0.55) +
      (processingScore === null ? 0 : processingScore * 0.45) -
      failurePenalty * 0.2
    return {
      score: Math.max(0, Math.min(100, Math.round(weighted))),
      avgMissingRate,
    }
  }, [journeyFunnelQuery.data, pdvHealthQuery.data])

  if (!isInternalAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin SaaS</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Acesso restrito ao time interno (staff/superuser).
        </div>
      </div>
    )
  }

  const summary = summaryQuery.data
  const loading = summaryQuery.isLoading

  return (
    <div className="space-y-6">
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
              <Card title="PDV processing rate" value={formatRatioPercent(pdvHealthQuery.data?.processing_rate)} />
              <Card title="PDV failure rate" value={formatRatioPercent(pdvHealthQuery.data?.failure_rate)} />
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
