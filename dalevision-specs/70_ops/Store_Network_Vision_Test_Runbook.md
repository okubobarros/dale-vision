# Runbook - Teste de Visao na Rede da Loja

## Objetivo
Executar um teste operacional completo na loja para validar:
- conectividade do edge-agent
- saude das cameras
- emissao de eventos atomicos de visao
- reflexo no Analytics
- calibracao manual no produto

## Quando usar
- primeira ativacao da loja
- revisita tecnica depois de ajuste de RTSP/ROI
- validacao final antes de considerar a loja pronta

## Responsaveis
- operador local: acesso ao PC/NVR/cameras
- suporte/admin: acompanhamento no app e validacao de analytics

## Pre-requisitos
- backend e frontend apontando para o ambiente correto
- migration `edge.0009_store_calibration_runs` aplicada
- edge-agent atualizado e autenticando
- `.env` do agent com `STORE_ID`, `EDGE_TOKEN`, `CLOUD_BASE_URL`
- cameras cadastradas no app com IDs corretos
- RTSP validado no PC da loja
- ROI publicada para pelo menos:
  - `entrada`
  - `balcao`
  - `salao`

## Saida esperada
- loja online no app
- cameras online ou degraded controlado
- eventos `vision.crossing.v1`, `vision.queue_state.v1`, `vision.checkout_proxy.v1`, `vision.zone_occupancy.v1` chegando
- secao `Confianca Operacional de Visao` preenchida
- pelo menos uma calibracao manual salva por papel de camera

## Etapa 1 - Preparacao remota
1. Confirmar `STORE_ID` da loja.
2. Confirmar `EDGE_TOKEN` atual.
3. Confirmar que o agente usa o bundle mais recente.
4. Confirmar que nao ha copia antiga do agent rodando em paralelo.
5. Confirmar no app que as cameras existem e pertencem a loja correta.

## Etapa 2 - Preparacao local
1. Abrir o PC da loja.
2. Rodar `Diagnose.bat`.
3. Validar no resumo:
   - `edge_auth_ok=sim`
   - `edge_cameras_count > 0`
4. Rodar `02_TESTE_RAPIDO.bat` ou smoke equivalente.
5. Validar:
   - `heartbeat_ok=True`
   - `camera_health_posted == total_cameras`
   - `logs\\agent.log` atualizado

## Etapa 3 - Validacao de conectividade no app
1. Abrir `/app/dashboard`.
2. Confirmar:
   - loja online
   - `last_comm_at` recente
   - cameras `online` ou `degraded`
3. Abrir `/app/cameras`.
4. Confirmar snapshot recente em pelo menos uma camera por papel operacional.

## Etapa 4 - Validacao de ROI
1. Abrir o ROI Editor da camera de `entrada`.
2. Confirmar:
   - line publicada
   - direcao correta
   - `metric_type=entry_exit`
   - ownership correto
3. Repetir para `balcao`:
   - `area_atendimento_fila`
   - `ponto_pagamento`
   - `zona_funcionario_caixa`
4. Repetir para `salao`:
   - `area_consumo`
   - zonas principais de ocupacao

## Etapa 5 - Teste funcional em cena real
### Entrada
1. Fazer 5 a 10 cruzamentos reais na porta.
2. Confirmar no Analytics ou auditoria:
   - `vision.crossing.v1`
   - `direction` coerente
   - `camera_id`, `roi_entity_id` e timestamp corretos

### Balcao
1. Simular ou observar fila real.
2. Confirmar:
   - `vision.queue_state.v1`
   - `staff_active_est`
3. Simular ao menos 1 ciclo de atendimento/checkout.
4. Confirmar:
   - `vision.checkout_proxy.v1`
   - `duration_seconds`

### Salao
1. Manter pessoas na zona por alguns segundos.
2. Confirmar:
   - `vision.zone_occupancy.v1`
   - `count_value`
   - `duration_seconds` maior que zero quando houver permanencia

## Etapa 6 - Auditoria operacional
1. Abrir `/app/analytics`.
2. Ir em `Auditoria de Visao`.
3. Filtrar cada evento:
   - `vision.crossing.v1`
   - `vision.queue_state.v1`
   - `vision.checkout_proxy.v1`
   - `vision.zone_occupancy.v1`
4. Para cada um, conferir:
   - camera
   - ROI
   - valor
   - duracao quando aplicavel
   - timestamp

## Etapa 7 - Confianca operacional
1. Ainda no Analytics, abrir `Confianca Operacional de Visao`.
2. Confirmar status por camera/metrica:
   - `pronto`
   - `parcial`
   - `recalibrar`
3. Anotar motivos quando nao estiver `pronto`:
   - `roi_not_published`
   - `camera_not_healthy`
   - `stale_or_missing_events`
   - `low_event_volume`

## Etapa 8 - Plano de recalibracao
1. Abrir `Plano de Recalibracao`.
2. Confirmar se ha acoes abertas.
3. Para cada acao:
   - validar se a prioridade faz sentido
   - abrir o filtro de auditoria do evento relacionado
   - decidir se precisa corrigir ROI, camera ou pipeline

## Etapa 9 - Calibracao manual
Executar pelo menos uma calibracao manual por papel operacional.

### Entrada
1. Escolher a metrica `entry_exit`.
2. Contar manualmente uma amostra real.
3. Em `Registrar Calibracao Manual`, preencher:
   - `manual_sample_size`
   - `manual_reference_value`
   - `system_value`
   - `notes`
4. Salvar.

### Balcao
1. Repetir para `queue` ou `checkout_proxy`.

### Salao
1. Repetir para `occupancy`.

## Etapa 10 - Historico de calibracao
1. Abrir `Historico de Calibracao`.
2. Confirmar:
   - camera
   - metrica
   - ROI
   - erro observado
   - aprovador
   - data/hora

## Criterio minimo para considerar a loja pronta
- edge online e estavel
- camera_health chegando de forma continua
- ROI publicada nas cameras principais
- quatro eventos atomicos chegando quando a cena real acontece
- auditoria coerente com a operacao observada
- calibracao manual registrada para `entrada`, `balcao` e `salao`
- nenhum bloqueio critico em `Confianca Operacional de Visao`

## FAIL imediato
- loja offline no dashboard
- camera sem snapshot e sem health
- ROI nao publicada para camera principal
- evento nao aparece mesmo com cena real
- evento aparece com camera/ROI errados
- metrica segue cega apos validacao basica

## Evidencias para fechar o teste
- screenshot do dashboard com loja online
- screenshot da auditoria de visao por evento
- screenshot da confianca operacional
- screenshot do historico de calibracao
- `logs\\agent.log`
- observacoes de campo sobre oclusao, reflexo, contraluz, altura e layout

## Handoff apos o teste
Registrar no log operacional:
- data e loja
- cameras validadas
- metricas aprovadas
- metricas em `recalibrar`
- proximos ajustes necessarios antes do Slice 5
