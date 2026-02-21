# SPEC-002 Camera Onboarding

## Objetivo
Cadastrar câmeras com store inferida pela URL e sem validação de rede no backend.

## Não-objetivos
- Validação de RTSP no backend

## Fluxo
1. Usuário abre modal de câmera
2. Preenche campos mínimos
3. Backend cria câmera
4. Edge-agent valida conectividade (health)

## Estados
- draft
- saving
- saved
- error

## Payloads
- `POST /api/v1/stores/{store_id}/cameras/`
- Campos suportados: `name`, `external_id`, `brand`, `ip`, `username`, `password`, `rtsp_url`, `active`

## Erros
- 404 Store not found
- 403 Sem permissão
- 409 `LIMIT_CAMERAS_REACHED`
- 400 validação de campos

## DOR
- Campos obrigatórios definidos
- Regras de permissão claras

## DOD
- Store sempre inferida pela URL
- Mensagens de erro retornadas corretamente

## Testes
- POST sem store no body
- POST com store inválida
- POST sem permissão
