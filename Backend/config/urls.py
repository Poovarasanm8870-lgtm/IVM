from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponse
from django.views.static import serve


def api_root(request):
    return JsonResponse({
        "status": "online",
        "system": "Inventory Management System API",
        "database": "SQLite (db.sqlite3)",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/auth/",
            "products": "/api/products/",
            "categories": "/api/categories/",
            "suppliers": "/api/suppliers/",
            "customers": "/api/customers/",
            "purchases": "/api/purchases/",
            "sales": "/api/sales/",
            "inventory": "/api/inventory/",
            "reports": "/api/reports/",
        }
    })


def spa_index_or_api(request):
    dist_dir = getattr(settings, 'FRONTEND_DIR', None)
    if dist_dir:
        index_html = dist_dir / 'index.html'
        if index_html.exists():
            with open(index_html, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')
    return api_root(request)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root-dir'),
    path('api/auth/', include('accounts.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/suppliers/', include('suppliers.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/products/', include('products.urls')),
    path('api/purchases/', include('purchases.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/reports/', include('reports.urls')),
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': settings.FRONTEND_DIR / 'assets'}),
    re_path(r'^(?!api/|admin/|static/|media/|assets/).*$', spa_index_or_api, name='spa-frontend'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
