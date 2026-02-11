import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

type StepKey = "agent" | "camera" | "roi" | "trial"

type SetupState = {
  pairing_code: string
  agent_online: boolean

  camera_name: string
  rtsp_url: string
  camera_ok: boolean

  roi_done: boolean
  trial_started_at?: string | null
}

function generatePairingCode() {
  // simples p/ demo; depois você troca pelo backend
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `DV-${rnd}`
}

export default function Setup() {
  const navigate = useNavigate()

  const steps: { key: StepKey; title: string; desc: string }[] = useMemo(
    () => [
      {
        key: "agent",
        title: "1) Conectar Edge Agent",
        desc: "Baixe o agent.exe, rode na máquina local e pareie com o código.",
      },
      {
        key: "camera",
        title: "2) Conectar câmera (RTSP/ONVIF)",
        desc: "Valide que conseguimos capturar um snapshot (sem travar a operação).",
      },
      {
        key: "roi",
        title: "3) Definir Zonas (ROI)",
        desc: "Marque áreas como fila, caixa, entrada e zonas sensíveis.",
      },
      {
        key: "trial",
        title: "4) Iniciar Trial (72h)",
        desc: "O trial só começa quando Agent + 1 câmera estão OK.",
      },
    ],
    []
  )

  const [step, setStep] = useState<StepKey>("agent")
  const stepIndex = steps.findIndex((s) => s.key === step)

  const [state, setState] = useState<SetupState>(() => {
    const saved = localStorage.getItem("dv_setup_state")
    if (saved) {
      try {
        return JSON.parse(saved) as SetupState
      } catch {
        // ignore
      }
    }
    return {
      pairing_code: generatePairingCode(),
      agent_online: false,
      camera_name: "",
      rtsp_url: "",
      camera_ok: false,
      roi_done: false,
      trial_started_at: null,
    }
  })

  useEffect(() => {
    localStorage.setItem("dv_setup_state", JSON.stringify(state))
  }, [state])

  function goNext() {
    const next = steps[stepIndex + 1]
    if (next) setStep(next.key)
  }

  function goPrev() {
    const prev = steps[stepIndex - 1]
    if (prev) setStep(prev.key)
  }

  const canGoCamera = state.agent_online
  const canGoRoi = state.agent_online && state.camera_ok
  const canStartTrial = state.agent_online && state.camera_ok && state.roi_done

  // ✅ “testes” mock: depois liga com backend/agent
  async function simulateAgentCheck() {
    // aqui você vai substituir por polling real: /agents/status?pairing_code=...
    await new Promise((r) => setTimeout(r, 700))
    setState((s) => ({ ...s, agent_online: true }))
  }

  async function simulateCameraTest() {
    if (!state.rtsp_url.trim()) return
    await new Promise((r) => setTimeout(r, 900))
    setState((s) => ({ ...s, camera_ok: true }))
  }

  function simulateRoiDone() {
    setState((s) => ({ ...s, roi_done: true }))
  }

  function startTrial() {
    if (!canStartTrial) return
    const now = new Date().toISOString()
    setState((s) => ({ ...s, trial_started_at: now }))
    // manda pro dashboard
    navigate("/app/dashboard")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Setup Técnico</h1>
          <p className="text-sm text-gray-600">
            Primeiro validamos o mundo real (agent + câmera). Só então iniciamos o trial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              state.agent_online
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-800 border-yellow-200"
            }`}
          >
            Agent: {state.agent_online ? "ONLINE" : "OFFLINE"}
          </span>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              state.camera_ok
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-700 border-gray-200"
            }`}
          >
            Câmera: {state.camera_ok ? "OK" : "pendente"}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {steps.map((s) => {
            const active = s.key === step
            const done =
              (s.key === "agent" && state.agent_online) ||
              (s.key === "camera" && state.camera_ok) ||
              (s.key === "roi" && state.roi_done) ||
              (s.key === "trial" && !!state.trial_started_at)

            const locked =
              (s.key === "camera" && !canGoCamera) ||
              (s.key === "roi" && !canGoRoi) ||
              (s.key === "trial" && !(state.agent_online && state.camera_ok))

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => !locked && setStep(s.key)}
                className={`text-left rounded-xl border p-4 transition ${
                  active ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                } ${locked ? "opacity-50 cursor-not-allowed hover:bg-white" : ""}`}
                disabled={locked}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-gray-900 text-sm">{s.title}</div>
                  <div className="text-xs">
                    {done ? "✅" : locked ? "🔒" : "•"}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">{s.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white border rounded-xl p-5">
        {step === "agent" && (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-gray-900">Conectar Edge Agent</div>
              <div className="text-sm text-gray-600 mt-1">
                O agent roda na máquina local (na loja ou NVR/servidor) e envia sinais para o backend.
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Seu Pairing Code</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="font-mono text-lg bg-white border rounded-lg px-3 py-2">
                  {state.pairing_code}
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                  onClick={() => {
                    navigator.clipboard?.writeText(state.pairing_code)
                  }}
                >
                  Copiar
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Depois você troca isso por “gerar no backend” e validar o agent via polling.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                className="rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                <div className="font-semibold text-gray-900">⬇️ Download Agent.exe</div>
                <div className="text-xs text-gray-600 mt-1">
                  (placeholder) depois você aponta para o seu release assinado.
                </div>
              </a>

              <button
                type="button"
                onClick={simulateAgentCheck}
                className="rounded-xl bg-blue-600 p-4 text-left hover:bg-blue-700"
              >
                <div className="font-semibold text-white">✅ Já rodei o agent — verificar status</div>
                <div className="text-xs text-white/80 mt-1">
                  Marca online (mock). Depois vira polling real.
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={goNext}
                disabled={!state.agent_online}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-gray-900">Conectar câmera</div>
              <div className="text-sm text-gray-600 mt-1">
                Valide RTSP/ONVIF e confirme captura de snapshot. Sem isso, não começamos o trial.
              </div>
            </div>

            {!state.agent_online && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                🔒 Primeiro conecte o Agent.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nome da câmera</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Ex: Caixa 01"
                  value={state.camera_name}
                  onChange={(e) => setState((s) => ({ ...s, camera_name: e.target.value }))}
                  disabled={!state.agent_online}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">RTSP URL</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-xs"
                  placeholder="rtsp://user:pass@ip:554/..."
                  value={state.rtsp_url}
                  onChange={(e) => setState((s) => ({ ...s, rtsp_url: e.target.value }))}
                  disabled={!state.agent_online}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="text-xs text-gray-600">
                Dica: aqui você pode validar também “latência”, “fps”, “codec” e “perda de frames”.
              </div>

              <button
                type="button"
                onClick={simulateCameraTest}
                disabled={!state.agent_online || !state.rtsp_url.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Testar snapshot
              </button>
            </div>

            {state.camera_ok ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                ✅ Snapshot OK (mock). Próximo: configurar ROI.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                Ainda não testado.
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                ← Voltar
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={!state.camera_ok}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === "roi" && (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-gray-900">Definir Zonas (ROI)</div>
              <div className="text-sm text-gray-600 mt-1">
                Marque “Fila”, “Caixa”, “Entrada”, “Zonas sensíveis”. Isso melhora precisão e reduz falso positivo.
              </div>
            </div>

            {!canGoRoi && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                🔒 Você precisa de Agent + Câmera OK antes de definir ROI.
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="text-sm font-semibold text-gray-900">Canvas ROI (placeholder)</div>
              <div className="mt-2 text-sm text-gray-600">
                Aqui entra seu editor de ROI (canvas) com snapshot. Por enquanto, marcamos como concluído via botão.
              </div>

              <button
                type="button"
                onClick={simulateRoiDone}
                disabled={!canGoRoi}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Marcar ROI como concluído
              </button>
            </div>

            {state.roi_done ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                ✅ ROI configurado (mock). Próximo: iniciar trial.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                ROI pendente.
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                ← Voltar
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={!state.roi_done}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === "trial" && (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-gray-900">Iniciar Trial (72h)</div>
              <div className="text-sm text-gray-600 mt-1">
                Trial só começa quando: Agent online + Câmera OK + ROI definido.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-600">Agent</div>
                <div className="mt-1 font-bold text-gray-900">
                  {state.agent_online ? "ONLINE ✅" : "OFFLINE ⚠️"}
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-600">Câmera</div>
                <div className="mt-1 font-bold text-gray-900">
                  {state.camera_ok ? "OK ✅" : "pendente ⚠️"}
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-600">ROI</div>
                <div className="mt-1 font-bold text-gray-900">
                  {state.roi_done ? "OK ✅" : "pendente ⚠️"}
                </div>
              </div>
            </div>

            {!!state.trial_started_at ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                ✅ Trial iniciado em:{" "}
                <span className="font-mono">{new Date(state.trial_started_at).toLocaleString("pt-BR")}</span>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                Ainda não iniciado.
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                ← Voltar
              </button>

              <button
                type="button"
                onClick={startTrial}
                disabled={!canStartTrial || !!state.trial_started_at}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Iniciar Trial e ir para Dashboard →
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Depois você troca isso por chamada real no backend: criar store/camera/roi + start_trial_at.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
