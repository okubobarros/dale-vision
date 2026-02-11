import api from "./api"

export type EmployeeRole = "manager" | "cashier" | "seller" | "security" | "stock" | "other"

export type EmployeeCreatePayload = {
  store_id: string
  full_name: string
  email?: string
  role: EmployeeRole
  role_other?: string
  external_id?: string
  active?: boolean
}

export const employeesService = {
  async createEmployees(payload: EmployeeCreatePayload[]): Promise<EmployeeCreatePayload[]> {
    const response = await api.post("/v1/employees/", payload)
    return response.data
  },
}
