import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { trackJourneyEvent, trackJourneyEventOnce } from "../../services/journey"
import { meService, type ReportImpact } from "../../services/me"

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

const Upgrade = () => {
  const { data } = useQuery<ReportImpact>({
    queryKey: ["report-impact-upgrade"],
    queryFn: () => meService.getReportImpact(null, { period: "7d" }),
    staleTime: 60000,
    retry: 1,
  })

  useEffect(() => {
    void trackJourneyEventOnce("upgrade_viewed", "upgrade_viewed", { path: "/app/upgrade" })
  }, [])

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
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3 text-sm">
        <span className="font-semibold">Trial expirou.</span> Faça upgrade para reativar o
        acesso completo.
      </div>

      <section className="px-6 py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
            Plano recomendado com base no seu diagnóstico
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Transforme o trial em ganhos mensais recorrentes
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl">
            Continue com monitoramento em tempo real, alertas proativos e relatórios executivos
            para reduzir filas, ociosidade e perdas.
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
              onClick={() =>
                void trackJourneyEvent("upgrade_clicked", {
                  source: "upgrade_whatsapp",
                })
              }
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">Custo de ociosidade</div>
            <div className="text-2xl font-bold mt-2">
              {formatCurrency(data?.impact?.cost_idle)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Estimativa com base no custo/hora informado.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">Custo das filas</div>
            <div className="text-2xl font-bold mt-2">
              {formatCurrency(data?.impact?.cost_queue)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Heurística de abandono por segmento.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-xs text-emerald-700">Potencial mensal</div>
            <div className="text-2xl font-bold mt-2 text-emerald-800">
              {formatCurrency(data?.impact?.potential_monthly_estimated)}
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              Projeção do período atual para 30 dias.
            </p>
          </div>
        </div>
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
