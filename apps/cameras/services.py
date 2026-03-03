import time
import tempfile
import socket
import multiprocessing as mp
from urllib.parse import urlparse
from django.utils import timezone
from django.conf import settings

def rtsp_snapshot(rtsp_url: str, timeout_sec: int = 6) -> dict:
    """
    Tenta capturar 1 frame do RTSP.
    Retorna: ok, latency_ms, tmp_path (jpg) ou error.
    """
    try:
        import cv2  # optional dependency
    except Exception:
        return {"ok": False, "error": "OpenCV (cv2) não está instalado."}

    start = time.time()
    cap = cv2.VideoCapture(rtsp_url)

    # timeout manual (opencv não é perfeito com timeout)
    deadline = start + timeout_sec
    ok = False
    frame = None

    while time.time() < deadline:
        ok, frame = cap.read()
        if ok and frame is not None:
            break

    cap.release()

    if not ok or frame is None:
        return {"ok": False, "error": "Não foi possível capturar frame RTSP."}

    latency_ms = int((time.time() - start) * 1000)

    fd, path = tempfile.mkstemp(suffix=".jpg")
    # fecha fd porque cv2.imwrite usa path
    import os
    os.close(fd)

    cv2.imwrite(path, frame)
    return {"ok": True, "latency_ms": latency_ms, "path": path, "captured_at": timezone.now()}


def rtsp_probe(rtsp_url: str, timeout_sec: int = 4) -> dict:
    """
    Faz um probe curto no RTSP para validar conexão.
    Retorna: ok, latency_ms, fps_est, frames_read, error_msg.
    """
    try:
        import cv2  # optional dependency
    except Exception:
        return _tcp_probe(rtsp_url, timeout_sec=3)

    start = time.time()
    cap = cv2.VideoCapture(rtsp_url)
    deadline = start + timeout_sec
    frames = 0
    first_frame_ts = None

    while time.time() < deadline:
        ok, frame = cap.read()
        if not ok or frame is None:
            continue
        frames += 1
        if first_frame_ts is None:
            first_frame_ts = time.time()

    cap.release()

    if frames == 0 or first_frame_ts is None:
        return {"ok": False, "error_msg": "Não foi possível ler frames RTSP."}

    end = time.time()
    latency_ms = int((first_frame_ts - start) * 1000)
    elapsed = max(end - first_frame_ts, 0.001)
    fps_est = round(frames / elapsed, 2)
    return {
        "ok": True,
        "latency_ms": latency_ms,
        "fps_est": fps_est,
        "frames_read": frames,
    }


def rtsp_probe_with_hard_timeout(
    rtsp_url: str,
    *,
    timeout_sec: int = 4,
    hard_timeout_sec: int = 6,
) -> dict:
    # Use a separate process by default to avoid OpenCV/FFmpeg blocking the GIL.
    use_process = getattr(settings, "CAMERA_RTSP_PROBE_USE_PROCESS", True)
    if not use_process:
        return _rtsp_probe_with_thread_timeout(
            rtsp_url,
            timeout_sec=timeout_sec,
            hard_timeout_sec=hard_timeout_sec,
        )

    start = time.monotonic()
    ctx = mp.get_context("spawn")
    result_queue = ctx.Queue(maxsize=1)
    proc = ctx.Process(
        target=_rtsp_probe_worker,
        args=(rtsp_url, timeout_sec, result_queue),
        name="rtsp_probe_worker",
    )
    proc.daemon = True
    proc.start()
    proc.join(timeout=hard_timeout_sec)

    if proc.is_alive():
        proc.terminate()
        proc.join(timeout=1)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "ok": False,
            "status": "timeout",
            "elapsed_ms": elapsed_ms,
            "detail": "rtsp_probe_timeout",
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": "rtsp_timeout",
            "extra": {"reason": "rtsp_timeout", "hard_timeout_sec": hard_timeout_sec},
        }

    try:
        result = result_queue.get_nowait()
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "ok": False,
            "status": "error",
            "elapsed_ms": elapsed_ms,
            "detail": "rtsp_probe_no_result",
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": f"rtsp_probe_no_result:{exc}",
        }

    elapsed_ms = int((time.monotonic() - start) * 1000)
    result.setdefault("elapsed_ms", elapsed_ms)
    result.setdefault("status", "ok" if result.get("ok") else "error")
    return result


def _rtsp_probe_worker(rtsp_url: str, timeout_sec: int, result_queue) -> None:
    start = time.monotonic()
    try:
        result = rtsp_probe(rtsp_url, timeout_sec)
    except Exception as exc:
        result = {
            "ok": False,
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": f"rtsp_probe_failed:{exc}",
        }
    result.setdefault("elapsed_ms", int((time.monotonic() - start) * 1000))
    try:
        result_queue.put(result)
    except Exception:
        pass


def _rtsp_probe_with_thread_timeout(
    rtsp_url: str,
    *,
    timeout_sec: int = 4,
    hard_timeout_sec: int = 6,
) -> dict:
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

    start = time.monotonic()
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(rtsp_probe, rtsp_url, timeout_sec)
    try:
        result = future.result(timeout=hard_timeout_sec)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        result.setdefault("elapsed_ms", elapsed_ms)
        result.setdefault("status", "ok" if result.get("ok") else "error")
        return result
    except FutureTimeoutError:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "ok": False,
            "status": "timeout",
            "elapsed_ms": elapsed_ms,
            "detail": "rtsp_probe_timeout",
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": "rtsp_timeout",
            "extra": {"reason": "rtsp_timeout", "hard_timeout_sec": hard_timeout_sec},
        }
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "ok": False,
            "status": "error",
            "elapsed_ms": elapsed_ms,
            "detail": "rtsp_probe_failed",
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": f"rtsp_probe_failed:{exc}",
        }
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def _tcp_probe(rtsp_url: str, timeout_sec: int = 3) -> dict:
    parsed = urlparse(rtsp_url if "://" in rtsp_url else f"rtsp://{rtsp_url}")
    host = parsed.hostname
    port = parsed.port or 554
    start = time.time()
    if not host:
        return {
            "ok": False,
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": "tcp_connect_failed:invalid_host",
            "extra": {"mode": "fallback_no_cv2"},
        }
    try:
        sock = socket.create_connection((host, port), timeout=timeout_sec)
        sock.close()
        latency_ms = int((time.time() - start) * 1000)
        return {
            "ok": True,
            "latency_ms": latency_ms,
            "fps_est": None,
            "frames_read": None,
            "error_msg": "",
            "extra": {"mode": "fallback_no_cv2"},
        }
    except Exception as exc:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "ok": False,
            "latency_ms": latency_ms,
            "fps_est": None,
            "frames_read": None,
            "error_msg": f"tcp_connect_failed:{exc}",
            "extra": {"mode": "fallback_no_cv2"},
        }
