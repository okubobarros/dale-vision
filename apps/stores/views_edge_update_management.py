from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import (
    ALLOWED_MANAGE_ROLES,
    ALLOWED_READ_ROLES,
    require_store_role,
)
from apps.core.models import Store
from apps.edge.models import EdgeUpdateEvent, EdgeUpdatePolicy


UPDATE_REASON_PLAYBOOK = {
    "NETWORK_ERROR": "Validar conectividade da loja (internet, DNS e firewall) antes de reexecutar update.",
    "DOWNLOAD_FAILED": "Validar disponibilidade da URL do pacote e permissões de download no agente.",
    "CHECKSUM_MISMATCH": "Pacote inconsistente. Publicar artefato novamente e confirmar hash SHA256.",
    "ACTIVATION_FAILED": "Falha na troca de versão. Revisar permissões de escrita e espaço em disco do host edge.",
    "HEALTH_GATE_TIMEOUT": "Novo build não atingiu health gate no tempo esperado. Verificar boot, heartbeat e câmera health.",
    "ROLLBACK_FAILED": "Rollback não concluído. Ação manual recomendada com runbook e suporte técnico.",
    "UNSUPPORTED_VERSION": "Versão alvo não suportada para o hardware/OS da loja. Ajustar policy para versão compatível.",
}


UPDATE_REASON_RUNBOOK = {
    "NETWORK_ERROR": {
        "title": "Falha de conectividade no update",
        "severity": "alta",
        "summary": "O agente não conseguiu alcançar endpoints necessários para policy/download.",
        "immediate_actions": [
            "Validar internet ativa na loja e estabilidade do link.",
            "Confirmar resolução DNS para domínio de API/CDN.",
            "Liberar portas/regras de firewall para API e download de pacote.",
        ],
        "diagnostic_steps": [
            "Executar diagnose local do Edge Agent.",
            "Checar latência e perda de pacote para host do backend.",
            "Validar relógio do sistema (NTP) para evitar erros de TLS.",
        ],
        "evidence_to_collect": [
            "reason_detail do evento mais recente",
            "logs de rede do host edge",
            "timestamp da tentativa com falha",
        ],
    },
    "DOWNLOAD_FAILED": {
        "title": "Falha no download do pacote",
        "severity": "alta",
        "summary": "A URL de pacote está inacessível ou inválida para o agente.",
        "immediate_actions": [
            "Verificar package.url na policy da loja.",
            "Testar acesso à URL no host edge.",
            "Reemitir pacote e atualizar policy se necessário.",
        ],
        "diagnostic_steps": [
            "Conferir expiração de URL assinada.",
            "Validar tamanho do pacote vs espaço em disco disponível.",
            "Confirmar permissões de leitura no diretório de destino.",
        ],
        "evidence_to_collect": [
            "URL utilizada na tentativa",
            "HTTP status de retorno",
            "trecho de log com erro de download",
        ],
    },
    "CHECKSUM_MISMATCH": {
        "title": "Integridade de pacote inválida",
        "severity": "alta",
        "summary": "O hash SHA256 recebido não confere com o pacote baixado.",
        "immediate_actions": [
            "Republicar artefato de release.",
            "Atualizar SHA256 na policy.",
            "Refazer tentativa após limpeza do pacote local.",
        ],
        "diagnostic_steps": [
            "Comparar hash calculado local vs hash da policy.",
            "Validar pipeline de build/publicação.",
            "Checar eventuais proxies alterando conteúdo.",
        ],
        "evidence_to_collect": [
            "hash esperado e hash calculado",
            "identificador da release",
            "log da etapa de verificação",
        ],
    },
    "ACTIVATION_FAILED": {
        "title": "Falha na ativação da nova versão",
        "severity": "alta",
        "summary": "Pacote foi baixado/verificado, mas a troca para nova versão falhou.",
        "immediate_actions": [
            "Verificar permissões de escrita na pasta de releases.",
            "Confirmar espaço em disco e locks de arquivo.",
            "Executar rollback controlado se necessário.",
        ],
        "diagnostic_steps": [
            "Inspecionar logs de swap/ativação.",
            "Validar antivírus/política local bloqueando execução.",
            "Checar dependências do runtime no host.",
        ],
        "evidence_to_collect": [
            "stacktrace da ativação",
            "estado do diretório current/releases",
            "versão anterior e alvo",
        ],
    },
    "HEALTH_GATE_TIMEOUT": {
        "title": "Timeout no health gate pós-update",
        "severity": "media",
        "summary": "Nova versão não atingiu critérios mínimos de heartbeat/câmeras no tempo definido.",
        "immediate_actions": [
            "Verificar boot do agente após update.",
            "Checar publicação de heartbeat.",
            "Validar leitura mínima de câmeras requeridas na policy.",
        ],
        "diagnostic_steps": [
            "Comparar tempos reais vs limites da policy.",
            "Revisar carga de CPU/memória no host.",
            "Confirmar conectividade com backend logo após boot.",
        ],
        "evidence_to_collect": [
            "timestamps de boot e heartbeat",
            "câmeras saudáveis detectadas",
            "configuração health_gate ativa",
        ],
    },
    "ROLLBACK_FAILED": {
        "title": "Falha no rollback automático",
        "severity": "critica",
        "summary": "Sistema não conseguiu retornar para versão estável após falha.",
        "immediate_actions": [
            "Acionar suporte técnico imediatamente.",
            "Executar rollback manual seguindo runbook operacional.",
            "Congelar novos rollouts para a loja até estabilização.",
        ],
        "diagnostic_steps": [
            "Inspecionar integridade da versão anterior no disco.",
            "Verificar permissões/bloqueios no diretório de release.",
            "Coletar logs completos do ciclo de update/rollback.",
        ],
        "evidence_to_collect": [
            "últimos eventos de update",
            "estado de pastas de versão",
            "logs do processo de rollback",
        ],
    },
    "UNSUPPORTED_VERSION": {
        "title": "Versão não suportada pelo host",
        "severity": "media",
        "summary": "A versão alvo não é compatível com hardware/OS da loja.",
        "immediate_actions": [
            "Ajustar policy para versão suportada.",
            "Mover loja para canal estável até compatibilização.",
            "Planejar janela para atualização de host se necessário.",
        ],
        "diagnostic_steps": [
            "Confirmar SO/arquitetura do equipamento.",
            "Comparar matriz de compatibilidade da release.",
            "Validar versão mínima suportada configurada.",
        ],
        "evidence_to_collect": [
            "fingerprint do host",
            "versão alvo e versão atual",
            "registro de policy aplicada",
        ],
    },
}


def _resolve_playbook_hint(reason_code: str | None) -> str | None:
    if not reason_code:
        return None
    key = str(reason_code).strip().upper()
    return UPDATE_REASON_PLAYBOOK.get(key)


def _build_runbook(reason_code: str | None) -> dict:
    key = str(reason_code or "").strip().upper()
    base = UPDATE_REASON_RUNBOOK.get(key)
    if base:
        return {"reason_code": key, "known_reason": True, **base}
    return {
        "reason_code": key or None,
        "known_reason": False,
        "title": "Diagnóstico geral de falha de update",
        "severity": "media",
        "summary": "Código não mapeado. Executar checklist padrão de estabilização.",
        "immediate_actions": [
            "Coletar reason_code/reason_detail mais recente.",
            "Validar conectividade, policy e disponibilidade do pacote.",
            "Reexecutar update em janela controlada.",
        ],
        "diagnostic_steps": [
            "Executar diagnose local do agente.",
            "Revisar logs de download/verificação/ativação.",
            "Escalar para suporte com evidências coletadas.",
        ],
        "evidence_to_collect": [
            "eventos recentes de update",
            "logs do host edge",
            "versões atual/anterior/alvo",
        ],
    }


def _serialize_policy(policy: EdgeUpdatePolicy | None) -> dict:
    if not policy:
        return {
            "active": False,
            "channel": "stable",
            "target_version": None,
            "current_min_supported": None,
            "rollout_window": {
                "start_local": "02:00",
                "end_local": "05:00",
                "timezone": "America/Sao_Paulo",
            },
            "package": None,
            "health_gate": {
                "max_boot_seconds": 120,
                "require_heartbeat_seconds": 180,
                "require_camera_health_count": 3,
            },
            "rollback_policy": {
                "enabled": True,
                "max_failed_attempts": 1,
            },
            "updated_at": None,
        }

    return {
        "active": bool(policy.active),
        "channel": policy.channel,
        "target_version": policy.target_version,
        "current_min_supported": policy.current_min_supported,
        "rollout_window": {
            "start_local": policy.rollout_start_local,
            "end_local": policy.rollout_end_local,
            "timezone": policy.rollout_timezone,
        },
        "package": {
            "url": policy.package_url,
            "sha256": policy.package_sha256,
            "size_bytes": policy.package_size_bytes,
        },
        "health_gate": {
            "max_boot_seconds": policy.health_max_boot_seconds,
            "require_heartbeat_seconds": policy.health_require_heartbeat_seconds,
            "require_camera_health_count": policy.health_require_camera_health_count,
        },
        "rollback_policy": {
            "enabled": policy.rollback_enabled,
            "max_failed_attempts": policy.rollback_max_failed_attempts,
        },
        "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
    }


class StoreEdgeUpdatePolicyManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        policy = EdgeUpdatePolicy.objects.filter(store_id=store_id, active=True).first()
        return Response(
            {
                "store_id": str(store_id),
                "store_name": store.name,
                "policy": _serialize_policy(policy),
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        require_store_role(request.user, str(store_id), ALLOWED_MANAGE_ROLES)

        payload = request.data or {}
        policy = EdgeUpdatePolicy.objects.filter(store_id=store_id).first()

        target_version = str(payload.get("target_version") or (policy.target_version if policy else "")).strip()
        package = payload.get("package") or {}
        package_url = str(package.get("url") or (policy.package_url if policy else "")).strip()
        package_sha256 = str(package.get("sha256") or (policy.package_sha256 if policy else "")).strip()
        if not target_version or not package_url or not package_sha256:
            return Response(
                {
                    "detail": "target_version, package.url e package.sha256 são obrigatórios."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        rollout_window = payload.get("rollout_window") or {}
        health_gate = payload.get("health_gate") or {}
        rollback_policy = payload.get("rollback_policy") or {}
        channel = str(payload.get("channel") or (policy.channel if policy else "stable")).strip().lower()
        if channel not in {"stable", "canary"}:
            return Response({"detail": "channel inválido."}, status=status.HTTP_400_BAD_REQUEST)

        defaults = {
            "channel": channel,
            "target_version": target_version,
            "current_min_supported": payload.get("current_min_supported", policy.current_min_supported if policy else None),
            "rollout_start_local": rollout_window.get("start_local", policy.rollout_start_local if policy else "02:00"),
            "rollout_end_local": rollout_window.get("end_local", policy.rollout_end_local if policy else "05:00"),
            "rollout_timezone": rollout_window.get("timezone", policy.rollout_timezone if policy else "America/Sao_Paulo"),
            "package_url": package_url,
            "package_sha256": package_sha256,
            "package_size_bytes": package.get("size_bytes", policy.package_size_bytes if policy else None),
            "health_max_boot_seconds": health_gate.get("max_boot_seconds", policy.health_max_boot_seconds if policy else 120),
            "health_require_heartbeat_seconds": health_gate.get(
                "require_heartbeat_seconds",
                policy.health_require_heartbeat_seconds if policy else 180,
            ),
            "health_require_camera_health_count": health_gate.get(
                "require_camera_health_count",
                policy.health_require_camera_health_count if policy else 3,
            ),
            "rollback_enabled": rollback_policy.get("enabled", policy.rollback_enabled if policy else True),
            "rollback_max_failed_attempts": rollback_policy.get(
                "max_failed_attempts",
                policy.rollback_max_failed_attempts if policy else 1,
            ),
            "active": bool(payload.get("active", True)),
            "updated_at": timezone.now(),
        }
        if not policy:
            defaults["created_at"] = timezone.now()

        policy, _created = EdgeUpdatePolicy.objects.update_or_create(store_id=store_id, defaults=defaults)
        return Response(
            {
                "store_id": str(store_id),
                "store_name": store.name,
                "policy": _serialize_policy(policy),
            },
            status=status.HTTP_200_OK,
        )


class StoreEdgeUpdateEventsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        try:
            limit = max(1, min(100, int(request.query_params.get("limit", "20"))))
        except Exception:
            limit = 20

        status_filter = (request.query_params.get("status") or "").strip().lower() or None
        agent_id = (request.query_params.get("agent_id") or "").strip() or None

        qs = EdgeUpdateEvent.objects.filter(store_id=store_id).order_by("-timestamp")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if agent_id:
            qs = qs.filter(agent_id=agent_id)

        items = []
        for row in qs[:limit]:
            items.append(
                {
                    "event_id": str(row.id),
                    "agent_id": row.agent_id,
                    "from_version": row.from_version,
                    "to_version": row.to_version,
                    "channel": row.channel,
                    "status": row.status,
                    "phase": row.phase,
                    "event": row.event,
                    "attempt": row.attempt,
                    "elapsed_ms": row.elapsed_ms,
                    "reason_code": row.reason_code,
                    "reason_detail": row.reason_detail,
                    "playbook_hint": _resolve_playbook_hint(row.reason_code),
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                }
            )

        return Response(
            {
                "store_id": str(store_id),
                "store_name": store.name,
                "filters": {
                    "limit": limit,
                    "status": status_filter,
                    "agent_id": agent_id,
                },
                "items": items,
            },
            status=status.HTTP_200_OK,
        )


class StoreEdgeUpdateRunbookView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        reason_code = (request.query_params.get("reason_code") or "").strip() or None
        if not reason_code:
            latest_failure = (
                EdgeUpdateEvent.objects.filter(store_id=store_id, status__in=["failed", "rolled_back"])
                .order_by("-timestamp")
                .first()
            )
            reason_code = latest_failure.reason_code if latest_failure else None

        runbook = _build_runbook(reason_code)
        return Response(
            {
                "store_id": str(store_id),
                "store_name": store.name,
                "generated_at": timezone.now().isoformat(),
                "runbook": runbook,
            },
            status=status.HTTP_200_OK,
        )


class StoreEdgeUpdateRunbookOpenedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        reason_code = (request.data or {}).get("reason_code")
        source_page = (request.data or {}).get("source_page") or "edge_help"
        user_id = str(getattr(request.user, "id", "") or "")

        row = EdgeUpdateEvent.objects.create(
            store_id=store_id,
            agent_id=None,
            from_version=None,
            to_version=None,
            channel=None,
            status="info",
            phase="support",
            event="runbook_opened",
            attempt=1,
            elapsed_ms=None,
            reason_code=reason_code,
            reason_detail=None,
            meta={
                "source_page": source_page,
                "opened_by_user_id": user_id,
            },
            timestamp=timezone.now(),
            created_at=timezone.now(),
        )

        return Response(
            {
                "ok": True,
                "store_id": str(store_id),
                "event_id": str(row.id),
                "event": row.event,
            },
            status=status.HTTP_201_CREATED,
        )
