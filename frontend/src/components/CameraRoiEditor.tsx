import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ChangeEvent,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { camerasService, type Camera, type CameraROIConfig } from "../services/cameras"
import { onboardingService } from "../services/onboarding"

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
  canEditRoi?: boolean
  onClose: () => void
}

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540

const extractShapesFromConfig = (configJson: unknown): RoiShape[] => {
  if (!configJson) return []
  if (Array.isArray(configJson)) return configJson as RoiShape[]
  if (typeof configJson === "object" && configJson !== null) {
    const zones = (configJson as { zones?: unknown }).zones
    return Array.isArray(zones) ? (zones as RoiShape[]) : []
  }
  return []
}

const CameraRoiEditor = ({ open, camera, canEditRoi = false, onClose }: CameraRoiEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<"rect" | "poly">("rect")
  const [zoneName, setZoneName] = useState("")
  const [addedShapes, setAddedShapes] = useState<RoiShape[]>([])
  const [removedShapeIds, setRemovedShapeIds] = useState<string[]>([])
  const [draftPoints, setDraftPoints] = useState<RoiPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backgroundImageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const cameraId = camera?.id

  const { data: roiConfig, isLoading: roiLoading } = useQuery<CameraROIConfig>({
    queryKey: ["camera-roi", cameraId],
    queryFn: () => camerasService.getRoi(cameraId || ""),
    enabled: Boolean(cameraId),
  })

  const {
    data: snapshotData,
    isLoading: snapshotLoading,
    error: snapshotError,
  } = useQuery({
    queryKey: ["camera-snapshot", cameraId],
    queryFn: () => camerasService.getSnapshotUrl(cameraId || ""),
    enabled: Boolean(cameraId),
    retry: (count, error) => {
      const response = (error as { response?: { status?: number; data?: { code?: string } } })
        ?.response
      const status = response?.status
      const code = response?.data?.code
      if (status === 404) return false
      if (status === 503 && code === "STORAGE_NOT_CONFIGURED") return false
      return count < 2
    },
    onError: (err) => {
      if (import.meta.env.DEV) {
        const response = (err as { response?: { status?: number; data?: unknown } })?.response
        console.warn("[ROI] snapshot fetch failed", {
          status: response?.status,
          data: response?.data,
        })
      }
    },
  })
  const snapshotUrl =
    snapshotData?.snapshot_url || snapshotData?.signed_url || null
  const snapshotErrorResponse = snapshotError as
    | { response?: { status?: number; data?: { code?: string; message?: string } } }
    | undefined
  const snapshotStatus = snapshotErrorResponse?.response?.status
  const snapshotCode = snapshotErrorResponse?.response?.data?.code
  const snapshotMessage = snapshotErrorResponse?.response?.data?.message

  const updateRoiMutation = useMutation({
    mutationFn: (configJson: unknown) =>
      camerasService.updateRoi(cameraId || "", configJson),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["camera-roi", cameraId] })
      toast.success(`ROI salvo (v${data.version})`)
    },
    onError: () => toast.error("Falha ao salvar ROI."),
  })

  const uploadSnapshotMutation = useMutation({
    mutationFn: (file: File) => camerasService.uploadSnapshot(cameraId || "", file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camera-snapshot", cameraId] })
      toast.success("Snapshot atualizado")
    },
    onError: (err: unknown) => {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response
      const message =
        response?.data?.message ||
        (err as { message?: string })?.message ||
        "Falha ao enviar snapshot."
      toast.error(message)
      if (import.meta.env.DEV) {
        console.warn("[ROI] snapshot upload failed", {
          status: response?.status,
          data: response?.data,
        })
      }
    },
  })

  const latestUpdatedAt = roiConfig?.updated_at ?? null
  const latestConfig = roiConfig?.config_json as
    | {
        roi_version?: number
        status?: "draft" | "published"
        image?: { width?: number; height?: number }
        zones?: RoiShape[]
        metrics_enabled?: boolean
      }
    | undefined
  const roiVersionLabel = latestConfig?.roi_version ?? 0
  const roiStatus = latestConfig?.status ?? "draft"

  const baseShapes = useMemo(
    () => extractShapesFromConfig(roiConfig?.config_json),
    [roiConfig?.config_json]
  )

  const effectiveShapes = useMemo(() => {
    if (removedShapeIds.length === 0) {
      return [...baseShapes, ...addedShapes]
    }
    const removed = new Set(removedShapeIds)
    return [
      ...baseShapes.filter((shape) => !removed.has(shape.id)),
      ...addedShapes,
    ]
  }, [addedShapes, baseShapes, removedShapeIds])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    drawBackground(ctx, backgroundImageRef.current)

    effectiveShapes.forEach((shape) => drawShape(ctx, shape, "#2563eb"))
    if (draftPoints.length > 0) {
      drawShape(
        ctx,
        { id: "draft", name: zoneName || "Rascunho", type: mode, points: draftPoints },
        "#f59e0b"
      )
    }
  }, [draftPoints, effectiveShapes, mode, zoneName])

  useEffect(() => {
    if (!open) return
    drawCanvas()
  }, [drawCanvas, open])

  useEffect(() => {
    if (!snapshotUrl) {
      backgroundImageRef.current = null
      if (open) {
        drawCanvas()
      }
      return
    }
    let active = true
    const img = new Image()
    img.onload = () => {
      if (!active) return
      backgroundImageRef.current = img
      if (open) {
        drawCanvas()
      }
    }
    img.onerror = () => {
      if (!active) return
      backgroundImageRef.current = null
      if (open) {
        drawCanvas()
      }
    }
    img.src = snapshotUrl
    return () => {
      active = false
    }
  }, [drawCanvas, open, snapshotUrl])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!cameraId || !canEditRoi) return
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
    setAddedShapes((prev) => [
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
    setAddedShapes((prev) => [
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
    if (!canEditRoi) return
    if (mode === "rect") {
      finalizeRect()
    }
  }, [canEditRoi, finalizeRect, mode])

  const clearDraft = useCallback(() => {
    setDraftPoints([])
    setIsDrawing(false)
  }, [])

  const removeShape = useCallback((shapeId: string) => {
    setAddedShapes((prev) => prev.filter((shape) => shape.id !== shapeId))
    setRemovedShapeIds((prev) => (prev.includes(shapeId) ? prev : [...prev, shapeId]))
  }, [])

  const handleSave = useCallback(() => {
    if (!cameraId || !canEditRoi) return
    updateRoiMutation.mutate({
      roi_version: roiVersionLabel,
      status: "draft",
      image: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      zones: effectiveShapes,
      metrics_enabled: Boolean(latestConfig?.metrics_enabled),
    })
  }, [
    cameraId,
    canEditRoi,
    effectiveShapes,
    latestConfig?.metrics_enabled,
    roiVersionLabel,
    updateRoiMutation,
  ])

  const handlePublish = useCallback(() => {
    if (!cameraId || !canEditRoi) return
    updateRoiMutation.mutate({
      roi_version: roiVersionLabel,
      status: "published",
      image: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      zones: effectiveShapes,
      metrics_enabled: Boolean(latestConfig?.metrics_enabled),
    })
  }, [
    cameraId,
    canEditRoi,
    effectiveShapes,
    latestConfig?.metrics_enabled,
    roiVersionLabel,
    updateRoiMutation,
  ])

  const handleStartMonitoring = useCallback(async () => {
    if (!cameraId || !camera?.store) return
    try {
      await onboardingService.completeStep("monitoring_started", {
        store_id: camera.store,
        camera_id: cameraId,
        roi_version: roiVersionLabel,
      }, camera.store)
      toast.success("Monitoramento iniciado")
    } catch {
      toast.error("Falha ao iniciar monitoramento.")
    }
  }, [camera, cameraId, roiVersionLabel])

  const displayUpdatedAt = useMemo(() => {
    if (!latestUpdatedAt) return "—"
    try {
      return new Date(latestUpdatedAt).toLocaleString("pt-BR")
    } catch {
      return latestUpdatedAt
    }
  }, [latestUpdatedAt])

  const handleClose = useCallback(() => {
    setAddedShapes([])
    setRemovedShapeIds([])
    setDraftPoints([])
    setIsDrawing(false)
    setError(null)
    setZoneName("")
    setMode("rect")
    onClose()
  }, [onClose])

  const handleSelectSnapshot = useCallback(() => {
    if (!canEditRoi) return
    fileInputRef.current?.click()
  }, [canEditRoi])

  const handleSnapshotChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !cameraId || !canEditRoi) return
      uploadSnapshotMutation.mutate(file)
      event.target.value = ""
    },
    [cameraId, canEditRoi, uploadSnapshotMutation]
  )

  if (!open || !camera) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-6xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                ROI Editor · {camera.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                <span title={`roi_version ${roiVersionLabel}`}>ROI v{roiVersionLabel}</span>{" "}
                · Status: {roiStatus} · Atualizado em {displayUpdatedAt}
              </p>
              <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                <div className="font-semibold">Passo 3 de 4 — Defina as áreas de monitoramento</div>
                <div className="text-blue-800 mt-1">
                  Desenhe zonas como Caixa, Entrada ou Área de espera.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEditRoi ? (
                <>
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
                    disabled={updateRoiMutation.isPending || effectiveShapes.length === 0}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      updateRoiMutation.isPending || effectiveShapes.length === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    Publicar versão
                  </button>
                </>
              ) : (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Somente leitura. Peça acesso de admin/manager para editar ROI.
                </div>
              )}
              {roiStatus === "published" && (
                <button
                  type="button"
                  onClick={handleStartMonitoring}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Iniciar monitoramento
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
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
                className={`w-full rounded-lg border border-gray-200 bg-white ${
                  !canEditRoi ? "cursor-not-allowed opacity-80" : ""
                }`}
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
                  disabled={!canEditRoi}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Modo</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "rect" | "poly")}
                  disabled={!canEditRoi}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="rect">Retângulo</option>
                  <option value="poly">Polígono</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {mode === "poly" && canEditRoi && (
                <button
                  type="button"
                  onClick={finalizePolygon}
                  disabled={draftPoints.length < 3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Finalizar polígono
                </button>
              )}
              {canEditRoi && draftPoints.length > 0 && (
                <button
                  type="button"
                  onClick={clearDraft}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar desenho
                </button>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Snapshot</h4>
              <p className="text-xs text-gray-500">
                Use um snapshot para desenhar o ROI (a validação da câmera pode
                acontecer depois).
              </p>
              {snapshotLoading ? (
                <div className="text-xs text-gray-500">Carregando snapshot...</div>
              ) : snapshotStatus === 503 && snapshotCode === "STORAGE_NOT_CONFIGURED" ? (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Snapshot central indisponível. Fale com suporte.
                </div>
              ) : snapshotStatus === 404 ? (
                <div className="text-xs text-gray-500">
                  Sem snapshot ainda. Faça upload ou gere via Edge.
                </div>
              ) : snapshotUrl ? (
                <img
                  src={snapshotUrl}
                  alt="Snapshot atual"
                  className="w-full rounded-lg border border-gray-200"
                />
              ) : (
                <div className="text-xs text-gray-500">
                  {snapshotMessage || "Nenhum snapshot disponível."}
                </div>
              )}
              <div className="flex items-center gap-2">
                {canEditRoi && (
                  <button
                    type="button"
                    onClick={handleSelectSnapshot}
                    disabled={uploadSnapshotMutation.isPending}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      uploadSnapshotMutation.isPending
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {uploadSnapshotMutation.isPending ? "Enviando..." : "Enviar snapshot"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSnapshotChange}
                  className="hidden"
                />
              </div>
              <div className="text-[11px] text-gray-500">
                Snapshot para configuração (ainda não validado).
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700">
                Zonas ({effectiveShapes.length})
              </h4>
              {effectiveShapes.length === 0 ? (
                <p className="text-xs text-gray-500 mt-2">
                  Nenhuma zona criada ainda.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {effectiveShapes.map((shape) => (
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
                      {canEditRoi && (
                        <button
                          type="button"
                          onClick={() => removeShape(shape.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remover
                        </button>
                      )}
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

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  image?: HTMLImageElement | null
) => {
  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  if (image) {
    ctx.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }
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
