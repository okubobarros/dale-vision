const Alerts = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Nome da Página</h1>
        <p className="text-gray-600 mt-1">Descrição da funcionalidade</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          {/* Ícone */}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Em Construção</h3>
        <p className="text-gray-500">
          Esta funcionalidade está em desenvolvimento e estará disponível em breve.
        </p>
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Placeholders para conteúdo futuro */}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Alerts;