import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { camerasService, type Camera, type CameraROIConfig } from "../services/cameras"

type RoiPoint = {
  x: number
  y: number
}

type RoiShape = {
  id: string
  name: string
  type: "rect" | "poly"
  points: RoiPoint[]
}

type CameraRoiEditorProps = {
  open: boolean
  camera: Camera | null
  onClose: () => void
}

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540

const CameraRoiEditor = ({ open, camera, onClose }: CameraRoiEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<"rect" | "poly">("rect")
  const [zoneName, setZoneName] = useState("")
  const [shapes, setShapes] = useState<RoiShape[]>([])
  const [draftPoints, setDraftPoints] = useState<RoiPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cameraId = camera?.id

  const { data: roiConfig, isLoading: roiLoading } = useQuery<CameraROIConfig>({
    queryKey: ["camera-roi", cameraId],
    queryFn: () => camerasService.getRoi(cameraId || ""),
    enabled: Boolean(cameraId),
  })

  const updateRoiMutation = useMutation({
    mutationFn: (payload: {
      payload: unknown
      status: "draft" | "published"
      image_w: number
      image_h: number
    }) => camerasService.updateRoi(cameraId || "", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["camera-roi", cameraId] })
      toast.success(`ROI salvo (v${data.version})`)
    },
    onError: () => toast.error("Falha ao salvar ROI."),
  })

  const latestVersion = roiConfig?.version ?? 0
  const latestUpdatedAt = roiConfig?.updated_at ?? null

  useEffect(() => {
    if (!open) return
    if (!roiConfig?.payload) {
      setShapes([])
      setDraftPoints([])
      return
    }
    const config = roiConfig.payload as { zones?: RoiShape[] } | RoiShape[]
    if (Array.isArray(config)) {
      setShapes(config)
    } else if (Array.isArray(config?.zones)) {
      setShapes(config.zones)
    } else {
      setShapes([])
    }
    setDraftPoints([])
  }, [open, roiConfig?.version])

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    drawBackground(ctx)

    shapes.forEach((shape) => drawShape(ctx, shape, "#2563eb"))
    if (draftPoints.length > 0) {
      drawShape(
        ctx,
        { id: "draft", name: zoneName || "Rascunho", type: mode, points: draftPoints },
        "#f59e0b"
      )
    }
  }, [open, shapes, draftPoints, mode, zoneName])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!cameraId) return
      if (!zoneName.trim()) {
        setError("Informe o nome da zona antes de desenhar.")
        return
      }
      setError(null)

      const { x, y } = getCanvasPoint(event)
      const point = normalizePoint(x, y)

      if (mode === "rect") {
        setIsDrawing(true)
        setDraftPoints([point, point])
      } else {
        setDraftPoints((prev) => [...prev, point])
      }
    },
    [cameraId, mode, zoneName]
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || mode !== "rect") return
      const { x, y } = getCanvasPoint(event)
      const point = normalizePoint(x, y)
      setDraftPoints((prev) => (prev.length >= 2 ? [prev[0], point] : prev))
    },
    [isDrawing, mode]
  )

  const finalizeRect = useCallback(() => {
    if (mode !== "rect" || draftPoints.length < 2) return
    const [start, end] = draftPoints
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)
    if (Math.abs(maxX - minX) < 0.01 || Math.abs(maxY - minY) < 0.01) {
      setDraftPoints([])
      return
    }
    setShapes((prev) => [
      ...prev,
      {
        id: `roi-${Date.now()}`,
        name: zoneName.trim(),
        type: "rect",
        points: [
          { x: minX, y: minY },
          { x: maxX, y: maxY },
        ],
      },
    ])
    setDraftPoints([])
    setIsDrawing(false)
  }, [draftPoints, mode, zoneName])

  const finalizePolygon = useCallback(() => {
    if (mode !== "poly" || draftPoints.length < 3) return
    setShapes((prev) => [
      ...prev,
      {
        id: `roi-${Date.now()}`,
        name: zoneName.trim(),
        type: "poly",
        points: draftPoints,
      },
    ])
    setDraftPoints([])
  }, [draftPoints, mode, zoneName])

  const handlePointerUp = useCallback(() => {
    if (mode === "rect") {
      finalizeRect()
    }
  }, [finalizeRect, mode])

  const clearDraft = useCallback(() => {
    setDraftPoints([])
    setIsDrawing(false)
  }, [])

  const removeShape = useCallback((shapeId: string) => {
    setShapes((prev) => prev.filter((shape) => shape.id !== shapeId))
  }, [])

  const handleSave = useCallback(() => {
    if (!cameraId) return
    updateRoiMutation.mutate({
      payload: {
        version: latestVersion,
        zones: shapes,
        canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      },
      status: "draft",
      image_w: CANVAS_WIDTH,
      image_h: CANVAS_HEIGHT,
    })
  }, [cameraId, latestVersion, shapes, updateRoiMutation])

  const handlePublish = useCallback(() => {
    if (!cameraId) return
    updateRoiMutation.mutate({
      payload: {
        version: latestVersion,
        zones: shapes,
        canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      },
      status: "published",
      image_w: CANVAS_WIDTH,
      image_h: CANVAS_HEIGHT,
    })
  }, [cameraId, latestVersion, shapes, updateRoiMutation])

  const displayUpdatedAt = useMemo(() => {
    if (!latestUpdatedAt) return "—"
    try {
      return new Date(latestUpdatedAt).toLocaleString("pt-BR")
    } catch {
      return latestUpdatedAt
    }
  }, [latestUpdatedAt])

  if (!open || !camera) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-6xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              ROI Editor · {camera.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Versão do ROI: v{latestVersion} · Status: {roiConfig?.status ?? "draft"} ·
              Atualizado em {displayUpdatedAt}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={updateRoiMutation.isPending}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                updateRoiMutation.isPending
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {updateRoiMutation.isPending ? "Salvando..." : "Salvar rascunho"}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={updateRoiMutation.isPending || shapes.length === 0}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                updateRoiMutation.isPending || shapes.length === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              Publicar versão
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            {roiLoading ? (
              <div className="text-sm text-gray-500">Carregando ROI...</div>
            ) : (
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="w-full rounded-lg border border-gray-200 bg-white"
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">
                  Nome da zona
                </label>
                <input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Ex: Entrada"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Modo</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "rect" | "poly")}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="rect">Retângulo</option>
                  <option value="poly">Polígono</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {mode === "poly" && (
                <button
                  type="button"
                  onClick={finalizePolygon}
                  disabled={draftPoints.length < 3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Finalizar polígono
                </button>
              )}
              {draftPoints.length > 0 && (
                <button
                  type="button"
                  onClick={clearDraft}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar desenho
                </button>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700">
                Zonas ({shapes.length})
              </h4>
              {shapes.length === 0 ? (
                <p className="text-xs text-gray-500 mt-2">
                  Nenhuma zona criada ainda.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {shapes.map((shape) => (
                    <div
                      key={shape.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {shape.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {shape.type === "rect" ? "Retângulo" : "Polígono"} ·{" "}
                          {shape.points.length} pontos
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeShape(shape.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const normalizePoint = (x: number, y: number): RoiPoint => ({
  x: Math.min(Math.max(x / CANVAS_WIDTH, 0), 1),
  y: Math.min(Math.max(y / CANVAS_HEIGHT, 0), 1),
})

const denormalizePoint = (point: RoiPoint) => ({
  x: point.x * CANVAS_WIDTH,
  y: point.y * CANVAS_HEIGHT,
})

const drawBackground = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = 1
  const step = 40
  for (let x = 0; x <= CANVAS_WIDTH; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_WIDTH, y)
    ctx.stroke()
  }
}

const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: RoiShape,
  stroke: string
) => {
  if (shape.points.length === 0) return
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.fillStyle = `${stroke}22`

  if (shape.type === "rect" && shape.points.length >= 2) {
    const start = denormalizePoint(shape.points[0])
    const end = denormalizePoint(shape.points[1])
    const width = end.x - start.x
    const height = end.y - start.y
    ctx.strokeRect(start.x, start.y, width, height)
    ctx.fillRect(start.x, start.y, width, height)
    ctx.fillStyle = stroke
    ctx.fillText(shape.name, start.x + 6, start.y + 18)
    return
  }

  ctx.beginPath()
  shape.points.forEach((point, index) => {
    const p = denormalizePoint(point)
    if (index === 0) {
      ctx.moveTo(p.x, p.y)
    } else {
      ctx.lineTo(p.x, p.y)
    }
  })
  if (shape.type === "poly" && shape.points.length >= 3) {
    ctx.closePath()
  }
  ctx.stroke()
  ctx.fill()
  const labelPoint = denormalizePoint(shape.points[0])
  ctx.fillStyle = stroke
  ctx.fillText(shape.name, labelPoint.x + 6, labelPoint.y + 18)
}

export default CameraRoiEditor
