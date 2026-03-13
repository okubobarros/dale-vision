# Projeto Total - Status Executivo (2026-03-13)

## 1) Posicionamento atual
DALE Vision esta em transicao de uma plataforma centrada em infraestrutura para uma plataforma de operacao de loja assistida por IA.

Objetivo de produto validado:
- ajudar dono/gestor multilojista a agir mais rapido;
- reduzir risco operacional (fila, cobertura, equipe, indisponibilidade);
- aumentar controle sem sobrecarga tecnica.

## 2) Mapa de maturidade (macro)
- S0 Estabilizacao Edge: `~85%` (faltam validacoes de campo recorrentes).
- S1/S2 Fundacao operacional e source-of-truth: `~80%`.
- S3 Product Scale Readiness: `~55%` (em execucao).
- Prontidao total para escala comercial ampla: `~68-72%`.

## 3) Entregas consolidadas
1. Edge e operacao
- autostart/remocao com melhoria de robustez e runbooks atualizados;
- heartbeat e camera health com trilha de diagnostico mais clara;
- source-of-truth de cameras orientado a backend, com fallback explicito.

2. Produto e UX
- dashboard com separacao por estado de conta (`trial`, `paid_setup`, `paid_executive`);
- navegacao mais orientada a operacao;
- reducao de ruido tecnico em partes da experiencia.

3. Copilot e dados
- dominio `copilot_*` criado no backend;
- migracao aplicada;
- base pronta para memoria conversacional, insights estruturados e relatorio 72h.

4. Confiabilidade de aplicacao
- ajuste de timeout/retry para mitigar cascata de timeouts e travamento percebido no frontend.

## 4) Erros chave e aprendizado
1. Plano/limite confuso na UI
- sintoma: plano pago com mensagem visual de limite trial;
- aprendizado: fallback visual errado destrói confianca do cliente, mesmo com regra tecnica correta.

2. Bypass potencial de limite no update
- sintoma: create tinha regra; update podia abrir brecha na ativacao;
- aprendizado: regra de negocio precisa existir em toda transicao de estado, nao so no create.

3. Performance percebida inaceitavel
- sintoma: carregamento proximo de 2 minutos por retries e timeouts;
- aprendizado: resiliencia mal calibrada pode piorar UX mais do que ajudar.

## 5) Onde ainda existe risco
- comparabilidade multi-loja sem elegibilidade por cobertura/calibracao;
- recomendacoes do Copilot ainda sem loop completo de evidencia -> insight -> acao -> impacto;
- validacao em loja fisica ainda necessaria para fechar confianca operacional de cameras/eventos.

## 6) Prioridades das proximas 2 semanas (foco valor ICP)
1. Entrega de acao
- consolidar "Acoes prioritarias da rede" com severidade, impacto e CTA por loja.

2. Confianca de dado
- gates de leitura oficial por cobertura/calibracao;
- labels claros `official | proxy | estimated` em todos os KPIs criticos.

3. Copilot util no dia 1
- respostas contextuais com evidencia e recomendacao curta;
- quick prompts orientados a decisao (onde agir agora, por que, com qual impacto).

4. Operacao e suporte
- painelde incidentes + SLI/SLO minimos;
- playbook unico de rollout/recuperacao para loja.

## 7) Definicao objetiva de valor entregue ao cliente
Consideramos valor entregue quando o gestor consegue, em menos de 5 minutos:
1. entender quais lojas exigem acao agora;
2. receber recomendacao priorizada com evidencias;
3. executar acao com impacto esperado claro;
4. acompanhar se risco caiu apos a acao.

Sem esses quatro pontos, ainda estamos entregando visibilidade; com eles, entregamos gestao remota real.
