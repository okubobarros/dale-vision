-- Admin hard-delete function for user + optional tenant data purge.
-- Idempotent and safe to run multiple times.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(
  p_user_uuid uuid DEFAULT NULL,
  p_django_user_id integer DEFAULT NULL,
  p_delete_org_with_stores boolean DEFAULT false
)
RETURNS TABLE(step text, affected bigint, notes text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_uuid uuid := p_user_uuid;
  v_django_user_id integer := p_django_user_id;
  v_store_id uuid;
  v_org_id uuid;
  v_deleted_count bigint;
BEGIN
  IF v_user_uuid IS NULL AND v_django_user_id IS NULL THEN
    step := 'resolve_target';
    affected := 0;
    notes := 'missing_input';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_user_uuid IS NULL THEN
    BEGIN
      SELECT uim.user_uuid
        INTO v_user_uuid
        FROM public.user_id_map uim
       WHERE uim.django_user_id = v_django_user_id
       LIMIT 1;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  IF v_django_user_id IS NULL AND v_user_uuid IS NOT NULL THEN
    BEGIN
      SELECT uim.django_user_id
        INTO v_django_user_id
        FROM public.user_id_map uim
       WHERE uim.user_uuid = v_user_uuid
       LIMIT 1;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_admin_target_orgs (
    org_id uuid PRIMARY KEY
  ) ON COMMIT DROP;
  TRUNCATE tmp_admin_target_orgs;

  IF v_user_uuid IS NOT NULL THEN
    BEGIN
      INSERT INTO tmp_admin_target_orgs (org_id)
      SELECT DISTINCT om.org_id
        FROM public.org_members om
       WHERE om.user_id = v_user_uuid
      ON CONFLICT (org_id) DO NOTHING;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  -- Remove memberships for target user.
  v_deleted_count := 0;
  IF v_user_uuid IS NOT NULL THEN
    BEGIN
      DELETE FROM public.org_members WHERE user_id = v_user_uuid;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    EXCEPTION
      WHEN undefined_table THEN
        v_deleted_count := 0;
    END;
  END IF;
  step := 'delete_org_members';
  affected := COALESCE(v_deleted_count, 0);
  notes := COALESCE(v_user_uuid::text, 'user_uuid_null');
  RETURN NEXT;

  -- Optional cleanup in backup table.
  v_deleted_count := 0;
  IF v_user_uuid IS NOT NULL AND to_regclass('public._backup_org_members_orphans') IS NOT NULL THEN
    DELETE FROM public._backup_org_members_orphans WHERE user_id = v_user_uuid;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  step := 'delete_backup_org_members_orphans';
  affected := COALESCE(v_deleted_count, 0);
  notes := 'optional';
  RETURN NEXT;

  -- Delete mapping row.
  v_deleted_count := 0;
  BEGIN
    IF v_user_uuid IS NOT NULL THEN
      DELETE FROM public.user_id_map WHERE user_uuid = v_user_uuid;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    ELSIF v_django_user_id IS NOT NULL THEN
      DELETE FROM public.user_id_map WHERE django_user_id = v_django_user_id;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      v_deleted_count := 0;
  END;
  step := 'delete_user_id_map';
  affected := COALESCE(v_deleted_count, 0);
  notes := 'public.user_id_map';
  RETURN NEXT;

  -- Delete Django auth user.
  v_deleted_count := 0;
  IF v_django_user_id IS NOT NULL THEN
    BEGIN
      DELETE FROM public.auth_user WHERE id = v_django_user_id;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    EXCEPTION
      WHEN undefined_table THEN
        v_deleted_count := 0;
    END;
  END IF;
  step := 'delete_auth_user';
  affected := COALESCE(v_deleted_count, 0);
  notes := COALESCE(v_django_user_id::text, 'django_user_id_null');
  RETURN NEXT;

  -- Delete Supabase auth user.
  v_deleted_count := 0;
  IF v_user_uuid IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.users WHERE id = v_user_uuid;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    EXCEPTION
      WHEN undefined_table THEN
        v_deleted_count := 0;
      WHEN insufficient_privilege THEN
        v_deleted_count := 0;
    END;
  END IF;
  step := 'delete_auth_users';
  affected := COALESCE(v_deleted_count, 0);
  notes := 'auth.users';
  RETURN NEXT;

  -- Optional aggressive purge for orphan orgs touched by this user.
  IF p_delete_org_with_stores THEN
    FOR v_org_id IN
      SELECT t.org_id
      FROM tmp_admin_target_orgs t
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.org_members om
        WHERE om.org_id = t.org_id
      )
    LOOP
      IF to_regclass('public.stores') IS NOT NULL THEN
        FOR v_store_id IN
          SELECT s.id FROM public.stores s WHERE s.org_id = v_org_id
        LOOP
          IF to_regclass('public.event_media') IS NOT NULL THEN
            DELETE FROM public.event_media em
             USING public.detection_events de
             WHERE em.event_id = de.id
               AND de.store_id = v_store_id;
          END IF;
          IF to_regclass('public.camera_health_logs') IS NOT NULL THEN
            DELETE FROM public.camera_health_logs chl
             USING public.cameras c
             WHERE chl.camera_id = c.id
               AND c.store_id = v_store_id;
          END IF;
          IF to_regclass('public.camera_roi_configs') IS NOT NULL THEN
            DELETE FROM public.camera_roi_configs crc
             USING public.cameras c
             WHERE crc.camera_id = c.id
               AND c.store_id = v_store_id;
          END IF;
          IF to_regclass('public.shifts') IS NOT NULL THEN
            DELETE FROM public.shifts WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.time_clock_entries') IS NOT NULL THEN
            DELETE FROM public.time_clock_entries WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.employees') IS NOT NULL THEN
            DELETE FROM public.employees WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.alert_rules') IS NOT NULL THEN
            DELETE FROM public.alert_rules WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.notification_logs') IS NOT NULL THEN
            DELETE FROM public.notification_logs WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.detection_events') IS NOT NULL THEN
            DELETE FROM public.detection_events WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.cameras') IS NOT NULL THEN
            DELETE FROM public.cameras WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.store_zones') IS NOT NULL THEN
            DELETE FROM public.store_zones WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.onboarding_progress') IS NOT NULL THEN
            DELETE FROM public.onboarding_progress WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.traffic_metrics') IS NOT NULL THEN
            DELETE FROM public.traffic_metrics WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.conversion_metrics') IS NOT NULL THEN
            DELETE FROM public.conversion_metrics WHERE store_id = v_store_id;
          END IF;
          IF to_regclass('public.event_receipts') IS NOT NULL THEN
            DELETE FROM public.event_receipts WHERE store_id = v_store_id;
          END IF;
        END LOOP;

        DELETE FROM public.stores WHERE org_id = v_org_id;
      END IF;

      IF to_regclass('public.onboarding_progress') IS NOT NULL THEN
        DELETE FROM public.onboarding_progress WHERE org_id = v_org_id;
      END IF;
      IF to_regclass('public.journey_events') IS NOT NULL THEN
        DELETE FROM public.journey_events WHERE org_id = v_org_id;
      END IF;
      IF to_regclass('public.subscriptions') IS NOT NULL THEN
        DELETE FROM public.subscriptions WHERE org_id = v_org_id;
      END IF;
      IF to_regclass('public.billing_customers') IS NOT NULL THEN
        DELETE FROM public.billing_customers WHERE org_id = v_org_id;
      END IF;
      IF to_regclass('public.notification_logs') IS NOT NULL THEN
        DELETE FROM public.notification_logs WHERE org_id = v_org_id;
      END IF;
      IF to_regclass('public.organizations') IS NOT NULL THEN
        DELETE FROM public.organizations WHERE id = v_org_id;
      END IF;
    END LOOP;
  END IF;

  step := 'delete_orphan_orgs';
  affected := (
    SELECT COUNT(*)
    FROM tmp_admin_target_orgs t
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = t.org_id
    )
  );
  notes := CASE WHEN p_delete_org_with_stores THEN 'aggressive' ELSE 'safe' END;
  RETURN NEXT;

  RETURN;
END;
$$;

COMMIT;

-- Usage examples (SQL Editor):
-- 1) Safe: remove only user/auth/mapping/membership, keep org+stores data if still useful.
-- SELECT * FROM public.admin_hard_delete_user(
--   p_user_uuid := '00000000-0000-0000-0000-000000000000'::uuid,
--   p_delete_org_with_stores := false
-- );
--
-- 2) Aggressive: if org becomes orphan, purge org + stores + linked data.
-- SELECT * FROM public.admin_hard_delete_user(
--   p_user_uuid := '00000000-0000-0000-0000-000000000000'::uuid,
--   p_delete_org_with_stores := true
-- );
