import type { MeStatus } from "../../services/me"
import type { StoreSummary, StoreEdgeStatus } from "../../services/stores"
import type { OnboardingNextStepResponse } from "../../services/onboarding"

export type AccountState =
  | "trial_active"
  | "trial_expired"
  | "plan_active"
  | "unknown"

export type StoreOperationalState =
  | "not_connected"
  | "connected_no_capture"
  | "collecting"
  | "operational"
  | "technical_incident"

export type DashboardType = "trial" | "paid_setup" | "paid_executive"

export type DashboardExperience = {
  dashboardType: DashboardType
  accountState: AccountState
  networkState: "no_store" | "setup_incomplete" | "operating" | "incident"
  storeState: StoreOperationalState | null
  reasons: string[]
}

type ResolveDashboardExperienceInput = {
  meStatus: MeStatus | null | undefined
  stores: StoreSummary[] | undefined
  selectedStore: StoreSummary | null
  edgeStatus: StoreEdgeStatus | null | undefined
  onboarding: OnboardingNextStepResponse | null | undefined
  hasOperationalData: boolean
  camerasOnline: number
}

const deriveAccountState = (
  meStatus: MeStatus | null | undefined,
  stores: StoreSummary[] | undefined
): AccountState => {
  if (meStatus?.has_subscription) return "plan_active"
  if (meStatus?.trial_active === true) return "trial_active"
  if (meStatus?.trial_active === false && !meStatus?.has_subscription) {
    return "trial_expired"
  }

  const hasBlockedTrialStore = (stores ?? []).some(
    (store) => store.status === "blocked" && store.blocked_reason === "trial_expired"
  )
  if (hasBlockedTrialStore) return "trial_expired"

  const hasTrialStore = (stores ?? []).some((store) => store.status === "trial")
  if (hasTrialStore) return "trial_active"

  return "unknown"
}

const deriveStoreState = ({
  selectedStore,
  edgeStatus,
  onboarding,
  hasOperationalData,
  camerasOnline,
}: {
  selectedStore: StoreSummary | null
  edgeStatus: StoreEdgeStatus | null | undefined
  onboarding: OnboardingNextStepResponse | null | undefined
  hasOperationalData: boolean
  camerasOnline: number
}): StoreOperationalState | null => {
  if (!selectedStore) return null

  const connectivity = String(edgeStatus?.connectivity_status || "").toLowerCase()
  const storeReason = String(edgeStatus?.store_status_reason || "").toLowerCase()
  const isConnected =
    connectivity === "online" ||
    connectivity === "degraded" ||
    edgeStatus?.online === true

  if (storeReason.includes("heartbeat") || storeReason.includes("timeout")) {
    return "technical_incident"
  }
  if (!isConnected) return "not_connected"
  if (camerasOnline <= 0) return "connected_no_capture"
  if (!hasOperationalData || onboarding?.stage === "collecting_data") return "collecting"
  return "operational"
}

export function getDashboardExperience(
  input: ResolveDashboardExperienceInput
): DashboardExperience {
  const accountState = deriveAccountState(input.meStatus, input.stores)
  const storeState = deriveStoreState({
    selectedStore: input.selectedStore,
    edgeStatus: input.edgeStatus,
    onboarding: input.onboarding,
    hasOperationalData: input.hasOperationalData,
    camerasOnline: input.camerasOnline,
  })

  const reasons: string[] = []
  let dashboardType: DashboardType = "paid_setup"

  if (accountState === "trial_active") {
    dashboardType = "trial"
    reasons.push("Conta em trial ativo")
  } else if (accountState === "plan_active") {
    if (storeState === "operational") {
      dashboardType = "paid_executive"
      reasons.push("Plano ativo com operação em andamento")
    } else {
      dashboardType = "paid_setup"
      reasons.push("Plano ativo com implantação operacional incompleta")
    }
  } else if (accountState === "trial_expired") {
    dashboardType = "trial"
    reasons.push("Trial expirado sem assinatura ativa")
  } else if (storeState === "operational") {
    dashboardType = "paid_executive"
    reasons.push("Fallback por operação ativa")
  } else {
    dashboardType = "paid_setup"
    reasons.push("Fallback conservador para setup")
  }

  let networkState: DashboardExperience["networkState"] = "no_store"
  if ((input.stores ?? []).length > 0) {
    const hasBlocked = (input.stores ?? []).some((store) => store.status === "blocked")
    if (hasBlocked || storeState === "technical_incident") {
      networkState = "incident"
    } else if (dashboardType === "paid_executive") {
      networkState = "operating"
    } else {
      networkState = "setup_incomplete"
    }
  }

  if (storeState) reasons.push(`Estado operacional da loja: ${storeState}`)

  return {
    dashboardType,
    accountState,
    networkState,
    storeState,
    reasons,
  }
}

