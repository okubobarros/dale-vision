-- Run once in the Supabase SQL Editor to add indexes for edge-status queries.

create index if not exists idx_chl_camera_checked_at
on public.camera_health_logs (camera_id, checked_at desc);

create index if not exists idx_camera_store_active
on public.cameras (store_id, active);

-- Only create if camera_health_logs.created_at exists (fallback path in code).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'camera_health_logs'
          AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_chl_camera_created_at
        ON public.camera_health_logs (camera_id, created_at desc);
    END IF;
END
$$;