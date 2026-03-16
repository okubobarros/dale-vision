# Sprint 2 Field Validation Gate (Store Visit)

Data de referencia: 2026-03-16
Escopo: fechamento operacional da Sprint 2
Fonte de verdade tecnica: `/app/reports` -> `incident_response.target_status.overall`

## Objetivo
Confirmar em loja remota que o que ja esta pronto em engenharia e governanca se sustenta em operacao real.

## Gate de aceite (GO)
1. `incident_response.target_status.overall = go` por 3 dias consecutivos.
2. `runbook_coverage_rate_pct >= 80`.
3. `avg_time_to_runbook_seconds <= 900`.
4. Evidence pack diario gerado sem falha.
5. Coleta de evidencia de campo anexada (camera/ingestao/acao).

## Checklist de validacao em campo
1. Edge/autostart
- [ ] Reinicio controlado do host e subida automatica do agente.
- [ ] Heartbeat atualizado em ate 2 minutos apos boot.

2. Ingestao de cameras
- [ ] Camera health atualizado para todas as cameras esperadas.
- [ ] Eventos atomicos chegando sem duplicidade aparente.
- [ ] Sem contaminacao entre camera_id e role operacional.

3. Janela operacional
- [ ] `operational_window` atualizando na cadencia esperada.
- [ ] Sem lacuna de dados superior ao limite do SLO.

4. Runbook e resposta a incidente
- [ ] Evento de falha/simulacao gera runbook contextual.
- [ ] Abertura de runbook registrada (`runbook_opened`).
- [ ] Tempo ate runbook dentro do alvo.

5. Leitura executiva
- [ ] Reports mostra status de incident response com coerencia.
- [ ] Sem tela vazia no modo rede com lojas ativas.

## Evidencias obrigatorias
- Print ou export do reports com `incident_response`.
- Trecho de log do edge com timestamp.
- Exemplo de evento ingerido (camera health + evento atomico).
- Registro do runbook aberto e tempo de resposta.

## Resultado final
- Decisao: [ ] GO  [ ] NO-GO
- Responsavel tecnico:
- Data/hora:
- Observacoes:
