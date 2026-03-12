import { Link } from "react-router-dom"

interface OperationalDiagnosisSectionProps {
  isLoading: boolean
  reportReady: boolean
  reportFailed?: boolean
  reportStatusDetail?: string | null
  readinessMessage?: string | null
  insights: string[]
  trialHoursRemaining: number
  onOpenCopilot?: () => void
}

export function OperationalDiagnosisSection({
  isLoading,
  reportReady,
  reportFailed = false,
  reportStatusDetail,
  readinessMessage,
  insights,
  trialHoursRemaining,
  onOpenCopilot,
}: OperationalDiagnosisSectionProps) {
  const hasStructuredInsights = insights.length > 0

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      {isLoading ? (
        <div className="text-sm text-gray-500">Atualizando visão executiva...</div>
      ) : reportReady && hasStructuredInsights ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Seu diagnóstico operacional está pronto
          </h3>
          <p className="text-sm text-gray-600">
            Identificamos gargalos e oportunidades de melhoria com base na operação real da loja.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight) => (
              <div key={insight} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mt-1 text-sm font-semibold text-gray-800">{insight}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/report"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Ver relatório completo
            </Link>
            <Link
              to="/app/upgrade"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Garantir continuidade do monitoramento
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Diagnóstico em preparação</h3>
          <p className="text-sm text-gray-600">
            {reportFailed
              ? "Houve uma falha na consolidação do diagnóstico. O Copiloto pode orientar os próximos passos."
              : "O Copiloto está consolidando sinais operacionais reais antes de liberar o relatório final."}
          </p>
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              reportFailed
                ? "border border-rose-100 bg-rose-50 text-rose-700"
                : "border border-blue-100 bg-blue-50 text-blue-800"
            }`}
          >
            {reportStatusDetail ||
              readinessMessage ||
              `Relatório operacional liberado em aproximadamente ${trialHoursRemaining}h.`}
          </div>
          {onOpenCopilot && (
            <button
              type="button"
              onClick={onOpenCopilot}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Perguntar ao Copiloto sobre o progresso
            </button>
          )}
        </div>
      )}
    </section>
  )
}
