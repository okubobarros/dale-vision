type RoiPoint = {
  x: number
  y: number
}

type DrawRect = {
  x: number
  y: number
  width: number
  height: number
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

export const normalizePointInDrawRect = (point: RoiPoint, rect: DrawRect): RoiPoint => ({
  x: clamp01((point.x - rect.x) / rect.width),
  y: clamp01((point.y - rect.y) / rect.height),
})
