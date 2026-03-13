import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useAgent } from "../../contexts/useAgent"

const defaultPrompts = [
  "Qual a prioridade operacional da rede neste momento?",
  "Quais lojas exigem ação imediata hoje?",
  "Onde está o maior risco de perda de venda agora?",
  "Qual decisão de equipe traz maior impacto nesta tarde?",
]

const storePrompt = (storeId?: string | null) =>
  storeId
    ? `Faça uma leitura executiva da operação da loja ${storeId}`
    : "Faça uma leitura executiva da operação da rede"

export default function CopilotPage() {
  const [params] = useSearchParams()
  const storeId = params.get("store_id")
  const orgName = params.get("org_name")
  const { messages, addMessage, clearChat } = useAgent()
  const [draft, setDraft] = useState("")

  const quickPrompts = useMemo(
    () => [storePrompt(storeId), ...defaultPrompts],
    [storeId]
  )

  const contextualOpening = useMemo(() => {
    const baseScope = storeId
      ? `na loja ${storeId}`
      : orgName
        ? `na rede ${orgName}`
        : "na rede"
    return {
      title: "Análise inicial do Copiloto",
      summary: `Analisei os sinais operacionais disponíveis ${baseScope} e identifiquei uma prioridade prática para agora.`,
      reason:
        "Quando há alerta operacional aberto, agir na primeira prioridade reduz risco de perda de venda e evita efeito cascata no restante do turno.",
      suggestedAction: storeId
        ? `Abra a visão da loja ${storeId} e valide o primeiro evento com maior severidade.`
        : "Abra a loja com maior pressão operacional e execute a primeira ação recomendada.",
      cta:
        storeId
          ? `Abrir visão da loja ${storeId}`
          : "Comparar prioridades por loja",
    }
  }, [orgName, storeId])

  const send = (content: string) => {
    const value = content.trim()
    if (!value) return
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    })
  }

  return (
    <div className="h-full min-h-[calc(100vh-140px)] rounded-2xl border border-white/10 bg-[#0B0F14] text-white shadow-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-200">Copiloto DALE Vision</p>
          <h1 className="mt-1 text-2xl font-bold">Central de inteligência operacional</h1>
          <p className="mt-1 text-sm text-slate-300">
            Conversa dedicada com contexto de rede e execução operacional.
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          Limpar conversa
        </button>
      </div>

      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-3 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-200">{contextualOpening.title}</p>
          <p className="mt-1 text-sm text-white">{contextualOpening.summary}</p>
          <p className="mt-1 text-xs text-slate-300">{contextualOpening.reason}</p>
          <div className="mt-2 rounded-lg bg-white/5 p-2 text-xs text-slate-100">
            <span className="font-semibold text-blue-200">Ação sugerida:</span> {contextualOpening.suggestedAction}
          </div>
          <button
            type="button"
            onClick={() => send(contextualOpening.suggestedAction)}
            className="mt-2 rounded-lg border border-blue-300/30 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-500/30"
          >
            {contextualOpening.cta}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[calc(100%-210px)] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Comece pela prioridade operacional do momento e aprofunde por loja conforme necessário.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl border border-white/10 p-4 text-sm ${
              message.role === "assistant"
                ? "max-w-[88%] bg-white/5 text-slate-200"
                : "ml-auto max-w-[88%] bg-blue-600/25 text-white"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                send(draft)
                setDraft("")
              }
            }}
            placeholder="Pergunte sobre operação, lojas, risco de venda, equipe..."
            className="w-full rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => {
              send(draft)
              setDraft("")
            }}
            className="rounded-xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black hover:brightness-105"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
