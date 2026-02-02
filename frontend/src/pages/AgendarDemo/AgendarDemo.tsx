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
type HowHeardValue =
  | "referral"
  | "instagram"
  | "linkedin"
  | "google"
  | "youtube"
  | "partner"
  | "event"
  | "other"
  
const HOW_HEARD: { label: string; value: HowHeardValue }[] = [
  { label: "Indicação", value: "referral" },
  { label: "Instagram", value: "instagram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Google / Busca", value: "google" },
  { label: "YouTube", value: "youtube" },
  { label: "Parceiro", value: "partner" },
  { label: "Evento", value: "event" },
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

// regra: aceitar BR com 11 dígitos (DDD + 9 dígitos)
// se vier com 55 (13 dígitos), normaliza para 11
function normalizeWhatsappToBR11(input: string) {
  const d = onlyDigits(input)
  if (d.length === 13 && d.startsWith("55")) return d.slice(2)
  return d
}

function isValidWhatsappBR11Mobile(input: string) {
  const br = normalizeWhatsappToBR11(input)
  if (br.length !== 11) return false
  const thirdDigit = br[2] // índice 0-1 DDD, índice 2 começa número
  return thirdDigit === "9"
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())
}

/**
 * Score interno: simples e estável.
 * (não exibir no form; só enviar pro backend)
 */
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

  const brands = Math.min(args.cameraBrandsCount, 4) * 5 // até 20
  const goals = Math.min(args.goalsCount, 4) * 5 // até 20

  const score = storesWeight[args.storesRange] + camsWeight[args.camerasRange] + brands + goals
  return Math.max(0, Math.min(100, score))
}

export default function AgendarDemo() {
  const [loading, setLoading] = useState(false)

  // dados pessoais
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [howHeard, setHowHeard] = useState<HowHeardValue | "">("")
  const [howHeardOther, setHowHeardOther] = useState("")

  // negócio
  const [operationType, setOperationType] = useState("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [stateUF, setStateUF] = useState("")

  // ativação (opcional) — pós-demo
  const [setupWhere, setSetupWhere] = useState<SetupWhereValue | "">("")
  const [accessWho, setAccessWho] = useState<AccessWhoValue | "">("")

  // objetivos (multi)
  const [goals, setGoals] = useState<GoalValue[]>([])
  const [goalOther, setGoalOther] = useState("")

  const [consent, setConsent] = useState(false)

  const hasOther = goals.includes("other")

  // “principal” = primeiro objetivo selecionado que não seja other; se só tiver other, other
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
      // “Não sei informar” deve ser exclusivo
      if (brand === "Não sei informar") {
        return exists ? [] : ["Não sei informar"]
      }
      // se escolher qualquer marca, remove “Não sei informar”
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
    if (!howHeard) return toast.error("Diga como você soube de nós.")
    if (howHeard === "other" && !howHeardOther.trim()) {
      return toast.error('Preencha o campo "Outro" (como soube de nós).')
    }

    try {
      setLoading(true)

      const payload = {
        contact_name: nameClean,
        email: emailClean,
        whatsapp: whatsappClean, // BR 11 dígitos (sem +55)

        operation_type: operationType.trim(),
        stores_range: storesRange,
        cameras_range: camerasRange,
        camera_brands_json: cameraBrands, // array (opcional — pode vir vazio)

        pilot_city: city.trim() ? city.trim() : null,
        pilot_state: stateUF.trim() ? stateUF.trim().toUpperCase() : null,

        primary_goal: primaryGoal || null,
        primary_goals: goals,

        source: "web",
        utm: {
          utm_source: "dalevision_site",
          utm_medium: "demo_form",
          utm_campaign: "agendar_demo",
        },

        metadata: {
          consent: true,
          goal_other: hasOther ? goalOther.trim() : null,
          goals_selected: goals,

          how_heard: howHeard || null,
          how_heard_other: howHeard === "other" ? howHeardOther.trim() : null,

          activation_setup_where: setupWhere || null,
          activation_access_who: accessWho || null,
          next_step_hint:
            "Após a demo, enviamos link do Edge Agent (.exe) por WhatsApp/e-mail para instalar no computador da loja ou no servidor/NVR e testar conexão com câmeras.",
        },

        qualified_score: qualifiedScore, // NÃO exibir no form
      }

      const lead = await demoService.createLead(payload)

      const calendlyUrl = new URL("https://calendly.com/dale-vision")
      calendlyUrl.searchParams.set("lead_id", lead.id)
      calendlyUrl.searchParams.set("utm_source", "dalevision_site")
      calendlyUrl.searchParams.set("utm_medium", "demo_form")
      calendlyUrl.searchParams.set("utm_campaign", "agendar_demo")
      calendlyUrl.searchParams.set("name", payload.contact_name)
      calendlyUrl.searchParams.set("email", payload.email)

      window.location.href = calendlyUrl.toString()
    } catch (err) {
      console.error(err)
      toast.error("Erro ao enviar dados. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F14]/85 backdrop-blur flex justify-center px-4 py-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <img src={logo} alt="DALE Vision" className="h-10 w-10 rounded-md" />
          <div>
            <h1 className="text-xl font-bold">📅 Sua demo do Dale Vision está quase pronta!</h1>

          </div>
        </div>

        {/* Passos */}
        <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
          <div className="font-semibold text-gray-800 mb-2">Como funciona</div>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Responda o formulário para entendermos o seu perfil (1–2 min)</li>
            <li>Agenda a Demonstração no Calendly (30s)</li>
            <li>Na demo, definimos a loja piloto (até 3 câmeras) e o passo a passo</li>
          </ol>
        </div>

        {/* ✅ Novo: clareza sobre ativação pós-demo */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold mb-1">Depois da demo: ativação na loja (5–10 min)</div>
          <p className="text-amber-900/90">
            Para conectar as câmeras, você instala o<strong> Agente Dale Vision (.exe)</strong> em um computador da loja (servidor local onde roda as câmeras
            ).  Para essa  ativação você vai precisar (em algum momento) de acesso a esse computador e às credenciais das câmeras/NVR.
          </p>
          <p className="text-amber-900/80 mt-2">
            ✅ Após o agendamento, enviaremos por WhatsApp/e-mail um link com o download e um checklist simples.
          </p> <p><strong>A transformação da gestão do seu negócio está a poucos cliques.</strong></p>
        </div>

        {/* Seus dados */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Seus dados</h2>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-name">
              Nome completo *
            </label>
            <input
              id="demo-name"
              className="mt-2 w-full rounded-lg border px-4 py-2"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-email">
              E-mail corporativo *
            </label>
            <input
              id="demo-email"
              className="mt-2 w-full rounded-lg border px-4 py-2"
              placeholder="nome@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-whatsapp">
              WhatsApp com DDD *
            </label>
            <input
              id="demo-whatsapp"
              className="mt-2 w-full rounded-lg border px-4 py-2"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="text-xs text-gray-500 mt-1">Enviaremos confirmação, lembrete e o link do Agent.</p>
          </div>
        </div>


        {/* Como soube de nós */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Como você soube de nós? *</h2>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-how-heard">
              Selecione uma opção *
            </label>
            <select
              id="demo-how-heard"
              className="mt-2 w-full rounded-lg border px-4 py-2"
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

          {howHeard === "other" && (
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="demo-how-heard-other">
                Descreva (Outro) *
              </label>
              <input
                id="demo-how-heard-other"
                className="mt-2 w-full rounded-lg border px-4 py-2"
                placeholder="Ex: grupo do WhatsApp, recomendação de consultor..."
                value={howHeardOther}
                onChange={(e) => setHowHeardOther(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Seu negócio */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Seu negócio</h2>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-operation">
              Segmento / tipo de operação *
            </label>
            <input
              id="demo-operation"
              className="mt-2 w-full rounded-lg border px-4 py-2"
              placeholder="Ex: supermercado, farmácia, loja de roupas..."
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="w-full">
              <label className="text-sm font-medium text-gray-700" htmlFor="demo-city">
                Cidade (opcional)
              </label>
              <input
                id="demo-city"
                className="mt-2 w-full rounded-lg border px-4 py-2"
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="w-28">
              <label className="text-sm font-medium text-gray-700" htmlFor="demo-uf">
                UF (opcional)
              </label>
              <input
                id="demo-uf"
                className="mt-2 w-full rounded-lg border px-4 py-2"
                placeholder="SP"
                value={stateUF}
                onChange={(e) => setStateUF(e.target.value)}
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-stores-range">
              Quantas lojas você opera hoje? *
            </label>
            <select
              id="demo-stores-range"
              className="mt-2 w-full rounded-lg border px-4 py-2"
              value={storesRange}
              onChange={(e) => setStoresRange(e.target.value as StoresRange)}
            >
              <option value="">Selecione</option>
              <option value="1">1</option>
              <option value="2-5">2–5</option>
              <option value="6-20">6–20</option>
              <option value="20+">20+</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="demo-cameras-range">
              Aproximadamente quantas câmeras você tem? *
            </label>
            <select
              id="demo-cameras-range"
              className="mt-2 w-full rounded-lg border px-4 py-2"
              value={camerasRange}
              onChange={(e) => setCamerasRange(e.target.value as CamerasRange)}
            >
              <option value="">Selecione</option>
              <option value="1-3">1–3</option>
              <option value="4-10">4–10</option>
              <option value="11-50">11–50</option>
              <option value="50+">50+</option>
            </select>
          </div>

          {/* Marcas: útil, mas NÃO obrigatória */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Marcas de câmeras (opcional)
            </p>
            <div className="flex flex-wrap gap-2">
              {CAMERA_BRANDS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBrand(b)}
                  className={`px-3 py-1 rounded-full border text-sm transition ${
                    cameraBrands.includes(b)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ Novo: Pré-ativação (opcional, não bloqueia) */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Preparação para ativação (opcional)</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="demo-setup-where">
                Onde o Agent deve rodar?
              </label>
              <select
                id="demo-setup-where"
                className="mt-2 w-full rounded-lg border px-4 py-2"
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
              <label className="text-sm font-medium text-gray-700" htmlFor="demo-access-who">
                Quem terá acesso na loja?
              </label>
              <select
                id="demo-access-who"
                className="mt-2 w-full rounded-lg border px-4 py-2"
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

          <p className="text-xs text-gray-500">
            Isso não impede o agendamento — só ajuda a gente a preparar a ativação no mesmo dia.
          </p>
        </div>

        {/* Objetivo (multi) */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Objetivo *</h2>

          <div className="space-y-2">
            {GOALS.map((g) => (
              <label key={g.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  value={g.value}
                  checked={goals.includes(g.value)}
                  onChange={() => toggleGoal(g.value)}
                />
                {g.label}
              </label>
            ))}
          </div>

          {hasOther && (
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="demo-goal-other">
                Descreva brevemente (Outro) *
              </label>
              <input
                id="demo-goal-other"
                className="mt-2 w-full rounded-lg border px-4 py-2"
                placeholder="Ex: reduzir abandono na entrada da loja..."
                value={goalOther}
                onChange={(e) => setGoalOther(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="text-sm text-gray-700">
          <p className="font-medium">📲 Vamos te manter informado</p>
          <p className="text-gray-600">
            Enviaremos confirmações e lembretes por WhatsApp e e-mail — e o link para dowload do Agente Dale Vision após o agendamento.
          </p>
        </div>

        {/* Consentimento */}
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Concordo em receber comunicações sobre a demo por WhatsApp e e-mail. Você pode cancelar quando quiser.
        </label>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Continuar para escolher o horário"}
        </button>

        <p className="text-xs text-center text-gray-500">Você será redirecionado para o Calendly.</p>
      </div>
    </div>
  )
}
