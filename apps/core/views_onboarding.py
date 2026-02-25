from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.stores.services.user_orgs import get_user_org_ids
from apps.core.services.onboarding_progress import (
    OnboardingProgressService,
    get_service_for_user_store,
    STEPS_ORDER,
)


class OnboardingProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        if store_id:
            service = get_service_for_user_store(request.user, store_id)
            if not service:
                return Response({"detail": "Sem acesso à store."}, status=status.HTTP_403_FORBIDDEN)
        else:
            org_ids = get_user_org_ids(request.user)
            if not org_ids:
                return Response({"steps": {}, "next_step": None})
            service = OnboardingProgressService(str(org_ids[0]))

        progress = service.get_progress()
        next_step = service.next_step()
        return Response({"steps": progress, "next_step": next_step, "ordered_steps": STEPS_ORDER})


class OnboardingStepCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = request.data or {}
        step = payload.get("step")
        meta = payload.get("meta") or {}
        store_id = payload.get("store_id")
        if not step:
            return Response({"detail": "step obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        if store_id:
            service = get_service_for_user_store(request.user, store_id)
            if not service:
                return Response({"detail": "Sem acesso à store."}, status=status.HTTP_403_FORBIDDEN)
        else:
            org_ids = get_user_org_ids(request.user)
            if not org_ids:
                return Response({"detail": "Usuário sem org."}, status=status.HTTP_400_BAD_REQUEST)
            service = OnboardingProgressService(str(org_ids[0]))

        try:
            result = service.complete_step(step, meta=meta)
        except ValueError:
            return Response({"detail": "step inválido."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)
