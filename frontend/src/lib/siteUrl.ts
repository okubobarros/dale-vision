export const getSiteUrl = (): string => {
  const envUrl = import.meta.env.VITE_SITE_URL
  const origin =
    typeof window !== "undefined" ? window.location.origin : ""

  if (import.meta.env.PROD) {
    if (origin && origin.includes("localhost")) {
      // eslint-disable-next-line no-console
      console.warn("[siteUrl] PROD com origin localhost. Verifique VITE_SITE_URL.")
    }
    if (!envUrl) {
      // eslint-disable-next-line no-console
      console.warn("[siteUrl] VITE_SITE_URL não configurado. Usando window.location.origin.")
    }
  }

  const base = (envUrl || origin || "https://app.dalevision.com").replace(/\/$/, "")
  return base
}

export const getAuthCallbackUrl = (): string => {
  const explicit = import.meta.env.VITE_AUTH_CALLBACK_URL
  if (explicit) {
    return explicit.replace(/\/$/, "")
  }

  const envUrl = import.meta.env.VITE_SITE_URL
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const base = (envUrl || origin || "").replace(/\/$/, "")

  if (!base) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn("[siteUrl] VITE_SITE_URL/VITE_AUTH_CALLBACK_URL não configurado.")
    }
    return "/auth/callback"
  }

  return `${base}/auth/callback`
}
