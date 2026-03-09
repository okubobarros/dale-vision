ALTER TABLE IF EXISTS public.traffic_metrics
  DROP CONSTRAINT IF EXISTS traffic_metrics_store_id_ts_bucket_key;

ALTER TABLE IF EXISTS public.conversion_metrics
  DROP CONSTRAINT IF EXISTS conversion_metrics_store_id_ts_bucket_key;

DROP INDEX IF EXISTS public.traffic_metrics_store_id_ts_bucket_key;
DROP INDEX IF EXISTS public.conversion_metrics_store_id_ts_bucket_key;

CREATE UNIQUE INDEX IF NOT EXISTS traffic_metrics_store_bucket_camera_unique
  ON public.traffic_metrics (store_id, ts_bucket, camera_id);

CREATE UNIQUE INDEX IF NOT EXISTS conversion_metrics_store_bucket_camera_unique
  ON public.conversion_metrics (store_id, ts_bucket, camera_id);
