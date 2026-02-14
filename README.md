# Billard Pro V2

Système de gestion complet pour club de billard avec frontend React et backend Django.

![React](https://img.shields.io/badge/React-19-blue)
![Django](https://img.shields.io/badge/Django-4.2-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-cyan)

## Fonctionnalités

### Gestion des Tables de Billard
- Démarrage/arrêt des sessions avec chronomètre en temps réel
- Calcul automatique du prix basé sur la durée
- Assignation des clients aux tables
- Historique des sessions avec statut de paiement

### Gestion PS4
- Matrice de prix configurable (durée × nombre de joueurs)
- Gestion des jeux disponibles
- Sessions multi-joueurs avec tarification dynamique

### Gestion du Bar
- Catalogue de produits avec prix
- Ajout/modification/suppression des produits
- Suivi des ventes

### Gestion des Clients
- Base de données clients
- Historique des sessions par client
- Statut de paiement (payé/non payé)
- Filtrage et recherche

### Agenda & Rapports
- Vue calendrier des recettes journalières
- Export des rapports en PDF, Word, CSV
- Mise en évidence des paiements en attente (en rouge)
- Statistiques et graphiques

### Administration
- Gestion des paramètres du club
- Configuration des tarifs
- Gestion des utilisateurs

## Architecture

```
billard-pro-V2/
frontend/
src/
pages/           # Pages de l'application
components/      # Composants réutilisables
services/        # Services API
context/         # Context React pour l'état global
types/           # Types TypeScript
backend/
apps/
admin_app/       # Administration et paramètres
counter/         # Gestion des sessions (billard, PS4, bar)
analysis/        # Analyse et rapports
config/          # Configuration Django
```

## Technologies

### Frontend
- **React 19** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **SweetAlert2** - Modales
- **Recharts** - Graphiques
- **jsPDF** - Export PDF
- **docx** - Export Word

### Backend
- **Django 4.2** - Framework backend
- **Django REST Framework** - API REST
- **PostgreSQL** - Base de données
- **CORS Headers** - Cross-origin

## Installation

### Prérequis
- Node.js 18+
- Python 3.10+
- PostgreSQL 15+

### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer la base de données
# Modifier backend/.env avec vos paramètres PostgreSQL

# Migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Démarrer le serveur
python manage.py runserver
```

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install --legacy-peer-deps

# Démarrer en développement
npm run dev

# Build production
npm run build
```

## Configuration

### Base de données (backend/.env)
```env
DB_NAME=Billarde
DB_USER=postgres
DB_PASSWORD=12345
DB_HOST=localhost
DB_PORT=5433
```

### API URL (frontend/.env)
```env
VITE_API_URL=http://localhost:8000
```

## API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/counter/billiard-tables/` | GET | Liste des tables |
| `/api/counter/billiard-sessions/` | GET, POST | Sessions billard |
| `/api/counter/ps4-sessions/` | GET, POST | Sessions PS4 |
| `/api/counter/bar-products/` | GET, POST, DELETE | Produits du bar |
| `/api/counter/clients/` | GET, POST | Gestion clients |
| `/api/analysis/agenda/` | GET | Données agenda |
| `/api/admin_app/settings/` | GET, PUT | Paramètres |

## Captures d'écran

### Page Counter
Interface principale pour la gestion des tables de billard et PS4.

### Page Agenda
Vue calendrier avec export des recettes.

### Page Clients
Gestion de la clientèle avec historique.

## Déploiement

### Docker (recommandé)
```bash
docker-compose up -d
```

### Manuel
1. Build du frontend: `npm run build`
2. Servir avec nginx/apache
3. Configurer gunicorn pour Django

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commit (`git commit -m 'Ajout fonctionnalité'`)
4. Push (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT.

## Auteur

**Wael Ben Abid**
- GitHub: [@Wael-BenAbid](https://github.com/Wael-BenAbid)

---

Développé avec pour la gestion de clubs de billard