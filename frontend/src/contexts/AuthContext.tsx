// src/contexts/useAuth.tsx
import { useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import { authService } from "../services/auth"
import { subscribeAuthChanges } from "../services/authStorage"
import type { User, LoginCredentials } from "../services/auth"
import type { AuthContextType } from "./authContextBase"
import { AuthContext } from "./authContextBase"

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const { user: currentUser, token: currentToken } = authService.rehydrate()

    setUser(currentUser)
    setToken(currentToken)
    setIsLoading(false)
    setAuthReady(true)

    console.log("AuthProvider - Usuário carregado:", currentUser)
    console.log("AuthProvider - Token existe:", !!currentToken)
  }, [])

  const refreshAuth = useCallback(() => {
    const { user: currentUser, token: currentToken } = authService.rehydrate()
    setUser(currentUser)
    setToken(currentToken)
    setAuthReady(true)
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
      setAuthReady(true)

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
      setAuthReady(true)
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
    authReady,
    login,
    logout,
    refreshAuth,
  }

  console.log("AuthProvider - Valor do contexto:", {
    user: user?.username,
    isAuthenticated,
    isLoading,
  })

  useEffect(() => {
    const unsubscribe = subscribeAuthChanges(() => {
      const { user: nextUser, token: nextToken } = authService.rehydrate()
      setUser(nextUser)
      setToken(nextToken)
      setAuthReady(true)
    })
    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
