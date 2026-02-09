// frontend/src/pages/Onboarding/Onboarding.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import OnboardingProgress from "./components/OnboardingProgress"
import StoresSetup, { type StoreDraft } from "./components/StoresSetup"
import EmployeesSetup, { type EmployeeDraft } from "./components/EmployeesSetup"

export default function Onboarding() {
  const navigate = useNavigate()
  const totalSteps = 2
  const [step, setStep] = useState(1)

  // estado local para demo (sem backend)
  const [store, setStore] = useState<StoreDraft | null>(null)
  const [employees, setEmployees] = useState<EmployeeDraft[]>([])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  function handleNext() {
    if (step < totalSteps) setStep((s) => s + 1)
  }

  function handlePrev() {
    if (step > 1) setStep((s) => s - 1)
  }

  function handleComplete() {
    // salva localmente para demo
    localStorage.setItem("demo_onboarding", JSON.stringify({ store, employees }))
    navigate("/app/dashboard?openEdgeSetup=1")
  }

  return (
    <main className="min-h-screen w-full bg-[#070B18] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <OnboardingProgress currentStep={step} totalSteps={totalSteps} />

        <div className="mt-10">
          {step === 1 && (
            <StoresSetup
              value={store}
              onChange={setStore}
              onNext={handleNext}
            />
          )}

          {step === 2 && (
            <EmployeesSetup
              employees={employees}
              onChange={setEmployees}
              onPrev={handlePrev}
              onNext={handleComplete}
            />
          )}
        </div>
      </div>
    </main>
  )
}
