from django.urls import path
from .views import DashboardView, PurchaseReportView, StockReportView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('purchases/', PurchaseReportView.as_view(), name='purchase-report'),
    path('stock/', StockReportView.as_view(), name='stock-report'),
]
