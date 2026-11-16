from django.contrib import admin
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['total_price']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'customer', 'sale_date', 'total_amount', 'status']
    list_filter = ['status', 'customer']
    search_fields = ['reference_number']
    inlines = [SaleItemInline]
