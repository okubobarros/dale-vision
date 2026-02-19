import { useMemo, useState } from "react"
import toast from "react-hot-toast"

import logo from "../../assets/logo.png"
import { demoService } from "../../services/demo"

type StoresRange = "1" | "2-5" | "6-20" | "20+"
type CamerasRange = "1-3" | "4-10" | "11-50" | "50+"

type GoalValue =
  | "loss_prevention"
  | "queues"
  | "productivity"
  | "standardization"
  | "security"
  | "heatmap"
  | "other"

type SetupWhereValue = "store_pc" | "store_pc_linux" | "nvr_server" | "not_sure"
type AccessWhoValue = "owner" | "store_manager" | "staff" | "not_sure"
type HowHeardValue = "referral" | "instagram" | "google" | "youtube" | "other"
type OperatorsAccessValue = "yes" | "no" | ""
type OperationTypeValue =
  | "gelateria"
  | "fashion"
  | "cafeteria"
  | "bakery"
  | "restaurant"
  | "market"
  | "pharmacy"
  | "cosmetics"
  | "electronics"
  | "petshop"
  | "services"
  | "other"

// Dor do multilojista
const HOW_HEARD: { label: string; value: HowHeardValue }[] = [
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "Indicação", value: "referral" },
  { label: "Google / Busca", value: "google" },
  { label: "Outro", value: "other" },
]

const OPERATION_TYPES: { label: string; value: OperationTypeValue }[] = [
  { label: "Sorveteria / Gelateria", value: "gelateria" },
  { label: "Moda / Vestuário", value: "fashion" },
  { label: "Cafeteria", value: "cafeteria" },
  { label: "Padaria", value: "bakery" },
  { label: "Restaurante", value: "restaurant" },
  { label: "Mercado / Mini mercado", value: "market" },
  { label: "Farmácia", value: "pharmacy" },
  { label: "Cosméticos", value: "cosmetics" },
  { label: "Eletrônicos", value: "electronics" },
  { label: "Pet shop", value: "petshop" },
  { label: "Serviços (lavanderia, salão, etc.)", value: "services" },
  { label: "Outros", value: "other" },
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

const MULTI_STORE_CHALLENGES = [
  {
    label: "Falta de padronização na execução entre unidades",
    value: "lack_standardization",
  },
  {
    label: "Dificuldade em garantir que processos rodem igual em todas as lojas",
    value: "process_inconsistency",
  },
  {
    label: "Campanhas e ações não são aplicadas de forma consistente",
    value: "campaign_inconsistency",
  },
  {
    label: "Dificuldade para comparar desempenho entre lojas",
    value: "store_comparison_difficulty",
  },
  { label: "Falta de indicadores operacionais confiáveis", value: "lack_operational_kpis" },
  {
    label: "Não tenho clareza sobre qual loja performa melhor (e por quê)",
    value: "unclear_top_store_performance",
  },
  {
    label: "Dificuldade em acompanhar produtividade da equipe por unidade",
    value: "team_productivity_visibility",
  },
  { label: "Falta de accountability entre gestores de loja", value: "lack_manager_accountability" },
  { label: "Perdas/furtos recorrentes sem evidência estruturada", value: "recurring_losses" },
  { label: "Ocorrências sem histórico centralizado", value: "no_incident_history" },
  {
    label: "Falta de visibilidade em tempo real do que acontece nas lojas",
    value: "no_real_time_visibility",
  },
  {
    label: "Experiência do cliente varia muito entre unidades",
    value: "inconsistent_customer_experience",
  },
  { label: "Outro", value: "other" },
] as const

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

  const [operationType, setOperationType] = useState<OperationTypeValue | "">("")
  const [operationTypeOther, setOperationTypeOther] = useState("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [pilotCity, setPilotCity] = useState("")
  const [pilotState, setPilotState] = useState("")

  // ⚠️ Agora fica ABERTO no formulário e OBRIGATÓRIO (sem accordion)
  const [setupWhere, setSetupWhere] = useState<SetupWhereValue | "">("")
  const [accessWho, setAccessWho] = useState<AccessWhoValue | "">("")
  const [operatorsHaveAccess, setOperatorsHaveAccess] = useState<OperatorsAccessValue>("")

  // Objetivos (multi seleção)
  const [goals, setGoals] = useState<GoalValue[]>([])
  const [goalOther, setGoalOther] = useState("")
  const [contextNote, setContextNote] = useState("")

  // Dor multilojista
  const [multiStoreChallenges, setMultiStoreChallenges] = useState<string[]>([])
  const [multiStoreOther, setMultiStoreOther] = useState("")

  const [consent, setConsent] = useState(false)

  // TODO: remover após deploy de validação
  console.log("[AgendarDemo] storesRange:", storesRange, "isMultiStore:", true)

  const hasOtherGoal = goals.includes("other")
  const needsSourceDetail = howHeard === "other" || howHeard === "referral"

  const isMultiStore = true
  const needsMultiStoreOther = multiStoreChallenges.includes("other")

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
    let total = 9
    if (name.trim()) done++
    if (isValidWhatsappBR11Mobile(whatsapp)) done++
    if (operationType) done++
    if (operationType === "other") {
      total += 1
      if (operationTypeOther.trim()) done++
    }
    if (storesRange) done++
    if (camerasRange) done++
    if (goals.length > 0) done++
    if (setupWhere) done++
    if (operatorsHaveAccess) done++
    if (accessWho) done++
    return Math.round((done / total) * 100)
  }, [
    name,
    whatsapp,
    operationType,
    operationTypeOther,
    storesRange,
    camerasRange,
    goals.length,
    setupWhere,
    operatorsHaveAccess,
    accessWho,
  ])

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

  function toggleMultiStoreChallenge(value: string) {
    setMultiStoreChallenges((prev) => {
      const exists = prev.includes(value)
      return exists ? prev.filter((item) => item !== value) : [...prev, value]
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
    if (!operationType) return toast.error("Informe o segmento da operação.")
    if (operationType === "other" && !operationTypeOther.trim()) {
      return toast.error('Preencha "Qual?" (segmento da operação).')
    }
    if (!storesRange) return toast.error("Selecione a faixa de quantidade de lojas.")
    if (!camerasRange) return toast.error("Selecione a faixa de quantidade de câmeras.")

    if (isMultiStore && multiStoreChallenges.length === 0) {
      return toast.error("Selecione pelo menos 1 desafio na gestão das suas lojas.")
    }
    if (isMultiStore && multiStoreChallenges.includes("other") && !multiStoreOther.trim()) {
      return toast.error('Preencha "Outro" (desafios).')
    }

    if (!goals.length) return toast.error("Selecione pelo menos 1 objetivo.")
    if (hasOtherGoal && !goalOther.trim()) return toast.error('Preencha o campo "Outro" (objetivos).')

    if (!setupWhere) return toast.error("Responda onde a DaleVision irá rodar em sua loja.")
    if (!accessWho) return toast.error("Selecione quem terá acesso para ajudar na ativação.")
    if (!operatorsHaveAccess) {
      return toast.error("Informe se operadores terão acesso ao computador.")
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

        operation_type: operationType,
        stores_range: storesRange,
        cameras_range: camerasRange,
        camera_brands_json: cameraBrands,

        pilot_city: pilotCity.trim() ? pilotCity.trim() : null,
        pilot_state: pilotState.trim() ? pilotState.trim().toUpperCase() : null,

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

          multi_store_challenges: isMultiStore ? multiStoreChallenges : null,
          multi_store_challenges_other:
            isMultiStore && needsMultiStoreOther ? multiStoreOther.trim() : null,

          source_detail: needsSourceDetail ? howHeardOther.trim() : null,
          source_channel: "web",

          activation_setup_where: setupWhere,
          activation_access_who: accessWho,
          operators_have_access: operatorsHaveAccess,
          operation_type_other:
            operationType === "other" ? operationTypeOther.trim() || null : null,

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
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as OperationTypeValue)}
              >
                <option value="">Selecione</option>
                {OPERATION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {operationType === "other" && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-operation-other">
                    Qual? *
                  </label>
                  <input
                    id="demo-operation-other"
                    className={inputBase}
                    placeholder="Descreva o segmento"
                    value={operationTypeOther}
                    onChange={(e) => setOperationTypeOther(e.target.value)}
                  />
                </div>
              )}
              {fieldErrors.operation_type && <p className="mt-2 text-xs text-red-600">{fieldErrors.operation_type}</p>}
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
                  Quantidade total de Câmeras? *
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

            {/* MULTILOJISTA PAIN */}
            {isMultiStore && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">Qual é hoje o principal desafio na gestão das suas lojas? *</h3>
                  <span className="text-xs text-slate-500">Marque quantos quiser</span>
                </div>

                <div className="space-y-2">
                  {MULTI_STORE_CHALLENGES.map((p) => (
                    <label
                      key={p.value}
                      className={[
                        "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition",
                        multiStoreChallenges.includes(p.value)
                          ? "border-cyan-300 bg-cyan-50/60"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        name={`multi-pain-${p.value}`}
                        value={p.value}
                        checked={multiStoreChallenges.includes(p.value)}
                        onChange={() => toggleMultiStoreChallenge(p.value)}
                        className="mt-1 h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-200"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">{p.label}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {needsMultiStoreOther && (
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="multi-pain-other">
                      Outro (desafios) *
                    </label>
                    <input
                      id="multi-pain-other"
                      className={inputBase}
                      placeholder="Descreva em poucas palavras"
                      value={multiStoreOther}
                      onChange={(e) => setMultiStoreOther(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* GOALS multi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">O que você quer validar na demonstração? *</h3>
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
                    <option value="store_pc_linux">Computador na loja (Linux)</option>
                    <option value="nvr_server">Servidor/NVR onde ficam as câmeras</option>
                    <option value="not_sure">Não sei ainda</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-operators-access">
                    Operadores terão acesso se rodar no computador? *
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
              <h3 className="font-semibold text-slate-900">Local da loja piloto (opcional)</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-pilot-uf">
                    Estado (UF)
                  </label>
                  <select
                    id="demo-pilot-uf"
                    className={selectBase}
                    value={pilotState}
                    onChange={(e) => setPilotState(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {BRAZIL_UF.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="demo-pilot-city">
                    Cidade
                  </label>
                  <input
                    id="demo-pilot-city"
                    className={inputBase}
                    placeholder="Digite a cidade"
                    value={pilotCity}
                    onChange={(e) => setPilotCity(e.target.value)}
                  />
                </div>
              </div>
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
