// frontend/src/pages/Onboarding/components/CamerasSetup.tsx
import { useEffect, useMemo, useState } from "react"

export type CameraDraft = {
  count: number
  locations: string[]
}

const BASE_LOCATIONS = ["Entrada", "Saída", "Caixa", "Corredor", "Estoque", "Geral"]
const MAX_CAMERAS_TRIAL = 3

export default function CamerasSetup({
  value,
  onChange,
  onPrev,
  onNext,
  onConnectEdge,
}: {
  value: CameraDraft | null
  onChange: (v: CameraDraft) => void
  onPrev: () => void
  onNext: () => void
  onConnectEdge?: () => void
}) {
  const [touched, setTouched] = useState(false)
  const [count, setCount] = useState(value?.count ?? 1)
  const [selectedLocations, setSelectedLocations] = useState<string[]>(value?.locations ?? [])
  const [customTag, setCustomTag] = useState("")
  const [customLocations, setCustomLocations] = useState<string[]>(
    (value?.locations ?? []).filter((l) => !BASE_LOCATIONS.includes(l))
  )

  const locationOptions = useMemo(
    () => [...BASE_LOCATIONS, ...customLocations],
    [customLocations]
  )

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!count || count < 1) e.count = "Informe a quantidade de câmeras."
    if (count > MAX_CAMERAS_TRIAL) e.count = "Trial permite até 3 câmeras."
    if (selectedLocations.length === 0) e.locations = "Selecione ao menos 1 local."
    return e
  }, [count, selectedLocations.length])

  const canAdd = Object.keys(errors).length === 0

  useEffect(() => {
    onChange({
      count,
      locations: selectedLocations,
    })
  }, [count, selectedLocations, onChange])

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    )
  }

  const handleAddCustom = () => {
    const tag = customTag.trim()
    if (!tag) return
    const alreadyExists = locationOptions.some(
      (l) => l.toLowerCase() === tag.toLowerCase()
    )
    if (!alreadyExists) {
      setCustomLocations((prev) => [...prev, tag])
    }
    if (!selectedLocations.some((l) => l.toLowerCase() === tag.toLowerCase())) {
      setSelectedLocations((prev) => [...prev, tag])
    }
    setCustomTag("")
  }

  const handleNext = () => {
    setTouched(true)
    if (!canAdd) return
    onNext()
  }

  const handleConnectEdge = () => {
    setTouched(true)
    if (!canAdd) return
    if (onConnectEdge) {
      onConnectEdge()
      return
    }
    onNext()
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold">Configurar suas Câmeras</h3>
        <p className="text-white/60 mt-1">
          Nesta etapa inicial, queremos apenas quantidade e locais das câmeras.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="font-semibold">Resumo rápido</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/80">Quantidade de câmeras *</label>
            <input
              type="number"
              min={1}
              max={MAX_CAMERAS_TRIAL}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="Ex: 2"
              value={count}
              onChange={(e) => setCount(Number(e.target.value || 0))}
            />
            {touched && errors.count && <p className="mt-2 text-xs text-red-300">{errors.count}</p>}
            <p className="mt-2 text-xs text-white/50">No trial, até 3 câmeras.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm text-white/80">Locais das câmeras *</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {locationOptions.map((loc) => {
                const active = selectedLocations.includes(loc)
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleLocation(loc)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold border",
                      active
                        ? "border-blue-400/50 bg-blue-500/15 text-blue-200"
                        : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5",
                    ].join(" ")}
                  >
                    {loc}
                  </button>
                )
              })}
            </div>
            {touched && errors.locations && (
              <p className="mt-2 text-xs text-red-300">{errors.locations}</p>
            )}

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Adicionar outro local"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddCustom()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onPrev}
          className="w-full sm:w-1/2 rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10"
        >
          ← Voltar
        </button>
        <div className="w-full sm:w-1/2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleNext}
            disabled={!canAdd}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10 disabled:opacity-60"
          >
            Concluir depois
          </button>
          <button
            onClick={handleConnectEdge}
            disabled={!canAdd}
            className="w-full rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            Conectar Edge Agent
          </button>
        </div>
      </div>
    </div>
  )
}
