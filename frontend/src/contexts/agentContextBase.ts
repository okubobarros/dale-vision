import { createContext } from "react"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type AgentContextType = {
  messages: Message[]
  addMessage: (msg: Message) => void
  clearChat: () => void
}

export const AgentContext = createContext<AgentContextType | undefined>(undefined)
