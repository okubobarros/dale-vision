const raw = String(import.meta.env.VITE_USE_MOCK_DATA || "").trim().toLowerCase()

export const USE_MOCK_DATA =
  !import.meta.env.PROD && (raw === "1" || raw === "true" || raw === "yes")
