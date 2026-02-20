import { createContext } from "react"
import type { User, LoginCredentials } from "../services/auth"

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
