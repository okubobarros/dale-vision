from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = ROOT / "docs" / "JOURNEY_EVENTS.md"

DOC_EVENT_RE = re.compile(r"^### `([^`]+)`")

PATTERNS = [
    re.compile(r"log_journey_event\((?s:.*?)event_name\s*=\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"JourneyEvent\.objects\.create\((?s:.*?)event_name\s*=\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"trackJourneyEvent\(\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"trackJourneyEventOnce\(\s*['\"][^'\"]+['\"]\s*,\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"event_name\s*:\s*['\"]([^'\"]+)['\"]"),
]

SEARCH_DIRS = [
    ROOT / "apps",
    ROOT / "backend",
    ROOT / "frontend" / "src",
]

EXTENSIONS = {".py", ".ts", ".tsx"}


def load_doc_events() -> set[str]:
    if not DOC_PATH.exists():
        print(f"[journey-lint] Missing doc file: {DOC_PATH}")
        return set()
    events: set[str] = set()
    for line in DOC_PATH.read_text(encoding="utf-8").splitlines():
        match = DOC_EVENT_RE.match(line.strip())
        if match:
            events.add(match.group(1).strip())
    return events


def find_used_events() -> set[str]:
    used: set[str] = set()
    for base in SEARCH_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.suffix not in EXTENSIONS:
                continue
            try:
                content = path.read_text(encoding="utf-8")
            except Exception:
                continue
            for pattern in PATTERNS:
                for match in pattern.findall(content):
                    if isinstance(match, tuple):
                        match = match[0]
                    used.add(str(match).strip())
    return used


def main() -> int:
    doc_events = load_doc_events()
    used_events = find_used_events()

    missing = sorted(used_events - doc_events)
    if missing:
        print("[journey-lint] Events used in code but missing in docs:")
        for name in missing:
            print(f"- {name}")
        return 1

    print(f"[journey-lint] OK ({len(used_events)} events validated)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
