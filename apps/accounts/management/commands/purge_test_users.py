import logging
from typing import List, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.db import connection, transaction

from knox.models import AuthToken

from apps.core.models import OrgMember, Store, Employee, Camera

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Purge test users and related data by email domain."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email-domain",
            required=True,
            help="Email domain to purge (e.g. test.local).",
        )

    def handle(self, *args, **options):
        domain = (options.get("email_domain") or "").strip().lower()
        if not domain:
            raise CommandError("email-domain is required.")
        if domain.startswith("@"):
            domain = domain[1:]

        users = User.objects.filter(email__iendswith=f"@{domain}")
        user_ids = list(users.values_list("id", flat=True))
        if not user_ids:
            self.stdout.write(self.style.WARNING(f"No users found for domain @{domain}."))
            return

        user_uuids = self._fetch_user_uuids(user_ids)
        org_ids = list(
            OrgMember.objects.filter(user_id__in=user_uuids)
            .values_list("org_id", flat=True)
            .distinct()
        )
        store_ids = list(Store.objects.filter(org_id__in=org_ids).values_list("id", flat=True))

        self.stdout.write(
            f"Found users={len(user_ids)} user_uuids={len(user_uuids)} orgs={len(org_ids)} stores={len(store_ids)}"
        )

        deleted_counts = {}

        with transaction.atomic():
            deleted_counts["cameras"] = self._delete_queryset(Camera, store_ids, "store_id")
            deleted_counts["employees"] = self._delete_queryset(Employee, store_ids, "store_id")
            deleted_counts["stores"] = self._delete_queryset(Store, store_ids, "id")
            deleted_counts["org_members"] = self._delete_queryset(OrgMember, user_uuids, "user_id")

            deleted_counts["user_id_map"] = self._delete_user_id_map(user_ids)
            deleted_counts["knox_tokens"] = AuthToken.objects.filter(user_id__in=user_ids).delete()[0]
            deleted_counts["auth_users"] = User.objects.filter(id__in=user_ids).delete()[0]

        for key, value in deleted_counts.items():
            self.stdout.write(f"{key}: {value}")

        logger.info(
            "purge_test_users domain=%s users=%s stores=%s orgs=%s",
            domain,
            len(user_ids),
            len(store_ids),
            len(org_ids),
        )

    def _fetch_user_uuids(self, user_ids: List[int]) -> List[str]:
        if not user_ids:
            return []
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = ANY(%s)",
                [user_ids],
            )
            rows = cursor.fetchall()
        return [row[0] for row in rows if row and row[0]]

    def _delete_user_id_map(self, user_ids: List[int]) -> int:
        if not user_ids:
            return 0
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM public.user_id_map WHERE django_user_id = ANY(%s)",
                [user_ids],
            )
            return cursor.rowcount

    @staticmethod
    def _delete_queryset(model, ids: List, field: str) -> int:
        if not ids:
            return 0
        return model.objects.filter(**{f"{field}__in": ids}).delete()[0]
