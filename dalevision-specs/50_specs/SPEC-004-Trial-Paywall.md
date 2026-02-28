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

## Paywall expirado (soft paywall)
- Quando `organizations.trial_ends_at` expira e não há assinatura ativa:
  - API retorna `TRIAL_EXPIRED` (HTTP 402 ou 403) com body padronizado:
    ```json
    {
      "code": "TRIAL_EXPIRED",
      "message": "Seu trial terminou. Assine um plano para continuar.",
      "trial_ended_at": "2026-02-01T10:00:00Z",
      "upgrade_url": "/app/upgrade"
    }
    ```
  - Rotas liberadas após expiração:
    - `GET /api/v1/report/summary/`
    - `GET /api/v1/report/export/`
    - `GET /api/v1/billing/plans/`
    - `GET /api/v1/me/status/`
  - UI bloqueia demais rotas e redireciona para:
    - `/app/report` (se houver dados)
    - `/app/upgrade` (se não houver dados)

## Payloads e códigos
- `TRIAL_EXPIRED` (HTTP 402/403)
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
- Trial expirado permite apenas relatório e upgrade
