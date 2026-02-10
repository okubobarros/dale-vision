import api from "./api"

export const demoService = {
  async createLead(payload: any) {
    // backend Django: /api/v1/demo-leads/
    const res = await api.post("/v1/demo-leads/", payload)
    return res.data
  },
}
