# Journey - Post-Subscription (Owner + Admin)

## Objetivo de valor
Garantir que o cliente pago mantenha uso recorrente, capture valor operacional continuo e expanda lojas/cameras com previsibilidade.

## Perfis envolvidos
- `Owner`: decisao de investimento, expansao e padronizacao entre lojas.
- `Org Admin / Store Manager`: execucao operacional diaria e melhoria continua.

## Rotas principais
- Valor recorrente: `/app/dashboard`, `/app/operations`, `/app/analytics`, `/app/reports`.
- Execucao: `/app/alerts`, `/app/alerts/rules`, `/app/alerts/history`, `/app/cameras`, `/app/calibration`.
- Governanca da conta: `/app/settings`, `/app/profile`.

## Jornada detalhada por etapa

| Etapa | Objetivo do usuario | Rota principal | Opcoes de caminho (rotas/acoes) | Features envolvidas | Valor real gerado |
|---|---|---|---|---|---|
| 1. Confirmacao de valor pos-upgrade | Validar que assinatura virou melhoria concreta | `/app/reports` | Comparar periodo pre e pos-upgrade; exportar visao executiva | Relatorios e comparativos | Confianca de que pagar continua fazendo sentido |
| 2. Rotina operacional recorrente | Manter disciplina de acao por excecao | `/app/dashboard` + `/app/alerts` | Tratar alertas, ajustar regra, revisar historico | Alertas + regras + historico | Menor perda operacional recorrente |
| 3. Evolucao da confianca de dado | Melhorar qualidade de sinal com evidencias | `/app/cameras` + `/app/calibration` | Corrigir camera/ROI, validar antes/depois, publicar ajuste | Camera health + calibracao | Decisoes mais confiaveis e replicaveis |
| 4. Padronizacao entre lojas | Replicar boas praticas operacionais | `/app/operations/stores` | Comparar lojas, documentar padrao, aplicar ajustes nas lojas com pior desempenho | Operacoes multi-loja + analytics | Menor variancia de performance na rede |
| 5. Expansao de footprint | Crescer com controle de risco | `/app/operations/stores` | Adicionar loja/camera conforme plano, repetir onboarding tecnico com checklist | Gestao de lojas e infraestrutura | Crescimento com qualidade, sem perder governanca |
| 6. Revisao executiva periodica (QBR) | Avaliar ROI, riscos e proximas alavancas | `/app/reports` + `/app/analytics` | Revisar KPI, definir backlog de melhoria, alinhar metas do proximo ciclo | Relatorio executivo + indicadores operacionais | Retencao e expansao orientadas por resultado |

## Service design (pos-assinatura)

| Momento | Acao do usuario (frontstage) | Sistema/operacao (backstage) | Feature chave | Valor percebido |
|---|---|---|---|---|
| Semana 1 paga | Confirma baseline e ganhos iniciais | Consolida KPI e evidencia de impacto | Reports | Reducao de risco de arrependimento |
| Operacao semanal | Age em alertas e ajusta regra | Loop continuo evento->acao->resultado | Alerts stack | Valor operacional recorrente |
| Ciclo de qualidade | Corrige drift e publica calibracao | Workflow de evidencia e validacao | Cameras + Calibration | Menos ruido, mais confianca |
| Escala multi-loja | Replica padrao com comparativos | Benchmark interno por loja | Operations + Analytics | Expansao sem perda de controle |
| QBR | Decide proximas alavancas de ROI | Sumarizacao executiva por periodo | Reports + analytics executiva | Renovacao e upsell com base factual |

## User stories priorizadas
1. Como `Owner`, quero ver impacto pos-upgrade por periodo para confirmar retorno da assinatura.
2. Como `Org Admin`, quero manter rotina de alertas acionaveis para preservar ganhos operacionais.
3. Como `Store Manager`, quero reduzir ruido de alerta para aumentar adesao do time de loja.
4. Como `Org Admin`, quero calibrar lojas com baixa confianca para aumentar qualidade de decisao.
5. Como `Owner`, quero comparar desempenho entre lojas para direcionar plano de expansao.
6. Como `Owner`, quero revisar trimestralmente ROI e riscos para decidir renovacao/upsell com seguranca.

## KPIs de pos-assinatura
- Retencao de contas pagas (logo/churn).
- Expansao de lojas/cameras por conta.
- `%` de alertas com acao e melhoria comprovada.
- Tendencia de fila/ociosidade apos estabilizacao.
- Uso recorrente de relatorios executivos (semanal/mensal).

## Riscos e mitigacao
- Queda de uso apos upgrade: reforcar rituais semanais em dashboard/alerts/reports.
- Crescimento sem padrao: checklist de rollout por loja/camera.
- Ruido em escala: revisao continua de regras e calibracao por evidencias.

## Alinhamento com documentacao
- Sustenta a tese de produto de inteligencia operacional em tempo real.
- Materializa o valor no ciclo fechado (evento -> acao -> resultado -> dinheiro).
- Conecta operacao de loja com estrategia de crescimento da rede.
