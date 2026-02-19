const EdgeHelp = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Diagnose do Edge
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Use este guia quando a câmera não conecta ou o IP não responde.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3 text-sm text-gray-700">
        <div className="font-semibold text-gray-900">Passo a passo</div>
        <div>1. Abra a pasta do Edge Agent no computador da loja.</div>
        <div>
          2. Dê duplo clique em <span className="font-mono">Diagnose.bat</span>.
        </div>
        <div>
          3. Aguarde a janela terminar e gerar o arquivo ZIP de diagnóstico.
        </div>
        <div>
          4. Envie o ZIP para o suporte (ou anexe no WhatsApp).
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-sm text-blue-900">
        <div className="font-semibold">Dica rápida</div>
        <p className="mt-2">
          Se o Windows bloquear a execução, clique em “Mais informações” e
          depois “Executar assim mesmo”.
        </p>
      </div>
    </div>
  )
}

export default EdgeHelp
