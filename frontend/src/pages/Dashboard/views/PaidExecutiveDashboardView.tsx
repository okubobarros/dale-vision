import { Link } from "react-router-dom"
import { useMemo } from "react"
import type { StoreSummary } from "../../../services/stores"

interface PaidExecutiveDashboardViewProps {
  stores: StoreSummary[]
  copilotPrompts: string[]
  onOpenCopilot: (prompt?: string) => void
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
}: PaidExecutiveDashboardViewProps) {
  const summary = useMemo(() => {
    const healthy = stores.filter((store) => getStoreState(store) === "healthy").length
    const critical = stores.filter((store) => getStoreState(store) === "critical").length
    const attention = stores.filter((store) => getStoreState(store) === "attention").length
    return { healthy, attention, critical, total: stores.length }
  }, [stores])

  const primaryActions = useMemo(() => {
    const actions: Array<{ id: string; title: string; prompt: string; tone: "critical" | "attention" }> =
      []
    if (summary.critical > 0) {
      actions.push({
        id: "critical-stores",
        title: `Atuar em ${summary.critical} loja(s) com operação interrompida`,
        prompt: "Qual o plano de retomada para lojas críticas hoje?",
        tone: "critical",
      })
    }
    if (summary.attention > 0) {
      actions.push({
        id: "attention-stores",
        title: `Estabilizar ${summary.attention} loja(s) com sinal de atenção`,
        prompt: "Como estabilizar lojas em atenção com menor esforço?",
        tone: "attention",
      })
    }
    if (!actions.length) {
      actions.push({
        id: "optimize",
        title: "Operação estável: revisar oportunidades de ganho",
        prompt: "Onde posso capturar ganho de conversão hoje?",
        tone: "attention",
      })
    }
    return actions
  }, [summary.attention, summary.critical])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Resumo executivo do dia</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">O que exige sua decisão agora</h3>
            <p className="mt-1 text-sm text-gray-600">
              Use o Dashboard para contexto e a Central de Operações para execução em escala.
            </p>
          </div>
          <Link
            to="/app/operations"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Ir para Central de Operações
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Lojas saudáveis</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{summary.healthy}</p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Lojas em atenção</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{summary.attention}</p>
          </article>
          <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs text-rose-700">Lojas críticas</p>
            <p className="mt-1 text-2xl font-bold text-rose-900">{summary.critical}</p>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <h4 className="text-base font-semibold text-gray-900">Ações imediatas</h4>
          <div className="mt-3 space-y-3">
            {primaryActions.map((action) => (
              <article
                key={action.id}
                className={`rounded-xl border-l-4 p-4 ${
                  action.tone === "critical"
                    ? "border-l-red-500 bg-red-50"
                    : "border-l-amber-500 bg-amber-50"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCopilot(action.prompt)}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    Priorizar com Copiloto
                  </button>
                  <Link
                    to="/app/operations"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Executar na Central
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6 text-white">
          <h4 className="text-base font-semibold">Copiloto DALE Vision</h4>
          <p className="mt-1 text-sm text-slate-300">
            Recomendação contextual para priorização executiva da rede.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {copilotPrompts.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onOpenCopilot(prompt)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onOpenCopilot("Resumo executivo da operação hoje")}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Conversar agora
            </button>
            <Link
              to="/app/copilot"
              className="w-full rounded-lg border border-white/20 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-white/10"
            >
              Tela cheia
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}

