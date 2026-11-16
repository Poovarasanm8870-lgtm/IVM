import re
from django.db import models as django_models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product, peek_next_sku, peek_next_invoice_number
from .serializers import ProductSerializer

MONTHS = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
}


class ProductSearchFilter(SearchFilter):
    """
    Enhanced search filter that searches across:
    - Text: name, sku, invoice_number, description
    - Dates: manufacture_date and expiry_date
    - Date format variations:
        * DD-MM-YYYY or DD/MM/YYYY (e.g. 03-11-2026 -> 2026-11-03)
        * DD Month YYYY (e.g. 03 Nov 2026 -> 2026-11-03)
        * Month DD, YYYY (e.g. Nov 3, 2026 -> 2026-11-03)
        * Month YYYY (e.g. Nov 2026 -> 2026-11)
        * DD-MM or DD/MM (e.g. 03-11 -> -11-03)
        * Standard ISO YYYY-MM-DD or YYYY-MM or YYYY
    """
    def filter_queryset(self, request, queryset, view):
        search_terms = self.get_search_terms(request)
        if not search_terms:
            return queryset

        base_q = django_models.Q()
        for raw_term in search_terms:
            term = raw_term.strip()
            term_q = (
                django_models.Q(name__icontains=term) |
                django_models.Q(sku__icontains=term) |
                django_models.Q(invoice_number__icontains=term) |
                django_models.Q(description__icontains=term) |
                django_models.Q(manufacture_date__icontains=term) |
                django_models.Q(expiry_date__icontains=term)
            )

            date_variants = []

            # 1. DD-MM-YYYY or DD/MM/YYYY
            m = re.match(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$', term)
            if m:
                d, mo, yr = m.groups()
                date_variants.append(f"{yr}-{mo.zfill(2)}-{d.zfill(2)}")

            # 2. DD Month YYYY (e.g. 03 Nov 2026)
            m = re.match(r'^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$', term)
            if m:
                d, mo_name, yr = m.groups()
                mo = MONTHS.get(mo_name.lower())
                if mo:
                    date_variants.append(f"{yr}-{mo}-{d.zfill(2)}")

            # 3. Month DD, YYYY (e.g. Nov 03, 2026 or November 3 2026)
            m = re.match(r'^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$', term)
            if m:
                mo_name, d, yr = m.groups()
                mo = MONTHS.get(mo_name.lower())
                if mo:
                    date_variants.append(f"{yr}-{mo}-{d.zfill(2)}")

            # 4. Month YYYY (e.g. Nov 2026)
            m = re.match(r'^([a-zA-Z]+)\s+(\d{4})$', term)
            if m:
                mo_name, yr = m.groups()
                mo = MONTHS.get(mo_name.lower())
                if mo:
                    date_variants.append(f"{yr}-{mo}")

            # 5. DD-MM or DD/MM
            m = re.match(r'^(\d{1,2})[-/](\d{1,2})$', term)
            if m:
                d, mo = m.groups()
                date_variants.append(f"-{mo.zfill(2)}-{d.zfill(2)}")

            for variant in date_variants:
                term_q |= django_models.Q(manufacture_date__icontains=variant) | django_models.Q(expiry_date__icontains=variant)

            base_q &= term_q

        return queryset.filter(base_q)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'supplier').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, ProductSearchFilter, OrderingFilter]
    filterset_fields = ['category', 'supplier', 'is_active', 'manufacture_date', 'expiry_date']
    search_fields = ['name', 'sku', 'invoice_number', 'description', 'manufacture_date', 'expiry_date']
    ordering_fields = ['sku', 'name', 'selling_price', 'stock_quantity', 'manufacture_date', 'expiry_date', 'created_at']
    ordering = ['sku']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Status / is_active filtering
        status_param = params.get('is_active') or params.get('status')
        if status_param in ['true', 'True', '1', 'active']:
            qs = qs.filter(is_active=True)
        elif status_param in ['false', 'False', '0', 'inactive']:
            qs = qs.filter(is_active=False)

        mfg = params.get('manufacture_date') or params.get('mfg_date')
        if mfg:
            qs = qs.filter(manufacture_date=mfg)

        exp = params.get('expiry_date') or params.get('exp_date')
        if exp:
            qs = qs.filter(expiry_date=exp)

        return qs

    @action(detail=False, methods=['get'])
    def next_identifiers(self, request):
        """
        Returns the next sequential SKU and Invoice numbers based on the highest previously issued number.
        """
        return Response({
            'next_sku': peek_next_sku(),
            'next_invoice': peek_next_invoice_number(),
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggles a product's active status. Inactive products cannot be used in new transactions.
        """
        product = self.get_object()
        product.is_active = not product.is_active
        product.save(update_fields=['is_active'])
        status_label = "Active" if product.is_active else "Inactive"
        return Response({
            'message': f"Product {product.sku} ({product.name}) is now {status_label}.",
            'is_active': product.is_active,
            'data': self.get_serializer(product).data
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()

        # Check for historical transactions
        has_purchases = hasattr(product, 'purchase_items') and product.purchase_items.exists()
        has_sales = hasattr(product, 'sale_items') and product.sale_items.exists()
        has_movements = hasattr(product, 'stock_movements') and product.stock_movements.exists()

        if has_purchases or has_sales or has_movements:
            # Soft-deactivate to protect historical financial and audit data
            product.is_active = False
            product.save(update_fields=['is_active'])
            return Response({
                'message': f"Product {product.sku} has transaction history and cannot be permanently deleted. It has been deactivated to preserve audit records.",
                'is_active': False,
                'soft_deleted': True,
                'deactivated': True
            }, status=status.HTTP_200_OK)

        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Products where stock is at or below the minimum threshold but not zero."""
        products = Product.objects.filter(
            stock_quantity__lte=django_models.F('minimum_stock'),
            stock_quantity__gt=0,
            is_active=True,
        )
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        """Products with zero stock."""
        products = Product.objects.filter(stock_quantity=0, is_active=True)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)
