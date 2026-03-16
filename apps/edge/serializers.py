from rest_framework import serializers


class EdgeEventSerializer(serializers.Serializer):
    event_name = serializers.CharField()
    ts = serializers.CharField(required=False)
    source = serializers.CharField(required=False)
    data = serializers.DictField(required=False)
    meta = serializers.DictField(required=False)
    receipt_id = serializers.CharField(required=False, allow_blank=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True)

    event_version = serializers.IntegerField(required=False)
    event_id = serializers.CharField(required=False, allow_null=True)
    org_id = serializers.CharField(required=False, allow_null=True)


class EdgeUpdateReportSerializer(serializers.Serializer):
    store_id = serializers.UUIDField(required=False)
    agent_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    from_version = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    to_version = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    channel = serializers.ChoiceField(choices=["stable", "canary"], required=False)
    status = serializers.ChoiceField(choices=["started", "downloaded", "verified", "activated", "healthy", "rolled_back", "failed"])
    phase = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    event = serializers.CharField()
    attempt = serializers.IntegerField(required=False, min_value=1)
    elapsed_ms = serializers.IntegerField(required=False, min_value=0, allow_null=True)
    reason_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reason_detail = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    meta = serializers.DictField(required=False)
    timestamp = serializers.DateTimeField(required=False)
