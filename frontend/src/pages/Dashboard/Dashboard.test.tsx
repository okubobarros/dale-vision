import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import Dashboard from "./Dashboard"
import { renderWithProviders } from "../../test/test-utils"

vi.mock("../../services/stores", () => ({
  storesService: {
    getStores: vi.fn().mockResolvedValue([
      {
        id: "store-1",
        name: "Loja 1",
        status: "active",
        plan: "trial",
        owner_email: "owner@dale.com",
      },
    ]),
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
    getProgress: vi.fn().mockResolvedValue({
      steps: {},
      next_step: null,
    }),
  },
}))

describe("Dashboard empty state", () => {
  beforeEach(() => {
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
    expect(screen.getAllByText(/Sem dados ainda/i).length).toBeGreaterThan(0)
  })
})

describe("Dashboard trial upgrade CTA", () => {
  beforeEach(() => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
    localStorage.setItem("authToken", "token")
  })

  it("links Assinar agora to /app/upgrade", async () => {
    const { storesService } = await import("../../services/stores")
    ;(storesService.getStores as unknown as vi.Mock).mockResolvedValueOnce([
      {
        id: "store-1",
        name: "Loja 1",
        status: "blocked",
        blocked_reason: "trial_expired",
        plan: "trial",
      },
    ])
    renderWithProviders(<Dashboard />)
    const link = await screen.findByRole("link", { name: /Assinar agora/i })
    expect(link).toHaveAttribute("href", "/app/upgrade")
  })
})
