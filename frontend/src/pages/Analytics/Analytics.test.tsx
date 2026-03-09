import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "../../test/test-utils"
import Analytics from "./Analytics"

vi.mock("../../services/stores", () => ({
  storesService: {
    getStores: vi.fn().mockResolvedValue([
      { id: "store-1", name: "Loja 1", role: "manager" },
    ]),
    getStoreAnalyticsSummary: vi.fn().mockResolvedValue({
      store_id: "store-1",
      from: "2026-03-01T00:00:00Z",
      to: "2026-03-07T23:59:59Z",
      bucket: "day",
      totals: {
        total_visitors: 120,
        avg_dwell_seconds: 420,
        avg_queue_seconds: 180,
        avg_staff_active: 2,
        avg_conversion_rate: 12.5,
      },
      series: {
        traffic: [{ ts_bucket: "2026-03-01T00:00:00Z", footfall: 120, dwell_seconds_avg: 420 }],
        conversion: [
          {
            ts_bucket: "2026-03-01T00:00:00Z",
            queue_avg_seconds: 180,
            staff_active_est: 2,
            conversion_rate: 12.5,
          },
        ],
      },
      zones: [{ zone_id: "zone-1", name: "Fila", footfall: 50, dwell_seconds_avg: 0 }],
      meta: {
        metric_governance: {
          totals: {
            total_visitors: {
              metric_status: "official",
              source_method: "entry_camera_footfall",
              ownership_mode: "single_camera_owner",
              label: "Oficial",
            },
            avg_dwell_seconds: {
              metric_status: "estimated",
              source_method: "bucket_average_dwell_proxy",
              ownership_mode: "single_camera_owner",
              label: "Estimativa",
            },
            avg_queue_seconds: {
              metric_status: "official",
              source_method: "cashier_queue_primary_camera",
              ownership_mode: "single_camera_owner",
              label: "Oficial",
            },
            avg_conversion_rate: {
              metric_status: "proxy",
              source_method: "checkout_events_over_footfall",
              ownership_mode: "single_camera_owner",
              label: "Proxy",
            },
          },
        },
      },
    }),
    getStoreVisionAudit: vi.fn().mockResolvedValue({
      store_id: "store-1",
      from: "2026-03-01T00:00:00",
      to: "2026-03-07T23:59:59",
      filters: {
        event_type: null,
        camera_id: null,
        zone_id: null,
        roi_entity_id: null,
        limit: 12,
      },
      summary: {
        "vision.crossing.v1": 3,
        "vision.queue_state.v1": 2,
      },
      items: [
        {
          receipt_id: "rcpt-1",
          event_type: "vision.crossing.v1",
          camera_id: "cam-1",
          camera_role: "entrada",
          zone_id: "zone-front",
          roi_entity_id: "line-main",
          metric_type: "entry_exit",
          ownership: "primary",
          direction: "entry",
          count_value: 1,
          duration_seconds: null,
          ts: "2026-03-01T10:00:00Z",
          raw_payload: {},
        },
      ],
    }),
    getStoreVisionConfidence: vi.fn().mockResolvedValue({
      store_id: "store-1",
      generated_at: "2026-03-09T10:00:00Z",
      window_hours: 24,
      store_status: "parcial",
      summary: {
        cameras_total: 2,
        cameras_with_published_roi: 1,
        metrics_ready: 1,
        metrics_partial: 0,
        metrics_recalibrate: 2,
      },
      cameras: [
        {
          camera_id: "cam-1",
          camera_name: "Entrada Principal",
          camera_role: "entrada",
          camera_status: "online",
          store_status: "pronto",
          last_seen_at: "2026-03-09T09:58:00Z",
          roi_published: true,
          roi_version: "7",
          metrics: [
            {
              metric_key: "entry_exit",
              event_type: "vision.crossing.v1",
              status: "pronto",
              coverage_score: 100,
              confidence_score: 100,
              events_24h: 24,
              last_event_at: "2026-03-09T09:55:00Z",
              roi_version: "7",
              reasons: [],
              latest_calibration: {
                metric_type: "entry_exit",
                roi_version: "7",
                manual_sample_size: 20,
                manual_reference_value: 100,
                system_value: 95,
                error_pct: 5,
                approved_by: "user-1",
                approved_at: "2026-03-08T14:00:00Z",
                notes: "Aprovada",
                status: "approved",
                created_at: "2026-03-08T14:00:00Z",
              },
            },
          ],
        },
      ],
    }),
    getStoreVisionCalibrationPlan: vi.fn().mockResolvedValue({
      store_id: "store-1",
      generated_at: "2026-03-09T10:00:00Z",
      window_hours: 24,
      store_status: "parcial",
      summary: {
        cameras_total: 2,
        cameras_with_published_roi: 1,
        metrics_ready: 1,
        metrics_partial: 0,
        metrics_recalibrate: 2,
        actions_total: 1,
        high_priority: 1,
        medium_priority: 0,
      },
      actions: [
        {
          camera_id: "cam-2",
          camera_name: "Caixa 1",
          camera_role: "balcao",
          camera_status: "offline",
          metric_key: "checkout_proxy",
          metric_label: "Checkout proxy",
          event_type: "vision.checkout_proxy.v1",
          status: "recalibrar",
          priority: "alta",
          action_code: "recover_camera_health",
          title: "Recuperar saude operacional da camera",
          description: "A camera precisa voltar a online ou degraded estavel antes de validar a metrica.",
          playbook_hint: "Validar zonas de fila, caixa e equipe; revisar oclusoes e campo de visao.",
          reasons: ["camera_not_healthy", "stale_or_missing_events"],
          coverage_score: 0,
          confidence_score: 25,
          events_24h: 0,
          roi_published: false,
          roi_version: null,
          last_event_at: null,
          last_seen_at: "2026-03-09T01:00:00Z",
          audit_filters: {
            camera_id: "cam-2",
            event_type: "vision.checkout_proxy.v1",
          },
        },
      ],
    }),
    getStoreVisionCalibrationRuns: vi.fn().mockResolvedValue({
      store_id: "store-1",
      filters: {
        camera_id: null,
        metric_type: null,
        limit: 8,
      },
      items: [
        {
          id: "run-1",
          store_id: "store-1",
          camera_id: "cam-1",
          metric_type: "entry_exit",
          roi_version: "7",
          manual_sample_size: 20,
          manual_reference_value: 100,
          system_value: 95,
          error_pct: 5,
          approved_by: "user-1",
          approved_at: "2026-03-08T14:00:00Z",
          notes: "Aprovada",
          status: "approved",
          created_at: "2026-03-08T14:00:00Z",
          updated_at: "2026-03-08T14:00:00Z",
        },
      ],
    }),
    createStoreVisionCalibrationRun: vi.fn().mockResolvedValue({
      id: "run-2",
      store_id: "store-1",
      camera_id: "cam-2",
      metric_type: "checkout_proxy",
      roi_version: "9",
      manual_sample_size: 12,
      manual_reference_value: 8,
      system_value: 7,
      error_pct: 12.5,
      approved_by: "user-1",
      approved_at: "2026-03-09T10:00:00Z",
      notes: "Aprovada",
      status: "approved",
      created_at: "2026-03-09T10:00:00Z",
      updated_at: "2026-03-09T10:00:00Z",
    }),
  },
}))

describe("Analytics governance", () => {
  it("renders metric governance badges, operational confidence and vision audit", async () => {
    renderWithProviders(<Analytics />)

    expect(await screen.findByText("Proxy")).toBeInTheDocument()
    expect(await screen.findAllByText("Oficial")).not.toHaveLength(0)
    expect(await screen.findAllByText(/checkout proxy/i)).not.toHaveLength(0)
    expect(await screen.findByText(/checkout_events_over_footfall/i)).toBeInTheDocument()
    expect(await screen.findByText(/Confiança Operacional de Visão/i)).toBeInTheDocument()
    expect(await screen.findAllByText(/Pronto operacional/i)).not.toHaveLength(0)
    expect(await screen.findByText(/Entrada Principal/i)).toBeInTheDocument()
    expect(await screen.findByText(/Plano de Recalibração/i)).toBeInTheDocument()
    expect(await screen.findByText(/Recuperar saude operacional da camera/i)).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /Filtrar auditoria por este evento/i })).toBeInTheDocument()
    expect(await screen.findAllByRole("button", { name: /Registrar calibração/i })).not.toHaveLength(0)
    expect(await screen.findByRole("heading", { name: /Registrar Calibração Manual/i })).toBeInTheDocument()
    expect(await screen.findByText(/Ultima calibracao:/i)).toBeInTheDocument()
    expect(await screen.findByText(/status: approved/i)).toBeInTheDocument()
    expect(await screen.findByText(/aprovador: user-1/i)).toBeInTheDocument()
    expect(await screen.findByText(/Histórico de Calibração/i)).toBeInTheDocument()
    expect(await screen.findByText(/Auditoria de Visão/i)).toBeInTheDocument()
    expect(await screen.findAllByText("vision.crossing.v1")).not.toHaveLength(0)
    expect(await screen.findAllByText(/Entrada/i)).not.toHaveLength(0)
  }, 30000)
})
