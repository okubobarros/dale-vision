import { useState } from "react"

export function AgentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [msg, setMsg] = useState("")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0B0F14] p-4 dv-agent-panel">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Vision Intelligence</div>
            <div className="text-xs text-white/50 truncate">
              Insights e recomendações (em breve: dados reais)
            </div>
          </div>

          <button
            className="rounded-lg px-3 py-1 text-sm text-white/70 hover:bg-white/5"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        {/* Mensagens / conteúdo (rolável) */}
        <div className="mt-3 dv-agent-scroll space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Olá! Sou o Vision Intelligence. Como posso ajudar com os dados da sua rede hoje?
          </div>

          {/* placeholder de “mensagens futuras” */}
          {/* aqui depois você renderiza histórico */}
        </div>

        {/* Input fixo embaixo */}
        <div className="mt-4 flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Como posso melhorar a conversão hoje?"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
          />
          <button
            className="rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black"
            onClick={() => {
              // TODO: webhook n8n
              setMsg("")
            }}
            aria-label="Enviar mensagem"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
