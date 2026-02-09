// frontend/src/pages/Onboarding/components/EmployeesSetup.tsx
import { useMemo, useState } from "react"

export type EmployeeDraft = {
  id: string
  name: string
  role: string
  roleOther: string
  email: string
}

const ROLES = ["Gerente", "Caixa", "Vendedor", "Segurança", "Estoque", "Outro"]

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function EmployeesSetup({
  employees,
  onChange,
  onPrev,
  onNext,
}: {
  employees: EmployeeDraft[]
  onChange: (v: EmployeeDraft[]) => void
  onPrev: () => void
  onNext: () => void
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [roleOther, setRoleOther] = useState("")
  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Informe o nome."
    if (!role) e.role = "Selecione o cargo."
    if (role === "Outro" && !roleOther.trim()) e.roleOther = "Informe o cargo."
    if (!email.trim() || !isValidEmail(email)) e.email = "Informe um e-mail válido."
    return e
  }, [name, role, roleOther, email])

  const canAdd = Object.keys(errors).length === 0

  function addEmployee() {
    setTouched(true)
    if (!canAdd) return
    const next: EmployeeDraft = {
      id: String(Date.now()),
      name: name.trim(),
      role,
      roleOther: roleOther.trim(),
      email: email.trim(),
    }
    onChange([...employees, next])
    setName("")
    setRole("")
    setRoleOther("")
    setEmail("")
    setTouched(false)
  }

  function removeEmployee(id: string) {
    onChange(employees.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold">Equipe (opcional)</h3>
        <p className="text-white/60 mt-1">
          Você pode pular esta etapa e completar depois.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h4 className="font-semibold">Adicionar Funcionário</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-white/80">Nome Completo *</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {touched && errors.name && <p className="mt-2 text-xs text-red-300">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm text-white/80">Cargo *</label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Selecione...</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {touched && errors.role && <p className="mt-2 text-xs text-red-300">{errors.role}</p>}
          </div>

          {role === "Outro" && (
            <div>
              <label className="text-sm text-white/80">Qual cargo? *</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                placeholder="Descreva o cargo"
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
              />
              {touched && errors.roleOther && <p className="mt-2 text-xs text-red-300">{errors.roleOther}</p>}
            </div>
          )}

          <div>
            <label className="text-sm text-white/80">E-mail *</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {touched && errors.email && <p className="mt-2 text-xs text-red-300">{errors.email}</p>}
          </div>
        </div>

        <button
          onClick={addEmployee}
          disabled={!canAdd}
          className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 py-3 font-semibold text-blue-200 hover:bg-blue-500/15 disabled:opacity-60"
        >
          + Adicionar Funcionário
        </button>
      </div>

      {/* Lista */}
      {employees.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="font-semibold">Equipe registrada</div>
            <div className="text-sm text-white/60">{employees.length}</div>
          </div>

          <div className="divide-y divide-white/10">
            {employees.map((e) => (
              <div key={e.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-sm text-white/60">
                    {(e.role === "Outro" ? e.roleOther : e.role) || e.role} • {e.email}
                  </div>
                </div>

                <button
                  onClick={() => removeEmployee(e.id)}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onPrev}
          className="w-full sm:w-1/2 rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          className="w-full sm:w-1/2 rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-500"
        >
          Finalizar →
        </button>
      </div>
    </div>
  )
}
