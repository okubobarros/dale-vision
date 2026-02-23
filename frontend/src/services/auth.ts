// src/services/auth.ts
import api, { syncApiAuthHeader } from "./api"
import { supabase } from "../lib/supabase"
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
} from "./authStorage"
import {
  type AuthResponse,
  buildUserFromSupabase,
  saveSupabaseSession,
} from "./authSession"

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

// ============ AGORA A authService ============

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
    syncApiAuthHeader()

    // Bootstrap é melhor esforço; não deve bloquear o login em caso de timeout.
    void api
      .post("/accounts/supabase/", {}, { timeout: 5000 })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.warn("[auth] supabase bootstrap failed", error)
        }
      })

    return saved
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error: unknown) {
      console.warn("Erro no logout do Supabase:", error)
    } finally {
      // Sempre limpa o localStorage
      clearAuthStorage()
      syncApiAuthHeader()
    }
  },

  getCurrentUser(): User | null {
    return getStoredUser<User>()
  },

  getToken(): string | null {
    return getAccessToken()
  },

  rehydrate(): { user: User | null; token: string | null } {
    const user = getStoredUser<User>()
    const token = getAccessToken()
    syncApiAuthHeader()
    if (import.meta.env.DEV) {
      console.log("auth rehydrated", { hasUser: !!user, hasToken: !!token })
    }
    return { user, token }
  },

  saveSupabaseSession,
  buildUserFromSupabase,
}
