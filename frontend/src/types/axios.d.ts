import "axios"

declare module "axios" {
  export interface AxiosRequestConfig {
    timeoutCategory?: "default" | "critical" | "best-effort" | "long"
    _requestStart?: number
    _retryCount?: number
    _retryAuth?: boolean
  }
}
