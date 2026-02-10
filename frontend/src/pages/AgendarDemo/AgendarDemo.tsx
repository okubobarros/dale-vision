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

const GOALS: { label: string; value: GoalValue }[] = [
  { label: "Reduzir perdas / fraudes", value: "loss_prevention" },
  { label: "Reduzir filas e melhorar atendimento", value: "queues" },
  { label: "Aumentar produtividade da equipe", value: "productivity" },
  { label: "Padronizar operação entre lojas", value: "standardization" },
  { label: "Segurança e incidentes", value: "security" },
  { label: "Entender fluxo / heatmap / conversão", value: "heatmap" },
  { label: "Outro", value: "other" },
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

  const [operationType, setOperationType] = useState("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [stateUF, setStateUF] = useState("")

  const [setupWhere, setSetupWhere] = useState<SetupWhereValue | "">("")
  const [accessWho, setAccessWho] = useState<AccessWhoValue | "">("")

  const [goals, setGoals] = useState<GoalValue[]>([])
  const [goalOther, setGoalOther] = useState("")

  const [consent, setConsent] = useState(false)

  const hasOther = goals.includes("other")
  const needsSourceDetail = howHeard === "other" || howHeard === "referral"

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
      goalsCount: goals.filter((g) => g !== "other").length + (hasOther ? 1 : 0),
    })
  }, [storesRange, camerasRange, cameraBrands.length, goals, hasOther])

  function toggleBrand(brand: (typeof CAMERA_BRANDS)[number]) {
    setCameraBrands((prev) => {
      const exists = prev.includes(brand)
      if (brand === "Não sei informar") {
        return exists ? [] : ["Não sei informar"]
      }
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

    if (!nameClean) return toast.error("Informe seu nome completo.")
    if (!emailClean || !isValidEmail(emailClean)) return toast.error("Informe um e-mail válido.")
    if (!isValidWhatsappBR11Mobile(whatsapp)) {
      return toast.error("WhatsApp inválido. Use DDD + número de celular (11 dígitos, começando com 9).")
    }
    if (!operationType.trim()) return toast.error("Informe o tipo/segmento da operação.")
    if (!storesRange) return toast.error("Selecione a faixa de quantidade de lojas.")
    if (!camerasRange) return toast.error("Selecione a faixa de quantidade de câmeras.")
    if (!goals.length) return toast.error("Selecione pelo menos 1 objetivo.")
    if (hasOther && !goalOther.trim()) return toast.error('Preencha o campo "Outro" (objetivo).')
    if (!consent) return toast.error("É necessário concordar em receber comunicações sobre a demo.")
    if (!howHeard) return toast.error("Selecione a origem do contato.")
    if (needsSourceDetail && !howHeardOther.trim()) {
      return toast.error('Preencha o campo de detalhes da origem.')
    }

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
        primary_goals: goals,

        source: howHeard,
        utm: {
          utm_source: "dalevision_site",
          utm_medium: "demo_form",
          utm_campaign: "agendar_demo",
        },

        metadata: {
          consent: true,
          goal_other: hasOther ? goalOther.trim() : null,
          goals_selected: goals,

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
      toast.success("Recebemos seus dados. Abrindo o Calendly…")
      setTimeout(() => {
        window.location.href = calendlyUrl.toString()
      }, 2500)
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
              Dados enviados com sucesso. Redirecionando para o Calendly…
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
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                📅 Sua demo do Dale Vision está quase pronta!
              </h1>
            </div>
          </div>

          {/* Passos */}
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900 mb-2">Como funciona</div>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600">
              <li>Responda o formulário para entendermos o seu perfil (1–2 min)</li>
              <li>Agenda a Demonstração no Calendly (30s)</li>
              <li>Na demo, definimos a loja piloto (até 3 câmeras) e o passo a passo</li>
            </ol>
          </div>

          {/* Ativação pós-demo */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
            <div className="font-semibold mb-1">Depois da demo: ativação na loja (5–10 min)</div>
            <p className="text-amber-900/90">
              Para conectar as câmeras, você instala o<strong> Agente Dale Vision (.exe)</strong> em um computador da loja
              (servidor local onde roda as câmeras). Para essa ativação você vai precisar (em algum momento) de acesso a
              esse computador e às credenciais das câmeras/NVR.
            </p>
            <p className="text-amber-900/80 mt-2">
              ✅ Após o agendamento, enviaremos por WhatsApp/e-mail um link com o download e um checklist simples.
            </p>
            <p className="mt-2">
              <strong>A transformação da gestão do seu negócio está a poucos cliques.</strong>
            </p>
          </div>

          {/* Seus dados */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Seus dados</h2>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-name">
                Nome completo *
              </label>
              <input
                id="demo-name"
                className={inputBase}
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {fieldErrors.contact_name && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.contact_name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-email">
                E-mail corporativo *
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
              {fieldErrors.email && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.email}</p>
              )}
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
              <p className="text-xs text-slate-500 mt-1">Enviaremos confirmação, lembrete e o link do Agent.</p>
              {fieldErrors.whatsapp && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.whatsapp}</p>
              )}
            </div>
          </div>

          {/* Como soube */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Origem do contato *</h2>

            <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-how-heard">
                  Selecione uma opção *
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
                      ? "Ex: consultor, parceiro, amigo..."
                      : "Ex: grupo do WhatsApp, recomendação de consultor..."
                  }
                  value={howHeardOther}
                  onChange={(e) => setHowHeardOther(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Seu negócio */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Seu negócio</h2>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-operation">
                Segmento / tipo de operação *
              </label>
              <input
                id="demo-operation"
                className={inputBase}
                placeholder="Ex: supermercado, farmácia, loja de roupas..."
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
              />
              {fieldErrors.operation_type && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.operation_type}</p>
              )}
            </div>

            <div className="flex gap-3">
              <div className="w-full">
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-city">
                  Cidade (opcional)
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
                  UF (opcional)
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
              {fieldErrors.stores_range && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.stores_range}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-cameras-range">
                Aproximadamente quantas câmeras você tem? *
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
              {fieldErrors.cameras_range && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.cameras_range}</p>
              )}
            </div>

            {/* Marcas */}
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
          </div>

          {/* Pré-ativação */}
          <div className="space-y-3">
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
                  Quem terá acesso na loja?
                </label>
                <select
                  id="demo-access-who"
                  className={selectBase}
                  value={accessWho}
                  onChange={(e) => setAccessWho(e.target.value as AccessWhoValue)}
                >
                  <option value="">Selecione (opcional)</option>
                  <option value="owner">Eu mesmo</option>
                  <option value="store_manager">Gerente / responsável da loja</option>
                  <option value="staff">Funcionário de confiança</option>
                  <option value="not_sure">Ainda não sei</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Isso não impede o agendamento — só ajuda a gente a preparar a ativação no mesmo dia.
            </p>
          </div>

          {/* Objetivo */}
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-900">Objetivo *</h2>

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

            {hasOther && (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="demo-goal-other">
                  Descreva brevemente (Outro) *
                </label>
                <input
                  id="demo-goal-other"
                  className={inputBase}
                  placeholder="Ex: reduzir abandono na entrada da loja..."
                  value={goalOther}
                  onChange={(e) => setGoalOther(e.target.value)}
                />
              </div>
            )}
            {fieldErrors.primary_goals && (
              <p className="text-xs text-red-600">{fieldErrors.primary_goals}</p>
            )}
          </div>

          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-900">📲 Vamos te manter informado</p>
            <p className="text-slate-600">
              Enviaremos confirmações e lembretes por WhatsApp e e-mail — e o link para dowload do Agente Dale Vision
              após o agendamento.
            </p>
          </div>

          {/* Consentimento */}
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
            {loading ? "Enviando..." : "Continuar para escolher o horário"}
          </button>

          <p className="text-xs text-center text-slate-500">Você será redirecionado para o Calendly.</p>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} DaleVision</div>
      </div>
    </div>
  )
}
