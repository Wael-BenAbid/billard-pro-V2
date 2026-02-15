"""
Management command to create initial admin user.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from ...models import UserProfile


class Command(BaseCommand):
    help = 'Create initial admin user if not exists'

    def handle(self, *args, **options):
        username = 'admin'
        password = 'admin$123'
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists.')
            )
        else:
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
            self.stdout.write(
                self.style.SUCCESS(f'Password: {password}')
            )
