# Plano Executável - Edge Estável até Produto Escalável

## Objetivo
Sair de operação "funciona às vezes" para operação auditável e escalável, com foco em:
1. Sustentação do edge (autostart + heartbeat).
2. Fonte única de verdade no backend.
3. Qualidade de dados de visão (ground truth + calibração + drift).
4. Playbooks acionáveis por segmento.

## Regra de execução
- Não iniciar item de prioridade menor com dependência aberta.
- Cada task só fecha com evidência objetiva (log, query, screenshot, relatório).
- Se falhar teste de aceite, volta para `In Progress`.

## Quadro de execução (Kanban)

### S0 - Bloqueador (execução imediata)

#### TASK-S0-01 - Clean reset operacional padronizado
- Entregável: runbook único para limpeza total + reinstalação limpa (local/loja).
- DoR:
  - acesso admin no Windows.
  - versão do zip candidata definida.
- DoD:
  - limpeza remove tasks/processos/pastas sem resíduos.
  - reinstalação reproduzível em 1 tentativa.
- Teste:
  - executar checklist completo em máquina local.
  - `schtasks /Query` sem tasks antigas antes da reinstalação.
- Evidência:
  - logs antes/depois + print de `03_VERIFICAR_STATUS`.
- Status inicial: DONE (runbook criado em `Edge_Autostart_Clean_Reset_Runbook.md`).

#### TASK-S0-02 - Autostart silencioso e sustentado
- Entregável: task de logon executando launcher silencioso, sem janela acoplada.
- DoR:
  - pacote release inclui launcher silencioso.
  - `.env` com `DALE_LOG_DIR` absoluto.
- DoD:
  - após reboot, heartbeat contínuo por >= 15 min sem intervenção manual.
  - fechar janelas do terminal não derruba processo principal.
- Teste:
  - reboot + monitorar `agent.log` e dashboard por 15 min.
- Evidência:
  - trecho `agent.log` com heartbeats 201 contínuos.
  - `LastRun` atualizado na task.
- Como fazer:
  1. instalar autostart com pacote novo.
  2. validar `Task to run` apontando para launcher silencioso.
  3. validar `C:\ProgramData\DaleVision\logs\agent.log`.

#### TASK-S0-03 - Perfil de estabilização no Edge Setup
- Entregável: frontend gera `.env` com perfil "estabilização".
- DoR:
  - store selecionada.
  - token edge disponível.
- DoD:
  - `.env` contém `VISION_ENABLED=0`, `CAMERA_SYNC_ENABLED=0`, `CAMERAS_JSON=[]`, `STARTUP_TASK_ENABLED=0`.
- Teste:
  - copiar `.env` do modal e comparar conteúdo.
- Evidência:
  - screenshot do modal + `.env` gerado.
- Status inicial: DONE (ajuste aplicado em `EdgeSetupModal.tsx`).

#### TASK-S0-04 - Contrato de projeção obrigatório (hard fail)
- Entregável: ingestão/projeção rejeita evento sem campos críticos.
- DoR:
  - lista de campos obrigatórios aprovada:
    - `store_id`, `camera_id`, `metric_type`, `ownership`, `roi_entity_id`, `ts`.
- DoD:
  - payload inválido não atualiza métricas.
  - erro é logado com motivo explícito.
- Teste:
  - enviar evento válido e inválido, comparar efeito nas tabelas de projeção.
- Evidência:
  - query SQL antes/depois + log de rejeição.

### S1 - Fundação de produto (após S0)

#### TASK-S1-01 - Backend como fonte única de câmeras
- Entregável: operação padrão sem `CAMERAS_JSON` manual.
- DoR:
  - câmera cadastrada no app.
  - endpoint de sync saudável.
- DoD:
  - edge carrega câmeras do backend e mantém operação.
  - edição no app reflete no edge sem editar `.env`.
- Teste:
  - alterar câmera no modal, sincronizar e verificar consumo no edge.
- Evidência:
  - log de sync + status de câmera atualizado no app.

#### TASK-S1-02 - Isolamento forte por câmera/ROI (anti-contaminação)
- Entregável: chave de projeção e persistência por câmera/ROI/métrica.
- DoR:
  - schema com constraints/unique keys definidas por granularidade.
- DoD:
  - evento de uma câmera não sobrescreve outra.
  - métricas por câmera ficam consistentes em 24h.
- Teste:
  - cenário com 3 câmeras simultâneas e comparação por `camera_id`.
- Evidência:
  - queries de consistência sem colisão.

#### TASK-S1-03 - Observabilidade operacional mínima
- Entregável: painel técnico com 5 sinais por loja:
  - heartbeat freshness
  - camera_health freshness
  - event lag
  - projection lag
  - uptime do agente
- DoR:
  - eventos e timestamps já persistidos.
- DoD:
  - status OK/WARN/FAIL automático por threshold.
- Teste:
  - simular parada e verificar mudança de estado.
- Evidência:
  - screenshot + query de suporte.

### S2 - Qualidade de dados e ROI de negócio

#### TASK-S2-01 - Pipeline de Ground Truth (MVP)
- Entregável: rotina auditável de validação de acurácia por câmera/métrica.
- DoR:
  - critérios de amostragem definidos.
  - checklist de anotação definido.
- DoD:
  - baseline inicial registrado.
  - histórico de calibração consultável por loja.
- Teste:
  - executar lote piloto de validação e registrar erro%.
- Evidência:
  - relatório de calibração por câmera.

#### TASK-S2-02 - Detecção de drift operacional
- Entregável: alerta quando qualidade degrada além do limite.
- DoR:
  - baseline disponível.
  - thresholds aprovados (ex: erro > X% por Y janelas).
- DoD:
  - câmera entra em `recalibrar` automaticamente quando necessário.
- Teste:
  - injetar cenário de degradação e validar gatilho.
- Evidência:
  - evento de drift + item no plano de recalibração.

#### TASK-S2-03 - Playbooks por segmento (food/vestuário/conveniência)
- Entregável: regras acionáveis com impacto estimado.
- DoR:
  - metas operacionais por segmento definidas.
- DoD:
  - cada métrica possui "ação recomendada" + impacto esperado.
- Teste:
  - revisão com 1 cliente piloto por segmento.
- Evidência:
  - playbook publicado + feedback documentado.

#### TASK-S2-04 - Resumo executivo de impacto
- Entregável: relatório semanal de 1 página por loja.
- DoR:
  - métricas confiáveis em produção.
- DoD:
  - relatório inclui baseline, ganho e próxima ação.
- Teste:
  - gerar e validar relatório de uma loja piloto.
- Evidência:
  - PDF/relatório salvo com data/hora.

## Sequência recomendada de execução
1. TASK-S0-02
2. TASK-S0-04
3. TASK-S1-01
4. TASK-S1-02
5. TASK-S1-03
6. TASK-S2-01
7. TASK-S2-02
8. TASK-S2-03
9. TASK-S2-04

## O que iniciar hoje (sem depender da ida à loja)
1. Fechar TASK-S0-02 com teste de reboot local e evidência em log.
2. Implementar TASK-S0-04 (validação hard fail de contrato no backend/projeção).
3. Abrir branch técnica para TASK-S1-01 e mapear lacunas de sync de câmeras.
4. Criar consultas SQL permanentes de saúde para suporte remoto.

## Critério de pronto da Sprint atual
- S0 concluído com evidência.
- S1 com ao menos `S1-01` e `S1-02` em produção controlada.
- nenhum incidente de "offline sem diagnóstico" sem runbook aplicado.
