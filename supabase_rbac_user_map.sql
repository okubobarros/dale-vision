-- Idempotent setup for user_id_map and org_members constraints.

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create user_id_map table
CREATE TABLE IF NOT EXISTS public.user_id_map (
  auth_user_id int PRIMARY KEY REFERENCES public.auth_user(id) ON DELETE CASCADE,
  user_uuid uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- 2) Backfill for all auth_user rows without a mapping
INSERT INTO public.user_id_map (auth_user_id)
SELECT au.id
FROM public.auth_user au
LEFT JOIN public.user_id_map um ON um.auth_user_id = au.id
WHERE um.auth_user_id IS NULL;

-- 3) Add FK org_members(user_id) -> user_id_map(user_uuid) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'org_members_user_id_fkey'
      AND conrelid = 'public.org_members'::regclass
  ) THEN
    ALTER TABLE public.org_members
      ADD CONSTRAINT org_members_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.user_id_map(user_uuid)
      ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- org_members table does not exist yet
    NULL;
END $$;

-- 4) Unique index on (org_id, user_id) in org_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'org_members'
      AND indexname = 'org_members_org_id_user_id_uq'
  ) THEN
    CREATE UNIQUE INDEX org_members_org_id_user_id_uq
      ON public.org_members (org_id, user_id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- org_members table does not exist yet
    NULL;
END $$;
