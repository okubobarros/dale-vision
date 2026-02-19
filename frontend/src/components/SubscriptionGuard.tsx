import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

const TRIAL_EXPIRED_STORAGE_KEY = "dv_trial_expired"
const TRIAL_EXPIRED_EVENT = "dv-trial-expired"

const isAllowedPath = (pathname: string) => {
  if (pathname === "/logout") return true
  if (pathname === "/app/upgrade") return true
  if (pathname.startsWith("/app/billing")) return true
  if (pathname.startsWith("/billing")) return true
  return false
}

const SubscriptionGuard = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const checkAndRedirect = () => {
      const expired = sessionStorage.getItem(TRIAL_EXPIRED_STORAGE_KEY) === "1"
      if (!expired) return
      if (isAllowedPath(location.pathname)) return
      navigate("/app/upgrade", { replace: true })
    }

    checkAndRedirect()
    const handler = () => checkAndRedirect()
    window.addEventListener(TRIAL_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(TRIAL_EXPIRED_EVENT, handler)
  }, [location.pathname, navigate])

  return null
}

export default SubscriptionGuard
