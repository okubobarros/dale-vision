from __future__ import annotations

from typing import Dict, List, Optional
from django.utils import timezone
from django.core.exceptions import FieldError

from apps.core.models import OnboardingProgress, Store, OrgMember
from apps.stores.services.user_uuid import ensure_user_uuid


STEPS_ORDER = [
    "edge_connected",
    "camera_added",
    "camera_health_ok",
    "roi_published",
    "monitoring_started",
    "first_insight",
]


def _now():
    return timezone.now()


def _merge_meta(existing: dict, incoming: Optional[dict]) -> dict:
    merged = dict(existing or {})
    if incoming:
        merged.update(incoming)
    return merged


def _get_org_id_for_store(store_id: str) -> Optional[str]:
    row = Store.objects.filter(id=store_id).values("org_id").first()
    if row:
        return str(row["org_id"])
    return None


def _user_has_org_access(user, org_id: str) -> bool:
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    user_uuid = ensure_user_uuid(user)
    return OrgMember.objects.filter(org_id=org_id, user_id=user_uuid).exists()


class OnboardingProgressService:
    def __init__(self, org_id: str, store_id: Optional[str] = None):
        self.org_id = str(org_id)
        self.store_id = str(store_id) if store_id else None

    def _progress_queryset(self):
        qs = OnboardingProgress.objects.filter(org_id=self.org_id)
        if self.store_id:
            try:
                qs = qs.filter(store_id=self.store_id)
            except FieldError:
                # Backward compatibility while DB column store_id is not applied yet.
                pass
        return qs

    def get_progress(self) -> Dict[str, dict]:
        rows = (
            self._progress_queryset()
            .values("step", "completed", "completed_at", "status", "progress_percent", "meta")
        )
        mapped = {row["step"]: row for row in rows}
        progress = {}
        for step in STEPS_ORDER:
            row = mapped.get(step) or {}
            progress[step] = {
                "step": step,
                "completed": bool(row.get("completed", False)),
                "completed_at": row.get("completed_at"),
                "status": row.get("status"),
                "progress_percent": row.get("progress_percent"),
                "meta": row.get("meta") or {},
            }
        return progress

    def next_step(self) -> Optional[str]:
        progress = self.get_progress()
        for step in STEPS_ORDER:
            if not progress[step]["completed"]:
                return step
        return None

    def complete_step(self, step: str, meta: Optional[dict] = None) -> dict:
        if step not in STEPS_ORDER:
            raise ValueError("step inválido")
        merged_meta = _merge_meta({}, meta or {})
        if self.store_id and "store_id" not in merged_meta:
            merged_meta["store_id"] = self.store_id
        defaults = {
            "completed": True,
            "completed_at": _now(),
            "status": "completed",
            "meta": merged_meta,
            "updated_at": _now(),
        }
        key_filters = {"org_id": self.org_id, "step": step}
        if self.store_id:
            key_filters["store_id"] = self.store_id
        try:
            row, _created = OnboardingProgress.objects.update_or_create(
                **key_filters,
                defaults=defaults,
            )
        except FieldError:
            key_filters.pop("store_id", None)
            row, _created = OnboardingProgress.objects.update_or_create(
                **key_filters,
                defaults=defaults,
            )
        self._maybe_complete_first_insight()
        return {
            "step": row.step,
            "completed": row.completed,
            "completed_at": row.completed_at,
            "status": row.status,
            "progress_percent": row.progress_percent,
            "meta": row.meta or {},
        }

    def set_status(self, step: str, status: str, meta: Optional[dict] = None) -> dict:
        if step not in STEPS_ORDER:
            raise ValueError("step inválido")
        existing_qs = self._progress_queryset().filter(step=step)
        existing = existing_qs.first()
        merged_meta = _merge_meta(existing.meta if existing else {}, meta)
        if self.store_id and "store_id" not in merged_meta:
            merged_meta["store_id"] = self.store_id
        defaults = {
            "status": status,
            "meta": merged_meta,
            "updated_at": _now(),
        }
        key_filters = {"org_id": self.org_id, "step": step}
        if self.store_id:
            key_filters["store_id"] = self.store_id
        try:
            row, _created = OnboardingProgress.objects.update_or_create(
                **key_filters,
                defaults=defaults,
            )
        except FieldError:
            key_filters.pop("store_id", None)
            row, _created = OnboardingProgress.objects.update_or_create(
                **key_filters,
                defaults=defaults,
            )
        return {
            "step": row.step,
            "completed": row.completed,
            "completed_at": row.completed_at,
            "status": row.status,
            "progress_percent": row.progress_percent,
            "meta": row.meta or {},
        }

    def _maybe_complete_first_insight(self) -> None:
        progress = self.get_progress()
        if progress["first_insight"]["completed"]:
            return
        if progress["camera_health_ok"]["completed"] and progress["roi_published"]["completed"]:
            key_filters = {"org_id": self.org_id, "step": "first_insight"}
            if self.store_id:
                key_filters["store_id"] = self.store_id
            try:
                OnboardingProgress.objects.update_or_create(
                    **key_filters,
                    defaults={
                        "completed": True,
                        "completed_at": _now(),
                        "status": "completed",
                        "updated_at": _now(),
                        "meta": {"store_id": self.store_id} if self.store_id else {},
                    },
                )
            except FieldError:
                key_filters.pop("store_id", None)
                OnboardingProgress.objects.update_or_create(
                    **key_filters,
                    defaults={
                        "completed": True,
                        "completed_at": _now(),
                        "status": "completed",
                        "updated_at": _now(),
                        "meta": {},
                    },
                )


def get_service_for_store(store_id: str) -> Optional[OnboardingProgressService]:
    org_id = _get_org_id_for_store(store_id)
    if not org_id:
        return None
    return OnboardingProgressService(org_id, store_id=store_id)


def get_service_for_user_store(user, store_id: str) -> Optional[OnboardingProgressService]:
    org_id = _get_org_id_for_store(store_id)
    if not org_id:
        return None
    if not _user_has_org_access(user, org_id):
        return None
    return OnboardingProgressService(org_id, store_id=store_id)
