from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    """Model for storing billiard projects."""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    repo_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Projet'
        verbose_name_plural = 'Projets'

    def __str__(self):
        return self.name


class AuditReport(models.Model):
    """Model for storing audit reports."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='reports')
    summary = models.TextField()
    tech_stack = models.JSONField(default=list)
    categories = models.JSONField(default=list)
    suggested_roadmap = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Rapport d\'audit'
        verbose_name_plural = 'Rapports d\'audit'

    def __str__(self):
        return f"Audit - {self.project.name} - {self.created_at.strftime('%Y-%m-%d')}"
