import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { trackJourneyEvent, trackJourneyEventOnce } from "../../services/journey"
import { meService, type MeStatus, type ReportImpact } from "../../services/me"

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5511996918070&text=Quero%20fazer%20upgrade%20do%20Dale%20Vision&type=phone_number&app_absent=0"

const formatCurrency = (value?: number | null) => {
  const safe = Number.isFinite(value ?? NaN) ? Number(value) : 0
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(safe)
}

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return `${Math.round(value * 100)}%`
}

const Upgrade = () => {
  const { data: meStatus } = useQuery<MeStatus | null>({
    queryKey: ["me-status", "upgrade"],
    queryFn: meService.getStatus,
    staleTime: 60000,
    retry: 0,
  })
  const { data } = useQuery<ReportImpact>({
    queryKey: ["report-impact-upgrade"],
    queryFn: () => meService.getReportImpact(null, { period: "7d" }),
    staleTime: 60000,
    retry: 1,
  })
  const hasActiveSubscription = meStatus?.has_subscription === true
  const isTrialExpired = meStatus?.has_subscription === false && meStatus?.trial_active === false
  const isTrialActive = meStatus?.trial_active === true && meStatus?.has_subscription !== true

  useEffect(() => {
    void trackJourneyEventOnce("upgrade_viewed", "upgrade_viewed", { path: "/app/upgrade" })
  }, [])

  const proofMode = useMemo<"with_data" | "insufficient_data">(() => {
    if (!data) return "insufficient_data"
    const visitors = data.kpis?.total_visitors ?? 0
    const alerts = data.kpis?.total_alerts ?? 0
    const potential = data.impact?.potential_monthly_estimated ?? 0
    return visitors > 0 || alerts > 0 || potential > 0 ? "with_data" : "insufficient_data"
  }, [data])

  useEffect(() => {
    if (!data) return
    void trackJourneyEvent("upgrade_proof_viewed", {
      source: "upgrade_page",
      proof_mode: proofMode,
    })
    if (proofMode === "insufficient_data") {
      void trackJourneyEvent("upgrade_proof_insufficient_data_shown", {
        source: "upgrade_page",
      })
    }
  }, [data, proofMode])

  const beforeVsAfter = useMemo(() => {
    if (!data) return null
    const queueBefore = data.kpis?.avg_queue_seconds ?? 0
    const conversionBefore = data.kpis?.avg_conversion_rate ?? 0
    const riskBefore = data.impact?.cost_queue ?? 0
    return {
      queueBefore,
      queueAfter: Math.max(0, Math.round(queueBefore * 0.7)),
      conversionBefore,
      conversionAfter: Math.min(1, conversionBefore + 0.04),
      riskBefore,
      riskAfter: Math.max(0, Math.round(riskBefore * 0.65)),
    }
  }, [data])

  const actionProofCards = useMemo(() => {
    if (!data) return []
    const queueSeconds = data.kpis?.avg_queue_seconds ?? 0
    const idleCost = data.impact?.cost_idle ?? 0
    const queueCost = data.impact?.cost_queue ?? 0
    return [
      {
        title: "Abrir caixa no pico de fila",
        result: `Fila média projetada para ${Math.max(1, Math.round((queueSeconds * 0.7) / 60))} min`,
        value: formatCurrency(Math.round(queueCost * 0.35)),
      },
      {
        title: "Rebalancear equipe por janela crítica",
        result: "Redução de ociosidade operacional no turno",
        value: formatCurrency(Math.round(idleCost * 0.3)),
      },
      {
        title: "Fechar loop de alertas críticos",
        result: "Maior velocidade de resposta e menor perda invisível",
        value: formatCurrency(Math.round((queueCost + idleCost) * 0.2)),
      },
    ]
  }, [data])

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: "R$ 279/mês",
      description: "Para uma loja com operação enxuta.",
      features: [
        "1 loja",
        "Até 3 câmeras",
        "3 módulos do CEO Dashboard",
        "Relatórios semanais",
        "Alertas básicos",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "R$ 747/mês",
      description: "Produtividade e decisões diárias.",
      highlight: true,
      features: [
        "Produtividade por funcionário",
        "Alertas configuráveis",
        "Heatmap",
        "Benchmarking entre lojas",
        "WhatsApp integrado",
      ],
    },
    {
      id: "rede",
      name: "Rede",
      price: "Sob consulta",
      description: "Para redes e grupos com múltiplas lojas.",
      features: [
        "KPIs consolidados da rede",
        "Simulador de escala RH",
        "API/BI",
        "Benchmarking de mercado",
        "Account manager",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isTrialExpired && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3 text-sm">
          <span className="font-semibold">Trial expirou.</span> Faça upgrade para reativar o
          acesso completo.
        </div>
      )}
      {isTrialActive && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-900 px-6 py-3 text-sm">
          <span className="font-semibold">Trial em andamento.</span> Antecipe seu plano para não
          interromper a operação após o período de avaliação.
        </div>
      )}
      {hasActiveSubscription && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-6 py-3 text-sm">
          <span className="font-semibold">Plano ativo.</span> Esta página é para expansão de
          capacidade e upgrade de pacote.
        </div>
      )}

      <section className="px-6 py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
            {hasActiveSubscription
              ? "Plano recomendado para expansão da sua operação"
              : "Plano recomendado com base no seu diagnóstico"}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {hasActiveSubscription
              ? "Escale ganhos mensais com operação contínua"
              : "Transforme o trial em ganhos mensais recorrentes"}
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl">
            {hasActiveSubscription
              ? "Compare pacotes para ampliar cobertura de lojas, câmeras e inteligência operacional."
              : proofMode === "with_data"
              ? "Seu diagnóstico já mostrou oportunidades concretas. Faça upgrade para transformar isso em rotina operacional contínua."
              : "Ative o plano para consolidar dados operacionais, gerar prova de impacto e acelerar decisões por loja."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#plans"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
            >
              Escolha seu plano
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:border-white/60"
              onClick={() => {
                void trackJourneyEvent("upgrade_proof_cta_clicked", {
                  source: "upgrade_whatsapp_hero",
                  proof_mode: proofMode,
                })
                void trackJourneyEvent("upgrade_clicked", {
                  source: "upgrade_whatsapp",
                })
              }}
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        {proofMode === "with_data" ? (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs uppercase tracking-[0.12em] text-emerald-700">
                Prova de impacto (7 dias)
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">
                Potencial mensal estimado: {formatCurrency(data?.impact?.potential_monthly_estimated)}
              </div>
              <p className="mt-2 text-sm text-emerald-800">
                Baseado em custo de fila, ociosidade e comportamento operacional observado no período.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs text-slate-500">Fila média (antes x meta)</div>
                <div className="text-2xl font-bold mt-2">
                  {Math.max(1, Math.round((beforeVsAfter?.queueBefore ?? 0) / 60))}m →{" "}
                  {Math.max(1, Math.round((beforeVsAfter?.queueAfter ?? 0) / 60))}m
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs text-slate-500">Conversão (antes x meta)</div>
                <div className="text-2xl font-bold mt-2">
                  {formatPercent(beforeVsAfter?.conversionBefore)} →{" "}
                  {formatPercent(beforeVsAfter?.conversionAfter)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs text-slate-500">Risco de fila (antes x meta)</div>
                <div className="text-2xl font-bold mt-2">
                  {formatCurrency(beforeVsAfter?.riskBefore)} → {formatCurrency(beforeVsAfter?.riskAfter)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Ações que geraram resultado</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {actionProofCards.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-700">{item.title}</div>
                    <div className="mt-2 text-sm text-slate-600">{item.result}</div>
                    <div className="mt-3 text-lg font-bold text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-900">Dados ainda insuficientes para prova completa</div>
            <p className="mt-2 text-sm text-amber-800">
              Para gerar prova de impacto robusta, complete estes passos: conectar edge, ativar pelo menos 1 câmera com saúde estável e operar por alguns dias com alertas ativos.
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-amber-300 bg-white p-3">1. Concluir setup edge e heartbeat recente.</div>
              <div className="rounded-xl border border-amber-300 bg-white p-3">2. Garantir câmera saudável e eventos operacionais.</div>
              <div className="rounded-xl border border-amber-300 bg-white p-3">3. Registrar ações para medir melhoria e ROI.</div>
            </div>
          </div>
        )}
      </section>

      <section id="plans" className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Planos Dale Vision</h2>
            <p className="text-sm text-slate-600 mt-2">
              Escolha o plano que melhor atende sua operação e escale com confiança.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl border p-6 shadow-sm ${
                  plan.highlight
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Mais escolhido
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold mt-3">{plan.price}</div>
                <p className="text-sm text-slate-600 mt-2">{plan.description}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void trackJourneyEvent("upgrade_proof_cta_clicked", {
                      source: "upgrade_plan_card",
                      plan_id: plan.id,
                      proof_mode: proofMode,
                    })
                    void trackJourneyEvent("upgrade_clicked", {
                      plan_id: plan.id,
                      source: "upgrade_plan_card",
                    })
                    window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")
                  }}
                  className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "border border-slate-300 text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Quero esse plano
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Upgrade
