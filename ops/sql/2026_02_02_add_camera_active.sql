-- Run once in the Supabase SQL Editor to add the cameras.active flag.

alter table public.cameras
add column if not exists active boolean not null default true;

create index if not exists idx_cameras_store_active
on public.cameras (store_id, active);