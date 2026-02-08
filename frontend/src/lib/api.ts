const FALLBACK_ORIGIN = "http://localhost:8000"

const rawOrigin = (import.meta.env.VITE_API_ORIGIN || "").trim()
const origin = rawOrigin.length > 0 ? rawOrigin : FALLBACK_ORIGIN

export const API_ORIGIN = origin.replace(/\/+$/, "")
export const API_BASE_URL = `${API_ORIGIN}/api`
