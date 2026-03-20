# Plano PM - Admin Dashboard, Funil e Redução Agressiva de Nulos (2026-03-20)

## 1) Separação de visão: Admin vs Usuário padrão

### Usuário padrão (loja/operação)
- Foco: execução diária.
- Perguntas chave: "onde atuar agora?", "qual loja/câmera está crítica?", "qual ação gera ganho hoje?".
- KPIs: fila, dwell, alertas, cobertura operacional, ações do copilot.

### Admin (produto/negócio)
- Foco: escala do produto e qualidade dos dados.
- Perguntas chave: "funil converte?", "dados são confiáveis?", "onde está a maior perda?".
- KPIs: funil ICP, ativação, paid rate, processing/failure rate da ingestão, payload completeness.

## 2) Estrutura recomendada do Admin Dashboard

### Bloco A - Saúde de negócio
- Signups, ativados, assinaturas ativas, paid rate.
- Queda crítica entre etapas (top drop stage).

### Bloco B - Funil de jornada
- Etapas: lead_created -> signup_completed -> store_created -> camera_added -> roi_saved -> first_metrics_received -> upgrade_clicked.
- Mostrar por etapa:
  - volume,
  - conversão da etapa anterior,
  - payload incompleto.

### Bloco C - Saúde de dados
- Score de qualidade (meta >= 95).
- Payload missing rate médio.
- PDV processing rate.
- PDV failure rate.
- Top erros de ingestão.

### Bloco D - Plano executivo de correção
- Contrato de eventos.
- PDV integração.
- Funil onboarding ICP.
- Governança official/proxy/estimated.

## 3) Meta de qualidade e fórmula operacional

### Meta
- Score geral >= 95.

### Fórmula inicial sugerida
- Score = 55% payload quality + 45% ingest processing - penalidade por failure rate.
- Payload quality = 100 - payload_missing_rate_médio.

## 4) Plano de redução agressiva de nulos (14 dias)

### D+5
- Zerar campos críticos faltantes no funil: user_id, store_id, camera_id, roi_version, email/whatsapp.
- Meta: missing rate por etapa <= 2%.

### D+7
- Ingestão PDV:
  - failure rate <= 1%,
  - pending_total = 0 em janela 24h.

### D+10
- Atacar top drop stage do onboarding com experimento guiado por dados.

### D+14
- Exibir em todos os dashboards o selo de origem métrica:
  - official / proxy / estimated.

## 5) Critério de pronto para abrir integração real (PDV/gateway)

- Funil e qualidade publicados no Admin Dashboard.
- Receipts de ingestão com erro/processado ativos.
- Taxas dentro da meta por 7 dias consecutivos.
- Evidência de consistência entre conversão proxy e conversão oficial.
