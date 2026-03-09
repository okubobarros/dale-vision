// frontend/src/pages/Onboarding/components/OnboardingProgress.tsx
import SetupProgress from "../../Onboarding/components/SetupProgress"

export default function OnboardingProgress({
  currentStep,
}: {
  currentStep: 1 | 2 | 3
}) {
  // No seu onboarding: step 1 = Loja, step 2 = Equipe, step 3 = LGPD
  // Mapeia para o fluxo global: Loja = 2, Equipe = 3, LGPD = 4
  const step = currentStep === 1 ? 2 : currentStep === 2 ? 3 : 4
  const titleRight = currentStep === 3 ? "LGPD e Monitoramento" : undefined

  return (
    <div className="mb-8">
      <h2 className="text-3xl font-extrabold text-slate-900">Configure sua loja piloto</h2>
      <p className="text-slate-500 mt-2">
        Vamos preparar sua loja para receber dados em tempo real.
      </p>

      <SetupProgress step={step} className="mt-6" titleRight={titleRight} />
    </div>
  )
}
