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
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-3xl border border-white/10 bg-[#0B0F14] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            Vision Intelligence
          </div>
          <button
            className="rounded-lg px-3 py-1 text-sm text-white/70 hover:bg-white/5"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Olá! Sou o Vision Intelligence. Como posso ajudar com os dados da sua rede hoje?
        </div>

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
              // depois vira webhook n8n
              setMsg("")
            }}
          >
            ➤
          </button>
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
