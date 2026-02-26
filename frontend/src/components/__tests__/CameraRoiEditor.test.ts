import { describe, expect, it } from "vitest"
import { mergeShapesById, normalizePointInDrawRect } from "../CameraRoiEditor.helpers"

describe("CameraRoiEditor helpers", () => {
  it("normalizes point based on drawRect", () => {
    const rect = { x: 10, y: 20, width: 200, height: 100 }
    const point = { x: 110, y: 70 }

    const normalized = normalizePointInDrawRect(point, rect)

    expect(normalized.x).toBeCloseTo(0.5)
    expect(normalized.y).toBeCloseTo(0.5)
  })

  it("dedupes shapes by id to avoid publish duplication", () => {
    const shapes = [
      { id: "roi-1", name: "A" },
      { id: "roi-2", name: "B" },
      { id: "roi-1", name: "A-dup" },
    ]

    const merged = mergeShapesById(shapes)

    expect(merged).toHaveLength(2)
    expect(merged.find((shape) => shape.id === "roi-1")?.name).toBe("A-dup")
  })
})
