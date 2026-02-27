import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import SubscriptionGuard from "./SubscriptionGuard"

const navigateMock = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  )
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/app/analytics" }),
  }
})

vi.mock("../services/me", () => ({
  meService: {
    getStatus: vi.fn(),
    getReportSummary: vi.fn(),
  },
}))

const buildWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe("SubscriptionGuard", () => {
  beforeEach(() => {
    navigateMock.mockReset()
    sessionStorage.clear()
  })

  it("redirects expired users to report when there is data", async () => {
    const { meService } = await import("../services/me")
    vi.mocked(meService.getStatus).mockResolvedValue({
      trial_active: false,
      trial_ends_at: "2026-02-01T10:00:00Z",
      has_subscription: false,
      role: "owner",
    })
    vi.mocked(meService.getReportSummary).mockResolvedValue({
      period: "7d",
      from: "2026-01-25T00:00:00Z",
      to: "2026-02-01T00:00:00Z",
      stores_count: 1,
      kpis: {
        total_visitors: 10,
        avg_dwell_seconds: 30,
        avg_queue_seconds: 12,
        avg_conversion_rate: 0.12,
        total_alerts: 2,
      },
      chart_footfall_by_day: [],
      chart_footfall_by_hour: [],
      alert_counts_by_type: [],
      insights: [],
    })

    const Wrapper = buildWrapper()
    render(<SubscriptionGuard />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/app/report", { replace: true })
    })
  })

  it("redirects expired users to upgrade when there is no data", async () => {
    const { meService } = await import("../services/me")
    vi.mocked(meService.getStatus).mockResolvedValue({
      trial_active: false,
      trial_ends_at: "2026-02-01T10:00:00Z",
      has_subscription: false,
      role: "owner",
    })
    vi.mocked(meService.getReportSummary).mockResolvedValue({
      period: "7d",
      from: "2026-01-25T00:00:00Z",
      to: "2026-02-01T00:00:00Z",
      stores_count: 1,
      kpis: {
        total_visitors: 0,
        avg_dwell_seconds: 0,
        avg_queue_seconds: 0,
        avg_conversion_rate: 0,
        total_alerts: 0,
      },
      chart_footfall_by_day: [],
      chart_footfall_by_hour: [],
      alert_counts_by_type: [],
      insights: [],
    })

    const Wrapper = buildWrapper()
    render(<SubscriptionGuard />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/app/upgrade", { replace: true })
    })
  })
})
