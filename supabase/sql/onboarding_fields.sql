-- Add onboarding-related fields for stores/employees

alter table public.stores
  add column if not exists business_type text,
  add column if not exists business_type_other text,
  add column if not exists pos_system text,
  add column if not exists pos_other text,
  add column if not exists hours_weekdays text,
  add column if not exists hours_saturday text,
  add column if not exists hours_sunday_holiday text,
  add column if not exists employees_count integer,
  add column if not exists cameras_count integer;

alter table public.employees
  add column if not exists role_other text;
