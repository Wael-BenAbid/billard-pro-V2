# ============================================
# Dockerfile for Billarde Application
# All-in-one container: Frontend + Backend + SQLite
# ============================================

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    nginx \
    supervisor \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
RUN pip install gunicorn

# Copy backend code
COPY backend/ /app/backend/

# Copy frontend code
COPY frontend/ /app/frontend/

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Create nginx configuration
RUN mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# Nginx config
RUN echo 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
\n\
    # Frontend\n\
    location / {\n\
        root /app/frontend/dist;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Backend API\n\
    location /api/ {\n\
        proxy_pass http://127.0.0.1:8000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
}' > /etc/nginx/sites-available/billarde

RUN ln -sf /etc/nginx/sites-available/billarde /etc/nginx/sites-enabled/billarde
RUN rm -f /etc/nginx/sites-enabled/default

# Create log directory
RUN mkdir -p /var/log/supervisor

# Supervisor config to manage all processes
RUN echo '[supervisord]\n\
nodaemon=true\n\
user=root\n\
logfile=/var/log/supervisor/supervisord.log\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[program:django]\n\
command=/bin/bash -c "cd /app/backend && python manage.py migrate && python manage.py create_admin && gunicorn config.wsgi:application --bind 0.0.0.0:8000"\n\
directory=/app/backend\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/var/log/django.log\n\
stderr_logfile=/var/log/django_error.log\n\
\n\
[program:nginx]\n\
command=/usr/sbin/nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/var/log/nginx.log\n\
stderr_logfile=/var/log/nginx_error.log\n\
' > /etc/supervisor/conf.d/billarde.conf

# Create Django environment file with SQLite
RUN echo "DJANGO_SECRET_KEY=docker-secret-key-change-in-production\n\
DEBUG=False\n\
ALLOWED_HOSTS=localhost,127.0.0.1\n\
DATABASE_URL=sqlite:///db.sqlite3\n\
" > /app/backend/.env

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Create log directory\n\
mkdir -p /var/log/supervisor\n\
\n\
# Start supervisor\n\
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf\n\
' > /app/start.sh

RUN chmod +x /app/start.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/ || exit 1

# Start command
CMD ["/app/start.sh"]
