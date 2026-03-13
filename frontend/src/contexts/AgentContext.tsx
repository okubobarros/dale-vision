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
        "Analisando sua operação, identifiquei prioridades para agora. Posso começar pela loja com maior risco ou pela maior oportunidade de conversão.",
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
