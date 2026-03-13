import { useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { storesService, type StoreOverviewCamera, type StoreOverview } from "../../services/stores"
import { copilotService } from "../../services/copilot"

const ONLINE_MAX_AGE_SEC = 120

type StoreTab = "overview" | "cameras" | "infrastructure"

const STORE_TABS: Array<{ key: StoreTab; label: string }> = [
  { key: "overview", label: "Decisão" },
  { key: "cameras", label: "Operação Visual" },
  { key: "infrastructure", label: "Infra TI" },
]

const isRecent = (iso?: string | null, maxAgeSec = ONLINE_MAX_AGE_SEC) => {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const diffSec = (Date.now() - date.getTime()) / 1000
  return diffSec >= 0 && diffSec <= maxAgeSec
}

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  if (value < 60) return `${value}s`
  const minutes = Math.round(value / 60)
  return `${minutes}m`
}

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return `${Math.round(value * 100)}%`
}

const formatCurrencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value))
}

const formatHourLabel = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

const estimatePlannedCoverage = (footfall: number) => {
  if (footfall >= 55) return 4
  if (footfall >= 35) return 3
  if (footfall >= 18) return 2
  return 1
}

const severityColor = (severity?: string | null) => {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700"
    case "warning":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-blue-100 text-blue-700"
  }
}

const statusLabel = (status?: string | null) =>
  status === "active"
    ? "Ativa"
    : status === "trial"
    ? "Trial"
    : status === "blocked"
    ? "Bloqueada"
    : "Inativa"

const statusClass = (status?: string | null) =>
  status === "active"
    ? "bg-green-100 text-green-800"
    : status === "trial"
      ? "bg-yellow-100 text-yellow-800"
      : status === "blocked"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800"

const toCameraPresentationName = (camera: StoreOverviewCamera, index: number) => {
  const candidate = (camera.name || "").trim()
  if (!candidate) return `Câmera ${index + 1}`
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidLike.test(candidate)) return `Câmera ${index + 1}`
  return candidate
}

const cameraStatusText = (status?: string | null) => {
  const normalized = (status || "").toLowerCase()
  if (normalized === "online" || normalized === "degraded") return "Ativa"
  if (normalized === "offline") return "Indisponível"
  return "Em validação"
}

const cameraStatusClass = (status?: string | null) => {
  const normalized = (status || "").toLowerCase()
  if (normalized === "online" || normalized === "degraded") return "bg-green-100 text-green-700"
  if (normalized === "offline") return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

const storeImagePlaceholder = (name: string) => {
  const letter = (name.trim().charAt(0) || "L").toUpperCase()
  return { letter, label: "Imagem da loja em configuração" }
}

const StoreDetails = () => {
  const queryClient = useQueryClient()
  const params = useParams()
  const storeId = params.storeId || params.id
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: StoreTab = STORE_TABS.some((tab) => tab.key === tabParam)
    ? (tabParam as StoreTab)
    : "overview"

  const {
    data,
    isLoading,
    error,
  } = useQuery<StoreOverview>({
    queryKey: ["store-overview", storeId],
    queryFn: () => storesService.getStoreOverview(String(storeId)),
    enabled: Boolean(storeId),
  })

  const metrics = data?.metrics_summary?.totals
  const trafficSeries = useMemo(
    () => data?.metrics_summary?.series?.traffic ?? [],
    [data?.metrics_summary?.series?.traffic]
  )
  const conversionSeries = useMemo(
    () => data?.metrics_summary?.series?.conversion ?? [],
    [data?.metrics_summary?.series?.conversion]
  )
  const cameras = useMemo(() => data?.cameras ?? [], [data?.cameras])
  const employees = data?.employees ?? []
  const alerts = data?.last_alerts ?? []
  const [staffWeeklyInput, setStaffWeeklyInput] = useState<number | null>(null)
  const [staffSaveMessage, setStaffSaveMessage] = useState<string>("")
  const staffWeeklyValue = staffWeeklyInput ?? Math.max(0, Number(data?.store?.employees_count || 0))

  const camerasOnline = useMemo(
    () =>
      cameras.filter((cam) =>
        ["online", "degraded"].includes(String(cam.status || "").toLowerCase())
      ).length,
    [cameras]
  )

  const lastSeenAt = data?.edge_health?.last_seen_at || null
  const edgeOnline = isRecent(lastSeenAt)
  const edgeStatusLabel = edgeOnline ? "Operação conectada" : "Conexão indisponível"
  const edgeStatusClass = edgeOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
  const placeholder = storeImagePlaceholder(data?.store?.name || "Loja")
  const operationalSeries = useMemo(() => {
    const conversionByBucket = new Map(
      conversionSeries.map((item) => [item.ts_bucket || "", item.staff_active_est])
    )
    return trafficSeries
      .map((item) => {
        const bucket = item.ts_bucket || ""
        const detected = Math.max(0, Math.round(conversionByBucket.get(bucket) || 0))
        const planned = estimatePlannedCoverage(item.footfall)
        return {
          bucket,
          label: formatHourLabel(bucket),
          footfall: Math.max(0, Math.round(item.footfall || 0)),
          planned,
          detected,
          gap: Math.max(0, planned - detected),
        }
      })
      .slice(-10)
  }, [conversionSeries, trafficSeries])
  const operationalSummary = useMemo(() => {
    if (!operationalSeries.length) {
      return {
        totalGaps: 0,
        criticalWindows: 0,
        peakGapLabel: "—",
      }
    }
    const totalGaps = operationalSeries.reduce((acc, item) => acc + item.gap, 0)
    const criticalWindows = operationalSeries.filter((item) => item.gap >= 2).length
    const peakGap = operationalSeries.reduce((acc, item) => (item.gap > acc.gap ? item : acc), operationalSeries[0])
    return {
      totalGaps,
      criticalWindows,
      peakGapLabel: `${peakGap.label} (${peakGap.gap})`,
    }
  }, [operationalSeries])
  const shiftActionPlan = useMemo(() => {
    const queueSeconds = metrics?.avg_queue_seconds ?? 0
    const conversion = metrics?.avg_conversion_rate ?? 0
    const actions: Array<{ title: string; detail: string; priority: "Alta" | "Média" | "Base" }> = []

    if (operationalSummary.criticalWindows > 0) {
      actions.push({
        title: `Reforçar cobertura na janela ${operationalSummary.peakGapLabel}`,
        detail: "Realocar equipe no pico de lacuna para reduzir risco imediato de abandono de fila.",
        priority: "Alta",
      })
    }

    if (queueSeconds >= 120) {
      actions.push({
        title: "Abrir intervenção de fila no próximo ciclo",
        detail: `Fila média em ${formatSeconds(queueSeconds)} exige ajuste tático no atendimento.`,
        priority: "Alta",
      })
    } else {
      actions.push({
        title: "Manter ritmo de atendimento",
        detail: "Fila sob controle, monitorar desvio acima de 2 minutos.",
        priority: "Média",
      })
    }

    if (conversion <= 0.12) {
      actions.push({
        title: "Ativar abordagem comercial nas áreas quentes",
        detail: "Conversão abaixo da meta; alinhar equipe para captar fluxo com maior intenção.",
        priority: "Média",
      })
    } else {
      actions.push({
        title: "Preservar padrão de conversão atual",
        detail: "Operação em nível aceitável; focar em consistência por turno.",
        priority: "Base",
      })
    }

    return actions.slice(0, 3)
  }, [metrics?.avg_conversion_rate, metrics?.avg_queue_seconds, operationalSummary.criticalWindows, operationalSummary.peakGapLabel])
  const visitorsPerDay = (metrics?.total_visitors ?? 0) / 7
  const estimatedRevenueRiskToday = useMemo(() => {
    const queueSeconds = metrics?.avg_queue_seconds ?? 0
    const conversionRate = metrics?.avg_conversion_rate ?? 0
    const potentialLostCustomers = visitorsPerDay * Math.min(0.22, queueSeconds / 600)
    const estimatedTicket = 120
    const value = potentialLostCustomers * estimatedTicket * Math.max(0.45, 1 - conversionRate)
    return Math.round(Math.max(0, value))
  }, [metrics?.avg_conversion_rate, metrics?.avg_queue_seconds, visitorsPerDay])
  const chiefDirective = useMemo(() => {
    if (!edgeOnline) {
      return "Recupere a conexão da operação agora para voltar a priorizar equipe por janela crítica."
    }
    if (operationalSummary.criticalWindows > 0) {
      return `Realocar equipe na janela ${operationalSummary.peakGapLabel} para reduzir perda por fila ainda neste turno.`
    }
    return "Manter cobertura atual e monitorar apenas desvios de fila acima de 2 minutos."
  }, [edgeOnline, operationalSummary.criticalWindows, operationalSummary.peakGapLabel])
  const conversionTarget = 0.15
  const conversionGap = (metrics?.avg_conversion_rate ?? 0) - conversionTarget

  const setTab = (tab: StoreTab) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", tab)
    setSearchParams(next)
  }
  const openCopilot = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent("dv-open-copilot", prompt ? { detail: { prompt } } : undefined)
    )
  }

  const staffMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error("Loja inválida para atualização.")
      return storesService.updateStore(String(storeId), { employees_count: staffWeeklyValue })
    },
    onSuccess: async () => {
      setStaffSaveMessage("Staff semanal atualizado com sucesso.")
      setStaffWeeklyInput(staffWeeklyValue)
      await queryClient.invalidateQueries({ queryKey: ["store-overview", storeId] })
      await queryClient.invalidateQueries({ queryKey: ["reports-coverage"] })
    },
    onError: (mutationError) => {
      setStaffSaveMessage(`Falha ao atualizar staff semanal: ${(mutationError as Error).message}`)
    },
  })

  const saveWeeklyStaff = () => {
    setStaffSaveMessage("")
    staffMutation.mutate()
  }

  const copilotStaffMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error("Loja inválida para atualização.")
      return copilotService.updateStaffPlan(String(storeId), {
        staff_planned_week: staffWeeklyValue,
        reason: "Ajuste operacional semanal informado pela loja",
        source: "store_view_staff_pre_erp",
      })
    },
    onSuccess: async () => {
      setStaffSaveMessage("Copiloto atualizou o staff semanal no banco com sucesso.")
      await queryClient.invalidateQueries({ queryKey: ["store-overview", storeId] })
      await queryClient.invalidateQueries({ queryKey: ["reports-coverage"] })
      openCopilot(
        `Confirme o impacto do novo staff semanal (${staffWeeklyValue}) na aderencia operacional da loja ${data?.store?.name}.`
      )
    },
    onError: (mutationError) => {
      setStaffSaveMessage(`Falha na atualização via Copiloto: ${(mutationError as Error).message}`)
    },
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Erro ao carregar detalhes: {(error as Error).message}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg">
          Nenhum dado disponível para esta loja.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Cockpit executivo da unidade</p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1 tracking-tight">
              {data.store.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {data.store.city || "Cidade"}{data.store.state ? `, ${data.store.state}` : ""}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${statusClass(
              data.store.status
            )}`}
          >
            {statusLabel(data.store.status)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-lg font-semibold text-gray-700">
                {placeholder.letter}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{data.store.name}</p>
                <p className="text-xs text-slate-500">{placeholder.label}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              A imagem da fachada melhora identificação rápida da unidade para gestão remota.
            </p>
          </article>

          <article className="lg:col-span-2 rounded-xl border border-slate-800/60 bg-[#111827] p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-200">Copiloto Chief of Staff</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Diretriz executiva da unidade</h2>
            <p className="mt-2 text-sm text-slate-100 leading-relaxed">{chiefDirective}</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="text-slate-300">Receita em risco hoje</p>
                <p className="mt-1 text-base font-semibold text-rose-300">
                  {formatCurrencyBRL(estimatedRevenueRiskToday)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="text-slate-300">Janela crítica</p>
                <p className="mt-1 text-base font-semibold text-amber-200">{operationalSummary.peakGapLabel}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="text-slate-300">Fila média atual</p>
                <p className="mt-1 text-base font-semibold text-slate-100">{formatSeconds(metrics?.avg_queue_seconds)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  openCopilot(
                    `Aprove intervenção imediata na loja ${data.store.name}: realocar equipe na janela ${operationalSummary.peakGapLabel} para reduzir perda estimada de ${formatCurrencyBRL(estimatedRevenueRiskToday)} hoje.`
                  )
                }
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
              >
                Aprovar intervenção
              </button>
              <button
                type="button"
                onClick={() =>
                  openCopilot(
                    `Monte uma mensagem de delegação para o gerente da loja ${data.store.name} com foco em fila, cobertura e conversão para esta janela crítica.`
                  )
                }
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
              >
                Delegar ao gerente
              </button>
              <Link
                to={`/app/copilot?store_id=${data.store.id}`}
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:brightness-95"
              >
                Abrir plano no Copiloto
              </Link>
            </div>
          </article>
        </div>

        <div className="mt-5 inline-flex gap-2 rounded-xl border border-slate-200 bg-white p-1 w-fit">
          {STORE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">Receita em risco hoje</div>
              <div className="text-2xl font-semibold text-rose-600 mt-2 tracking-tight">
                {formatCurrencyBRL(estimatedRevenueRiskToday)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Estimativa por fila, cobertura e conversão do período.
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">Fila média do turno</div>
              <div className="text-2xl font-semibold text-slate-800 mt-2 tracking-tight">
                {formatSeconds(metrics?.avg_queue_seconds)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Janela crítica: {operationalSummary.peakGapLabel}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">Conversão vs meta</div>
              <div className="text-2xl font-semibold text-slate-800 mt-2 tracking-tight">
                {formatPercent(metrics?.avg_conversion_rate)}
              </div>
              <div className={`text-xs mt-1 ${conversionGap >= 0 ? "text-emerald-600" : "text-amber-700"}`}>
                {conversionGap >= 0 ? "Acima da meta de 15%" : "Abaixo da meta de 15%"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
            Contexto de base: {metrics?.total_visitors ?? 0} visitantes no período, permanência média{" "}
            {formatSeconds(metrics?.avg_dwell_seconds)}.
            Métricas detalhadas permanecem disponíveis na trilha de relatórios.
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Aderência operacional</h2>
                <p className="text-sm text-gray-600">
                  Fluxo de clientes vs cobertura da equipe por janela operacional.
                </p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Fase v1 preparatória
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Lacunas acumuladas</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 tracking-tight">{operationalSummary.totalGaps}</p>
                <p className="text-xs text-slate-500 mt-1">Diferença entre cobertura necessária e detectada</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Janelas críticas</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 tracking-tight">{operationalSummary.criticalWindows}</p>
                <p className="text-xs text-slate-500 mt-1">Faixas com equipe abaixo do mínimo de referência</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Maior desvio</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 tracking-tight">{operationalSummary.peakGapLabel}</p>
                <p className="text-xs text-slate-500 mt-1">Janela prioritária para ajuste por exceção</p>
              </article>
            </div>

            <div className="mt-4 rounded-lg border border-slate-100">
              <div className="grid grid-cols-[72px_repeat(4,minmax(0,1fr))] bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                <span>Hora</span>
                <span>Fluxo</span>
                <span>Planejado*</span>
                <span>Detectado*</span>
                <span>Lacuna</span>
              </div>
              {operationalSeries.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500">
                  Sem base horária suficiente para leitura de aderência nesta loja.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {operationalSeries.map((entry) => (
                    <div
                      key={entry.bucket}
                      className={`grid grid-cols-[72px_repeat(4,minmax(0,1fr))] items-center px-3 py-2 text-sm ${
                        entry.gap > 0 ? "bg-red-50/40" : "bg-white"
                      }`}
                    >
                      <span className="font-medium text-slate-700">{entry.label}</span>
                      <span className="text-slate-700">{entry.footfall}</span>
                      <span className="text-slate-700">{entry.planned}</span>
                      <span className="text-slate-700">{entry.detected}</span>
                      <span
                        className={`font-semibold ${
                          entry.gap >= 2 ? "text-red-700" : entry.gap === 1 ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {entry.gap === 0 ? "OK" : `-${entry.gap}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Planejado e Detectado estao em modo de referencia operacional nesta fase. Integracao com escala oficial e ajuste por excecao serao habilitados na proxima etapa.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Staff semanal planejado (pre-ERP)</h2>
                <p className="text-sm text-gray-600">
                  Atualize a referencia semanal da equipe para melhorar a leitura de cobertura.
                </p>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Entrada manual v1
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-gray-600">Staff planejado da semana</label>
                <input
                  type="number"
                  min={0}
                  value={staffWeeklyValue}
                  onChange={(event) => setStaffWeeklyInput(Math.max(0, Number(event.target.value || 0)))}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={saveWeeklyStaff}
                disabled={staffMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {staffMutation.isPending ? "Salvando..." : "Salvar staff semanal"}
              </button>
              <button
                type="button"
                onClick={() => copilotStaffMutation.mutate()}
                disabled={copilotStaffMutation.isPending}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {copilotStaffMutation.isPending ? "Copiloto atualizando..." : "Copiloto atualizar no banco"}
              </button>
            </div>

            {staffSaveMessage && (
              <div className="mt-3 text-xs text-gray-600">{staffSaveMessage}</div>
            )}

            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Esta referencia manual alimenta o contrato de cobertura em <span className="font-mono">/productivity/coverage</span> ate a integracao ERP/WFM.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-800">Plano executivo do turno</h2>
                <button
                  type="button"
                  onClick={() =>
                    openCopilot(
                      `Gere plano tático do turno para a loja ${data.store.name} com foco em fila, cobertura e conversão nas próximas 2 horas.`
                    )
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Executar com Copiloto
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {shiftActionPlan.map((action, index) => (
                  <article key={`${action.title}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{index + 1}. {action.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          action.priority === "Alta"
                            ? "bg-rose-100 text-rose-700"
                            : action.priority === "Média"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {action.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{action.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-800">Sinais críticos recentes</h2>
                <Link
                  to={`/app/alerts?store_id=${data.store.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Ver todos
                </Link>
              </div>
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500 mt-3">Sem alertas recentes.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {alerts.map((alert) => (
                    <li key={alert.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">
                          {alert.title || "Alerta operacional"}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-semibold ${severityColor(
                            alert.severity
                          )}`}
                        >
                          {(alert.severity || "info").toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {alert.occurred_at ? new Date(alert.occurred_at).toLocaleString("pt-BR") : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "cameras" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Operação visual da unidade</h2>
              <p className="text-sm text-gray-600">Diagnóstico por ponto de cobertura e execução</p>
            </div>
            <span className="text-xs text-gray-500">{cameras.length} câmeras</span>
          </div>

          {cameras.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              Nenhuma câmera cadastrada para esta loja.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cameras.map((camera, index) => (
                <article key={camera.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {toCameraPresentationName(camera, index)}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${cameraStatusClass(
                        camera.status
                      )}`}
                    >
                      {cameraStatusText(camera.status)}
                    </span>
                  </div>

                  {camera.last_snapshot_url ? (
                    <img
                      src={camera.last_snapshot_url}
                      alt={`Snapshot ${toCameraPresentationName(camera, index)}`}
                      className="mt-3 h-28 w-full rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="mt-3 h-28 w-full rounded-lg border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-500">
                      Snapshot indisponível
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500">
                    Última atividade:{" "}
                    {camera.last_seen_at ? new Date(camera.last_seen_at).toLocaleString("pt-BR") : "—"}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <Link
                      to={`/app/alerts?store_id=${data.store.id}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Diagnóstico
                    </Link>
                    <Link
                      to={`/app/cameras?store_id=${data.store.id}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Configurar ROI
                    </Link>
                    <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                      <div className="mt-2 space-y-1 text-xs text-gray-600 font-mono break-all">
                        <div>ID: {camera.id}</div>
                        <div>Zona: {camera.zone_id || "—"}</div>
                        <div>Status bruto: {camera.status || "unknown"}</div>
                        <div>Erro: {camera.last_error || "—"}</div>
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "infrastructure" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-800">Infraestrutura técnica da loja</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Status do Edge</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${edgeStatusClass}`}>
                  {edgeStatusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Último heartbeat</span>
                <span className="text-gray-600">
                  {lastSeenAt ? new Date(lastSeenAt).toLocaleString("pt-BR") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Câmeras ativas</span>
                <span className="font-semibold text-gray-900">{camerasOnline}/{cameras.length}</span>
              </div>
              {data.edge_health?.last_error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-xs">
                  Último erro registrado: {data.edge_health.last_error}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-800">Equipe vinculada</h2>
            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 mt-3">Nenhum funcionário ativo.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {employees.map((employee) => (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between text-sm text-gray-700"
                  >
                    <span className="font-medium">{employee.full_name}</span>
                    <span className="text-gray-500">{employee.role || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StoreDetails
