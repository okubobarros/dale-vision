# Security & Permissions

## Princípios
- Menor privilégio.
- Store e Org sempre validam acesso.

## Papéis
- Owner: dono da organização (billing, limites, times e lojas).
- Admin: administrador da organização (gestão quase total, sem ações de staff interno).
- Manager: gestor de loja (opera câmeras/ROI/alertas na(s) loja(s) permitida(s)).
- Viewer: leitura apenas.
- Staff (DaleVision): usuário interno com ações fora do app do cliente.

## Regras de acesso (cliente)
- CRUD de store: Owner/Admin (Org). Manager somente em lojas atribuídas.
- Edge credentials e edge setup: Owner/Admin/Manager (escopo de loja).
- Câmeras: leitura para Viewer; escrita para Admin/Manager (escopo de loja).
- Teste de conexão: Admin/Manager (assíncrono).
- ROI: criar/editar/publicar para Admin/Manager; Viewer somente leitura.
- Snapshot (upload/visualização): upload para Admin/Manager; visualização para Viewer.
- Alertas: Admin/Manager configura; Viewer apenas leitura.
- Equipe: Owner/Admin convida e define papel; Manager só leitura.
- Billing: somente Owner/Admin (viewer e manager sem acesso).
- Edge endpoints: `X-EDGE-TOKEN` obrigatório quando sem auth do usuário.

## Regras de acesso (staff interno)
- Pode estender trial, liberar limites temporários e marcar conta como pilot.
- Acesso a logs avançados e auditoria.
- Acesso via Admin Console interno (não no app do cliente).
 - Pode acessar lojas para assistência de onboarding (ex.: configurar ROI em trials).
 - Quando staff publica ROI, deve registrar metadados de assistência (created_by_staff, created_by_user_id, created_at).
 - Superuser/staff **não** expira trial e tem acesso total (bypass de paywall/trial).

## Observações
- Tokens e secrets nunca no frontend.
- Rotas `/api/edge/*` aceitam token do Edge.
- “Admin do cliente” ≠ “Admin interno”.
