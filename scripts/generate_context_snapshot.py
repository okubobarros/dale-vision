# scripts/generate_context_snapshot.py
from __future__ import annotations

import os
import sys
import json
import time
from pathlib import Path
from typing import Iterable, List, Tuple

# =========================
# Config
# =========================

ROOT = Path(__file__).resolve().parents[1]  # repo root
OUT_DIR = ROOT / "docs"
OUT_MD = OUT_DIR / "SNAPSHOT_CONTEXT.md"
OUT_JSON = OUT_DIR / "SNAPSHOT_CONTEXT.json"

# Pastas típicas do repo
DEFAULT_INCLUDE_DIRS = [
    "backend",
    "apps",
    "frontend",
    "edge-agent",
    "scripts",
    "docs",
]

# Extensões “texto”
TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".json", ".md", ".yaml", ".yml",
    ".toml", ".ini", ".env", ".txt", ".css", ".html", ".sh",
}

# Arquivos/pastas a ignorar
IGNORE_DIR_NAMES = {
    ".git", ".venv", "venv", "__pycache__", "node_modules", "dist", "build",
    ".next", ".turbo", ".pytest_cache", ".mypy_cache",
    "runs",  # edge-agent runs/*
}

IGNORE_FILE_EXTS = {
    ".mp4", ".mov", ".avi", ".mkv",
    ".pt", ".onnx",
    ".db", ".sqlite", ".sqlite3",
    ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".zip", ".7z", ".tar", ".gz",
    ".pdf",
}

# Limites (pra não explodir o snapshot)
MAX_TREE_DEPTH = 5
MAX_FILES = 220
MAX_FILE_BYTES = 200_000   # 200 KB
MAX_LINES_PER_FILE = 220
MAX_TOTAL_CHARS = 280_000  # snapshot final “controlado”


# =========================
# Helpers
# =========================

def is_ignored_dir(p: Path) -> bool:
    return p.name in IGNORE_DIR_NAMES

def is_text_file(p: Path) -> bool:
    if p.suffix.lower() in IGNORE_FILE_EXTS:
        return False
    if p.suffix.lower() in TEXT_EXTS:
        return True
    # sem extensão: às vezes README, Procfile etc.
    if p.suffix == "" and p.name.lower() in {"makefile", "dockerfile"}:
        return True
    return False

def safe_read_text(p: Path) -> str:
    try:
        data = p.read_text(encoding="utf-8", errors="replace")
        return data
    except Exception as e:
        return f"<<error reading file: {e}>>"

def rel(p: Path) -> str:
    try:
        return str(p.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(p).replace("\\", "/")

def walk_tree(start: Path, depth: int = 0, max_depth: int = MAX_TREE_DEPTH) -> List[Path]:
    """Lista paths para print de árvore (controlada)."""
    out: List[Path] = []
    if depth > max_depth:
        return out
    try:
        for child in sorted(start.iterdir(), key=lambda x: (x.is_file(), x.name.lower())):
            if child.is_dir():
                if is_ignored_dir(child):
                    continue
                out.append(child)
                out.extend(walk_tree(child, depth + 1, max_depth))
            else:
                if child.suffix.lower() in IGNORE_FILE_EXTS:
                    continue
                out.append(child)
    except Exception:
        pass
    return out

def render_tree(base: Path, include_dirs: List[str]) -> str:
    lines: List[str] = []
    for d in include_dirs:
        p = base / d
        if not p.exists():
            continue
        lines.append(f"{d}/")
        entries = walk_tree(p, 1, MAX_TREE_DEPTH)
        for e in entries:
            prefix = "  " * min(MAX_TREE_DEPTH, len(e.relative_to(p).parts))
            name = e.name + ("/" if e.is_dir() else "")
            lines.append(f"{prefix}{name}")
        lines.append("")
    return "\n".join(lines).strip()

def select_files(base: Path, include_dirs: List[str]) -> List[Path]:
    files: List[Path] = []
    for d in include_dirs:
        root = base / d
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dp = Path(dirpath)
            # prune ignored dirs
            dirnames[:] = [dn for dn in dirnames if dn not in IGNORE_DIR_NAMES]
            for fn in filenames:
                p = dp / fn
                if not is_text_file(p):
                    continue
                try:
                    st = p.stat()
                    if st.st_size > MAX_FILE_BYTES:
                        continue
                except Exception:
                    continue
                files.append(p)
    # limita quantidade
    files = sorted(set(files), key=lambda x: rel(x))
    return files[:MAX_FILES]

def excerpt(text: str, max_lines: int = MAX_LINES_PER_FILE) -> str:
    lines = text.splitlines()
    if len(lines) <= max_lines:
        return text.strip()
    return "\n".join(lines[:max_lines]).rstrip() + "\n\n<<truncated>>"

def clamp_total(text: str, max_chars: int = MAX_TOTAL_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n\n<<SNAPSHOT TRUNCATED: max chars reached>>\n"

# =========================
# Main
# =========================

def main():
    include_dirs = DEFAULT_INCLUDE_DIRS.copy()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    meta = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "root": str(ROOT),
        "include_dirs": include_dirs,
        "limits": {
            "MAX_TREE_DEPTH": MAX_TREE_DEPTH,
            "MAX_FILES": MAX_FILES,
            "MAX_FILE_BYTES": MAX_FILE_BYTES,
            "MAX_LINES_PER_FILE": MAX_LINES_PER_FILE,
            "MAX_TOTAL_CHARS": MAX_TOTAL_CHARS,
        },
        "ignored": {
            "IGNORE_DIR_NAMES": sorted(list(IGNORE_DIR_NAMES)),
            "IGNORE_FILE_EXTS": sorted(list(IGNORE_FILE_EXTS)),
        }
    }

    tree_txt = render_tree(ROOT, include_dirs)
    files = select_files(ROOT, include_dirs)

    parts: List[str] = []
    parts.append("# SNAPSHOT_CONTEXT (auto)\n")
    parts.append(f"Gerado em: {meta['generated_at']}\n")
    parts.append("Este snapshot existe para colar em um novo chat e dar contexto do repositório.\n")
    parts.append("Inclui apenas arquivos texto e ignora binários/vídeos/modelos.\n")

    parts.append("\n---\n## Tree (limitada)\n")
    parts.append("```")
    parts.append(tree_txt or "<<empty>>")
    parts.append("```")

    parts.append("\n---\n## Arquivos incluídos\n")
    parts.append("```")
    for p in files:
        parts.append(rel(p))
    parts.append("```")

    parts.append("\n---\n## Conteúdo (trechos)\n")
    for p in files:
        parts.append(f"\n### {rel(p)}\n")
        parts.append("```")
        parts.append(excerpt(safe_read_text(p)))
        parts.append("```")

    md = clamp_total("\n".join(parts), MAX_TOTAL_CHARS)

    OUT_MD.write_text(md, encoding="utf-8")
    OUT_JSON.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"✅ wrote: {rel(OUT_MD)}")
    print(f"✅ wrote: {rel(OUT_JSON)}")
    print(f"files included: {len(files)}")

if __name__ == "__main__":
    main()
