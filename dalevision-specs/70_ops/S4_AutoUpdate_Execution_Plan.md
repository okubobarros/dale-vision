# S4 Auto-Update Execution Plan

Data base: 2026-03-15  
Status: `IN_PROGRESS (ENG AVANCADA / CAMPO PENDENTE)`  
Dependência de campo: baixa (execução majoritariamente remota)

## Objetivo
Implementar auto-update seguro do edge-agent para reduzir visitas presenciais, acelerar iteração de CV e manter frota consistente.

## Escopo da sprint (S4-UPD)
- Contrato de update policy e update report.
- Pipeline de rollout por canal (`canary`/`stable`).
- Health gate pós-update com rollback automático.
- Observabilidade operacional por loja/agent.

## Dependências
- Sprint 2 engenharia/gov concluída.
- Tokens edge válidos por loja.
- Processo de release de pacote no `dalevision-edge-agent`.

## Tickets (ordem recomendada)

## Atualizacao de execucao (2026-03-16)
- `S4-UPD-01` avancou em backend com:
  - `GET /api/v1/edge/update-policy/` retornando `policy_id`, `policy_updated_at`, `policy_fingerprint`;
  - `POST /api/v1/edge/update-report/` com `idempotency_key` persistente e dedupe race-safe.
- Validacao runtime concluida:
  - primeira chamada `update-report` => `deduped=false`;
  - retry idêntico => `deduped=true` com mesmo `event_id`.
- Pendencia para fechar `S4-UPD-01`:
  - alinhar executor do edge-agent ao novo campo `idempotency_key` em todos os eventos de update.

## Atualizacao complementar (2026-03-16 / noite)
Entregas concluídas desde a ultima revisao:
- Edge-agent (`dalevision-edge-agent`):
  - `attempt` de rollout deixou de ser fixo e passou a ser incremental por tentativa.
  - contexto da tentativa foi persistido em `pending.json` e reutilizado no `health_check` pos-restart.
  - eventos de update agora preservam correlacao por tentativa (`started`, `downloaded`, `verified`, `activated`, `healthy`, `failed`).
- Backend/API (`dale-vision`):
  - resumo de rollout da rede ganhou filtro por canal (`all`, `stable`, `canary`).
  - resposta de resumo inclui `filters.channel`, contadores de `version_gap` e leitura de `current_version`.
- Frontend (`/app/operations`, `/app/reports`, `/app/dashboard`):
  - visao de rollout ganhou filtro por canal nas 3 superficies.
  - leitura executiva passou a exibir `versao atual`, `versao alvo` e `gap` por loja critica.

Leitura atual de estado por ticket:
- `S4-UPD-01`: `DONE (ENG)` / `PENDING (campo)`
- `S4-UPD-02`: `DONE (ENG)` / `PENDING (campo)`
- `S4-UPD-03`: `DONE (ENG)` / `PENDING (canary real)`
- `S4-UPD-04`: `DONE (ENG)` / `PENDING (rollback validado em loja)`
- `S4-UPD-05`: `DONE (ENG)`

### S4-UPD-01: Contrato e política de update
Owner: Backend  
Repos: `dale-vision`  
Entregáveis:
- endpoint `GET /api/v1/edge/update-policy/`;
- persistência de política por loja (`channel`, `target_version`, janela, health gate);
- contrato em `docs/contracts/CONTRACT_EDGE_AUTO_UPDATE_V1.md`.

DoD:
- policy responde por loja/agent com versão alvo;
- autenticação edge validada;
- testes de acesso e fallback sem policy.

### S4-UPD-02: Telemetria de update
Owner: Backend + Edge  
Repos: `dale-vision`, `dalevision-edge-agent`  
Entregáveis:
- endpoint `POST /api/v1/edge/update-report/`;
- eventos canônicos (`started`, `downloaded`, `verified`, `activated`, `healthy`, `rolled_back`, `failed`);
- reason codes padronizados.

DoD:
- timeline de update visível por loja/agent;
- falhas têm `reason_code` e `phase`.

### S4-UPD-03: Executor de update no edge-agent
Owner: Edge  
Repo: `dalevision-edge-agent`  
Entregáveis:
- polling de policy;
- download + checksum;
- swap atômico para `releases/<version>`;
- lock de update (sem concorrência).

DoD:
- update idempotente;
- sem corrupção da versão ativa;
- logs locais claros.

### S4-UPD-04: Health gate + rollback automático
Owner: Edge + Backend  
Repos: `dalevision-edge-agent`, `dale-vision`  
Entregáveis:
- health gate pós-update (heartbeat + camera health);
- rollback em falha de gate;
- report explícito `rolled_back`.

DoD:
- rollback <= 5 min no cenário de falha;
- loja retorna para estado operacional sem intervenção manual.

### S4-UPD-05: Observabilidade e suporte
Owner: Backend + Produto  
Repo: `dale-vision`  
Entregáveis:
- visão por loja: `current_version`, `target_version`, `last_update_status`, `last_update_at`;
- filtro por `canary`/`stable`;
- runbook operacional de update/rollback.

DoD:
- suporte consegue diagnosticar falha de update em <= 10 min;
- dashboard/ops com status de frota minimamente acionável.

## Critérios de aceite da S4
1. Canary 1 loja atualizado com sucesso.
2. Rollout em 5 lojas sem regressão crítica.
3. Pelo menos 1 cenário de rollback validado em teste controlado.
4. Telemetria completa disponível para auditoria de update.

## Checklist de fechamento (GO/NO-GO)

### Bloco tecnico (engenharia)
- [x] `update-policy` com fingerprint e governanca de policy ativa por loja.
- [x] `update-report` idempotente com dedupe em retry.
- [x] executor edge com lock, janela de rollout, min-supported e health gate.
- [x] correlacao de tentativa (`attempt`) persistida no ciclo pre/post restart.
- [x] observabilidade executiva de rollout em Dashboard, Reports e Operations.

### Bloco operacional (campo)
- [ ] canary real em 1 loja com timeline completa (`started -> healthy`) sem intervencao manual.
- [ ] simular 1 falha controlada e evidenciar `failed` + rollback + retorno operacional.
- [ ] validar 5 lojas com rollout em lote sem degradacao critica.
- [ ] anexar evidencia de suporte (diagnostico em <= 10 min por loja critica).

Regra de decisao:
- `GO` somente com 4/4 itens de campo concluídos.
- sem isso, status permanece `IN_PROGRESS (FIELD PENDING)`.

## Riscos e mitigação
- Risco: rede instável na loja -> Mitigação: retry/backoff + timeout de download.
- Risco: pacote corrompido -> Mitigação: checksum obrigatório.
- Risco: update quebra ingestão -> Mitigação: health gate + rollback automático.
- Risco: drift de versão -> Mitigação: painel de frota + alvo por canal.

## Sequência de execução (7 dias)
1. D1: contrato + endpoints mockados.
2. D2: persistência policy + reports.
3. D3: executor update no edge (download/checksum/swap).
4. D4: health gate + rollback.
5. D5: canary em 1 loja.
6. D6: rollout em 5 lojas.
7. D7: relatório S4 + decisão GO/NO-GO para escala.

## Proximo passo objetivo (imediato)
1. Rodar canary real na loja piloto remota (janela controlada).
2. Capturar evidencias em `Daily_Log` + ticket S4-UPD correspondente.
3. Executar teste de rollback controlado e anexar runbook/evidencia.
4. Consolidar decisao final S4 (`GO` ou `NO-GO`) no fim da semana.

## Roteiro pratico para validacao de campo (amanha)

1. Antes da mudanca:
- confirmar policy ativa da loja (`channel`, `target_version`, janela, health gate).
- confirmar status baseline da loja em `/app/operations` (sem critico aberto fora do update).

2. Durante canary:
- acompanhar timeline de update em tempo real (`started`, `downloaded`, `verified`, `activated`, `healthy`).
- se houver falha, validar evento `failed` com `reason_code` e comportamento de recuperacao.

3. Depois da janela:
- gerar pacote de evidencias S4 com comando:

```bash
python manage.py edge_s4_validation_pack --hours 24 --store-id <STORE_ID>
```

- opcional (JSON para anexar em ticket):

```bash
python manage.py edge_s4_validation_pack --hours 24 --store-id <STORE_ID> --json-output dalevision-specs/70_ops/S4_Field_Validation_Pack_<STORE_ID>.json
```

Saidas:
- markdown: `dalevision-specs/70_ops/S4_Field_Validation_Pack_YYYY-MM-DD.md`
- decisao automatica inicial: `GO`/`NO-GO` baseada em canary + telemetria + falha/rollback evidenciado.
