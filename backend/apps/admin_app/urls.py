from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, AuditReportViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'reports', AuditReportViewSet, basename='audit-report')

urlpatterns = [
    path('', include(router.urls)),
]
