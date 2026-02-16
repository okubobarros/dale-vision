import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Stores from "./Stores"
import { renderWithProviders } from "../../test/test-utils"

const navigateMock = vi.hoisted(() => vi.fn())
const toastState = {
  element: null as React.ReactElement | null,
}

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  )
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const toastMock = vi.hoisted(() => ({
  custom: vi.fn((renderer: (t: { id: string }) => React.ReactElement) => {
    toastState.element = renderer({ id: "t" })
    return "t"
  }),
  dismiss: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}))

vi.mock("../../services/stores", () => ({
  storesService: {
    getStores: vi.fn().mockResolvedValue([]),
    createStore: vi.fn().mockRejectedValue({
      response: { data: { code: "TRIAL_EXPIRED" } },
    }),
    updateStore: vi.fn(),
    deleteStore: vi.fn(),
    getStoreEdgeStatus: vi.fn(),
  },
}))

describe("Stores TRIAL_EXPIRED handling", () => {
  beforeEach(() => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
    localStorage.setItem("authToken", "token")
    navigateMock.mockClear()
    toastMock.custom.mockClear()
    toastState.element = null
  })

  it("shows CTA and redirects to /app/upgrade when trial expired on create", async () => {
    renderWithProviders(<Stores />)
    const user = userEvent.setup()

    const openButton = await screen.findByRole("button", {
      name: /Criar primeira loja/i,
    })
    await user.click(openButton)

    const nameInput = await screen.findByLabelText(/Nome da Loja/i)
    await user.type(nameInput, "Loja Centro")

    const submitButton = screen.getByRole("button", { name: /Criar Loja/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toastMock.custom).toHaveBeenCalled()
    })

    const { getByRole } = render(toastState.element as React.ReactElement)
    await user.click(getByRole("button", { name: /Ver planos/i }))

    expect(navigateMock).toHaveBeenCalledWith("/app/upgrade")
  })
})
