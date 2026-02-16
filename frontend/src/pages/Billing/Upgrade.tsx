import { useState } from "react"

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5511996918070&text&type=phone_number&app_absent=0"

const Upgrade = () => {
  const [showCheckoutNotice, setShowCheckoutNotice] = useState(false)

  return (
    <div className="p-6 space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Transforme suas câmeras em eficiência operacional
            </h1>
            <p className="mt-3 text-base text-gray-600">
              Alertas em tempo real, evidências e relatórios — sem trocar seu CFTV.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowCheckoutNotice(true)}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Assinar agora
              </button>
              <button
                type="button"
                onClick={() => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Falar com especialista
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
            <div className="font-semibold">O que você ganha já no primeiro mês</div>
            <div className="mt-2 space-y-2 text-blue-800">
              <div>Fila, fluxo e ocorrências em tempo real</div>
              <div>Snapshots e evidências para auditoria</div>
              <div>ROI por câmera e health do edge</div>
            </div>
          </div>
        </div>
      </div>

      {showCheckoutNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900">
          <div className="font-semibold">Checkout em breve</div>
          <p className="mt-2 text-sm">
            Estamos finalizando o checkout automático. Enquanto isso, fale com nosso time e
            ativamos o plano ainda hoje.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Falar no WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setShowCheckoutNotice(false)}
              className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              Ok, entendi
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          {
            name: "Starter",
            price: "R$ 499/mês",
            description: "1 loja, até 3 câmeras",
          },
          {
            name: "Pro",
            price: "R$ 1.290/mês",
            description: "até 3 lojas, até 12 câmeras",
            highlight: true,
          },
          {
            name: "Enterprise",
            price: "Falar com especialista",
            description: "multi-loja e integrações",
          },
        ].map((plan) => (
          <div
            key={plan.name}
            className={[
              "rounded-2xl border p-6 shadow-sm",
              plan.highlight
                ? "border-blue-200 bg-blue-50"
                : "border-gray-100 bg-white",
            ].join(" ")}
          >
            <div className="text-sm font-semibold text-gray-500">{plan.name}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{plan.price}</div>
            <div className="mt-1 text-sm text-gray-600">{plan.description}</div>
            <div className="mt-5 space-y-2 text-sm text-gray-700">
              <div>Alertas WhatsApp e e-mail</div>
              <div>Snapshots e evidências</div>
              <div>ROI por câmera</div>
              <div>Health do edge + suporte onboarding</div>
            </div>
            <button
              type="button"
              onClick={() => setShowCheckoutNotice(true)}
              className={[
                "mt-6 w-full rounded-lg px-4 py-2 text-sm font-semibold",
                plan.highlight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              Assinar agora
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="text-lg font-semibold text-gray-900">Por que o DALE Vision</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>Fila, fluxo e ocorrências em tempo real</div>
          <div>Snapshots e evidências acionáveis</div>
          <div>ROI por câmera com metas claras</div>
          <div>Alertas WhatsApp/e-mail e auditoria</div>
          <div>Health do edge e diagnóstico rápido</div>
          <div>Onboarding guiado e suporte humano</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            name: "Rede de farmácias",
            result: "Reduzimos filas em 22%",
            quote:
              "Os alertas chegaram antes do horário de pico e conseguimos reagir rápido.",
          },
          {
            name: "Varejo de moda",
            result: "Aumentamos conversão em 14%",
            quote:
              "As métricas por câmera ajudaram a ajustar equipe e layout.",
          },
          {
            name: "Supermercado regional",
            result: "Ociosidade caiu 18%",
            quote:
              "O health do edge trouxe previsibilidade na operação diária.",
          },
        ].map((item) => (
          <div key={item.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">{item.name}</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{item.result}</div>
            <div className="mt-3 text-sm text-gray-600">“{item.quote}”</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="text-lg font-semibold text-gray-900">Perguntas frequentes</div>
        <div className="mt-4 space-y-4 text-sm text-gray-700">
          <div>
            <div className="font-semibold">É compatível com meu CFTV?</div>
            <div className="mt-1">
              Sim. Integramos via NVR/RTSP. Câmeras cloud-only precisam de NVR.
            </div>
          </div>
          <div>
            <div className="font-semibold">Como funciona a privacidade?</div>
            <div className="mt-1">
              Processamos somente o necessário, com logs e evidências controladas.
            </div>
          </div>
          <div>
            <div className="font-semibold">Quanto tempo para instalar?</div>
            <div className="mt-1">
              Em 30 a 60 minutos com o assistente e suporte guiado.
            </div>
          </div>
          <div>
            <div className="font-semibold">Posso cancelar quando quiser?</div>
            <div className="mt-1">
              Sim. Planos mensais, sem fidelidade.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Upgrade
