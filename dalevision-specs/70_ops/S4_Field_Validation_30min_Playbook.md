# S4 Field Validation - Playbook 30 Min

Data: 2026-03-16  
Objetivo: executar validacao de canary na loja com evidencias suficientes para decisao GO/NO-GO.

## 0-5 min: Pre-check rapido
1. Confirmar loja alvo e janela de rollout:
- `store_id`
- `channel=canary`
- `target_version`
2. Confirmar baseline no app (`/app/operations`):
- sem alerta critico nao relacionado a update.
3. Rodar evidência precheck:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/s4_field_validation.ps1 `
  -StoreId "<STORE_ID>" `
  -Mode pre `
  -Channel canary `
  -Hours 24
```

Critério de parada:
- se API/telemetria estiver indisponivel, nao iniciar canary.

## 5-20 min: Execucao canary
1. Aplicar policy canary e iniciar ciclo de update.
2. Acompanhar timeline esperada:
- `edge_update_started`
- `edge_update_downloaded`
- `edge_update_verified`
- `edge_update_activated`
- `edge_update_healthy`
3. Em caso de falha:
- capturar `reason_code`;
- validar rollback e recuperacao da operacao;
- nao seguir para lote enquanto falha nao for explicada.

Critério de parada:
- se ocorrer `failed` sem recuperacao operacional em ate 5 min, interromper validacao.

## 20-30 min: Pos-check e decisao
1. Rodar evidência post-canary:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/s4_field_validation.ps1 `
  -StoreId "<STORE_ID>" `
  -Mode post `
  -Channel canary `
  -Hours 24
```

2. Validar artefatos gerados em:
- `dalevision-specs/70_ops/field-validation`
3. Ler `decision` do pack:
- `GO`: seguir para planejamento de lote (5 lojas).
- `NO-GO`: registrar causa e abrir acao corretiva.

## Checklist de bolso (on-site)
- [ ] Precheck gerado.
- [ ] Fluxo completo `started -> healthy` observado.
- [ ] Em caso de falha, rollback validado.
- [ ] Post-check gerado.
- [ ] Decisao registrada no Daily Log.

## Comandos de fallback
Gerar pack manual:

```bash
python manage.py edge_s4_validation_pack --store-id <STORE_ID> --hours 24 --channel canary
```

Com JSON:

```bash
python manage.py edge_s4_validation_pack --store-id <STORE_ID> --hours 24 --channel canary --json-output dalevision-specs/70_ops/field-validation/S4_Field_Manual_<STORE_ID>.json
```
