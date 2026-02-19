import { describe, it, expect, beforeEach } from "vitest"
import { waitFor } from "@testing-library/react"
import SubscriptionGuard from "./SubscriptionGuard"
import { renderWithProviders } from "../test/test-utils"

describe("SubscriptionGuard", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("redirects to /app/upgrade when trial expired flag is set", async () => {
    sessionStorage.setItem("dv_trial_expired", "1")
    window.history.pushState({}, "", "/app/dashboard")

    renderWithProviders(<SubscriptionGuard />)

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/upgrade")
    })
  })
})
