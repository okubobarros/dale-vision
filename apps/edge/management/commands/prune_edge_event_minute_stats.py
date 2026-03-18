from __future__ import annotations

from datetime import timedelta
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.edge.models import EdgeEventMinuteStats


def _default_retention_days() -> int:
    raw = (
        getattr(settings, "EDGE_EVENT_MINUTE_RETENTION_DAYS", None)
        or os.getenv("EDGE_EVENT_MINUTE_RETENTION_DAYS")
        or "7"
    )
    try:
        days = int(raw)
    except (TypeError, ValueError):
        days = 7
    return max(1, min(days, 365))


class Command(BaseCommand):
    help = "Prune old rows from public.edge_event_minute_stats"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=_default_retention_days(),
            help="Retention window in days (default: EDGE_EVENT_MINUTE_RETENTION_DAYS or 7).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only report rows eligible for deletion.",
        )

    def handle(self, *args, **options):
        days = int(options["days"])
        dry_run = bool(options["dry_run"])
        if days < 1:
            self.stderr.write(self.style.ERROR("--days must be >= 1"))
            return

        cutoff = timezone.now() - timedelta(days=days)
        queryset = EdgeEventMinuteStats.objects.filter(minute_bucket__lt=cutoff)
        to_delete = queryset.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY-RUN] edge_event_minute_stats rows older than {days}d: {to_delete}"
                )
            )
            return

        deleted, _ = queryset.delete()
        self.stdout.write(
            self.style.SUCCESS(
                f"Pruned edge_event_minute_stats older than {days}d (cutoff={cutoff.isoformat()}), deleted={deleted}, candidates={to_delete}"
            )
        )
