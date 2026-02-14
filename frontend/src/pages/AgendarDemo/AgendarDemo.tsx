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

type SetupWhereValue = "store_pc" | "nvr_server" | "not_sure"
type AccessWhoValue = "owner" | "store_manager" | "staff" | "not_sure"
type HowHeardValue = "referral" | "instagram" | "google" | "youtube" | "other"

const HOW_HEARD: { label: string; value: HowHeardValue }[] = [
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "Indicação", value: "referral" },
  { label: "Google / Busca", value: "google" },
  { label: "Outro", value: "other" },
]

const CAMERA_BRANDS = [
  "Intelbras",
  "Hikvision",
  "Dahua",
  "Chinesas genéricas",
  "Outras",
  "Não sei informar",
] as const

const GOALS: { label: string; value: GoalValue; hint: string }[] = [
  { label: "Reduzir perdas / fraudes", value: "loss_prevention", hint: "alertas e evidências acionáveis" },
  { label: "Reduzir filas e melhorar atendimento", value: "queues", hint: "picos, gargalos e tempo de espera" },
  { label: "Aumentar produtividade da equipe", value: "productivity", hint: "rotina, padrão e eficiência" },
  { label: "Padronizar operação entre lojas", value: "standardization", hint: "comparação e consistência" },
  { label: "Segurança e incidentes", value: "security", hint: "ocorrências e resposta rápida" },
  { label: "Entender fluxo / heatmap / conversão", value: "heatmap", hint: "mapas de calor e comportamento" },
  { label: "Outro", value: "other", hint: "um objetivo específico seu" },
]

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

  // Step UX (1 = essentials, 2 = optional)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [howHeard, setHowHeard] = useState<HowHeardValue | "">("")
  const [howHeardOther, setHowHeardOther] = useState("")

  const [operationType, setOperationType] = useState("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [stateUF, setStateUF] = useState("")

  const [setupWhere, setSetupWhere] = useState<SetupWhereValue | "">("")
  const [accessWho, setAccessWho] = useState<AccessWhoValue | "">("")

  // Goals: We’ll keep multi-select for backend, BUT we’ll push the user to pick ONE priority first
  const [primaryGoalPick, setPrimaryGoalPick] = useState<GoalValue | "">("")
  const [goals, setGoals] = useState<GoalValue[]>([])
  const [goalOther, setGoalOther] = useState("")

  const [consent, setConsent] = useState(false)

  const hasOther = goals.includes("other") || primaryGoalPick === "other"
  const needsSourceDetail = howHeard === "other" || howHeard === "referral"

  // Ensure primary goal is always included in goals array
  const normalizedGoals = useMemo(() => {
    const set = new Set<GoalValue>(goals)
    if (primaryGoalPick) set.add(primaryGoalPick as GoalValue)
    return Array.from(set)
  }, [goals, primaryGoalPick])

  const primaryGoal: GoalValue | "" = useMemo(() => {
    if (primaryGoalPick) return primaryGoalPick as GoalValue
    if (!normalizedGoals.length) return ""
    const nonOther = normalizedGoals.find((g) => g !== "other")
    return nonOther || "other"
  }, [normalizedGoals, primaryGoalPick])

  const qualifiedScore = useMemo(() => {
    if (!storesRange || !camerasRange) return 0
    return computeQualifiedScore({
      storesRange,
      camerasRange,
      cameraBrandsCount: cameraBrands.length,
      goalsCount: normalizedGoals.filter((g) => g !== "other").length + (hasOther ? 1 : 0),
    })
  }, [storesRange, camerasRange, cameraBrands.length, normalizedGoals, hasOther])

  const progress = useMemo(() => {
    // simple progress for "essentials" completion (helps conversion)
    let done = 0
    const total = 6
    if (name.trim()) done++
    if (isValidWhatsappBR11Mobile(whatsapp)) done++
    if (operationType.trim()) done++
    if (storesRange) done++
    if (camerasRange) done++
    if (primaryGoalPick) done++
    return Math.round((done / total) * 100)
  }, [name, whatsapp, operationType, storesRange, camerasRange, primaryGoalPick])

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

    // Essentials first (to maximize completion)
    if (!nameClean) return toast.error("Informe seu nome.")
    if (!isValidWhatsappBR11Mobile(whatsapp)) {
      return toast.error("WhatsApp inválido. Use DDD + número de celular (11 dígitos, começando com 9).")
    }
    if (!operationType.trim()) return toast.error("Informe o segmento da operação.")
    if (!storesRange) return toast.error("Selecione a faixa de quantidade de lojas.")
    if (!camerasRange) return toast.error("Selecione a faixa de quantidade de câmeras.")
    if (!primaryGoalPick) return toast.error("Escolha 1 objetivo principal para a demo.")

    // Email is still valuable for Calendly + follow-ups. Keep required, but copy will remove “corporativo”.
    if (!emailClean || !isValidEmail(emailClean)) return toast.error("Informe um e-mail válido.")

    // Remaining requirements (kept, but moved lower on page for less friction)
    if (!howHeard) return toast.error("Selecione a origem do contato.")
    if (needsSourceDetail && !howHeardOther.trim()) return toast.error("Preencha o detalhe da origem.")
    if (hasOther && !goalOther.trim()) return toast.error('Preencha o campo "Outro" (objetivo).')
    if (!consent) return toast.error("Para enviar confirmação e checklist, marque o consentimento.")

    try {
      setLoading(true)

      const payload = {
        contact_name: nameClean,
        email: emailClean,
        whatsapp: whatsappClean,

        operation_type: operationType.trim(),
        stores_range: storesRange,
        cameras_range: camerasRange,
        camera_brands_json: cameraBrands,

        pilot_city: city.trim() ? city.trim() : null,
        pilot_state: stateUF.trim() ? stateUF.trim().toUpperCase() : null,

        primary_goal: primaryGoal || null,
        primary_goals: normalizedGoals,

        source: howHeard,
        utm: {
          utm_source: "dalevision_site",
          utm_medium: "demo_form",
          utm_campaign: "agendar_demo",
        },

        metadata: {
          consent: true,
          goal_other: hasOther ? goalOther.trim() : null,
          goals_selected: normalizedGoals,

          source_detail: needsSourceDetail ? howHeardOther.trim() : null,
          source_channel: "web",

          activation_setup_where: setupWhere || null,
          activation_access_who: accessWho || null,
          next_step_hint:
            "Após a demo, enviamos link do Edge Agent (.exe) por WhatsApp/e-mail para instalar no computador da loja ou no servidor/NVR e testar conexão com câmeras.",
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
                <span className={pill}>🧠 plano de ação na hora</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Descubra onde sua loja está perdendo eficiência — e como corrigir usando suas próprias câmeras.
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Agende uma demo estratégica de 30 minutos e saia com um plano claro para uma loja piloto (até 3 câmeras).
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

          {/* Value: What you get */}
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900 mb-2">O que você vai ver na demo</div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>
                  <strong>Oportunidades “invisíveis”</strong> no fluxo da loja (gargalos, desvios, padrões).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>
                  <strong>O que atacar primeiro</strong> para gerar impacto (perdas, filas, produtividade, segurança).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>
                  <strong>Plano de ativação</strong> para rodar uma loja piloto sem travar sua operação.
                </span>
              </li>
            </ul>
          </div>

          {/* Post-demo activation (keep, but more “low friction” framing) */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
            <div className="font-semibold mb-1">Depois do agendamento, você recebe um checklist simples</div>
            <p className="text-amber-900/90">
              Para conectar as câmeras, instalamos o <strong>Agente Dale Vision (.exe)</strong> em um computador Windows
              da loja (ou no servidor/NVR). Em algum momento, você só vai precisar de{" "}
              <strong>acesso ao computador</strong> e às <strong>credenciais das câmeras/NVR</strong>.
            </p>
            <p className="text-amber-900/80 mt-2">✅ Enviamos o link do Agent por WhatsApp e e-mail após o agendamento.</p>
            <p className="mt-2">
              <strong>Sem compromisso:</strong> a demo serve para você decidir com clareza se faz sentido.
            </p>
          </div>

          {/* ESSENTIALS FIRST */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">1) Informações rápidas para personalizar a demo</h2>

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
              <p className="text-xs text-slate-500 mt-1">Vamos enviar confirmação, lembrete e o checklist por aqui.</p>
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
              <p className="text-xs text-slate-500 mt-1">Usamos para enviar o convite do calendário e materiais.</p>
              {fieldErrors.email && <p className="mt-2 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-operation">
                Segmento / tipo de operação *
              </label>
              <input
                id="demo-operation"
                className={inputBase}
                placeholder="Ex: supermercado, farmácia, moda, atacarejo…"
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
              />
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

            {/* PRIMARY GOAL (radio) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">2) Qual o objetivo principal da sua demo? *</h2>
                <span className="text-xs text-slate-500">Escolha 1 prioridade</span>
              </div>

              <div className="space-y-2">
                {GOALS.map((g) => (
                  <label
                    key={g.value}
                    className={[
                      "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition",
                      primaryGoalPick === g.value
                        ? "border-cyan-300 bg-cyan-50/60"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="primary-goal"
                      value={g.value}
                      checked={primaryGoalPick === g.value}
                      onChange={() => setPrimaryGoalPick(g.value)}
                      className="mt-1 h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-200"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{g.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              {hasOther && (
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
            </div>
          </div>

          {/* Proof + scarcity (light, not cringy) */}
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900 mb-2">Para garantir qualidade na ativação piloto</div>
            <p className="text-slate-600">
              A gente limita novas ativações por semana para acompanhar de perto. Se você quer testar ainda esta semana,
              escolha um horário agora.
            </p>
          </div>

          {/* ADVANCED (optional) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-left text-sm text-slate-700 hover:bg-white transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Opcional: detalhes para deixar a demo ainda mais certeira</span>
                <span className="text-slate-500">{advancedOpen ? "−" : "+"}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Se não souber, pode pular — não impede o agendamento.</div>
            </button>

            {advancedOpen && (
              <div className="space-y-5">
                {/* Origem */}
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900">Origem do contato *</h2>
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

                {/* Local */}
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900">Loja piloto (opcional)</h2>
                  <div className="flex gap-3">
                    <div className="w-full">
                      <label className="text-sm font-medium text-slate-700" htmlFor="demo-city">
                        Cidade
                      </label>
                      <input
                        id="demo-city"
                        className={inputBase}
                        placeholder="Cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>

                    <div className="w-28">
                      <label className="text-sm font-medium text-slate-700" htmlFor="demo-uf">
                        UF
                      </label>
                      <input
                        id="demo-uf"
                        className={inputBase}
                        placeholder="SP"
                        value={stateUF}
                        onChange={(e) => setStateUF(e.target.value)}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Brands */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Marcas de câmeras (opcional)</p>
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

                {/* Setup */}
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900">Preparação para ativação (opcional)</h2>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700" htmlFor="demo-setup-where">
                        Onde o Agent deve rodar?
                      </label>
                      <select
                        id="demo-setup-where"
                        className={selectBase}
                        value={setupWhere}
                        onChange={(e) => setSetupWhere(e.target.value as SetupWhereValue)}
                      >
                        <option value="">Selecione (opcional)</option>
                        <option value="store_pc">Computador na loja (Windows)</option>
                        <option value="nvr_server">Servidor/NVR onde ficam as câmeras</option>
                        <option value="not_sure">Não sei ainda</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700" htmlFor="demo-access-who">
                        Quem terá acesso para ajudar na ativação?
                      </label>
                      <select
                        id="demo-access-who"
                        className={selectBase}
                        value={accessWho}
                        onChange={(e) => setAccessWho(e.target.value as AccessWhoValue)}
                      >
                        <option value="">Selecione (opcional)</option>
                        <option value="owner">Eu mesmo</option>
                        <option value="store_manager">Gerente / responsável</option>
                        <option value="staff">Funcionário de confiança</option>
                        <option value="not_sure">Ainda não sei</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Isso não impede o agendamento — só ajuda a gente a preparar tudo para você sair da demo com a loja piloto pronta.
                  </p>
                </div>

                {/* Secondary goals (optional) */}
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900">Opcional: objetivos secundários</h2>
                  <p className="text-xs text-slate-500">
                    Se quiser, marque mais 1–2 temas para a gente cobrir rapidamente na demo.
                  </p>

                  <div className="space-y-2">
                    {GOALS.filter((g) => g.value !== primaryGoalPick).map((g) => (
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
                </div>
              </div>
            )}
          </div>

          {/* Consent */}
          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-900">📲 Confirmação + checklist</p>
            <p className="text-slate-600">
              Vamos enviar confirmações e lembretes por WhatsApp e e-mail — e o link para download do Agent após o agendamento.
            </p>
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
            Você será redirecionado para escolher o melhor horário. (Leva ~15s)
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </div>
  )
}
