import { describe, it, expect } from "vitest"
import { buildEmployeesPayload } from "./employeePayload"

describe("buildEmployeesPayload", () => {
  it("normalizes role, trims fields, and deduplicates emails", () => {
    const payload = buildEmployeesPayload(
      [
        {
          id: "1",
          name: "  Ana Silva ",
          role: "Gerente",
          roleOther: "",
          email: "ana@exemplo.com",
        },
        {
          id: "2",
          name: "João",
          role: "Outro",
          roleOther: "Supervisor",
          email: "ANA@exemplo.com",
        },
        {
          id: "3",
          name: "Sem Email",
          role: "Caixa",
          roleOther: "",
          email: "",
        },
      ],
      "store-1"
    )

    expect(payload).toEqual([
      {
        store_id: "store-1",
        full_name: "Ana Silva",
        email: "ana@exemplo.com",
        role: "manager",
        role_other: null,
      },
      {
        store_id: "store-1",
        full_name: "Sem Email",
        email: null,
        role: "cashier",
        role_other: null,
      },
    ])
  })
})
