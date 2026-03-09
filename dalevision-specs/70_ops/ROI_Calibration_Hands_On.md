# Hands-On de Calibracao ROI v2

## Objetivo
Garantir que cada loja veja valor real nas metricas e que o admin consiga dar suporte,
manutencao e ajuste fino sem transformar o produto em uma caixa-preta.

## Principios
- Cada numero exibido precisa ser explicavel para o cliente.
- Cada metrica operacional precisa ter uma camera dona.
- O ROI deve refletir a operacao real da loja, nao um desenho generico.
- Metricas padrao sao o baseline; metricas especificas por segmento sao extensoes controladas.

## Passo 1 - Definir a funcao de cada camera
- `entrada`: dona de fluxo de entrada/saida.
- `balcao`: dona de fila, checkout proxy e equipe ativa.
- `salao`: dona de ocupacao e permanencia por zona.

Se duas cameras enxergam a mesma area, escolher apenas uma como `primary` para cada metrica.

## Passo 2 - Escolher o shape correto
- `line`: usar somente para `entry_exit`.
- `poly`: usar como padrao para `queue`, `checkout_proxy`, `occupancy` e metricas customizadas.
- `rect`: usar apenas quando a area for simples e a perspectiva nao distorcer a leitura.

## Passo 3 - Nomear o ROI com semantica operacional
- Entrada: `linha_entrada_principal`
- Balcao: `area_atendimento_fila`, `ponto_pagamento`, `zona_funcionario_caixa`
- Salao: `area_consumo`, `mesa_01`, `mesa_02`, `espera_salao`

O nome deve ajudar suporte e cliente a responder: "o que exatamente esta sendo medido aqui?"

## Passo 4 - Publicar com ownership
Para cada ROI publicado, confirmar:
- `metric_type` coerente com o objetivo operacional
- `ownership=primary` na camera dona
- `ownership=secondary` apenas para apoio e calibracao
- `zone_id`, `roi_entity_id` e `roi_version` presentes no contrato

## Passo 5 - Validar contra observacao humana
- Entrada: comparar 100 cruzamentos manuais vs sistema.
- Balcao: comparar 30 atendimentos/pagamentos observados vs `checkout_events`.
- Fila: erro maximo aceitavel de 1 pessoa na maior parte do tempo.
- Salao: ocupacao por zona precisa bater com a leitura humana da operacao.
- Salao: `dwell_seconds_est` deve ser conferido como permanencia media estimada por trilha local, nao como verdade consolidada multi-camera.

## Passo 5.1 - Conferir trilha auditavel
Depois da validacao visual no ambiente:
- abrir `Analytics > Auditoria de Visao`
- filtrar por `vision.crossing.v1`, `vision.queue_state.v1`, `vision.checkout_proxy.v1` e `vision.zone_occupancy.v1`
- confirmar `camera_id`, `roi_entity_id`, `zone_id`, valor e timestamp
- verificar se o evento atomico reflete a cena observada e se a metrica derivada no dashboard bate com o esperado

## Passo 6 - Aprovar valor para o cliente
Antes de considerar a loja pronta, o gestor precisa conseguir responder:
- "Qual camera explica esse numero?"
- "Qual ROI foi usado?"
- "Isso e contagem oficial ou proxy?"
- "Se eu mudar equipe ou layout, consigo ver o impacto?"

Se a resposta for "nao sei", a metrica ainda nao esta pronta para venda.

## Passo 6.1 - Registrar calibracao manual no produto
Depois da validacao assistida:
- abrir `Analytics > Registrar Calibracao Manual`
- selecionar a metrica pela secao de confianca operacional ou pelo plano de recalibracao
- informar:
  - `manual_sample_size`
  - `manual_reference_value`
  - `system_value`
  - `notes`
- salvar aprovacao manual para persistir em `store_calibration_runs`

Resultado esperado:
- a metrica passa a exibir ultima calibracao, erro observado, aprovador e timestamp
- o historico da loja mostra a trilha de calibracoes recentes
- apenas `owner`, `admin` e `manager` conseguem aprovar manualmente

## Passo 7 - Manutencao e ajuste fino
Recalibrar quando houver:
- mudanca de layout
- troca de lente ou altura
- reposicionamento da camera
- reflexo, contraluz ou oclusao novos
- necessidade de metrica especifica por segmento

## Passo 7.1 - Checklist para teste na rede da loja
Antes de iniciar teste real:
- confirmar que a loja esta apontando para o backend correto
- confirmar que o edge-agent autentica e envia heartbeat
- validar RTSP/ONVIF e snapshot recente por camera
- garantir que a ROI publicada corresponde ao layout atual da loja
- abrir `Analytics > Confianca Operacional de Visao` e verificar se a loja nao esta cega

Durante o teste:
- registrar eventos reais de `entrada`, `fila`, `checkout proxy` e `ocupacao`
- comparar observacao humana com trilha em `Auditoria de Visao`
- registrar ao menos uma calibracao manual por papel de camera

Ao final:
- classificar cada metrica como `pronto`, `parcial` ou `recalibrar`
- registrar observacoes operacionais no campo `notes`
- documentar cameras/ROIs que ainda exigem ajuste antes de comparacao multi-loja

## Metricas padrao
- entradas unicas por loja
- saidas unicas por loja
- fila media, p95 e maxima por balcao
- checkout proxy por balcao
- equipe ativa estimada por janela
- ocupacao por zona
- permanencia media estimada por zona (`dwell_seconds_est` por camera)

## Metricas especificas por negocio
- provador ocupado
- fila de self-checkout
- mesas ativas por setor
- corredor quente
- espera em retirada/pickup

Essas metricas so entram no produto quando tiverem:
- pergunta de negocio clara
- ownership definido
- ROI semanticamente correto
- validacao manual inicial
