import { useContext } from "react"
import { AgentContext } from "./agentContextBase"

export const useAgent = () => {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error("useAgent must be used inside AgentProvider")
  return ctx
}
