// src/services/api.ts
import axios from "axios"
import { createElement } from "react"
import toast from "react-hot-toast"
import { API_BASE_URL } from "../lib/api"

const getTokenFromStorage = (): string | null => {
  return localStorage.getItem("authToken")
}

const DEFAULT_TIMEOUT_MS = import.meta.env.PROD ? 60000 : 30000
const LONG_TIMEOUT_MS = 60000
const RETRY_BACKOFF_MS = [1000, 3000]

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

const showTimeoutRetryToast = (config: any) => {
  const id = "api-timeout-retry"
  toast.custom(
    (t) =>
      createElement(
        "div",
        {
          className:
            "flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg",
        },
        createElement(
          "div",
          { className: "text-sm text-gray-700" },
          "Acordando servidor... tente novamente"
        ),
        createElement(
          "button",
          {
            type: "button",
            className:
              "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700",
            onClick: () => {
              toast.dismiss(t.id)
              if (config) {
                config._retryCount = 0
                api.request(config)
              }
            },
          },
          "Retry"
        )
      ),
    { id }
  )
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
        ;(config.headers as any).set("Authorization", `Bearer ${token}`)
      } else {
        config.headers = config.headers ?? {}
        ;(config.headers as any)["Authorization"] = `Bearer ${token}`
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
      auth: (() => {
        const headerValue =
          config.headers && typeof (config.headers as any).get === "function"
            ? (config.headers as any).get("Authorization")
            : (config.headers as any)?.Authorization
        const scheme = typeof headerValue === "string" ? headerValue.split(" ")[0] : null
        return { present: !!headerValue, scheme }
      })(),
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
    const paywall = error.response?.data
    const method = String(error.config?.method || "get").toLowerCase()
    const isGet = method === "get"
    const shouldRetry = isGet && (isTimeout || [502, 503, 504].includes(status))

    const config = error.config as any
    const retryCount = (config?._retryCount as number) || 0

    if (shouldRetry && config && retryCount < RETRY_BACKOFF_MS.length) {
      config._retryCount = retryCount + 1
      const delay = RETRY_BACKOFF_MS[retryCount]

      return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
        api.request(config)
      )
    }

    if (isTimeout && isGet) {
      showTimeoutRetryToast(config)
    }

    if (paywall?.code === "PAYWALL_TRIAL_LIMIT" && paywall?.meta?.entity === "camera") {
      toast.error("Seu trial permite até 3 câmeras por loja.")
    }

    if (paywall?.code === "SUBSCRIPTION_REQUIRED") {
      if (typeof window !== "undefined") {
        window.location.href = "/app/billing"
      }
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
