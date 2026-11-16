import re
from datetime import date, timedelta
from django.db import models, transaction
from categories.models import Category
from suppliers.models import Supplier


class SequenceTracker(models.Model):
    """
    Tracks the highest issued sequence number for SKUs and Invoices.
    Guarantees monotonic numbering: numbers are never reused even if records are deleted.
    """
    name = models.CharField(max_length=50, unique=True)
    last_number = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products_sequence_tracker'

    def __str__(self):
        return f"{self.name}: {self.last_number}"


def sync_sequence_tracker(name, number):
    """
    Ensures the sequence tracker is at least at `number`.
    """
    if not number or number <= 0:
        return
    with transaction.atomic():
        tracker, _ = SequenceTracker.objects.select_for_update().get_or_create(
            name=name, defaults={'last_number': 0}
        )
        if number > tracker.last_number:
            tracker.last_number = number
            tracker.save(update_fields=['last_number', 'updated_at'])


def get_next_sku():
    """
    Atomically generates the next SKU (e.g. PRD-005) without ever reusing deleted numbers.
    """
    with transaction.atomic():
        tracker, _ = SequenceTracker.objects.select_for_update().get_or_create(
            name='product_sku', defaults={'last_number': 0}
        )
        if tracker.last_number == 0:
            existing_skus = Product.objects.values_list('sku', flat=True)
            max_num = 0
            for s in existing_skus:
                m = re.search(r'\d+', s or '')
                if m:
                    try:
                        max_num = max(max_num, int(m.group()))
                    except ValueError:
                        pass
            tracker.last_number = max_num

        tracker.last_number += 1
        tracker.save(update_fields=['last_number', 'updated_at'])
        return f"PRD-{tracker.last_number:03d}"


def get_next_invoice_number(year=None):
    """
    Atomically generates the next invoice number (e.g. INV-2026-005) without ever reusing deleted numbers.
    """
    if year is None:
        year = date.today().year

    tracker_name = f'invoice_{year}'
    with transaction.atomic():
        tracker, _ = SequenceTracker.objects.select_for_update().get_or_create(
            name=tracker_name, defaults={'last_number': 0}
        )
        if tracker.last_number == 0:
            prefix = f"INV-{year}-"
            existing_invoices = Product.objects.filter(
                invoice_number__startswith=prefix
            ).values_list('invoice_number', flat=True)
            max_num = 0
            for inv in existing_invoices:
                m = re.search(r'\d+$', inv or '')
                if m:
                    try:
                        max_num = max(max_num, int(m.group()))
                    except ValueError:
                        pass
            tracker.last_number = max_num

        tracker.last_number += 1
        tracker.save(update_fields=['last_number', 'updated_at'])
        return f"INV-{year}-{tracker.last_number:03d}"


def peek_next_sku():
    """
    Preview the next SKU without consuming the sequence.
    """
    tracker = SequenceTracker.objects.filter(name='product_sku').first()
    if tracker and tracker.last_number > 0:
        return f"PRD-{(tracker.last_number + 1):03d}"
    existing_skus = Product.objects.values_list('sku', flat=True)
    max_num = 0
    for s in existing_skus:
        m = re.search(r'\d+', s or '')
        if m:
            try:
                max_num = max(max_num, int(m.group()))
            except ValueError:
                pass
    return f"PRD-{(max_num + 1):03d}"


def peek_next_invoice_number(year=None):
    """
    Preview the next invoice number without consuming the sequence.
    """
    if year is None:
        year = date.today().year
    tracker_name = f'invoice_{year}'
    tracker = SequenceTracker.objects.filter(name=tracker_name).first()
    if tracker and tracker.last_number > 0:
        return f"INV-{year}-{(tracker.last_number + 1):03d}"
    prefix = f"INV-{year}-"
    existing_invoices = Product.objects.filter(
        invoice_number__startswith=prefix
    ).values_list('invoice_number', flat=True)
    max_num = 0
    for inv in existing_invoices:
        m = re.search(r'\d+$', inv or '')
        if m:
            try:
                max_num = max(max_num, int(m.group()))
            except ValueError:
                pass
    return f"INV-{year}-{(max_num + 1):03d}"


class Product(models.Model):
    sku = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    invoice_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    manufacture_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_quantity = models.PositiveIntegerField(default=0)
    minimum_stock = models.PositiveIntegerField(default=5)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sku', 'id']

    def __str__(self):
        return f"{self.sku} - {self.name}"

    @property
    def stock_status(self):
        if self.stock_quantity == 0:
            return 'out_of_stock'
        elif self.stock_quantity <= self.minimum_stock:
            return 'low_stock'
        return 'in_stock'

    @property
    def stock_value(self):
        return self.stock_quantity * self.purchase_price

    @property
    def expiry_status(self):
        if not self.expiry_date:
            return 'no_expiry'
        today = date.today()
        if self.expiry_date < today:
            return 'expired'
        elif self.expiry_date <= today + timedelta(days=30):
            return 'expiring_soon'
        return 'valid'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
