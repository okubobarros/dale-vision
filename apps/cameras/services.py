import time
import cv2
import tempfile
from django.utils import timezone

def rtsp_snapshot(rtsp_url: str, timeout_sec: int = 6) -> dict:
    """
    Tenta capturar 1 frame do RTSP.
    Retorna: ok, latency_ms, tmp_path (jpg) ou error.
    """
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
