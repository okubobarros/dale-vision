// src/queries/alerts.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AlertIngestPayload } from "../services/alerts"
import { alertsService } from "../services/alerts"

export function useAlertsEvents(
  params: {
  store_id?: string
  status?: "open" | "resolved" | "ignored"
  severity?: "critical" | "warning" | "info"
  occurred_from?: string
  occurred_to?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["alerts", "events", params],
    queryFn: () => alertsService.listEvents(params),
    enabled: options?.enabled,
  })
}

export function useAlertLogs(params: { store_id?: string; event_id?: string }) {
  return useQuery({
    queryKey: ["alerts", "logs", params],
    queryFn: () => alertsService.listLogs(params),
    enabled: Boolean(params.store_id || params.event_id),
  })
}

export function useResolveEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => alertsService.resolveEvent(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts", "events"] })
      qc.invalidateQueries({ queryKey: ["alerts", "logs"] })
    },
  })
}

export function useIgnoreEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => alertsService.ignoreEvent(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts", "events"] })
      qc.invalidateQueries({ queryKey: ["alerts", "logs"] })
    },
  })
}

export function useIngestAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AlertIngestPayload) => alertsService.ingest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts", "events"] })
      qc.invalidateQueries({ queryKey: ["alerts", "logs"] })
    },
  })
}
