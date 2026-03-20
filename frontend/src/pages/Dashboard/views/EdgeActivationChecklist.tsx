import { useEffect } from "react"
import { Link } from "react-router-dom"
import { trackJourneyEvent, trackJourneyEventOnce } from "../../../services/journey"

type EdgeActivationChecklistItem = {
  key: "token" | "agent_online" | "heartbeat" | "camera_health" | "first_metrics"
  label: string
  done: boolean
  href: string
  hint: string
}

type EdgeActivationChecklistProps = {
  storeId: string
  storeName?: string | null
  items: EdgeActivationChecklistItem[]
}

export function EdgeActivationChecklist({
  storeId,
  storeName,
  items,
}: EdgeActivationChecklistProps) {
  const completedCount = items.filter((item) => item.done).length
  const isCompleted = completedCount === items.length
  const firstMetricsDone = items.find((item) => item.key === "first_metrics")?.done === true

  useEffect(() => {
    void trackJourneyEvent("edge_checklist_viewed", {
      store_id: storeId,
      completed_steps: completedCount,
      total_steps: items.length,
    })
  }, [completedCount, items.length, storeId])

  useEffect(() => {
    if (!firstMetricsDone) return
    void trackJourneyEventOnce(
      `edge_first_signal_${storeId}`,
      "edge_first_signal_achieved",
      { store_id: storeId }
    )
  }, [firstMetricsDone, storeId])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Checklist de ativação da loja
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {storeName ? `${storeName}: ` : ""}
            {completedCount}/{items.length} etapas concluídas.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            isCompleted
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {isCompleted ? "Ativação concluída" : "Ativação em progresso"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border p-3 ${
              item.done ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                {item.label}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                }`}
              >
                {item.done ? "OK" : "Pendente"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">{item.hint}</p>
            {!item.done && (
              <Link
                to={item.href}
                onClick={() => {
                  void trackJourneyEvent("edge_checklist_step_clicked", {
                    store_id: storeId,
                    step: item.key,
                  })
                }}
                className="mt-3 inline-flex text-xs font-semibold text-cyan-700 hover:text-cyan-800"
              >
                Corrigir agora
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default EdgeActivationChecklist
