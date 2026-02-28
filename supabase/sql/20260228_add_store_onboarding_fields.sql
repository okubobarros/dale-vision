-- Add onboarding fields for store segmentation and labor cost
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pos_integration_interest boolean DEFAULT false;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS avg_hourly_labor_cost numeric;
