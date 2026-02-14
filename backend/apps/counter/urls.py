from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AppSettingsViewSet, BilliardTableViewSet, BilliardSessionViewSet,
    PS4GameViewSet, PS4TimeOptionViewSet, PS4SessionViewSet, InventoryItemViewSet,
    BarOrderViewSet, StatsViewSet,
    login_view, create_admin_view,
    clients_list, client_history,
    toggle_client_payment, pay_all_client, delete_paid_client,
    daily_revenue, monthly_revenue
)

router = DefaultRouter()
router.register(r'settings', AppSettingsViewSet, basename='settings')
router.register(r'tables', BilliardTableViewSet, basename='billiard-table')
router.register(r'sessions', BilliardSessionViewSet, basename='billiard-session')
router.register(r'ps4-games', PS4GameViewSet, basename='ps4-game')
router.register(r'ps4-time-options', PS4TimeOptionViewSet, basename='ps4-time-option')
router.register(r'ps4-sessions', PS4SessionViewSet, basename='ps4-session')
router.register(r'inventory', InventoryItemViewSet, basename='inventory-item')
router.register(r'bar-orders', BarOrderViewSet, basename='bar-order')
router.register(r'stats', StatsViewSet, basename='stats')

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', login_view, name='login'),
    path('auth/create-admin/', create_admin_view, name='create-admin'),
    
    # Client management endpoints
    path('clients/', clients_list, name='clients-list'),
    path('clients/<str:client_name>/history/', client_history, name='client-history'),
    path('clients/<str:client_name>/toggle-payment/<str:item_type>/<int:item_id>/', toggle_client_payment, name='toggle-client-payment'),
    path('clients/<str:client_name>/pay-all/', pay_all_client, name='pay-all-client'),
    path('clients/<str:client_name>/delete-paid/', delete_paid_client, name='delete-paid-client'),
    
    # Agenda/Calendar endpoints
    path('agenda/daily/<str:date_str>/', daily_revenue, name='daily-revenue'),
    path('agenda/monthly/<int:year>/<int:month>/', monthly_revenue, name='monthly-revenue'),
    
    # API endpoints
    path('', include(router.urls)),
]
