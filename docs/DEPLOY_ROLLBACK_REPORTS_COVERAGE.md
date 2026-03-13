# Runbook de Deploy e Rollback

## Escopo
Release da evolução de relatórios executivos e cobertura operacional:
- `GET /api/v1/productivity/coverage/`
- `POST /api/v1/copilot/stores/:store_id/actions/staff-plan/`
- `method.version` + `confidence_governance` em:
  - `GET /api/v1/report/summary/`
  - `GET /api/v1/report/impact/`
- Fallback frontend para ambientes sem endpoint publicado.

## Pré-deploy (T-30 min)
1. Confirmar branch/tag de release e commit SHA.
2. Rodar testes backend:
   - `python manage.py test apps.core.tests_productivity_coverage apps.core.tests_report_impact apps.copilot.tests_staff_plan_action`
3. Validar migrações pendentes:
   - `python manage.py showmigrations`
4. Confirmar env vars obrigatórias:
   - `DJANGO_SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
5. Confirmar janela de deploy e responsável on-call.

## Deploy Backend
1. Publicar versão da API (Render/infra atual).
2. Após subir, validar health:
   - `GET /health`
3. Executar smoke tests de rotas novas (usuário autenticado):
   - `GET /api/v1/productivity/coverage/?period=30d`
   - `GET /api/v1/report/summary/?period=30d`
   - `GET /api/v1/report/impact/?period=30d`
   - `POST /api/v1/copilot/stores/<store_id>/actions/staff-plan/` com body:
     ```json
     {
       "staff_planned_week": 8,
       "reason": "Ajuste de cobertura",
       "source": "release_smoke_test"
     }
     ```

## Deploy Frontend
1. Publicar build do frontend.
2. Validar `/app/reports`:
   - carrega sem erro fatal
   - mostra resumo executivo
   - seção de evidências de aderência renderiza
3. Validar `/app/operations/stores/:storeId`:
   - seção `Staff semanal planejado (pre-ERP)` visível
   - botão `Copiloto atualizar no banco` retorna sucesso

## Validação Pós-release (primeiros 30 min)
1. Erro API:
   - taxa de 5xx não pode subir acima de baseline + 1%
2. Erro frontend:
   - sem loop de 404 em `/v1/productivity/coverage/`
3. Funcional:
   - `planned_source_mode` deve alternar para `manual` quando `employees_count > 0`
4. Segurança:
   - `actions/staff-plan` deve negar usuário sem role `owner/admin/manager`

## Critérios de rollback imediato
Executar rollback se qualquer item ocorrer por mais de 10 minutos:
1. `GET /api/v1/productivity/coverage/` retorna 500 recorrente.
2. `POST /actions/staff-plan/` grava valor incorreto de `employees_count`.
3. `/app/reports` indisponível para usuários autenticados.
4. aumento de erro 5xx acima de 3% absoluto.

## Procedimento de rollback
1. Reverter backend para versão anterior estável.
2. Reverter frontend para build anterior estável.
3. Limpar cache CDN/frontend se aplicável.
4. Reexecutar smoke tests mínimos:
   - `GET /health`
   - `GET /api/v1/report/summary/?period=30d`
   - abrir `/app/reports`
5. Comunicar incidente com:
   - horário do rollback
   - impacto
   - hipótese raiz
   - plano de correção

## Plano de contingência (sem endpoint novo)
Se backend novo não puder ser publicado hoje:
1. manter frontend com fallback ativo (já implementado)
2. monitorar primeiro 404 por sessão (esperado)
3. adiar ativação oficial de cobertura para próximo release backend

## Checklist de aceite
- [ ] Rotas novas respondem 200/4xx esperado, sem 5xx.
- [ ] `method.version` presente em summary/impact/coverage.
- [ ] Atualização de staff semanal persiste e reflete em reports.
- [ ] Sem regressão em login, dashboard e reports.
- [ ] Runbook anexado ao ticket de release.
