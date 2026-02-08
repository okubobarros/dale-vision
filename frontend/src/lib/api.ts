const FALLBACK_BASE_URL = "http://localhost:8000"

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim()
const baseUrl = rawBaseUrl.length > 0 ? rawBaseUrl : FALLBACK_BASE_URL

export const API_BASE_URL = `${baseUrl.replace(/\/+$/, "")}/api`
