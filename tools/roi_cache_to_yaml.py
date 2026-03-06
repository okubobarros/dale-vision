import json
import unicodedata
from pathlib import Path


STORE_ID = "47daec5a-11c3-4556-8dd8-fd2b00aa1bb0"
CACHE_DIR = Path(r"C:\Users\Alexandre\Downloads\dalevision-edge-agent-windows\cache\roi")
OUT_DIR = Path(r"C:\ProgramData\DaleVision\rois") / STORE_ID


def _slug(text: str) -> str:
    if not text:
        return ""
    value = unicodedata.normalize("NFKD", text)
    value = value.encode("ascii", "ignore").decode("ascii")
    return value.lower().strip()


def _canonical(name: str) -> str:
    value = _slug(name)
    if not value:
        return ""
    if "funcionario" in value and "caixa" in value:
        return "zona_funcionario_caixa"
    if "pagamento" in value or "caixa" in value:
        return "ponto_pagamento"
    if "fila" in value or "espera" in value or "atendimento" in value:
        return "area_atendimento_fila"
    if "consumo" in value or "salao" in value or "sala" in value or "mesa" in value:
        return "area_consumo"
    if "entrada" in value or "saida" in value or "porta" in value:
        return "entrada"
    return value.replace(" ", "_")


def _write_yaml(path: Path, zones: dict, lines: dict) -> None:
    with path.open("w", encoding="utf-8") as handle:
        handle.write("zones:\n")
        for name, pts in zones.items():
            handle.write(f"  {name}:\n")
            for x, y in pts:
                handle.write(f"    - [{x}, {y}]\n")
        handle.write("lines:\n")
        for name, pts in lines.items():
            handle.write(f"  {name}:\n")
            for x, y in pts:
                handle.write(f"    - [{x}, {y}]\n")


def _load_config(payload: dict) -> dict | None:
    if not isinstance(payload, dict):
        return None
    config = payload.get("config_json")
    if isinstance(config, dict):
        return config
    data = payload.get("data") or {}
    config = data.get("config_json")
    return config if isinstance(config, dict) else None


def main() -> int:
    if not CACHE_DIR.exists():
        print(f"Cache dir not found: {CACHE_DIR}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    written = 0
    for file in CACHE_DIR.glob("*.json"):
        try:
            payload = json.loads(file.read_text(encoding="utf-8"))
        except Exception:
            continue
        config = _load_config(payload)
        if not isinstance(config, dict):
            continue
        image = config.get("image") or {}
        width = image.get("width") or 0
        height = image.get("height") or 0
        if not width or not height:
            continue

        zones = {}
        for zone in config.get("zones") or []:
            if not isinstance(zone, dict):
                continue
            name = _canonical(zone.get("name", ""))
            pts = zone.get("points") or []
            if not name or not pts:
                continue
            out = []
            for point in pts:
                try:
                    out.append((int(point["x"] * width), int(point["y"] * height)))
                except Exception:
                    continue
            if out:
                zones[name] = out

        lines = {}
        for line in config.get("lines") or []:
            if not isinstance(line, dict):
                continue
            name = _canonical(line.get("name", ""))
            pts = line.get("points") or []
            if not name or len(pts) != 2:
                continue
            try:
                p1 = (int(pts[0]["x"] * width), int(pts[0]["y"] * height))
                p2 = (int(pts[1]["x"] * width), int(pts[1]["y"] * height))
                lines[name] = [p1, p2]
            except Exception:
                continue

        if not zones and not lines:
            continue
        out_path = OUT_DIR / f"{file.stem}.yaml"
        _write_yaml(out_path, zones, lines)
        written += 1

    print(f"ROI YAML written: {written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
