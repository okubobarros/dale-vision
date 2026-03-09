ALTER TABLE IF EXISTS public.traffic_metrics
  ADD COLUMN IF NOT EXISTS camera_id uuid,
  ADD COLUMN IF NOT EXISTS camera_role text;

ALTER TABLE IF EXISTS public.conversion_metrics
  ADD COLUMN IF NOT EXISTS camera_id uuid,
  ADD COLUMN IF NOT EXISTS camera_role text,
  ADD COLUMN IF NOT EXISTS checkout_events integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS traffic_metrics_store_bucket_camera_idx
  ON public.traffic_metrics (store_id, ts_bucket, camera_id);

CREATE INDEX IF NOT EXISTS conversion_metrics_store_bucket_camera_idx
  ON public.conversion_metrics (store_id, ts_bucket, camera_id);
