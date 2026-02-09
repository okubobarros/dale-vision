// src/services/api.ts
import axios from "axios"
import toast from "react-hot-toast"
import { API_BASE_URL } from "../lib/api"

const getTokenFromStorage = (): string | null => {
  return localStorage.getItem("authToken")
}

const DEFAULT_TIMEOUT_MS = 30000
const LONG_TIMEOUT_MS = 60000
const RETRY_BACKOFF_MS = [800, 1600]

const isLongTimeoutPath = (url?: string) => {
  const u = String(url || "")
  return /(^|\/)alerts\//.test(u) || /(^|\/)v1\/stores\//.test(u)
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: false, // ✅ Knox não precisa de cookies
})

if (import.meta.env.DEV) {
  console.log("[API] API_BASE_URL =", API_BASE_URL)
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const timeout = isLongTimeoutPath(config.url) ? LONG_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
    config.timeout = Math.max(Number(config.timeout || 0), timeout)

    const token = getTokenFromStorage()

    // ✅ Axios v1: headers pode ser AxiosHeaders (tem .set)
    if (token) {
      if (config.headers && typeof (config.headers as any).set === "function") {
        ;(config.headers as any).set("Authorization", `Token ${token}`)
      } else {
        config.headers = config.headers ?? {}
        ;(config.headers as any)["Authorization"] = `Token ${token}`
      }
    } else {
      // remove Authorization se não tiver token
      if (config.headers && typeof (config.headers as any).delete === "function") {
        ;(config.headers as any).delete("Authorization")
      } else if (config.headers) {
        delete (config.headers as any)["Authorization"]
      }
    }

    // ✅ DEBUG depois de setar token (agora é real)
    console.log("🔵 API Request:", {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      authHeader:
        config.headers && typeof (config.headers as any).get === "function"
          ? (config.headers as any).get("Authorization")
          : (config.headers as any)?.Authorization,
      data: config.data,
    })

    return config
  },
  (error) => {
    console.error("🔴 API Request Error:", error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("🟢 API Response:", {
      url: response.config.url,
      status: response.status,
    })
    return response
  },
  (error) => {
    const isTimeout =
      error.code === "ECONNABORTED" ||
      String(error.message || "").toLowerCase().includes("timeout")
    const status = error.response?.status
    const shouldRetry = isTimeout || [502, 503, 504].includes(status)

    const config = error.config as any
    const retryCount = (config?._retryCount as number) || 0

    if (shouldRetry && config && retryCount < RETRY_BACKOFF_MS.length) {
      config._retryCount = retryCount + 1
      const delay = RETRY_BACKOFF_MS[retryCount]

      if (isTimeout) {
        toast("Serviço acordando (Render free). Tentando novamente...", {
          id: "render-wakeup",
        })
      }

      return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
        api.request(config)
      )
    }

    if (isTimeout) {
      console.warn("🟠 API Timeout:", {
        url: error.config?.url,
        timeoutMs: error.config?.timeout,
        message: error.message,
      })
    } else if (error.response) {
      console.error("🔴 API HTTP Error:", {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    } else {
      console.error("🔴 API Network Error:", {
        url: error.config?.url,
        code: error.code,
        message: error.message,
      })
    }
    return Promise.reject(error)
  }
)

export default api
