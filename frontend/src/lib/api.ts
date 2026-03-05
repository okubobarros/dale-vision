const runtimeOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : ""

const inferredApiOrigin = (() => {
  if (!runtimeOrigin) return ""
  try {
    const url = new URL(runtimeOrigin)
    if (url.hostname === "app.dalevision.com") {
      return "https://api.dalevision.com"
    }
    return runtimeOrigin
  } catch {
    return runtimeOrigin
  }
})()

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || inferredApiOrigin).replace(/\/$/, "")
