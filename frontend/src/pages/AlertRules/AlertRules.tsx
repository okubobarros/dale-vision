// frontend/src/pages/AlertRules/AlertRules.tsx
// src/pages/AlertRules/AlertRules.tsx
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { alertsService, type AlertRule } from "../../services/alerts"

type Severity = "critical" | "warning" | "info"

const defaultChannels = { dashboard: true, email: false, whatsapp: false }

export default function AlertRulesPage() {
  const qc = useQueryClient()

  const [storeId, setStoreId] = useState<string>("")
  const [type, setType] = useState("queue_long")
  const [severity, setSeverity] = useState<Severity>("warning")
  const [cooldown, setCooldown] = useState<number>(15)
  const [active, setActive] = useState(true)
  const [channels, setChannels] = useState(defaultChannels)

  const [showCreate, setShowCreate] = useState(true)

  // ✅ stores do CORE (UUID)
  const storesQ = useQuery({
    queryKey: ["alerts", "coreStores"],
    queryFn: alertsService.listCoreStores,
  })

  // seta store default
  useEffect(() => {
    if (!storeId && storesQ.data?.length) {
      setStoreId(String(storesQ.data[0].id))
    }
  }, [storeId, storesQ.data])

  // ✅ regras por store UUID
  const rulesQ = useQuery({
    queryKey: ["alerts", "rules", storeId],
    queryFn: () => alertsService.listRules(storeId),
    enabled: Boolean(storeId),
  })

  const createMut = useMutation({
    mutationFn: (payload: Partial<AlertRule> & { store_id: string }) =>
      alertsService.createRule(payload),
    onSuccess: async () => {
      toast.success("Regra criada ✅")
      await qc.invalidateQueries({ queryKey: ["alerts", "rules", storeId] })
      setShowCreate(false)
    },
    onError: (err: any) => {
      console.error(err)
      toast.error("Erro ao salvar regra. Verifique o backend e tente novamente.")
    },
  })

  const rules = useMemo(() => rulesQ.data ?? [], [rulesQ.data])

  function toggleChannel(key: "dashboard" | "email" | "whatsapp") {
    setChannels((c) => ({ ...c, [key]: !c[key] }))
  }

  async function handleCreate() {
    if (!storeId) {
      toast.error("Selecione uma loja")
      return
    }
    if (!type.trim()) {
      toast.error("Informe o tipo do evento")
      return
    }

    createMut.mutate({
      store_id: storeId, // service converte pra "store"
      type: type.trim(),
      severity,
      cooldown_minutes: Number(cooldown) || 0,
      active,
      channels,
      threshold: {},
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regras de Alertas</h1>
          <p className="text-gray-600">
            Configure quais eventos geram alertas e por quais canais.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => rulesQ.refetch()}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Nova Regra
          </button>
        </div>
      </div>

      {/* Store select */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-gray-900">Loja</div>
            <div className="text-sm text-gray-500">Selecione a loja para gerenciar as regras.</div>
            {storeId && <div className="text-sm text-blue-700 mt-2">Selecionada: {storesQ.data?.find(s => s.id === storeId)?.name}</div>}
          </div>

          <div className="w-full md:w-80">
            <label className="sr-only" htmlFor="rules-store">Loja</label>
            <select
              id="rules-store"
              aria-label="Selecionar loja"
              title="Selecionar loja"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              disabled={storesQ.isLoading}
            >
              {(storesQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Criar regra</h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">Tipo do evento</label>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="queue_long"
              />
              <div className="mt-2 text-xs text-gray-500">
                Ex.: queue_long, staff_missing, suspicious_cancel
              </div>
            </div>

            <div>
              <label htmlFor="rule-severity" className="text-sm font-semibold text-gray-700">
                Severidade
              </label>

              <select
                id="rule-severity"
                aria-label="Severidade da regra"
                title="Severidade da regra"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </select>
            </div>


            <div>
              <label htmlFor="rule-cooldown" className="text-sm font-semibold text-gray-700">
                Cooldown (min)
              </label>

              <input
                id="rule-cooldown"
                aria-label="Cooldown em minutos"
                title="Cooldown em minutos"
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                min={0}
                placeholder="15"
              />

              <div className="mt-2 text-xs text-gray-500">
                Evita spam do mesmo alerta por X minutos.
              </div>
            </div>


            <div className="flex items-start gap-3 pt-7">
              <input
                id="rule-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <label htmlFor="rule-active" className="text-sm">
                <div className="font-semibold text-gray-800">Regra ativa</div>
                <div className="text-xs text-gray-500">
                  Se desativada, eventos continuam sendo criados, mas não geram notificações.
                </div>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-700">Canais</div>
            <div className="mt-3 flex flex-wrap gap-4">
              {(["dashboard", "email", "whatsapp"] as const).map((k) => (
                <label key={k} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={channels[k]}
                    onChange={() => toggleChannel(k)}
                    className="h-4 w-4"
                  />
                  {k}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!storeId || createMut.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {createMut.isPending ? "Criando..." : "Criar regra"}
            </button>
          </div>

          {createMut.isError && (
            <div className="mt-3 text-sm text-red-600">
              Erro ao salvar regra. Verifique o backend e tente novamente.
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="font-bold text-gray-900">Regras cadastradas</div>
          <div className="text-sm text-gray-500">{rules.length} itens</div>
        </div>

        <div className="p-4">
          {rulesQ.isLoading && <div className="text-gray-600">Carregando regras...</div>}
          {rulesQ.isError && <div className="text-red-600">Erro ao carregar regras.</div>}

          {!rulesQ.isLoading && !rulesQ.isError && rules.length === 0 && (
            <div className="text-gray-600">Nenhuma regra cadastrada.</div>
          )}

          {!rulesQ.isLoading && !rulesQ.isError && rules.length > 0 && (
            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">{r.type}</div>
                    <div className="text-xs text-gray-500">
                      sev: {r.severity} • cooldown: {r.cooldown_minutes}m • {r.active ? "ativa" : "inativa"}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    canais:{" "}
                    {Object.entries(r.channels ?? defaultChannels)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ") || "nenhum"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
