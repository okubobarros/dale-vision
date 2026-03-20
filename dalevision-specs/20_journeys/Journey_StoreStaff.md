# Journey - Store Staff

## Objetivo de valor
Ajudar o time de loja a agir rapido no que importa no turno, com instrucoes claras e baixo atrito operacional.

## Perfil e escopo
- Perfil: `Store Staff` (operador de loja).
- Foco: consumo de alertas, execucao de acao local, confirmacao de resultado.
- Limites: sem acoes estruturais de org (billing, governanca global, administracao cross-store).

## Rotas principais
- Inicio do turno: `/app/dashboard`.
- Acoes de operacao: `/app/operations` e `/app/operations/stores/:storeId`.
- Alertas: `/app/alerts` (feed), `/app/alerts/history` (historico).
- Apoio: `/app/cameras` (somente quando permitido), `/app/edge-help` (quando incidente tecnico impede operacao).

## Jornada detalhada por etapa

| Etapa | Objetivo do usuario | Rota principal | Opcoes de caminho (rotas/acoes) | Features envolvidas | Valor real gerado |
|---|---|---|---|---|---|
| 1. Inicio de turno | Entender status rapido da loja | `/app/dashboard` | Entrar direto em alertas ou detalhes da loja | Visao resumida de saude operacional | Menos tempo para se situar |
| 2. Triagem de alertas | Priorizar o que tem impacto imediato | `/app/alerts` | Filtrar por severidade/loja, abrir detalhe e contexto | Feed de alertas | Resposta mais rapida a risco de venda |
| 3. Execucao da acao | Agir na operacao fisica | `/app/alerts` + contexto da loja | Acoes tipicas: abrir caixa, realocar equipe, checar fila, validar camera obstruida | Recomendacoes operacionais por alerta | Reducao de fila, abandono e ociosidade |
| 4. Confirmacao de resultado | Registrar fechamento da ocorrencia | `/app/alerts` | Marcar resolvido/ignorar/delegar conforme permissao | Estado do alerta + trilha de acao | Aprendizado do que funciona no turno |
| 5. Escalada tecnica | Escalar quando acao local nao resolve | `/app/operations/stores/:storeId` -> `/app/edge-help` | Acionar suporte tecnico com contexto da loja/camera | Diagnostico contextual | Menos downtime operacional |
| 6. Revisao rapida de aprendizado | Evitar recorrencia no mesmo dia | `/app/alerts/history` | Revisar padrao de alertas recorrentes e combinar rotina local | Historico de notificacoes | Melhoria continua no nivel de loja |

## Service design (Store Staff)

| Momento | Acao do usuario (frontstage) | Sistema/operacao (backstage) | Feature chave | Valor percebido |
|---|---|---|---|---|
| Inicio do turno | Consulta status e prioridades | Consolida eventos recentes e saude de loja | Dashboard | Direcionamento imediato |
| Alerta critico | Recebe sinal e executa acao fisica | Motor de regras e contexto por loja | Alerts | Menor perda de venda no momento certo |
| Pos-acao | Marca status da ocorrencia | Registra trilha de resolucao e aprendizado | Alerts state/history | Base para melhorar rotina de turno |
| Escalada | Aciona suporte quando bloqueado | Agrupa contexto tecnico para diagnostico | Edge-help/operations | Resolucao mais rapida de incidentes tecnicos |

## User stories priorizadas
1. Como `Store Staff`, quero saber no inicio do turno o que esta critico para agir primeiro no que gera impacto.
2. Como `Store Staff`, quero receber alertas claros e com contexto para nao perder tempo interpretando.
3. Como `Store Staff`, quero executar a acao recomendada e registrar rapidamente para voltar ao atendimento.
4. Como `Store Staff`, quero diferenciar alerta acionavel de ruido para nao gerar fadiga.
5. Como `Store Staff`, quero escalar incidente tecnico sem abrir chamados longos e manuais.
6. Como `Store Staff`, quero revisar alertas recorrentes para ajustar o padrao operacional da loja.

## KPIs da jornada
- Tempo medio entre alerta e primeira acao de loja.
- `%` de alertas com desfecho registrado (resolvido/ignorado/delegado).
- Taxa de reincidencia de alertas no mesmo turno.
- Tempo de recuperacao quando existe escalada tecnica.

## Friccoes e mitigacao
- Permissao insuficiente: mostrar acoes disponiveis por papel e caminho de escalada.
- Alertas ruidosos: calibrar regras e cooldown com Admin.
- Edge/camera offline: priorizar fluxo de contingencia e suporte tecnico.

## Alinhamento com documentacao
- Mantem foco em comportamento operacional agregado e acao em tempo real.
- Conecta acao no piso a resultado mensuravel (fila menor, servico mais fluido, menos perda).
