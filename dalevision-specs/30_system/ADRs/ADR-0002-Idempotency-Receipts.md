# ADR-0002 - Idempotency Receipts

## Contexto
Eventos e jobs podem ser reenviados (retries) entre Edge, Backend e automações.
Sem idempotência, há risco de duplicação de eventos, alertas e métricas.

## Decisão
- Usar `receipt_id` como idempotency key, com timestamp (`ts`) e controle de retries.
- Backend deve registrar recibos e tratar duplicatas como operações idempotentes.

## Consequências
- Processamento repetido não gera efeitos colaterais.
- Logs e auditoria ficam consistentes para troubleshooting.
- Contratos que emitem eventos devem incluir `receipt_id` e `ts`.

## Alternativas
- Deduplicação por payload completo: rejeitado por custo e risco de colisão.
- Deduplicação por janela de tempo: rejeitado por falsos positivos.
