from django.contrib import admin
from .models import StockMovement


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'reason', 'quantity', 'previous_stock', 'new_stock', 'created_by', 'created_at']
    list_filter = ['movement_type', 'reason']
    search_fields = ['product__name', 'product__sku']
    readonly_fields = ['previous_stock', 'new_stock', 'created_at']
