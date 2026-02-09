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

const SEGMENTS = [
  "Supermercado",
  "Farmácia",
  "Moda / Varejo",
  "Restaurante / Café",
  "Serviços",
  "Outro",
]

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
    if (form.segment === "Outro" && !form.segmentOther.trim()) {
      e.segmentOther = "Informe o segmento."
    }
    if (!form.businessModel) e.businessModel = "Selecione o modelo de negócio."
    if (form.businessModel === "Outro" && !form.businessModelOther.trim()) {
      e.businessModelOther = "Informe o modelo."
    }
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
        <h3 className="text-xl sm:text-2xl font-extrabold">Cadastre sua loja (rápido)</h3>
        <p className="text-white/60 mt-1">Só o essencial para liberar o trial em minutos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da Loja *" error={touched ? errors.name : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30"
                placeholder="Ex: Loja Centro"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>

            <Field label="Segmento *" error={touched ? errors.segment : ""}>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
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
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  placeholder="Descreva o segmento"
                  value={form.segmentOther}
                  onChange={(e) => set("segmentOther", e.target.value)}
                />
              </Field>
            )}

            <Field label="Modelo de Negócio *" error={touched ? errors.businessModel : ""}>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
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
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  placeholder="Descreva o modelo"
                  value={form.businessModelOther}
                  onChange={(e) => set("businessModelOther", e.target.value)}
                />
              </Field>
            )}

            <Field label="Cidade *" error={touched ? errors.city : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="São Paulo"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>

            <Field label="Estado (UF) *" error={touched ? errors.state : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none uppercase"
                placeholder="SP"
                maxLength={2}
                value={form.state}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
              />
            </Field>

            <Field label="Horário (dias úteis) *" error={touched ? errors.hoursWeekdays : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="08:00–18:00"
                value={form.hoursWeekdays}
                onChange={(e) => set("hoursWeekdays", e.target.value)}
              />
            </Field>

            <Field label="Horário (sábado) *" error={touched ? errors.hoursSaturday : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="09:00–13:00"
                value={form.hoursSaturday}
                onChange={(e) => set("hoursSaturday", e.target.value)}
              />
            </Field>

            <Field label="Horário (domingo/feriado) *" error={touched ? errors.hoursSundayHoliday : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                value={form.camerasCount}
                onChange={(e) => set("camerasCount", clamp(Number(e.target.value || 1), 1, 3))}
              />
              <p className="mt-2 text-xs text-white/50">No trial, até 3 câmeras.</p>
            </Field>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleNext}
              className="w-full rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              disabled={!canNext}
            >
              Próximo →
            </button>
            {!canNext && touched && (
              <p className="mt-3 text-xs text-red-300">
                Revise os campos obrigatórios (trial: até 3 câmeras).
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="text-sm text-white/60">Resumo da Configuração</div>

          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="text-sm text-white/70">Loja</div>
            <div className="text-2xl font-extrabold text-blue-300">1</div>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
            <div className="text-sm text-white/70">Próximo</div>
            <div className="text-lg font-bold text-purple-300">Equipe (opcional)</div>
            <div className="text-xs text-white/50 mt-1">Você pode pular.</div>
          </div>

          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="text-sm text-white/70">Depois</div>
            <div className="text-lg font-bold text-green-300">Conectar Edge</div>
            <div className="text-xs text-white/50 mt-1">Gerar .env e iniciar o agent.</div>
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
      <label className="text-sm text-white/80">{label}</label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
