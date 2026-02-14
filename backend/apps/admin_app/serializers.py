from rest_framework import serializers
from .models import Project, AuditReport


class AuditReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditReport
        fields = ['id', 'summary', 'tech_stack', 'categories', 'suggested_roadmap', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProjectSerializer(serializers.ModelSerializer):
    reports = AuditReportSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'repo_url', 'created_at', 'updated_at', 'owner', 'reports']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']
