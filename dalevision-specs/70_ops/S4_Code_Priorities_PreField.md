# S4 - Prioridades de Codigo (Pre-Field)

Data: 2026-03-16  
Contexto: itens executaveis sem depender da visita presencial.

## P0 (fazer agora)

1. Alertas proativos de rollback/falha no backend
- Objetivo: quando houver `edge_update_failed` ou `rolled_back`, gerar evento de suporte com prioridade.
- Entrega:
  - regra no backend para sinalizar loja critica;
  - payload com `store_id`, `reason_code`, `attempt`, `from_version`, `to_version`.
- Valor: reduz tempo de diagnostico no campo.

2. Endpoint de timeline por tentativa (store-level)
- Objetivo: facilitar leitura da sequencia `started -> healthy` por tentativa.
- Entrega:
  - endpoint `GET /api/v1/stores/{store_id}/edge-update-attempts/` (agregado por `attempt`);
  - status final por tentativa (`healthy`, `failed`, `rolled_back`, `incomplete`).
- Valor: evita analise manual de eventos brutos.

3. UI de timeline por tentativa na Store View
- Objetivo: suporte visualizar tentativa, duracao e reason code em um bloco unico.
- Entrega:
  - card "Tentativas de update" com top 5 tentativas;
  - badge de status e CTA runbook.
- Valor: operacao fica acionavel em menos de 10 minutos.

## P1 (logo depois da visita)

4. Exportacao de evidence pack por API
- Objetivo: gerar pack S4 por endpoint para automacao (CI/ops).
- Entrega:
  - `POST /api/v1/ops/s4/validation-pack/` com retorno do markdown/json.
- Valor: padroniza auditoria e reduz operacao manual.

5. Score de saude de rollout por loja/rede
- Objetivo: transformar telemetria de update em score executivo simples.
- Entrega:
  - score 0-100 com peso por falha recente, rollback, gap de versao e falta de sinal.
- Valor: leitura executiva mais rapida em dashboard/reports.

## P2 (proxima sprint)

6. Automacao de canary progression
- Objetivo: promover `canary -> stable` por regra de sucesso e janela de observacao.
- Entrega:
  - job de promocao com guardrails e bloqueio automatico em falha.
- Valor: escala rollout sem operacao manual intensa.

7. Integração com notificacoes (WhatsApp/email) para falhas S4
- Objetivo: acionar responsavel de loja e suporte automaticamente.
- Entrega:
  - trigger por `edge_update_failed`/`rolled_back`;
  - template padrao com runbook link.
- Valor: reduz MTTR de incidentes de update.

## Ordem recomendada
1. P0.1 alertas proativos.
2. P0.2 endpoint agregado por tentativa.
3. P0.3 timeline na Store View.
4. P1.4 export por API.

## Definicao de pronto (P0 completo)
- suporte consegue identificar tentativa falha e causa em <= 10 min;
- loja critica aparece com contexto completo em uma tela;
- runbook acionavel sem navegar por eventos brutos.
