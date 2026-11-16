from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Purchase
from .serializers import PurchaseSerializer


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = (
        Purchase.objects.prefetch_related('items__product')
        .select_related('supplier')
        .all()
    )
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['reference_number', 'supplier__name']
    filterset_fields = ['status', 'supplier']
    ordering_fields = ['purchase_date', 'total_amount', 'created_at']
