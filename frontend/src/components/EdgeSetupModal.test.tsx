import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import EdgeSetupModal from "./EdgeSetupModal"
import { renderWithProviders } from "../test/test-utils"

vi.mock("../services/stores", () => ({
  storesService: {
    getStores: vi.fn().mockResolvedValue([
      { id: "store-1", name: "Loja 1", status: "active", plan: "trial" },
    ]),
    getEdgeSetup: vi.fn().mockResolvedValue({
      edge_token: "token",
      agent_id_suggested: "edge-001",
      cloud_base_url: "https://api.example.com",
    }),
    rotateEdgeToken: vi.fn().mockResolvedValue({
      supported: true,
      edge_token: "token",
    }),
  },
}))

describe("EdgeSetupModal step 2", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_EDGE_AGENT_DOWNLOAD_URL", "https://example.com/edge.zip")
    vi.stubEnv("VITE_SITE_URL", "https://example.com")
  })

  it("renders the updated package filenames", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )

    expect(
      await screen.findByRole("link", { name: /Baixar Edge Agent/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Já baixei e extraí/i })
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/Start_DaleVision_Agent\.bat/i).length
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(/Diagnose\.bat/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/install-service\.ps1/i)
    ).toBeInTheDocument()
  })
})
