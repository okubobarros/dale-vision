import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    vi.clearAllMocks()
    vi.stubEnv("VITE_EDGE_AGENT_DOWNLOAD_URL", "https://example.com/edge.zip")
    vi.stubEnv("VITE_SITE_URL", "https://example.com")
  })

  it("renders the updated package filenames", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )

    expect(
      await screen.findByRole("button", { name: /Baixar Edge Agent/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/dalevision-edge-agent\.exe/i)).toBeInTheDocument()
    expect(screen.getAllByText(/02_TESTE_RAPIDO\.bat/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/03_INSTALAR_AUTOSTART\.bat/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/04_VERIFICAR_STATUS\.bat/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Diagnose\.bat/i).length).toBeGreaterThan(0)
    expect(
      screen.getByRole("button", { name: /Já baixei e extraí/i })
    ).toBeInTheDocument()
  })

  it("includes updated step 3 instructions for bundle scripts", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )

    expect(
      (await screen.findAllByText(/02_TESTE_RAPIDO\.bat/i)).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/03_INSTALAR_AUTOSTART\.bat/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/04_VERIFICAR_STATUS\.bat/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Diagnose\.bat/i).length).toBeGreaterThan(0)
  })

  it("keeps step 3 disabled until download confirmed", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const copyButton = await screen.findByRole("button", {
      name: /Copiar dados para \.env/i,
    })
    expect(copyButton).toBeDisabled()
  })

  it("shows download confirmed inside step 2 when clicking CTA", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: /Já baixei e extraí/i }))
    expect(screen.getByText(/Download confirmado/i)).toBeInTheDocument()
  })

  it("disables download confirmation when download URL is missing", async () => {
    vi.stubEnv("VITE_EDGE_AGENT_DOWNLOAD_URL", "")
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const confirmButton = await screen.findByRole("button", { name: /Já baixei e extraí/i })
    expect(confirmButton).toBeDisabled()
    expect(screen.getByText(/docs do Edge Agent/i)).toBeInTheDocument()
  })

  it("shows rotate token CTA when edge_token is missing", async () => {
    const { storesService } = await import("../services/stores")
    vi.mocked(storesService.getEdgeSetup).mockResolvedValueOnce({
      edge_token: "",
      agent_id_suggested: "edge-001",
      cloud_base_url: "https://api.example.com",
    })
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    expect(await screen.findByRole("button", { name: /Gerar novo token/i })).toBeInTheDocument()
  })

  it("enables copy env after rotating token", async () => {
    const { storesService } = await import("../services/stores")
    vi.mocked(storesService.getEdgeSetup).mockResolvedValueOnce({
      edge_token: "",
      agent_id_suggested: "edge-001",
      cloud_base_url: "https://api.example.com",
    })
    vi.mocked(storesService.rotateEdgeToken).mockResolvedValueOnce({
      supported: true,
      edge_token: "new-token",
    })

    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: /Já baixei e extraí/i }))
    const rotateButton = await screen.findByRole("button", { name: /Gerar novo token/i })
    await user.click(rotateButton)
    const copyButton = await screen.findByRole("button", {
      name: /Copiar dados para \.env/i,
    })
    expect(copyButton).not.toBeDisabled()
  })
})
