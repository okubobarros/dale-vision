import { useState } from "react"
import type { ReactNode } from "react"
import type { Message } from "./agentContextBase"
import { AgentContext } from "./agentContextBase"

export function AgentProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o DALE Copiloto. Como posso ajudar com os dados da sua rede hoje?",
    },
  ])

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg])
  }

  const clearChat = () => setMessages([])

  return (
    <AgentContext.Provider value={{ messages, addMessage, clearChat }}>
      {children}
    </AgentContext.Provider>
  )
}
