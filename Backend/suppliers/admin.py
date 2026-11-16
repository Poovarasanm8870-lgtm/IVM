from django.contrib import admin
from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_name', 'email', 'phone', 'created_at']
    search_fields = ['name', 'company_name', 'email']
