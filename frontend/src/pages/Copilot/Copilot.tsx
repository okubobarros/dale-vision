import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useAgent } from "../../contexts/useAgent"

const defaultPrompts = [
  "Resumo executivo da rede hoje",
  "Quais lojas exigem ação imediata?",
  "Onde há risco de perda de venda agora?",
  "Qual prioridade operacional para esta tarde?",
]

const storePrompt = (storeId?: string | null) =>
  storeId ? `Analisar a operação da loja ${storeId}` : "Analisar a operação da rede"

export default function CopilotPage() {
  const [params] = useSearchParams()
  const storeId = params.get("store_id")
  const { messages, addMessage, clearChat } = useAgent()
  const [draft, setDraft] = useState("")

  const quickPrompts = useMemo(
    () => [storePrompt(storeId), ...defaultPrompts],
    [storeId]
  )

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
            Comece perguntando sobre prioridades da rede, risco de conversão ou ações por loja.
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

