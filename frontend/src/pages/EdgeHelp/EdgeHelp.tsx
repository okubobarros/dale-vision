import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"

import { storesService } from "../../services/stores"
import { trackJourneyEvent } from "../../services/journey"

const EdgeHelp = () => {
  const [searchParams] = useSearchParams()
  const storeId = searchParams.get("store_id") || ""
  const reasonCode = searchParams.get("reason_code") || ""
  const cameraId = searchParams.get("camera_id") || ""
  const eventId = searchParams.get("event_id") || ""
  const escalationSource = searchParams.get("source") || ""
  const trackingSentRef = useRef(false)
  const escalationOpenedRef = useRef(false)
  const escalationCompletedRef = useRef(false)

  const runbookQ = useQuery({
    queryKey: ["edge-help-runbook", storeId, reasonCode],
    queryFn: () =>
      storesService.getStoreEdgeUpdateRunbook(storeId, {
        reason_code: reasonCode || undefined,
      }),
    enabled: Boolean(storeId),
    retry: false,
    staleTime: 60000,
  })

  const severityClass = useMemo(() => {
    const severity = runbookQ.data?.runbook?.severity
    if (severity === "critica") return "border-rose-200 bg-rose-50 text-rose-800"
    if (severity === "alta") return "border-amber-200 bg-amber-50 text-amber-800"
    return "border-blue-200 bg-blue-50 text-blue-800"
  }, [runbookQ.data?.runbook?.severity])

  useEffect(() => {
    if (!storeId || !escalationSource || escalationOpenedRef.current) return
    escalationOpenedRef.current = true
    void trackJourneyEvent("incident_escalate_opened_edge_help", {
      source: escalationSource,
      store_id: storeId,
      camera_id: cameraId || null,
      event_id: eventId || null,
    })
  }, [cameraId, escalationSource, eventId, storeId])

  useEffect(() => {
    if (!storeId || !runbookQ.data?.runbook || trackingSentRef.current) return
    trackingSentRef.current = true
    storesService.trackStoreEdgeUpdateRunbookOpened(storeId, {
      reason_code: runbookQ.data.runbook.reason_code || reasonCode || undefined,
      source_page: "edge_help",
    }).catch(() => {
      // ignore telemetry errors on help page
    })
  }, [reasonCode, runbookQ.data?.runbook, storeId])

  useEffect(() => {
    if (!storeId || !runbookQ.data?.runbook || escalationCompletedRef.current) return
    if (!escalationSource) return
    escalationCompletedRef.current = true
    void trackJourneyEvent("incident_escalate_completed", {
      source: escalationSource,
      store_id: storeId,
      camera_id: cameraId || null,
      event_id: eventId || null,
      reason_code: runbookQ.data.runbook.reason_code || reasonCode || null,
    })
  }, [cameraId, escalationSource, eventId, reasonCode, runbookQ.data?.runbook, storeId])

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Diagnose do Edge</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use este guia para estabilizar falhas de update e conectividade do agente.
        </p>
      </div>

      {storeId && runbookQ.isLoading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-600">
          Carregando runbook contextual da loja...
        </div>
      )}

      {storeId && runbookQ.data?.runbook && (
        <div className={`rounded-2xl border p-6 text-sm ${severityClass}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{runbookQ.data.runbook.title}</h2>
            <span className="rounded-full border border-current/30 bg-white px-2 py-0.5 text-xs font-semibold">
              Severidade: {runbookQ.data.runbook.severity}
            </span>
          </div>
          <p className="mt-2">{runbookQ.data.runbook.summary}</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-semibold">Ações imediatas</p>
              <ul className="mt-2 space-y-1">
                {runbookQ.data.runbook.immediate_actions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Diagnóstico</p>
              <ul className="mt-2 space-y-1">
                {runbookQ.data.runbook.diagnostic_steps.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Evidências para suporte</p>
              <ul className="mt-2 space-y-1">
                {runbookQ.data.runbook.evidence_to_collect.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3 text-sm text-gray-700">
        <div className="font-semibold text-gray-900">Passo a passo padrão</div>
        <div>1. Abra a pasta do Edge Agent no computador da loja.</div>
        <div>
          2. Dê duplo clique em <span className="font-mono">Diagnose.bat</span>.
        </div>
        <div>3. Aguarde a janela terminar e gerar o arquivo ZIP de diagnóstico.</div>
        <div>4. Envie o ZIP para o suporte (ou anexe no WhatsApp).</div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-sm text-blue-900">
        <div className="font-semibold">Dica rápida</div>
        <p className="mt-2">
          Se o Windows bloquear a execução, clique em “Mais informações” e depois “Executar assim
          mesmo”.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-2 text-sm text-gray-700">
        <div className="font-semibold text-gray-900">Template de placa de aviso</div>
        <p>Baixe e imprima a sinalização recomendada para lojas com monitoramento.</p>
        <a
          href="/placa-aviso-monitoramento.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          Abrir template de placa de aviso
        </a>
      </div>
    </div>
  )
}

export default EdgeHelp
