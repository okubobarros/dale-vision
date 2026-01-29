from rest_framework import serializers


class EdgeEventSerializer(serializers.Serializer):
    event_name = serializers.CharField()
    ts = serializers.CharField(required=False)
    source = serializers.CharField(required=False)
    data = serializers.DictField(required=False)
    meta = serializers.DictField(required=False)
    receipt_id = serializers.CharField(required=False, allow_blank=True)

    event_version = serializers.IntegerField(required=False)
    event_id = serializers.CharField(required=False, allow_null=True)
    org_id = serializers.CharField(required=False, allow_null=True)
