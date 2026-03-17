-- Cleanup bridge between Supabase Auth (auth.users) and Django/public tables.
-- Idempotent and safe to run multiple times.

BEGIN;

-- 1) Ensure user_id_map -> auth_user cascades on delete.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_id_map'
      AND column_name = 'django_user_id'
  ) THEN
    ALTER TABLE public.user_id_map
      DROP CONSTRAINT IF EXISTS user_id_map_django_user_id_fkey;

    ALTER TABLE public.user_id_map
      ADD CONSTRAINT user_id_map_django_user_id_fkey
      FOREIGN KEY (django_user_id)
      REFERENCES public.auth_user(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2) Ensure org_members(user_id) -> user_id_map(user_uuid) cascades on delete.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'org_members'
      AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_id_map'
      AND column_name = 'user_uuid'
  ) THEN
    -- Backup + cleanup orphan org_members rows before enforcing FK.
    CREATE TABLE IF NOT EXISTS public._backup_org_members_orphans (
      LIKE public.org_members INCLUDING ALL
    );

    INSERT INTO public._backup_org_members_orphans
    SELECT om.*
      FROM public.org_members om
     WHERE NOT EXISTS (
       SELECT 1
         FROM public.user_id_map uim
        WHERE uim.user_uuid = om.user_id
     )
       AND NOT EXISTS (
       SELECT 1
         FROM public._backup_org_members_orphans b
        WHERE b.id = om.id
     );

    DELETE FROM public.org_members om
     WHERE NOT EXISTS (
       SELECT 1
         FROM public.user_id_map uim
        WHERE uim.user_uuid = om.user_id
     );

    ALTER TABLE public.org_members
      DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;

    ALTER TABLE public.org_members
      ADD CONSTRAINT org_members_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.user_id_map(user_uuid)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Trigger: when auth.users row is deleted, cleanup public mappings/user row.
CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_django_user_id integer;
BEGIN
  -- Remove membership rows directly keyed by user_uuid (if any exist).
  BEGIN
    DELETE FROM public.org_members WHERE user_id = OLD.id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  -- Resolve and delete mapping + Django user.
  BEGIN
    SELECT uim.django_user_id
      INTO v_django_user_id
      FROM public.user_id_map uim
     WHERE uim.user_uuid = OLD.id
     LIMIT 1;

    DELETE FROM public.user_id_map WHERE user_uuid = OLD.id;
  EXCEPTION
    WHEN undefined_table THEN
      v_django_user_id := NULL;
  END;

  IF v_django_user_id IS NOT NULL THEN
    BEGIN
      DELETE FROM public.auth_user WHERE id = v_django_user_id;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_deleted_cleanup ON auth.users;
CREATE TRIGGER trg_auth_user_deleted_cleanup
AFTER DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_deleted_cleanup();

COMMIT;

-- Post-apply verification (run manually after execution):
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname IN ('org_members_user_id_fkey', 'user_id_map_django_user_id_fkey');
--
-- SELECT tgname
-- FROM pg_trigger
-- WHERE tgname = 'trg_auth_user_deleted_cleanup';
--
-- SELECT count(*) AS orphan_org_members
-- FROM public.org_members om
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.user_id_map uim WHERE uim.user_uuid = om.user_id
-- );
