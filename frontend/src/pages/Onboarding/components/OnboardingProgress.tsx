// frontend/src/pages/Onboarding/components/OnboardingProgress.tsx
import SetupProgress from "../../Onboarding/components/SetupProgress"

export default function OnboardingProgress({
  currentStep,
}: {
  currentStep: 1 | 2
}) {
  // No seu onboarding: step 1 = Loja, step 2 = Equipe
  // Mapeia para o fluxo global: Loja = 2, Equipe = 3
  const step = currentStep === 1 ? 2 : 3

  return (
    <div className="mb-8">
      <h2 className="text-3xl font-extrabold text-slate-900">Configure sua loja piloto</h2>
      <p className="text-slate-500 mt-2">
        Vamos preparar sua loja para receber dados em tempo real.
      </p>

      <SetupProgress step={step} className="mt-6" />
    </div>
  )
}
