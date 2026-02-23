// frontend/src/pages/Onboarding/Onboarding.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../contexts/useAuth"
import { storesService } from "../../services/stores"
import { employeesService } from "../../services/employees"
import OnboardingProgress from "./components/OnboardingProgress"
import StoresSetup, { type StoreDraft } from "./components/StoresSetup"
import EmployeesSetup, { type EmployeeDraft } from "./components/EmployeesSetup"
import { buildEmployeesPayload } from "./helpers/employeePayload"

export default function Onboarding() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)

  // estado local para demo (sem backend)
  const [store, setStore] = useState<StoreDraft | null>(null)
  const [employees, setEmployees] = useState<EmployeeDraft[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeError, setStoreError] = useState("")
  const [employeesTotal, setEmployeesTotal] = useState("")
  const [employeesSaving, setEmployeesSaving] = useState(false)
  const [employeesError, setEmployeesError] = useState("")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    let active = true
    if (isLoading || !isAuthenticated || storeId || step !== 1) return
    const checkStores = async () => {
      try {
        const existing = await storesService.getStores()
        if (!active) return
        if (existing.length > 0) {
          navigate("/app/dashboard?openEdgeSetup=1", { replace: true })
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[Onboarding] store check skipped", error)
        }
      }
    }
    void checkStores()
    return () => {
      active = false
    }
  }, [isAuthenticated, isLoading, navigate, step, storeId])

  function handlePrev() {
    if (step > 1) {
      setStep((s) => (s === 2 ? 1 : s))
    }
  }

  async function handleCreateStore(draft: StoreDraft) {
    if (storeSaving || storeId) {
      setStep(2)
      return
    }

    setStoreSaving(true)
    setStoreError("")
    try {
      const created = await storesService.createStore({
        name: draft.name,
        city: draft.city,
        state: draft.state,
        business_type: draft.businessType || undefined,
        pos_system: draft.posSystem || undefined,
        hours_weekdays: draft.hoursWeekdays || undefined,
        hours_saturday: draft.hoursSaturday || undefined,
        hours_sunday_holiday: draft.hoursSundayHoliday || undefined,
        cameras_count: draft.camerasCount ? Number(draft.camerasCount) : undefined,
      })
      if (!created?.id) {
        throw new Error("Falha ao criar a loja.")
      }
      setStoreId(created.id)
      setStore(draft)
      setStep(2)
    } catch (error) {
      console.error("[Onboarding] create store failed", error)
      setStoreError("Não foi possível salvar sua loja. Tente novamente.")
    } finally {
      setStoreSaving(false)
    }
  }

  async function handleComplete(list: EmployeeDraft[]) {
    if (!isAuthenticated) {
      navigate("/login", { replace: true })
      return
    }
    if (!storeId) {
      setEmployeesError("Crie a loja primeiro.")
      return
    }

    setEmployeesSaving(true)
    setEmployeesError("")

    try {
      if (list.length > 0) {
        const dedupedPayload = buildEmployeesPayload(list, storeId)

        if (dedupedPayload.length === 0) {
          setEmployeesError(
            "Não foi possível salvar a equipe. Verifique os dados informados."
          )
          return
        }

        try {
          await employeesService.createEmployees(dedupedPayload)
        } catch (error) {
          const response = (error as { response?: { status?: number; data?: unknown } })?.response
          if (import.meta.env.DEV) {
            const maskedPayload = dedupedPayload.map((entry) => ({
              ...entry,
              email: entry.email ? String(entry.email).replace(/^[^@]+/, "***") : null,
            }))
            console.warn("[Onboarding] create employees failed", {
              status: response?.status,
              payload: maskedPayload,
              data: response?.data,
            })
          }
          if (response?.status === 400) {
            const data = response.data as { detail?: unknown; message?: string } | undefined
            const detail = data?.message || data?.detail
            const detailText =
              typeof detail === "string"
                ? detail
                : Array.isArray(detail)
                ? detail.join(" ")
                : ""
            if (detailText.toLowerCase().includes("unique") || detailText.includes("store_id")) {
              setEmployeesError("Este e-mail já está cadastrado nesta loja.")
              return
            }
            setEmployeesError(
              detailText.trim()
                ? detailText
                : "Dados inválidos para funcionários. Verifique nome, cargo e e-mail."
            )
            return
          }
          setEmployeesError(
            "Não foi possível salvar os funcionários agora. Tente novamente."
          )
          return
        }
      }

      if (employeesTotal.trim()) {
        const totalNumber = Number(employeesTotal)
        if (!Number.isNaN(totalNumber)) {
          try {
            await storesService.updateStore(storeId, { employees_count: totalNumber })
          } catch (error) {
            console.error("[Onboarding] update store employees_count failed", error)
            setEmployeesError(
              "Não foi possível salvar o total de funcionários agora. Você pode atualizar depois."
            )
          }
        }
      }

      localStorage.setItem("demo_onboarding", JSON.stringify({ store, storeId, employees: list }))
      navigate("/app/dashboard?openEdgeSetup=1", { replace: true })
    } catch (error) {
      console.error("[Onboarding] onboarding completion failed", error)
      setEmployeesError("Não foi possível concluir o onboarding. Tente novamente.")
    } finally {
      setEmployeesSaving(false)
    }
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
              <StoresSetup
                value={store}
                onChange={setStore}
                onNext={handleCreateStore}
                isSubmitting={storeSaving}
                submitError={storeError}
              />
            )}

            {step === 2 && (
      <EmployeesSetup
        employees={employees}
        onChange={setEmployees}
        onPrev={handlePrev}
        onNext={handleComplete}
        isSubmitting={employeesSaving}
        submitError={employeesError}
        employeesTotal={employeesTotal}
        onEmployeesTotalChange={setEmployeesTotal}
      />
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </main>
  )
}
