from __future__ import annotations

from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand
from django.db import models
from django.utils import timezone

from apps.copilot.models import ActionOutcome, ValueLedgerDaily


def _parse_date(raw: str) -> date:
    return datetime.strptime(raw, "%Y-%m-%d").date()


def _iter_dates(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


class Command(BaseCommand):
    help = "Reconstrói ValueLedgerDaily a partir de ActionOutcome por período."

    def add_arguments(self, parser):
        parser.add_argument("--date", type=str, help="Data única YYYY-MM-DD")
        parser.add_argument("--start", type=str, help="Data inicial YYYY-MM-DD")
        parser.add_argument("--end", type=str, help="Data final YYYY-MM-DD")
        parser.add_argument("--store-id", type=str, default=None, help="UUID da loja (opcional)")
        parser.add_argument("--org-id", type=str, default=None, help="UUID da organização (opcional)")
        parser.add_argument("--delete-orphans", action="store_true", help="Remove linhas de ledger sem outcomes no período")

    def handle(self, *args, **options):
        today = timezone.localdate()
        default_day = today - timedelta(days=1)
        if options.get("date"):
            start_date = _parse_date(options["date"])
            end_date = start_date
        else:
            start_date = _parse_date(options["start"]) if options.get("start") else default_day
            end_date = _parse_date(options["end"]) if options.get("end") else start_date
        if end_date < start_date:
            start_date, end_date = end_date, start_date

        store_id = (options.get("store_id") or "").strip() or None
        org_id = (options.get("org_id") or "").strip() or None
        delete_orphans = bool(options.get("delete_orphans"))

        outcomes_qs = ActionOutcome.objects.filter(
            dispatched_at__date__gte=start_date,
            dispatched_at__date__lte=end_date,
        )
        if store_id:
            outcomes_qs = outcomes_qs.filter(store_id=store_id)
        if org_id:
            outcomes_qs = outcomes_qs.filter(org_id=org_id)

        grouped = (
            outcomes_qs.values("org_id", "store_id")
            .annotate(days=models.Count("id"))
            .order_by("org_id", "store_id")
        )

        upserts = 0
        for row in grouped:
            row_org_id = row["org_id"]
            row_store_id = row["store_id"]
            for ledger_date in _iter_dates(start_date, end_date):
                day_qs = outcomes_qs.filter(
                    org_id=row_org_id,
                    store_id=row_store_id,
                    dispatched_at__date=ledger_date,
                )
                agg = day_qs.aggregate(
                    expected_total=models.Sum("impact_expected_brl"),
                    recovered_total=models.Sum("impact_realized_brl"),
                    actions_total=models.Count("id"),
                    actions_completed=models.Sum(
                        models.Case(
                            models.When(status="completed", then=1),
                            default=0,
                            output_field=models.IntegerField(),
                        )
                    ),
                    confidence_avg=models.Avg("confidence_score"),
                )
                if int(agg.get("actions_total") or 0) == 0:
                    continue

                defaults = {
                    "value_at_risk_brl": float(agg.get("expected_total") or 0),
                    "value_recovered_brl": float(agg.get("recovered_total") or 0),
                    "actions_dispatched": int(agg.get("actions_total") or 0),
                    "actions_completed": int(agg.get("actions_completed") or 0),
                    "confidence_score_avg": float(agg.get("confidence_avg") or 0),
                    "method_version": "value_ledger_v1_2026-03-15",
                    "updated_at": timezone.now(),
                }
                ValueLedgerDaily.objects.update_or_create(
                    org_id=row_org_id,
                    store_id=row_store_id,
                    ledger_date=ledger_date,
                    defaults=defaults,
                )
                upserts += 1

        deleted = 0
        if delete_orphans:
            ledger_qs = ValueLedgerDaily.objects.filter(ledger_date__gte=start_date, ledger_date__lte=end_date)
            if store_id:
                ledger_qs = ledger_qs.filter(store_id=store_id)
            if org_id:
                ledger_qs = ledger_qs.filter(org_id=org_id)
            for row in ledger_qs.values("id", "org_id", "store_id", "ledger_date"):
                exists = outcomes_qs.filter(
                    org_id=row["org_id"],
                    store_id=row["store_id"],
                    dispatched_at__date=row["ledger_date"],
                ).exists()
                if not exists:
                    ValueLedgerDaily.objects.filter(id=row["id"]).delete()
                    deleted += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"rebuild_value_ledger_daily concluído: upserts={upserts} deleted={deleted} range={start_date}->{end_date}"
            )
        )
