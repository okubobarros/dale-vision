// src/pages/Analytics/Analytics.tsx
const Analytics = () => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-1">Análises avançadas e insights detalhados</p>
        </div>
        <div className="flex space-x-4 items-center">
          <div>
            <label htmlFor="period" className="sr-only">
              Selecionar período
            </label>
            <select
              id="period"
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
              <option>Últimos 90 dias</option>
            </select>
          </div>

          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
            Exportar Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Total de Visitantes', value: '12,458', change: '+12.5%' },
          { title: 'Taxa de Conversão', value: '67.8%', change: '+4.2%' },
          { title: 'Ticket Médio', value: 'R$ 142.50', change: '+8.3%' },
        ].map((metric, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{metric.title}</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold text-gray-800 mr-2">{metric.value}</span>
              <span className={`text-sm font-medium ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Evolução de Métricas</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico de evolução (em desenvolvimento)</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Comparativo entre Lojas</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico comparativo (em desenvolvimento)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;