export const ACCESS_TOKEN_STORAGE_KEY = "authToken"
export const USER_STORAGE_KEY = "userData"

const AUTH_EVENT = "dv-auth-changed"

let cachedAccessToken: string | null = null

const emitAuthChanged = () => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (token) {
    cachedAccessToken = token
  }
  return token
}

export const setAccessToken = (token: string | null): void => {
  cachedAccessToken = token
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  }
  emitAuthChanged()
}

export const clearAccessToken = (): void => {
  setAccessToken(null)
}

export const getStoredUser = <T = unknown>(): T | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const setStoredUser = (user: unknown): void => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  emitAuthChanged()
}

export const clearStoredUser = (): void => {
  localStorage.removeItem(USER_STORAGE_KEY)
  emitAuthChanged()
}

export const clearAuthStorage = (): void => {
  cachedAccessToken = null
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
  emitAuthChanged()
}

export const subscribeAuthChanges = (handler: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {}
  const wrapped = () => handler()
  window.addEventListener(AUTH_EVENT, wrapped)
  window.addEventListener("storage", wrapped)
  return () => {
    window.removeEventListener(AUTH_EVENT, wrapped)
    window.removeEventListener("storage", wrapped)
  }
}
