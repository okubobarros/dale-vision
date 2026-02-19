import { useMemo, useState } from "react"
import toast from "react-hot-toast"

import logo from "../../assets/logo.png"
import { demoService } from "../../services/demo"

type StoresRange = "1" | "2-5" | "6-20" | "20+"
type CamerasRange = "1-3" | "4-10" | "11-50" | "50+"
type CamerasCountRangeLead = "1_4" | "5_8" | "9_16" | "17_32" | "33_plus"
type HasNvrLead = "yes" | "no" | "dontknow"
type CameraBrandLead = "intelbras" | "hikvision" | "dahua" | "other" | "dontknow"
type AppUsedLead = "isic_lite" | "mibo" | "other" | "dontknow"

type OperationSegmentValue =
  | "supermarket"
  | "convenience"
  | "pharmacy"
  | "bakery"
  | "restaurant"
  | "fashion"
  | "mall_store"
  | "other"

type GoalValue =
  | "loss_prevention"
  | "queues"
  | "productivity"
  | "standardization"
  | "security"
  | "heatmap"
  | "other"

type SetupWhereValue = "store_pc" | "nvr_server" | "not_sure"
type AccessWhoValue = "owner" | "store_manager" | "staff" | "not_sure"
type HowHeardValue = "referral" | "instagram" | "google" | "youtube" | "other"
type OperatorsAccessValue = "yes" | "no" | ""

// Dor do multilojista
type MultiPainValue =
  | "no_standard"
  | "no_visibility"
  | "distributed_losses"
  | "execution_team"
  | "queues_variance"
  | "security_incidents"
  | "no_compare"
  | "other"

const HOW_HEARD: { label: string; value: HowHeardValue }[] = [
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "Indicação", value: "referral" },
  { label: "Google / Busca", value: "google" },
  { label: "Outro", value: "other" },
]

const OPERATION_SEGMENTS: { label: string; value: OperationSegmentValue }[] = [
  { value: "supermarket", label: "Supermercado" },
  { value: "convenience", label: "Conveniência" },
  { value: "pharmacy", label: "Farmácia" },
  { value: "bakery", label: "Padaria" },
  { value: "restaurant", label: "Restaurante" },
  { value: "fashion", label: "Moda/Vestuário" },
  { value: "mall_store", label: "Loja em shopping" },
  { value: "other", label: "Outro" },
]

const CAMERA_COUNT_RANGES: { label: string; value: CamerasCountRangeLead }[] = [
  { value: "1_4", label: "1–4" },
  { value: "5_8", label: "5–8" },
  { value: "9_16", label: "9–16" },
  { value: "17_32", label: "17–32" },
  { value: "33_plus", label: "33+" },
]

const CAMERA_BRANDS = [
  "Intelbras",
  "Hikvision",
  "Dahua",
  "Chinesas genéricas",
  "Outras",
  "Não sei informar",
] as const

const GOALS: { label: string; value: GoalValue }[] = [
  { label: "Reduzir perdas / fraudes", value: "loss_prevention" },
  { label: "Reduzir filas e melhorar atendimento", value: "queues" },
  { label: "Aumentar produtividade da equipe", value: "productivity" },
  { label: "Padronizar operação entre lojas", value: "standardization" },
  { label: "Segurança e incidentes", value: "security" },
  { label: "Entender fluxo / heatmap / conversão", value: "heatmap" },
  { label: "Outro", value: "other" },
]

const MULTI_PAINS: { label: string; value: MultiPainValue }[] = [
  { label: "Falta de padrão: cada loja faz de um jeito (auditoria difícil)", value: "no_standard" },
  { label: "Sem visibilidade do que acontece no chão de loja (só descobre depois)", value: "no_visibility" },
  { label: "Perdas/furtos espalhados e sem evidência rápida", value: "distributed_losses" },
  { label: "Equipe / execução fraca (processo não roda igual em todas)", value: "execution_team" },
  { label: "Filas e atendimento variam muito entre unidades", value: "queues_variance" },
  { label: "Segurança e incidentes (ocorrências sem histórico confiável)", value: "security_incidents" },
  { label: "Comparar lojas é impossível (sem métrica igual pra todas)", value: "no_compare" },
  { label: "Outro", value: "other" },
]

const BRAZIL_UF = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const

const CITY_OPTIONS_BY_UF: Record<string, string[]> = {}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "")
}

function normalizeWhatsappToBR11(input: string) {
  const d = onlyDigits(input)
  if (d.length === 13 && d.startsWith("55")) return d.slice(2)
  return d
}

function isValidWhatsappBR11Mobile(input: string) {
  const br = normalizeWhatsappToBR11(input)
  if (br.length !== 11) return false
  const thirdDigit = br[2]
  return thirdDigit === "9"
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())
}

function computeQualifiedScore(args: {
  storesRange: StoresRange
  camerasRange: CamerasRange
  cameraBrandsCount: number
  goalsCount: number
}) {
  const storesWeight: Record<StoresRange, number> = {
    "1": 10,
    "2-5": 25,
    "6-20": 40,
    "20+": 55,
  }

  const camsWeight: Record<CamerasRange, number> = {
    "1-3": 10,
    "4-10": 20,
    "11-50": 35,
    "50+": 45,
  }

  const brands = Math.min(args.cameraBrandsCount, 4) * 5
  const goals = Math.min(args.goalsCount, 4) * 5

  const score = storesWeight[args.storesRange] + camsWeight[args.camerasRange] + brands + goals
  return Math.max(0, Math.min(100, score))
}

const inputBase =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition " +
  "focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300"

const selectBase =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition " +
  "focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300"

const pill =
  "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"

export default function AgendarDemo() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [howHeard, setHowHeard] = useState<HowHeardValue | "">("")
  const [howHeardOther, setHowHeardOther] = useState("")

  const [operationSegment, setOperationSegment] = useState<OperationSegmentValue | "">("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [camerasCountRangeLead, setCamerasCountRangeLead] =
    useState<CamerasCountRangeLead | "">("")
  const [hasNvrLead, setHasNvrLead] = useState<HasNvrLead | "">("")
  const [cameraBrandLead, setCameraBrandLead] = useState<CameraBrandLead | "">("")
  const [appUsedLead, setAppUsedLead] = useState<AppUsedLead | "">("")
  const [pilotStoreLocation, setPilotStoreLocation] = useState("")
  const [pilotState, setPilotState] = useState("")
  const [pilotCity, setPilotCity] = useState("")

  // ⚠️ Agora fica ABERTO no formulário e OBRIGATÓRIO (sem accordion)
  const [setupWhere, setSetupWhere] = useState<SetupWhereValue | "">("")
  const [accessWho, setAccessWho] = useState<AccessWhoValue | "">("")
  const [operatorsHaveAccess, setOperatorsHaveAccess] = useState<OperatorsAccessValue>("")

  // Objetivos (multi seleção)
  const [goals, setGoals] = useState<GoalValue[]>([])
  const [goalOther, setGoalOther] = useState("")
  const [contextNote, setContextNote] = useState("")

  // Dor multilojista
  const [multiPain, setMultiPain] = useState<MultiPainValue | "">("")
  const [multiPainOther, setMultiPainOther] = useState("")

  const [consent, setConsent] = useState(false)

  const hasOtherGoal = goals.includes("other")
  const needsSourceDetail = howHeard === "other" || howHeard === "referral"

  const isMultiStore = storesRange !== "" && storesRange !== "1"
  const needsMultiPainOther = multiPain === "other"
  const hasPilotLocation = Boolean(pilotStoreLocation.trim())
  const cityOptions = pilotState ? CITY_OPTIONS_BY_UF[pilotState] || [] : []

  const primaryGoal: GoalValue | "" = useMemo(() => {
    if (!goals.length) return ""
    const nonOther = goals.find((g) => g !== "other")
    return nonOther || "other"
  }, [goals])

  const qualifiedScore = useMemo(() => {
    if (!storesRange || !camerasRange) return 0
    return computeQualifiedScore({
      storesRange,
      camerasRange,
      cameraBrandsCount: cameraBrands.length,
      goalsCount: goals.filter((g) => g !== "other").length + (hasOtherGoal ? 1 : 0),
    })
  }, [storesRange, camerasRange, cameraBrands.length, goals, hasOtherGoal])

  const progress = useMemo(() => {
    let done = 0
    const total = 8
    if (name.trim()) done++
    if (isValidWhatsappBR11Mobile(whatsapp)) done++
    if (operationSegment) done++
    if (storesRange) done++
    if (camerasRange) done++
    if (goals.length > 0) done++
    if (setupWhere) done++
    if (accessWho) done++
    return Math.round((done / total) * 100)
  }, [name, whatsapp, operationSegment, storesRange, camerasRange, goals.length, setupWhere, accessWho])

  function toggleBrand(brand: (typeof CAMERA_BRANDS)[number]) {
    setCameraBrands((prev) => {
      const exists = prev.includes(brand)
      if (brand === "Não sei informar") return exists ? [] : ["Não sei informar"]
      const cleaned = prev.filter((b) => b !== "Não sei informar")
      return exists ? cleaned.filter((b) => b !== brand) : [...cleaned, brand]
    })
  }

  function toggleGoal(goal: GoalValue) {
    setGoals((prev) => {
      const exists = prev.includes(goal)
      return exists ? prev.filter((g) => g !== goal) : [...prev, goal]
    })
  }

  async function handleSubmit() {
    if (loading || success) return
    setSubmitError("")
    setFieldErrors({})

    const nameClean = name.trim()
    const emailClean = email.trim()
    const whatsappClean = normalizeWhatsappToBR11(whatsapp)

    if (!nameClean) return toast.error("Informe seu nome.")
    if (!isValidWhatsappBR11Mobile(whatsapp)) {
      return toast.error("WhatsApp inválido. Use DDD + número de celular (11 dígitos, começando com 9).")
    }
    if (!operationSegment) return toast.error("Informe o segmento da operação.")
    if (!storesRange) return toast.error("Selecione a faixa de quantidade de lojas.")
    if (!camerasRange) return toast.error("Selecione a faixa de quantidade de câmeras.")

    if (isMultiStore && !multiPain) return toast.error("Multilojista: selecione onde dói mais hoje na gestão entre lojas.")
    if (isMultiStore && multiPain === "other" && !multiPainOther.trim()) {
      return toast.error('Preencha "Outro" (gestão entre lojas).')
    }

    if (!goals.length) return toast.error("Selecione pelo menos 1 objetivo.")
    if (hasOtherGoal && !goalOther.trim()) return toast.error('Preencha o campo "Outro" (objetivos).')

    if (!setupWhere) return toast.error("Responda onde a DaleVision irá rodar em sua loja.")
    if (!accessWho) return toast.error("Selecione quem terá acesso para ajudar na ativação.")

    if (hasPilotLocation && !pilotState.trim()) {
      return toast.error("Selecione o UF da loja piloto.")
    }
    if (hasPilotLocation && !pilotCity.trim()) {
      return toast.error("Informe a cidade da loja piloto.")
    }

    if (!emailClean || !isValidEmail(emailClean)) return toast.error("Informe um e-mail válido.")

    if (!howHeard) return toast.error("Selecione a origem do contato.")
    if (needsSourceDetail && !howHeardOther.trim()) return toast.error("Preencha o detalhe da origem.")
    if (!consent) return toast.error("Para enviar confirmação e checklist, marque o consentimento.")

    try {
      setLoading(true)

      const payload = {
        contact_name: nameClean,
        email: emailClean,
        whatsapp: whatsappClean,

        operation_segment: operationSegment,
        operation_type: operationSegment,
        stores_range: storesRange,
        cameras_range: camerasRange,
        camera_brands_json: cameraBrands,

        camera_count_range: camerasCountRangeLead || null,
        camera_range: camerasCountRangeLead || null,
        run_location: setupWhere,
        operators_have_access:
          operatorsHaveAccess === "yes"
            ? true
            : operatorsHaveAccess === "no"
              ? false
              : null,

        pilot_store_location: pilotStoreLocation.trim() ? pilotStoreLocation.trim() : null,
        pilot_city: hasPilotLocation && pilotCity.trim() ? pilotCity.trim() : null,
        pilot_state:
          hasPilotLocation && pilotState.trim() ? pilotState.trim().toUpperCase() : null,

        primary_goal: primaryGoal || null,
        primary_goals: goals,

        source: howHeard,
        utm: {
          utm_source: "dalevision_site",
          utm_medium: "demo_form",
          utm_campaign: "agendar_demo",
        },

        metadata: {
          consent: true,

          goal_other: hasOtherGoal ? goalOther.trim() : null,
          goals_selected: goals,
          context_note: contextNote.trim() ? contextNote.trim() : null,

          multi_store_pain: isMultiStore ? multiPain : null,
          multi_store_pain_other: isMultiStore && needsMultiPainOther ? multiPainOther.trim() : null,

          source_detail: needsSourceDetail ? howHeardOther.trim() : null,
          source_channel: "web",

          activation_setup_where: setupWhere,
          activation_access_who: accessWho,
          run_location: setupWhere,
          operators_have_access:
            operatorsHaveAccess === "yes"
              ? true
              : operatorsHaveAccess === "no"
                ? false
                : null,
          lead_has_nvr: hasNvrLead || null,
          lead_camera_brand: cameraBrandLead || null,
          lead_app_used: appUsedLead || null,

          next_step_hint:
            "Após a demo, enviamos um checklist simples com o passo a passo do piloto e como conectamos as câmeras.",
        },

        qualified_score: Number(qualifiedScore),
      }

      const lead = await demoService.createLead(payload)

      const calendlyUrl = new URL("https://calendly.com/dale-vision")
      calendlyUrl.searchParams.set("lead_id", lead.id)
      calendlyUrl.searchParams.set("utm_source", "dalevision_site")
      calendlyUrl.searchParams.set("utm_medium", "demo_form")
      calendlyUrl.searchParams.set("utm_campaign", "agendar_demo")
      calendlyUrl.searchParams.set("name", payload.contact_name)
      calendlyUrl.searchParams.set("email", payload.email)

      setSuccess(true)
      toast.success("Tudo certo. Abrindo os horários…")
      setTimeout(() => {
        window.location.href = calendlyUrl.toString()
      }, 1200)
    } catch (err: any) {
      console.error(err)
      if (err?.response?.status === 400 && err?.response?.data && typeof err.response.data === "object") {
        const data = err.response.data as Record<string, unknown>
        const nextErrors: Record<string, string> = {}
        for (const [key, value] of Object.entries(data)) {
          const message = Array.isArray(value)
            ? value.filter(Boolean).join(", ")
            : typeof value === "string"
              ? value
              : "Campo inválido."
          nextErrors[key] = message
        }
        setFieldErrors(nextErrors)
        setSubmitError("Confira os campos destacados.")
        return
      }
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Erro ao enviar dados. Tente novamente."
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white to-slate-50 overflow-hidden flex justify-center px-4 py-10">
      {/* Brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full blur-3xl opacity-35 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
        <div className="absolute -bottom-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-purple-500 via-cyan-300 to-blue-400" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-6 sm:p-8 space-y-6">
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">
              Dados enviados. Abrindo os horários…
            </div>
          )}
          {submitError && !success && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              <p>{submitError}</p>
              {Object.keys(fieldErrors).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(fieldErrors).map(([key, message]) => (
                    <p key={key} className="text-xs text-red-600">
                      {message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500" />
              <img src={logo} alt="DALE Vision" className="relative h-7 w-7" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={pill}>⏱️ leva ~90s</span>
                <span className={pill}>📹 usa suas câmeras</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Descubra onde sua loja está perdendo eficiência — e como corrigir usando suas próprias câmeras.
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Agende uma demo estratégica de 30 minutos e saia com um plano claro para uma loja piloto (até 3 câmeras).
                {isMultiStore ? (
                  <span className="block mt-1 text-slate-700">
                    <strong>Multilojistas:</strong> desenhamos também o caminho de escala e padronização entre unidades.
                  </span>
                ) : null}
              </p>

              {/* Progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Progresso do agendamento</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900 mb-2">O que você vai ver na demo</div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>Oportunidades no fluxo da loja (gargalos, desvios e padrões).</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>Priorização do que atacar primeiro (perdas, filas, produtividade, segurança).</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>Como rodar um piloto rápido usando até 3 câmeras.</span>
              </li>
            </ul>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Informações para personalizar sua demo</h2>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-name">
                Seu nome *
              </label>
              <input
                id="demo-name"
                className={inputBase}
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {fieldErrors.contact_name && <p className="mt-2 text-xs text-red-600">{fieldErrors.contact_name}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-whatsapp">
                WhatsApp com DDD *
              </label>
              <input
                id="demo-whatsapp"
                className={inputBase}
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
              <p className="text-xs text-slate-500 mt-1">Enviamos confirmação, lembrete e o checklist por aqui.</p>
              {fieldErrors.whatsapp && <p className="mt-2 text-xs text-red-600">{fieldErrors.whatsapp}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-email">
                E-mail *
              </label>
              <input
                id="demo-email"
                className={inputBase}
                placeholder="nome@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />
              <p className="text-xs text-slate-500 mt-1">Usamos para enviar o convite do calendário.</p>
              {fieldErrors.email && <p className="mt-2 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-operation">
                Segmento / tipo de operação *
              </label>
              <select
                id="demo-operation"
                className={selectBase}
                value={operationSegment}
                onChange={(e) => setOperationSegment(e.target.value as OperationSegmentValue)}
              >
                <option value="">Selecione</option>
                {OPERATION_SEGMENTS.map((segment) => (
                  <option key={segment.value} value={segment.value}>
                    {segment.label}
                  </option>
                ))}
              </select>
              {(fieldErrors.operation_segment || fieldErrors.operation_type) && (
                <p className="mt-2 text-xs text-red-600">
                  {fieldErrors.operation_segment || fieldErrors.operation_type}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-stores-range">
                  Quantas lojas você opera hoje? *
                </label>
                <select
                  id="demo-stores-range"
                  className={selectBase}
                  value={storesRange}
                  onChange={(e) => setStoresRange(e.target.value as StoresRange)}
                >
                  <option value="">Selecione</option>
                  <option value="1">1</option>
                  <option value="2-5">2–5</option>
                  <option value="6-20">6–20</option>
                  <option value="20+">20+</option>
                </select>
                {fieldErrors.stores_range && <p className="mt-2 text-xs text-red-600">{fieldErrors.stores_range}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-cameras-range">
                  Quantas câmeras (aprox.)? *
                </label>
                <select
                  id="demo-cameras-range"
                  className={selectBase}
                  value={camerasRange}
                  onChange={(e) => setCamerasRange(e.target.value as CamerasRange)}
                >
                  <option value="">Selecione</option>
                  <option value="1-3">1–3</option>
                  <option value="4-10">4–10</option>
                  <option value="11-50">11–50</option>
                  <option value="50+">50+</option>
                </select>
                {fieldErrors.cameras_range && <p className="mt-2 text-xs text-red-600">{fieldErrors.cameras_range}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Infraestrutura atual (opcional)</h3>
                <span className="text-xs text-slate-500">Leva 10s</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="lead-cameras-count-range">
                    Qtd Câmeras
                  </label>
                  <select
                    id="lead-cameras-count-range"
                    className={selectBase}
                    value={camerasCountRangeLead}
                    onChange={(e) => setCamerasCountRangeLead(e.target.value as CamerasCountRangeLead)}
                  >
                    <option value="">Selecione</option>
                    {CAMERA_COUNT_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="lead-has-nvr">
                    Você tem NVR/DVR?
                  </label>
                  <select
                    id="lead-has-nvr"
                    className={selectBase}
                    value={hasNvrLead}
                    onChange={(e) => setHasNvrLead(e.target.value as HasNvrLead)}
                  >
                    <option value="">Selecione</option>
                    <option value="yes">Sim</option>
                    <option value="no">Não</option>
                    <option value="dontknow">Não sei</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="lead-camera-brand">
                    Marca principal
                  </label>
                  <select
                    id="lead-camera-brand"
                    className={selectBase}
                    value={cameraBrandLead}
                    onChange={(e) => setCameraBrandLead(e.target.value as CameraBrandLead)}
                  >
                    <option value="">Selecione</option>
                    <option value="intelbras">Intelbras</option>
                    <option value="hikvision">Hikvision</option>
                    <option value="dahua">Dahua</option>
                    <option value="other">Outra</option>
                    <option value="dontknow">Não sei</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="lead-app-used">
                    App atual
                  </label>
                  <select
                    id="lead-app-used"
                    className={selectBase}
                    value={appUsedLead}
                    onChange={(e) => setAppUsedLead(e.target.value as AppUsedLead)}
                  >
                    <option value="">Selecione</option>
                    <option value="isic_lite">iSIC Lite</option>
                    <option value="mibo">Mibo</option>
                    <option value="other">Outro</option>
                    <option value="dontknow">Não sei</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MULTILOJISTA PAIN */}
            {isMultiStore && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">Multilojista: onde dói mais hoje na gestão entre lojas? *</h3>
                  <span className="text-xs text-slate-500">Escolha 1</span>
                </div>

                <div className="space-y-2">
                  {MULTI_PAINS.map((p) => (
                    <label
                      key={p.value}
                      className={[
                        "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition",
                        multiPain === p.value
                          ? "border-cyan-300 bg-cyan-50/60"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="multi-pain"
                        value={p.value}
                        checked={multiPain === p.value}
                        onChange={() => setMultiPain(p.value)}
                        className="mt-1 h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-200"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">{p.label}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {needsMultiPainOther && (
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="multi-pain-other">
                      Descreva em 1 frase (ajuda muito) *
                    </label>
                    <input
                      id="multi-pain-other"
                      className={inputBase}
                      placeholder="Ex: não consigo auditar execução sem estar presente em cada loja…"
                      value={multiPainOther}
                      onChange={(e) => setMultiPainOther(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* GOALS multi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Quais são os principais objetivos da sua demo? *</h3>
                <span className="text-xs text-slate-500">Marque quantos quiser</span>
              </div>

              <div className="space-y-2">
                {GOALS.map((g) => (
                  <label key={g.value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      value={g.value}
                      checked={goals.includes(g.value)}
                      onChange={() => toggleGoal(g.value)}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
                    />
                    {g.label}
                  </label>
                ))}
              </div>

              {hasOtherGoal && (
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-goal-other">
                    Descreva brevemente (Outro) *
                  </label>
                  <input
                    id="demo-goal-other"
                    className={inputBase}
                    placeholder="Ex: reduzir abandono no caixa / identificar rupturas / controle de áreas…"
                    value={goalOther}
                    onChange={(e) => setGoalOther(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-context-note">
                  Contexto rápido (opcional)
                </label>
                <textarea
                  id="demo-context-note"
                  className={inputBase + " min-h-[92px] resize-y"}
                  placeholder="Ex: 12 lojas, muita variação de fila no horário de pico, queremos padronizar auditoria e reduzir perdas…"
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ Agora ABERTO e OBRIGATÓRIO */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Preparação para ativação</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-setup-where">
                    Onde a DaleVision irá rodar em sua loja? *
                  </label>
                  <select
                    id="demo-setup-where"
                    className={selectBase}
                    value={setupWhere}
                    onChange={(e) => setSetupWhere(e.target.value as SetupWhereValue)}
                  >
                    <option value="">Selecione</option>
                    <option value="store_pc">Computador na loja (Windows)</option>
                    <option value="nvr_server">Servidor/NVR onde ficam as câmeras</option>
                    <option value="not_sure">Não sei ainda</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Se rodar em um computador, operadores podem ter acesso dependendo de permissões do Windows.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-access-who">
                    Quem terá acesso para ajudar na ativação? *
                  </label>
                  <select
                    id="demo-access-who"
                    className={selectBase}
                    value={accessWho}
                    onChange={(e) => setAccessWho(e.target.value as AccessWhoValue)}
                  >
                    <option value="">Selecione</option>
                    <option value="owner">Eu mesmo</option>
                    <option value="store_manager">Gerente / responsável</option>
                    <option value="staff">Funcionário de confiança</option>
                    <option value="not_sure">Ainda não sei</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-operators-access">
                  Operadores terão acesso ao computador?
                </label>
                <select
                  id="demo-operators-access"
                  className={selectBase}
                  value={operatorsHaveAccess}
                  onChange={(e) => setOperatorsHaveAccess(e.target.value as OperatorsAccessValue)}
                >
                  <option value="">Selecione</option>
                  <option value="yes">Sim</option>
                  <option value="no">Não</option>
                </select>
              </div>

              <p className="text-xs text-slate-500">
                Se você não souber agora, sem problema — marcando “Não sei ainda” a gente te orienta depois da demo.
              </p>
            </div>

            {/* Brands optional */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Marcas de câmeras (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {CAMERA_BRANDS.map((b) => {
                  const active = cameraBrands.includes(b)
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBrand(b)}
                      className={[
                        "px-3 py-1.5 rounded-full border text-sm transition",
                        active
                          ? "border-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 text-black shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {b}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Origem do contato *</h3>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-how-heard">
                  Onde você conheceu a Dale Vision? *
                </label>
                <select
                  id="demo-how-heard"
                  className={selectBase}
                  value={howHeard}
                  onChange={(e) => setHowHeard(e.target.value as HowHeardValue)}
                >
                  <option value="">Selecione</option>
                  {HOW_HEARD.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {needsSourceDetail && (
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-how-heard-other">
                    {howHeard === "referral" ? "Quem indicou?" : "Descreva (Outro)"} *
                  </label>
                  <input
                    id="demo-how-heard-other"
                    className={inputBase}
                    placeholder={
                      howHeard === "referral"
                        ? "Ex: nome do parceiro/consultor/empresa…"
                        : "Ex: grupo, evento, recomendação…"
                    }
                    value={howHeardOther}
                    onChange={(e) => setHowHeardOther(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Loja piloto opcional */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Local da loja piloto</h3>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-pilot-location">
                  Local da loja piloto (opcional)
                </label>
                <input
                  id="demo-pilot-location"
                  className={inputBase}
                  placeholder="Ex: Bairro, endereço, nome da loja…"
                  value={pilotStoreLocation}
                  onChange={(e) => setPilotStoreLocation(e.target.value)}
                />
              </div>

              <div
                className={
                  hasPilotLocation
                    ? "grid gap-3 sm:grid-cols-2"
                    : "grid gap-3 sm:grid-cols-2 opacity-60 pointer-events-none"
                }
              >
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-pilot-city">
                    Cidade {hasPilotLocation ? "*" : ""}
                  </label>
                  <input
                    id="demo-pilot-city"
                    className={inputBase}
                    placeholder="Cidade"
                    value={pilotCity}
                    onChange={(e) => setPilotCity(e.target.value)}
                    list="pilot-city-options"
                  />
                  <datalist id="pilot-city-options">
                    {cityOptions.map((cityName) => (
                      <option key={cityName} value={cityName} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-pilot-uf">
                    UF {hasPilotLocation ? "*" : ""}
                  </label>
                  <select
                    id="demo-pilot-uf"
                    className={selectBase}
                    value={pilotState}
                    onChange={(e) => {
                      setPilotState(e.target.value)
                      setPilotCity("")
                    }}
                  >
                    <option value="">Selecione</option>
                    {BRAZIL_UF.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!hasPilotLocation && (
                <p className="text-xs text-slate-500">
                  Se preencher o local da loja piloto, UF e cidade se tornam obrigatórios.
                </p>
              )}
            </div>
          </div>

          {/* ✅ bloco amarelo conforme pedido */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
            <div className="font-semibold mb-1">Depois do agendamento</div>
            <p className="text-amber-900/90">
              Você recebe um checklist simples de como conectamos as câmeras e como funciona o piloto.
            </p>
            <p className="text-amber-900/90 mt-2">
              <strong>Sem compromisso:</strong> a demonstração serve para você decidir com clareza se faz sentido.
            </p>
          </div>

          {/* Consent */}
          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-900">📲 Confirmação e lembretes</p>
            <p className="text-slate-600">Enviaremos confirmações e lembretes por WhatsApp e e-mail.</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
            />
            Concordo em receber comunicações sobre a demo por WhatsApp e e-mail. Você pode cancelar quando quiser.
          </label>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={loading || success}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-semibold text-black
                       shadow-[0_18px_40px_rgba(59,130,246,0.16)] hover:opacity-95 transition disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Ver horários disponíveis e agendar minha demo"}
          </button>

          <p className="text-xs text-center text-slate-500">
            Você será redirecionado para escolher o melhor horário. (Leva ~30s)
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </div>
  )
}
