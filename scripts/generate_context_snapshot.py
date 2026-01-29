# scripts/generate_context_snapshot.py
import os
import json
from datetime import datetime

ROOT = os.path.abspath(os.getcwd())

# Pastas principais do seu monorepo
SCAN_DIRS = [
    "apps",
    "backend",
    "frontend/src",
    "frontend/public",
    "frontend/package.json",
    "frontend/vite.config.ts",
    "frontend/tsconfig.json",
    "frontend/tsconfig.app.json",
    "frontend/tsconfig.node.json",
    "edge-agent",
    "scripts",
    "contracts",
    "docs",
]

# Arquivos que valem preview (ajuste à vontade)
# Caminho B (fonte única de verdade = apps/core/models.py)
IMPORTANT_FILES = [
    # Django core wiring
    "backend/settings.py",
    "backend/urls.py",
    "backend/asgi.py",
    "backend/wsgi.py",

    # Accounts/Auth
    "apps/accounts/views.py",
    "apps/accounts/serializers.py",
    "apps/accounts/urls.py",

    # Core (SSoT: Store, Camera, DetectionEvent, AlertRule, etc)
    "apps/core/models.py",
    "apps/core/serializers.py",
    "apps/core/admin.py",

    # Stores API (mesmo com model no core, as views podem estar em apps/stores)
    "apps/stores/models.py",
    "apps/stores/serializers.py",
    "apps/stores/views.py",
    "apps/stores/urls.py",

    # Cameras API (sem model próprio — usa apps.core.models.Camera)
    "apps/cameras/views.py",
    "apps/cameras/serializers.py",
    "apps/cameras/services.py",
    "apps/cameras/urls.py",

    # Alerts
    "apps/alerts/models.py",
    "apps/alerts/serializers.py",
    "apps/alerts/services.py",
    "apps/alerts/views.py",
    "apps/alerts/urls.py",

    # Edge ingest
    "apps/edge/models.py",
    "apps/edge/serializers.py",
    "apps/edge/permissions.py",
    "apps/edge/views.py",
    "apps/edge/urls.py",

    # Frontend
    "frontend/src/App.tsx",
    "frontend/src/main.tsx",
    "frontend/src/services/api.ts",
    "frontend/src/services/alerts.ts",
    "frontend/src/services/stores.ts",

    # Docs/Contracts (se existirem)
    "contracts/event_envelope_v1.json",
    "contracts/edge_event_envelope.json",
]

# Ignorar coisas pesadas/inúteis
IGNORE_DIRS = {
    ".git", ".github", ".vscode", "__pycache__", ".pytest_cache",
    ".venv", "venv", "env",
    "node_modules", "dist", "build", ".next",
    ".turbo", ".cache",
    "outputs", "videos",
}

IGNORE_FILES_SUFFIX = (
    ".pyc", ".log", ".tmp", ".lock", ".map",
)

MAX_TREE_LINES_PER_SECTION = 1200
MAX_PREVIEW_CHARS = 6000


def safe_read(path, max_chars=MAX_PREVIEW_CHARS):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()[:max_chars]
    except Exception as e:
        return f"<ERROR reading {path}: {e}>"


def should_ignore_dir(dirname: str) -> bool:
    base = os.path.basename(dirname)
    return base in IGNORE_DIRS


def should_ignore_file(filename: str) -> bool:
    if filename.endswith(IGNORE_FILES_SUFFIX):
        return True
    return False


def list_tree(path, max_depth=5):
    out = []
    abs_base = os.path.join(ROOT, path)
    if not os.path.exists(abs_base):
        return [f"(missing) {path}"]

    # Se for arquivo, só lista ele
    if os.path.isfile(abs_base):
        return [path]

    for root, dirs, files in os.walk(abs_base):
        # filtra dirs
        dirs[:] = [d for d in dirs if not should_ignore_dir(d)]
        rel_root = os.path.relpath(root, ROOT)

        depth = rel_root.count(os.sep) - path.count(os.sep)
        if depth > max_depth:
            dirs[:] = []
            continue

        out.append(rel_root + "/")

        # filtra files
        files = [f for f in files if not should_ignore_file(f)]
        for fn in sorted(files):
            out.append("  " * (depth + 1) + fn)

        if len(out) > MAX_TREE_LINES_PER_SECTION:
            out.append("... (tree truncated)")
            break

    return out


def _autodiscover_files(base_dir: str, exts=(".py", ".md", ".yaml", ".yml", ".toml", ".json"), limit=12):
    """Returns relative paths under ROOT from a base dir."""
    abs_dir = os.path.join(ROOT, base_dir)
    if not os.path.exists(abs_dir):
        return []

    candidates = []
    for root, dirs, files in os.walk(abs_dir):
        dirs[:] = [d for d in dirs if not should_ignore_dir(d)]
        for f in files:
            if should_ignore_file(f):
                continue
            if f.endswith(exts):
                rel = os.path.relpath(os.path.join(root, f), ROOT)
                candidates.append(rel)

    candidates = sorted(candidates)[:limit]
    return candidates


def resolve_existing_important_files():
    """
    Remove IMPORTANT_FILES that don't exist,
    and auto-add key edge-agent + apps/edge + key app entrypoints.
    """
    existing = []

    for rel in IMPORTANT_FILES:
        abs_path = os.path.join(ROOT, rel)
        if os.path.exists(abs_path) and os.path.isfile(abs_path):
            existing.append(rel)

    # Auto-discover edge-agent src entrypoints (top 15)
    existing += [p for p in _autodiscover_files("edge-agent/src", limit=15) if p not in existing]

    # Auto-discover apps/edge (top 10)
    existing += [p for p in _autodiscover_files("apps/edge", limit=10) if p not in existing]

    # Auto-discover apps/alerts (top 10)
    existing += [p for p in _autodiscover_files("apps/alerts", limit=10) if p not in existing]

    # Auto-discover backend root (urls/settings) extras (top 8)
    existing += [p for p in _autodiscover_files("backend", limit=8) if p not in existing]

    return existing


def main():
    snapshot = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "root": ROOT,
        "tree": {},
        "important_files_preview": {},
    }

    # Tree
    for p in SCAN_DIRS:
        snapshot["tree"][p] = list_tree(p)

    # Previews
    important = resolve_existing_important_files()
    for rel in important:
        abs_path = os.path.join(ROOT, rel)
        snapshot["important_files_preview"][rel] = safe_read(abs_path)

    os.makedirs("docs", exist_ok=True)
    out_json = os.path.join("docs", "SNAPSHOT_CONTEXT.json")
    out_md = os.path.join("docs", "SNAPSHOT_CONTEXT.md")

    with open(out_json, "w", encoding="utf-8") as fp:
        json.dump(snapshot, fp, indent=2, ensure_ascii=False)

    md = []
    md.append("# DALE Vision — Context Snapshot\n")
    md.append(f"Generated at: `{snapshot['generated_at']}`\n")
    md.append("## Project Tree\n")

    for k, lines in snapshot["tree"].items():
        md.append(f"### {k}\n")
        md.append("```")
        md.extend(lines)
        md.append("```\n")

    md.append("## Important Files (Preview)\n")
    for k, content in snapshot["important_files_preview"].items():
        md.append(f"### {k}\n")
        md.append("```")
        md.append(content)
        md.append("```\n")

    with open(out_md, "w", encoding="utf-8") as fp:
        fp.write("\n".join(md))

    print("✅ Generated:")
    print(" -", out_json)
    print(" -", out_md)


if __name__ == "__main__":
    main()
