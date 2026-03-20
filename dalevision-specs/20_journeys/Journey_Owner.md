# Journey - Owner (Org Owner)

## Objetivo de valor
Permitir que o dono da rede saia do modo "apagando incendio" para operacao orientada por dados, fechando o ciclo:
**Evento -> Acao -> Resultado -> Dinheiro**.

## Perfil e escopo
- Perfil principal: `Owner` (acesso total da org, incluindo billing/upgrade).
- Pode executar tudo de operacao (lojas, cameras, ROI, alertas) e decisao comercial (plano/expansao).

## Rotas da jornada (mapa rapido)
- Publicas: `/`, `/login`, `/activate` (`/register` redireciona), `/auth/callback`, `/onboarding`, `/agendar-demo`.
- Protegidas principais: `/app/dashboard`, `/app/operations`, `/app/operations/stores`, `/app/operations/stores/:storeId`, `/app/cameras`, `/app/analytics`, `/app/alerts`, `/app/alerts/rules`, `/app/alerts/history`, `/app/reports`, `/app/upgrade`, `/app/edge-help`, `/app/settings`.
- Compatibilidade: rotas antigas sem `/app` redirecionam para `/app/*`.

## Jornada detalhada por etapa

| Etapa | Objetivo do usuario | Rota principal | Opcoes de caminho (rotas/acoes) | Features envolvidas | Valor real gerado |
|---|---|---|---|---|---|
| 1. Descoberta e intencao | Entender se o produto resolve perda de receita e falta de controle multi-loja | `/` | CTA para `/agendar-demo`; CTA para `/login` se ja tiver conta | Landing com proposta de valor e casos | Clareza de ROI potencial antes de iniciar onboarding |
| 2. Cadastro/ativacao | Criar conta e habilitar acesso | `/activate` -> `/auth/callback` | Se erro de callback: tentar novamente ou voltar para `/login`; se email nao confirmado: reenviar do login | Registro, callback Supabase, resiliencia de erro | Reducao de abandono no primeiro acesso |
| 3. Login e roteamento inteligente | Cair no proximo passo correto sem friccao | `/login` | Pos-login: `/app/admin` (internal admin), `/onboarding` (sem loja), ou `/app/dashboard?openEdgeSetup=1` (com loja) | `resolvePostLoginRoute`, estado de setup | Menor tempo ate primeira acao util |
| 4. Onboarding de negocio | Configurar base operacional minima da 1a loja | `/onboarding` | Etapa 1 cria loja; etapa 2 adiciona equipe; etapa 3 aceite LGPD; fallback para `/login` se sessao cair | Wizard de onboarding + persistencia backend | Base de dados minima para gerar diagnostico e recomendacao |
| 5. Edge setup | Conectar loja fisica ao produto | `/app/dashboard?openEdgeSetup=1` | Abrir modal de setup; seguir scripts do edge-agent; em caso de falha ir para `/app/edge-help?store_id=...` | Edge Setup Modal, token, heartbeat | Entrada de dados em tempo real sem depender de intervencao manual continua |
| 6. Cameras e validacao tecnica | Garantir que as cameras entregam sinal confiavel | `/app/cameras` | Testar conexao, ajustar credenciais RTSP, revisar status; se bloqueio comercial ir para `/app/upgrade` | Cadastro/health de camera, diagnostico | Reduz risco de dados nulos e de insight falso |
| 7. Operacao inicial por loja | Validar loja, contexto e primeiros eventos | `/app/operations/stores/:storeId` | Navegar para alertas da loja (`/app/alerts?store_id=...`), copilot (`/app/copilot?store_id=...`) e edge-help | Store details, status edge/cameras, recomendacoes | Primeira decisao operacional baseada em evidencias |
| 8. Execucao diaria | Atuar por excecao com alertas acionaveis | `/app/dashboard` e `/app/alerts` | Ignorar, resolver, delegar; ajustar regra em `/app/alerts/rules`; auditar em `/app/alerts/history` | Motor de alertas, trilha de notificacao, priorizacao | Menos perda por fila/ociosidade e maior velocidade de resposta |
| 9. Analise e padronizacao | Transformar operacao em rotina replicavel | `/app/analytics` e `/app/reports` | Investigar loja/camera, comparar periodos e exportar relatorios | Analytics operacional, governanca de metricas | Decisao menos subjetiva e padrao entre lojas |
| 10. Trial -> pago | Converter valor percebido em assinatura | `/app/report` (redireciona para `/app/reports`) e `/app/upgrade` | Trial expirado: guard redireciona para relatorio (se ha dados) ou upgrade; CTA de upgrade | SubscriptionGuard, pagina de upgrade, relatorio de impacto | Conversao baseada em prova de valor, nao em promessa |
| 11. Expansao multi-loja | Escalar com controle e previsibilidade | `/app/operations/stores` | Criar novas lojas (se plano permitir), padronizar setup/alertas, replicar praticas | Gestao multi-loja, controles de plano | Crescimento com menor variabilidade operacional |

## Service design (Owner)

| Momento | Acao do usuario (frontstage) | Sistema/operacao (backstage) | Feature chave | Valor percebido |
|---|---|---|---|---|
| Acesso inicial | Cria conta e confirma email | Auth + validacao de sessao + redirect inteligente | Login/callback/onboarding | Entrada sem atrito e menor tempo ate uso real |
| Ativacao da loja | Cadastra loja/equipe e aceita termos | Persistencia de cadastro + setup state | Onboarding em etapas | Base operacional para diagnostico de ROI |
| Ligacao ao mundo fisico | Instala edge-agent e ativa heartbeat | Ingestao edge + validacao de conectividade | Edge setup e edge health | Dado vivo da operacao (nao estimativa manual) |
| Primeiros alertas | Recebe alerta e executa acao | Regras + eventos + historico | Alertas + regras + historico | Acao imediata com impacto financeiro mensuravel |
| Gestao executiva | Acompanha KPI e relatorios | Pipeline de metricas + governanca | Dashboard/analytics/reports | Decisao semanal com evidencias e padrao |
| Momento comercial | Decide upgrade com base em dados | Guard de assinatura + consolidacao de impacto | Report + Upgrade | Conversao por valor comprovado |

## User stories priorizadas
1. Como `Owner`, quero ser redirecionado automaticamente para o proximo passo apos login para reduzir tempo de ativacao.
2. Como `Owner`, quero concluir onboarding em poucos passos para criar a primeira loja sem depender de suporte.
3. Como `Owner`, quero configurar edge e validar heartbeat para ter confianca de que os dados sao em tempo real.
4. Como `Owner`, quero identificar rapidamente cameras com problema para evitar decisao com dado incompleto.
5. Como `Owner`, quero receber alertas acionaveis com contexto de loja para agir antes de perder venda.
6. Como `Owner`, quero ajustar regras de alerta por realidade operacional para reduzir ruido.
7. Como `Owner`, quero visualizar relatorio de impacto no fim do trial para decidir upgrade com prova de ROI.
8. Como `Owner`, quero expandir para novas lojas com o mesmo padrao de setup e governanca.

## KPIs da jornada
- Tempo ate primeira loja ativa (cadastro + edge online).
- Tempo ate primeira camera saudavel.
- Tempo ate primeiro alerta acionavel resolvido.
- `%` de alertas que viram acao + melhoria mensuravel.
- Conversao trial -> pago.
- Expansao de lojas ativas por conta paga.

## Friccoes e caminhos de mitigacao
- Callback com erro/timeout: manter retry em `/auth/callback` e opcao de retorno ao `/login`.
- Dificuldade no edge setup: atalho contextual para `/app/edge-help` com `store_id`.
- Trial expirado sem clareza de valor: priorizar relatorio com evidencias antes da CTA de upgrade.
- Ruido em alertas: revisao continua em `/app/alerts/rules` + auditoria em `/app/alerts/history`.

## Dependencias e alinhamento tecnico
- Auth e dados de apoio via Supabase.
- Chaves corretas por camada (`anon` no frontend; `service role` apenas backend).
- Eventos de jornada e integracao enviados quando aplicavel para automacao/operacao (n8n/webhooks).
- Logs de falha de integracao obrigatorios para suporte e melhoria continua.
