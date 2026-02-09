// frontend/src/pages/Onboarding/components/StoresSetup.tsx
import { useMemo, useState } from "react"

export type StoreDraft = {
  name: string
  businessType: string
  businessTypeOther: string
  street: string
  number: string
  complement: string
  city: string
  state: string
  zip: string
  hoursWeekdays: string
  hoursSaturday: string
  hoursSundayHoliday: string
  employeesCount: number
  camerasCount: number
  pos: string
  posOther: string
}

const BUSINESS_TYPES = [
  "Supermercado",
  "Farmácia",
  "Loja de Roupas",
  "Lavanderia",
  "Cafeteria",
  "Outro",
]

const POS_OPTIONS = ["Nenhuma", "TEF", "Vindi", "ERP/POS próprio", "Outro"]

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
    businessType: "",
    businessTypeOther: "",
    street: "",
    number: "",
    complement: "",
    city: "",
    state: "",
    zip: "",
    hoursWeekdays: "",
    hoursSaturday: "",
    hoursSundayHoliday: "",
    employeesCount: 1,
    camerasCount: 1,
    pos: "",
    posOther: "",
  }

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Informe o nome da loja."
    if (!form.businessType) e.businessType = "Selecione o tipo de negócio."
    if (form.businessType === "Outro" && !form.businessTypeOther.trim()) {
      e.businessTypeOther = "Informe o tipo de negócio."
    }
    if (!form.street.trim()) e.street = "Informe a rua."
    if (!form.number.trim()) e.number = "Informe o número."
    if (!form.city.trim()) e.city = "Informe a cidade."
    if (!form.state.trim() || form.state.trim().length !== 2) e.state = "UF com 2 letras."
    if (!form.zip.trim()) e.zip = "Informe o CEP."
    if (!form.hoursWeekdays.trim()) e.hoursWeekdays = "Informe o horário de dias úteis."
    if (!form.hoursSaturday.trim()) e.hoursSaturday = "Informe o horário de sábado."
    if (!form.hoursSundayHoliday.trim()) e.hoursSundayHoliday = "Informe o horário de domingo/feriado."
    if (!form.employeesCount || form.employeesCount < 1) e.employeesCount = "Informe funcionários."
    if (!form.camerasCount || form.camerasCount < 1) e.camerasCount = "Informe câmeras."
    if (form.camerasCount > 3) e.camerasCount = "Trial permite até 3 câmeras."
    if (form.pos === "Outro" && !form.posOther.trim()) e.posOther = "Informe o sistema."
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
        <h3 className="text-xl sm:text-2xl font-extrabold">Cadastre sua primeira loja</h3>
        <p className="text-white/60 mt-1">Informações básicas para começarmos o piloto.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da Loja *" error={touched ? errors.name : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30"
                placeholder="Ex: Gelateria Centro"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>

            <Field label="Tipo de Negócio *" error={touched ? errors.businessType : ""}>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                value={form.businessType}
                onChange={(e) => set("businessType", e.target.value)}
              >
                <option value="">Selecione...</option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            {form.businessType === "Outro" && (
              <Field label="Qual tipo de negócio? *" error={touched ? errors.businessTypeOther : ""}>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  placeholder="Descreva o tipo"
                  value={form.businessTypeOther}
                  onChange={(e) => set("businessTypeOther", e.target.value)}
                />
              </Field>
            )}

            <Field label="Rua *" error={touched ? errors.street : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="Nome da rua"
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
              />
            </Field>

            <Field label="Nº *" error={touched ? errors.number : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="123"
                value={form.number}
                onChange={(e) => set("number", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Complemento">
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  placeholder="Apt, sala, etc."
                  value={form.complement}
                  onChange={(e) => set("complement", e.target.value)}
                />
              </Field>
            </div>

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

            <Field label="CEP *" error={touched ? errors.zip : ""}>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="01000-000"
                value={form.zip}
                onChange={(e) => set("zip", e.target.value)}
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

            <Field label="Nº de Funcionários * (recomendado até 5)" error={touched ? errors.employeesCount : ""}>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                value={form.employeesCount}
                onChange={(e) => set("employeesCount", clamp(Number(e.target.value || 1), 1, 999))}
              />
              <p className="mt-2 text-xs text-white/50">Recomendamos começar com o essencial.</p>
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
              <p className="mt-2 text-xs text-white/50">Você pode adicionar mais depois do piloto.</p>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Integração com POS (opcional)">
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  value={form.pos}
                  onChange={(e) => set("pos", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {POS_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              {form.pos === "Outro" && (
                <Field label="Qual sistema? *" error={touched ? errors.posOther : ""}>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                    placeholder="Informe o sistema"
                    value={form.posOther}
                    onChange={(e) => set("posOther", e.target.value)}
                  />
                </Field>
              )}
            </div>
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
            <div className="text-lg font-bold text-purple-300">Equipe</div>
            <div className="text-xs text-white/50 mt-1">Cadastre o essencial</div>
          </div>

          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="text-sm text-white/70">Depois</div>
            <div className="text-lg font-bold text-green-300">Câmeras</div>
            <div className="text-xs text-white/50 mt-1">Conecte até 3 câmeras</div>
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
