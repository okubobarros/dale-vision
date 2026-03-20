import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  alertsService,
  type AlertRule,
  type NotificationLog,
} from "../../services/alerts"
import { trackJourneyEvent } from "../../services/journey"
import { AlertsModuleTabs } from "../../components/Alerts/AlertsModuleTabs"

type Severity = "critical" | "warning" | "info"
type RuleQualityLevel = "alto" | "medio" | "baixo"
type RuleCreateErrorInfo = {
  message: string
  details: string[]
}
type RuleSuggestion = {
  type: "increase_cooldown" | "review_channels"
  title: string
  description: string
  nextCooldownMinutes?: number
}
type RuleQualitySnapshot = {
  score: number
  level: RuleQualityLevel
  totalLogs: number
  suppressionRate: number
  failureRate: number
  suggestion: RuleSuggestion | null
}

const defaultChannels = { dashboard: true, email: false, whatsapp: false }
const severityLabel: Record<Severity, string> = {
  critical: "Critico",
  warning: "Atencao",
  info: "Informativo",
}
const eventTypeLabel: Record<string, string> = {
  queue_long: "Fila longa",
  staff_missing: "Equipe insuficiente",
  suspicious_cancel: "Cancelamento suspeito",
}
const validEventTypes = Object.keys(eventTypeLabel)
const qualityBadgeClass: Record<RuleQualityLevel, string> = {
  alto: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medio: "border-amber-200 bg-amber-50 text-amber-800",
  baixo: "border-red-200 bg-red-50 text-red-700",
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const toPct = (value: number) => `${Math.round(value * 100)}%`

const parseRuleCreateError = (err: unknown): RuleCreateErrorInfo => {
  const error = err as {
    message?: string
    response?: {
      data?: {
        detail?: string
        message?: string
        details?: unknown
        type?: string[]
      } & Record<string, unknown>
    }
  }
  const data = error.response?.data
  const details: string[] = []

  if (data?.detail) details.push(String(data.detail))
  if (data?.message && data.message !== data.detail) details.push(String(data.message))

  const backendDetails = data?.details
  if (Array.isArray(backendDetails)) {
    details.push(...backendDetails.map(String))
  } else if (backendDetails && typeof backendDetails === "object") {
    Object.entries(backendDetails as Record<string, unknown>).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => details.push(`${field}: ${String(item)}`))
      } else if (value != null) {
        details.push(`${field}: ${String(value)}`)
      }
    })
  }

  if (Array.isArray(data?.type) && data.type.length > 0) {
    details.push(`Evento invalido: ${data.type.join(", ")}`)
  }

  const rawMessage = (error.message || "").toLowerCase()
  const hasEventHint =
    details.some((item) => item.toLowerCase().includes("evento")) ||
    rawMessage.includes("queue_long") ||
    rawMessage.includes("tipo")
  if (hasEventHint) {
    details.push(`Eventos validos: ${validEventTypes.join(", ")}`)
  }

  if (details.length === 0 && error.message) {
    details.push(error.message)
  }

  return {
    message: details[0] || "Erro ao salvar regra.",
    details,
  }
}

const buildRuleQuality = (rule: AlertRule, logs: NotificationLog[]): RuleQualitySnapshot => {
  const totalLogs = logs.length
  const suppressed = logs.filter((l) => l.status === "suppressed").length
  const failed = logs.filter((l) => l.status === "failed").length
  const suppressionRate = totalLogs > 0 ? suppressed / totalLogs : 0
  const failureRate = totalLogs > 0 ? failed / totalLogs : 0
  const base = totalLogs === 0 ? 60 : 100
  const score = Math.round(clamp(base - suppressionRate * 60 - failureRate * 40, 0, 100))
  const level: RuleQualityLevel = score >= 80 ? "alto" : score >= 55 ? "medio" : "baixo"

  let suggestion: RuleSuggestion | null = null
  const currentCooldown = Number(rule.cooldown_minutes || 0)
  if (totalLogs >= 6 && suppressionRate >= 0.4) {
    const nextCooldown = clamp(currentCooldown + 5, 0, 120)
    if (nextCooldown > currentCooldown) {
      suggestion = {
        type: "increase_cooldown",
        title: "Sugestao: aumentar cooldown",
        description: `Ruido alto (${toPct(
          suppressionRate
        )}) detectado para esta regra. Aumentar cooldown reduz repeticao no turno.`,
        nextCooldownMinutes: nextCooldown,
      }
    }
  } else if (
    totalLogs >= 6 &&
    failureRate >= 0.2 &&
    (Boolean(rule.channels?.email) || Boolean(rule.channels?.whatsapp))
  ) {
    suggestion = {
      type: "review_channels",
      title: "Sugestao: revisar canais de entrega",
      description: `Taxa de falha de entrega em ${toPct(
        failureRate
      )}. Confira destino/credenciais de canais antes de aumentar volume.`,
    }
  }

  return {
    score,
    level,
    totalLogs,
    suppressionRate,
    failureRate,
    suggestion,
  }
}

export default function AlertRulesPage() {
  const qc = useQueryClient()
  const trackedSuggestionKeysRef = useRef<Set<string>>(new Set())

  const [storeIdOverride, setStoreIdOverride] = useState<string | null>(null)
  const [type, setType] = useState("queue_long")
  const [severity, setSeverity] = useState<Severity>("warning")
  const [cooldown, setCooldown] = useState<number>(15)
  const [active, setActive] = useState(true)
  const [channels, setChannels] = useState(defaultChannels)
  const [createError, setCreateError] = useState<RuleCreateErrorInfo | null>(null)
  const [showCreate, setShowCreate] = useState(true)
  const [applyingRuleId, setApplyingRuleId] = useState<string | null>(null)

  const storesQ = useQuery({
    queryKey: ["alerts", "coreStores"],
    queryFn: alertsService.listCoreStores,
  })

  const storeId = useMemo(() => {
    if (storeIdOverride !== null) return storeIdOverride
    const firstStoreId = storesQ.data?.[0]?.id
    return firstStoreId ? String(firstStoreId) : ""
  }, [storeIdOverride, storesQ.data])

  const rulesQ = useQuery({
    queryKey: ["alerts", "rules", storeId],
    queryFn: () => alertsService.listRules(storeId),
    enabled: Boolean(storeId),
  })

  const logsQ = useQuery({
    queryKey: ["alerts", "rules", "logs", storeId],
    queryFn: () => alertsService.listLogs({ store_id: storeId }),
    enabled: Boolean(storeId),
  })

  const createMut = useMutation({
    mutationFn: (payload: Partial<AlertRule> & { store_id: string }) =>
      alertsService.createRule(payload),
    onSuccess: async () => {
      setCreateError(null)
      toast.success("Regra criada")
      await qc.invalidateQueries({ queryKey: ["alerts", "rules", storeId] })
      await qc.invalidateQueries({ queryKey: ["alerts", "rules", "logs", storeId] })
      setShowCreate(false)
    },
    onError: (err: unknown) => {
      const parsed = parseRuleCreateError(err)
      setCreateError(parsed)
      toast.error(parsed.message)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({
      ruleId,
      payload,
    }: {
      ruleId: string
      payload: Partial<AlertRule> & { store_id?: string }
    }) => alertsService.updateRule(ruleId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["alerts", "rules", storeId] })
      await qc.invalidateQueries({ queryKey: ["alerts", "rules", "logs", storeId] })
    },
  })

  const rules = useMemo(() => rulesQ.data ?? [], [rulesQ.data])

  const qualityByRule = useMemo(() => {
    const logsByRule = new Map<string, NotificationLog[]>()
    for (const log of logsQ.data ?? []) {
      const ruleId = log.rule_id ? String(log.rule_id) : ""
      if (!ruleId) continue
      const bucket = logsByRule.get(ruleId) ?? []
      bucket.push(log)
      logsByRule.set(ruleId, bucket)
    }

    return new Map<string, RuleQualitySnapshot>(
      rules.map((rule) => [String(rule.id), buildRuleQuality(rule, logsByRule.get(String(rule.id)) ?? [])])
    )
  }, [rules, logsQ.data])

  useEffect(() => {
    if (!storeId || rules.length === 0) return
    const lowQualityCount = rules.filter(
      (rule) => qualityByRule.get(String(rule.id))?.level === "baixo"
    ).length
    void trackJourneyEvent("alert_rule_quality_viewed", {
      store_id: storeId,
      rules_count: rules.length,
      low_quality_rules: lowQualityCount,
    })
  }, [storeId, rules, qualityByRule])

  useEffect(() => {
    if (!storeId) return
    rules.forEach((rule) => {
      const quality = qualityByRule.get(String(rule.id))
      if (!quality?.suggestion) return
      const key = `${storeId}:${rule.id}:${quality.suggestion.type}`
      if (trackedSuggestionKeysRef.current.has(key)) return
      trackedSuggestionKeysRef.current.add(key)
      void trackJourneyEvent("alert_rule_suggestion_shown", {
        store_id: storeId,
        rule_id: String(rule.id),
        suggestion_type: quality.suggestion.type,
        quality_level: quality.level,
        quality_score: quality.score,
      })
    })
  }, [storeId, rules, qualityByRule])

  function toggleChannel(key: "dashboard" | "email" | "whatsapp") {
    setChannels((current) => ({ ...current, [key]: !current[key] }))
  }

  function handleCreate() {
    if (!storeId) {
      toast.error("Selecione uma loja")
      return
    }
    if (!type.trim()) {
      toast.error("Informe o tipo do evento")
      return
    }
    setCreateError(null)

    createMut.mutate({
      store_id: storeId,
      type: type.trim(),
      severity,
      cooldown_minutes: Number(cooldown) || 0,
      active,
      channels,
      threshold: {},
    })
  }

  async function handleApplySuggestion(rule: AlertRule, quality: RuleQualitySnapshot) {
    const suggestion = quality.suggestion
    if (!suggestion || suggestion.type !== "increase_cooldown") return

    const nextCooldown = suggestion.nextCooldownMinutes
    if (typeof nextCooldown !== "number") return

    setApplyingRuleId(String(rule.id))
    try {
      await updateMut.mutateAsync({
        ruleId: String(rule.id),
        payload: { cooldown_minutes: nextCooldown },
      })
      toast.success(`Cooldown ajustado para ${nextCooldown} min`)
      void trackJourneyEvent("alert_rule_suggestion_applied", {
        store_id: storeId || null,
        rule_id: String(rule.id),
        suggestion_type: suggestion.type,
        old_cooldown_minutes: Number(rule.cooldown_minutes || 0),
        new_cooldown_minutes: nextCooldown,
        quality_level: quality.level,
        quality_score: quality.score,
      })
    } catch {
      toast.error("Falha ao aplicar sugestao automaticamente.")
    } finally {
      setApplyingRuleId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regras de Alertas</h1>
          <p className="text-gray-600">
            Defina quando a operacao deve disparar alertas e acompanhe a qualidade de cada regra.
          </p>
          <div className="mt-3">
            <AlertsModuleTabs />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void rulesQ.refetch()
              void logsQ.refetch()
            }}
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

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-gray-900">Loja</div>
            <div className="text-sm text-gray-500">Selecione a loja para gerenciar as regras.</div>
            {storeId && (
              <div className="mt-2 text-sm text-blue-700">
                Selecionada: {storesQ.data?.find((store) => String(store.id) === storeId)?.name}
              </div>
            )}
          </div>

          <div className="w-full md:w-80">
            <label className="sr-only" htmlFor="rules-store">
              Loja
            </label>
            <select
              id="rules-store"
              aria-label="Selecionar loja"
              title="Selecionar loja"
              value={storeId}
              onChange={(e) => setStoreIdOverride(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              disabled={storesQ.isLoading}
            >
              {(storesQ.data ?? []).map((store) => (
                <option key={String(store.id)} value={String(store.id)}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
              <label className="text-sm font-semibold text-gray-700">Evento monitorado</label>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Ex.: queue_long (fila longa)"
              />
              <div className="mt-2 text-xs text-gray-500">
                Use chaves operacionais existentes: queue_long, staff_missing, suspicious_cancel.
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
                <option value="critical">Critico</option>
                <option value="warning">Atencao</option>
                <option value="info">Informativo</option>
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
                Evita repeticao excessiva do mesmo alerta por X minutos.
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
                  Se desativada, eventos continuam sendo criados, mas nao geram notificacoes.
                </div>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-700">Canais</div>
            <div className="mt-3 flex flex-wrap gap-4">
              {(["dashboard", "email", "whatsapp"] as const).map((channelKey) => (
                <label key={channelKey} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={channels[channelKey]}
                    onChange={() => toggleChannel(channelKey)}
                    className="h-4 w-4"
                  />
                  {channelKey === "dashboard"
                    ? "Dashboard"
                    : channelKey === "email"
                      ? "E-mail"
                      : "WhatsApp"}
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

          {createError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">{createError.message}</p>
              {createError.details.length > 1 && (
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {createError.details.slice(1).map((detail, index) => (
                    <li key={`${detail}-${index}`}>{detail}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs">
                Eventos validos: <span className="font-semibold">{validEventTypes.join(", ")}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="font-bold text-gray-900">Regras cadastradas</div>
          <div className="text-sm text-gray-500">{rules.length} itens</div>
        </div>

        <div className="p-4">
          {(rulesQ.isLoading || logsQ.isLoading) && (
            <div className="text-gray-600">Carregando regras e qualidade...</div>
          )}
          {(rulesQ.isError || logsQ.isError) && (
            <div className="text-red-600">Erro ao carregar regras/qualidade.</div>
          )}

          {!rulesQ.isLoading && !rulesQ.isError && rules.length === 0 && (
            <div className="text-gray-600">Nenhuma regra cadastrada.</div>
          )}

          {!rulesQ.isLoading && !rulesQ.isError && rules.length > 0 && (
            <div className="space-y-3">
              {rules.map((rule) => {
                const quality = qualityByRule.get(String(rule.id))
                const suggestion = quality?.suggestion
                const channelsLabel =
                  Object.entries(rule.channels ?? defaultChannels)
                    .filter(([, enabled]) => enabled)
                    .map(([channel]) =>
                      channel === "dashboard"
                        ? "Dashboard"
                        : channel === "email"
                          ? "E-mail"
                          : "WhatsApp"
                    )
                    .join(", ") || "nenhum"

                return (
                  <div key={String(rule.id)} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-gray-900">
                        {eventTypeLabel[rule.type] || rule.type}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          severidade:{" "}
                          {severityLabel[(rule.severity || "info") as Severity] || rule.severity}
                        </span>
                        <span>cooldown: {rule.cooldown_minutes}m</span>
                        <span>{rule.active ? "ativa" : "inativa"}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">canais: {channelsLabel}</div>

                    {quality && (
                      <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-800">Qualidade da regra</div>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${
                              qualityBadgeClass[quality.level]
                            }`}
                          >
                            {quality.level.toUpperCase()} - score {quality.score}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-600 md:grid-cols-3">
                          <div>Volume analisado: {quality.totalLogs} logs</div>
                          <div>Ruido (suppressed): {toPct(quality.suppressionRate)}</div>
                          <div>Falha de entrega: {toPct(quality.failureRate)}</div>
                        </div>

                        {suggestion && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <div className="text-sm font-semibold text-amber-900">
                              {suggestion.title}
                            </div>
                            <p className="mt-1 text-xs text-amber-800">{suggestion.description}</p>
                            {suggestion.type === "increase_cooldown" ? (
                              <button
                                type="button"
                                onClick={() => void handleApplySuggestion(rule, quality)}
                                disabled={applyingRuleId === String(rule.id) || updateMut.isPending}
                                className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                              >
                                {applyingRuleId === String(rule.id)
                                  ? "Aplicando..."
                                  : `Aplicar cooldown ${suggestion.nextCooldownMinutes}m`}
                              </button>
                            ) : (
                              <p className="mt-2 text-xs text-amber-900">
                                Acao recomendada: revisar destinos em{" "}
                                <a
                                  href="/app/alerts/history"
                                  className="font-semibold underline"
                                >
                                  Historico de Alertas
                                </a>
                                .
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
