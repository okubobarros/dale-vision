import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import Dashboard from "./Dashboard"
import { renderWithProviders } from "../../test/test-utils"
import { clearAuthStorage } from "../../services/authStorage"

vi.mock("../../services/stores", () => ({
  storesService: {
    getStoresSummary: vi.fn().mockResolvedValue([
      {
        id: "store-1",
        name: "Loja 1",
        status: "active",
        plan: "trial",
        role: "admin",
      },
    ]),
    getStoresMinimal: vi.fn().mockResolvedValue([
      { id: "store-1", name: "Loja 1", created_at: null, is_active: true },
    ]),
    getStoreDashboard: vi.fn().mockResolvedValue({
      store: {
        id: "store-1",
        name: "Loja 1",
        owner_email: "owner@dale.com",
        plan: "trial",
        status: "active",
      },
      metrics: {
        health_score: 0,
        productivity: 0,
        idle_time: 0,
        visitor_flow: 0,
        conversion_rate: 0,
        avg_cart_value: 0,
      },
      insights: {
        peak_hour: "-",
        best_selling_zone: "-",
        employee_performance: {
          best: "-",
          needs_attention: "-",
        },
      },
      recommendations: [],
      alerts: [],
    }),
    getStoreEdgeStatus: vi.fn().mockResolvedValue({
      online: false,
      cameras_total: 0,
      cameras: [],
      store_status: "offline",
    }),
  },
}))

vi.mock("../../services/cameras", () => ({
  camerasService: {
    getStoreLimits: vi.fn().mockResolvedValue({
      plan: "trial",
      limits: { cameras: 3, stores: 1 },
      usage: { cameras: 0, stores: 1 },
    }),
  },
}))

vi.mock("../../queries/alerts.queries", () => ({
  useAlertsEvents: () => ({ data: [], isLoading: false, error: null }),
  useResolveEvent: () => ({ mutate: vi.fn() }),
  useIgnoreEvent: () => ({ mutate: vi.fn() }),
}))

vi.mock("../../services/onboarding", () => ({
  onboardingService: {
    getNextStep: vi.fn().mockResolvedValue({
      stage: "collecting_data",
      title: "Coletando dados",
      description: "Aguardando dados recentes.",
      cta_label: "Ver dashboard",
      cta_url: "/app/dashboard",
      blocking_items: [],
      health: {
        edge_status: "offline",
        cameras_total: 0,
        cameras_online: 0,
        cameras_offline: 0,
      },
    }),
  },
}))

describe("Dashboard empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
    localStorage.setItem("authToken", "token")
  })

  it("does not render Invalid Date when no data", async () => {
    renderWithProviders(<Dashboard />)
    await waitFor(() => {
      expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument()
    })
    const emptyStates = await screen.findAllByText(/Sem dados ainda/i)
    expect(emptyStates.length).toBeGreaterThan(0)
  })
})

describe("Dashboard trial upgrade CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
    localStorage.setItem("authToken", "token")
  })

  it("links Assinar agora to /app/upgrade", async () => {
    const { storesService } = await import("../../services/stores")
    ;(storesService.getStoresSummary as unknown as vi.Mock).mockResolvedValueOnce([
      {
        id: "store-1",
        name: "Loja 1",
        status: "blocked",
        blocked_reason: "trial_expired",
        plan: "trial",
        role: "admin",
      },
    ])
    renderWithProviders(<Dashboard />)
    const link = await screen.findByRole("link", { name: /Assinar agora/i })
    expect(link).toHaveAttribute("href", "/app/upgrade")
  })
})

describe("Dashboard auth gating", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem("userData")
    localStorage.removeItem("authToken")
    clearAuthStorage()
  })

  it("does not fetch stores without token", async () => {
    const { storesService } = await import("../../services/stores")
    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(storesService.getStoresSummary).not.toHaveBeenCalled()
    })
  })
})
