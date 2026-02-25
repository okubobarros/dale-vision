# SPEC-004 Trial Paywall

## Objetivo
Aplicar limites do trial e orientar upgrade.

## Não-objetivos
- Billing completo

## Fluxo
1. Usuário atinge limite
2. Backend retorna código de paywall
3. Frontend mostra CTA de upgrade

## Estados
- allowed
- limited
- blocked

## Regras atuais
- Trial = 72h
- Limite de lojas no trial = 1
- Limite de câmeras no trial = 3
- Superuser/staff não expira trial (acesso total sem paywall).
  - UI não deve exibir banners de trial para staff/superuser.

## Payloads e códigos
- `PAYWALL_TRIAL_LIMIT` (HTTP 402)
- `LIMIT_CAMERAS_REACHED` (HTTP 409)

## DOR
- Limites definidos
- Mensagens de erro definidas

## DOD
- Mensagem clara no frontend
- Evento de paywall registrado

## Testes
- Limite de câmeras
- Trial expirado
