type EdgeReasonMap = Record<string, string>

const EDGE_REASON_MAP: EdgeReasonMap = {
  recent_heartbeat: "heartbeat recente",
  stale_heartbeat: "heartbeat atrasado",
  heartbeat_expired: "heartbeat atrasado",
  no_heartbeat: "sem heartbeat ainda",
}

export function formatReason(reason?: string | null): string | null {
  if (!reason) return null
  return EDGE_REASON_MAP[reason] ?? reason.replace(/_/g, " ")
}

export function formatAge(ageSeconds?: number | null): string {
  if (ageSeconds === undefined || ageSeconds === null) return "—"
  if (ageSeconds < 60) return `${ageSeconds}s`
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)} min`
  return `${Math.floor(ageSeconds / 3600)} h`
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  })
}
