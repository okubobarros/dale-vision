import { Link } from "react-router-dom"
import type { StoreSummary } from "../../../services/stores"

interface PaidExecutiveDashboardViewProps {
  stores: StoreSummary[]
  copilotPrompts: string[]
  onOpenCopilot: (prompt?: string) => void
}

export function PaidExecutiveDashboardView({
  stores,
  copilotPrompts,
  onOpenCopilot,
}: PaidExecutiveDashboardViewProps) {
  const rankedStores = stores
    .slice()
    .sort((a, b) => {
      const score = (store: StoreSummary) =>
        store.status === "active"
          ? 3
          : store.status === "trial"
          ? 2
          : store.status === "blocked"
          ? 1
          : 0
      return score(b) - score(a)
    })
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Resumo de execução da operação
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Foque em gargalos, prioridade de lojas e decisões de execução da rede.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/app/report"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Revisar relatório executivo
            </Link>
            <button
              type="button"
              onClick={() => onOpenCopilot()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Revisar com o Copiloto
            </button>
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">
              Prioridade operacional da rede
            </h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>• Revise lojas com sinais de atenção antes do próximo pico.</li>
              <li>• Priorize ações de conversão nas unidades com maior fluxo.</li>
              <li>• Use o Copiloto para transformar alertas em plano de execução.</li>
            </ul>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900">Copiloto DaleVision</h3>
          <p className="mt-1 text-sm text-gray-600">
            Recomendações acionáveis para direção de operações.
          </p>
          <div className="mt-3 space-y-2">
            {copilotPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onOpenCopilot(prompt)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900">Resumo da rede</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-xs text-emerald-700">Saudáveis</div>
              <div className="mt-1 text-lg font-semibold text-emerald-800">
                {stores.filter((store) => store.status === "active").length}
              </div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <div className="text-xs text-amber-700">Atenção</div>
              <div className="mt-1 text-lg font-semibold text-amber-800">
                {stores.filter((store) => store.status === "trial").length}
              </div>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <div className="text-xs text-rose-700">Críticas</div>
              <div className="mt-1 text-lg font-semibold text-rose-800">
                {stores.filter((store) => store.status === "blocked").length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900">Ranking de lojas</h3>
          <div className="mt-3 space-y-2">
            {rankedStores.map((store, idx) => (
              <div
                key={store.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="text-sm text-gray-800">
                  {idx + 1}. {store.name}
                </div>
                <div className="text-xs font-semibold text-gray-600">
                  {store.status === "active"
                    ? "Operando"
                    : store.status === "trial"
                    ? "Em setup"
                    : store.status === "blocked"
                    ? "Crítica"
                    : "Sem status"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

