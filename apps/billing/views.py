from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


class BillingPlansView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "plans": [
                    {
                        "id": "starter",
                        "name": "Starter",
                        "monthly": 279.9,
                        "stores": 1,
                    },
                    {
                        "id": "pro",
                        "name": "Profissional",
                        "monthly": 747,
                        "stores": 3,
                        "popular": True,
                    },
                    {
                        "id": "redes",
                        "name": "Redes",
                        "monthly": 1995,
                        "stores": 10,
                    },
                ]
            }
        )
