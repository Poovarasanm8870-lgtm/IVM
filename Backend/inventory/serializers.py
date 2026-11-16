from rest_framework import serializers
from django.db import transaction
from .models import StockMovement
from products.models import Product


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'movement_type', 'reason', 'quantity',
            'previous_stock', 'new_stock', 'notes',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'previous_stock', 'new_stock', 'created_at']

    def validate(self, attrs):
        product = attrs.get('product')
        if product and not product.is_active:
            raise serializers.ValidationError({
                'product': f"Product '{product.name}' ({product.sku}) is inactive. Stock transactions are disabled for inactive products."
            })
        return attrs

    def create(self, validated_data):
        product = validated_data['product']
        quantity = validated_data['quantity']
        movement_type = validated_data['movement_type']

        with transaction.atomic():
            # Re-fetch with a row lock for safety
            product_obj = Product.objects.select_for_update().get(pk=product.pk)
            prev_stock = product_obj.stock_quantity

            if movement_type == 'in':
                new_stock = prev_stock + quantity
                validated_data['quantity'] = quantity  # keep positive
            elif movement_type == 'out':
                if quantity > prev_stock:
                    raise serializers.ValidationError(
                        f"Insufficient stock. Available: {prev_stock}, Requested: {quantity}"
                    )
                new_stock = prev_stock - quantity
            else:
                # adjustment – quantity represents the *new* absolute stock level
                new_stock = quantity
                validated_data['quantity'] = quantity - prev_stock  # delta stored

            validated_data['previous_stock'] = prev_stock
            validated_data['new_stock'] = new_stock
            Product.objects.filter(pk=product.pk).update(stock_quantity=new_stock)
            movement = StockMovement.objects.create(**validated_data)
        return movement
