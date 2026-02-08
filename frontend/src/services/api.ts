// src/services/api.ts
import axios from "axios"
import { API_BASE_URL } from "../lib/api"

const getTokenFromStorage = (): string | null => {
  return localStorage.getItem("authToken")
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: false, // ✅ Knox não precisa de cookies
})

console.log("[API] baseURL =", API_BASE_URL)

// Request interceptor
api.interceptors.request.use(
  (config) => {
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
    console.error("🔴 API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })
    return Promise.reject(error)
  }
)

export default api
