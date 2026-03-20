# Journey - SaaS Admin Control Tower (Interno Dale Vision)

## Objetivo de valor
Dar ao time interno Dale Vision capacidade de operar a plataforma multi-tenant com confianca, reduzindo MTTR de incidentes e risco comercial (trial/billing/data quality).

## Perfil e escopo
- Perfil: `SaaS Admin` interno (`/app/admin`).
- Responsavel por saude da plataforma, governanca de dados, risco operacional, funil e habilitacao de escala.
- Nao substitui o fluxo operacional da loja; coordena e destrava.

## Rotas principais
- Control tower: `/app/admin`.
- Investigacao operacional: `/app/operations`, `/app/operations/stores/:storeId`.
- Saude de infraestrutura: `/app/cameras`, `/app/edge-help`, `/app/calibration`.
- Risco de valor/comercial: `/app/reports`, `/app/upgrade` (contexto de trial/paid quando necessario).

## Jornada detalhada por etapa

| Etapa | Objetivo do usuario | Rota principal | Opcoes de caminho (rotas/acoes) | Features envolvidas | Valor real gerado |
|---|---|---|---|---|---|
| 1. Abertura do dia | Obter panorama de risco da rede em 10 min | `/app/admin` | Ver lojas offline/stale, funil de ingestao, risco de dados e billing | Cards consolidados multi-org | Prioridade clara para atuacao do dia |
| 2. Triagem de incidentes | Separar incidente critico de ruido operacional | `/app/admin` | Abrir loja especifica em `/app/operations/stores/:storeId`; abrir calibracao se suspeita de drift | Blocos de incidentes e risco | Menor MTTR e menos escalacao desnecessaria |
| 3. Diagnostico tecnico-funcional | Confirmar causa raiz (edge, camera, dados, regra) | `/app/operations` e `/app/cameras` | Validar heartbeat, health camera, cobertura e null-rate; ir para edge-help quando preciso | Visao cruzada de infraestrutura e dados | Resolucao orientada por evidencias |
| 4. Acao corretiva estruturada | Executar ou acionar reparo com rastreabilidade | `/app/calibration` e `/app/admin` | Criar/atualizar acao de calibracao, anexar evidencia, definir status/SLA | Backlog de calibracao + workflow de evidencia | Melhoria de qualidade com governanca |
| 5. Reconciliacao de funil e dados | Fechar gaps de ingestao e consistencia | `/app/admin` | Reprocessar loja/rede, acompanhar efeito em cobertura e freshness | Bloco de observabilidade e gap repair | Reducao de perda silenciosa de dados |
| 6. Risco comercial e decisao executiva | Antecipar contas em risco e bloqueios indevidos | `/app/admin` + apoio `/app/reports` | Ver trials expirando/past_due/bloqueios; acionar time responsavel | Bloco de billing e risco comercial | Protecao de receita e reducao de churn involuntario |
| 7. Fechamento do dia | Consolidar status, pendencias e proximo plano | `/app/admin` | Revisar backlog aberto, registrar GO/NO-GO de rollout | Control tower + trilha de acao | Operacao previsivel e escalavel |

## Service design (SaaS Admin)

| Momento | Acao do usuario (frontstage) | Sistema/operacao (backstage) | Feature chave | Valor percebido |
|---|---|---|---|---|
| Leitura macro | Analisa rede multi-tenant | Agrega sinais de edge, cameras, dados e billing | Admin Control Tower | Decisao de prioridade em minutos |
| Investigacao | Navega para loja/camera com risco | Correlaciona fontes e historico tecnico | Operations + Cameras | Menos diagnostico por tentativa e erro |
| Correcao | Dispara acao de calibracao/reprocesso | Workflow versionado com evidencia e status | Calibration + admin actions | Qualidade de dados sustentavel |
| Governanca | Monitora funil/completude/cobertura | Reconciliacao e monitoramento continuo | Ingestion observability | Menos gaps invisiveis no produto |
| Protecao de receita | Acompanha trials e bloqueios | Cruza risco tecnico e comercial | Billing risk blocks | Menos churn evitavel |

## User stories priorizadas
1. Como `SaaS Admin`, quero identificar em uma tela quais lojas estao offline agora para priorizar incidentes criticos.
2. Como `SaaS Admin`, quero diferenciar falha de edge, camera e pipeline para acionar o time certo sem atraso.
3. Como `SaaS Admin`, quero abrir acao de calibracao com evidencias para melhorar qualidade de metrica de forma auditavel.
4. Como `SaaS Admin`, quero reprocessar gaps de funil sem terminal para reduzir dependencia operacional.
5. Como `SaaS Admin`, quero acompanhar null-rate e cobertura por loja para manter confianca das decisoes.
6. Como `SaaS Admin`, quero monitorar risco de trial/billing para evitar bloqueio indevido e perda de receita.
7. Como `SaaS Admin`, quero fechar o dia com backlog priorizado e SLA claro para o proximo ciclo.
8. Como `SaaS Admin`, quero abrir evidencias de calibracao por loja/camera com signed URL curta e trilha de auditoria para operar em ambiente multi-tenant com seguranca.
9. Como `SaaS Admin`, quero acompanhar metrica experimental de clima de atendimento (sentimento agregado) sem biometria identificavel, para orientar melhoria operacional com compliance.

## KPIs da jornada
- MTTR de incidentes criticos (meta: <= 30 min).
- `%` de lojas com heartbeat dentro do SLA.
- `%` de cobertura minima para decisao executiva por loja.
- Null-rate de campos criticos e completude de payload.
- `%` de bloqueios indevidos por trial/billing.

## Friccoes e mitigacao
- Multiplicidade de fontes sem visao unica: consolidacao em `/app/admin` como fonte primaria.
- Gaps entre CV e funil de produto: reconciliacao integrada e reprocessamento assistido.
- Acao corretiva sem prova de impacto: obrigatoriedade de evidencia antes/depois no backlog de calibracao.
- Risco de acesso indevido a midia entre clientes: RBAC por org/store + signed URL curta + auditoria de visualizacao.
- Risco de uso indevido de analise facial: usar apenas agregados anonimos e classificar como `proxy_experimental` ate validacao juridica e tecnica.

## Alinhamento com a documentacao
- Mantem arquitetura orientada a eventos (edge -> ingestao -> KPI -> alerta -> acao).
- Reforca governanca multi-tenant com RBAC e trilha auditavel.
- Sustenta a tese de valor em escala: decisao rapida com confianca operacional e comercial.
