// src/services/api.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosHeaderValue,
  type AxiosRequestConfig,
} from "axios"
import { createElement } from "react"
import toast from "react-hot-toast"
import { API_BASE_URL } from "../lib/api"
import { clearAuthStorage, getAccessToken } from "./authStorage"
import { refreshSupabaseSession } from "./authSession"

const DEFAULT_TIMEOUT_MS = import.meta.env.PROD ? 60000 : 30000
const LONG_TIMEOUT_MS = 120000
const SHORT_TIMEOUT_MS = 5000
const RETRY_BACKOFF_MS = [1000, 3000]
const TRIAL_EXPIRED_CODE = "TRIAL_EXPIRED"
const SUBSCRIPTION_REQUIRED_CODE = "SUBSCRIPTION_REQUIRED"
const TRIAL_EXPIRED_STORAGE_KEY = "dv_trial_expired"
const TRIAL_EXPIRED_EVENT = "dv-trial-expired"

const isLongTimeoutPath = (url?: string) => {
  const u = String(url || "")
  return /(^|\/)alerts\//.test(u) || /(^|\/)v1\/stores\//.test(u)
}

const isShortTimeoutPath = (url?: string) => {
  const u = String(url || "")
  return /(^|\/)accounts\/supabase\/?$/.test(u)
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

type RetriableConfig = AxiosRequestConfig & { _retryCount?: number }
type AuthRetryConfig = RetriableConfig & { _retryAuth?: boolean }

const isAxiosHeaders = (
  headers: AxiosRequestConfig["headers"]
): headers is AxiosHeaders => headers instanceof AxiosHeaders

let hasLoggedAuthHeader = false

const setDefaultsAuthHeader = (token: string | null) => {
  const commonHeaders = api.defaults.headers.common as Record<
    string,
    AxiosHeaderValue
  >
  if (token) {
    commonHeaders.Authorization = `Bearer ${token}`
  } else {
    delete commonHeaders.Authorization
  }
}

export const syncApiAuthHeader = () => {
  const token = getAccessToken()
  setDefaultsAuthHeader(token)
  if (token && !hasLoggedAuthHeader) {
    console.log("axios auth header set")
    hasLoggedAuthHeader = true
  } else if (!token && hasLoggedAuthHeader) {
    console.log("axios auth header cleared")
    hasLoggedAuthHeader = false
  }
}

const setAuthHeader = (config: AxiosRequestConfig, token: string | null) => {
  const headers = config.headers
  if (token) {
    if (isAxiosHeaders(headers)) {
      headers.set("Authorization", `Bearer ${token}`)
    } else {
      const headerRecord = (headers ?? {}) as Record<string, AxiosHeaderValue>
      config.headers = { ...headerRecord, Authorization: `Bearer ${token}` }
    }
    return
  }

  if (isAxiosHeaders(headers)) {
    headers.delete("Authorization")
    return
  }
  if (headers && typeof headers === "object") {
    const nextHeaders = { ...(headers as Record<string, AxiosHeaderValue>) }
    delete nextHeaders.Authorization
    config.headers = nextHeaders
  }
}

const getAuthHeaderValue = (config: AxiosRequestConfig): string | null => {
  const headers = config.headers
  if (isAxiosHeaders(headers)) {
    const value = headers.get("Authorization")
    return typeof value === "string" ? value : null
  }
  if (headers && typeof headers === "object") {
    const value = (headers as Record<string, unknown>).Authorization
    return typeof value === "string" ? value : null
  }
  return null
}

const showTimeoutRetryToast = (config?: RetriableConfig) => {
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

const notifyTrialExpired = () => {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(TRIAL_EXPIRED_STORAGE_KEY, "1")
    window.dispatchEvent(new CustomEvent(TRIAL_EXPIRED_EVENT))
  } catch {
    // ignore storage errors
  }
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const timeout = isShortTimeoutPath(config.url)
      ? SHORT_TIMEOUT_MS
      : isLongTimeoutPath(config.url)
      ? LONG_TIMEOUT_MS
      : DEFAULT_TIMEOUT_MS
    const existingTimeout = Number(config.timeout || 0)
    if (!existingTimeout) {
      config.timeout = timeout
    } else if (isShortTimeoutPath(config.url) && existingTimeout > timeout) {
      config.timeout = timeout
    } else if (isLongTimeoutPath(config.url) && existingTimeout < timeout) {
      config.timeout = timeout
    }

    const token = getAccessToken()

    // ✅ Axios v1: headers pode ser AxiosHeaders (tem .set)
    setAuthHeader(config, token)

    // ✅ DEBUG depois de setar token (agora é real)
    console.log("🔵 API Request:", {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      auth: (() => {
        const headerValue = getAuthHeaderValue(config)
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
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      console.error("🔴 API Error:", error)
      return Promise.reject(error)
    }
    const axiosError = error as AxiosError<unknown>
    const isTimeout =
      axiosError.code === "ECONNABORTED" ||
      String(axiosError.message || "").toLowerCase().includes("timeout")
    const status = axiosError.response?.status
    const paywall = axiosError.response?.data as
      | { code?: string; meta?: { entity?: string } }
      | undefined
    const method = String(axiosError.config?.method || "get").toLowerCase()
    const isGet = method === "get"
    const shouldRetry =
      isGet &&
      (isTimeout || (status !== undefined && [502, 503, 504].includes(status)))

    const config = axiosError.config as AuthRetryConfig | undefined
    const retryCount = config?._retryCount ?? 0

    if (shouldRetry && config && retryCount < RETRY_BACKOFF_MS.length) {
      config._retryCount = retryCount + 1
      const delay =
        RETRY_BACKOFF_MS[retryCount] ??
        RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]
      const delayMs: number = delay ?? 0

      return new Promise((resolve) => setTimeout(resolve, delayMs)).then(() =>
        api.request(config)
      )
    }

    if ((status === 401 || status === 403) && config && !config._retryAuth) {
      config._retryAuth = true
      const refreshed = await refreshSupabaseSession()
      if (refreshed?.token) {
        syncApiAuthHeader()
        return api.request(config)
      }
      clearAuthStorage()
      syncApiAuthHeader()
    }

    if (isTimeout && isGet) {
      showTimeoutRetryToast(config)
    }

    if (paywall?.code === "PAYWALL_TRIAL_LIMIT" && paywall?.meta?.entity === "camera") {
      toast.error("Seu trial permite até 3 câmeras por loja.")
    }

    if (
      status === 402 ||
      paywall?.code === TRIAL_EXPIRED_CODE ||
      paywall?.code === SUBSCRIPTION_REQUIRED_CODE
    ) {
      notifyTrialExpired()
    }

    if (isTimeout) {
      console.warn("🟠 API Timeout:", {
        url: axiosError.config?.url,
        timeoutMs: axiosError.config?.timeout,
        message: axiosError.message,
      })
    } else if (axiosError.response) {
      console.error("🔴 API HTTP Error:", {
        url: axiosError.config?.url,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
      })
    } else {
      console.error("🔴 API Network Error:", {
        url: axiosError.config?.url,
        code: axiosError.code,
        message: axiosError.message,
      })
    }
    return Promise.reject(axiosError)
  }
)

export default api
