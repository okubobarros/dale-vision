import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"


type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type AgentContextType = {
  messages: Message[]
  addMessage: (msg: Message) => void
  clearChat: () => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

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

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error("useAgent must be used inside AgentProvider")
  return ctx
}
