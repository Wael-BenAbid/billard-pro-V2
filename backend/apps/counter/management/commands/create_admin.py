"""
Management command to create initial admin user.
"""
import os
import secrets

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from ...models import UserProfile


class Command(BaseCommand):
    help = 'Create initial admin user if not exists (ADMIN_USERNAME / ADMIN_PASSWORD env vars)'

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME') or 'admin'
        password = os.environ.get('ADMIN_PASSWORD')
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists.')
            )
            return

        generated = not password
        if generated:
            password = secrets.token_urlsafe(12)

        user = User.objects.create_superuser(
            username=username,
            password=password,
            email='admin@billarde.local'
        )
        # Create profile with admin role
        UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': 'admin'}
        )
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created admin user: {username}')
        )
        if generated:
            # Shown once, only when no password was configured
            self.stdout.write(
                self.style.WARNING(f'Generated password (change it after first login): {password}')
            )
