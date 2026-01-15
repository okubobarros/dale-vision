// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { authService } from "../services/auth"
import type { User, LoginCredentials } from "../services/auth"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1) Configurar token no axios (IMPORTANTE)
    authService.setupToken()

    // 2) Carregar dados do localStorage
    const currentUser = authService.getCurrentUser()
    const currentToken = authService.getToken()

    setUser(currentUser)
    setToken(currentToken)
    setIsLoading(false)

    // Debug
    console.log("AuthProvider - Usuário carregado:", currentUser)
    console.log("AuthProvider - Token existe:", !!currentToken)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    console.log("AuthContext - Iniciando login com:", credentials)

    try {
      const response = await authService.login(credentials)
      console.log("AuthContext - Login bem sucedido:", response)

      // authService.login() já salvou no localStorage
      setUser(response.user)
      setToken(authService.getToken())

      // Debug
      console.log("AuthContext - Token salvo:", authService.getToken())
      console.log("AuthContext - Usuário salvo:", authService.getCurrentUser())
    } catch (error) {
      console.error("AuthContext - Erro no login:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    console.log("AuthContext - Iniciando logout")

    try {
      await authService.logout()
      setUser(null)
      setToken(null)
      console.log("AuthContext - Logout completo")
    } catch (error) {
      console.error("AuthContext - Erro no logout:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const isAuthenticated = !!token

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }

  console.log("AuthProvider - Valor do contexto:", {
    user: user?.username,
    isAuthenticated,
    isLoading,
  })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
