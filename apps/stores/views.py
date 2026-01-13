# apps/stores/views.py - VERSÃO MELHORADA (mantendo seu código)
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Store
from .serializers import StoreSerializer

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtra apenas lojas do usuário atual"""
        user = self.request.user
        if user.is_authenticated:
            return Store.objects.filter(owner_email=user.email)
        return Store.objects.none()
    
    def list(self, request):
        """Sobrescreve list para retornar formato personalizado - MANTENHA ESTE!"""
        stores = self.get_queryset()
        serializer = self.get_serializer(stores, many=True)
        return Response({
            'status': 'success',
            'count': stores.count(),
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })
    
    def perform_create(self, serializer):
        """Auto-popula owner_email com email do usuário - ADICIONE ESTE!"""
        serializer.save(owner_email=self.request.user.email)
    
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard específico da loja (como no seu design)"""
        store = self.get_object()
        
        # ⭐ MOCK DATA - depois substituímos por dados reais
        dashboard_data = {
            'store': {
                'id': str(store.id),
                'name': store.name,
                'owner_email': store.owner_email,
                'plan': store.plan,
                'status': 'active' if store.is_active else 'inactive',
            },
            'metrics': {
                'health_score': 92,
                'productivity': 88,
                'idle_time': 12,
                'visitor_flow': 1240,
                'conversion_rate': 77.5,
                'avg_cart_value': 89.90,
            },
            'insights': {
                'peak_hour': '14:00-16:00',
                'best_selling_zone': 'Corredor A',
                'employee_performance': {
                    'best': 'Maria Silva (94% produtiva)',
                    'needs_attention': 'João Santos (67% produtiva)'
                },
            },
            'recommendations': [
                {
                    'id': 'staff_redistribution',
                    'title': 'Redistribuir Equipe',
                    'description': 'Pico de fluxo esperado às 12:00. Mover 2 colaboradores para o setor têxtil.',
                    'priority': 'high',
                    'action': 'redistribute_staff',
                    'estimated_impact': 'Aumento de 15% na conversão',
                },
                {
                    'id': 'inventory_check',
                    'title': 'Verificar Estoque',
                    'description': 'Produtos da linha verão com baixo estoque. Reabastecer até sexta.',
                    'priority': 'medium',
                    'action': 'check_inventory',
                    'estimated_impact': 'Evitar perda de R$ 2.400 em vendas',
                }
            ],
            'alerts': [
                {
                    'type': 'high_idle_time',
                    'message': 'Funcionário João teve 45min de ociosidade hoje',
                    'severity': 'medium',
                    'time': '10:30',
                },
                {
                    'type': 'conversion_opportunity',
                    'message': '5 clientes abandonaram carrinho no setor eletrônicos',
                    'severity': 'high',
                    'time': '11:15',
                }
            ]
        }
        
        return Response(dashboard_data)
    
    @action(detail=True, methods=['get'])
    def live_monitor(self, request, pk=None):
        """Dados para monitoramento em tempo real"""
        store = self.get_object()
        
        # ⭐ MOCK - depois vem do processamento de vídeo
        monitor_data = {
            'store': store.name,
            'timestamp': timezone.now().isoformat(),
            'cameras': [
                {
                    'id': 'cam_001',
                    'name': 'Caixa Principal',
                    'status': 'online',
                    'current_viewers': 0,
                    'events_last_hour': 12,
                    'stream_url': f'/api/cameras/{store.id}/stream/cam_001'
                },
                {
                    'id': 'cam_002',
                    'name': 'Entrada Loja',
                    'status': 'online',
                    'current_viewers': 1,
                    'events_last_hour': 47,
                    'stream_url': f'/api/cameras/{store.id}/stream/cam_002'
                }
            ],
            'current_events': [
                {
                    'type': 'person_detected',
                    'camera': 'Entrada Loja',
                    'confidence': 0.92,
                    'timestamp': timezone.now().isoformat(),
                },
                {
                    'type': 'queue_forming',
                    'camera': 'Caixa Principal',
                    'confidence': 0.78,
                    'timestamp': timezone.now().isoformat(),
                    'details': '3 pessoas na fila'
                }
            ]
        }
        
        return Response(monitor_data)
    
    @action(detail=False, methods=['get'])
    def network_dashboard(self, request):
        """Dashboard para redes com múltiplas lojas (seu segundo design)"""
        stores = self.get_queryset()
        
        network_data = {
            'network': {
                'total_stores': stores.count(),
                'active_stores': stores.filter(is_active=True).count(),
                'total_visitors': 3124,
                'avg_conversion': 75.2,
            },
            'stores': []
        }
        
        for store in stores:
            # MOCK metrics por loja
            store_metrics = {
                'id': str(store.id),
                'name': store.name,
                'location': f'{store.name} - Matriz',  # Placeholder
                'health': 92 - (stores.count() * 2),  # Mock
                'visitor_flow': 1240 - (stores.count() * 100),
                'conversion': 77.5 - (stores.count() * 1.5),
                'status': 'active' if store.is_active else 'inactive',
                'alerts': 2 if store.is_active else 0
            }
            network_data['stores'].append(store_metrics)
        
        return Response(network_data)