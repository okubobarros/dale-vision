import { meService } from "./me"
import { storesService } from "./stores"
import { authService } from "./auth"

const DASHBOARD_ROUTE = "/app/dashboard?openEdgeSetup=1"
const ONBOARDING_ROUTE = "/onboarding"
const ADMIN_ROUTE = "/app/admin"
const POST_LOGIN_EXPLAINER_KEY = "dv_post_login_explainer"
const EXPLAINER_TTL_MS = 1000 * 60 * 30

export type PostLoginReasonCode =
  | "internal_admin"
  | "onboarding_required"
  | "continue_setup"

export type PostLoginDecision = {
  route: string
  reasonCode: PostLoginReasonCode
}

type PostLoginExplainerPayload = {
  route: string
  reasonCode: PostLoginReasonCode
  targetPath: string
  createdAt: number
  shown: boolean
}

const toTargetPath = (route: string) => route.split("?")[0]

const parseExplainerPayload = (raw: string | null): PostLoginExplainerPayload | null => {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<PostLoginExplainerPayload>
    if (!data || typeof data !== "object") return null
    if (typeof data.route !== "string" || typeof data.reasonCode !== "string") return null
    if (typeof data.targetPath !== "string" || typeof data.createdAt !== "number") return null
    if (typeof data.shown !== "boolean") return null
    return data as PostLoginExplainerPayload
  } catch {
    return null
  }
}

export const persistPostLoginExplainer = (decision: PostLoginDecision) => {
  if (typeof window === "undefined") return
  const payload: PostLoginExplainerPayload = {
    route: decision.route,
    reasonCode: decision.reasonCode,
    targetPath: toTargetPath(decision.route),
    createdAt: Date.now(),
    shown: false,
  }
  sessionStorage.setItem(POST_LOGIN_EXPLAINER_KEY, JSON.stringify(payload))
}

export const consumePostLoginExplainer = (
  pathname: string
): { reasonCode: PostLoginReasonCode; route: string } | null => {
  if (typeof window === "undefined") return null
  const payload = parseExplainerPayload(sessionStorage.getItem(POST_LOGIN_EXPLAINER_KEY))
  if (!payload) return null
  if (Date.now() - payload.createdAt > EXPLAINER_TTL_MS) {
    sessionStorage.removeItem(POST_LOGIN_EXPLAINER_KEY)
    return null
  }
  if (payload.shown || payload.targetPath !== pathname) return null
  const nextPayload: PostLoginExplainerPayload = { ...payload, shown: true }
  sessionStorage.setItem(POST_LOGIN_EXPLAINER_KEY, JSON.stringify(nextPayload))
  return { reasonCode: payload.reasonCode, route: payload.route }
}

export const resolvePostLoginDecision = async (): Promise<PostLoginDecision> => {
  const currentUser = authService.getCurrentUser()
  if (currentUser?.is_staff || currentUser?.is_superuser) {
    return { route: ADMIN_ROUTE, reasonCode: "internal_admin" }
  }

  try {
    const status = await meService.getStatus()
    if (status?.is_internal_admin) {
      return { route: ADMIN_ROUTE, reasonCode: "internal_admin" }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[post-login] me/status failed, fallback local user/setup", error)
    }
  }

  try {
    const setup = await meService.getSetupState()
    if (setup?.ok) {
      if (setup.state === "ready" || setup.has_store) {
        return { route: DASHBOARD_ROUTE, reasonCode: "continue_setup" }
      }
      return { route: ONBOARDING_ROUTE, reasonCode: "onboarding_required" }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[post-login] setup-state failed, fallback stores", error)
    }
  }

  try {
    const stores = await storesService.getStoresMinimal({ allowCachedFallback: false })
    return stores.length > 0
      ? { route: DASHBOARD_ROUTE, reasonCode: "continue_setup" }
      : { route: ONBOARDING_ROUTE, reasonCode: "onboarding_required" }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[post-login] stores fallback failed, default onboarding", error)
    }
    return { route: ONBOARDING_ROUTE, reasonCode: "onboarding_required" }
  }
}

export const resolvePostLoginRoute = async (): Promise<string> => {
  const decision = await resolvePostLoginDecision()
  return decision.route
}
