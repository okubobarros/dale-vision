# S4 Field Validation Runbook

## Objetivo
Executar validacao de campo do auto-update (Sprint 4) com evidencia padronizada para decisao GO/NO-GO.

## Pre requisitos
- Backend rodando com migrations aplicadas.
- Policy de update configurada para a loja alvo.
- Store ID da loja piloto.
- Janela de rollout liberada para o horario do teste.

## Script pronto
Arquivo:
- `scripts/s4_field_validation.ps1`

## Modo recomendado (amanha na loja)
1. Rodar precheck:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/s4_field_validation.ps1 `
  -StoreId "<STORE_ID>" `
  -Mode pre `
  -Channel canary `
  -Hours 24
```

2. Executar canary/rollback em campo (operacao real).

3. Rodar post-check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/s4_field_validation.ps1 `
  -StoreId "<STORE_ID>" `
  -Mode post `
  -Channel canary `
  -Hours 24
```

Opcional (fluxo unico com pausa interativa):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/s4_field_validation.ps1 `
  -StoreId "<STORE_ID>" `
  -Mode full `
  -Channel canary `
  -Hours 24
```

## Artefatos gerados
Diretorio default:
- `dalevision-specs/70_ops/field-validation`

Arquivos:
- `S4_Field_Precheck_<timestamp>.md`
- `S4_Field_Precheck_<timestamp>.json`
- `S4_Field_PostCanary_<timestamp>.md`
- `S4_Field_PostCanary_<timestamp>.json`

## Leitura minima para decisao
- Se `decision=GO`: canary com telemetria consistente e evidencia de fluxo valido.
- Se `decision=NO-GO`: corrigir causa, rerodar canary e regenerar pack.

## Observacao
O comando de evidencia usado pelo script e:

```bash
python manage.py edge_s4_validation_pack --store-id <STORE_ID> --hours 24 --channel canary
```
