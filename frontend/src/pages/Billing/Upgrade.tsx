import { useMemo, useState, useEffect } from "react"
import { trackJourneyEvent, trackJourneyEventOnce } from "../../services/journey"

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5511996918070&text&type=phone_number&app_absent=0"

const UpgradeComplete = () => {
  const [isAnnual] = useState(false)
  const [faturamento, setFaturamento] = useState(500000)
  const [numFuncionarios, setNumFuncionarios] = useState(8)
  const [setor, setSetor] = useState("farmácia")

  useEffect(() => {
    void trackJourneyEventOnce("upgrade_viewed", "upgrade_viewed", { path: "/app/upgrade" })
  }, [])

  const pricing = {
    starter: { monthly: 279.9, annual: 279.9 * 10 },
    pro: { monthly: 747, annual: 747 * 10 },
    redes: { monthly: 1995, annual: 1995 * 9 },
  } as const

  const impacto = useMemo(() => {
    const fatMensal = Number.isFinite(faturamento) ? faturamento : 500000
    const diaria = fatMensal / 30
    const perdaBase = diaria * 3 * 0.0157 // Abrappe 1,57% [web:31]

    const ociosidade72h = perdaBase * 0.33 // 33% [web:40]
    const filas72h = perdaBase * 0.465 // 46% [web:35]
    const ruptura72h = perdaBase * 0.205 // 20% [web:30]

    const ganhoFluxo72h = diaria * 3 * 0.08 // +8% vendas otimizado fluxo [web:7]
    const ganhoRuptura72h = diaria * 3 * 0.05 // +5% menos ruptura [web:30]

    const salarioMedio = 1800
    const rhOciosidade72h =
      (numFuncionarios * salarioMedio) / 160 * 12.3 * 0.5
    const rhCelular72h = numFuncionarios * 50

    const totalPerdas72h = Math.round(ociosidade72h + filas72h + ruptura72h)
    const totalGanhos72h = Math.round(ganhoFluxo72h + ganhoRuptura72h)
    const totalRh72h = Math.round(rhOciosidade72h + rhCelular72h)
    const netGanhoMensal = Math.round(
      (totalGanhos72h + totalRh72h - totalPerdas72h) * 10
    )
    const roiAnual = Math.round((netGanhoMensal * 12) / pricing.pro.monthly)

    return {
      totalPerdas72h,
      totalGanhos72h,
      totalRh72h,
      netGanhoMensal,
      roiAnual,
      ociosidade72h: Math.round(ociosidade72h),
      filas72h: Math.round(filas72h),
      ruptura72h: Math.round(ruptura72h),
      ganhoFluxo72h: Math.round(ganhoFluxo72h),
      rhOciosidade72h: Math.round(rhOciosidade72h),
      rhCelular72h: Math.round(rhCelular72h),
    }
  }, [faturamento, numFuncionarios, pricing.pro.monthly])

  type PlanId = keyof typeof pricing

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-3 text-sm">
        <span className="font-semibold">Trial expirou.</span>{" "}
        Faça upgrade para reativar o acesso completo.
      </div>
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-emerald-500/30 rounded-full px-6 py-3 border-2 border-emerald-400/50 mb-8 font-semibold text-lg">
              <span>📊 Abrappe/KPMG 2025</span>
              <span>R$36,5bi perdas BR [web:31]</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              <span>
                Perdas: -R$
                {impacto.totalPerdas72h.toLocaleString("pt-BR")}
              </span>
              <br />
              <span className="text-emerald-300">
                Ganhos: +R$
                {impacto.totalGanhos72h.toLocaleString("pt-BR")}
              </span>
            </h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              RH + Receita otimizada. <strong>
                Net: +R$
                {impacto.netGanhoMensal.toLocaleString("pt-BR")}
                /mês
              </strong>
            </p>
            <a
              href="#simulador"
              className="bg-emerald-400 text-gray-900 font-bold px-10 py-4 rounded-2xl text-xl shadow-2xl hover:bg-emerald-300"
            >
              Calcular meu impacto real →
            </a>
          </div>
        </div>
      </section>

      <section id="simulador" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Impacto Total: Custos ↓ | Receita ↑ | RH ⚖️
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Faturamento mensal/loja
              </label>
              <input
                type="number"
                value={faturamento}
                onChange={(e) => setFaturamento(Number(e.target.value) || 0)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-right focus:border-emerald-400 focus:ring-2 ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                # Funcionários/loja
              </label>
              <input
                type="number"
                value={numFuncionarios}
                onChange={(e) => setNumFuncionarios(Number(e.target.value) || 0)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-right focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Segmento</label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl focus:border-emerald-400"
              >
                <option>Farmácia (+ruptura)</option>
                <option>Supermercado (1,79% perdas)</option>
                <option>Moda (+ociosidade RH)</option>
              </select>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-8 rounded-3xl shadow-2xl">
              <h3 className="text-2xl font-bold mb-4">🔻 Reduzir Custos</h3>
              <div className="text-4xl font-bold mb-2">
                -R${impacto.totalPerdas72h.toLocaleString("pt-BR")}
              </div>
              <div className="space-y-2 text-sm opacity-90 mb-4">
                <div>Ociosidade: -R${impacto.ociosidade72h.toLocaleString("pt-BR")}</div>
                <div>Filas: -R${impacto.filas72h.toLocaleString("pt-BR")}</div>
                <div>Ruptura: -R${impacto.ruptura72h.toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                Abrappe 1,57% [web:31]
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-8 rounded-3xl shadow-2xl">
              <h3 className="text-2xl font-bold mb-4">📈 Maximizar Receita</h3>
              <div className="text-4xl font-bold mb-2">
                +R${impacto.totalGanhos72h.toLocaleString("pt-BR")}
              </div>
              <div className="space-y-2 text-sm opacity-90 mb-4">
                <div>Melhor fluxo: +R${impacto.ganhoFluxo72h.toLocaleString("pt-BR")}</div>
                <div>Menos ruptura: +R${impacto.ruptura72h.toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                +8-13% vendas [web:7][web:30]
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-8 rounded-3xl shadow-2xl">
              <h3 className="text-2xl font-bold mb-4">⚖️ RH Compliance</h3>
              <div className="text-4xl font-bold mb-2">
                +R${impacto.totalRh72h.toLocaleString("pt-BR")}
              </div>
              <div className="space-y-2 text-sm opacity-90 mb-4">
                <div>
                  Ociosidade real: +R$
                  {impacto.rhOciosidade72h.toLocaleString("pt-BR")}
                </div>
                <div>
                  Celular/fugas: +R$
                  {impacto.rhCelular72h.toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                Evidências promoções [web:40]
              </div>
            </div>
          </div>

          <div className="text-center p-8 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-3xl shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">NET GANHO MENSAL</h2>
            <div className="text-6xl font-black mb-4">
              +R${impacto.netGanhoMensal.toLocaleString("pt-BR")}
            </div>
            <div className="text-2xl mb-6">
              ROI Anual: <span className="text-yellow-300">{impacto.roiAnual}x</span>
            </div>
            <p className="text-lg opacity-90">vs Pro R$747/mês. Trial confirma em 72h.</p>
          </div>
        </div>
      </section>

      <section id="checkout" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { id: "starter", name: "Starter", monthly: 279.9, stores: 1 },
              { id: "pro", name: "Profissional", monthly: 747, stores: 3, popular: true },
              { id: "redes", name: "Redes", monthly: 1995, stores: 10 },
            ].map((plan) => {
              const planId = plan.id as PlanId
              const currentPrice = isAnnual
                ? pricing[planId].annual / 12
                : plan.monthly
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl shadow-xl p-8 border-4 ${
                    plan.popular
                      ? "border-emerald-400 ring-4 ring-emerald-100"
                      : "border-gray-200"
                  } hover:shadow-2xl transition`}
                >
                  {plan.popular && (
                    <div className="absolute bg-emerald-400 text-gray-900 font-bold px-6 py-2 -top-5 left-1/2 transform -translate-x-1/2 rounded-2xl text-sm">
                      MAIS ESCOLHIDO
                    </div>
                  )}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="text-4xl font-black text-gray-900 mt-4">
                    R$ {currentPrice.toFixed(0)}
                  </div>
                  <div className="text-gray-600 mt-2">{plan.stores} lojas</div>
                  <div className="mt-6 text-emerald-600 font-bold text-xl">
                    ROI {Math.round(impacto.roiAnual / 3)}x seu caso
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
                    className={`w-full mt-6 py-4 rounded-2xl font-bold text-xl shadow-lg transition ${
                      plan.popular
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-white border-2 border-gray-400 text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Assinar {plan.name}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-emerald-900 to-blue-900 text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            +R${impacto.netGanhoMensal.toLocaleString("pt-BR")}/mês te espera
          </h2>
          <p className="text-xl mb-8">Trial 72h grátis com suas câmeras. RH + Receita + Custos.</p>
          <a
            href="#simulador"
            className="bg-yellow-400 text-gray-900 font-black px-12 py-6 rounded-3xl text-2xl shadow-2xl hover:bg-yellow-300 transform hover:scale-105 transition-all"
          >
            🚀 Ativar Trial 72h Agora
          </a>
          <div className="mt-6 text-lg opacity-90">
            Base: Abrappe 2025 + GS1 IA Varejo [web:30][web:31][web:7]
          </div>
        </div>
      </section>
    </div>
  )
}

export default UpgradeComplete
