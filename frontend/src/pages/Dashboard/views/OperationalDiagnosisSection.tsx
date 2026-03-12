import { Link } from "react-router-dom"

interface OperationalDiagnosisSectionProps {
  isLoading: boolean
  reportReady: boolean
  peakHour?: string | null
  trialHoursRemaining: number
}

export function OperationalDiagnosisSection({
  isLoading,
  reportReady,
  peakHour,
  trialHoursRemaining,
}: OperationalDiagnosisSectionProps) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      {isLoading ? (
        <div className="text-sm text-gray-500">Atualizando visão executiva...</div>
      ) : reportReady ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Seu diagnóstico operacional está pronto
          </h3>
          <p className="text-sm text-gray-600">
            Identificamos gargalos e oportunidades de melhoria com base na operação real da loja.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Principal gargalo</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {peakHour
                  ? `Pico operacional às ${peakHour}`
                  : "Pico operacional em consolidação"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Oportunidade</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                Melhorar conversão com ajuste de atendimento em horários críticos.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Próximo passo</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                Revisar plano com o Copiloto e priorizar ações de execução.
              </p>
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900">
            Estamos preparando seu relatório operacional
          </h3>
          <p className="text-sm text-gray-600">
            Continuamos coletando e calibrando os dados para transformar captação em diagnóstico executivo acionável.
          </p>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Relatório operacional liberado em aproximadamente {trialHoursRemaining}h.
          </div>
        </div>
      )}
    </section>
  )
}

