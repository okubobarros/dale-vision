import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { consumePostLoginExplainer, type PostLoginReasonCode } from "../services/postLoginRoute"
import { trackJourneyEvent } from "../services/journey"

type ExplainerContent = {
  title: string
  description: string
  ctaLabel: string
  ctaRoute: string
}

const getContent = (reasonCode: PostLoginReasonCode): ExplainerContent => {
  if (reasonCode === "internal_admin") {
    return {
      title: "Próximo passo recomendado: Control Tower",
      description: "Você entrou como admin interno. Priorize saúde da rede e incidentes da plataforma.",
      ctaLabel: "Abrir Control Tower",
      ctaRoute: "/app/admin",
    }
  }
  if (reasonCode === "onboarding_required") {
    return {
      title: "Próximo passo recomendado: concluir onboarding",
      description: "Complete os dados iniciais para criar sua primeira loja e liberar a operação.",
      ctaLabel: "Continuar onboarding",
      ctaRoute: "/onboarding",
    }
  }
  return {
    title: "Próximo passo recomendado: conectar operação",
    description: "Você já tem base criada. Agora conecte edge/câmeras para receber os primeiros sinais.",
    ctaLabel: "Ir para dashboard",
    ctaRoute: "/app/dashboard?openEdgeSetup=1",
  }
}

export default function PostLoginExplainer() {
  const location = useLocation()
  const navigate = useNavigate()
  const [decision, setDecision] = useState<{ reasonCode: PostLoginReasonCode; route: string } | null>(() =>
    consumePostLoginExplainer(location.pathname)
  )
  const trackedShownRef = useRef(false)
  const content = useMemo(
    () => (decision ? getContent(decision.reasonCode) : null),
    [decision]
  )

  useEffect(() => {
    if (!decision || trackedShownRef.current) return
    trackedShownRef.current = true
    void trackJourneyEvent("post_login_explainer_shown", {
      source: "post_login_explainer",
      target_route: decision.route,
      reason_code: decision.reasonCode,
      current_path: location.pathname,
    })
  }, [decision, location.pathname])

  if (!content || !decision) return null

  return (
    <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
      <div className="text-sm font-semibold text-cyan-900">{content.title}</div>
      <p className="mt-1 text-sm text-cyan-800">{content.description}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            void trackJourneyEvent("post_login_explainer_cta_clicked", {
              source: "post_login_explainer",
              target_route: content.ctaRoute,
              reason_code: decision.reasonCode,
            })
            navigate(content.ctaRoute)
            setDecision(null)
          }}
          className="inline-flex items-center justify-center rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
        >
          {content.ctaLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            void trackJourneyEvent("post_login_explainer_dismissed", {
              source: "post_login_explainer",
              reason_code: decision.reasonCode,
            })
            setDecision(null)
          }}
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-100"
        >
          Entendi, continuar
        </button>
      </div>
    </div>
  )
}
