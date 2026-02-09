// frontend/src/pages/Onboarding/Onboarding.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import OnboardingProgress from "./components/OnboardingProgress"
import StoresSetup, { type StoreDraft } from "./components/StoresSetup"
import EmployeesSetup, { type EmployeeDraft } from "./components/EmployeesSetup"

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)

  // estado local para demo (sem backend)
  const [store, setStore] = useState<StoreDraft | null>(null)
  const [employees, setEmployees] = useState<EmployeeDraft[]>([])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  function handleNext() {
    if (step === 1) setStep(2)
  }

  function handlePrev() {
    if (step > 1) {
      setStep((s) => (s === 2 ? 1 : s))
    }
  }

  function handleComplete() {
    localStorage.setItem("demo_onboarding", JSON.stringify({ store, employees }))
    navigate("/app/dashboard?openEdgeSetup=1")
  }

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-white to-slate-50 text-slate-900 overflow-hidden">
      {/* Brand glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-35 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
        <div className="absolute -bottom-40 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-purple-500 via-cyan-300 to-blue-400" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Card container para “premium feel” */}
        <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-6 sm:p-8">
          <OnboardingProgress currentStep={step} />

          <div className="mt-10">
            {step === 1 && (
              <StoresSetup value={store} onChange={setStore} onNext={handleNext} />
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

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </main>
  )
}
