# SPEC-008 Auth & Password Recovery

## Objetivo
Padronizar o fluxo de callback do Supabase, reidratação de sessão e recuperação de senha.

## Fluxos
### 1) Confirmação de e-mail (AuthCallback)
1. Supabase redireciona para `/auth/callback` com `code`.
2. Frontend troca `code` por sessão (`exchangeCodeForSession`).
3. Frontend salva sessão local e chama `GET /api/me/setup-state/`.
4. Se `setup-state` não responder em até 4s, fallback para `/onboarding`.

### 2) Esqueci minha senha
1. Usuário acessa `/forgot-password`.
2. Envia e-mail com `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
3. Supabase envia link com `{{ .ConfirmationURL }}` para `/auth/reset-password`.
4. Usuário define nova senha (`supabase.auth.updateUser`), e retorna para `/login`.

## Rotas públicas
- `/forgot-password`
- `/auth/reset-password`
- `/auth/callback`

## Regras
- Não revelar se e-mail existe.
- `setup-state` pode responder com `X-Schema-Warnings`.

## DOD
- Callback executa em ≤ 8s com fallback para onboarding.
- Reset password funcionando ponta a ponta.
