import { useState } from "react"
import logo from "../../assets/logo.png"
import { useAgent } from "../../contexts/AgentContext"

export function AgentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [msg, setMsg] = useState("")
  const { messages, addMessage } = useAgent()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-[#0B0F14] flex flex-col">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="DALE Copiloto"
            className="h-10 w-10 rounded-md"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">
              DALE Copiloto
            </div>
            <div className="text-xs text-white/50 truncate">
              Insights e recomendações (em breve: dados reais)
            </div>
          </div>
        </div>

        <button
          className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          onClick={onClose}
          aria-label="Fechar agente"
        >
          ✕
        </button>
      </div>

      {/* ================= CHAT (SCROLL) ================= */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border border-white/10 p-4 text-sm ${
              m.role === "assistant"
                ? "bg-white/5 text-white/70"
                : "bg-blue-600/20 text-white"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* ================= INPUT FIXO ================= */}
      <div
        className="px-4 pt-3 pb-6 border-t border-white/10 bg-[#0B0F14] shadow-[0_-4px_12px_rgba(0,0,0,0.35)]"
        style={{
          paddingBottom: "calc(16px + 72px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex gap-2 items-center">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Digite sua pergunta…"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Mensagem para o agente"
          />
          <button
            className="rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black hover:brightness-105 transition"
            aria-label="Enviar mensagem"
            onClick={() => {
              if (!msg.trim()) return

              addMessage({
                id: crypto.randomUUID(),
                role: "user",
                content: msg,
              })

              setMsg("")
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
