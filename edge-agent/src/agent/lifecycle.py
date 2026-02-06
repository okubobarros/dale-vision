import time
import threading
from datetime import datetime, timezone
from typing import List

from ..storage.sqlite_queue import SqliteQueue
from ..transport.api_client import ApiClient
from ..vision.aggregations import MetricAggregator
from ..vision.rules import RuleEngine
from ..events.builder import build_envelope
from ..events.receipts import compute_receipt_id


def _enqueue_heartbeat(queue, workers, store_id: str, agent_id: str, ts_iso: str):
    try:
        for w in workers:
            cam_data = {
                "store_id": store_id,
                "agent_id": agent_id,
                "ts": ts_iso,
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
            "ts": ts_iso,
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


def _heartbeat_loop(stop_event, queue, workers, store_id: str, agent_id: str, interval_seconds: float):
    last_bucket = None
    while not stop_event.is_set():
        now = time.time()
        bucket = int(now // interval_seconds) * interval_seconds
        if last_bucket is None or bucket > last_bucket:
            ts_iso = datetime.fromtimestamp(bucket, tz=timezone.utc).isoformat()
            _enqueue_heartbeat(queue, workers, store_id, agent_id, ts_iso)
            last_bucket = bucket
        stop_event.wait(0.5)


def run_agent(settings, heartbeat_only: bool = False):
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

    print("using X-EDGE-TOKEN")

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

    vision_enabled = bool(settings.vision_enabled) and not heartbeat_only
    if heartbeat_only:
        print("ℹ️ heartbeat-only mode enabled (vision disabled)")
    elif not settings.vision_enabled:
        print("ℹ️ vision disabled via config (runtime.vision_enabled=false)")

    # --- aggregation + rules (vision only) ---
    aggregator = None
    rules = None
    detector = None
    if vision_enabled:
        aggregator = MetricAggregator(bucket_seconds=60)
        rules = RuleEngine()
        from ..vision.detector import PersonDetector

        detector = PersonDetector(
            weights_path=settings.yolo_weights_path,
            conf=settings.conf,
            iou=settings.iou,
            device=settings.device,
        )

    # --- camera workers ---
    from ..camera.rtsp import RtspCameraWorker  # import local

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

    agent_id = settings.agent_id
    store_id = settings.store_id

    stop_event = threading.Event()
    hb_thread = threading.Thread(
        target=_heartbeat_loop,
        args=(
            stop_event,
            queue,
            workers,
            store_id,
            agent_id,
            float(settings.heartbeat_interval_seconds),
        ),
        daemon=True,
    )
    hb_thread.start()

    try:
        while True:
            now = time.time()

            # ========== process frames ==========
            if vision_enabled:
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

            time.sleep(0.01 if vision_enabled else 0.2)
    except KeyboardInterrupt:
        print("🛑 shutdown requested (KeyboardInterrupt)")
    finally:
        stop_event.set()
        for w in workers:
            try:
                w.stop()
            except Exception:
                pass
        for w in workers:
            try:
                w.join(timeout=2.0)
            except Exception:
                pass
        try:
            hb_thread.join(timeout=2.0)
        except Exception:
            pass
