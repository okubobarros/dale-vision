import { useMemo, useState } from "react"

const Analytics = () => {
  const [period, setPeriod] = useState("7d")

  const periodLabel = useMemo(() => {
    switch (period) {
      case "30d":
        return "Últimos 30 dias"
      case "90d":
        return "Últimos 90 dias"
      default:
        return "Últimos 7 dias"
    }
  }, [period])

  const metrics = [
    { title: "Total de Visitantes", value: "0", change: "0%" },
    { title: "Taxa de Conversão", value: "0%", change: "0%" },
    { title: "Ticket Médio", value: "R$ 0,00", change: "0%" },
  ]

  return (
    <div className="space-y-6">
      {/* Header mobile-first */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-1">Análises avançadas e insights detalhados</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="period" className="sr-only">
            Selecionar período
          </label>

          <select
            id="period"
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2"
            aria-label="Selecionar período"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          <button
            type="button"
            disabled
            className="w-full sm:w-auto bg-blue-500/70 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
          >
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {metric.title}
            </h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold text-gray-800 mr-2">
                {metric.value}
              </span>
              <span
                className="text-sm font-medium text-gray-400"
              >
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Conecte sua loja para liberar analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Assim que câmeras e edge estiverem online, mostramos insights do período selecionado.
            </p>
            <p className="text-xs text-gray-400 mt-2">Período atual: {periodLabel}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="/app/stores"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Conectar loja
            </a>
            <a
              href="/app/cameras"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Conectar câmeras
            </a>
          </div>
        </div>
      </div>

      {/* Blocos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Evolução de Métricas
          </h3>
          <div className="h-[260px] sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Sem dados disponíveis</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Comparativo entre Lojas
          </h3>
          <div className="h-[260px] sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Sem dados disponíveis</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
