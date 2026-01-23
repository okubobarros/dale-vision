import api from "./api"

export const demoService = {
  async createLead(payload: any) {
    // backend Django: /api/alerts/demo-leads/
    const res = await api.post("/alerts/demo-leads/", payload)
    return res.data
  },
}
