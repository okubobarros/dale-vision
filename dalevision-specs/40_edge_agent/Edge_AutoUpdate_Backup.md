# Edge AutoUpdate & Backup

## Objetivo
Atualizar edge-agent com segurança e rastreabilidade, preservando configurações locais e reduzindo intervenção manual em loja remota.

## Referência principal
- Contrato: `docs/contracts/CONTRACT_EDGE_AUTO_UPDATE_V1.md`
- Plano de execução: `70_ops/S4_AutoUpdate_Execution_Plan.md`

## Estratégia (v1)
- Pull de policy (`stable`/`canary`) no backend.
- Download do pacote versionado + validação de `sha256`.
- Ativação atômica da nova versão (`releases/<version>`).
- Backup de `.env` e config local antes da troca.

## Rollback
- Health gate pós-update obrigatório (heartbeat + camera health).
- Se falhar: rollback automático para versão anterior.
- Reportar evento `rolled_back` com `reason_code`.

## Boas práticas obrigatórias
1. Nunca sobrescrever versão ativa diretamente.
2. Usar lock de update para evitar concorrência.
3. Executar update apenas na janela de manutenção (exceto patch crítico).
4. Publicar telemetria por fase: `started`, `downloaded`, `verified`, `activated`, `healthy`, `failed`, `rolled_back`.

## Perguntas abertas (v2)
- Assinatura criptográfica de pacote além de checksum.
- Bloqueio de rollout por hardware profile.
- Estratégia de bandwidth throttling em redes limitadas.
