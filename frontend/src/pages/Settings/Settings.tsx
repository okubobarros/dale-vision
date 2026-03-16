import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import EdgeSetupModal from "../../components/EdgeSetupModal"
import { storesService, type StoreSummary, type StoreEdgeUpdateEvent } from "../../services/stores"

const Settings = () => {
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(false)
  const [stores, setStores] = useState<StoreSummary[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [policyLoading, setPolicyLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [policySaving, setPolicySaving] = useState(false)
  const [policyError, setPolicyError] = useState<string | null>(null)
  const [policySuccess, setPolicySuccess] = useState<string | null>(null)
  const [events, setEvents] = useState<StoreEdgeUpdateEvent[]>([])
  const [targetVersion, setTargetVersion] = useState("")
  const [channel, setChannel] = useState<"stable" | "canary">("stable")
  const [packageUrl, setPackageUrl] = useState("")
  const [packageSha, setPackageSha] = useState("")

  useEffect(() => {
    let mounted = true
    storesService
      .getStoresSummary()
      .then((items) => {
        if (!mounted) return
        setStores(items)
        if (items.length > 0) setSelectedStoreId(items[0].id)
      })
      .catch(() => {
        if (!mounted) return
        setStores([])
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedStoreId) return
    let mounted = true
    setPolicyLoading(true)
    setPolicyError(null)
    storesService
      .getStoreEdgeUpdatePolicy(selectedStoreId)
      .then((response) => {
        if (!mounted) return
        setTargetVersion(response.policy.target_version ?? "")
        setChannel(response.policy.channel)
        setPackageUrl(response.policy.package?.url ?? "")
        setPackageSha(response.policy.package?.sha256 ?? "")
      })
      .catch(() => {
        if (!mounted) return
        setPolicyError("Não foi possível carregar a policy de auto-update da loja.")
      })
      .finally(() => {
        if (!mounted) return
        setPolicyLoading(false)
      })

    setEventsLoading(true)
    storesService
      .getStoreEdgeUpdateEvents(selectedStoreId, { limit: 10 })
      .then((response) => {
        if (!mounted) return
        setEvents(response.items ?? [])
      })
      .catch(() => {
        if (!mounted) return
        setEvents([])
      })
      .finally(() => {
        if (!mounted) return
        setEventsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedStoreId])

  const selectedStoreName = useMemo(
    () => stores.find((store) => store.id === selectedStoreId)?.name ?? "Loja",
    [stores, selectedStoreId]
  )

  const handleSavePolicy = async () => {
    if (!selectedStoreId) return
    if (!targetVersion || !packageUrl || !packageSha) {
      setPolicyError("Preencha versão alvo, package URL e SHA256.")
      return
    }
    setPolicySaving(true)
    setPolicyError(null)
    setPolicySuccess(null)
    try {
      await storesService.updateStoreEdgeUpdatePolicy(selectedStoreId, {
        channel,
        target_version: targetVersion,
        package: {
          url: packageUrl,
          sha256: packageSha,
        },
      })
      setPolicySuccess("Policy de auto-update atualizada com sucesso.")
    } catch {
      setPolicyError("Falha ao salvar policy de auto-update.")
    } finally {
      setPolicySaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
        <p className="text-sm text-gray-600 mt-1">
          Acesse a página de analytics no desktop.
        </p>
        <Link
          to="/app/analytics"
          className="mt-4 inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ir para Analytics
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800">Edge Setup</h2>
        <p className="text-sm text-gray-600 mt-1">
          Gere o .env do agente e valide conexão com a API.
        </p>
        <button
          type="button"
          onClick={() => setEdgeSetupOpen(true)}
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Abrir Edge Setup
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800">Configurações de câmeras</h2>
        <p className="text-sm text-gray-600 mt-1">
          Inclua, remova e ajuste câmeras da operação.
        </p>
        <Link
          to="/app/cameras"
          className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Gerenciar câmeras
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Auto-update do Edge Agent</h2>
        <p className="text-sm text-gray-600">
          Defina a versão alvo por loja e acompanhe os últimos eventos de atualização.
        </p>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Loja</label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
          >
            <option value="">Selecione uma loja</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStoreId && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Versão alvo
                </label>
                <input
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                  placeholder="ex: 1.5.0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Canal</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value === "canary" ? "canary" : "stable")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                >
                  <option value="stable">stable</option>
                  <option value="canary">canary</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Package URL
                </label>
                <input
                  value={packageUrl}
                  onChange={(e) => setPackageUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                  placeholder="https://cdn.dalevision.com/edge/..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  SHA256
                </label>
                <input
                  value={packageSha}
                  onChange={(e) => setPackageSha(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                  placeholder="hash sha256 do pacote"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSavePolicy}
                disabled={policySaving || policyLoading}
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {policySaving ? "Salvando..." : "Salvar policy"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEventsLoading(true)
                  storesService
                    .getStoreEdgeUpdateEvents(selectedStoreId, { limit: 10 })
                    .then((response) => setEvents(response.items ?? []))
                    .finally(() => setEventsLoading(false))
                }}
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Atualizar timeline
              </button>
            </div>

            {policyError && <p className="text-sm text-rose-600">{policyError}</p>}
            {policySuccess && <p className="text-sm text-emerald-600">{policySuccess}</p>}

            <div className="rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Últimos eventos de update - {selectedStoreName}
                </h3>
              </div>
              <div className="max-h-64 overflow-auto">
                {eventsLoading ? (
                  <p className="px-4 py-3 text-sm text-gray-500">Carregando eventos...</p>
                ) : events.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    Sem eventos recentes de auto-update para esta loja.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Evento</th>
                        <th className="px-4 py-2 text-left">Versão</th>
                        <th className="px-4 py-2 text-left">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((item) => (
                        <tr key={item.event_id} className="border-t border-gray-100">
                          <td className="px-4 py-2 font-medium text-gray-700">{item.status}</td>
                          <td className="px-4 py-2 text-gray-600">{item.event}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {item.from_version ?? "-"} → {item.to_version ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{item.timestamp ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <EdgeSetupModal open={edgeSetupOpen} onClose={() => setEdgeSetupOpen(false)} />
    </div>
  )
}

export default Settings
