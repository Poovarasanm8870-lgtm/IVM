from rest_framework import serializers
from django.db import transaction
from django.db.models import F
from .models import Purchase, PurchaseItem
from products.models import Product
from suppliers.serializers import SupplierSerializer
from inventory.models import StockMovement


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'total_price',
        ]
        read_only_fields = ['total_price']


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'supplier', 'supplier_detail', 'reference_number', 'status',
            'total_amount', 'notes', 'purchase_date', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_amount', 'created_at', 'updated_at']

    def validate(self, attrs):
        items = attrs.get('items', [])
        for item in items:
            product = item.get('product')
            if product and not product.is_active:
                raise serializers.ValidationError({
                    'items': f"Product '{product.name}' ({product.sku}) is inactive and cannot be included in new purchases."
                })
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        with transaction.atomic():
            purchase = Purchase.objects.create(**validated_data)
            total = 0
            for item_data in items_data:
                item_data['total_price'] = item_data['quantity'] * item_data['unit_price']
                item = PurchaseItem.objects.create(purchase=purchase, **item_data)
                total += item.total_price

                # Fetch fresh stock and update
                product = Product.objects.select_for_update().get(pk=item.product.pk)
                prev_stock = product.stock_quantity
                new_stock = prev_stock + item_data['quantity']
                product.stock_quantity = new_stock
                product.save(update_fields=['stock_quantity'])

                # Log stock movement
                StockMovement.objects.create(
                    product=product,
                    movement_type='in',
                    reason='purchase',
                    quantity=item_data['quantity'],
                    previous_stock=prev_stock,
                    new_stock=new_stock,
                    notes=f"Purchase PO-{purchase.reference_number}"
                )

            purchase.total_amount = total
            purchase.save(update_fields=['total_amount'])
        return purchase

    def update(self, instance, validated_data):
        validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
