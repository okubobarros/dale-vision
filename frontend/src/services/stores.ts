// src/services/stores.ts
import api from './api';
import type { StoreDashboard } from '../types/dashboard';

export type StoreStatus = 'active' | 'inactive' | 'maintenance' | 'trial' | 'blocked';
export type StorePlan = 'trial' | 'start' | 'basic' | 'pro' | 'growth' | 'enterprise' | 'paid';

export interface Store {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  business_type?: string | null;
  business_type_other?: string | null;
  pos_system?: string | null;
  pos_other?: string | null;
  pos_integration_interest?: boolean | null;
  avg_hourly_labor_cost?: number | null;
  hours_weekdays?: string | null;
  hours_saturday?: string | null;
  hours_sunday_holiday?: string | null;
  employees_count?: number | null;
  cameras_count?: number | null;
  plan: StorePlan;
  status: StoreStatus;
  last_seen_at?: string | null;
  edge_online?: boolean | null;
  online?: boolean | null;
  last_error?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  blocked_reason?: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string;
  role?: "owner" | "admin" | "manager" | "viewer" | null;
}

export interface StoreMinimal {
  id: string;
  name: string;
  created_at: string | null;
  is_active: boolean;
}

export interface StoreSummary {
  id: string;
  name: string;
  status: StoreStatus | null;
  blocked_reason?: string | null;
  trial_ends_at?: string | null;
  plan?: StorePlan | null;
  role?: "owner" | "admin" | "manager" | "viewer" | null;
}

type StoreWriteFields = {
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: StoreStatus;
  business_type?: string;
  business_type_other?: string;
  pos_system?: string;
  pos_other?: string;
  pos_integration_interest?: boolean;
  avg_hourly_labor_cost?: number;
  hours_weekdays?: string;
  hours_saturday?: string;
  hours_sunday_holiday?: string;
  employees_count?: number;
  cameras_count?: number;
};

export type CreateStorePayload = StoreWriteFields & {
  name: string;
};
export type UpdateStorePayload = Partial<StoreWriteFields & { name: string }>;

export type RegisterPdvInterestPayload = {
  store_id: string
  pdv_system: string
  contact_email: string
  contact_phone?: string
}

export type RegisterPdvInterestResponse = {
  id: string
  status: string
  store_id: string
  pdv_system: string
  contact_email: string
  contact_phone?: string | null
  created_at: string
}

export type PdvTransactionIngestPayload = {
  store_id: string
  source_system: string
  transaction_id: string
  occurred_at: string
  gross_amount: number
  net_amount?: number | null
  currency?: string
  payment_method?: string | null
  metadata?: Record<string, unknown>
}

export type PdvTransactionIngestResponse = {
  ok: boolean
  created: boolean
  id: string
  store_id: string
  org_id: string
  source_system: string
  transaction_id: string
  occurred_at: string | null
  gross_amount: number
  net_amount: number | null
  currency: string
  payment_method: string | null
}

export type PdvTransactionSummaryResponse = {
  period: string
  from: string
  to: string
  store_id: string | null
  transactions_total: number
  gross_total: number
  net_total: number
  avg_ticket: number | null
  stores_total: number
}

export interface StoreMetrics {
  total_cameras: number;
  active_cameras: number;
  today_events: number;
  avg_customer_count: number;
  peak_hour: string;
  alerts_today: number;
}

export interface StoreAnalyticsSummary {
  store_id: string;
  from: string;
  to: string;
  bucket: "hour" | "day";
  totals: {
    total_visitors: number;
    avg_dwell_seconds: number;
    avg_queue_seconds: number;
    avg_staff_active: number;
    avg_conversion_rate: number;
  };
  series: {
    traffic: Array<{
      ts_bucket: string;
      footfall: number;
      dwell_seconds_avg: number;
    }>;
    conversion: Array<{
      ts_bucket: string;
      queue_avg_seconds: number;
      staff_active_est: number;
      conversion_rate: number;
    }>;
  };
  zones: Array<{
    zone_id: string;
    name: string;
    footfall: number;
    dwell_seconds_avg: number;
  }>;
  meta?: {
    metric_governance?: {
      totals?: Record<
        string,
        MetricGovernanceItem
      >;
      series?: Record<
        string,
        MetricGovernanceItem
      >;
      zones?: MetricGovernanceItem;
    };
  };
}

export type MetricGovernanceItem = {
  metric_status: "official" | "proxy" | "estimated" | "unsupported"
  source_method: string
  ownership_mode?: string
  label?: string
}

export type StoreOverviewCamera = {
  id: string
  name: string
  status?: string | null
  last_seen_at?: string | null
  last_snapshot_url?: string | null
  last_error?: string | null
  zone_id?: string | null
}

export type StoreOverviewEmployee = {
  id: string
  full_name: string
  role?: string | null
  email?: string | null
  active?: boolean | null
}

export type StoreOverviewAlert = {
  id: string
  title?: string | null
  severity?: string | null
  status?: string | null
  occurred_at?: string | null
  created_at?: string | null
  type?: string | null
}

export type StoreOverview = {
  store: {
    id: string
    name: string
    city?: string | null
    state?: string | null
    status?: StoreStatus | null
    employees_count?: number | null
    trial_ends_at?: string | null
  }
  metrics_summary: StoreAnalyticsSummary
  edge_health: {
    last_seen_at?: string | null
    last_error?: string | null
  }
  cameras: StoreOverviewCamera[]
  employees: StoreOverviewEmployee[]
  last_alerts: StoreOverviewAlert[]
}

export interface NetworkDashboard {
  total_stores: number;
  active_stores: number;
  total_visitors: number;
  avg_conversion: number;
  stores: Array<{
    id: string;
    name: string;
    status: string;
    location?: string | null;
    health?: number | null;
    visitor_flow?: number | null;
    conversion?: number | null;
    alerts?: number | null;
  }>;
}

export interface NetworkVisionIngestionSummary {
  from: string
  to: string
  filters: {
    event_source: "vision" | "retail" | "all"
    camera_id?: string | null
    zone_id?: string | null
    roi_entity_id?: string | null
    window_hours: number
  }
  network: {
    total_stores: number
    active_stores: number
  }
  vision_summary: {
    by_event_type: Record<string, number>
    total: number
    latest_event_at?: string | null
  }
  retail_summary: {
    by_event_name: Record<string, number>
    total: number
    latest_event_at?: string | null
  }
  operational_summary: {
    events_total: number
    latest_event_at?: string | null
    pipeline_status: "healthy" | "stale" | "no_signal"
    recommended_action: string
    dedupe_model: string
    operational_window?: {
      status: "healthy" | "stale" | "no_data"
      latest_bucket_at?: string | null
      freshness_seconds?: number | null
      coverage_stores: number
      coverage_rate: number
      recommended_action: string
      model: string
    }
  }
}

export interface StoreVisionIngestionSummary {
  store_id: string
  from: string
  to: string
  filters: {
    event_source: "vision" | "retail" | "all"
    camera_id?: string | null
    zone_id?: string | null
    roi_entity_id?: string | null
    window_hours: number
  }
  vision_summary: {
    by_event_type: Record<string, number>
    total: number
    latest_event_at?: string | null
  }
  retail_summary: {
    by_event_name: Record<string, number>
    total: number
    latest_event_at?: string | null
  }
  operational_summary: {
    events_total: number
    latest_event_at?: string | null
    pipeline_status: "healthy" | "stale" | "no_signal"
    recommended_action: string
    dedupe_model: string
    operational_window?: {
      status: "healthy" | "stale" | "no_data"
      latest_bucket_at?: string | null
      freshness_seconds?: number | null
      coverage_stores: number
      coverage_rate: number
      recommended_action: string
      model: string
    }
  }
}

export interface StoreEdgeStatus {
  store_id: string;
  ok?: boolean;
  online?: boolean;
  connectivity_status?: "online" | "degraded" | "offline" | null;
  connectivity_age_seconds?: number | null;
  pipeline_status?: "healthy" | "stale" | "no_data" | null;
  health_fresh_seconds?: number | null;
  store_status?: string;
  store_status_age_seconds?: number | null;
  store_status_reason?: string | null;
  camera_source_mode_detected?: "api_first" | "local_only_or_unknown" | "unknown" | null;
  camera_sync_last_pull_at?: string | null;
  camera_sync_age_seconds?: number | null;
  last_heartbeat: string | null;
  last_heartbeat_at?: string | null;
  last_comm_at?: string | null;
  last_seen_at?: string | null;
  last_metric_bucket: string | null;
  last_error: string | null;
  cameras_total?: number;
  cameras_online?: number;
  cameras_degraded?: number;
  cameras_offline?: number;
  cameras_unknown?: number;
  cameras: Array<{
    camera_id: string;
    external_id?: string | null;
    name: string;
    last_snapshot_url?: string | null;
    status: string;
    age_seconds?: number | null;
    reason?: string | null;
    camera_last_heartbeat_ts?: string | null;
  }>;
}

export interface StoreEdgeSetupPayload {
  store_id: string;
  edge_token?: string | null;
  agent_id_suggested?: string | null;
  agent_id_default?: string | null;
  cloud_base_url?: string | null;
  has_active_token?: boolean;
  token_created_at?: string | null;
  token_last_used_at?: string | null;
}

export type StoreEdgeUpdatePolicy = {
  active: boolean
  channel: "stable" | "canary"
  target_version?: string | null
  current_version?: string | null
  version_gap?: "up_to_date" | "outdated" | "unknown"
  current_min_supported?: string | null
  rollout_window: {
    start_local: string
    end_local: string
    timezone: string
  }
  package?: {
    url: string
    sha256: string
    size_bytes?: number | null
  } | null
  health_gate: {
    max_boot_seconds: number
    require_heartbeat_seconds: number
    require_camera_health_count: number
  }
  rollback_policy: {
    enabled: boolean
    max_failed_attempts: number
  }
  updated_at?: string | null
}

export type StoreEdgeUpdatePolicyResponse = {
  store_id: string
  store_name: string
  policy: StoreEdgeUpdatePolicy
}

export type StoreEdgeUpdateEvent = {
  event_id: string
  agent_id?: string | null
  from_version?: string | null
  to_version?: string | null
  channel?: string | null
  status: string
  phase?: string | null
  event: string
  attempt?: number | null
  elapsed_ms?: number | null
  reason_code?: string | null
  reason_detail?: string | null
  playbook_hint?: string | null
  timestamp?: string | null
}

export type StoreEdgeUpdateEventsResponse = {
  store_id: string
  store_name: string
  filters: {
    limit: number
    status?: string | null
    agent_id?: string | null
  }
  items: StoreEdgeUpdateEvent[]
}

export type StoreEdgeUpdateAttempt = {
  attempt: number
  agent_id?: string | null
  channel?: string | null
  from_version?: string | null
  to_version?: string | null
  final_status: "healthy" | "failed" | "rolled_back" | "incomplete"
  first_event_at?: string | null
  last_event_at?: string | null
  duration_seconds?: number | null
  event_count: number
  reason_codes: string[]
  events: Array<{
    id: string
    event?: string | null
    status?: string | null
    phase?: string | null
    reason_code?: string | null
    timestamp?: string | null
  }>
}

export type StoreEdgeUpdateAttemptsResponse = {
  store_id: string
  store_name: string
  filters: {
    limit: number
  }
  items: StoreEdgeUpdateAttempt[]
}

export type StoreEdgeUpdateRunbookResponse = {
  store_id: string
  store_name: string
  generated_at: string
  runbook: {
    reason_code?: string | null
    known_reason: boolean
    title: string
    severity: "media" | "alta" | "critica"
    summary: string
    immediate_actions: string[]
    diagnostic_steps: string[]
    evidence_to_collect: string[]
  }
}

export type StoreEdgeUpdateRunbookOpenedPayload = {
  reason_code?: string
  source_page?: string
}

export type NetworkEdgeUpdateRolloutSummaryResponse = {
  scope: "network"
  filters: {
    channel: "all" | "stable" | "canary"
  }
  totals: {
    stores: number
    with_policy: number
    channel: {
      stable: number
      canary: number
    }
    version_gap: {
      up_to_date: number
      outdated: number
      unknown: number
    }
    health: {
      healthy: number
      degraded: number
      in_progress: number
      no_data: number
    }
  }
  rollout_health: {
    status: "healthy" | "degraded" | "attention" | "no_data"
    recommended_action: string
  }
  rollout_metrics: {
    attempts_total: number
    attempts_successful: number
    attempts_failed: number
    attempts_rolled_back: number
    attempts_incomplete: number
    success_rate_pct: number
    failure_rate_pct: number
    rollback_rate_pct: number
    avg_duration_seconds?: number | null
  }
  critical_stores: Array<{
    store_id: string
    store_name?: string | null
    health: "degraded" | "in_progress"
    channel: "stable" | "canary"
    current_version?: string | null
    target_version?: string | null
    version_gap?: "up_to_date" | "outdated" | "unknown"
    last_event?: string | null
    last_status?: string | null
    reason_code?: string | null
    timestamp?: string | null
  }>
  generated_at: string
}

export type NetworkEdgeUpdateValidationSummaryResponse = {
  scope: "network"
  filters: {
    channel: "all" | "stable" | "canary"
    hours: number
  }
  summary: {
    stores_total: number
    stores_with_healthy_attempt: number
    stores_with_failure_attempt: number
    stores_with_rollback_attempt: number
    attempts_total: number
    healthy_attempts: number
    failed_attempts: number
    rollback_attempts: number
    incomplete_attempts: number
    success_rate_pct: number
    failure_rate_pct: number
    rollback_rate_pct: number
    avg_duration_seconds?: number | null
    decision: "GO" | "NO-GO"
  }
  checklist: {
    canary_ready: boolean
    rollback_ready: boolean
    telemetry_ready: boolean
  }
  stores: Array<{
    store_id: string
    attempts_total: number
    healthy_attempts: number
    failed_attempts: number
    rollback_attempts: number
    incomplete_attempts: number
    has_healthy_attempt: boolean
    has_failure_attempt: boolean
    has_rollback_attempt: boolean
  }>
  generated_at: string
}

export type RotateEdgeTokenResult =
  | ({ supported: true } & StoreEdgeSetupPayload)
  | { supported: false };

export type StoreCeoDashboard = {
  store_id: string
  store_name: string
  timezone: string
  period: "day" | "7d"
  generated_at: string
  series: {
    flow_by_hour: Array<{
      ts_bucket: string | null
      footfall: number
      dwell_seconds_avg: number
      hour_label?: string | null
    }>
    idle_index_by_hour: Array<{
      ts_bucket: string | null
      idle_index: number
      staff_active_est: number
      footfall: number
    }>
  }
  kpis: {
    avg_dwell_seconds: number
    avg_queue_seconds: number
    avg_conversion_rate: number
    queue_now_seconds: number
    queue_now_people: number
    queue_now_bucket?: string | null
    queue_now_estimated?: boolean
  }
  overlay: {
    flow_peak_hour?: string | null
    idle_peak_hour?: string | null
    message?: string | null
  }
  meta?: {
    idle_index_estimated?: boolean
    idle_index_method?: string
    queue_now_method?: string
    metric_governance?: Record<string, MetricGovernanceItem>
    [key: string]: unknown
  }
}

export type StoreEvidenceItem = {
  id: string
  title?: string | null
  severity?: string | null
  status?: string | null
  occurred_at?: string | null
  camera_id?: string | null
  zone_id?: string | null
  metadata?: Record<string, unknown>
  type?: string | null
  media?: Array<{ url?: string | null; type?: string | null }>
}

export type StoreEvidenceResponse = {
  store_id: string
  hour_bucket: string
  events: StoreEvidenceItem[]
}

export type StoreProductivityCoverageWindow = {
  ts_bucket: string | null
  hour_label: string | null
  window_minutes?: number
  footfall: number
  staff_planned_ref: number
  staff_detected_est: number
  coverage_gap: number
  gap_status: "critica" | "atencao" | "adequada"
  source_flags: Record<string, string>
  confidence_score?: number
  method?: {
    id: string
    version: string
  }
}

export type StoreProductivityCoverageResponse = {
  period: string
  from?: string | null
  to?: string | null
  store_id: string
  stores_count: number
  method: {
    id: string
    version: string
    label: string
    description: string
  }
  confidence_governance: {
    status: "insuficiente" | "parcial" | "confiavel" | "alto"
    score: number
    source_flags: Record<string, string>
    caveats: string[]
  }
  summary: {
    gaps_total: number
    critical_windows: number
    warning_windows: number
    adequate_windows: number
    worst_window: StoreProductivityCoverageWindow | null
    best_window: StoreProductivityCoverageWindow | null
    peak_flow_window: StoreProductivityCoverageWindow | null
    opportunity_window: StoreProductivityCoverageWindow | null
    planned_source_mode?: "manual" | "proxy"
  }
  windows: StoreProductivityCoverageWindow[]
}

export type StoreVisionAuditItem = {
  receipt_id: string
  event_type: string
  camera_id?: string | null
  camera_role?: string | null
  zone_id?: string | null
  roi_entity_id?: string | null
  roi_version?: string | null
  metric_type?: string | null
  ownership?: string | null
  direction?: string | null
  count_value: number
  staff_active_est?: number | null
  duration_seconds?: number | null
  confidence?: number | null
  track_id_hash?: string | null
  ts?: string | null
  raw_payload?: Record<string, unknown>
}

export type StoreVisionAuditResponse = {
  store_id: string
  from: string
  to: string
  filters: {
    event_type?: string | null
    camera_id?: string | null
    zone_id?: string | null
    roi_entity_id?: string | null
    limit: number
  }
  summary: Record<string, number>
  items: StoreVisionAuditItem[]
}

export type VisionConfidenceStatus = "pronto" | "parcial" | "recalibrar"

export type StoreVisionConfidenceMetric = {
  metric_key: string
  event_type: string
  status: VisionConfidenceStatus
  coverage_score: number
  confidence_score: number
  events_24h: number
  last_event_at?: string | null
  roi_version?: string | null
  reasons: string[]
  latest_calibration?: {
    metric_type: string
    roi_version?: string | null
    manual_sample_size?: number | null
    manual_reference_value?: number | null
    system_value?: number | null
    error_pct?: number | null
    approved_by?: string | null
    approved_at?: string | null
    notes?: string | null
    status?: string | null
    created_at?: string | null
  } | null
}

export type StoreVisionConfidenceCamera = {
  camera_id: string
  camera_name: string
  camera_role: string
  camera_status: string
  store_status: VisionConfidenceStatus
  last_seen_at?: string | null
  roi_published: boolean
  roi_version?: string | null
  metrics: StoreVisionConfidenceMetric[]
}

export type StoreVisionConfidenceResponse = {
  store_id: string
  generated_at: string
  window_hours: number
  store_status: VisionConfidenceStatus
  summary: {
    cameras_total: number
    cameras_with_published_roi: number
    metrics_ready: number
    metrics_partial: number
    metrics_recalibrate: number
  }
  cameras: StoreVisionConfidenceCamera[]
}

export type StoreVisionCalibrationAction = {
  camera_id: string
  camera_name: string
  camera_role: string
  camera_status: string
  metric_key: string
  metric_label: string
  event_type: string
  status: VisionConfidenceStatus
  priority: "alta" | "media"
  action_code: string
  title: string
  description: string
  playbook_hint: string
  reasons: string[]
  coverage_score: number
  confidence_score: number
  events_24h: number
  roi_published: boolean
  roi_version?: string | null
  last_event_at?: string | null
  last_seen_at?: string | null
  audit_filters: {
    camera_id?: string | null
    event_type?: string | null
  }
}

export type StoreVisionCalibrationPlanResponse = {
  store_id: string
  generated_at: string
  window_hours: number
  store_status: VisionConfidenceStatus
  summary: {
    cameras_total: number
    cameras_with_published_roi: number
    metrics_ready: number
    metrics_partial: number
    metrics_recalibrate: number
    actions_total: number
    high_priority: number
    medium_priority: number
  }
  actions: StoreVisionCalibrationAction[]
}

export type StoreVisionCalibrationRun = {
  id: string
  store_id: string
  camera_id: string
  metric_type: string
  roi_version?: string | null
  manual_sample_size?: number | null
  manual_reference_value?: number | null
  system_value?: number | null
  error_pct?: number | null
  approved_by?: string | null
  approved_at?: string | null
  notes?: string | null
  status: string
  created_at?: string | null
  updated_at?: string | null
}

export type StoreVisionCalibrationRunsResponse = {
  store_id: string
  filters: {
    camera_id?: string | null
    metric_type?: string | null
    limit: number
  }
  items: StoreVisionCalibrationRun[]
}

export type CreateStoreVisionCalibrationRunPayload = {
  camera_id: string
  metric_type: "entry_exit" | "queue" | "checkout_proxy" | "occupancy"
  roi_version?: string
  manual_sample_size?: number
  manual_reference_value?: number
  system_value?: number
  error_pct?: number
  notes?: string
  status?: "approved" | "draft"
}

const omitEmpty = <T extends Record<string, unknown>>(payload: T): Partial<T> => {
  const result: Partial<T> = {};

  (Object.keys(payload) as Array<keyof T>).forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value === '') return;
    result[key] = value;
  });

  return result;
};

type ApiErrorLike = {
  response?: { status?: number; data?: { detail?: string; code?: string; message?: string; details?: unknown; upgrade_url?: string } };
  message?: string;
  code?: string;
};

const STORES_CACHE_KEYS = {
  summary: "dv_stores_summary_cache_v1",
  minimal: "dv_stores_min_cache_v1",
  full: "dv_stores_full_cache_v1",
  dashboardPrefix: "dv_store_dashboard_cache_v1_",
  edgeStatusPrefix: "dv_store_edge_status_cache_v1_",
} as const

const clearStoresCache = () => {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORES_CACHE_KEYS.summary)
    localStorage.removeItem(STORES_CACHE_KEYS.minimal)
    localStorage.removeItem(STORES_CACHE_KEYS.full)

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (
        key.startsWith(STORES_CACHE_KEYS.dashboardPrefix) ||
        key.startsWith(STORES_CACHE_KEYS.edgeStatusPrefix)
      ) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore storage errors
  }
}

type CachedPayload<T> = {
  ts: string
  data: T[]
}

type CachedObjectPayload<T> = {
  ts: string
  data: T
}

const readStoresCache = <T>(key: string): T[] | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload<T> | T[]
    const data = Array.isArray((parsed as CachedPayload<T>).data)
      ? (parsed as CachedPayload<T>).data
      : Array.isArray(parsed)
      ? (parsed as T[])
      : null
    return data && Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

const writeStoresCache = <T>(key: string, data: T[]) => {
  if (typeof window === "undefined") return
  try {
    const payload: CachedPayload<T> = { ts: new Date().toISOString(), data }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}

const readObjectCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedObjectPayload<T> | T
    if (parsed && typeof parsed === "object" && "data" in (parsed as CachedObjectPayload<T>)) {
      return (parsed as CachedObjectPayload<T>).data
    }
    return parsed as T
  } catch {
    return null
  }
}

const writeObjectCache = <T>(key: string, data: T) => {
  if (typeof window === "undefined") return
  try {
    const payload: CachedObjectPayload<T> = { ts: new Date().toISOString(), data }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}

const isAuthError = (error: ApiErrorLike | unknown) => {
  const status = (error as ApiErrorLike)?.response?.status
  return status === 401 || status === 403
}

const logDev = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args)
}

const logDevError = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.error(...args)
}

const normalizeApiError = (error: unknown, fallbackMessage: string) => {
  const err = (error || {}) as ApiErrorLike;
  const detail =
    err.response?.data?.message ||
    err.response?.data?.detail ||
    err.message ||
    fallbackMessage;
  const normalized = new Error(detail);
  (normalized as ApiErrorLike).response = {
    status: err.response?.status,
    data: {
      message: err.response?.data?.message,
      detail,
      details: err.response?.data?.details,
      code: err.response?.data?.code,
      upgrade_url: err.response?.data?.upgrade_url,
    },
  };
  (normalized as ApiErrorLike).code = err.response?.data?.code || err.code;
  return normalized;
};

const normalizeEdgeSetup = (
  data: Partial<StoreEdgeSetupPayload> | null | undefined,
  storeId: string
): StoreEdgeSetupPayload => ({
  store_id: data?.store_id ?? storeId,
  edge_token: data?.edge_token ?? null,
  agent_id_suggested: data?.agent_id_suggested,
  agent_id_default: data?.agent_id_default,
  cloud_base_url: data?.cloud_base_url,
  has_active_token: Boolean(data?.has_active_token),
  token_created_at: data?.token_created_at ?? null,
  token_last_used_at: data?.token_last_used_at ?? null,
});

const normalizeEdgeStatus = (
  data: Partial<StoreEdgeStatus> | null | undefined,
  storeId: string
): StoreEdgeStatus => ({
  store_id: data?.store_id ?? storeId,
  ok: data?.ok,
  online: typeof data?.online === "boolean" ? data.online : undefined,
  connectivity_status:
    data?.connectivity_status ??
    (typeof data?.online === "boolean" ? (data.online ? "online" : "offline") : null),
  connectivity_age_seconds: data?.connectivity_age_seconds ?? data?.store_status_age_seconds ?? null,
  pipeline_status: data?.pipeline_status ?? null,
  health_fresh_seconds: data?.health_fresh_seconds ?? null,
  store_status: data?.store_status,
  store_status_age_seconds: data?.store_status_age_seconds ?? null,
  store_status_reason: data?.store_status_reason ?? null,
  camera_source_mode_detected: data?.camera_source_mode_detected ?? null,
  camera_sync_last_pull_at: data?.camera_sync_last_pull_at ?? null,
  camera_sync_age_seconds: data?.camera_sync_age_seconds ?? null,
  last_heartbeat: data?.last_heartbeat ?? null,
  last_heartbeat_at: data?.last_heartbeat_at ?? null,
  last_comm_at: data?.last_comm_at ?? null,
  last_seen_at:
    data?.last_comm_at ??
    data?.last_seen_at ??
    data?.last_heartbeat_at ??
    data?.last_heartbeat ??
    null,
  last_metric_bucket: data?.last_metric_bucket ?? null,
  last_error: data?.last_error ?? null,
  cameras_total: data?.cameras_total ?? 0,
  cameras_online: data?.cameras_online ?? 0,
  cameras_degraded: data?.cameras_degraded ?? 0,
  cameras_offline: data?.cameras_offline ?? 0,
  cameras_unknown: data?.cameras_unknown ?? 0,
  cameras: Array.isArray(data?.cameras) ? data?.cameras ?? [] : [],
});

export const storesService = {
  clearCache(): void {
    clearStoresCache()
  },
  getCachedStoresSummary(): StoreSummary[] | null {
    return readStoresCache<StoreSummary>(STORES_CACHE_KEYS.summary)
  },
  getCachedStoresMinimal(): StoreMinimal[] | null {
    return readStoresCache<StoreMinimal>(STORES_CACHE_KEYS.minimal)
  },
  getCachedStores(): Store[] | null {
    return readStoresCache<Store>(STORES_CACHE_KEYS.full)
  },
  // Listar lojas com payload mínimo (para telas rápidas)
  async getStoresMinimal(options?: { allowCachedFallback?: boolean }): Promise<StoreMinimal[]> {
    const allowCachedFallback = options?.allowCachedFallback ?? true
    logDev("🔄 Buscando lojas (view=min)...")
    try {
      const response = await api.get("/v1/stores/", {
        params: { view: "min" },
        timeoutCategory: "best-effort",
        noRetry: true,
      });
      const payload = response.data;
      const stores = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
        ? payload.results
        : [];
      logDev(`✅ Encontradas ${stores?.length || 0} lojas (min)`);
      writeStoresCache(STORES_CACHE_KEYS.minimal, stores)
      return stores;
    } catch (error) {
      logDevError("❌ Erro ao buscar lojas (min):", error);
      if (allowCachedFallback && !isAuthError(error)) {
        const cached = readStoresCache<StoreMinimal>(STORES_CACHE_KEYS.minimal)
        if (cached?.length) return cached
      }
      throw normalizeApiError(error, "Falha ao carregar lojas.");
    }
  },

  // Listar lojas com payload summary (status/role/plan)
  async getStoresSummary(): Promise<StoreSummary[]> {
    logDev("🔄 Buscando lojas (view=summary)...")
    try {
      const response = await api.get("/v1/stores/", {
        params: { view: "summary" },
        timeoutCategory: "critical",
      });
      const payload = response.data;
      const stores = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
        ? payload.results
        : [];
      logDev(`✅ Encontradas ${stores?.length || 0} lojas (summary)`);
      writeStoresCache(STORES_CACHE_KEYS.summary, stores)
      return stores;
    } catch (error) {
      logDevError("❌ Erro ao buscar lojas (summary):", error);
      if (!isAuthError(error)) {
        const cached = readStoresCache<StoreSummary>(STORES_CACHE_KEYS.summary)
        if (cached?.length) return cached
      }
      throw normalizeApiError(error, "Falha ao carregar lojas.");
    }
  },

  // Listar todas as lojas do usuário
  async getStores(): Promise<Store[]> {
    logDev("🔄 Buscando lojas... (fetching stores)")
    try {
      const response = await api.get('/v1/stores/', {
        timeoutCategory: "critical",
      });
      logDev('📦 Resposta completa:', response);

      const payload = response.data;
      const stores = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
        ? payload.results
        : [];
      logDev(`✅ Encontradas ${stores?.length || 0} lojas`);
      writeStoresCache(STORES_CACHE_KEYS.full, stores)

      return stores;
    } catch (error) {
      logDevError('❌ Erro ao buscar lojas:', error);
      if (!isAuthError(error)) {
        const cached = readStoresCache<Store>(STORES_CACHE_KEYS.full)
        if (cached?.length) return cached
      }
      throw normalizeApiError(error, 'Falha ao carregar lojas.');
    }
  },

  // Obter dashboard completo (novo formato)
  async getStoreDashboard(storeId: string): Promise<StoreDashboard> {
    logDev(`🔄 Buscando dashboard para loja ${storeId}`);
    const cacheKey = `${STORES_CACHE_KEYS.dashboardPrefix}${storeId}`
    try {
      const response = await api.get(`/v1/stores/${storeId}/dashboard/`, {
        timeoutCategory: "critical",
        noRetry: true,
      });
      logDev('✅ Dashboard response:', response.data);
      writeObjectCache(cacheKey, response.data as StoreDashboard)
      return response.data;
    } catch (error) {
      logDevError('❌ Erro ao buscar dashboard:', error);
      if (!isAuthError(error)) {
        const cached = readObjectCache<StoreDashboard>(cacheKey)
        if (cached) return cached
      }
      throw error;
    }
  },

  async getStoreCeoDashboard(
    storeId: string,
    params?: { period?: "day" | "7d" }
  ): Promise<StoreCeoDashboard> {
    const response = await api.get(`/v1/stores/${storeId}/ceo-dashboard/`, { params })
    return response.data as StoreCeoDashboard
  },

  async getProductivityEvidence(
    storeId: string,
    hourBucket: string
  ): Promise<StoreEvidenceResponse> {
    const response = await api.get(`/v1/stores/${storeId}/productivity/evidence/`, {
      params: { hour_bucket: hourBucket },
    })
    return response.data as StoreEvidenceResponse
  },

  async getStoreProductivityCoverage(
    storeId: string,
    params?: { period?: string; from?: string; to?: string }
  ): Promise<StoreProductivityCoverageResponse> {
    const response = await api.get(`/v1/stores/${storeId}/productivity/coverage/`, { params })
    return response.data as StoreProductivityCoverageResponse
  },

  // Obter métricas no formato antigo (para compatibilidade se necessário)
  // NOTE: keep storeId in signature for API compatibility; reference it to avoid TS6133.
  async getStoreMetrics(storeId: string): Promise<StoreMetrics> {
    void storeId;
    return {
      total_cameras: 0,
      active_cameras: 0,
      today_events: 0,
      avg_customer_count: 0,
      peak_hour: "",
      alerts_today: 0,
    };
  },

  async getStoreAnalyticsSummary(storeId: string, params?: { period?: string; from?: string; to?: string; bucket?: "hour" | "day" }): Promise<StoreAnalyticsSummary> {
    const response = await api.get(`/v1/stores/${storeId}/metrics/summary/`, { params })
    return response.data as StoreAnalyticsSummary
  },

  async getStoreVisionAudit(
    storeId: string,
    params?: {
      from?: string
      to?: string
      event_type?: string
      camera_id?: string
      zone_id?: string
      roi_entity_id?: string
      limit?: number
    }
  ): Promise<StoreVisionAuditResponse> {
    const response = await api.get(`/v1/stores/${storeId}/vision/audit/`, { params })
    return response.data as StoreVisionAuditResponse
  },

  async getStoreVisionConfidence(
    storeId: string,
    params?: {
      window_hours?: number
    }
  ): Promise<StoreVisionConfidenceResponse> {
    const response = await api.get(`/v1/stores/${storeId}/vision/confidence/`, { params })
    return response.data as StoreVisionConfidenceResponse
  },

  async getStoreVisionIngestionSummary(
    storeId: string,
    params?: {
      event_source?: "vision" | "retail" | "all"
      event_type?: string
      window_hours?: number
      camera_id?: string
      zone_id?: string
      roi_entity_id?: string
    }
  ): Promise<StoreVisionIngestionSummary> {
    const response = await api.get(`/v1/stores/${storeId}/vision/ingestion-summary/`, { params })
    return response.data as StoreVisionIngestionSummary
  },

  async getStoreVisionCalibrationPlan(
    storeId: string,
    params?: {
      window_hours?: number
    }
  ): Promise<StoreVisionCalibrationPlanResponse> {
    const response = await api.get(`/v1/stores/${storeId}/vision/calibration-plan/`, { params })
    return response.data as StoreVisionCalibrationPlanResponse
  },

  async getStoreVisionCalibrationRuns(
    storeId: string,
    params?: {
      camera_id?: string
      metric_type?: string
      limit?: number
    }
  ): Promise<StoreVisionCalibrationRunsResponse> {
    const response = await api.get(`/v1/stores/${storeId}/vision/calibration-runs/`, { params })
    return response.data as StoreVisionCalibrationRunsResponse
  },

  async createStoreVisionCalibrationRun(
    storeId: string,
    payload: CreateStoreVisionCalibrationRunPayload
  ): Promise<StoreVisionCalibrationRun> {
    const response = await api.post(`/v1/stores/${storeId}/vision/calibration-runs/`, payload)
    return response.data as StoreVisionCalibrationRun
  },

  async getStoreOverview(storeId: string): Promise<StoreOverview> {
    const response = await api.get(`/v1/stores/${storeId}/overview/`)
    return response.data as StoreOverview
  },

  // Obter visão da rede (todas as lojas)
  async getNetworkDashboard(): Promise<NetworkDashboard> {
    try {
      const response = await api.get('/v1/stores/network_dashboard/', {
        timeoutCategory: "critical",
        noRetry: true,
      });
      const raw = response.data as
        | {
            total_stores?: number
            active_stores?: number
            total_visitors?: number
            avg_conversion?: number
            stores?: NetworkDashboard["stores"]
            network?: {
              total_stores?: number
              active_stores?: number
              total_visitors?: number
              avg_conversion?: number
            }
          }
        | undefined
      const network = raw?.network ?? raw
      return {
        total_stores: Number(network?.total_stores ?? 0),
        active_stores: Number(network?.active_stores ?? 0),
        total_visitors: Number(network?.total_visitors ?? 0),
        avg_conversion: Number(network?.avg_conversion ?? 0),
        stores: Array.isArray(raw?.stores) ? raw.stores : [],
      }
    } catch (error) {
      logDevError('❌ Erro ao buscar network dashboard:', error);
      throw error;
    }
  },

  async getNetworkVisionIngestionSummary(params?: {
    event_source?: "vision" | "retail" | "all"
    event_type?: string
    window_hours?: number
    camera_id?: string
    zone_id?: string
    roi_entity_id?: string
  }): Promise<NetworkVisionIngestionSummary> {
    try {
      const response = await api.get("/v1/stores/network/vision/ingestion-summary/", {
        params,
        timeoutCategory: "best-effort",
        noRetry: true,
      })
      return response.data as NetworkVisionIngestionSummary
    } catch (error) {
      logDevError("⚠️ Falha no network vision ingestion summary. Usando fallback.", error)
      const nowIso = new Date().toISOString()
      const windowHours = Number(params?.window_hours ?? 24)
      const fromIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
      return {
        from: fromIso,
        to: nowIso,
        filters: {
          event_source: (params?.event_source ?? "all") as "vision" | "retail" | "all",
          camera_id: params?.camera_id ?? null,
          zone_id: params?.zone_id ?? null,
          roi_entity_id: params?.roi_entity_id ?? null,
          window_hours: windowHours,
        },
        network: {
          total_stores: 0,
          active_stores: 0,
        },
        vision_summary: {
          by_event_type: {},
          total: 0,
          latest_event_at: null,
        },
        retail_summary: {
          by_event_name: {},
          total: 0,
          latest_event_at: null,
        },
        operational_summary: {
          events_total: 0,
          latest_event_at: null,
          pipeline_status: "no_signal",
          recommended_action: "Aguardando sinal do backend.",
          dedupe_model: "event_receipts_unique_event_id",
          operational_window: {
            status: "no_data",
            latest_bucket_at: null,
            freshness_seconds: null,
            coverage_stores: 0,
            coverage_rate: 0,
            recommended_action: "Sem dados de janela operacional no momento.",
            model: "operational_window_hourly",
          },
        },
      }
    }
  },

  async getEdgeSetup(storeId: string): Promise<StoreEdgeSetupPayload> {
    try {
      const response = await api.get(`/v1/stores/${storeId}/edge-setup/`, {
        timeoutCategory: "long",
        noRetry: true,
      });
      return normalizeEdgeSetup(response.data, storeId);
    } catch (error) {
      logDevError('❌ Erro ao obter credenciais do edge:', error);
      throw normalizeApiError(error, 'Falha ao obter credenciais do edge.');
    }
  },

  async getStoreEdgeSetup(storeId: string): Promise<StoreEdgeSetupPayload> {
    return this.getEdgeSetup(storeId);
  },

  async rotateEdgeToken(storeId: string): Promise<RotateEdgeTokenResult> {
    try {
      const response = await api.post(`/v1/stores/${storeId}/edge-token/rotate/`, undefined, {
        timeoutCategory: "long",
        noRetry: true,
      });
      return { supported: true, ...normalizeEdgeSetup(response.data, storeId) };
    } catch (error) {
      const apiError = error as ApiErrorLike;
      if (apiError.response?.status === 404) {
        return { supported: false };
      }
      logDevError('❌ Erro ao rotacionar token do edge:', error);
      throw normalizeApiError(error, 'Falha ao gerar novo token do edge.');
    }
  },

  async getStoreEdgeStatus(storeId: string): Promise<StoreEdgeStatus> {
    const cacheKey = `${STORES_CACHE_KEYS.edgeStatusPrefix}${storeId}`
    try {
      const response = await api.get(`/v1/stores/${storeId}/edge-status/`, {
        timeoutCategory: "critical",
        noRetry: true,
      });
      const normalized = normalizeEdgeStatus(response.data, storeId);
      writeObjectCache(cacheKey, normalized)
      return normalized;
    } catch (error) {
      logDevError('❌ Erro ao consultar status do edge:', error);
      if (!isAuthError(error)) {
        const cached = readObjectCache<StoreEdgeStatus>(cacheKey)
        if (cached) return cached
      }
      throw normalizeApiError(error, 'Falha ao consultar status do edge.');
    }
  },

  async getStoreEdgeUpdatePolicy(storeId: string): Promise<StoreEdgeUpdatePolicyResponse> {
    const response = await api.get(`/v1/stores/${storeId}/edge-update-policy/`)
    return response.data as StoreEdgeUpdatePolicyResponse
  },

  async updateStoreEdgeUpdatePolicy(
    storeId: string,
    payload: Partial<StoreEdgeUpdatePolicy> & {
      target_version: string
      package: { url: string; sha256: string; size_bytes?: number | null }
    }
  ): Promise<StoreEdgeUpdatePolicyResponse> {
    const response = await api.put(`/v1/stores/${storeId}/edge-update-policy/`, payload)
    return response.data as StoreEdgeUpdatePolicyResponse
  },

  async getStoreEdgeUpdateEvents(
    storeId: string,
    params?: { limit?: number; status?: string; agent_id?: string }
  ): Promise<StoreEdgeUpdateEventsResponse> {
    const response = await api.get(`/v1/stores/${storeId}/edge-update-events/`, { params })
    return response.data as StoreEdgeUpdateEventsResponse
  },

  async getStoreEdgeUpdateAttempts(
    storeId: string,
    params?: { limit?: number }
  ): Promise<StoreEdgeUpdateAttemptsResponse> {
    const response = await api.get(`/v1/stores/${storeId}/edge-update-attempts/`, {
      params: params || undefined,
    })
    return response.data as StoreEdgeUpdateAttemptsResponse
  },

  async getStoreEdgeUpdateRunbook(
    storeId: string,
    params?: { reason_code?: string }
  ): Promise<StoreEdgeUpdateRunbookResponse> {
    const response = await api.get(`/v1/stores/${storeId}/edge-update-runbook/`, { params })
    return response.data as StoreEdgeUpdateRunbookResponse
  },

  async trackStoreEdgeUpdateRunbookOpened(
    storeId: string,
    payload?: StoreEdgeUpdateRunbookOpenedPayload
  ): Promise<{ ok: boolean; store_id: string; event_id: string; event: string }> {
    const response = await api.post(`/v1/stores/${storeId}/edge-update-runbook/opened/`, payload || {})
    return response.data as { ok: boolean; store_id: string; event_id: string; event: string }
  },

  async getNetworkEdgeUpdateRolloutSummary(channel?: "stable" | "canary"): Promise<NetworkEdgeUpdateRolloutSummaryResponse> {
    const response = await api.get("/v1/stores/network/edge-update-rollout-summary/", {
      params: channel ? { channel } : undefined,
    })
    return response.data as NetworkEdgeUpdateRolloutSummaryResponse
  },

  async getNetworkEdgeUpdateValidationSummary(params?: {
    channel?: "stable" | "canary"
    hours?: number
  }): Promise<NetworkEdgeUpdateValidationSummaryResponse> {
    const response = await api.get("/v1/stores/network/edge-update-validation-summary/", {
      params: params || undefined,
    })
    return response.data as NetworkEdgeUpdateValidationSummaryResponse
  },

  // Criar nova loja
  async createStore(storeData: CreateStorePayload): Promise<Store> {
    const {
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      pos_integration_interest,
      avg_hourly_labor_cost,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    } = storeData;
    const payload = omitEmpty({
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      pos_integration_interest,
      avg_hourly_labor_cost,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    });
    const response = await api.post('/v1/stores/', payload);
    return response.data;
  },

  // Atualizar loja
  async updateStore(storeId: string, storeData: UpdateStorePayload): Promise<Store> {
    const {
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      pos_integration_interest,
      avg_hourly_labor_cost,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    } = storeData;
    const payload = omitEmpty({
      name,
      description,
      address,
      city,
      state,
      status,
      business_type,
      business_type_other,
      pos_system,
      pos_other,
      pos_integration_interest,
      avg_hourly_labor_cost,
      hours_weekdays,
      hours_saturday,
      hours_sunday_holiday,
      employees_count,
      cameras_count,
    });
    const response = await api.patch(`/v1/stores/${storeId}/`, payload);
    return response.data;
  },

  // Deletar loja
  async deleteStore(storeId: string): Promise<void> {
    await api.delete(`/v1/stores/${storeId}/`);
  },

  async registerPdvInterest(
    payload: RegisterPdvInterestPayload
  ): Promise<RegisterPdvInterestResponse> {
    const response = await api.post("/v1/integration/pdv/interest/", payload, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as RegisterPdvInterestResponse
  },

  async ingestPdvTransactionEvent(
    payload: PdvTransactionIngestPayload
  ): Promise<PdvTransactionIngestResponse> {
    const response = await api.post("/v1/integration/pdv/events/", payload, {
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as PdvTransactionIngestResponse
  },

  async getPdvTransactionSummary(params?: {
    store_id?: string
    period?: string
  }): Promise<PdvTransactionSummaryResponse> {
    const response = await api.get("/v1/integration/pdv/summary/", {
      params: params || undefined,
      timeoutCategory: "best-effort",
      noRetry: true,
    })
    return response.data as PdvTransactionSummaryResponse
  },
};
