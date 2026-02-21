import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Cameras from "./Cameras"
import { renderWithProviders } from "../../test/test-utils"

vi.mock("../../services/stores", () => ({
  storesService: {
    getStores: vi.fn().mockResolvedValue([
      {
        id: "store-1",
        name: "Loja 1",
        status: "active",
        plan: "trial",
        role: "admin",
      },
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
    createStoreCamera: vi.fn(),
    updateCamera: vi.fn(),
    deleteCamera: vi.fn(),
    getCamera: vi.fn(),
    testConnection: vi.fn(),
  },
}))

describe("Cameras create camera", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
    localStorage.setItem("authToken", "token")
  })

  it("submits successfully and closes modal", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.createStoreCamera).mockResolvedValueOnce({
      id: "cam-1",
      store: "store-1",
      name: "Entrada",
    })
    renderWithProviders(<Cameras />)
    const user = userEvent.setup()

    const addButton = await screen.findByRole("button", {
      name: /Adicionar primeira câmera/i,
    })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText(/Ex: Entrada/i)
    fireEvent.change(nameInput, { target: { value: "Entrada" } })

    const saveButton = screen.getByRole("button", { name: /Salvar/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(camerasService.createStoreCamera).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.queryByText(/Nova câmera/i)).not.toBeInTheDocument()
    })

    expect(vi.mocked(camerasService.getStoreCameras).mock.calls.length).toBeGreaterThan(1)
  })

  it("shows backend field errors when API returns 400", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.createStoreCamera).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          code: "CAMERA_VALIDATION_ERROR",
          message: "Dados inválidos para câmera.",
          details: { name: ["Campo obrigatório."] },
        },
      },
    })
    renderWithProviders(<Cameras />)
    const user = userEvent.setup()

    const addButton = await screen.findByRole("button", {
      name: /Adicionar primeira câmera/i,
    })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText(/Ex: Entrada/i)
    fireEvent.change(nameInput, { target: { value: "Entrada" } })

    const saveButton = screen.getByRole("button", { name: /Salvar/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/Dados inválidos para câmera\./i)).toBeInTheDocument()
      expect(screen.getByText(/Nome: Campo obrigatório\./i)).toBeInTheDocument()
    })

    expect(
      screen.getByRole("button", { name: /Rodar Diagnose/i })
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ex: Entrada/i)).toHaveClass("border-red-300")
  })

  it("shows permission message when API returns 403", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.createStoreCamera).mockRejectedValueOnce({
      response: {
        status: 403,
        data: { code: "PERMISSION_DENIED", message: "Forbidden" },
      },
    })
    renderWithProviders(<Cameras />)
    const user = userEvent.setup()

    const addButton = await screen.findByRole("button", {
      name: /Adicionar primeira câmera/i,
    })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText(/Ex: Entrada/i)
    fireEvent.change(nameInput, { target: { value: "Entrada" } })

    const saveButton = screen.getByRole("button", { name: /Salvar/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/Forbidden/i)).toBeInTheDocument()
    })
  })

  it("shows upgrade CTA when API returns 402", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.createStoreCamera).mockRejectedValueOnce({
      response: {
        status: 402,
        data: { code: "PAYWALL_TRIAL_LIMIT", message: "Trial expirado." },
      },
    })
    renderWithProviders(<Cameras />)
    const user = userEvent.setup()

    const addButton = await screen.findByRole("button", {
      name: /Adicionar primeira câmera/i,
    })
    await user.click(addButton)

    fireEvent.change(await screen.findByPlaceholderText(/Ex: Entrada/i), {
      target: { value: "Entrada" },
    })
    await user.click(screen.getByRole("button", { name: /Salvar/i }))

    await waitFor(() => {
      expect(screen.getByText(/Trial expirado/i)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /Ir para billing/i })
      ).toBeInTheDocument()
    })
  })

  it("builds Intelbras NVR rtsp_url when manual RTSP is empty", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.createStoreCamera).mockResolvedValueOnce({
      id: "cam-1",
      store: "store-1",
      name: "Entrada",
    })
    renderWithProviders(<Cameras />)
    const user = userEvent.setup()

    const addButton = await screen.findByRole("button", {
      name: /Adicionar primeira câmera/i,
    })
    await user.click(addButton)

    fireEvent.change(await screen.findByPlaceholderText(/Ex: Entrada/i), {
      target: { value: "Entrada" },
    })
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Tipo de conexão/i }),
      "nvr"
    )
    fireEvent.change(screen.getByPlaceholderText("192.168.0.10"), {
      target: { value: "192.168.1.50" },
    })
    fireEvent.change(screen.getByPlaceholderText("admin"), {
      target: { value: "admin" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "123456" },
    })

    const channelInput = screen.getByLabelText(/Canal \(NVR\)/i)
    fireEvent.change(channelInput, { target: { value: "3" } })

    const subtypeSelect = screen.getByLabelText(/Subtipo \(Intelbras\)/i)
    await user.selectOptions(subtypeSelect, "0")

    await user.click(screen.getByRole("button", { name: /Salvar/i }))

    await waitFor(() => {
      expect(camerasService.createStoreCamera).toHaveBeenCalled()
    })

    const [, payload] = vi.mocked(camerasService.createStoreCamera).mock.calls[0]
    expect(payload).toMatchObject({
      ip: "192.168.1.50",
      username: "admin",
      password: "123456",
      brand: "intelbras",
      external_id: "ch3-sub0",
      rtsp_url:
        "rtsp://admin:123456@192.168.1.50:554/cam/realmonitor?channel=3&subtype=0",
    })
    expect(payload).not.toHaveProperty("channel")
    expect(payload).not.toHaveProperty("subtype")
  })
})
