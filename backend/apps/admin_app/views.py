from rest_framework import viewsets, permissions
from .models import Project, AuditReport
from .serializers import ProjectSerializer, AuditReportSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for managing projects."""
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Project.objects.all()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class AuditReportViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing audit reports."""
    serializer_class = AuditReportSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return AuditReport.objects.all()
