import google.generativeai as genai
from django.conf import settings
from typing import Dict, Any, List


class GeminiService:
    """Service for interacting with Google Gemini AI."""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def analyze_project(self, repo_url: str) -> Dict[str, Any]:
        """
        Analyze a billiard project using Gemini AI.
        
        Args:
            repo_url: URL of the repository to analyze
            
        Returns:
            Dictionary containing the analysis results
        """
        prompt = f"""Tu es un expert en audit de code. Analyse ce projet de billard : {repo_url}.
        Évalue le moteur physique et l'UI. Propose 5 améliorations majeures.
        Réponds au format JSON uniquement avec la structure suivante:
        {{
            "summary": "Résumé de l'analyse",
            "techStack": ["technologie1", "technologie2"],
            "categories": [
                {{
                    "title": "Titre de la catégorie",
                    "score": 8.5,
                    "description": "Description de la catégorie",
                    "recommendations": ["recommandation1", "recommandation2"]
                }}
            ],
            "suggestedRoadmap": ["étape1", "étape2", "étape3"]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text
            
            # Try to parse as JSON
            import json
            # Remove markdown code blocks if present
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0]
            elif '```' in text:
                text = text.split('```')[1].split('```')[0]
            
            return json.loads(text.strip())
        except Exception as e:
            return {
                'error': str(e),
                'summary': 'Erreur lors de l\'analyse du projet',
                'techStack': [],
                'categories': [],
                'suggestedRoadmap': []
            }
    
    def get_recommendations(self, project_data: Dict[str, Any]) -> List[str]:
        """
        Get specific recommendations for a project.
        
        Args:
            project_data: Dictionary containing project information
            
        Returns:
            List of recommendations
        """
        prompt = f"""Basé sur les données suivantes d'un projet de billard:
        {project_data}
        
        Donne 3 recommandations spécifiques et actionnables pour améliorer ce projet.
        Réponds uniquement avec une liste JSON de chaînes de caractères.
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text
            
            import json
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0]
            elif '```' in text:
                text = text.split('```')[1].split('```')[0]
            
            return json.loads(text.strip())
        except Exception as e:
            return [f"Erreur lors de la génération des recommandations: {str(e)}"]


# Singleton instance
gemini_service = GeminiService()
