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

    // ✅ Email opcional: só valida se usuário preencheu algo
    if (email.trim() && !isValidEmail(email)) e.email = "Informe um e-mail válido."

    return e
  }, [name, role, roleOther, email])

  // ✅ Pode adicionar mesmo sem email
  const canAdd = Object.keys(errors).length === 0

  function addEmployee() {
    setTouched(true)
    if (!canAdd) return

    const next: EmployeeDraft = {
      id: String(Date.now()),
      name: name.trim(),
      role,
      roleOther: roleOther.trim(),
      email: email.trim(), // pode ser ""
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
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Equipe (opcional)</h3>
        <p className="text-slate-500 mt-1">
          Adicionar funcionários ajuda nos relatórios — mas você pode fazer isso depois.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h4 className="font-semibold text-slate-900">Adicionar Funcionário</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome Completo *</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                         focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {touched && errors.name && <p className="mt-2 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Cargo *</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900
                         focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
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
            {touched && errors.role && <p className="mt-2 text-xs text-red-600">{errors.role}</p>}
          </div>

          {role === "Outro" && (
            <div>
              <label className="text-sm font-medium text-slate-700">Qual cargo? *</label>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                           focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
                placeholder="Descreva o cargo"
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
              />
              {touched && errors.roleOther && <p className="mt-2 text-xs text-red-600">{errors.roleOther}</p>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">E-mail (opcional)</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-400
                         focus:ring-4 focus:ring-cyan-100 focus:border-cyan-300 transition"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {touched && errors.email && <p className="mt-2 text-xs text-red-600">{errors.email}</p>}
          </div>
        </div>

        <button
          onClick={addEmployee}
          disabled={!canAdd}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 font-semibold text-slate-900 hover:shadow-md transition disabled:opacity-60"
        >
          + Adicionar Funcionário
        </button>
      </div>

      {/* Lista */}
      {employees.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white/70 overflow-hidden shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold text-slate-900">Equipe registrada</div>
            <div className="text-sm text-slate-500">{employees.length}</div>
          </div>

          <div className="divide-y divide-slate-200">
            {employees.map((e) => (
              <div key={e.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900">{e.name}</div>
                  <div className="text-sm text-slate-500">
                    {(e.role === "Outro" ? e.roleOther : e.role) || e.role}
                    {e.email ? ` • ${e.email}` : ""}
                  </div>
                </div>

                <button
                  onClick={() => removeEmployee(e.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 transition"
                  aria-label="Remover funcionário"
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
          className="w-full sm:w-1/2 rounded-2xl border border-slate-200 bg-white py-3 font-semibold text-slate-900 hover:shadow-md transition"
        >
          ← Voltar
        </button>

        <button
          onClick={onNext}
          className="w-full sm:w-1/2 rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 py-3.5 font-semibold text-black
                     shadow-[0_18px_40px_rgba(59,130,246,0.16)] hover:opacity-95 transition"
        >
          Continuar para ativação →
        </button>
      </div>
    </div>
  )
}
