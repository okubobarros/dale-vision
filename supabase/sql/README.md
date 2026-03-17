## Supabase SQL Conventions

- Source of truth for app schema is Django migrations in `apps/*/migrations`.
- Files here are for operational/manual SQL patches that are hard to express as app migrations.
- Use dated filenames: `YYYYMMDD_description.sql`.
- Scripts must be idempotent (`IF NOT EXISTS`, guarded `DO $$ ... $$`).
- Keep scripts focused: one concern per file.
- Never put secrets in SQL files.

### Execution Order

1. Apply Django migrations first whenever possible.
2. Apply operational SQL patches from this folder in date order.
3. Validate with a smoke test on critical workflows.

### Test Bootstrap

- `scripts/test_core_schema.sql` is for bootstrap/testing and recovery scenarios.
- Do not treat `scripts/test_core_schema.sql` as production schema source of truth.
