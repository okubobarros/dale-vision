from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from django.db import connection, transaction
from django.utils import timezone

from apps.core.models import Camera, Store, Subscription

from .models import (
    CopilotDashboardContextSnapshot,
    CopilotOperationalInsight,
    CopilotReport72h,
)


TRIAL_TARGET_HOURS = 72
EDGE_ONLINE_THRESHOLD_SECONDS = 120
CONTEXT_SNAPSHOT_MAX_AGE_SECONDS = 300


@dataclass
class CoverageState:
    cameras_total: int
    cameras_online: int
    cameras_offline: int
    edge_online: bool
    last_heartbeat_at: Optional[timezone.datetime]


def resolve_account_state(store: Store) -> str:
    sub = (
        Subscription.objects.filter(org_id=store.org_id)
        .order_by("-updated_at", "-created_at")
        .first()
    )
    now = timezone.now()

    if sub and sub.status in {"active", "past_due", "incomplete"}:
        return "plan_active"

    trial_end = store.trial_ends_at
    if not trial_end:
        org_trial_end = (
            getattr(store, "org", None).trial_ends_at if getattr(store, "org", None) else None
        )
        trial_end = org_trial_end

    if trial_end:
        if trial_end >= now:
            return "trial_active"
        return "trial_expired"

    if sub and sub.status == "trialing":
        return "trial_active"

    return "unknown"


def resolve_last_heartbeat(store_id) -> Optional[timezone.datetime]:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT ts
                FROM public.event_receipts
                WHERE source = 'edge'
                  AND event_name IN ('edge_heartbeat', 'camera_heartbeat', 'edge_camera_heartbeat')
                  AND (
                    meta->>'store_id' = %s
                    OR raw->'data'->>'store_id' = %s
                    OR raw->>'store_id' = %s
                  )
                ORDER BY ts DESC, received_at DESC NULLS LAST
                LIMIT 1
                """,
                [str(store_id), str(store_id), str(store_id)],
            )
            row = cursor.fetchone()
    except Exception:
        row = None

    if row and row[0]:
        return row[0]

    store = Store.objects.filter(id=store_id).values("last_seen_at").first()
    if not store:
        return None
    return store.get("last_seen_at")


def resolve_coverage_state(store_id) -> CoverageState:
    cameras_qs = Camera.objects.filter(store_id=store_id, active=True)
    cameras_total = cameras_qs.count()
    cameras_online = cameras_qs.filter(status__in=["online", "degraded"]).count()
    cameras_offline = max(cameras_total - cameras_online, 0)
    last_heartbeat_at = resolve_last_heartbeat(store_id)

    edge_online = False
    if last_heartbeat_at:
        age_sec = (timezone.now() - last_heartbeat_at).total_seconds()
        edge_online = age_sec <= EDGE_ONLINE_THRESHOLD_SECONDS

    return CoverageState(
        cameras_total=cameras_total,
        cameras_online=cameras_online,
        cameras_offline=cameras_offline,
        edge_online=edge_online,
        last_heartbeat_at=last_heartbeat_at,
    )


def resolve_trial_collected_hours(store: Store, account_state: str) -> int:
    if account_state not in {"trial_active", "trial_expired"}:
        return 0
    start = store.trial_started_at or store.created_at
    if not start:
        return 0
    elapsed = timezone.now() - start
    hours = max(int(elapsed.total_seconds() // 3600), 0)
    return min(hours, TRIAL_TARGET_HOURS)


def resolve_operational_state(
    *,
    report_ready: bool,
    coverage: CoverageState,
    collected_hours: int,
) -> str:
    if report_ready:
        return "report_ready"

    if coverage.last_heartbeat_at:
        age = timezone.now() - coverage.last_heartbeat_at
        if age > timedelta(minutes=5):
            return "incident"

    if coverage.cameras_total == 0 and not coverage.last_heartbeat_at:
        return "not_started"

    if coverage.cameras_online == 0:
        return "setup_in_progress"

    if collected_hours < TRIAL_TARGET_HOURS:
        return "collecting_data"

    return "operating"


def _safe_scalar(sql: str, params: list) -> float | int | None:
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()
    except Exception:
        return None
    if not row:
        return None
    return row[0]


def get_metrics_window(store_id, window_hours: int = 24) -> dict:
    now = timezone.now()
    start = now - timedelta(hours=window_hours)

    footfall_24h = _safe_scalar(
        """
        SELECT COALESCE(SUM(footfall), 0)
        FROM public.traffic_metrics
        WHERE store_id = %s AND ts_bucket >= %s
        """,
        [str(store_id), start],
    )
    conversion_avg = _safe_scalar(
        """
        SELECT AVG(NULLIF(conversion_rate, 0))
        FROM public.conversion_metrics
        WHERE store_id = %s AND ts_bucket >= %s
        """,
        [str(store_id), start],
    )
    queue_avg_seconds = _safe_scalar(
        """
        SELECT AVG(NULLIF(queue_avg_seconds, 0))
        FROM public.conversion_metrics
        WHERE store_id = %s AND ts_bucket >= %s
        """,
        [str(store_id), start],
    )
    vision_events_count = _safe_scalar(
        """
        SELECT COUNT(*)
        FROM public.vision_atomic_events
        WHERE store_id = %s AND ts >= %s
        """,
        [str(store_id), start],
    )
    open_alerts = _safe_scalar(
        """
        SELECT COUNT(*)
        FROM public.detection_events
        WHERE store_id = %s AND status = 'open'
        """,
        [str(store_id)],
    )

    last_6h_start = now - timedelta(hours=6)
    prev_6h_start = now - timedelta(hours=12)
    footfall_last_6h = _safe_scalar(
        """
        SELECT COALESCE(SUM(footfall), 0)
        FROM public.traffic_metrics
        WHERE store_id = %s AND ts_bucket >= %s
        """,
        [str(store_id), last_6h_start],
    )
    footfall_prev_6h = _safe_scalar(
        """
        SELECT COALESCE(SUM(footfall), 0)
        FROM public.traffic_metrics
        WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
        """,
        [str(store_id), prev_6h_start, last_6h_start],
    )

    return {
        "footfall_24h": int(footfall_24h or 0),
        "conversion_avg": float(conversion_avg) if conversion_avg is not None else None,
        "queue_avg_seconds": float(queue_avg_seconds) if queue_avg_seconds is not None else None,
        "vision_events_count": int(vision_events_count or 0),
        "open_alerts": int(open_alerts or 0),
        "footfall_last_6h": int(footfall_last_6h or 0),
        "footfall_prev_6h": int(footfall_prev_6h or 0),
        "window_hours": window_hours,
    }


def build_dashboard_context_payload(store: Store) -> dict:
    report = (
        CopilotReport72h.objects.filter(store_id=store.id)
        .order_by("-generated_at", "-created_at")
        .first()
    )
    report_ready = bool(report and report.status == "ready")
    account_state = resolve_account_state(store)
    coverage = resolve_coverage_state(store.id)
    collected_hours = resolve_trial_collected_hours(store, account_state)
    eta_hours = max(TRIAL_TARGET_HOURS - collected_hours, 0)
    operational_state = resolve_operational_state(
        report_ready=report_ready,
        coverage=coverage,
        collected_hours=collected_hours,
    )
    metrics = get_metrics_window(store.id, window_hours=24)

    return {
        "org_id": str(store.org_id),
        "org_name": getattr(getattr(store, "org", None), "name", "Rede"),
        "store_id": str(store.id),
        "store_name": store.name,
        "account_state": account_state,
        "operational_state": operational_state,
        "trial": {
            "collected_hours": collected_hours,
            "target_hours": TRIAL_TARGET_HOURS,
            "eta_hours": eta_hours,
        },
        "coverage": {
            "cameras_total": coverage.cameras_total,
            "cameras_online": coverage.cameras_online,
            "cameras_offline": coverage.cameras_offline,
            "edge_online": coverage.edge_online,
            "last_heartbeat_at": coverage.last_heartbeat_at.isoformat()
            if coverage.last_heartbeat_at
            else None,
        },
        "metrics_window": metrics,
        "generated_at": timezone.now().isoformat(),
    }


def get_latest_context_snapshot(store_id, max_age_seconds: int = CONTEXT_SNAPSHOT_MAX_AGE_SECONDS):
    latest = (
        CopilotDashboardContextSnapshot.objects.filter(store_id=store_id)
        .order_by("-generated_at")
        .first()
    )
    if not latest:
        return None
    age = (timezone.now() - latest.generated_at).total_seconds()
    if age > max_age_seconds:
        return None
    return latest


def materialize_dashboard_context(store_id):
    store = Store.objects.select_related("org").filter(id=store_id).first()
    if not store:
        return None
    payload = build_dashboard_context_payload(store)
    now = timezone.now()
    return CopilotDashboardContextSnapshot.objects.create(
        org_id=store.org_id,
        store_id=store.id,
        account_state=payload["account_state"],
        operational_state=payload["operational_state"],
        snapshot_json=payload,
        generated_at=now,
        created_at=now,
        updated_at=now,
    )


def build_insight_candidates(store: Store, window_hours: int = 24) -> list[dict]:
    coverage = resolve_coverage_state(store.id)
    metrics = get_metrics_window(store.id, window_hours=window_hours)
    now = timezone.now()
    start = now - timedelta(hours=window_hours)
    insights: list[dict] = []

    if not coverage.edge_online:
        insights.append(
            {
                "category": "health",
                "severity": "critical",
                "headline": "Conexão da loja interrompida",
                "description": "A comunicação recente do edge não foi confirmada. Sem conexão estável, indicadores podem ficar desatualizados.",
                "evidence_json": {
                    "source": "edge_heartbeat",
                    "time_window_from": start.isoformat(),
                    "time_window_to": now.isoformat(),
                    "metric_refs": ["coverage.edge_online", "coverage.last_heartbeat_at"],
                    "confidence": 0.95,
                },
                "actions_json": [
                    {"label": "Abrir assistente de conexão", "type": "open_setup"},
                    {"label": "Perguntar ao Copiloto", "type": "ask_copilot"},
                ],
                "confidence": 0.95,
            }
        )

    if coverage.cameras_offline > 0:
        insights.append(
            {
                "category": "health",
                "severity": "warning",
                "headline": f"{coverage.cameras_offline} câmera(s) indisponível(is)",
                "description": "Parte da cobertura está inativa. Isso reduz a confiabilidade da leitura operacional.",
                "evidence_json": {
                    "source": "camera_health_logs",
                    "time_window_from": start.isoformat(),
                    "time_window_to": now.isoformat(),
                    "metric_refs": ["coverage.cameras_online", "coverage.cameras_offline"],
                    "confidence": 0.9,
                },
                "actions_json": [
                    {"label": "Revisar câmeras", "type": "open_camera"},
                    {"label": "Abrir assistente de conexão", "type": "open_setup"},
                ],
                "confidence": 0.9,
            }
        )

    if metrics["queue_avg_seconds"] is not None and metrics["queue_avg_seconds"] >= 300:
        insights.append(
            {
                "category": "queue",
                "severity": "warning",
                "headline": "Fila média acima do ideal",
                "description": f"Tempo médio de fila nas últimas {window_hours}h está em {int(metrics['queue_avg_seconds'])}s.",
                "evidence_json": {
                    "source": "conversion_metrics",
                    "time_window_from": start.isoformat(),
                    "time_window_to": now.isoformat(),
                    "metric_refs": ["queue_avg_seconds"],
                    "confidence": 0.82,
                },
                "actions_json": [
                    {"label": "Abrir diagnóstico", "type": "open_report"},
                    {"label": "Perguntar ao Copiloto", "type": "ask_copilot"},
                ],
                "confidence": 0.82,
            }
        )

    if metrics["conversion_avg"] is not None and metrics["conversion_avg"] < 0.12:
        insights.append(
            {
                "category": "conversion",
                "severity": "warning",
                "headline": "Conversão abaixo da faixa esperada",
                "description": f"Conversão média de {metrics['conversion_avg']*100:.1f}% nas últimas {window_hours}h.",
                "evidence_json": {
                    "source": "conversion_metrics",
                    "time_window_from": start.isoformat(),
                    "time_window_to": now.isoformat(),
                    "metric_refs": ["conversion_rate"],
                    "confidence": 0.78,
                },
                "actions_json": [
                    {"label": "Comparar lojas", "type": "open_store"},
                    {"label": "Revisar com Copiloto", "type": "ask_copilot"},
                ],
                "confidence": 0.78,
            }
        )

    prev_6h = metrics["footfall_prev_6h"]
    last_6h = metrics["footfall_last_6h"]
    if prev_6h > 0:
        drop_ratio = (prev_6h - last_6h) / prev_6h
        if drop_ratio >= 0.3:
            insights.append(
                {
                    "category": "flow",
                    "severity": "info",
                    "headline": "Fluxo recente em desaceleração",
                    "description": f"Queda de {drop_ratio*100:.0f}% no fluxo das últimas 6h versus janela anterior.",
                    "evidence_json": {
                        "source": "traffic_metrics",
                        "time_window_from": (now - timedelta(hours=12)).isoformat(),
                        "time_window_to": now.isoformat(),
                        "metric_refs": ["footfall"],
                        "confidence": 0.74,
                    },
                    "actions_json": [
                        {"label": "Analisar horários", "type": "open_store"},
                        {"label": "Perguntar ao Copiloto", "type": "ask_copilot"},
                    ],
                    "confidence": 0.74,
                }
            )

    if metrics["open_alerts"] > 0:
        insights.append(
            {
                "category": "anomaly",
                "severity": "warning",
                "headline": f"{metrics['open_alerts']} alerta(s) operacional(is) em aberto",
                "description": "Existem alertas pendentes que podem impactar a execução da loja.",
                "evidence_json": {
                    "source": "detection_events",
                    "time_window_from": start.isoformat(),
                    "time_window_to": now.isoformat(),
                    "metric_refs": ["detection_events.status=open"],
                    "confidence": 0.86,
                },
                "actions_json": [
                    {"label": "Abrir alertas", "type": "open_store"},
                    {"label": "Revisar com Copiloto", "type": "ask_copilot"},
                ],
                "confidence": 0.86,
            }
        )

    return insights


def materialize_operational_insights(store_id, window_hours: int = 24) -> int:
    store = Store.objects.select_related("org").filter(id=store_id).first()
    if not store:
        return 0
    candidates = build_insight_candidates(store, window_hours=window_hours)
    now = timezone.now()
    with transaction.atomic():
        CopilotOperationalInsight.objects.filter(store_id=store_id, status="active").update(
            status="archived",
            updated_at=now,
        )
        for item in candidates:
            CopilotOperationalInsight.objects.create(
                org_id=store.org_id,
                store_id=store.id,
                category=item["category"],
                severity=item["severity"],
                headline=item["headline"],
                description=item["description"],
                evidence_json=item["evidence_json"],
                actions_json=item["actions_json"],
                confidence=item["confidence"],
                status="active",
                source_window_start=now - timedelta(hours=window_hours),
                source_window_end=now,
                created_at=now,
                updated_at=now,
            )
    return len(candidates)


def evaluate_report_readiness(store: Store) -> dict:
    now = timezone.now()
    window_start = now - timedelta(hours=TRIAL_TARGET_HOURS)
    account_state = resolve_account_state(store)
    coverage = resolve_coverage_state(store.id)
    collected_hours = resolve_trial_collected_hours(store, account_state)

    traffic_samples = int(
        _safe_scalar(
            """
            SELECT COUNT(*)
            FROM public.traffic_metrics
            WHERE store_id = %s AND ts_bucket >= %s
            """,
            [str(store.id), window_start],
        )
        or 0
    )
    conversion_samples = int(
        _safe_scalar(
            """
            SELECT COUNT(*)
            FROM public.conversion_metrics
            WHERE store_id = %s AND ts_bucket >= %s
            """,
            [str(store.id), window_start],
        )
        or 0
    )
    vision_events_count = int(
        _safe_scalar(
            """
            SELECT COUNT(*)
            FROM public.vision_atomic_events
            WHERE store_id = %s AND ts >= %s
            """,
            [str(store.id), window_start],
        )
        or 0
    )

    if coverage.cameras_total == 0:
        return {
            "status": "pending",
            "reason": "no_cameras_registered",
            "message": "Nenhuma câmera cadastrada para gerar diagnóstico.",
            "collected_hours": collected_hours,
            "target_hours": TRIAL_TARGET_HOURS,
            "evidence": {
                "traffic_samples": traffic_samples,
                "conversion_samples": conversion_samples,
                "vision_events_count": vision_events_count,
                "cameras_online": coverage.cameras_online,
                "cameras_total": coverage.cameras_total,
            },
        }

    if coverage.cameras_online == 0 or not coverage.edge_online:
        return {
            "status": "pending",
            "reason": "capture_unavailable",
            "message": "Captação indisponível no momento. Conecte edge e câmeras para consolidar o relatório.",
            "collected_hours": collected_hours,
            "target_hours": TRIAL_TARGET_HOURS,
            "evidence": {
                "traffic_samples": traffic_samples,
                "conversion_samples": conversion_samples,
                "vision_events_count": vision_events_count,
                "cameras_online": coverage.cameras_online,
                "cameras_total": coverage.cameras_total,
            },
        }

    # Em trial, exige janela mínima completa de 72h.
    if account_state in {"trial_active", "trial_expired"} and collected_hours < TRIAL_TARGET_HOURS:
        return {
            "status": "pending",
            "reason": "insufficient_observation_window",
            "message": "Ainda consolidando a janela mínima de observação de 72h.",
            "collected_hours": collected_hours,
            "target_hours": TRIAL_TARGET_HOURS,
            "evidence": {
                "traffic_samples": traffic_samples,
                "conversion_samples": conversion_samples,
                "vision_events_count": vision_events_count,
                "cameras_online": coverage.cameras_online,
                "cameras_total": coverage.cameras_total,
            },
        }

    if traffic_samples < 6 and conversion_samples < 6:
        return {
            "status": "pending",
            "reason": "insufficient_data_points",
            "message": "Base de métricas ainda insuficiente para relatório confiável.",
            "collected_hours": collected_hours,
            "target_hours": TRIAL_TARGET_HOURS,
            "evidence": {
                "traffic_samples": traffic_samples,
                "conversion_samples": conversion_samples,
                "vision_events_count": vision_events_count,
                "cameras_online": coverage.cameras_online,
                "cameras_total": coverage.cameras_total,
            },
        }

    return {
        "status": "ready",
        "reason": "ready",
        "message": "Base suficiente para geração do diagnóstico operacional.",
        "collected_hours": collected_hours,
        "target_hours": TRIAL_TARGET_HOURS,
        "evidence": {
            "traffic_samples": traffic_samples,
            "conversion_samples": conversion_samples,
            "vision_events_count": vision_events_count,
            "cameras_online": coverage.cameras_online,
            "cameras_total": coverage.cameras_total,
        },
    }


def _build_report_from_data(store: Store) -> tuple[dict, list]:
    metrics = get_metrics_window(store.id, window_hours=TRIAL_TARGET_HOURS)
    active_insights = list(
        CopilotOperationalInsight.objects.filter(store_id=store.id, status="active")
        .exclude(headline="")
        .order_by("-created_at")[:5]
    )
    if not active_insights:
        materialize_operational_insights(store.id, window_hours=24)
        active_insights = list(
            CopilotOperationalInsight.objects.filter(store_id=store.id, status="active")
            .exclude(headline="")
            .order_by("-created_at")[:5]
        )

    key_findings = []
    opportunities = []
    recommended_plan = []

    if metrics["footfall_24h"] > 0:
        key_findings.append(f"Fluxo consolidado de {metrics['footfall_24h']} visitantes nas últimas 24h.")
    if metrics["queue_avg_seconds"] is not None:
        key_findings.append(f"Fila média em {int(metrics['queue_avg_seconds'])}s.")
        if metrics["queue_avg_seconds"] >= 300:
            opportunities.append("Revisar escala de atendimento nos horários de pico.")
            recommended_plan.append("Adicionar reforço operacional em janelas críticas.")
    if metrics["conversion_avg"] is not None:
        key_findings.append(f"Conversão média em {metrics['conversion_avg']*100:.1f}%.")
        if metrics["conversion_avg"] < 0.12:
            opportunities.append("Conversão abaixo da referência para operação assistida.")
            recommended_plan.append("Executar plano de melhoria de abordagem comercial.")

    for insight in active_insights:
        if len(key_findings) < 6:
            key_findings.append(insight.headline)
        if insight.severity in {"warning", "critical"} and len(opportunities) < 4:
            opportunities.append(insight.description or insight.headline)

    if not recommended_plan:
        recommended_plan = [
            "Manter captação contínua para ampliar precisão dos indicadores.",
            "Revisar semanalmente alertas críticos com o Copiloto.",
        ]

    summary = {
        "headline": f"Diagnóstico operacional 72h · {store.name}",
        "key_findings": key_findings[:6],
        "opportunities": opportunities[:4],
        "recommended_plan": recommended_plan[:4],
    }

    sections = [
        {
            "key": "executive_summary",
            "title": "Resumo executivo",
            "content": " ".join(summary["key_findings"][:3]) or "Sem achados suficientes para resumo.",
            "confidence": 0.78,
        },
        {
            "key": "opportunities",
            "title": "Oportunidades prioritárias",
            "content": " ".join(summary["opportunities"]) or "Nenhuma oportunidade crítica detectada.",
            "confidence": 0.74,
        },
        {
            "key": "action_plan",
            "title": "Plano recomendado",
            "content": " ".join(summary["recommended_plan"]),
            "confidence": 0.72,
        },
    ]
    return summary, sections


def materialize_report_72h(store_id):
    store = Store.objects.select_related("org").filter(id=store_id).first()
    if not store:
        return None

    now = timezone.now()
    window_start = now - timedelta(hours=TRIAL_TARGET_HOURS)
    readiness = evaluate_report_readiness(store)
    row = (
        CopilotReport72h.objects.filter(store_id=store.id)
        .order_by("-created_at")
        .first()
    )
    if not row:
        row = CopilotReport72h(
            org_id=store.org_id,
            store_id=store.id,
            created_at=now,
        )

    try:
        if readiness["status"] != "ready":
            row.status = "pending"
            row.summary_json = {
                "headline": "Diagnóstico operacional em preparação",
                "key_findings": [],
                "opportunities": [],
                "recommended_plan": [],
                "readiness": readiness,
            }
            row.sections_json = []
            row.generated_at = None
            row.source_window_start = window_start
            row.source_window_end = now
            row.updated_at = now
            row.save()
            return row

        summary, sections = _build_report_from_data(store)
        row.status = "ready"
        row.summary_json = {
            **summary,
            "readiness": readiness,
        }
        row.sections_json = sections
        row.generated_at = now
        row.source_window_start = window_start
        row.source_window_end = now
        row.updated_at = now
        row.save()
        return row
    except Exception as exc:
        row.status = "failed"
        row.summary_json = {
            "headline": "Falha ao gerar diagnóstico operacional",
            "error": str(exc),
            "readiness": readiness,
        }
        row.sections_json = []
        row.generated_at = None
        row.source_window_start = window_start
        row.source_window_end = now
        row.updated_at = now
        row.save()
        return row
