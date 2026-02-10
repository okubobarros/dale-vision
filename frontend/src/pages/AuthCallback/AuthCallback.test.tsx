import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, it, vi } from "vitest"
import AuthCallback from "./AuthCallback"

const navigateSpy = vi.fn()
const refreshAuthSpy = vi.fn()
const apiGetSpy = vi.fn()
const exchangeSpy = vi.fn()
const getSessionSpy = vi.fn()
const getUserSpy = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ refreshAuth: refreshAuthSpy }),
}))

vi.mock("../../services/api", () => ({
  default: { get: apiGetSpy },
}))

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: exchangeSpy,
      getSession: getSessionSpy,
      getUser: getUserSpy,
    },
  },
}))

describe("AuthCallback", () => {
  beforeEach(() => {
    navigateSpy.mockReset()
    refreshAuthSpy.mockReset()
    apiGetSpy.mockReset()
    exchangeSpy.mockReset()
    getSessionSpy.mockReset()
    getUserSpy.mockReset()
  })

  it("creates session and calls setup-state before redirecting", async () => {
    window.history.pushState({}, "", "https://app.dalevision.com/auth/callback?code=abc")

    const session = {
      access_token: "token-123",
      user: { id: "user-1", email: "user@example.com", user_metadata: {} },
    }

    exchangeSpy.mockResolvedValue({ data: { session, user: session.user }, error: null })
    getSessionSpy.mockResolvedValue({ data: { session }, error: null })
    getUserSpy.mockResolvedValue({ data: { user: session.user }, error: null })
    apiGetSpy.mockResolvedValue({ data: { state: "no_store", has_store: false } })

    render(<AuthCallback />)

    await waitFor(() => {
      expect(apiGetSpy).toHaveBeenCalledWith("/me/setup-state/", {
        headers: { Authorization: "Bearer token-123" },
      })
    })

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith("/onboarding", { replace: true })
    })
  })
})
