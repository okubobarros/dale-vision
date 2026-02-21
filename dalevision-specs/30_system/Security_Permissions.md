# Security & Permissions

## Princípios
- Menor privilégio.
- Store e Org sempre validam acesso.

## Papéis
- owner, admin, manager, viewer (OrgMember / StoreManager).

## Regras de acesso
- CRUD de store: membro da organização.
- Edge credentials e edge setup: apenas owner/admin.
- Câmeras: leitura para roles de leitura e escrita para roles de gestão.
- Edge endpoints: `X-EDGE-TOKEN` obrigatório quando sem auth do usuário.

## Observações
- Tokens e secrets nunca no frontend.
- Rotas `/api/edge/*` aceitam token do Edge.
