export function formatAge(ageSeconds?: number | null): string {
  if (ageSeconds === null || ageSeconds === undefined) return "-"
  if (ageSeconds < 60) return `${ageSeconds}s`
  const mins = Math.floor(ageSeconds / 60)
  const secs = ageSeconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m`
}

export function formatReason(reason?: string | null): string {
  if (!reason) return "-"
  const map: Record<string, string> = {
    recent_heartbeat: "heartbeat recente",
    stale_heartbeat: "heartbeat atrasado",
    heartbeat_expired: "heartbeat expirado",
    no_heartbeat: "sem heartbeat",
    has_online_camera: "tem câmera online",
    partial_camera_coverage: "cobertura parcial",
    all_cameras_online: "todas online",
  }
  return map[reason] || reason
}

export function formatTimestamp(ts?: string | null): string {
  if (!ts) return "-"
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString()
  } catch {
    return "-"
  }
}

export function formatStatusLabel(status?: string | null): string {
  switch (status) {
    case "online":
      return "Online"
    case "degraded":
      return "Degradado"
    case "offline":
      return "Offline"
    case "unknown":
      return "Desconhecido"
    default:
      return status ? String(status) : "-"
  }
}

export function statusPillClass(status?: string | null): string {
  switch (status) {
    case "online":
      return "bg-green-100 text-green-800"
    case "degraded":
      return "bg-yellow-100 text-yellow-800"
    case "offline":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}
