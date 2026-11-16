from rest_framework import serializers
from django.db import transaction
from .models import Sale, SaleItem
from products.models import Product
from customers.serializers import CustomerSerializer
from inventory.models import StockMovement


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'total_price',
        ]
        read_only_fields = ['total_price']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    customer_detail = CustomerSerializer(source='customer', read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'customer_detail', 'reference_number', 'status',
            'subtotal', 'discount', 'total_amount', 'notes', 'sale_date',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'subtotal', 'total_amount', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Ensure sufficient stock exists for every item in the sale."""
        for item_data in attrs.get('items', []):
            product = item_data['product']
            requested_qty = item_data['quantity']
            # Fetch current stock directly from DB
            current_prod = Product.objects.get(pk=product.pk)
            if not current_prod.is_active:
                raise serializers.ValidationError(
                    f"Product '{current_prod.name}' ({current_prod.sku}) is inactive and cannot be sold."
                )
            if current_prod.stock_quantity < requested_qty:
                raise serializers.ValidationError(
                    f"Insufficient stock for '{current_prod.name}'. "
                    f"Available: {current_prod.stock_quantity}, Requested: {requested_qty}"
                )
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        discount = validated_data.get('discount', 0)
        with transaction.atomic():
            sale = Sale.objects.create(**validated_data)
            subtotal = 0
            for item_data in items_data:
                item_data['total_price'] = item_data['quantity'] * item_data['unit_price']
                item = SaleItem.objects.create(sale=sale, **item_data)
                subtotal += item.total_price

                # Fetch fresh product with lock
                product = Product.objects.select_for_update().get(pk=item.product.pk)
                if product.stock_quantity < item_data['quantity']:
                    raise serializers.ValidationError(
                        f"Stock changed. Insufficient stock for '{product.name}'."
                    )
                prev_stock = product.stock_quantity
                new_stock = prev_stock - item_data['quantity']
                product.stock_quantity = new_stock
                product.save(update_fields=['stock_quantity'])

                # Log stock movement
                StockMovement.objects.create(
                    product=product,
                    movement_type='out',
                    reason='sale',
                    quantity=item_data['quantity'],
                    previous_stock=prev_stock,
                    new_stock=new_stock,
                    notes=f"Sale SO-{sale.reference_number}"
                )

            sale.subtotal = subtotal
            discount_amount = (subtotal * discount) / 100
            sale.total_amount = subtotal - discount_amount
            sale.save(update_fields=['subtotal', 'total_amount'])
        return sale

    def update(self, instance, validated_data):
        validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
