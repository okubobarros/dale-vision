import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const readSource = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")

describe("HV-QA-01 journey tracking contract", () => {
  it("declares required owner journey events in journey service", () => {
    const source = readSource("src/services/journey.ts")
    const requiredEvents = [
      "operation_action_delegated",
      "operation_action_feedback_submitted",
      "operation_action_completed",
      "owner_goal_defined",
      "notification_tone_updated",
      "notification_preferences_saved",
    ]

    requiredEvents.forEach((eventName) => {
      expect(source).toContain(`| "${eventName}"`)
    })
  })

  it("tracks operational close-loop events on operations and reports", () => {
    const operationsSource = readSource("src/pages/Operations/Operations.tsx")
    const reportsSource = readSource("src/pages/Reports/Reports.tsx")
    const requiredOpsEvents = [
      "operation_action_delegated",
      "operation_action_feedback_submitted",
      "operation_action_completed",
    ]

    requiredOpsEvents.forEach((eventName) => {
      const regex = new RegExp(`trackJourneyEvent\\(\\s*["']${eventName}["']`)
      expect(regex.test(operationsSource)).toBe(true)
      expect(regex.test(reportsSource)).toBe(true)
    })
  })

  it("tracks personalization events on onboarding and settings", () => {
    const onboardingSource = readSource("src/pages/Onboarding/Onboarding.tsx")
    const settingsSource = readSource("src/pages/Settings/Settings.tsx")
    const personalizationEvents = [
      "owner_goal_defined",
      "notification_tone_updated",
      "notification_preferences_saved",
    ]

    personalizationEvents.forEach((eventName) => {
      const regex = new RegExp(`trackJourneyEvent\\(\\s*["']${eventName}["']`)
      expect(regex.test(onboardingSource)).toBe(true)
      expect(regex.test(settingsSource)).toBe(true)
    })
  })
})
