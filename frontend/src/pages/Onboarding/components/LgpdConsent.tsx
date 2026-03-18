// frontend/src/pages/Onboarding/components/LgpdConsent.tsx
import { Link } from "react-router-dom"

export default function LgpdConsent({
  accepted,
  onAcceptedChange,
  recommendedAccepted,
  onRecommendedAcceptedChange,
  onPrev,
  onNext,
  error,
  isSubmitting = false,
}: {
  accepted: boolean
  onAcceptedChange: (value: boolean) => void
  recommendedAccepted: boolean
  onRecommendedAcceptedChange: (value: boolean) => void
  onPrev: () => void
  onNext: () => void
  error?: string
  isSubmitting?: boolean
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Antes de começar: LGPD, colaboradores e monitoramento
        </h3>
        <p className="text-slate-500 mt-1">
          Você confirma que:
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <ul className="space-y-3 text-sm text-slate-700">
          <li>
            Possui base legal para uso de câmeras e monitoramento no ambiente de trabalho.
          </li>
          <li>
            Informou colaboradores e terceiros sobre a existência de câmeras e seu uso para fins operacionais.
          </li>
          <li>
            Incluiu (ou incluirá) cláusulas específicas de monitoramento em contratos, políticas internas ou convenções aplicáveis.
          </li>
          <li>
            Não utilizará a DaleVision para práticas discriminatórias, perseguição ou qualquer forma de violação de direitos.
          </li>
        </ul>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
          />
          <span>
            Li e entendi que sou o Controlador dos dados captados pelas câmeras e que a DaleVision atua apenas como Operadora,
            nos termos da LGPD, não se responsabilizando por minhas políticas internas, decisões trabalhistas ou uso indevido da plataforma.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={recommendedAccepted}
            onChange={(e) => onRecommendedAcceptedChange(e.target.checked)}
          />
          <span>
            Concordo em usar a DaleVision exclusivamente para fins legítimos de monitoramento operacional, produtividade e segurança,
            respeitando a legislação trabalhista e de proteção de dados.
          </span>
        </label>

        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
            Ver Termos de Uso
          </Link>
          <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
            Ver Política de Privacidade
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onPrev}
          className="w-full sm:w-1/2 rounded-2xl border border-slate-200 bg-white py-3 font-semibold text-slate-900 hover:shadow-md transition"
        >
          ← Voltar
        </button>

        <button
          onClick={onNext}
          disabled={isSubmitting}
          className="w-full sm:w-1/2 rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-semibold text-black
                     shadow-[0_18px_40px_rgba(59,130,246,0.16)] hover:opacity-95 transition disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Concluir e  ativar loja →"}
        </button>
      </div>
    </div>
  )
}
