# Board de Retorno à Loja (12/03/2026 ou 13/03/2026)

## Contexto
- Data da visita mais recente: 09/03/2026 (segunda-feira).
- Situação observada em campo: operação instável do edge-agent, perda de heartbeat/camera health após período curto, confiança do cliente impactada.
- Próxima janela de retorno em loja: quinta-feira (12/03/2026) ou sexta-feira (13/03/2026).

## Objetivo desta janela
- Chegar na loja com plano executado e validado remotamente.
- Evitar troubleshooting improvisado em campo.
- Demonstrar confiabilidade operacional mínima com evidência.

## Sprint atual e referencia oficial
- Sprint atual: `S0 - Stabilize Edge in Production`
- Referencia completa de proximos passos: `dalevision-specs/70_ops/Sprint_Execution_Reference.md`

## Regra de execução
- Nenhuma tarefa é considerada concluída sem evidência objetiva (log, teste repetível, endpoint/status).
- Tudo que for feito deve atualizar este board no mesmo dia.
- Se qualquer item crítico estiver em vermelho, a visita vira `NO-GO` para demonstração comercial.
- Owner vazio nao e permitido: toda tarefa deve ter dono explicito.

## Definições de status
- `TODO`: não iniciado.
- `IN_PROGRESS`: em execução.
- `BLOCKED`: bloqueado por dependência técnica/infra/acesso.
- `READY_FOR_STORE`: validado remotamente, pronto para reteste na loja.
- `DONE`: validado remotamente e validado na loja.

---

## Trilha Crítica (não negociável)

### 1) Autostart e Sustentação do Agente
`Status`: TODO  
`Risco`: CRÍTICO  
`DoR`:
- build e launcher definidos como padrão único;
- método de startup único aprovado (sem caminhos concorrentes).
`Teste remoto obrigatório`:
- 5 ciclos de reboot/login;
- após cada reboot: `heartbeat status=201` + `camera health posted=3/3`;
- sem intervenção manual.
`Evidência mínima`:
- trecho de `run_agent.log` com reinício controlado (se houver queda);
- trecho de `agent.log` com 10+ minutos contínuos de atividade.
`DoD`:
- sustentação estável por >= 30 min pós-reboot.

### 2) Integridade por Câmera (sem sobrescrita)
`Status`: TODO  
`Risco`: CRÍTICO  
`DoR`:
- mapeamento físico `camera_id -> função` fechado (entrada, balcão, salão);
- ROI publicado por câmera correta.
`Teste remoto obrigatório`:
- validar que cada evento atômico persiste no `camera_id` correto;
- validar que métricas de uma câmera não aparecem em outra.
`Evidência mínima`:
- consulta de auditoria (`vision/audit`) com eventos separados por câmera.
`DoD`:
- 0 casos de contaminação entre câmeras em validação.

### 3) Proxy vs Métrica Oficial (governança)
`Status`: TODO  
`Risco`: ALTO  
`DoR`:
- critérios de métrica oficial/proxy documentados na loja piloto.
`Teste remoto obrigatório`:
- analytics exibe labels corretos (`official | proxy | estimated`);
- checkout proxy não é apresentado como venda real.
`Evidência mínima`:
- prints de Analytics + payload com `metric_type` e `ownership`.
`DoD`:
- leitura operacional sem ambiguidade para o cliente.

### 4) ROI e Operação (Entrada, Balcão, Salão)
`Status`: TODO  
`Risco`: ALTO  
`DoR`:
- ROI v2 publicado nas 3 câmeras com shape correto.
`Teste remoto obrigatório`:
- `entry_exit`: pelo menos 1 `vision.crossing.v1`;
- `balcão`: `vision.queue_state.v1` e `vision.checkout_proxy.v1`;
- `salão`: `vision.zone_occupancy.v1`.
`Evidência mínima`:
- eventos no backend + timestamp recente.
`DoD`:
- trilha atômica ativa nas três funções.

---

## Trilha de Produto (preparo comercial)

### 5) Playbook Segmento: Gelateria + Café (Shopping)
`Status`: TODO  
`Risco`: ALTO  
`DoR`:
- regras operacionais e metas mínimas definidas.
`Entregável`:
- playbook de ação (fila, ociosidade, ocupação, caixa, RH/celular);
- impacto estimado (economia/receita protegida) em linguagem executiva.
`DoD`:
- versão v1 aprovada para uso em conversa com cliente.

### 6) Relatório Executivo de 1 Página (piloto)
`Status`: TODO  
`Risco`: MÉDIO  
`DoR`:
- baseline operacional disponível e métricas recentes.
`Entregável`:
- problema principal;
- ação recomendada;
- impacto estimado;
- nível de confiança do dado.
`DoD`:
- material pronto para apresentar ao cliente na visita.

### 7) Ground Truth (arranque)
`Status`: TODO  
`Risco`: MÉDIO  
`DoR`:
- taxonomia de eventos fechada para piloto.
`Entregável`:
- plano fase 1 (amostra inicial, critérios de anotação, Kappa alvo).
`DoD`:
- protocolo mínimo de validação humana definido (mesmo sem escala completa).

---

## Board de Execução (atualizar diariamente)

| Item | Owner | Status | Próxima ação objetiva | Evidência esperada | Bloqueio |
|---|---|---|---|---|---|
| Autostart estável | Engenharia Edge | IN_PROGRESS | Congelar metodo unico (Task Scheduler ou Startup) e remover alternativas | logs com 5 reboots ok | Acesso remoto host loja |
| Sustentação pós-reboot | Engenharia Edge | TODO | Rodar soak test 30 min sem shell aberta | heartbeat + health continuos | Instabilidade de internet local |
| Integridade por câmera | Backend + Produto | TODO | Validar `camera_id` em eventos atômicos por funcao | visao audit por camera | Mapeamento fisico incompleto |
| Proxy x oficial | Produto | TODO | Revisar labels/queries no analytics e mensagens | print + payload coerentes | Ajustes finos de copy/UI |
| ROI 3 funções | Operacao + Produto | TODO | Revalidar entrada/balcao/salao em ambiente real | 4 eventos atômicos ativos | Necessita janela na loja |
| Playbook gelateria/café | Produto | TODO | Publicar versao v1 com thresholds e acoes | doc aprovado | Falta baseline final |
| Relatório 1 página | Produto + CS | TODO | Gerar template com dados reais do piloto | PDF/markdown final | Confianca por metrica pendente |
| Protocolo ground truth v1 | Produto + Dados | TODO | Definir amostra, criterios e checklist | checklist de anotacao | Sem rotina de anotacao ainda |

---

## Roteiro diário até a visita (execução)

### D-2 (10/03/2026)
- Fechar metodo unico de autostart e documentar comando oficial.
- Executar 5 reboots/login e registrar evidencias por ciclo.
- Rodar soak de 30 min e registrar janela completa.
- Atualizar status de itens 1 e 2 no board.

### D-1 (11/03/2026)
- Auditar integridade por camera no `vision/audit`.
- Revisar proxy x oficial no analytics (labels + narrativa).
- Congelar playbook v1 gelateria/cafe.
- Rascunhar relatorio executivo v1 com baseline disponivel.

### D-0 (12/03/2026 ou 13/03/2026 pre-visita)
- Revalidar checklist GO/NO-GO completo.
- Separar pacote de evidencias (logs, prints, consultas) em uma pasta unica.
- Definir plano A/B de campo:
- Plano A: somente validacao final.
- Plano B: recovery rapido se host reiniciar e nao subir.
- Se qualquer item critico estiver `BLOCKED`, visita vira tecnica e nao comercial.

---

## Definition of Ready por tarefa crítica

### Autostart e Sustentação
- Launcher unico definido.
- Comando oficial de start documentado.
- Sem task/atalho concorrente ativo.

### Integridade por Camera
- Tabela `camera_id -> funcao -> ROI` validada.
- Eventos atomicos com ownership esperado por camera.

### Proxy x Oficial
- Todas as metricas do piloto classificadas (`official | proxy | estimated`).
- Copy de dashboard sem ambiguidade de negocio.

---

## Gate de Go/No-Go para ir à loja

### GO (todos obrigatórios)
- [ ] Autostart aprovado em 5 reboots seguidos.
- [ ] Sustentação >= 30 min sem intervenção.
- [ ] `camera health` recente para 3/3.
- [ ] Eventos atômicos essenciais ativos (`crossing`, `queue_state`, `checkout_proxy`, `zone_occupancy`).
- [ ] Playbook do segmento pronto.
- [ ] Relatório executivo de 1 página pronto.

### NO-GO (qualquer item abaixo)
- [ ] último heartbeat antigo (> 3 min sem explicação).
- [ ] processo depende de janela aberta/manual.
- [ ] métricas contaminadas entre câmeras.
- [ ] dashboard com inconsistência não explicada entre status e logs.

---

## Registro de evolução (preencher contínuo)

### 10/03/2026
- Highlights:
- Bloqueios:
- Decisões:
- Próximos passos:

### 11/03/2026
- Highlights:
- Bloqueios:
- Decisões:
- Próximos passos:

### 12/03/2026 (pré-visita)
- Highlights:
- Bloqueios:
- Decisões:
- Próximos passos:
