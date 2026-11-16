from django.contrib import admin
from .models import Purchase, PurchaseItem


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    readonly_fields = ['total_price']


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'supplier', 'purchase_date', 'total_amount', 'status']
    list_filter = ['status', 'supplier']
    search_fields = ['reference_number']
    inlines = [PurchaseItemInline]
