import time
import tempfile
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from urllib.parse import urlparse
from django.utils import timezone

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
    hard_timeout_sec: int = 5,
) -> dict:
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(rtsp_probe, rtsp_url, timeout_sec)
    try:
        return future.result(timeout=hard_timeout_sec)
    except FutureTimeoutError:
        return {
            "ok": False,
            "latency_ms": None,
            "fps_est": None,
            "frames_read": None,
            "error_msg": "rtsp_timeout",
            "extra": {"reason": "rtsp_timeout", "hard_timeout_sec": hard_timeout_sec},
        }
    except Exception as exc:
        return {
            "ok": False,
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
