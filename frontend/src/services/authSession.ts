import { supabase } from "../lib/supabase"
import {
  getAccessToken,
  setAccessToken,
  setStoredUser,
} from "./authStorage"
import type { User } from "./auth"

export type SupabaseUser = {
  id?: string
  email?: string
  user_metadata?: {
    full_name?: string
    first_name?: string
    last_name?: string
    username?: string
  }
}

export type SupabaseSession = {
  access_token: string
  expires_at?: number
  user?: SupabaseUser | null
}

export interface AuthResponse {
  token: string
  user: User
  expiry?: string
}

export const buildUserFromSupabase = (
  sbUser: SupabaseUser,
  fallbackEmail: string
): User => {
  const email = sbUser?.email || fallbackEmail
  const fullName = sbUser?.user_metadata?.full_name as string | undefined
  const first =
    (sbUser?.user_metadata?.first_name as string) ||
    (fullName ? fullName.split(" ")[0] : "")
  const last =
    (sbUser?.user_metadata?.last_name as string) ||
    (fullName ? fullName.split(" ").slice(1).join(" ") : "")
  return {
    id: sbUser?.id || "",
    email: email || "",
    username:
      (sbUser?.user_metadata?.username as string) ||
      (email ? email.split("@")[0] : sbUser?.id || ""),
    first_name: first,
    last_name: last,
  }
}

export const saveSupabaseSession = (
  session: SupabaseSession,
  sbUser: SupabaseUser,
  fallbackEmail: string
): AuthResponse => {
  const user = buildUserFromSupabase(sbUser, fallbackEmail)
  setAccessToken(session.access_token)
  setStoredUser(user)
  return { token: session.access_token, user, expiry: session.expires_at?.toString() }
}

export const refreshSupabaseSession = async (): Promise<AuthResponse | null> => {
  const existingToken = getAccessToken()
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      if (import.meta.env.DEV) {
        console.warn("[auth] refresh session failed", error)
      }
      return null
    }
    const session = data.session
    const sbUser =
      data.user ??
      session?.user ??
      (await supabase.auth.getUser()).data?.user ??
      null
    if (!session?.access_token || !sbUser) {
      return null
    }
    if (existingToken && existingToken === session.access_token) {
      return null
    }
    return saveSupabaseSession(session, sbUser, sbUser.email || "")
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[auth] refresh session exception", error)
    }
    return null
  }
}
