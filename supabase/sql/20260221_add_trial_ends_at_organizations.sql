ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL;
