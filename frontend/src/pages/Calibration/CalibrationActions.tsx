import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

import { adminService, type CalibrationActionItem } from "../../services/admin"
import { storesService } from "../../services/stores"

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em execução" },
  { value: "waiting_validation", label: "Aguard. validação" },
  { value: "validated", label: "Validado" },
  { value: "rejected", label: "Reprovado" },
]

const priorityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
}

const statusBadge: Record<string, string> = {
  open: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  waiting_validation: "bg-amber-100 text-amber-700 border-amber-200",
  validated: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR")
}

export default function CalibrationActions() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [storeFilter, setStoreFilter] = useState<string>("all")

  const storesQuery = useQuery({
    queryKey: ["calibration", "stores-summary"],
    queryFn: () => storesService.getStoresSummary(),
    staleTime: 60_000,
  })

  const actionsQuery = useQuery({
    queryKey: ["calibration", "actions", statusFilter, storeFilter],
    queryFn: () =>
      adminService.getCalibrationActions({
        status: statusFilter === "all" ? undefined : statusFilter,
        store_id: storeFilter === "all" ? undefined : storeFilter,
        limit: 150,
      }),
    refetchInterval: 30_000,
  })

  const patchActionMutation = useMutation({
    mutationFn: ({
      actionId,
      payload,
    }: {
      actionId: string
      payload: { status?: string; priority?: string; notes?: string }
    }) => adminService.patchCalibrationAction(actionId, payload),
    onSuccess: () => {
      toast.success("Status da ação atualizado.")
      queryClient.invalidateQueries({ queryKey: ["calibration", "actions"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "calibration-actions", "active"] })
    },
    onError: (error: unknown) => {
      toast.error((error as { message?: string })?.message || "Falha ao atualizar ação.")
    },
  })

  const actions = useMemo(() => (actionsQuery.data?.items || []) as CalibrationActionItem[], [actionsQuery.data?.items])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calibração de Câmeras e ROI</h1>
          <p className="text-sm text-gray-600">
            Backlog operacional para ajustes com validação antes/depois por loja e câmera.
          </p>
        </div>
        <div className="text-xs text-gray-500">
          Atualizado: {actionsQuery.dataUpdatedAt ? new Date(actionsQuery.dataUpdatedAt).toLocaleString("pt-BR") : "—"}
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Status</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Loja</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
            >
              <option value="all">Todas as lojas</option>
              {(storesQuery.data || []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Ações no filtro</div>
            <div className="mt-1 text-2xl font-bold">{actions.length}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        {actionsQuery.isLoading ? (
          <div className="text-sm text-gray-600">Carregando ações de calibração...</div>
        ) : actions.length === 0 ? (
          <div className="text-sm text-gray-600">Sem ações para os filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Loja / Câmera</th>
                  <th className="px-3 py-2 text-left font-semibold">Issue</th>
                  <th className="px-3 py-2 text-left font-semibold">Ação recomendada</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Prioridade</th>
                  <th className="px-3 py-2 text-left font-semibold">Atualizado</th>
                  <th className="px-3 py-2 text-left font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {actions.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{row.store_name || row.store_id}</div>
                      <div className="text-xs text-gray-500">{row.camera_name || row.camera_id || "Todas as câmeras"}</div>
                    </td>
                    <td className="px-3 py-2">{row.issue_code}</td>
                    <td className="px-3 py-2">{row.recommended_action}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusBadge[row.status] || statusBadge.open}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${priorityBadge[row.priority] || priorityBadge.medium}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatDateTime(row.updated_at || row.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            patchActionMutation.mutate({
                              actionId: row.id,
                              payload: { status: "in_progress" },
                            })
                          }
                          disabled={patchActionMutation.isPending}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Em execução
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchActionMutation.mutate({
                              actionId: row.id,
                              payload: { status: "waiting_validation" },
                            })
                          }
                          disabled={patchActionMutation.isPending}
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Aguard. validação
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchActionMutation.mutate({
                              actionId: row.id,
                              payload: { status: "validated" },
                            })
                          }
                          disabled={patchActionMutation.isPending}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                          Validar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
