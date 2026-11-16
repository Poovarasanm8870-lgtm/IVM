import re
from rest_framework import serializers
from django.db import IntegrityError
from .models import Product, get_next_sku, get_next_invoice_number, sync_sequence_tracker
from categories.serializers import CategorySerializer
from suppliers.serializers import SupplierSerializer


class ProductSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(required=False, allow_blank=True)
    invoice_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(default=True, required=False)
    category_detail = CategorySerializer(source='category', read_only=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)
    stock_status = serializers.ReadOnlyField()
    stock_value = serializers.ReadOnlyField()
    expiry_status = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'description',
            'category', 'category_detail',
            'supplier', 'supplier_detail',
            'invoice_number', 'manufacture_date', 'expiry_date',
            'purchase_price', 'selling_price',
            'stock_quantity', 'minimum_stock',
            'image', 'qr_code',
            'stock_status', 'stock_value', 'expiry_status',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'qr_code', 'created_at', 'updated_at']

    def validate_sku(self, value):
        if value:
            val = value.strip()
            qs = Product.objects.filter(sku__iexact=val)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(f"A product with SKU '{val}' already exists.")
            return val
        return value

    def validate_invoice_number(self, value):
        if value:
            val = value.strip()
            qs = Product.objects.filter(invoice_number__iexact=val)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(f"An invoice with number '{val}' already exists.")
            return val
        return value

    def validate(self, attrs):
        from datetime import date, timedelta
        today = date.today()

        mfg = attrs.get('manufacture_date')
        if mfg is None and self.instance:
            mfg = self.instance.manufacture_date

        if mfg and mfg > today:
            raise serializers.ValidationError({
                'manufacture_date': 'Manufacture date cannot be in the future (today or earlier only).'
            })

        exp = attrs.get('expiry_date')
        if exp is None and self.instance:
            exp = self.instance.expiry_date

        if exp:
            min_exp = today + timedelta(days=4)
            if exp < min_exp:
                raise serializers.ValidationError({
                    'expiry_date': f'Expiry date must be at least 4 days in the future (cannot expire within 1 to 3 days, minimum date is {min_exp.isoformat()}).'
                })
            if mfg and exp <= mfg:
                raise serializers.ValidationError({
                    'expiry_date': 'Expiry date must be strictly after the manufacture date.'
                })

        return attrs

    def create(self, validated_data):
        from datetime import date
        year = date.today().year

        sku = (validated_data.get('sku') or '').strip()
        if not sku:
            validated_data['sku'] = get_next_sku()
        else:
            m = re.search(r'\d+', sku)
            if m:
                try:
                    sync_sequence_tracker('product_sku', int(m.group()))
                except ValueError:
                    pass

        invoice = (validated_data.get('invoice_number') or '').strip()
        if not invoice:
            validated_data['invoice_number'] = get_next_invoice_number(year)
        else:
            m_inv = re.search(r'\d+$', invoice)
            if m_inv:
                try:
                    sync_sequence_tracker(f'invoice_{year}', int(m_inv.group()))
                except ValueError:
                    pass

        if 'is_active' not in validated_data or validated_data['is_active'] is None:
            validated_data['is_active'] = True

        try:
            product = super().create(validated_data)
        except IntegrityError as exc:
            msg = str(exc).lower()
            if 'sku' in msg:
                raise serializers.ValidationError({'sku': 'A product with this SKU already exists.'})
            elif 'invoice' in msg:
                raise serializers.ValidationError({'invoice_number': 'A product with this invoice number already exists.'})
            raise serializers.ValidationError({'non_field_errors': ['Database constraint error: duplicate entry.']})

        # Auto-generate Purchase & PurchaseItem if created with initial stock
        if product.stock_quantity > 0:
            try:
                from datetime import date
                from purchases.models import Purchase, PurchaseItem
                from suppliers.models import Supplier
                from inventory.models import StockMovement

                supplier = product.supplier or Supplier.objects.first()
                po_ref = f"PO-{product.invoice_number or product.sku}"
                base_ref = po_ref
                c = 1
                while Purchase.objects.filter(reference_number=po_ref).exists():
                    po_ref = f"{base_ref}-{c}"
                    c += 1

                pur = Purchase.objects.create(
                    supplier=supplier,
                    reference_number=po_ref,
                    status='completed',
                    total_amount=product.stock_quantity * product.purchase_price,
                    purchase_date=date.today(),
                    notes=f"Initial stock acquisition for {product.name} ({product.sku})"
                )
                PurchaseItem.objects.create(
                    purchase=pur,
                    product=product,
                    quantity=product.stock_quantity,
                    unit_price=product.purchase_price,
                    total_price=product.stock_quantity * product.purchase_price
                )
                StockMovement.objects.create(
                    product=product,
                    movement_type='in',
                    quantity=product.stock_quantity,
                    previous_stock=0,
                    new_stock=product.stock_quantity,
                    reason='purchase',
                    notes=f"Initial stock procurement via {po_ref}"
                )
            except Exception as e:
                print(f"Error auto-recording purchase for product {product.sku}: {e}")

        return product
