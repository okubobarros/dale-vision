# apps/core/models.py
from django.conf import settings
from django.utils import timezone
from django.db import models
import uuid

# -------------------------
# Helpers
# -------------------------
class UnmanagedModel(models.Model):
    class Meta:
        abstract = True
        managed = False


# -------------------------
# ENUM-like choices (compatível com Postgres enum)
# -------------------------
ORG_ROLE = (
    ("owner", "owner"),
    ("admin", "admin"),
    ("manager", "manager"),
    ("viewer", "viewer"),
)

STORE_STATUS = (
    ("active", "active"),
    ("inactive", "inactive"),
    ("trial", "trial"),
    ("blocked", "blocked"),
)

CAMERA_STATUS = (
    ("online", "online"),
    ("degraded", "degraded"),
    ("offline", "offline"),
    ("unknown", "unknown"),
    ("error", "error"),
)

ALERT_SEVERITY = (
    ("critical", "critical"),
    ("warning", "warning"),
    ("info", "info"),
)

EVENT_STATUS = (
    ("open", "open"),
    ("resolved", "resolved"),
    ("ignored", "ignored"),
)

EMPLOYEE_ROLE = (
    ("owner", "owner"),
    ("manager", "manager"),
    ("cashier", "cashier"),
    ("seller", "seller"),
    ("security", "security"),
    ("stock", "stock"),
    ("other", "other"),
)

LEAD_STATUS = (
    ("new", "new"),
    ("contacted", "contacted"),
    ("scheduled", "scheduled"),
    ("no_show", "no_show"),
    ("trial_active", "trial_active"),
    ("converted", "converted"),
    ("lost", "lost"),
)

SUBSCRIPTION_STATUS = (
    ("trialing", "trialing"),
    ("active", "active"),
    ("past_due", "past_due"),
    ("canceled", "canceled"),
    ("incomplete", "incomplete"),
    ("blocked", "blocked"),
)


# -------------------------
# Organization / Membership
# -------------------------
class Organization(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.TextField()
    segment = models.TextField(null=True, blank=True)
    country = models.TextField(default="BR")
    timezone = models.TextField(default="America/Sao_Paulo")
    created_at = models.DateTimeField()
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    class Meta(UnmanagedModel.Meta):
        db_table = "organizations"


class OrgMember(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    user_id = models.UUIDField()  # uuid do User Django
    role = models.CharField(max_length=20, choices=ORG_ROLE, default="viewer")
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "org_members"
        unique_together = (("org", "user_id"),)


# -------------------------
# Stores / Zones
# -------------------------
class Store(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    code = models.TextField(null=True, blank=True)
    name = models.TextField()
    mall_name = models.TextField(null=True, blank=True)
    city = models.TextField(null=True, blank=True)
    state = models.TextField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    business_type = models.TextField(null=True, blank=True)
    business_type_other = models.TextField(null=True, blank=True)
    pos_system = models.TextField(null=True, blank=True)
    pos_other = models.TextField(null=True, blank=True)
    pos_integration_interest = models.BooleanField(default=False)
    avg_hourly_labor_cost = models.DecimalField(null=True, blank=True, max_digits=12, decimal_places=2)
    hours_weekdays = models.TextField(null=True, blank=True)
    hours_saturday = models.TextField(null=True, blank=True)
    hours_sunday_holiday = models.TextField(null=True, blank=True)
    employees_count = models.IntegerField(null=True, blank=True)
    cameras_count = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STORE_STATUS, default="trial")
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    blocked_reason = models.TextField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta(UnmanagedModel.Meta):
        db_table = "stores"


class StoreZone(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    name = models.TextField()
    zone_type = models.TextField()
    is_critical = models.BooleanField(default=False)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "store_zones"
        unique_together = (("store", "name"),)


# -------------------------
# Cameras
# -------------------------
class Camera(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    zone = models.ForeignKey(StoreZone, on_delete=models.DO_NOTHING, db_column="zone_id", null=True, blank=True)

    name = models.TextField()
    external_id = models.TextField(null=True, blank=True)
    brand = models.TextField(null=True, blank=True)
    model = models.TextField(null=True, blank=True)
    ip = models.TextField(null=True, blank=True)
    onvif = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    rtsp_url = models.TextField(null=True, blank=True)
    username = models.TextField(null=True, blank=True)
    password = models.TextField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=CAMERA_STATUS, default="unknown")
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_snapshot_url = models.TextField(null=True, blank=True)
    last_error = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "cameras"


class CameraHealthLog(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    camera = models.ForeignKey(
        "Camera",
        db_column="camera_id",
        on_delete=models.DO_NOTHING,
        related_name="health_logs",
    )
    checked_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=CAMERA_STATUS)
    latency_ms = models.IntegerField(null=True, blank=True)
    snapshot_url = models.TextField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)

    class Meta(UnmanagedModel.Meta):
        db_table = "camera_health_logs"


# -------------------------
# Employees / Shifts / Clock
# -------------------------
class Employee(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    full_name = models.TextField()
    email = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=EMPLOYEE_ROLE, default="other")
    role_other = models.TextField(null=True, blank=True)
    external_id = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "employees"


class Shift(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    employee = models.ForeignKey(Employee, on_delete=models.DO_NOTHING, db_column="employee_id")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    planned = models.BooleanField(default=True)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "shifts"


class TimeClockEntry(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    employee = models.ForeignKey(Employee, on_delete=models.DO_NOTHING, db_column="employee_id", null=True, blank=True)
    source = models.TextField(default="manual")
    clock_in_at = models.DateTimeField(null=True, blank=True)
    clock_out_at = models.DateTimeField(null=True, blank=True)
    evidence_event_id = models.UUIDField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "time_clock_entries"


# -------------------------
# Events / Media
# -------------------------
class DetectionEvent(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    camera = models.ForeignKey(Camera, on_delete=models.DO_NOTHING, db_column="camera_id", null=True, blank=True)
    zone = models.ForeignKey(StoreZone, on_delete=models.DO_NOTHING, db_column="zone_id", null=True, blank=True)

    type = models.TextField()
    severity = models.CharField(max_length=20, choices=ALERT_SEVERITY)
    status = models.CharField(max_length=20, choices=EVENT_STATUS, default="open")

    title = models.TextField()
    description = models.TextField(null=True, blank=True)
    occurred_at = models.DateTimeField()
    metadata = models.JSONField(default=dict)

    suppressed_by_rule_id = models.UUIDField(null=True, blank=True)
    suppressed_reason = models.TextField(null=True, blank=True)

    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by_user_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "detection_events"


class EventMedia(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    event = models.ForeignKey(DetectionEvent, on_delete=models.DO_NOTHING, db_column="event_id")
    media_type = models.TextField()  # clip|snapshot
    url = models.TextField()
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "event_media"


# -------------------------
# Alert Rules / Notifications
# -------------------------
class AlertRule(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    zone = models.ForeignKey(StoreZone, on_delete=models.DO_NOTHING, db_column="zone_id", null=True, blank=True)

    type = models.TextField()
    severity = models.CharField(max_length=20, choices=ALERT_SEVERITY, default="warning")
    active = models.BooleanField(default=True)

    threshold = models.JSONField(default=dict)
    cooldown_minutes = models.IntegerField(default=15)
    channels = models.JSONField(default=dict)  # {"dashboard":true,"email":false,"whatsapp":false}

    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "alert_rules"
        unique_together = (("store", "zone", "type"),)


class NotificationLog(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    event = models.ForeignKey(DetectionEvent, on_delete=models.DO_NOTHING, db_column="event_id", null=True, blank=True)
    rule = models.ForeignKey(AlertRule, on_delete=models.DO_NOTHING, db_column="rule_id", null=True, blank=True)

    channel = models.TextField()  # dashboard|email|whatsapp
    destination = models.TextField(null=True, blank=True)
    provider = models.TextField(null=True, blank=True)
    status = models.TextField()  # sent|failed
    provider_message_id = models.TextField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "notification_logs"


# -------------------------
# Demo Leads / Onboarding
# -------------------------
class DemoLead(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org_name = models.TextField(null=True, blank=True)
    contact_name = models.TextField()
    email = models.TextField()
    whatsapp = models.TextField(null=True, blank=True)
    best_time = models.TextField(null=True, blank=True)
    segment = models.TextField(null=True, blank=True)
    stores_count = models.IntegerField(null=True, blank=True)
    city = models.TextField(null=True, blank=True)
    state = models.TextField(null=True, blank=True)
    camera_brands = models.TextField(null=True, blank=True)
    has_rtsp = models.BooleanField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=LEAD_STATUS, default="new")
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    # --- NOVOS CAMPOS (schema evolução) ---
    source = models.TextField(null=True, blank=True)
    utm = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict)

    operation_type = models.TextField(null=True, blank=True)
    stores_range = models.TextField(null=True, blank=True)
    cameras_range = models.TextField(null=True, blank=True)
    primary_goal = models.TextField(null=True, blank=True)

    pilot_city = models.TextField(null=True, blank=True)
    pilot_state = models.TextField(null=True, blank=True)

    calendly_event_uri = models.TextField(null=True, blank=True)
    calendly_invitee_uri = models.TextField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    timezone = models.TextField(null=True, blank=True)

    camera_brands_json = models.JSONField(default=list)
    qualified_score = models.IntegerField(default=0)
    primary_goals = models.JSONField(default=list)
    class Meta(UnmanagedModel.Meta):
        db_table = "demo_leads"


class OnboardingProgress(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    step = models.TextField()
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()
    status = models.TextField(null=True, blank=True)
    progress_percent = models.IntegerField(null=True, blank=True)
    meta = models.JSONField(default=dict)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta(UnmanagedModel.Meta):
        db_table = "onboarding_progress"
        unique_together = (("org", "step"),)


# -------------------------
# Billing
# -------------------------
class BillingCustomer(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    stripe_customer_id = models.TextField()
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "billing_customers"


class Subscription(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    stripe_subscription_id = models.TextField(null=True, blank=True)
    plan_code = models.TextField()
    status = models.CharField(max_length=20, choices=SUBSCRIPTION_STATUS, default="trialing")
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "subscriptions"


# -------------------------
# Audit
# -------------------------
class AuditLog(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id", null=True, blank=True)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id", null=True, blank=True)
    actor_user_id = models.UUIDField(null=True, blank=True)
    action = models.TextField()
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "audit_logs"
# -------------------------
# Journey Events (CRM / Pipeline)
# -------------------------
class JourneyEvent(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    lead = models.ForeignKey(
        DemoLead,
        on_delete=models.DO_NOTHING,
        db_column="lead_id",
        null=True,
        blank=True,
    )

    org = models.ForeignKey(
        Organization,
        on_delete=models.DO_NOTHING,
        db_column="org_id",
        null=True,
        blank=True,
    )

    event_name = models.TextField()
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "journey_events"

class StoreManager(UnmanagedModel):
    """
    Membership/RBAC do usuário na loja.
    Unmanaged porque a fonte de verdade é o schema do Supabase/Postgres.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    store = models.ForeignKey(
        "Store",
        on_delete=models.DO_NOTHING,
        db_column="store_id",
        related_name="store_managers",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="store_memberships",
    )

    role = models.CharField(
        max_length=20,
        choices=ORG_ROLE,
        default="viewer",
    )

    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "store_managers"
        managed = False
