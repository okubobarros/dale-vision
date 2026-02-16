import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Cameras from "./Cameras"
import { renderWithProviders } from "../../test/test-utils"

vi.mock("../../services/stores", () => ({
  storesService: {
    getStores: vi.fn().mockResolvedValue([
      { id: "store-1", name: "Loja 1", status: "active", plan: "trial" },
    ]),
    getStoreEdgeStatus: vi.fn().mockResolvedValue({
      online: true,
      cameras_total: 0,
      cameras: [],
      store_status: "online",
    }),
  },
}))

vi.mock("../../services/cameras", () => ({
  camerasService: {
    getStoreCameras: vi.fn().mockResolvedValue([]),
    getStoreLimits: vi.fn().mockResolvedValue({
      plan: "trial",
      limits: { cameras: 3, stores: 1 },
      usage: { cameras: 0, stores: 1 },
    }),
    createStoreCamera: vi.fn().mockRejectedValue({ response: { status: 400 } }),
    updateCamera: vi.fn(),
    deleteCamera: vi.fn(),
    getCamera: vi.fn(),
    testConnection: vi.fn(),
  },
}))

describe("Cameras 400 error guidance", () => {
  beforeEach(() => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
    localStorage.setItem("authToken", "token")
  })

  it("shows friendly message and instructions CTA on 400", async () => {
    renderWithProviders(<Cameras />)
    const user = userEvent.setup()

    const addButton = await screen.findByRole("button", {
      name: /Adicionar primeira câmera/i,
    })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText(/Ex: Entrada/i)
    await user.type(nameInput, "Entrada")

    const saveButton = screen.getByRole("button", { name: /Salvar/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText(/Você está fora da rede da loja/i)
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole("button", { name: /Abrir instruções de conexão/i })
    ).toBeInTheDocument()
  })
})
