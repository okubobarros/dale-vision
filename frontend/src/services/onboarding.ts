import api from "./api"

export type OnboardingStep =
  | "edge_connected"
  | "camera_added"
  | "camera_health_ok"
  | "roi_published"
  | "monitoring_started"
  | "first_insight"

export type OnboardingStepState = {
  step: OnboardingStep
  completed: boolean
  completed_at?: string | null
  status?: string | null
  progress_percent?: number | null
  meta?: Record<string, unknown>
}

export type OnboardingProgressResponse = {
  steps: Record<OnboardingStep, OnboardingStepState>
  next_step?: OnboardingStep | null
  ordered_steps?: OnboardingStep[]
}

export const onboardingService = {
  async getProgress(storeId?: string): Promise<OnboardingProgressResponse> {
    const params = storeId ? `?store_id=${storeId}` : ""
    const response = await api.get(`/v1/onboarding/progress/${params}`)
    return response.data
  },

  async completeStep(step: OnboardingStep, meta?: Record<string, unknown>, storeId?: string) {
    const response = await api.post(`/v1/onboarding/step/complete/`, {
      step,
      meta,
      store_id: storeId || undefined,
    })
    return response.data
  },
}
