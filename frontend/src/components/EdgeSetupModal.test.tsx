import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EdgeSetupModal from "./EdgeSetupModal"
import { renderWithProviders } from "../test/test-utils"

vi.mock("../services/stores", () => ({
  storesService: {
    getStoresMinimal: vi.fn().mockResolvedValue([
      { id: "store-1", name: "Loja 1", created_at: "2024-01-01T00:00:00Z", is_active: true },
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
    expect(screen.getAllByText(/yolov8n\.pt/i).length).toBeGreaterThan(0)
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

  it("renders env content with stabilization profile by default", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )

    const textarea = (await screen.findByDisplayValue(/EDGE_TOKEN=token/)) as HTMLTextAreaElement
    const lines = textarea.value.split("\n")

    const expectedPrefix = [
      "CLOUD_BASE_URL=https://api.example.com",
      "STORE_ID=store-1",
      "EDGE_TOKEN=token",
      "AGENT_ID=edge-001",
      "HEARTBEAT_INTERVAL_SECONDS=30",
      "CAMERA_HEARTBEAT_INTERVAL_SECONDS=30",
      "DALE_LOG_DIR=C:\\ProgramData\\DaleVision\\logs",
      "CAMERA_SYNC_ENABLED=0",
      "CAMERA_SYNC_FATAL=0",
      "DASHBOARD_URL=https://app.dalevision.com/app/cameras?store_id=store-1&onboarding=true",
      "AUTO_UPDATE_ENABLED=0",
      "UPDATE_CHANNEL=stable",
      "UPDATE_GITHUB_REPO=daleship/dalevision-edge-agent",
      "UPDATE_INTERVAL_SECONDS=21600",
      "EDGE_HTTP_TIMEOUT_SECONDS=30",
      "EDGE_ROI_TIMEOUT_SECONDS=20",
      "VISION_ENABLED=0",
      "VISION_POLL_SECONDS=10",
      "VISION_SNAPSHOT_TIMEOUT_SECONDS=10",
      "VISION_MODEL_PATH=yolov8n.pt",
      "VISION_LOCAL_CAMERAS_ONLY=1",
      "VISION_REMOTE_CAMERA_SYNC_ENABLED=0",
      "CAMERAS_JSON=[]",
      "STARTUP_TASK_ENABLED=0",
    ]

    expect(lines.slice(0, expectedPrefix.length)).toEqual(expectedPrefix)
    expect(lines).toContain("# Avançado (opcional)")
    expect(lines).toContain("# VISION_MODEL_PATH=yolov8n.pt")
  })

  it("renders env content for backend managed profile", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const user = userEvent.setup()
    const profileSelect = await screen.findByLabelText(/Perfil de configuração do agente/i)
    await user.selectOptions(profileSelect, "backend_managed")

    const textarea = (await screen.findByDisplayValue(/EDGE_TOKEN=token/)) as HTMLTextAreaElement
    const lines = textarea.value.split("\n")

    expect(lines).toContain("CAMERA_SYNC_ENABLED=1")
    expect(lines).toContain("VISION_ENABLED=1")
    expect(lines).toContain("VISION_LOCAL_CAMERAS_ONLY=0")
    expect(lines).toContain("VISION_REMOTE_CAMERA_SYNC_ENABLED=1")
    expect(lines).toContain("CAMERAS_JSON=[]")
    expect(lines).toContain("STARTUP_TASK_ENABLED=0")
  })

  it("shows download confirmed inside step 2 when clicking CTA", async () => {
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: /Já baixei e extraí/i }))
    expect(screen.getByText(/Download confirmado/i)).toBeInTheDocument()
  })

  it("falls back to latest download URL when env is missing", async () => {
    vi.stubEnv("VITE_EDGE_AGENT_DOWNLOAD_URL", "")
    renderWithProviders(
      <EdgeSetupModal open={true} onClose={() => {}} defaultStoreId="store-1" />
    )
    const confirmButton = await screen.findByRole("button", { name: /Já baixei e extraí/i })
    expect(confirmButton).not.toBeDisabled()
    expect(screen.queryByText(/docs do Edge Agent/i)).not.toBeInTheDocument()
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

  it("shows rotate token CTA even when edge_token exists", async () => {
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
    expect(
      (await screen.findAllByText(/Token do Edge rotacionado: atualize o \.env/i)).length
    ).toBeGreaterThan(0)
    const copyButton = await screen.findByRole("button", {
      name: /Copiar dados para \.env/i,
    })
    expect(copyButton).not.toBeDisabled()
  })
})
