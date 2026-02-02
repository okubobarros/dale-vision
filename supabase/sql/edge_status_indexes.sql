-- Run once in the Supabase SQL Editor to add indexes for edge-status queries.
-- NOTE: camera_health_logs does not have created_at in this schema.

create index if not exists idx_chl_camera_checked_at
on public.camera_health_logs (camera_id, checked_at desc);