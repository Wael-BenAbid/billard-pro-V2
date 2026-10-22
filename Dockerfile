# ============================================
# Dockerfile for Billarde Application
# All-in-one container: Frontend + Backend + SQLite
# ============================================

# ---------- Stage 1: build the frontend ----------
FROM node:22-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
# SQLite database lives in a dedicated directory (mounted as a volume)
ENV DATABASE_URL=sqlite:////app/data/db.sqlite3
ENV SQLITE_PATH=/app/data/db.sqlite3

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt gunicorn

COPY backend/ /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

RUN mkdir -p /app/data /var/log/supervisor

# Nginx config
RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '' \
    '    # Frontend' \
    '    location / {' \
    '        root /app/frontend/dist;' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '' \
    '    # Backend API' \
    '    location /api/ {' \
    '        proxy_pass http://127.0.0.1:8000;' \
    '        proxy_set_header Host $host;' \
    '        proxy_set_header X-Real-IP $remote_addr;' \
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
    '        proxy_set_header X-Forwarded-Proto $scheme;' \
    '    }' \
    '}' > /etc/nginx/sites-available/billarde \
    && ln -sf /etc/nginx/sites-available/billarde /etc/nginx/sites-enabled/billarde \
    && rm -f /etc/nginx/sites-enabled/default

# Supervisor config to manage all processes
RUN printf '%s\n' \
    '[supervisord]' \
    'nodaemon=true' \
    'user=root' \
    'logfile=/var/log/supervisor/supervisord.log' \
    'pidfile=/var/run/supervisord.pid' \
    '' \
    '[program:django]' \
    'command=/bin/bash -c "python manage.py migrate --noinput && python manage.py create_admin && exec gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3"' \
    'directory=/app/backend' \
    'autostart=true' \
    'autorestart=true' \
    'stdout_logfile=/dev/stdout' \
    'stdout_logfile_maxbytes=0' \
    'stderr_logfile=/dev/stderr' \
    'stderr_logfile_maxbytes=0' \
    '' \
    '[program:nginx]' \
    'command=/usr/sbin/nginx -g "daemon off;"' \
    'autostart=true' \
    'autorestart=true' \
    'stdout_logfile=/dev/stdout' \
    'stdout_logfile_maxbytes=0' \
    'stderr_logfile=/dev/stderr' \
    'stderr_logfile_maxbytes=0' \
    > /etc/supervisor/conf.d/billarde.conf

EXPOSE 80

# /api/ requires auth (401) — any non-5xx answer means Django is up
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fs http://localhost/ >/dev/null && \
        curl -s -o /dev/null -w '%{http_code}' http://localhost/api/ | grep -qE '^[234]'

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
