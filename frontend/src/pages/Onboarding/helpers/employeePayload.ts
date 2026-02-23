import type { EmployeeRole, EmployeeCreatePayload } from "../../../services/employees"
import type { EmployeeDraft } from "../components/EmployeesSetup"

const ROLE_MAP: Record<string, EmployeeRole> = {
  Proprietário: "owner",
  Gerente: "manager",
  Caixa: "cashier",
  Vendedor: "seller",
  Segurança: "security",
  Estoque: "stock",
  Outro: "other",
}

export const buildEmployeesPayload = (
  list: EmployeeDraft[],
  storeId: string
): EmployeeCreatePayload[] => {
  const raw = list
    .map((entry) => {
      const normalizedRole = ROLE_MAP[entry.role] ?? "other"
      const roleOtherValue =
        entry.role === "Outro" ? entry.roleOther.trim() || null : null
      return {
        store_id: storeId,
        full_name: entry.name.trim(),
        email: entry.email?.trim() || null,
        role: normalizedRole,
        role_other: roleOtherValue,
      }
    })
    .filter((entry) => entry.full_name)

  const uniqueByEmail = new Map<string, EmployeeCreatePayload>()
  return raw.filter((entry) => {
    if (!entry.email) return true
    const key = entry.email.toLowerCase()
    if (uniqueByEmail.has(key)) return false
    uniqueByEmail.set(key, entry)
    return true
  })
}
