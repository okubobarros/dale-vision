import { useState } from "react"
import toast from "react-hot-toast"
import logo from "../../assets/logo.png"
import { demoService } from "../../services/demo"

type StoresRange = "1" | "2-5" | "6-20" | "20+"
type CamerasRange = "1-3" | "4-10" | "11-50" | "50+"

const CAMERA_BRANDS = [
  "Intelbras",
  "Hikvision",
  "Dahua",
  "Chinesas genéricas",
  "Outras",
  "Não sei informar",
]

const GOALS = [
  { label: "Reduzir perdas / fraudes", value: "loss_prevention" },
  { label: "Reduzir filas e melhorar atendimento", value: "queues" },
  { label: "Aumentar produtividade da equipe", value: "productivity" },
  { label: "Padronizar operação entre lojas", value: "standardization" },
  { label: "Segurança e incidentes", value: "security" },
  { label: "Entender fluxo / heatmap / conversão", value: "heatmap" },
  { label: "Outro", value: "other" },
]

export default function AgendarDemo() {
  const [loading, setLoading] = useState(false)

  // dados pessoais
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")

  // negócio
  const [operationType, setOperationType] = useState("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [stateUF, setStateUF] = useState("")

  // objetivos (multi)
  const [goals, setGoals] = useState<string[]>([])
  const [goalOther, setGoalOther] = useState("")

  const [consent, setConsent] = useState(false)

  function toggleBrand(brand: string) {
    setCameraBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  function toggleGoal(value: string) {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    )
  }

  async function handleSubmit() {
    if (!name || !email || !whatsapp) {
      toast.error("Preencha seus dados básicos.")
      return
    }

    if (!operationType || !storesRange || !camerasRange || goals.length === 0) {
      toast.error("Preencha as informações do negócio e objetivo.")
      return
    }

    if (!consent) {
      toast.error("É necessário concordar com o recebimento das comunicações.")
      return
    }

    try {
      setLoading(true)

      const payload = {
        contact_name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),

        operation_type: operationType.trim(),
        stores_range: storesRange,
        cameras_range: camerasRange,
        camera_brands_json: cameraBrands,

        pilot_city: city || null,
        pilot_state: stateUF || null,

        primary_goals: goals,

        source: "web",
        utm: {
          utm_source: "dalevision_site",
          utm_medium: "demo_form",
          utm_campaign: "agendar_demo",
        },

        metadata: {
          goal_other: goals.includes("other") ? goalOther : null,
        },
      }

      const lead = await demoService.createLead(payload)

      const calendlyUrl = new URL("https://calendly.com/dale-vision")
      calendlyUrl.searchParams.set("lead_id", lead.id)
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
        <div className="flex items-center gap-3">
          <img src={logo} alt="DALE Vision" className="h-10 w-10 rounded-md" />
          <div>
            <h1 className="text-xl font-bold">
              Agendar demo personalizada do Dale Vision IA
            </h1>
            <p className="text-sm text-gray-600">
              Em 30 minutos mostramos como transformar câmeras em decisões.
            </p>
          </div>
        </div>

        {/* Dados */}
        <div className="space-y-4">
          <h2 className="font-semibold">Seus dados</h2>
          <input className="input" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="E-mail corporativo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="WhatsApp com DDD" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>

        {/* Negócio */}
        <div className="space-y-4">
          <h2 className="font-semibold">Negócio</h2>
          <input className="input" placeholder="Tipo de operação" value={operationType} onChange={(e) => setOperationType(e.target.value)} />
          <div className="flex gap-4">
            <input className="input" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="input w-24" placeholder="UF" value={stateUF} onChange={(e) => setStateUF(e.target.value)} />
          </div>

          <select className="input" value={storesRange} onChange={(e) => setStoresRange(e.target.value as StoresRange)}>
            <option value="">Quantas lojas?</option>
            <option value="1">1</option>
            <option value="2-5">2–5</option>
            <option value="6-20">6–20</option>
            <option value="20+">20+</option>
          </select>

          <select className="input" value={camerasRange} onChange={(e) => setCamerasRange(e.target.value as CamerasRange)}>
            <option value="">Quantas câmeras?</option>
            <option value="1-3">1–3</option>
            <option value="4-10">4–10</option>
            <option value="11-50">11–50</option>
            <option value="50+">50+</option>
          </select>
        </div>

        {/* Objetivo */}
        <div className="space-y-3">
          <h2 className="font-semibold">Objetivo</h2>
          {GOALS.map((g) => (
            <label key={g.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={goals.includes(g.value)}
                onChange={() => toggleGoal(g.value)}
              />
              {g.label}
            </label>
          ))}

          {goals.includes("other") && (
            <input
              className="input"
              placeholder="Descreva brevemente"
              value={goalOther}
              onChange={(e) => setGoalOther(e.target.value)}
            />
          )}
        </div>

        {/* Consent */}
        <label className="flex gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Concordo em receber comunicações por WhatsApp e e-mail.
        </label>

        <button onClick={handleSubmit} disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white">
          {loading ? "Enviando..." : "Continuar para escolher o horário"}
        </button>
      </div>
    </div>
  )
}
