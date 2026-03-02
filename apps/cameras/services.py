import time
import tempfile
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
        return {"ok": False, "error_msg": "OpenCV (cv2) não está instalado."}

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
