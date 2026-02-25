import os
from dataclasses import dataclass
from typing import Optional

import requests
from django.conf import settings


@dataclass(frozen=True)
class StorageConfig:
    url: str
    key: str
    bucket: str


class StorageNotConfigured(RuntimeError):
    pass


class StorageUploadError(RuntimeError):
    pass


class StorageSignError(RuntimeError):
    pass


def get_config() -> Optional[StorageConfig]:
    url = getattr(settings, "SUPABASE_URL", None) or os.getenv("SUPABASE_URL")
    key = (
        getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or getattr(settings, "SUPABASE_KEY", None)
        or os.getenv("SUPABASE_KEY")
    )
    bucket = (
        getattr(settings, "SUPABASE_STORAGE_BUCKET", None)
        or os.getenv("SUPABASE_STORAGE_BUCKET")
        or "camera-snapshots"
    )
    if not url or not key:
        return None
    return StorageConfig(url=url.rstrip("/"), key=key, bucket=bucket)


def require_config() -> StorageConfig:
    config = get_config()
    if not config:
        raise StorageNotConfigured("Storage not configured")
    return config


def upload_file(content: bytes, path: str, content_type: str) -> str:
    config = require_config()
    endpoint = f"{config.url}/storage/v1/object/{config.bucket}/{path}"
    try:
        resp = requests.post(
            endpoint,
            data=content,
            headers={
                "Authorization": f"Bearer {config.key}",
                "apikey": config.key,
                "Content-Type": content_type,
                "x-upsert": "true",
            },
            timeout=20,
        )
    except requests.RequestException as exc:
        raise StorageUploadError("upload_failed") from exc

    if resp.status_code not in (200, 201):
        raise StorageUploadError(f"upload_failed:{resp.status_code}")
    return path


def create_signed_url(path: str, expires_seconds: int = 600) -> str:
    config = require_config()
    endpoint = f"{config.url}/storage/v1/object/sign/{config.bucket}/{path}"
    try:
        resp = requests.post(
            endpoint,
            json={"expiresIn": expires_seconds},
            headers={"Authorization": f"Bearer {config.key}", "apikey": config.key},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise StorageSignError("sign_failed") from exc

    if resp.status_code not in (200, 201):
        raise StorageSignError(f"sign_failed:{resp.status_code}")
    payload = resp.json() if resp.content else {}
    signed_url = payload.get("signedURL") or payload.get("signedUrl") or payload.get("signed_url")
    if not signed_url:
        raise StorageSignError("signed_url_missing")
    if signed_url.startswith("http"):
        return signed_url
    return f"{config.url}/storage/v1{signed_url}"


def get_public_url(path: str) -> str:
    config = require_config()
    return f"{config.url}/storage/v1/object/public/{config.bucket}/{path}"
