import csv
from datetime import timedelta
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Purchase, PurchaseItem
from products.models import Product
from categories.models import Category
from suppliers.models import Supplier
from inventory.models import StockMovement


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        total_products = Product.objects.count()
        total_categories = Category.objects.count()
        total_suppliers = Supplier.objects.count()
        total_purchases_count = Purchase.objects.count()

        stock_aggregates = Product.objects.aggregate(
            total_val=Sum(
                ExpressionWrapper(
                    F('stock_quantity') * F('purchase_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2),
                )
            ),
            total_units=Sum('stock_quantity')
        )
        stock_value = stock_aggregates['total_val'] or 0
        total_stock_units = stock_aggregates['total_units'] or 0

        total_purchase_amount = (
            Purchase.objects.filter(status='completed')
            .aggregate(total=Sum('total_amount'))['total'] or 0
        )

        low_stock = Product.objects.filter(
            stock_quantity__lte=F('minimum_stock'),
            stock_quantity__gt=0,
        ).count()

        out_of_stock = Product.objects.filter(stock_quantity=0).count()

        # Expiry tracking summary
        expired_count = Product.objects.filter(expiry_date__isnull=False, expiry_date__lt=today).count()
        expiring_soon_count = Product.objects.filter(
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=30)
        ).count()
        valid_expiry_count = Product.objects.filter(
            expiry_date__isnull=False,
            expiry_date__gt=today + timedelta(days=30)
        ).count()

        # Top 5 products by total valuation
        top_inventory = (
            Product.objects.annotate(
                total_val=ExpressionWrapper(
                    F('stock_quantity') * F('purchase_price'),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            )
            .values('id', 'name', 'sku', 'invoice_number', 'stock_quantity', 'purchase_price', 'selling_price', 'total_val', 'expiry_date')
            .order_by('-total_val')[:5]
        )

        # Stock distribution by category
        stock_by_category = (
            Product.objects.values('category__name')
            .annotate(
                count=Count('id'),
                stock=Sum('stock_quantity'),
                category_val=Sum(
                    ExpressionWrapper(
                        F('stock_quantity') * F('purchase_price'),
                        output_field=DecimalField(max_digits=12, decimal_places=2),
                    )
                )
            )
            .order_by('-count')
        )

        # Recent Stock Movements
        recent_movements = (
            StockMovement.objects.select_related('product', 'created_by')
            .order_by('-created_at')[:6]
        )
        movements_data = [
            {
                'id': m.id,
                'product_name': m.product.name if m.product else 'Unknown',
                'sku': m.product.sku if m.product else '',
                'movement_type': m.movement_type,
                'quantity': m.quantity,
                'reason': m.get_reason_display() if hasattr(m, 'get_reason_display') else m.reason,
                'created_at': m.created_at.strftime('%d %b, %H:%M'),
            }
            for m in recent_movements
        ]

        # Recent Purchases
        recent_purchases = (
            Purchase.objects.select_related('supplier')
            .order_by('-created_at')[:5]
        )
        purchases_data = [
            {
                'id': p.id,
                'reference_number': p.reference_number,
                'supplier_name': p.supplier.name if p.supplier else 'N/A',
                'total_amount': float(p.total_amount),
                'purchase_date': str(p.purchase_date),
                'status': p.status,
            }
            for p in recent_purchases
        ]

        return Response({
            'stats': {
                'total_products': total_products,
                'total_categories': total_categories,
                'total_suppliers': total_suppliers,
                'total_stock_value': float(stock_value),
                'total_stock_units': int(total_stock_units),
                'total_purchases_count': total_purchases_count,
                'total_purchases_amount': float(total_purchase_amount),
                'low_stock_count': low_stock,
                'out_of_stock_count': out_of_stock,
                'expired_count': expired_count,
                'expiring_soon_count': expiring_soon_count,
                'valid_expiry_count': valid_expiry_count,
            },
            'top_inventory': list(top_inventory),
            'stock_by_category': list(stock_by_category),
            'recent_movements': movements_data,
            'recent_purchases': purchases_data,
        })


class PurchaseReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = Purchase.objects.filter(status='completed').select_related('supplier').prefetch_related('items__product')
        items_queryset = PurchaseItem.objects.filter(
            purchase__status='completed'
        ).select_related('product', 'product__category', 'purchase', 'purchase__supplier').order_by('product__sku', '-purchase__purchase_date')

        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
            items_queryset = items_queryset.filter(purchase__purchase_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(purchase_date__lte=end_date)
            items_queryset = items_queryset.filter(purchase__purchase_date__lte=end_date)

        summary_spent = items_queryset.aggregate(total=Sum('total_price'))['total'] or queryset.aggregate(total=Sum('total_amount'))['total'] or 0
        total_units = items_queryset.aggregate(total=Sum('quantity'))['total'] or 0
        unique_prods_count = items_queryset.values('product_id').distinct().count()
        total_orders = queryset.count()

        if request.query_params.get('export') == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="procurement_inflow_report.csv"'
            writer = csv.writer(response)
            writer.writerow([
                'Product Name', 'SKU', 'Invoice #', 'Category',
                'Supplier', 'PO Reference', 'Purchase Date',
                'Qty Procured', 'Unit Cost (INR)', 'Total Cost (INR)', 'Status'
            ])
            for item in items_queryset:
                writer.writerow([
                    item.product.name if item.product else 'Unknown',
                    item.product.sku if item.product else '—',
                    item.product.invoice_number if item.product and item.product.invoice_number else '—',
                    item.product.category.name if item.product and item.product.category else 'General',
                    item.purchase.supplier.name if item.purchase.supplier else 'N/A',
                    item.purchase.reference_number,
                    item.purchase.purchase_date,
                    item.quantity,
                    item.unit_price,
                    item.total_price,
                    item.purchase.status.upper(),
                ])
            return response

        procured_products = [
            {
                'id': item.id,
                'product_id': item.product.id if item.product else None,
                'name': item.product.name if item.product else 'Unknown Product',
                'sku': item.product.sku if item.product else '—',
                'invoice_number': item.product.invoice_number if item.product and item.product.invoice_number else '—',
                'category_name': item.product.category.name if item.product and item.product.category else 'General',
                'supplier_name': item.purchase.supplier.name if item.purchase.supplier else 'N/A',
                'reference_number': item.purchase.reference_number,
                'purchase_date': str(item.purchase.purchase_date),
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price),
                'status': item.purchase.status,
            }
            for item in items_queryset
        ]

        purchases_list = [
            {
                'id': p.id,
                'reference_number': p.reference_number,
                'supplier_name': p.supplier.name if p.supplier else 'N/A',
                'purchase_date': str(p.purchase_date),
                'items_count': p.items.count(),
                'total_amount': float(p.total_amount),
                'status': p.status,
            }
            for p in queryset[:100]
        ]

        return Response({
            'summary': {
                'total_spent': float(summary_spent),
                'total_orders': total_orders,
                'total_units_procured': int(total_units),
                'unique_products_count': unique_prods_count,
            },
            'procured_products': procured_products,
            'purchases': purchases_list,
        })


class StockReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        products = Product.objects.select_related('category', 'supplier').all()

        total_value = products.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('stock_quantity') * F('purchase_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2),
                )
            )
        )['total'] or 0

        total_units = products.aggregate(total=Sum('stock_quantity'))['total'] or 0
        low_stock = products.filter(stock_quantity__lte=F('minimum_stock'), stock_quantity__gt=0).count()
        out_of_stock = products.filter(stock_quantity=0).count()

        if request.query_params.get('export') == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="stock_report.csv"'
            writer = csv.writer(response)
            writer.writerow(['SKU', 'Invoice #', 'Product Name', 'Category', 'Stock Qty', 'Purchase Price', 'Selling Price', 'Stock Value', 'Mfg Date', 'Expiry Date'])
            for p in products.order_by('sku'):
                writer.writerow([
                    p.sku,
                    p.invoice_number or 'N/A',
                    p.name,
                    p.category.name if p.category else 'N/A',
                    p.stock_quantity,
                    p.purchase_price,
                    p.selling_price,
                    p.stock_quantity * p.purchase_price,
                    p.manufacture_date or 'N/A',
                    p.expiry_date or 'N/A',
                ])
            return response

        category_summary = (
            products.values('category__name')
            .annotate(
                count=Count('id'),
                total_stock=Sum('stock_quantity'),
                total_value=Sum(
                    ExpressionWrapper(
                        F('stock_quantity') * F('purchase_price'),
                        output_field=DecimalField(max_digits=12, decimal_places=2),
                    )
                ),
            )
            .order_by('-total_value')
        )

        products_list = [
            {
                'id': p.id,
                'sku': p.sku,
                'name': p.name,
                'invoice_number': p.invoice_number or 'N/A',
                'category_name': p.category.name if p.category else 'Uncategorized',
                'purchase_price': float(p.purchase_price),
                'selling_price': float(p.selling_price),
                'stock_quantity': p.stock_quantity,
                'stock_value': float(p.stock_quantity * p.purchase_price),
                'manufacture_date': str(p.manufacture_date) if p.manufacture_date else 'N/A',
                'expiry_date': str(p.expiry_date) if p.expiry_date else 'N/A',
                'expiry_status': p.expiry_status,
                'stock_status': p.stock_status,
            }
            for p in products.order_by('sku')
        ]

        return Response({
            'summary': {
                'total_inventory_value': float(total_value),
                'total_units': int(total_units),
                'total_products': products.count(),
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
            },
            'products': products_list,
            'by_category': list(category_summary),
        })
