import time
from datetime import datetime, timezone
from typing import List

from ..storage.sqlite_queue import SqliteQueue
from ..transport.api_client import ApiClient
from ..vision.aggregations import MetricAggregator
from ..vision.rules import RuleEngine
from ..events.builder import build_envelope
from ..events.receipts import compute_receipt_id


def run_agent(settings):
    """
    Loop principal do Edge Agent (v1):
    - sobe workers de câmera
    - lê frames
    - detecta pessoas (YOLO)
    - update_metrics() por câmera (ROI/checkout/entrada)
    - agrega por minuto (bucket 60s)
    - gera edge_metric_bucket + alert
    - outbox sqlite + flush via ApiClient
    """

    # --- outbox ---
    queue = SqliteQueue(
        path=settings.buffer_sqlite_path
        #max_items=settings.max_queue_size,
    )


    # --- transport ---
    api = ApiClient(
        base_url=settings.cloud_base_url,
        token=settings.cloud_token,
        timeout=settings.cloud_timeout,
    )

    # --- aggregation + rules ---
    aggregator = MetricAggregator(bucket_seconds=60)
    rules = RuleEngine()

    # --- camera workers + detector ---
    from ..camera.rtsp import RtspCameraWorker  # import local
    from ..vision.detector import PersonDetector

    detector = PersonDetector(
        weights_path=settings.yolo_weights_path,
        conf=settings.conf,
        iou=settings.iou,
        device=settings.device,
    )

    workers: List[RtspCameraWorker] = []
    for cam in settings.cameras:
        w = RtspCameraWorker(
            camera_id=cam.camera_id,
            name=cam.name,
            rtsp_url=cam.rtsp_url,
            roi_config_path=cam.roi_config,
            target_width=settings.target_width,
            fps_limit=settings.fps_limit,
            frame_skip=settings.frame_skip,
        )
        w.start()
        workers.append(w)

    last_flush = 0.0
    last_heartbeat = 0.0

    agent_id = settings.agent_id
    store_id = settings.store_id

    while True:
        now = time.time()

        # ========== heartbeat ==========
        if (now - last_heartbeat) >= float(settings.heartbeat_interval_seconds):
            hb_bucket = int(now // float(settings.heartbeat_interval_seconds)) * float(settings.heartbeat_interval_seconds)
            hb_ts = datetime.fromtimestamp(hb_bucket, tz=timezone.utc).isoformat()

            try:
                for w in workers:
                    cam_data = {
                        "store_id": store_id,
                        "agent_id": agent_id,
                        "ts": hb_ts,
                        "camera_id": w.camera_id,
                        "external_id": w.camera_id,
                        "name": w.name,
                        "rtsp_url": getattr(w, "rtsp_url", None),
                        "ok": w.is_ok(),
                    }
                    cam_env = build_envelope(
                        event_name="edge_camera_heartbeat",
                        source="edge",
                        data=cam_data,
                        meta={},
                    )
                    cam_env["receipt_id"] = compute_receipt_id(cam_env)
                    queue.enqueue(cam_env)

                hb = {
                    "agent_id": agent_id,
                    "store_id": store_id,
                    "ts": hb_ts,
                    "cameras": [
                        {
                            "camera_id": w.camera_id,
                            "external_id": w.camera_id,
                            "name": w.name,
                            "rtsp_url": getattr(w, "rtsp_url", None),
                            "ok": w.is_ok(),
                        }
                        for w in workers
                    ],
                }

                env = build_envelope(
                    event_name="edge_heartbeat",
                    source="edge",
                    data=hb,
                    meta={},
                )
                env["receipt_id"] = compute_receipt_id(env)
                queue.enqueue(env)
            except Exception as e:
                print(f"⚠️ heartbeat enqueue failed (ignored): {e}")

            last_heartbeat = now

        # ========== process frames ==========
        for w in workers:
            f = w.try_get_frame()
            if f is None:
                continue

            dets = detector.detect(f.image)
            metrics = w.update_metrics(dets, f.ts)

            aggregator.add_sample(
                camera_id=w.camera_id,
                ts=f.ts,
                metrics=metrics,
            )

            # fecha bucket de 60s quando virar o minuto
            bucket = aggregator.try_close_bucket(camera_id=w.camera_id, ts=f.ts)
            if bucket is not None:
                print(
                    f"✅ bucket closed cam={w.camera_id} ts_bucket={bucket['ts_bucket']} "
                    f"metrics_keys={list(bucket['metrics'].keys())[:8]}"
                )

                data = {
                    "store_id": store_id,
                    "camera_id": w.camera_id,
                    "ts_bucket": bucket["ts_bucket"],
                    "metrics": bucket["metrics"],
                }

                env = build_envelope(
                    event_name="edge_metric_bucket",
                    source="edge",
                    data=data,
                    meta={"agent_id": agent_id},
                )
                env["receipt_id"] = compute_receipt_id(env)
                queue.enqueue(env)
                print(f"📦 enqueued edge_metric_bucket receipt={env['receipt_id'][:10]}...")

                # regras -> alertas
                alerts = rules.evaluate(camera_id=w.camera_id, bucket=bucket)
                for a in alerts:
                    a_data = {
                        "store_id": store_id,
                        "camera_id": w.camera_id,
                        **a,
                    }
                    a_env = build_envelope(
                        event_name="alert",
                        source="edge",
                        data=a_data,
                        meta={"agent_id": agent_id},
                    )
                    a_env["receipt_id"] = compute_receipt_id(a_env)
                    queue.enqueue(a_env)

        # ========== flush outbox ==========
        if (now - last_flush) >= float(settings.send_interval_seconds):
            try:
                r = api.flush_outbox(queue)
                # log mínimo só quando houver algo
                if (r.get("sent", 0) or r.get("failed", 0)):
                    print(f"🌐 flush sent={r.get('sent')} failed={r.get('failed')} last_error={r.get('last_error')}")
            except Exception as e:
                # nunca derruba o agente por causa de rede/backend
                print(f"🌐 flush error (ignored): {e}")
            last_flush = now

        time.sleep(0.01)
