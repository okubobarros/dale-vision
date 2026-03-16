# S4 Auto-Update Execution Plan

Data base: 2026-03-15  
Status: `READY_FOR_BUILD`  
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
