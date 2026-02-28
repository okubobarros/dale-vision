import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { meService } from "../services/me"
import { trackJourneyEventOnce } from "../services/journey"

const TRIAL_EXPIRED_STORAGE_KEY = "dv_trial_expired"
const TRIAL_EXPIRED_EVENT = "dv-trial-expired"

const isAllowedPath = (pathname: string) =>
  pathname === "/logout" ||
  pathname.startsWith("/app/report") ||
  pathname.startsWith("/app/upgrade")

const SubscriptionGuard = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [allowReportFetch, setAllowReportFetch] = useState(false)

  const { data: status } = useQuery({
    queryKey: ["me-status"],
    queryFn: meService.getStatus,
    staleTime: 60000,
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const isExpired = useMemo(() => {
    if (!status) return false
    if (status.has_subscription) return false
    return status.trial_active === false
  }, [status])

  const { data: report } = useQuery({
    queryKey: ["report-summary"],
    queryFn: () => meService.getReportSummary(),
    enabled: isExpired && allowReportFetch,
    staleTime: 60000,
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const hasReportData = useMemo(() => {
    if (!report) return false
    return (report.kpis?.total_visitors ?? 0) > 0 || (report.kpis?.total_alerts ?? 0) > 0
  }, [report])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAllowReportFetch(true)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const checkAndRedirect = () => {
      const expiredFlag = sessionStorage.getItem(TRIAL_EXPIRED_STORAGE_KEY) === "1"
      const expired = isExpired || expiredFlag
      if (!expired) return
      void trackJourneyEventOnce("trial_expired_shown", "trial_expired_shown", {
        path: location.pathname,
      })
      if (isAllowedPath(location.pathname)) return
      const target = hasReportData ? "/app/report" : "/app/upgrade"
      navigate(target, { replace: true })
    }

    checkAndRedirect()
    const handler = () => checkAndRedirect()
    window.addEventListener(TRIAL_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(TRIAL_EXPIRED_EVENT, handler)
  }, [hasReportData, isExpired, location.pathname, navigate])

  return null
}

export default SubscriptionGuard
