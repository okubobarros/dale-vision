import { describe, expect, it } from "vitest"
import { normalizePointInDrawRect } from "../CameraRoiEditor.helpers"

describe("CameraRoiEditor helpers", () => {
  it("normalizes point based on drawRect", () => {
    const rect = { x: 10, y: 20, width: 200, height: 100 }
    const point = { x: 110, y: 70 }

    const normalized = normalizePointInDrawRect(point, rect)

    expect(normalized.x).toBeCloseTo(0.5)
    expect(normalized.y).toBeCloseTo(0.5)
  })
})
