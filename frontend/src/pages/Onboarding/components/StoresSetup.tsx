import { useMemo, useState } from "react"

export type StoreDraft = {
  name: string
  city: string
  state: string
  segment: string
  segmentOther: string
  businessModel: string
  businessModelOther: string
  hoursWeekdays: string
  hoursSaturday: string
  hoursSundayHoliday: string
  camerasCount: number
}

const SEGMENTS = ["Supermercado", "Farmácia", "Moda / Varejo", "Restaurante / Café", "Serviços", "Outro"]
const BUSINESS_MODELS = ["Próprio", "Franquia", "Rede", "Quiosque", "Outro"]

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function StoresSetup({
  value,
  onChange,
  onNext,
}: {
  value: StoreDraft | null
  onChange: (v: StoreDraft) => void
  onNext: () => void
}) {
  const [touched, setTouched] = useState(false)

  const form = value ?? {
    name: "",
    city: "",
    state: "",
    segment: "",
    segmentOther: "",
    businessModel: "",
    businessModelOther: "",
    hoursWeekdays: "",
    hoursSaturday: "",
    hoursSundayHoliday: "",
    camerasCount: 1,
  }

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Informe o nome da loja."
    if (!form.city.trim()) e.city = "Informe a cidade."
    if (!form.state.trim() || form.state.trim().length !== 2) e.state = "UF com 2 letras."
    if (!form.segment) e.segment = "Selecione o segmento."
    if (form.segment === "Outro" && !form.segmentOther.trim()) e.segmentOther = "Informe o segmento."
    if (!form.businessModel) e.businessModel = "Selecione o modelo de negócio."
    if (form.businessModel === "Outro" && !form.businessModelOther.trim()) e.businessModelOther = "Informe o modelo."
    if (!form.hoursWeekdays.trim()) e.hoursWeekdays = "Informe o horário de dias úteis."
    if (!form.hoursSaturday.trim()) e.hoursSaturday = "Informe o horário de sábado."
    if (!form.hoursSundayHoliday.trim()) e.hoursSundayHoliday = "Informe o horário de domingo/feriado."
    if (!form.camerasCount || form.camerasCount < 1) e.camerasCount = "Informe câmeras."
    if (form.camerasCount > 3) e.camerasCount = "Trial permite até 3 câmeras."
    return e
  }, [form])

  const canNext = Object.keys(errors).length === 0

  function set<K extends keyof StoreDraft>(key: K, val: StoreDraft[K]) {
    const next = { ...form, [key]: val }
    onChange(next)
  }

  function handleNext() {
    setTouched(true)
    if (!canNext) return
    onNext()
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Cadastre sua loja (rápido)</h3>
        <p className="text-slate-500 mt-1">Só o essencial para liberar o trial em minutos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da Loja *" error={touched ? errors.name : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Ex: Loja Centro"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>

            <Field label="Segmento *" error={touched ? errors.segment : ""}>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                value={form.segment}
                onChange={(e) => set("segment", e.target.value)}
              >
                <option value="">Selecione...</option>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            {form.segment === "Outro" && (
              <Field label="Qual segmento? *" error={touched ? errors.segmentOther : ""}>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                             focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                  placeholder="Descreva o segmento"
                  value={form.segmentOther}
                  onChange={(e) => set("segmentOther", e.target.value)}
                />
              </Field>
            )}

            <Field label="Modelo de Negócio *" error={touched ? errors.businessModel : ""}>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                value={form.businessModel}
                onChange={(e) => set("businessModel", e.target.value)}
              >
                <option value="">Selecione...</option>
                {BUSINESS_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            {form.businessModel === "Outro" && (
              <Field label="Qual modelo? *" error={touched ? errors.businessModelOther : ""}>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                             focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                  placeholder="Descreva o modelo"
                  value={form.businessModelOther}
                  onChange={(e) => set("businessModelOther", e.target.value)}
                />
              </Field>
            )}

            <Field label="Cidade *" error={touched ? errors.city : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="São Paulo"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>

            <Field label="Estado (UF) *" error={touched ? errors.state : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400 uppercase
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="SP"
                maxLength={2}
                value={form.state}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
              />
            </Field>

            <Field label="Horário (dias úteis) *" error={touched ? errors.hoursWeekdays : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="08:00–18:00"
                value={form.hoursWeekdays}
                onChange={(e) => set("hoursWeekdays", e.target.value)}
              />
            </Field>

            <Field label="Horário (sábado) *" error={touched ? errors.hoursSaturday : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="09:00–13:00"
                value={form.hoursSaturday}
                onChange={(e) => set("hoursSaturday", e.target.value)}
              />
            </Field>

            <Field label="Horário (domingo/feriado) *" error={touched ? errors.hoursSundayHoliday : ""}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Fechado"
                value={form.hoursSundayHoliday}
                onChange={(e) => set("hoursSundayHoliday", e.target.value)}
              />
            </Field>

            <Field label="Nº de Câmeras * (1–3)" error={touched ? errors.camerasCount : ""}>
              <input
                type="number"
                min={1}
                max={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                value={form.camerasCount}
                onChange={(e) => set("camerasCount", clamp(Number(e.target.value || 1), 1, 3))}
              />
              <p className="mt-2 text-xs text-slate-500">No trial, até 3 câmeras.</p>
            </Field>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="relative w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-semibold text-black
                         shadow-[0_18px_40px_rgba(59,130,246,0.16)] hover:opacity-95 transition disabled:opacity-60"
            >
              Próximo →
            </button>

            {!canNext && touched && (
              <p className="mt-3 text-xs text-red-600">
                Revise os campos obrigatórios (trial: até 3 câmeras).
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="text-sm text-slate-500">Resumo da Configuração</div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Etapa 2</div>
            <div className="text-lg font-bold text-slate-900">Configuração da Loja</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Etapa 3</div>
            <div className="text-lg font-bold text-slate-900">Cadastro da Equipe da Loja</div>
            <div className="text-xs text-slate-500 mt-1">Opcional</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Etapa 4</div>
            <div className="text-lg font-bold text-slate-900">Conexão das Câmeras</div>
            <div className="text-xs text-slate-500 mt-1">Vamos conectar o Dale Vision as suas câmeras com segurança (5–10 minutos).</div>
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
