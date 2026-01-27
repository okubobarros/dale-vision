// frontend/src/pages/Onboarding/components/CamerasSetup.tsx
import { useMemo, useState } from "react"

export type CameraDraft = {
  id: string
  name: string
  ip: string
  rtspPort: string
  httpPort: string
  username: string
  password: string
  manufacturer: string
  model: string
  channel: string
  streamType: "main" | "sub"
  location: string
  status: "online" | "offline"
}

const MANUFACTURERS = ["Intelbras", "Hikvision", "Dahua", "TP-Link", "Genérica (ONVIF)", "Outro"]
const LOCATIONS = ["Entrada", "Saída", "Caixa", "Corredor", "Estoque", "Geral", "Outro"]

function isProbablyIpOrHost(v: string) {
  if (!v.trim()) return false
  // aceita ip ou hostname simples (demo)
  return /^[a-zA-Z0-9.\-]+$/.test(v.trim())
}

export default function CamerasSetup({
  cameras,
  onChange,
  onPrev,
  onNext,
}: {
  cameras: CameraDraft[]
  onChange: (v: CameraDraft[]) => void
  onPrev: () => void
  onNext: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [touched, setTouched] = useState(false)

  const [form, setForm] = useState({
    name: "",
    ip: "",
    rtspPort: "554",
    httpPort: "80",
    username: "admin",
    password: "",
    manufacturer: "",
    model: "",
    channel: "1",
    streamType: "main" as "main" | "sub",
    location: "",
  })

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (cameras.length >= 3) e.limit = "Trial permite até 3 câmeras."
    if (!isProbablyIpOrHost(form.ip)) e.ip = "Informe IP/host válido."
    if (!form.username.trim()) e.username = "Informe usuário."
    if (!form.password.trim()) e.password = "Informe senha."
    if (!form.manufacturer) e.manufacturer = "Selecione o fabricante."
    if (!form.location) e.location = "Selecione a localização."
    if (!form.rtspPort.trim()) e.rtspPort = "Informe porta RTSP."
    if (!form.httpPort.trim()) e.httpPort = "Informe porta HTTP."
    return e
  }, [form, cameras.length])

  const canAdd = Object.keys(errors).length === 0

  async function simulateTest() {
    setTouched(true)
    if (!isProbablyIpOrHost(form.ip) || !form.username.trim() || !form.password.trim()) return
    setTesting(true)
    await new Promise((r) => setTimeout(r, 1200))
    setTesting(false)
  }

  async function addCamera() {
    setTouched(true)
    if (!canAdd) return

    // simula teste antes de adicionar (para o demo)
    setTesting(true)
    await new Promise((r) => setTimeout(r, 900))
    setTesting(false)

    const cam: CameraDraft = {
      id: String(Date.now()),
      name: form.name.trim() || `Câmera ${cameras.length + 1}`,
      ip: form.ip.trim(),
      rtspPort: form.rtspPort.trim(),
      httpPort: form.httpPort.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      manufacturer: form.manufacturer,
      model: form.model.trim(),
      channel: form.channel.trim() || "1",
      streamType: form.streamType,
      location: form.location,
      status: "online",
    }

    onChange([...cameras, cam])

    setForm({
      name: "",
      ip: "",
      rtspPort: "554",
      httpPort: "80",
      username: "admin",
      password: "",
      manufacturer: "",
      model: "",
      channel: "1",
      streamType: "main",
      location: "",
    })
    setTouched(false)
  }

  function removeCamera(id: string) {
    onChange(cameras.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold">Conectar suas Câmeras</h3>
        <p className="text-white/60 mt-1">
          Para ativar alertas, precisamos das credenciais de acesso (RTSP/ONVIF).
        </p>
      </div>

      {/* Guia */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
        <div className="font-semibold">O que precisamos para conectar (piloto)</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="font-semibold text-white mb-2">Credenciais</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP/Host da câmera</li>
              <li>Usuário e senha</li>
              <li>Porta RTSP (geralmente 554)</li>
              <li>Porta HTTP (80/8080)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="font-semibold text-white mb-2">Detalhes técnicos</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fabricante (Intelbras / Hikvision / Dahua...)</li>
              <li>Modelo (opcional, ajuda suporte)</li>
              <li>Canal (DVR/NVR: 1,2,3...)</li>
              <li>Stream (main/sub)</li>
            </ul>
          </div>
        </div>

        <div className="text-xs text-white/50">
          No trial: <span className="font-semibold text-white">até 3 câmeras</span>. Depois dá para expandir.
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="font-semibold">Adicionar câmera</div>

        {errors.limit && <p className="text-xs text-yellow-300">{errors.limit}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/80">Nome (opcional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="Ex: Entrada"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-white/80">IP/Host *</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="Ex: 192.168.1.100"
              value={form.ip}
              onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))}
            />
            {touched && errors.ip && <p className="mt-2 text-xs text-red-300">{errors.ip}</p>}
          </div>

          <div>
            <label className="text-sm text-white/80">Porta RTSP *</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="554"
              value={form.rtspPort}
              onChange={(e) => setForm((p) => ({ ...p, rtspPort: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Porta HTTP *</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="80"
              value={form.httpPort}
              onChange={(e) => setForm((p) => ({ ...p, httpPort: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Usuário *</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="admin"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            />
            {touched && errors.username && <p className="mt-2 text-xs text-red-300">{errors.username}</p>}
          </div>

          <div>
            <label className="text-sm text-white/80">Senha *</label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="Senha da câmera"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            {touched && errors.password && <p className="mt-2 text-xs text-red-300">{errors.password}</p>}
          </div>

          <div>
            <label className="text-sm text-white/80">Fabricante *</label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              value={form.manufacturer}
              onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {MANUFACTURERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {touched && errors.manufacturer && <p className="mt-2 text-xs text-red-300">{errors.manufacturer}</p>}
          </div>

          <div>
            <label className="text-sm text-white/80">Localização *</label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {touched && errors.location && <p className="mt-2 text-xs text-red-300">{errors.location}</p>}
          </div>

          <div>
            <label className="text-sm text-white/80">Modelo (opcional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="Ex: DS-2CD..."
              value={form.model}
              onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Canal</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              placeholder="1"
              value={form.channel}
              onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm text-white/80">Stream</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, streamType: "main" }))}
                className={[
                  "rounded-xl border px-4 py-3 text-sm font-semibold",
                  form.streamType === "main"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5",
                ].join(" ")}
              >
                Main (melhor qualidade)
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, streamType: "sub" }))}
                className={[
                  "rounded-xl border px-4 py-3 text-sm font-semibold",
                  form.streamType === "sub"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5",
                ].join(" ")}
              >
                Sub (mais leve)
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={simulateTest}
            disabled={testing}
            className="w-full sm:w-1/2 rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10 disabled:opacity-60"
          >
            {testing ? "Testando..." : "Testar Conexão"}
          </button>
          <button
            type="button"
            onClick={addCamera}
            disabled={!canAdd || testing}
            className="w-full sm:w-1/2 rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            Adicionar Câmera
          </button>
        </div>
      </div>

      {/* Lista */}
      {cameras.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="font-semibold">Câmeras conectadas</div>
            <div className="text-sm text-white/60">{cameras.length}/3</div>
          </div>

          <div className="divide-y divide-white/10">
            {cameras.map((c) => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-white/60">
                    {c.manufacturer} • {c.ip} • {c.location}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="text-green-300">Online</span>
                  </div>

                  <button
                    onClick={() => removeCamera(c.id)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onPrev}
          className="w-full sm:w-1/2 rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          className="w-full sm:w-1/2 rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-500"
        >
          ✅ Concluir Onboarding
        </button>
      </div>
    </div>
  )
}
