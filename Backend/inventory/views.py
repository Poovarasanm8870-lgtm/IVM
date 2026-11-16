from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import StockMovement
from .serializers import StockMovementSerializer
from products.models import Product
from products.serializers import ProductSerializer


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('product', 'created_by').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['product', 'movement_type', 'reason']
    search_fields = ['product__name', 'product__sku', 'notes']
    ordering_fields = ['created_at']
    # No update/delete – stock movements are an immutable audit trail
    http_method_names = ['get', 'post', 'head', 'options']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def low_stock_products(self, request):
        """Active products at or below minimum stock (but not zero)."""
        products = Product.objects.filter(
            stock_quantity__lte=F('minimum_stock'),
            stock_quantity__gt=0,
            is_active=True,
        )
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def out_of_stock_products(self, request):
        """Active products with zero stock."""
        products = Product.objects.filter(stock_quantity=0, is_active=True)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
