"""
Management command to set up initial data for the billiards app.
"""
from django.core.management.base import BaseCommand
from apps.counter.models import (
    AppSettings, BilliardTable, PS4Game, PS4TimeOption, InventoryItem
)


class Command(BaseCommand):
    help = 'Set up initial data for the billiards application'

    def handle(self, *args, **options):
        # Create settings
        settings, created = AppSettings.objects.get_or_create(
            pk=1,
            defaults={
                'club_name': 'B-CLUB',
                'theme_color': '#eab308',
                'table_a_color': '#10b981',
                'table_b_color': '#3b82f6',
                'rate_base': 150,
                'rate_reduced': 135,
                'threshold_mins': 15,
                'floor_min': 1000,
                'floor_mid': 1500,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created app settings'))
        else:
            self.stdout.write('App settings already exist')

        # Create billiard tables
        table_a, created = BilliardTable.objects.get_or_create(
            table_id='A',
            defaults={
                'name': 'Table A',
                'color': '#10b981',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created Table A'))
        else:
            self.stdout.write('Table A already exists')

        table_b, created = BilliardTable.objects.get_or_create(
            table_id='B',
            defaults={
                'name': 'Table B',
                'color': '#3b82f6',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created Table B'))
        else:
            self.stdout.write('Table B already exists')

        # Create PS4 games
        fifa, created = PS4Game.objects.get_or_create(
            name='FC 24',
            defaults={
                'icon': '⚽',
                'player_options': [1, 2, 3, 4],
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created FC 24'))
            # Create time options for FC 24 with player-specific pricing
            # 8 min duration
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=8, players=1,
                defaults={'label': '8 min', 'price': 1500}
            )
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=8, players=2,
                defaults={'label': '8 min', 'price': 2000}
            )
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=8, players=3,
                defaults={'label': '8 min', 'price': 2500}
            )
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=8, players=4,
                defaults={'label': '8 min', 'price': 3000}
            )
            # 10 min duration
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=10, players=1,
                defaults={'label': '10 min', 'price': 2000}
            )
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=10, players=2,
                defaults={'label': '10 min', 'price': 2500}
            )
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=10, players=3,
                defaults={'label': '10 min', 'price': 3000}
            )
            PS4TimeOption.objects.get_or_create(
                game=fifa, minutes=10, players=4,
                defaults={'label': '10 min', 'price': 3500}
            )

        pes, created = PS4Game.objects.get_or_create(
            name='PES 2024',
            defaults={
                'icon': '🎮',
                'player_options': [1, 2],
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created PES 2024'))
            # 8 min duration
            PS4TimeOption.objects.get_or_create(
                game=pes, minutes=8, players=1,
                defaults={'label': '8 min', 'price': 1500}
            )
            PS4TimeOption.objects.get_or_create(
                game=pes, minutes=8, players=2,
                defaults={'label': '8 min', 'price': 2000}
            )
            # 10 min duration
            PS4TimeOption.objects.get_or_create(
                game=pes, minutes=10, players=1,
                defaults={'label': '10 min', 'price': 2000}
            )
            PS4TimeOption.objects.get_or_create(
                game=pes, minutes=10, players=2,
                defaults={'label': '10 min', 'price': 2500}
            )

        # Create inventory items
        items_data = [
            ('Café', '☕', 500),
            ('Thé', '🍵', 500),
            ('Eau', '💧', 300),
            ('Jus d\'orange', '🍊', 800),
            ('Soda', '🥤', 700),
            ('Chips', '🍟', 1000),
        ]
        
        for name, icon, price in items_data:
            item, created = InventoryItem.objects.get_or_create(
                name=name,
                defaults={
                    'icon': icon,
                    'price': price,
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created inventory item: {name}'))

        self.stdout.write(self.style.SUCCESS('\nInitial data setup complete!'))
