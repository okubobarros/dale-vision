-- Add external_id to cameras for dedupe by edge agent camera_id.
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS cameras_store_external_id_uq
  ON public.cameras (store_id, external_id)
  WHERE external_id IS NOT NULL;
