import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsService} from "./alerts";
import type { AlertIngestPayload } from "../services/alerts"

export const alertsQueries = {
  useAlertRules(storeId?: string) {
    return useQuery({
      queryKey: ["alert-rules", storeId],
      queryFn: () => alertsService.listRules(storeId),
    });
  },

  useEvents(params?: { store_id?: string; status?: "open" | "resolved" | "ignored" }) {
    return useQuery({
      queryKey: ["events", params],
      queryFn: () => alertsService.listEvents(params),
    });
  },

  useIngest() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (payload: AlertIngestPayload) => alertsService.ingest(payload),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["events"] });
      },
    });
  },

  useResolveEvent() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => alertsService.resolveEvent(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    });
  },

  useIgnoreEvent() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => alertsService.ignoreEvent(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    });
  },
};
