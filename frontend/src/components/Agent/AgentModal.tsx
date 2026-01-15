import { useEffect, useRef, useState } from "react"

export function AgentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [msg, setMsg] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // foco no input quando abrir
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Agente Vision Intelligence"
        className="
          absolute bottom-0 left-0 right-0
          mx-auto w-full max-w-lg
          rounded-t-3xl border border-white/10
          bg-[#0B0F14]
          shadow-2xl
        "
      >
        {/* Container interno com altura limitada */}
        <div className="flex max-h-[85vh] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">
                Vision Intelligence
              </div>
              <div className="text-xs text-white/50 truncate">
                Insights e recomendações (em breve: dados reais)
              </div>
            </div>

            <button
              className="shrink-0 rounded-lg px-3 py-1 text-sm text-white/70 hover:bg-white/5"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

          {/* Conteúdo rolável */}
          <div className="mt-3 flex-1 overflow-y-auto px-4 pb-3">
            {/* mensagem inicial */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              Olá! Sou o Vision Intelligence. Como posso ajudar com os dados da
              sua rede hoje?
            </div>

            {/* sugestões rápidas */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Como posso melhorar a conversão hoje?",
                "Onde estou perdendo vendas?",
                "Qual loja precisa de atenção agora?",
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMsg(t)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                >
                  {t}
                </button>
              ))}
            </div>

            {/* spacer + âncora pro scroll (quando tiver histórico real) */}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Footer (input fixo) */}
          <div className="border-t border-white/10 bg-[#0B0F14] px-4 pt-3 pb-safe-bottom">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!msg.trim()) return
                // depois vira webhook n8n
                setMsg("")
              }}
            >
              <input
                ref={inputRef}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Ex: Como melhorar o fluxo no checkout?"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-lime-400/40"
                aria-label="Digite sua pergunta"
              />
              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black"
                aria-label="Enviar mensagem"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
