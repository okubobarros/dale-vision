import { Outlet } from "react-router-dom"
import { useState } from "react"
import { Header, Sidebar } from "./index"
import { useIsMobile } from "../../hooks/useIsMobile"

import BottomNav from "./BottomNav"
import { AgentModal } from "../Agent/AgentModal"
import { useAgent } from "../../contexts/AgentContext"
import logo from "../../assets/logo.png"
import SubscriptionGuard from "../SubscriptionGuard"

const Layout = () => {
  const isMobile = useIsMobile(768)
  const [agentOpen, setAgentOpen] = useState(false)
  const { messages, addMessage } = useAgent()

  return (
    <>
      <SubscriptionGuard />
      {/* CONTAINER PRINCIPAL - trava 100vh e controla scroll */}
      <div className="h-screen bg-gray-50 overflow-hidden">
        <Header onOpenAgent={() => setAgentOpen(true)} />

        {/* Área abaixo do header */}
        <div className="flex h-[calc(100vh-73px)] overflow-hidden">
          {!isMobile && <Sidebar />}

          {/* MAIN COM SCROLL PRÓPRIO */}
          <main
            className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
              isMobile ? "pb-bottomnav" : ""
            }`}
          >
            <Outlet />
          </main>

          {/* ===================== AGENTE DESKTOP (PAINEL LATERAL) ===================== */}
          {!isMobile && (
            <aside
              className={`transition-all duration-200 ease-out border-l bg-[#0B0F14] overflow-hidden ${
                agentOpen
                  ? "w-[460px] opacity-100"
                  : "w-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="h-full flex flex-col">
                {/* HEADER DO AGENTE */}
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
                    className="rounded-lg px-3 py-1 text-sm text-white/70 hover:bg-white/5"
                    onClick={() => setAgentOpen(false)}
                    type="button"
                    aria-label="Fechar agente"
                  >
                    ✕
                  </button>
                </div>

                {/* CORPO DO CHAT (SCROLL INDEPENDENTE) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                {/* INPUT FIXO NO FUNDO */}
                <div className="p-4 border-t border-white/10 bg-[#0B0F14] shadow-[0_-4px_12px_rgba(0,0,0,0.35)]">
                  <div className="flex gap-2">
                    <input
                      placeholder="Como posso melhorar a conversão hoje?"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          addMessage({
                            id: crypto.randomUUID(),
                            role: "user",
                            content: e.currentTarget.value,
                          })
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                    <button
                      className="rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black hover:brightness-105 transition"
                      aria-label="Enviar mensagem"
                      type="button"
                      onClick={() => {
                        const input = document.querySelector<HTMLInputElement>(
                          "aside input"
                        )
                        if (input?.value.trim()) {
                          addMessage({
                            id: crypto.randomUUID(),
                            role: "user",
                            content: input.value,
                          })
                          input.value = ""
                        }
                      }}
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ===================== MOBILE ===================== */}
      {isMobile && (
        <>
          <BottomNav onOpenAgent={() => setAgentOpen(true)} />
          <AgentModal open={agentOpen} onClose={() => setAgentOpen(false)} />
        </>
      )}
    </>
  )
}

export default Layout
