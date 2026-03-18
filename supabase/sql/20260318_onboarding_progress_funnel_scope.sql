-- Scope onboarding_progress by store and harden funnel tracking.
-- Idempotent and safe to run multiple times.

BEGIN;

-- 1) Add store_id (nullable for backward compatibility).
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS store_id uuid NULL;

-- 2) Backfill store_id from meta->store_id when valid UUID.
UPDATE public.onboarding_progress op
   SET store_id = (op.meta ->> 'store_id')::uuid
 WHERE op.store_id IS NULL
   AND jsonb_typeof(op.meta) = 'object'
   AND (op.meta ->> 'store_id') IS NOT NULL
   AND (op.meta ->> 'store_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 3) Ensure updated_at has a value for ranking + auditing.
UPDATE public.onboarding_progress
   SET updated_at = COALESCE(updated_at, completed_at, created_at, now())
 WHERE updated_at IS NULL;

-- 4) Keep only newest row per (org_id, store_id, step), then enforce uniqueness.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id, store_id, step
      ORDER BY COALESCE(updated_at, completed_at, created_at, now()) DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.onboarding_progress
)
DELETE FROM public.onboarding_progress p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

WITH ranked_null_store AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id, step
      ORDER BY COALESCE(updated_at, completed_at, created_at, now()) DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.onboarding_progress
  WHERE store_id IS NULL
)
DELETE FROM public.onboarding_progress p
USING ranked_null_store r
WHERE p.id = r.id
  AND r.rn > 1;

-- 5) Add FK + indexes/unique constraints for scoped progress.
ALTER TABLE public.onboarding_progress
  DROP CONSTRAINT IF EXISTS onboarding_progress_store_id_fkey;

ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT onboarding_progress_store_id_fkey
  FOREIGN KEY (store_id)
  REFERENCES public.stores(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_progress_org_store_step
  ON public.onboarding_progress (org_id, store_id, step)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_progress_org_step_null_store
  ON public.onboarding_progress (org_id, step)
  WHERE store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org_store_updated
  ON public.onboarding_progress (org_id, store_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org_step
  ON public.onboarding_progress (org_id, step);

COMMIT;

-- Post-apply verification:
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name = 'onboarding_progress'
--    AND column_name IN ('org_id', 'store_id', 'step', 'updated_at');
--
-- SELECT indexname, indexdef
--   FROM pg_indexes
--  WHERE schemaname = 'public'
--    AND tablename = 'onboarding_progress'
--    AND indexname IN (
--      'uq_onboarding_progress_org_store_step',
--      'uq_onboarding_progress_org_step_null_store',
--      'idx_onboarding_progress_org_store_updated',
--      'idx_onboarding_progress_org_step'
--    );
