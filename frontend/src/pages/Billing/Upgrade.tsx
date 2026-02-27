const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5511996918070&text&type=phone_number&app_absent=0"

const Upgrade = () => {
  return (
    <div className="p-6 space-y-10">
      {/* HEADER COM CONTEXTO DE MERCADO */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 sm:p-10 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white border border-blue-400/30">
              📉 MERCADO DESAFIADOR • CRESCIMENTO DO VAREJO DE APENAS 0,56% EM 2026 [citation:8]
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold">
              Enquanto o varejo desacelera, eficiência vira a única alavanca de lucro real
            </h1>
            <p className="mt-3 text-base text-blue-100 max-w-xl">
              Com margens apertadas e 30% de imposto sobre o lucro, cada real economizado vale mais que um real faturado. A DaleVision entrega eficiência que vira resultado líquido.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="#checkout"
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 shadow-md"
              >
                Ver planos e economia
              </a>
              <button
                type="button"
                onClick={() =>
                  window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")
                }
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-transparent backdrop-blur-sm px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Falar com especialista
              </button>
            </div>
          </div>

          {/* ALERTA DE INEFICIÊNCIA DIGITAL */}
          <div className="w-full lg:w-[380px] rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6">
            <div className="text-sm font-semibold text-white/80">
              ⚠️ Ineficiência digital ameaça até 25% do faturamento
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-red-300">•</span>
                <span>Processos manuais e desconectados corroem de <strong>10% a 20% do faturamento</strong> das empresas [citation:7]</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-red-300">•</span>
                <span>Empresas com automação integrada reduzem custos operacionais em até <strong>50%</strong> [citation:7]</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-red-300">•</span>
                <span>Taxa de conversão pode aumentar <strong>30% a 40%</strong> com integração de dados [citation:7]</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARGUMENTOS ESTRUTURADOS POR CATEGORIA */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA 1: DORES DO MULTILOJISTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">😟</span> Principais dores que você elimina
          </h2>
          
          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">🔍</div>
              <div>
                <h3 className="font-semibold text-gray-900">Visão cega das lojas</h3>
                <p className="text-sm text-gray-600 mt-1">Dono não vê em tempo real o que acontece em cada ponto de venda, só recebe dados "amassados" no final do mês. Decisão baseada em achismo, não em dados.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">📦</div>
              <div>
                <h3 className="font-semibold text-gray-900">Ruptura não percebida</h3>
                <p className="text-sm text-gray-600 mt-1">Perda de vendas por falta de estoque em prateleira. Estudo da USP mostra que políticas otimizadas de reposição podem <strong>reduzir estoques em 19%</strong> sem perder vendas [citation:3].</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">💰</div>
              <div>
                <h3 className="font-semibold text-gray-900">Shrinkage invisível</h3>
                <p className="text-sm text-gray-600 mt-1">Furtos, devoluções abusivas e fraudes internas difíceis de rastrear. Impacto típico de <strong>3% a 8% do faturamento</strong> em perdas não detectadas.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">👥</div>
              <div>
                <h3 className="font-semibold text-gray-900">Equipe mal alocada</h3>
                <p className="text-sm text-gray-600 mt-1">Atendente ocioso em área vazia enquanto fila grande se forma no caixa. Sem monitoramento de fluxo, você paga hora parada e perde venda por espera.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">📝</div>
              <div>
                <h3 className="font-semibold text-gray-900">Processos manuais e lentos</h3>
                <p className="text-sm text-gray-600 mt-1">Contagem de estoque, checagem de merchandising, relatórios de vendas dependem de papéis e planilhas. Horas de trabalho que deveriam ser automáticas.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* COLUNA 2: GANHOS QUE A DALEVISION ENTREGA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">✅</span> Ganhos operacionais e de gestão
          </h2>
          
          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">📱</div>
              <div>
                <h3 className="font-semibold text-gray-900">Gestão remota em tempo real</h3>
                <p className="text-sm text-gray-600 mt-1">Veja prateleiras, fluxo de clientes, estoque e ocupação de caixa de qualquer loja pelo celular. Dashboards por unidade sem depender de relatório.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">🤖</div>
              <div>
                <h3 className="font-semibold text-gray-900">Automação de tarefas operacionais</h3>
                <p className="text-sm text-gray-600 mt-1">Contagem rápida de estoque, detecção de ruptura, alerta de prateleira vazia, checagem de layout e preço automáticos. Fim das planilhas manuais.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">⚡</div>
              <div>
                <h3 className="font-semibold text-gray-900">Melhor alocação de equipe</h3>
                <p className="text-sm text-gray-600 mt-1">Identifique filas e áreas de alta permanência. Direcione atendentes para onde há mais demanda. <strong>Aumento de conversão e ticket médio na prática.</strong></p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">🏆</div>
              <div>
                <h3 className="font-semibold text-gray-900">Padronização entre lojas</h3>
                <p className="text-sm text-gray-600 mt-1">Garanta que merchandising, preço e exposição estejam iguais em todas as unidades. Sem depender de report manual de gerentes.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">📊</div>
              <div>
                <h3 className="font-semibold text-gray-900">Comunicação mais eficiente</h3>
                <p className="text-sm text-gray-600 mt-1">Relatórios automáticos com IA (o que está ruim em cada loja) e fluxos de tarefas integrados a WhatsApp/ERP/mobile.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ECONOMIAS E GANHOS FINANCEIROS */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">💰</span> Economias e ganhos financeiros comprovados
        </h2>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">-19%</div>
            <div className="text-sm font-medium text-gray-800 mt-1">Redução de estoques</div>
            <div className="text-xs text-gray-600 mt-1">Sem comprometer nível de atendimento [citation:3]</div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-700">3% a 8%</div>
            <div className="text-sm font-medium text-gray-800 mt-1">Redução de shrinkage</div>
            <div className="text-xs text-gray-600 mt-1">Detecção de furtos e fraudes</div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">15-20%</div>
            <div className="text-sm font-medium text-gray-800 mt-1">Eficiência operacional</div>
            <div className="text-xs text-gray-600 mt-1">Ganho com otimização de escala [citation:7]</div>
          </div>
          
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="text-2xl font-bold text-amber-700">30-40%</div>
            <div className="text-sm font-medium text-gray-800 mt-1">Aumento de conversão</div>
            <div className="text-xs text-gray-600 mt-1">Com integração de dados [citation:7]</div>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">➕ Menos horas de trabalho manual</span>
              <p className="text-xs text-gray-500 mt-1">Menos contagem física, menos report por papel, menos viagens de supervisão</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">💰 Economia com equipe</span>
              <p className="text-xs text-gray-500 mt-1">Otimização de escala com ganhos de até 20%</p>
            </div>
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Tudo isso com 30% menos impostos sobre o lucro real
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIÊNCIA DO CLIENTE E COMPETITIVIDADE */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 col-span-1">
          <div className="text-3xl mb-3">😊</div>
          <h3 className="font-semibold text-gray-900">Melhor experiência em loja</h3>
          <p className="text-sm text-gray-600 mt-2">Mais atendentes disponíveis onde o cliente está, menos fila, menos falta de produto, layout ajustado com base em fluxo real.</p>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 col-span-1">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold text-gray-900">Personalização inteligente</h3>
          <p className="text-sm text-gray-600 mt-2">Entenda padrão de fluxo, áreas de alta permanência e teste produtos em zonas quentes para maximizar conversão.</p>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 col-span-1">
          <div className="text-3xl mb-3">🏆</div>
          <h3 className="font-semibold text-gray-900">Vantagem competitiva</h3>
          <p className="text-sm text-gray-600 mt-2">Use IA visual como diferencial em relação a concorrente tradicional. Mostre que seu negócio é "data-driven" e moderno.</p>
        </div>
      </section>

      {/* CALCULADORA DE ROI COM IMPOSTOS */}
      <section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900">Simulação: o valor real da eficiência (já com 30% de imposto)</h2>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Faturamento médio mensal (referência)</span>
              <span className="font-bold">R$ 150.000</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm text-gray-700">Ganho com eficiência (ociosidade)</span>
              <span className="font-bold text-green-700">+ R$ 3.000</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-gray-700">Ganho com vendas (conversão)</span>
              <span className="font-bold text-blue-700">+ R$ 6.750</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Investimento DaleVision</span>
              <span className="font-medium text-gray-800">- R$ 279 a R$ 1.995</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-100 rounded-lg border border-purple-300">
              <span className="text-sm font-bold text-gray-800">IMPACTO LÍQUIDO MENSAL</span>
              <span className="text-xl font-bold text-purple-800">+ R$ 9.260</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col justify-center">
            <div className="text-3xl font-bold text-gray-900">1.800%</div>
            <div className="text-sm text-gray-600 mt-1">ROI médio mensal</div>
            <div className="mt-4 text-sm text-gray-700">
              <span className="font-semibold">🔹 30% de imposto?</span> Enquanto um aumento de faturamento paga IR, CSLL, PIS, COFINS, a <strong>redução de custo operacional é lucro líquido real.</strong>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              *Baseado em margem de 30%, salário médio R$ 3.000 com encargos
            </div>
          </div>
        </div>
      </section>

      {/* ARGUMENTOS DE VENDA (DISCOURSO DIRETO) */}
      <section className="bg-blue-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4">🎯 Principais argumentos para vender a DaleVision</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📌</span>
            <p className="text-sm">"Você passa a gerir todas as lojas de um só lugar, com visão em tempo real, sem depender de relatório atrasado."</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📌</span>
            <p className="text-sm">"Diminui ruptura, reduz fraudes e corta horas de contagem manual, com retorno em menos de 12 meses."</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📌</span>
            <p className="text-sm">"Padroniza todas as unidades, melhora atendimento e aumenta ticket médio, com ganho de eficiência de até 20%."</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📌</span>
            <p className="text-sm">"Enquanto seus concorrentes ainda usam planilha, você já opera com dados reais de cada prateleira."</p>
          </div>
        </div>
      </section>

      {/* PLANOS COM PREÇOS REVISADOS */}
      <section id="checkout" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Escolha o plano ideal para seu negócio</h2>
          <p className="text-sm text-gray-600 mt-1">
            Todos com setup zero • ativação em 24h • sem fidelidade
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
          <span className="text-lg">📆</span> 
          <span><strong>Pagamento anual:</strong> 2 meses grátis no Starter e Profissional • 3 meses grátis no Redes</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PLANO STARTER - R$ 279,90 */}
          <div className="rounded-2xl border border-gray-100 p-6 shadow-sm bg-white flex flex-col">
            <div className="text-sm font-semibold text-gray-500">STARTER</div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">R$ 279,90/mês</div>
              <div className="text-xs text-gray-500 mt-1">ou R$ 2.799/ano (2 meses grátis)</div>
            </div>
            <div className="mt-1 text-sm text-gray-600">1 loja • até 3 câmeras • para começar</div>
            
            <div className="mt-4 text-xs font-medium text-gray-500">✅ IDEAL PARA:</div>
            <div className="text-xs text-gray-700 mb-3">Lojas únicas que querem profissionalizar a gestão</div>
            
            <ul className="mt-2 space-y-2 flex-1">
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Alertas WhatsApp e e-mail</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Dashboard básico com insights de fluxo</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Relatório semanal automático</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Detecção de filas e ociosidade</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Métricas por período (dia/semana/mês)</li>
              <li className="text-sm flex items-start gap-2 text-gray-400"><span className="text-gray-300">○</span> Indicadores por segmento <span className="text-xs text-gray-400">(Profissional+)</span></li>
            </ul>

            <a href="#" className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Assinar agora
            </a>
          </div>

          {/* PLANO PROFISSIONAL - R$ 747/mês (DESTAQUE) */}
          <div className="rounded-2xl border border-blue-200 p-6 shadow-sm bg-white flex flex-col ring-2 ring-blue-100 scale-105 lg:scale-100">
            <div className="self-start rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 mb-2">
              MAIS ESCOLHIDO
            </div>
            <div className="text-sm font-semibold text-gray-500">PROFISSIONAL</div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">R$ 747/mês</div>
              <div className="text-xs text-gray-500 mt-1">ou R$ 7.470/ano (2 meses grátis)</div>
            </div>
            <div className="mt-1 text-sm text-gray-600">até 3 lojas • até 12 câmeras</div>
            
            <div className="mt-4 text-xs font-medium text-gray-500">✅ IDEAL PARA:</div>
            <div className="text-xs text-gray-700 mb-3">Pequenas redes que precisam comparar performance</div>
            
            <ul className="mt-2 space-y-2 flex-1">
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Tudo do Starter em até 3 lojas</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Indicadores específicos por segmento</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Comparativo de performance entre lojas</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Insights de escala e ajuste de quadro</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> SLA prioritário</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Treinamento da equipe incluso</li>
            </ul>

            <a href="#" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-md">
              Assinar agora
            </a>
          </div>

          {/* PLANO REDES - R$ 1.995/mês */}
          <div className="rounded-2xl border border-gray-100 p-6 shadow-sm bg-white flex flex-col">
            <div className="text-sm font-semibold text-gray-500">REDES</div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">R$ 1.995/mês</div>
              <div className="text-xs text-gray-500 mt-1">ou R$ 17.955/ano (3 meses grátis)</div>
            </div>
            <div className="mt-1 text-sm text-gray-600">até 10 lojas • multi-segmento</div>
            
            <div className="mt-4 text-xs font-medium text-gray-500">✅ IDEAL PARA:</div>
            <div className="text-xs text-gray-700 mb-3">Redes consolidadas com múltiplos formatos de loja</div>
            
            <ul className="mt-2 space-y-2 flex-1">
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Tudo do Profissional</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Alertas WhatsApp + Telegram + E-mail</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Dashboard consolidado multi-unidade</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Métricas diferentes por segmento</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Integração com ERP e sistemas de ponto</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> API de dados aberta</li>
              <li className="text-sm flex items-start gap-2"><span className="text-blue-600">✓</span> Suporte dedicado com CSM</li>
            </ul>

            <a href="#" className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Assinar agora
            </a>
          </div>
        </div>

        {/* ENTERPRISE */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Enterprise • 10+ lojas ou integrações customizadas</h3>
            <p className="text-sm text-gray-600">Farmácias, moda, cosméticos e outros segmentos com necessidades específicas</p>
          </div>
          <button
            onClick={() => window.open(WHATSAPP_URL, "_blank")}
            className="whitespace-nowrap rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Falar com especialista
          </button>
        </div>
      </section>

      {/* CASOS COM DADOS REAIS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            name: "Rede de Farmácias (8 lojas)",
            result: "Filas -22% em 30 dias",
            economy: "Economia de R$ 4.200/mês",
            quote: "Redimensionamos os turnos da noite com base nos dados reais de fluxo."
          },
          {
            name: "Varejo de Moda (3 lojas)",
            result: "Conversão +14%",
            economy: "+ R$ 8.100/mês em vendas",
            quote: "Identificamos que 30% das perdas eram por falta de atendimento nos provadores."
          },
          {
            name: "Rede Multisegmento",
            result: "ROI 2.200% em 90 dias",
            economy: "R$ 12.500/mês em ganhos",
            quote: "Usamos métricas diferentes para cada loja. A IA se adaptou aos dois negócios."
          }
        ].map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold text-blue-600 uppercase">Case real</div>
            <div className="mt-2 text-lg font-bold text-gray-900">{item.name}</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{item.result}</div>
            <div className="mt-1 text-sm font-medium text-gray-700">{item.economy}</div>
            <div className="mt-3 text-sm text-gray-600">“{item.quote}”</div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">Perguntas frequentes</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-semibold text-gray-900">💰 Como calcular o ROI na prática?</div>
            <div className="mt-1 text-sm text-gray-600">Usamos três métricas: horas ociosas reduzidas x salário médio, filas evitadas x ticket médio, aumento de conversão. Média histórica: R$ 9.260 de ganho por loja/mês.</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">📊 Posso ter métricas diferentes por loja?</div>
            <div className="mt-1 text-sm text-gray-600">Sim. Nos planos Profissional e Redes você configura indicadores específicos por loja ou grupo (farmácia, moda, cosméticos).</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">⚙️ Preciso trocar minhas câmeras?</div>
            <div className="mt-1 text-sm text-gray-600">Zero. Aproveitamos 100% da infraestrutura existente (Intelbras, Hikvision). Setup em 24-72h.</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">📆 Vale a pena o plano anual?</div>
            <div className="mt-1 text-sm text-gray-600">Com 2 a 3 meses grátis, você tem economia imediata e proteção contra reajustes.</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Upgrade
