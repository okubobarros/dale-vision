const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5511996918070&text&type=phone_number&app_absent=0"

const Upgrade = () => {
  return (
    <div className="p-6 space-y-10">
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              Trial expirado • seus dados continuam salvos
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900">
              Volte a operar com dados reais em minutos
            </h1>
            <p className="mt-3 text-base text-gray-600">
              Ative o plano e preserve câmeras, ROI e alertas. Sem reinstalar o Edge
              Agent.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="#checkout"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Assinar agora
              </a>
              <button
                type="button"
                onClick={() =>
                  window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")
                }
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Falar com especialista
              </button>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Ativação assistida em até 1 dia útil.
            </div>
          </div>

          <div className="w-full lg:w-[380px] rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="text-sm font-semibold text-gray-700">
              O que destrava com o upgrade
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li>Alertas em tempo real via WhatsApp</li>
              <li>Insights e evidências por câmera</li>
              <li>Health do Edge e diagnósticos rápidos</li>
              <li>Relatórios semanais automáticos</li>
            </ul>
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">
              Clientes com o plano ativo reduzem tempo de fila em até 22%.
            </div>
          </div>
        </div>
      </section>

      <section id="checkout" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Escolha seu plano</h2>
          <p className="text-sm text-gray-600 mt-1">
            Sem fidelidade. Upgrade imediato.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Starter",
              price: "R$ 499/mês",
              description: "1 loja • até 3 câmeras",
              features: [
                "Alertas WhatsApp",
                "Insights básicos",
                "ROI por câmera",
                "Suporte onboarding",
              ],
            },
            {
              name: "Pro",
              price: "R$ 1.290/mês",
              description: "até 3 lojas • até 12 câmeras",
              highlight: true,
              features: [
                "Alertas + evidências",
                "Dashboards avançados",
                "SLA prioritário",
                "Treinamento do time",
              ],
            },
            {
              name: "Multi-loja",
              price: "Fale com especialista",
              description: "10+ lojas e integrações",
              features: [
                "Integrações com BI",
                "Multi-unidade",
                "Gestão centralizada",
                "Suporte dedicado",
              ],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={[
                "rounded-2xl border p-6 shadow-sm bg-white",
                plan.highlight ? "border-blue-200 ring-2 ring-blue-100" : "border-gray-100",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-gray-500">{plan.name}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{plan.price}</div>
              <div className="mt-1 text-sm text-gray-600">{plan.description}</div>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <a
                href="/app/upgrade#checkout"
                className={[
                  "mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold",
                  plan.highlight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                Assinar agora
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            name: "Rede de farmácias",
            result: "Filas -22% em 30 dias",
            quote:
              "Os alertas chegaram antes do pico e ajustamos a escala rapidamente.",
          },
          {
            name: "Varejo de moda",
            result: "Conversão +14%",
            quote:
              "As métricas por câmera ajudaram a reorganizar equipe e layout.",
          },
          {
            name: "Supermercado regional",
            result: "Ociosidade -18%",
            quote:
              "O health do Edge trouxe previsibilidade na operação diária.",
          },
        ].map((item) => (
          <div
            key={item.name}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="text-sm font-semibold text-gray-500">{item.name}</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{item.result}</div>
            <div className="mt-3 text-sm text-gray-600">“{item.quote}”</div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="text-lg font-semibold text-gray-900">Perguntas frequentes</div>
        <div className="text-sm text-gray-700 space-y-4">
          <div>
            <div className="font-semibold">Preciso reinstalar o Edge Agent?</div>
            <div className="mt-1">
              Não. Seu setup continua ativo, apenas liberamos o acesso.
            </div>
          </div>
          <div>
            <div className="font-semibold">Quanto tempo leva a ativação?</div>
            <div className="mt-1">
              Normalmente no mesmo dia útil após confirmação.
            </div>
          </div>
          <div>
            <div className="font-semibold">Posso cancelar quando quiser?</div>
            <div className="mt-1">Sim. Plano mensal, sem fidelidade.</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Upgrade
