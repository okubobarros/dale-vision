-- Add "owner" to employee_role enum for onboarding employees
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'employee_role'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.employee_role ADD VALUE IF NOT EXISTS 'owner';
  END IF;
END $$;
