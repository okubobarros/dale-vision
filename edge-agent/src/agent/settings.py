from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from pathlib import Path
import yaml
import os


@dataclass
class CameraConfig:
    camera_id: str
    name: str
    rtsp_url: str
    roi_config: str


@dataclass
class Settings:
    agent_id: str
    store_id: str
    timezone: str

    cloud_base_url: str
    cloud_token: str
    cloud_timeout: int
    send_interval_seconds: int
    heartbeat_interval_seconds: int

    target_width: int
    fps_limit: int
    frame_skip: int
    queue_path: str
    buffer_sqlite_path: str
    max_queue_size: int
    log_level: str
    vision_enabled: bool

    yolo_weights_path: str
    conf: float
    iou: float
    device: str

    cameras: List[CameraConfig]


def _env_override(d: Dict[str, Any]) -> Dict[str, Any]:
    """
    Permite override via env (útil pra Docker depois).
    Ex: EDGE_CLOUD_BASE_URL, EDGE_CLOUD_TOKEN, etc.
    """
    # mantenha simples no v1; expanda conforme precisar
    base = os.getenv("EDGE_CLOUD_BASE_URL")
    edge_token = os.getenv("EDGE_TOKEN")
    token = edge_token or os.getenv("EDGE_CLOUD_TOKEN")
    heartbeat = os.getenv("HEARTBEAT_INTERVAL_SECONDS")
    heartbeat_timeout = os.getenv("HEARTBEAT_TIMEOUT_SECONDS")
    vision_env = os.getenv("EDGE_VISION_ENABLED")
    vision_enabled = None
    if vision_env is not None:
        v = vision_env.strip().lower()
        if v in ("1", "true", "yes", "y", "on"):
            vision_enabled = True
        elif v in ("0", "false", "no", "n", "off"):
            vision_enabled = False
    if base:
        d.setdefault("cloud", {})["base_url"] = base
    if token:
        d.setdefault("cloud", {})
        d["cloud"]["token"] = token
    if heartbeat:
        d.setdefault("cloud", {})["heartbeat_interval_seconds"] = int(heartbeat)
    if heartbeat_timeout:
        d.setdefault("cloud", {})["timeout_seconds"] = int(heartbeat_timeout)
    if vision_enabled is not None:
        d.setdefault("runtime", {})["vision_enabled"] = vision_enabled
    return d


def load_settings(path: str) -> Settings:
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    raw = _env_override(raw)

    agent = raw.get("agent", {})
    cloud = raw.get("cloud", {})
    runtime = raw.get("runtime", {})
    model = raw.get("model", {})
    cams = raw.get("cameras", []) or []

    cameras = [
        CameraConfig(
            camera_id=c["camera_id"],
            name=c.get("name", c["camera_id"]),
            rtsp_url=c["rtsp_url"],
            roi_config=c["roi_config"],
        )
        for c in cams
    ]

    base_dir = Path(__file__).resolve().parents[2]
    queue_path_raw = runtime.get("queue_path") or runtime.get("buffer_sqlite_path") or "./data/edge_queue.sqlite"
    queue_path = Path(queue_path_raw)
    if not queue_path.is_absolute():
        queue_path = base_dir / queue_path
    queue_path.parent.mkdir(parents=True, exist_ok=True)

    return Settings(
        agent_id=agent["agent_id"],
        store_id=agent["store_id"],
        timezone=agent.get("timezone", "America/Sao_Paulo"),

        cloud_base_url=cloud["base_url"].rstrip("/"),
        cloud_token=cloud["token"],
        cloud_timeout=int(cloud.get("timeout_seconds", 15)),
        send_interval_seconds=int(cloud.get("send_interval_seconds", 2)),
        heartbeat_interval_seconds=int(cloud.get("heartbeat_interval_seconds", 30)),

        target_width=int(runtime.get("target_width", 960)),
        fps_limit=int(runtime.get("fps_limit", 8)),
        frame_skip=int(runtime.get("frame_skip", 2)),
        queue_path=str(queue_path),
        buffer_sqlite_path=str(queue_path),
        max_queue_size=int(runtime.get("max_queue_size", 50000)),
        log_level=str(runtime.get("log_level", "INFO")),
        vision_enabled=(
            str(runtime.get("vision_enabled", True)).strip().lower() in ("1", "true", "yes", "y", "on")
            if isinstance(runtime.get("vision_enabled", True), str)
            else bool(runtime.get("vision_enabled", True))
        ),

        yolo_weights_path=str(model.get("yolo_weights_path", "./models/yolov8n.pt")),
        conf=float(model.get("conf", 0.35)),
        iou=float(model.get("iou", 0.45)),
        device=str(model.get("device", "cpu")),

        cameras=cameras,
    )
