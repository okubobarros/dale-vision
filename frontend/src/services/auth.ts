// src/services/auth.ts
import api from "./api"
import { supabase } from "../lib/supabase"

// ============ DEFINIR OS TYPES PRIMEIRO ============

export interface LoginCredentials {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
}

export interface AuthResponse {
  token: string
  user: User
  expiry?: string
}

// ============ AGORA A authService ============

const buildUserFromSupabase = (sbUser: any, fallbackEmail: string): User => {
  const email = sbUser?.email || fallbackEmail
  const fullName = sbUser?.user_metadata?.full_name as string | undefined
  const first = (sbUser?.user_metadata?.first_name as string) || (fullName ? fullName.split(" ")[0] : "")
  const last = (sbUser?.user_metadata?.last_name as string) || (fullName ? fullName.split(" ").slice(1).join(" ") : "")
  return {
    id: sbUser?.id || "",
    email: email || "",
    username: (sbUser?.user_metadata?.username as string) || (email ? email.split("@")[0] : sbUser?.id || ""),
    first_name: first,
    last_name: last,
  }
}

const saveSupabaseSession = (session: any, sbUser: any, fallbackEmail: string) => {
  const user = buildUserFromSupabase(sbUser, fallbackEmail)
  localStorage.setItem("authToken", session.access_token)
  localStorage.setItem("userData", JSON.stringify(user))
  return { token: session.access_token, user, expiry: session.expires_at?.toString() }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const email = credentials.username.trim()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: credentials.password,
    })

    if (error) {
      throw error
    }
    if (!data.session || !data.user) {
      throw new Error("Sessão não encontrada")
    }

    const saved = saveSupabaseSession(data.session, data.user, email)

    try {
      await api.post("/accounts/supabase/")
    } catch {
      // bootstrap é melhor esforço
    }

    return saved
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn("Erro no logout do Supabase:", error)
    } finally {
      // Sempre limpa o localStorage
      localStorage.removeItem("authToken")
      localStorage.removeItem("userData")
    }
  },

  getCurrentUser(): User | null {
    const userData = localStorage.getItem("userData")
    return userData ? JSON.parse(userData) : null
  },

  getToken(): string | null {
    return localStorage.getItem("authToken")
  },

  // setupToken não é mais necessário - o interceptor cuida disso
  setupToken(): void {
    console.log("setupToken chamado - interceptor já cuida disso")
  },
  saveSupabaseSession,
  buildUserFromSupabase,
}
