import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ForgotPassword from "./ForgotPassword"
import { renderWithProviders } from "../../test/test-utils"

const resetPasswordForEmail = vi.fn()

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
    },
  },
}))

describe("ForgotPassword", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset()
  })

  it("validates email before sending", async () => {
    renderWithProviders(<ForgotPassword />)
    const submit = screen.getByRole("button", { name: /Enviar link de redefinição/i })
    await userEvent.click(submit)
    expect(await screen.findByText(/Informe um e-mail válido/i)).toBeInTheDocument()
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it("sends reset email and shows generic success message", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    renderWithProviders(<ForgotPassword />)

    await userEvent.type(screen.getByLabelText(/E-mail/i), "user@example.com")
    await userEvent.click(screen.getByRole("button", { name: /Enviar link de redefinição/i }))

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalled()
    })
    expect(
      await screen.findByText(/Se este e-mail estiver cadastrado/i)
    ).toBeInTheDocument()
  })
})
