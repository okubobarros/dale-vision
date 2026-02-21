import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { AuthProvider } from "./AuthContext"
import { useAuth } from "./useAuth"
import api from "../services/api"

const Probe = () => {
  const { isAuthenticated, authReady } = useAuth()
  return (
    <div>
      <span>{authReady ? "ready" : "not-ready"}</span>
      <span>{isAuthenticated ? "auth" : "no-auth"}</span>
    </div>
  )
}

describe("AuthProvider bootstrap", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "token-123")
    localStorage.setItem(
      "userData",
      JSON.stringify({ id: "u1", username: "tester", email: "t@x.com" })
    )
  })

  afterEach(() => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("userData")
    const common = api.defaults.headers.common as Record<string, string>
    delete common.Authorization
  })

  it("rehydrates auth and sets axios auth header", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument()
      expect(screen.getByText("auth")).toBeInTheDocument()
    })

    const common = api.defaults.headers.common as Record<string, string>
    expect(common.Authorization).toBe("Bearer token-123")
  })
})
