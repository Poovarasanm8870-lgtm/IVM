from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Sale
from .serializers import SaleSerializer


class SaleViewSet(viewsets.ModelViewSet):
    queryset = (
        Sale.objects.prefetch_related('items__product')
        .select_related('customer')
        .all()
    )
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['reference_number', 'customer__name']
    filterset_fields = ['status', 'customer']
    ordering_fields = ['sale_date', 'total_amount', 'created_at']
