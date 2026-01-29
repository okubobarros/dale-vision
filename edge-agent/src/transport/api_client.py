import time
import requests
from typing import Any, Dict


class ApiClient:
    def __init__(self, base_url: str, token: str, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "X-EDGE-TOKEN": token,
            "Content-Type": "application/json",
        })

    def post_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Endpoint sugerido: POST /api/edge/events/
        """
        url = f"{self.base_url}/api/edge/events/"
        r = self.session.post(url, json=payload, timeout=self.timeout)
        if r.ok:
            try:
                return {"ok": True, "status": r.status_code, "data": r.json()}
            except Exception:
                return {"ok": True, "status": r.status_code, "data": {"text": r.text}}
        return {"ok": False, "status": r.status_code, "error": r.text}

    def flush_outbox(self, queue, batch_size: int = 50) -> Dict[str, Any]:
        """
        Lê eventos do SqliteQueue e tenta postar pro backend.
        Em caso de falha, aplica backoff exponencial simples.
        """
        sent = 0
        failed = 0
        last_error = None

        batch = queue.peek_batch(limit=batch_size)
        for row_id, receipt_id, payload, attempts in batch:
            try:
                res = self.post_event(payload)

                if res.get("ok"):
                    queue.mark_sent(row_id)
                    sent += 1
                else:
                    attempts = int(attempts) + 1
                    backoff = min(300, 2 ** min(attempts, 8))  # 2s,4s,8s... até 300s
                    last_error = str(res.get("error") or res)
                    queue.mark_failed(
                        row_id=row_id,
                        error=last_error,
                        attempts=attempts,
                        backoff_seconds=backoff,
                    )
                    failed += 1

            except Exception as e:
                attempts = int(attempts) + 1
                backoff = min(300, 2 ** min(attempts, 8))
                last_error = str(e)
                queue.mark_failed(
                    row_id=row_id,
                    error=last_error,
                    attempts=attempts,
                    backoff_seconds=backoff,
                )
                failed += 1

        return {"ok": True, "sent": sent, "failed": failed, "last_error": last_error}
