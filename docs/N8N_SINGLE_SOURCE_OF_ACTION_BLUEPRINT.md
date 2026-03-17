# N8N Single Source of Action Blueprint (V1)

Data: 2026-03-16  
Escopo: desenhar o fluxo n8n que conecta eventos do DALE Vision ao ciclo completo `sinal -> ação -> outcome -> ledger`.

## 1) Fontes reais de evento no backend

### 1.1 Action dispatch (ja implementado)
- Origem: `POST /api/v1/alerts/actions/dispatch/`
- Emissor: `apps/alerts/services.py::send_event_to_n8n`
- Evento enviado: `event_name = action_dispatched`
- Envelope: `{ event_id, event_name, event_version, ts, source, org_id, data, meta }`

### 1.2 Status operacional store/camera (ja implementado)
- Origem: `apps/edge/status_events.py`
- Eventos enviados:
  - `store_status_changed`
  - `camera_status_changed`
- Controles ativos:
  - idempotencia via `receipt_id`
  - cooldown por escopo (`store:<id>` / `camera:<id>`)

## 2) Arquitetura n8n recomendada (4 workflows)

## WF-1 Event Router
Objetivo: normalizar envelope e rotear por tipo.

1. `Webhook` (POST)  
   Path sugerido: `/dalevision/events/v1`
2. `Set` (Normalize Envelope)
3. `Switch` por `event_name`
   - `action_dispatched` -> WF-2
   - `store_status_changed` / `camera_status_changed` -> WF-3
   - default -> sink de auditoria
4. `Respond to Webhook` (200 imediatamente)

Expressoes (n8n-expression-syntax):
- Evento: `{{$json.body.event_name}}`
- Store: `{{$json.body.data.store_id}}`
- Org: `{{$json.body.org_id}}`
- Event ID: `{{$json.body.event_id}}`

## WF-2 Action Execution + Outcome Callback
Objetivo: executar delegacao e atualizar status de execução (completion_rate real).

1. `Execute Workflow Trigger` (chamado pelo WF-1)
2. `IF` canal (`{{$json.data.channel}} == "whatsapp"`)
3. `HTTP Request` para provedor (WhatsApp/email)
4. `Set` resultado padronizado (`provider_message_id`, `delivery_status`, `error`)
5. `HTTP Request` para backend atualizar outcome

Endpoint backend atual para update:
- `PATCH /api/v1/copilot/stores/:store_id/actions/outcomes/:outcome_id/`
- `POST /api/v1/copilot/actions/outcomes/callback/` (novo)

Observacao pratica:
- O callback por `event_id` ja esta disponivel.
- Header de autenticacao: `X-N8N-SERVICE-TOKEN`.
- Correlacao: `event_id` -> `ActionOutcome.action_event_id`.

## WF-3 Operational Status Triage
Objetivo: converter status tecnico em ação operacional.

1. `Execute Workflow Trigger`
2. `Switch` por `event_name`
3. `IF` severidade
   - camera/store `offline` -> alerta imediato
   - `degraded` -> fila de observação
4. `Slack/Email/WhatsApp` para time de operações
5. Persistir log de notificação (opcional via backend API)

Expressoes uteis:
- Status atual: `{{$json.data.current_status}}`
- Razao: `{{$json.data.reason}}`
- Scope cooldown: `{{$json.data.cooldown_scope}}`

## WF-4 Daily Executive Digest
Objetivo: consolidado diário para CEO/ops.

1. `Schedule Trigger` (ex.: 08:00 BRT)
2. `HTTP Request` para:
   - `/api/v1/stores/network/edge-update-validation-summary/`
   - `/api/v1/reports/summary/` (se aplicável no tenant)
3. `Code`/`Set` para narrativa executiva
4. Envio WhatsApp/email resumo do dia

## 3) Padrao de governança no n8n

- Idempotencia no workflow: Data Store com chave `event_id`.
- Sem bloquear webhook: sempre responder 200 e processar em ramo assíncrono.
- Retry com backoff apenas em falhas transitórias (429/5xx).
- Dead-letter branch para payload inválido.
- Observabilidade minima:
  - taxa de sucesso por tipo de evento
  - latencia p95 por execução
  - volume por tenant/org

## 4) Code Node para monetização conservadora (Python)

Nota: n8n recomenda JavaScript na maioria dos casos. Use Python apenas quando necessário.

Exemplo (`Run once for all items`) para calcular faixa de impacto ponderada por confiança:

```python
items = _input.all()
out = []

for item in items:
    data = item["json"].get("data", {})
    expected = float(data.get("expected_impact_brl") or 0)
    confidence = int(data.get("confidence_score") or 0)

    if confidence >= 85:
        low = high = expected
        mode = "full"
    elif confidence >= 60:
        low = round(expected * 0.7, 2)
        high = round(expected * 0.9, 2)
        mode = "range"
    else:
        low = high = 0.0
        mode = "suppressed"

    out.append({
        "json": {
            **item["json"],
            "impact_model": {
                "mode": mode,
                "confidence": confidence,
                "low_brl": low,
                "high_brl": high,
            }
        }
    })

return out
```

## 5) Como montar com n8n-mcp-tools-expert (passo a passo)

1. Descobrir nodes:
- `search_nodes({"query":"webhook switch set http request"})`

2. Ver configuração de cada node:
- `get_node({"nodeType":"nodes-base.webhook"})`
- `get_node({"nodeType":"nodes-base.switch"})`
- `get_node({"nodeType":"nodes-base.httpRequest"})`

3. Validar configs:
- `validate_node({"nodeType":"nodes-base.webhook","config":{...},"profile":"runtime"})`

4. Criar workflow incremental:
- `n8n_create_workflow(...)`
- `n8n_update_partial_workflow(...)`
- `n8n_validate_workflow(...)`
- `activateWorkflow`

## 6) Gap atual para fechar ciclo 100%

1. Frontend: exibir funil completo `dispatch -> delivered -> completed/failed` (agora backend ja expõe `actions_delivered` e `delivery_rate` no summary por loja).
2. Endpoint de callback por `action_dispatch_id` nativo quando a entidade `action_dispatch` for criada no backend (hoje armazenado em metadata do outcome).
3. Outcome evaluation automatizada (WF-5) e ledger granular por acao (`value_ledger_entry`).
4. Human review e playbooks automatizados para casos ambiguos/criticos.

Com esses 4 pontos, o fluxo vira realmente `single source of action` com completion_rate confiável de ponta a ponta.
