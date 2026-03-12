import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { StoreSummary } from "../../../services/stores"

interface PaidExecutiveDashboardViewProps {
  stores: StoreSummary[]
  copilotPrompts: string[]
  onOpenCopilot: (prompt?: string) => void
}

type StoreFilter = "all" | "online" | "offline" | "attention"

const getStoreState = (store: StoreSummary) => {
  if (store.status === "active") return "online"
  if (store.status === "blocked" || store.status === "inactive") return "offline"
  return "attention"
}

const statusPillClass = (status: string) => {
  if (status === "online") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "offline") return "bg-rose-50 text-rose-700 border-rose-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

export function PaidExecutiveDashboardView({
  stores,
  copilotPrompts,
  onOpenCopilot,
}: PaidExecutiveDashboardViewProps) {
  const [filter, setFilter] = useState<StoreFilter>("all")
  const [draftPrompt, setDraftPrompt] = useState("")

  const summary = useMemo(() => {
    const online = stores.filter((store) => getStoreState(store) === "online").length
    const offline = stores.filter((store) => getStoreState(store) === "offline").length
    const attention = stores.filter((store) => getStoreState(store) === "attention").length
    return {
      online,
      offline,
      attention,
      total: stores.length,
    }
  }, [stores])

  const filteredStores = useMemo(
    () =>
      stores.filter((store) => {
        if (filter === "all") return true
        return getStoreState(store) === filter
      }),
    [filter, stores]
  )

  const criticalAlerts = useMemo(() => {
    const cards: Array<{
      id: string
      tone: "error" | "warning"
      title: string
      message: string
      action: string
      prompt: string
    }> = []

    stores.forEach((store) => {
      const state = getStoreState(store)
      if (state === "offline") {
        cards.push({
          id: `${store.id}-offline`,
          tone: "error",
          title: `${store.name} com operação interrompida`,
          message: "A loja não está enviando atualização operacional.",
          action: "Diagnosticar",
          prompt: `Diagnosticar ${store.name} e sugerir plano de retomada`,
        })
      } else if (state === "attention") {
        cards.push({
          id: `${store.id}-attention`,
          tone: "warning",
          title: `${store.name} em estabilização`,
          message: "A loja pede ajuste para consolidar leitura executiva.",
          action: "Priorizar",
          prompt: `Priorizar ações para estabilizar ${store.name}`,
        })
      }
    })

    return cards.slice(0, 3)
  }, [stores])

  const topActions = useMemo(() => {
    const actions: Array<{ id: string; priority: "alta" | "media"; title: string; impact: string; prompt: string }> =
      []
    if (summary.offline > 0) {
      actions.push({
        id: "offline",
        priority: "alta",
        title: `Retomar ${summary.offline} loja(s) sem atualização operacional`,
        impact: "Impacto estimado: recuperar visibilidade da rede no mesmo dia",
        prompt: "Qual o plano de ação para lojas offline hoje?",
      })
    }
    if (summary.attention > 0) {
      actions.push({
        id: "attention",
        priority: "media",
        title: `Ajustar ${summary.attention} loja(s) em fase de estabilização`,
        impact: "Impacto estimado: reduzir risco e acelerar previsibilidade",
        prompt: "Como acelerar estabilização das lojas em atenção?",
      })
    }
    actions.push({
      id: "copilot-review",
      priority: "media",
      title: "Revisar priorização semanal com o Copiloto",
      impact: "Impacto estimado: agenda executiva objetiva para o time de operação",
      prompt: "Monte minha priorização operacional da semana",
    })
    return actions.slice(0, 3)
  }, [summary.attention, summary.offline])

  const trendItems = [
    {
      label: "Lojas estáveis",
      value: summary.online,
      color: "bg-emerald-500",
    },
    {
      label: "Lojas em atenção",
      value: summary.attention,
      color: "bg-amber-500",
    },
    {
      label: "Lojas críticas",
      value: summary.offline,
      color: "bg-rose-500",
    },
  ]
  const maxTrendValue = Math.max(...trendItems.map((item) => item.value), 1)

  const handleSendPrompt = () => {
    const clean = draftPrompt.trim()
    if (!clean) return
    onOpenCopilot(clean)
    setDraftPrompt("")
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">
              Operações Inteligentes
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#111827]">
              Mesa de comando da rede
            </h3>
          </div>
          <div className="text-sm text-[#6B7280]">
            {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setFilter("online")}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              filter === "online"
                ? "border-emerald-300 bg-emerald-50"
                : "border-gray-200 bg-[#F9FAFB] hover:bg-white"
            }`}
          >
            <div className="text-xs text-[#6B7280]">🟢 Lojas online</div>
            <div className="mt-1 text-lg font-semibold text-[#111827]">{summary.online}</div>
          </button>
          <button
            type="button"
            onClick={() => setFilter("offline")}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              filter === "offline"
                ? "border-rose-300 bg-rose-50"
                : "border-gray-200 bg-[#F9FAFB] hover:bg-white"
            }`}
          >
            <div className="text-xs text-[#6B7280]">🔴 Lojas offline</div>
            <div className="mt-1 text-lg font-semibold text-[#111827]">{summary.offline}</div>
          </button>
          <button
            type="button"
            onClick={() => setFilter("attention")}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              filter === "attention"
                ? "border-amber-300 bg-amber-50"
                : "border-gray-200 bg-[#F9FAFB] hover:bg-white"
            }`}
          >
            <div className="text-xs text-[#6B7280]">⚠️ Alertas ativos</div>
            <div className="mt-1 text-lg font-semibold text-[#111827]">{summary.attention}</div>
          </button>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-xs font-semibold text-[#0066FF] hover:underline"
          >
            Limpar filtro e mostrar rede completa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-[#111827]">Alertas críticos</h4>
              <span className="text-xs text-[#6B7280]">
                {criticalAlerts.length ? `${criticalAlerts.length} priorizados` : "Sem alertas críticos"}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {criticalAlerts.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Operação estável no momento. Foque em oportunidades de conversão.
                </div>
              )}
              {criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border-l-4 px-4 py-3 ${
                    alert.tone === "error"
                      ? "border-l-[#EF4444] bg-[#FEF2F2]"
                      : "border-l-[#F59E0B] bg-[#FFFBEB]"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{alert.title}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{alert.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCopilot(alert.prompt)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-gray-50"
                    >
                      ▶ Diagnosticar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-[#111827]">Desempenho por loja</h4>
              <span className="text-xs text-[#6B7280]">
                Exibindo {filteredStores.length} de {summary.total} lojas
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                    <th className="py-2 pr-3">Loja</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Fluxo</th>
                    <th className="py-2 pr-3">Fila</th>
                    <th className="py-2 pr-3">Conversão</th>
                    <th className="py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => {
                    const state = getStoreState(store)
                    const stateLabel =
                      state === "online"
                        ? "Operando"
                        : state === "offline"
                        ? "Interrompida"
                        : "Atenção"
                    const flowLabel =
                      state === "online"
                        ? "↑ consistente"
                        : state === "offline"
                        ? "↓ pausado"
                        : "↔ estabilizando"
                    const queueLabel =
                      state === "online"
                        ? "Sob controle"
                        : state === "offline"
                        ? "Sem leitura"
                        : "Monitorar"
                    const conversionLabel =
                      state === "online"
                        ? "Em evolução"
                        : state === "offline"
                        ? "Sem sinal"
                        : "Em ajuste"
                    return (
                      <tr key={store.id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="py-3 pr-3 font-medium text-[#111827]">{store.name}</td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClass(state)}`}>
                            {stateLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-[#111827]">{flowLabel}</td>
                        <td className="py-3 pr-3 text-[#111827]">{queueLabel}</td>
                        <td className="py-3 pr-3 text-[#111827]">{conversionLabel}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenCopilot(`Analisar desempenho da ${store.name}`)}
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-[#111827] hover:bg-white"
                          >
                            👁 Ver
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <h4 className="text-base font-semibold text-[#111827]">Ações recomendadas</h4>
            <div className="mt-3 space-y-3">
              {topActions.map((action) => (
                <div
                  key={action.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      {action.priority === "alta" ? "🔴 " : "🟡 "}
                      {action.title}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">{action.impact}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCopilot(action.prompt)}
                    className="rounded-lg bg-[#0066FF] px-3 py-2 text-xs font-semibold text-white hover:brightness-95"
                  >
                    ▶ Executar
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
            <h4 className="text-base font-semibold text-[#111827]">Métricas executivas</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Lojas operando</p>
                <p className="mt-1 text-3xl font-bold text-[#111827]">{summary.online}</p>
                <p className="text-xs text-emerald-600">Rede com estabilidade operacional</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Cobertura da rede</p>
                <p className="mt-1 text-3xl font-bold text-[#111827]">
                  {summary.total > 0 ? Math.round((summary.online / summary.total) * 100) : 0}%
                </p>
                <p className="text-xs text-[#6B7280]">Lojas com operação contínua</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Atenção imediata</p>
                <p className="mt-1 text-3xl font-bold text-[#111827]">{summary.offline}</p>
                <p className="text-xs text-rose-600">Lojas pedindo resposta do time</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Risco operacional</p>
                <p className="mt-1 text-3xl font-bold text-[#111827]">{summary.attention}</p>
                <p className="text-xs text-amber-600">Lojas com sinais de instabilidade</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
            <h4 className="text-base font-semibold text-[#111827]">Tendências da rede</h4>
            <div className="mt-4 space-y-3">
              {trendItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{
                        width: `${Math.round((item.value / maxTrendValue) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-4 sm:p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#0066FF] text-center leading-9 text-sm font-semibold">
                🤖
              </div>
              <div>
                <h4 className="text-sm font-semibold">Copiloto Dale Vision</h4>
                <p className="text-xs text-white/70">Seu assistente executivo</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-[#E5E7EB]">
                Olá! Analisei sua operação das últimas 24h. Tenho recomendações para priorizar hoje.
              </div>
              <div className="ml-auto max-w-[88%] rounded-xl bg-[#0066FF] px-3 py-2 text-sm text-white">
                Qual loja exige ação imediata?
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-[#E5E7EB]">
                Loja Norte está sem atualização e Loja Sul entrou em atenção. Recomendo atuar primeiro na Norte.
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {copilotPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onOpenCopilot(prompt)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/90 hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={draftPrompt}
                onChange={(event) => setDraftPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleSendPrompt()
                  }
                }}
                placeholder="Pergunte algo..."
                className="w-full rounded-xl border border-white/15 bg-[#222222] px-3 py-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-[#0066FF]"
              />
              <button
                type="button"
                onClick={handleSendPrompt}
                className="rounded-xl bg-[#0066FF] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
              >
                ➤
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/app/report"
          className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F2937]"
        >
          Ver relatório executivo
        </Link>
        <button
          type="button"
          onClick={() => onOpenCopilot("Qual o plano de ação para melhorar resultado da rede hoje?")}
          className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB]"
        >
          Perguntar ao Copiloto
        </button>
      </div>
    </div>
  )
}
