from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .services import gemini_service


class AnalysisViewSet(viewsets.ViewSet):
    """ViewSet for project analysis using Gemini AI."""
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """
        Analyze a project repository.
        
        Request body:
        {
            "repo_url": "https://github.com/user/repo"
        }
        """
        repo_url = request.data.get('repo_url')
        
        if not repo_url:
            return Response(
                {'error': 'URL du repository requise'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = gemini_service.analyze_project(repo_url)
        
        if 'error' in result:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(result)

    @action(detail=False, methods=['post'])
    def recommendations(self, request):
        """
        Get recommendations for a project.
        
        Request body:
        {
            "project_data": {...}
        }
        """
        project_data = request.data.get('project_data')
        
        if not project_data:
            return Response(
                {'error': 'Données du projet requises'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        recommendations = gemini_service.get_recommendations(project_data)
        return Response({'recommendations': recommendations})
