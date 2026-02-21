-- Full bootstrap schema for test DB (matches Supabase current schema).
-- Note: this is for test DB only.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM types (as in Supabase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
        CREATE TYPE alert_severity AS ENUM ('critical','warning','info');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'camera_status') THEN
        CREATE TYPE camera_status AS ENUM ('online','degraded','offline','unknown','error');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM ('open','resolved','ignored');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
        CREATE TYPE org_role AS ENUM ('owner','admin','manager','viewer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
        CREATE TYPE employee_role AS ENUM ('manager','cashier','seller','security','stock','other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new','contacted','scheduled','no_show','trial_active','converted','lost');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','incomplete','blocked');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'store_status') THEN
        CREATE TYPE store_status AS ENUM ('active','inactive','trial','blocked');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_receipt_status') THEN
        CREATE TYPE event_receipt_status AS ENUM ('received','processed','failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM ('dashboard','email','whatsapp');
    END IF;
END$$;

-- Core business tables
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  segment text,
  country text DEFAULT 'BR'::text,
  timezone text DEFAULT 'America/Sao_Paulo'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_ends_at timestamp with time zone,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer'::org_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT org_members_pkey PRIMARY KEY (id),
  CONSTRAINT org_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  code text,
  name text NOT NULL,
  mall_name text,
  city text,
  state text,
  address text,
  status store_status NOT NULL DEFAULT 'trial'::store_status,
  trial_started_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  blocked_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone,
  last_error text,
  business_type text,
  business_type_other text,
  pos_system text,
  pos_other text,
  hours_weekdays text,
  hours_saturday text,
  hours_sunday_holiday text,
  employees_count integer,
  cameras_count integer,
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.store_zones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  zone_type text NOT NULL,
  is_critical boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_zones_pkey PRIMARY KEY (id),
  CONSTRAINT store_zones_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);

CREATE TABLE IF NOT EXISTS public.cameras (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  zone_id uuid,
  name text NOT NULL,
  brand text,
  model text,
  ip text,
  onvif boolean DEFAULT false,
  rtsp_url text,
  username text,
  password text,
  status camera_status NOT NULL DEFAULT 'unknown'::camera_status,
  last_seen_at timestamp with time zone,
  last_snapshot_url text,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  external_id text,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT cameras_pkey PRIMARY KEY (id),
  CONSTRAINT cameras_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT cameras_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.store_zones(id)
);

CREATE TABLE IF NOT EXISTS public.camera_health (
  id uuid NOT NULL,
  last_seen_at timestamp with time zone,
  fps double precision,
  lag_ms integer,
  reconnects integer,
  error text,
  updated_at timestamp with time zone NOT NULL,
  camera_id uuid NOT NULL UNIQUE,
  CONSTRAINT camera_health_pkey PRIMARY KEY (id),
  CONSTRAINT camera_health_camera_id_a9c2bc43_fk_cameras_id FOREIGN KEY (camera_id) REFERENCES public.cameras(id)
);

CREATE TABLE IF NOT EXISTS public.camera_health_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  camera_id uuid NOT NULL,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  status camera_status NOT NULL,
  latency_ms integer,
  snapshot_url text,
  error text,
  CONSTRAINT camera_health_logs_pkey PRIMARY KEY (id),
  CONSTRAINT camera_health_logs_camera_id_fkey FOREIGN KEY (camera_id) REFERENCES public.cameras(id)
);

CREATE TABLE IF NOT EXISTS public.camera_roi_configs (
  id uuid NOT NULL,
  version integer NOT NULL,
  config_json jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  updated_by uuid,
  camera_id uuid NOT NULL,
  CONSTRAINT camera_roi_configs_pkey PRIMARY KEY (id),
  CONSTRAINT camera_roi_configs_camera_id_6cc91bd1_fk_cameras_id FOREIGN KEY (camera_id) REFERENCES public.cameras(id)
);

CREATE TABLE IF NOT EXISTS public.camera_snapshots (
  id uuid NOT NULL,
  snapshot_url text,
  storage_key text,
  captured_at timestamp with time zone,
  metadata jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL,
  camera_id uuid NOT NULL,
  CONSTRAINT camera_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT camera_snapshots_camera_id_171e6e32_fk_cameras_id FOREIGN KEY (camera_id) REFERENCES public.cameras(id)
);

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  full_name text NOT NULL,
  email text,
  role employee_role NOT NULL DEFAULT 'other'::employee_role,
  external_id text,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  role_other text,
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  planned boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT shifts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);

CREATE TABLE IF NOT EXISTS public.time_clock_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  employee_id uuid,
  source text NOT NULL DEFAULT 'manual'::text,
  clock_in_at timestamp with time zone,
  clock_out_at timestamp with time zone,
  evidence_event_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT time_clock_entries_pkey PRIMARY KEY (id),
  CONSTRAINT time_clock_entries_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT time_clock_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  zone_id uuid,
  type text NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning'::alert_severity,
  active boolean DEFAULT true,
  threshold jsonb NOT NULL DEFAULT '{}'::jsonb,
  cooldown_minutes integer NOT NULL DEFAULT 15,
  channels jsonb NOT NULL DEFAULT '{"email": false, "whatsapp": false, "dashboard": true}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT alert_rules_pkey PRIMARY KEY (id),
  CONSTRAINT alert_rules_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT alert_rules_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.store_zones(id)
);

CREATE TABLE IF NOT EXISTS public.detection_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  store_id uuid NOT NULL,
  camera_id uuid,
  zone_id uuid,
  type text NOT NULL,
  severity alert_severity NOT NULL,
  status event_status NOT NULL DEFAULT 'open'::event_status,
  title text NOT NULL,
  description text,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  suppressed_by_rule_id uuid,
  suppressed_reason text,
  resolved_at timestamp with time zone,
  resolved_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT detection_events_pkey PRIMARY KEY (id),
  CONSTRAINT detection_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT detection_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT detection_events_camera_id_fkey FOREIGN KEY (camera_id) REFERENCES public.cameras(id),
  CONSTRAINT detection_events_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.store_zones(id)
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  store_id uuid NOT NULL,
  event_id uuid,
  rule_id uuid,
  channel notification_channel NOT NULL,
  destination text,
  provider text,
  status text NOT NULL,
  provider_message_id text,
  error text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT notification_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT notification_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.detection_events(id),
  CONSTRAINT notification_logs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id)
);

CREATE TABLE IF NOT EXISTS public.event_media (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  media_type text NOT NULL,
  url text NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_media_pkey PRIMARY KEY (id),
  CONSTRAINT event_media_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.detection_events(id)
);

CREATE TABLE IF NOT EXISTS public.demo_leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_name text,
  contact_name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  best_time text,
  status lead_status NOT NULL DEFAULT 'new'::lead_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  operation_type text,
  stores_range text,
  cameras_range text,
  primary_goal text,
  pilot_city text,
  pilot_state text,
  calendly_event_uri text,
  calendly_invitee_uri text,
  scheduled_at timestamp with time zone,
  timezone text DEFAULT 'America/Sao_Paulo'::text,
  camera_brands_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualified_score integer NOT NULL DEFAULT 0,
  primary_goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT demo_leads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.journey_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid,
  org_id uuid,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT journey_events_pkey PRIMARY KEY (id),
  CONSTRAINT journey_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_leads(id),
  CONSTRAINT journey_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  step text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'not_started'::text,
  progress_percent integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT onboarding_progress_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_progress_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  store_id uuid,
  actor_user_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT audit_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT billing_customers_pkey PRIMARY KEY (id),
  CONSTRAINT billing_customers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  stripe_subscription_id text,
  plan_code text NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trialing'::subscription_status,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.edge_edgeeventreceipt (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  receipt_id character varying NOT NULL UNIQUE,
  event_name character varying NOT NULL,
  source character varying NOT NULL,
  store_id character varying,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT edge_edgeeventreceipt_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.edge_edgetoken (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  store_id uuid NOT NULL,
  token_hash character varying NOT NULL UNIQUE,
  active boolean NOT NULL,
  created_at timestamp with time zone NOT NULL,
  last_used_at timestamp with time zone,
  token_plaintext character varying,
  CONSTRAINT edge_edgetoken_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.event_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_name text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  ts timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'unknown'::text,
  lead_id uuid,
  org_id uuid,
  status event_receipt_status NOT NULL DEFAULT 'received'::event_receipt_status,
  attempt_count integer NOT NULL DEFAULT 1,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT event_receipts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_leads(id),
  CONSTRAINT event_receipts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.performance_rankings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  entity_type text NOT NULL,
  store_id uuid,
  employee_id uuid,
  score numeric NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT performance_rankings_pkey PRIMARY KEY (id),
  CONSTRAINT performance_rankings_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT performance_rankings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT performance_rankings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);

CREATE TABLE IF NOT EXISTS public.sales_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  ts_bucket timestamp with time zone NOT NULL,
  transactions integer NOT NULL DEFAULT 0,
  gross_revenue numeric NOT NULL DEFAULT 0,
  avg_ticket numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sales_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT sales_metrics_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);

CREATE TABLE IF NOT EXISTS public.conversion_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  ts_bucket timestamp with time zone NOT NULL,
  conversion_rate numeric NOT NULL DEFAULT 0,
  queue_avg_seconds integer NOT NULL DEFAULT 0,
  staff_active_est integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversion_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT conversion_metrics_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);

CREATE TABLE IF NOT EXISTS public.traffic_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  zone_id uuid,
  ts_bucket timestamp with time zone NOT NULL,
  footfall integer NOT NULL DEFAULT 0,
  engaged integer NOT NULL DEFAULT 0,
  dwell_seconds_avg integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT traffic_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT traffic_metrics_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT traffic_metrics_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.store_zones(id)
);

CREATE TABLE IF NOT EXISTS public.user_id_map (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  django_user_id integer NOT NULL UNIQUE,
  user_uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_id_map_pkey PRIMARY KEY (id)
);

-- Knox tokens (required for auth tests when migrations are disabled)
CREATE TABLE IF NOT EXISTS public.knox_authtoken (
  digest character varying(128) NOT NULL,
  token_key character varying(64) NOT NULL,
  user_id integer NOT NULL,
  created timestamp with time zone NOT NULL DEFAULT now(),
  expiry timestamp with time zone,
  CONSTRAINT knox_authtoken_pkey PRIMARY KEY (digest)
);
CREATE INDEX IF NOT EXISTS knox_authtoken_token_key_idx
  ON public.knox_authtoken (token_key);

CREATE TABLE IF NOT EXISTS public.store_managers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  user_id integer NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer'::org_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT store_managers_pkey PRIMARY KEY (id),
  CONSTRAINT store_managers_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
