from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'supplier', 'stock_quantity', 'selling_price', 'is_active']
    list_filter = ['is_active', 'category', 'supplier']
    search_fields = ['sku', 'name']
