from django.db import models
from products.models import Product
from accounts.models import CustomUser


class StockMovement(models.Model):
    MOVEMENT_TYPE = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
    ]
    REASON_CHOICES = [
        ('purchase', 'Purchase Receiving'),
        ('adjustment', 'Manual Audit / Count'),
        ('damage', 'Damaged / Defective'),
        ('expired', 'Expired Batch Disposal'),
        ('return', 'Return to Supplier'),
    ]
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='stock_movements'
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='adjustment')
    quantity = models.IntegerField()
    previous_stock = models.PositiveIntegerField()
    new_stock = models.PositiveIntegerField()
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} - {self.movement_type} ({self.quantity})"
