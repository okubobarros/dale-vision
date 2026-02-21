import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "../../test/test-utils"
import Login from "./Login"

describe("Login forgot password link", () => {
  it("renders Esqueci minha senha link", () => {
    renderWithProviders(<Login />)
    const link = screen.getByRole("link", { name: /Esqueci minha senha/i })
    expect(link).toHaveAttribute("href", "/forgot-password")
  })
})
