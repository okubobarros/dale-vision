import { useMemo, useState } from "react"

export type StoreDraft = {
  name: string
  city: string
  state: string
  businessType: string
  businessTypeOther: string
  posSystem: string
  posSystemOther: string
  posIntegrationInterest: boolean
  hoursWeekdays: string
  hoursSaturday: string
  hoursSundayHoliday: string
  camerasCount: string
}

const BUSINESS_TYPES = [
  "Moda",
  "Alimentação",
  "Farmácia",
  "Beleza",
  "Casa & Decoração",
  "Mercado",
  "Serviços",
  "Outro",
]

const POS_SYSTEMS = [
  "Linx",
  "TOTVS",
  "Oracle Retail",
  "SAP",
  "Conta Azul",
  "NCR",
  "Outro",
]

export default function StoresSetup({
  value,
  onChange,
  onNext,
  isSubmitting = false,
  submitError = "",
}: {
  value: StoreDraft | null
  onChange: (v: StoreDraft) => void
  onNext: (draft: StoreDraft) => Promise<void>
  isSubmitting?: boolean
  submitError?: string
}) {
  const [touched, setTouched] = useState(false)

  const form: StoreDraft = value ?? {
    name: "",
    city: "",
    state: "",
    businessType: "",
    businessTypeOther: "",
    posSystem: "",
    posSystemOther: "",
    posIntegrationInterest: false,
    hoursWeekdays: "",
    hoursSaturday: "",
    hoursSundayHoliday: "",
    camerasCount: "",
  }

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Informe o nome da loja."
    if (form.state.trim() && form.state.trim().length !== 2) e.state = "UF com 2 letras."
    if (form.camerasCount && Number.isNaN(Number(form.camerasCount))) {
      e.camerasCount = "Informe um número válido."
    }
    return e
  }, [form.name, form.state, form.camerasCount])

  const canNext = Object.keys(errors).length === 0

  function set<K extends keyof StoreDraft>(key: K, val: StoreDraft[K]) {
    const next = { ...form, [key]: val }
    onChange(next)
  }

  async function handleNext() {
    setTouched(true)
    if (!canNext || isSubmitting) return
    await onNext(form)
  }

  return (
    

    <div className="space-y-8">


      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Loja (obrigatório)</h3>
        <p className="text-slate-500 mt-1">
          Só o essencial para liberar a ativação do Edge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Form */}
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da Loja *" error={touched ? errors.name : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Ex: Loja Centro"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field label="Cidade (opcional)">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="São Paulo"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field label="Estado (UF) (opcional)" error={touched ? errors.state : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400 uppercase
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="SP"
                maxLength={2}
                value={form.state}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Segmento do negócio (opcional)">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                value={form.businessType}
                onChange={(e) => set("businessType", e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Selecione...</option>
                {BUSINESS_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sistema de PDV (opcional)">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                value={form.posSystem}
                onChange={(e) => set("posSystem", e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Selecione...</option>
                {POS_SYSTEMS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {(form.businessType || "").toLowerCase() === "outro" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Qual segmento?">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                             focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                  placeholder="Descreva o segmento"
                  value={form.businessTypeOther}
                  onChange={(e) => set("businessTypeOther", e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
          )}

          {(form.posSystem || "").toLowerCase() === "outro" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Qual PDV?">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                             focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                  placeholder="Descreva o sistema"
                  value={form.posSystemOther}
                  onChange={(e) => set("posSystemOther", e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Quer integrar PDV? (opcional)">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set("posIntegrationInterest", true)}
                  disabled={isSubmitting}
                  className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    form.posIntegrationInterest
                      ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Sim, quero integrar
                </button>
                <button
                  type="button"
                  onClick={() => set("posIntegrationInterest", false)}
                  disabled={isSubmitting}
                  className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    !form.posIntegrationInterest
                      ? "border-slate-300 bg-slate-100 text-slate-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Não agora
                </button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Horário (dias úteis)">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Ex: 09:00 - 18:00"
                value={form.hoursWeekdays}
                onChange={(e) => set("hoursWeekdays", e.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field label="Horário (sábado)">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Ex: 10:00 - 16:00"
                value={form.hoursSaturday}
                onChange={(e) => set("hoursSaturday", e.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field label="Horário (domingo/feriado)">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Ex: 12:00 - 18:00"
                value={form.hoursSundayHoliday}
                onChange={(e) => set("hoursSundayHoliday", e.target.value)}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Quantidade total de câmeras na loja (opcional)" error={touched ? errors.camerasCount : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Ex: 6"
                value={form.camerasCount}
                onChange={(e) => set("camerasCount", e.target.value)}
                disabled={isSubmitting}
                inputMode="numeric"
              />
            </Field>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleNext}
              disabled={!canNext || isSubmitting}
              className="relative w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-semibold text-black
                         shadow-[0_18px_40px_rgba(59,130,246,0.16)] hover:opacity-95 transition disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Próximo →"}
            </button>

            {!canNext && touched && (
              <p className="mt-3 text-xs text-red-600">
                Revise os campos obrigatórios.
              </p>
            )}
            {submitError && (
              <p className="mt-3 text-xs text-red-600">
                {submitError}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
