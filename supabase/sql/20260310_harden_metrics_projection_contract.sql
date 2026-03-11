-- S1-02: Harden projection contract for metrics tables.
-- Goal:
-- 1) prevent cross-camera/ROI overwrite in projections
-- 2) enforce uniqueness by full projection identity
-- 3) keep migration idempotent and safe to re-run

BEGIN;

-- 0) Ensure projection identity columns exist.
ALTER TABLE IF EXISTS public.traffic_metrics
  ADD COLUMN IF NOT EXISTS ownership text,
  ADD COLUMN IF NOT EXISTS metric_type text,
  ADD COLUMN IF NOT EXISTS roi_entity_id text;

ALTER TABLE IF EXISTS public.conversion_metrics
  ADD COLUMN IF NOT EXISTS ownership text,
  ADD COLUMN IF NOT EXISTS metric_type text,
  ADD COLUMN IF NOT EXISTS roi_entity_id text;

-- 1) Normalize empty strings and default ownership.
UPDATE public.traffic_metrics
SET
  ownership = LOWER(COALESCE(NULLIF(TRIM(ownership), ''), 'primary')),
  metric_type = NULLIF(TRIM(metric_type), ''),
  roi_entity_id = NULLIF(TRIM(roi_entity_id), '')
WHERE TRUE;

UPDATE public.conversion_metrics
SET
  ownership = LOWER(COALESCE(NULLIF(TRIM(ownership), ''), 'primary')),
  metric_type = NULLIF(TRIM(metric_type), ''),
  roi_entity_id = NULLIF(TRIM(roi_entity_id), '')
WHERE TRUE;

-- 2) Dedupe legacy collisions before unique indexes.
-- Keep the most recent row by updated_at/created_at/id.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        store_id,
        ts_bucket,
        COALESCE(camera_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(metric_type, ''),
        COALESCE(roi_entity_id, '')
      ORDER BY
        COALESCE(created_at, now()) DESC,
        id DESC
    ) AS rn
  FROM public.conversion_metrics
)
DELETE FROM public.conversion_metrics c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        store_id,
        ts_bucket,
        COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(camera_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(metric_type, ''),
        COALESCE(roi_entity_id, '')
      ORDER BY
        COALESCE(created_at, now()) DESC,
        id DESC
    ) AS rn
  FROM public.traffic_metrics
)
DELETE FROM public.traffic_metrics t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- 3) Drop previous weaker unique indexes if present.
DROP INDEX IF EXISTS public.conversion_metrics_store_bucket_camera_unique;
DROP INDEX IF EXISTS public.traffic_metrics_store_bucket_camera_unique;

-- 4) Create stronger unique projection identity indexes.
CREATE UNIQUE INDEX IF NOT EXISTS conversion_metrics_projection_identity_uq
  ON public.conversion_metrics (
    store_id,
    ts_bucket,
    COALESCE(camera_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(metric_type, ''),
    COALESCE(roi_entity_id, '')
  );

CREATE UNIQUE INDEX IF NOT EXISTS traffic_metrics_projection_identity_uq
  ON public.traffic_metrics (
    store_id,
    ts_bucket,
    COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(camera_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(metric_type, ''),
    COALESCE(roi_entity_id, '')
  );

-- 5) Performance indexes aligned with read paths.
CREATE INDEX IF NOT EXISTS conversion_metrics_store_bucket_idx
  ON public.conversion_metrics (store_id, ts_bucket DESC);

CREATE INDEX IF NOT EXISTS conversion_metrics_store_camera_bucket_idx
  ON public.conversion_metrics (store_id, camera_id, ts_bucket DESC);

CREATE INDEX IF NOT EXISTS traffic_metrics_store_bucket_idx
  ON public.traffic_metrics (store_id, ts_bucket DESC);

CREATE INDEX IF NOT EXISTS traffic_metrics_store_camera_bucket_idx
  ON public.traffic_metrics (store_id, camera_id, ts_bucket DESC);

COMMIT;

-- Verification queries (run separately):
-- 1) uniqueness check (must return 0 rows):
-- SELECT store_id, ts_bucket, camera_id, metric_type, roi_entity_id, COUNT(*)
-- FROM public.conversion_metrics
-- GROUP BY 1,2,3,4,5
-- HAVING COUNT(*) > 1;
--
-- 2) index presence:
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname='public'
--   AND indexname IN ('conversion_metrics_projection_identity_uq','traffic_metrics_projection_identity_uq');
