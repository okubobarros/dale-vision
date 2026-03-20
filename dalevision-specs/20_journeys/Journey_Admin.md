# Journey - Admin (Org Admin / Store Manager)

## Objetivo de valor
Garantir operacao estavel e padronizada por loja, com resposta rapida a incidentes e melhoria continua de desempenho operacional.

## Perfil e escopo
- `Org Admin`: administra lojas, cameras, ROI operacional, regras de alerta e usuarios conforme permissao.
- `Store Manager`: foco em lojas sob seu escopo.
- Fora do escopo: governanca global SaaS (`/app/admin`) e billing owner-only.

## Rotas principais
- Operacao: `/app/dashboard`, `/app/operations`, `/app/operations/stores`, `/app/operations/stores/:storeId`.
- Setup e infraestrutura: `/app/cameras`, `/app/edge-help`, `/app/calibration`.
- Alertas: `/app/alerts`, `/app/alerts/rules`, `/app/alerts/history`.
- Analise: `/app/analytics`, `/app/reports`.
- Configuracoes: `/app/settings`, `/app/profile`.

## Jornada detalhada por etapa

| Etapa | Objetivo do usuario | Rota principal | Opcoes de caminho (rotas/acoes) | Features envolvidas | Valor real gerado |
|---|---|---|---|---|---|
| 1. Entrada operacional | Saber o que precisa de acao agora | `/app/dashboard` | Abrir recomendacao por loja em `/app/operations/stores/:storeId`; abrir alertas em `/app/alerts` | Dashboard operacional e blocos de prioridade | Menor tempo para detectar risco relevante |
| 2. Leitura da rede de lojas | Priorizar lojas com maior impacto | `/app/operations` | Filtrar por status; abrir detalhes da loja; acessar edge-help contextual | Visao multi-loja com saude edge/cameras | Alocacao mais eficiente da atencao do time |
| 3. Diagnostico por loja | Entender causa raiz local | `/app/operations/stores/:storeId` | Ir para `/app/cameras?store_id=...`; ir para `/app/alerts?store_id=...`; abrir copilot com contexto | Store details, trilha operacional, recomendacoes | Decisao baseada em evidencia da loja e nao em achismo |
| 4. Estabilizacao de infraestrutura | Eliminar causas tecnicas de ruido | `/app/cameras` | Testar conexao, editar camera, revisar health; falha recorrente -> `/app/edge-help` | Gestao de cameras, health, diagnostico edge | Dados mais confiaveis para acao operacional |
| 5. Calibracao e confianca de metrica | Melhorar qualidade de captura e semantica | `/app/calibration` | Abrir acao pendente, anexar evidencia antes/depois, concluir resultado | Backlog de calibracao com status e evidencias | Aumento da confiabilidade dos indicadores oficiais |
| 6. Resposta a eventos | Tratar risco operacional em tempo util | `/app/alerts` | Resolver, ignorar, delegar; rastrear impacto em analytics | Feed de alertas com contexto | Menor perda por fila, ociosidade e falha operacional |
| 7. Governanca de ruido | Ajustar regra para reduzir falso positivo | `/app/alerts/rules` | Ajustar limiar, cooldown, canal; validar historico em `/app/alerts/history` | Motor de regras + historico de notificacao | Melhor relacao sinal/ruido para o time |
| 8. Revisao de resultado | Confirmar melhora operacional e financeira | `/app/analytics` e `/app/reports` | Comparar periodo, cruzar alertas vs resultado, exportar evidencias | Analytics + relatorios executivos | Prova de impacto para replicar boas praticas |

## Service design (Admin/Manager)

| Momento | Acao do usuario (frontstage) | Sistema/operacao (backstage) | Feature chave | Valor percebido |
|---|---|---|---|---|
| Triagem | Abre dashboard e escolhe prioridades | Consolida sinais de operacao, edge e alertas | Dashboard + Operations | Foco rapido no que afeta resultado |
| Diagnostico | Investiga loja/camera com contexto | Relaciona heartbeat, health, eventos e backlog | Store details + Cameras | Causa raiz mais clara e menos retrabalho |
| Intervencao | Resolve alertas e ajusta regras | Regras recalculadas e trilha de notificacao | Alerts + Rules + History | Menos ruido e mais acao util |
| Melhoria continua | Executa calibracao por evidencia | Versiona acao e mede delta antes/depois | Calibration | Aumento progressivo da confiabilidade |
| Prestacao de contas | Consolida relatorio por periodo | Agregacao de KPI e export | Analytics + Reports | Transparencia para dono e operacao |

## User stories priorizadas
1. Como `Org Admin`, quero ver quais lojas estao em risco em uma tela para priorizar meu dia.
2. Como `Store Manager`, quero abrir detalhes da loja com um clique para agir sem troca excessiva de contexto.
3. Como `Org Admin`, quero diagnosticar camera degradada/offline para recuperar qualidade de dado rapido.
4. Como `Store Manager`, quero resolver e delegar alertas para reduzir tempo de resposta.
5. Como `Org Admin`, quero ajustar regras por loja/turno para reduzir alertas ruidosos.
6. Como `Store Manager`, quero evidenciar melhoria apos acao para validar que a intervencao funcionou.
7. Como `Org Admin`, quero comparar periodos e exportar relatorio para governanca semanal.
8. Como `Org Admin`, quero trilha auditavel das notificacoes para evitar perda de contexto.

## KPIs da jornada
- MTTA/MTTR de alertas criticos por loja.
- `%` de lojas online com heartbeat recente.
- `%` de cameras saudaveis por loja.
- Taxa de alertas acionaveis vs ruidosos.
- Tempo medio entre incidente detectado e acao registrada.

## Friccoes e caminhos de mitigacao
- Loja sem heartbeat: priorizar fluxo `/app/operations` -> `/app/edge-help`.
- Camera criada sem health: diagnosticar em `/app/cameras` antes de mexer em regra de negocio.
- Alerta em excesso: ajustar limite/cooldown em `/app/alerts/rules`.
- Decisao sem confianca: usar `/app/calibration` para validar antes/depois com evidencia.

## Alinhamento com a documentacao de produto
- Reforca o ciclo fechado de valor: evento detectado -> acao operacional -> melhoria mensuravel.
- Preserva foco em comportamento agregado (sem biometria/reconhecimento pessoal).
- Conecta operacao diaria a impacto financeiro (fila, conversao, produtividade).
