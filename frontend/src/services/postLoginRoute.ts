import { meService } from "./me"
import { storesService } from "./stores"
import { authService } from "./auth"

const DASHBOARD_ROUTE = "/app/dashboard?openEdgeSetup=1"
const ONBOARDING_ROUTE = "/onboarding"
const ADMIN_ROUTE = "/app/admin"

export const resolvePostLoginRoute = async (): Promise<string> => {
  const currentUser = authService.getCurrentUser()
  if (currentUser?.is_staff || currentUser?.is_superuser) {
    return ADMIN_ROUTE
  }

  try {
    const setup = await meService.getSetupState()
    if (setup?.ok) {
      if (setup.state === "ready" || setup.has_store) {
        return DASHBOARD_ROUTE
      }
      return ONBOARDING_ROUTE
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[post-login] setup-state failed, fallback stores", error)
    }
  }

  try {
    const stores = await storesService.getStoresMinimal({ allowCachedFallback: false })
    return stores.length > 0 ? DASHBOARD_ROUTE : ONBOARDING_ROUTE
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[post-login] stores fallback failed, default onboarding", error)
    }
    return ONBOARDING_ROUTE
  }
}
