from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class AppSettings(models.Model):
    """Model for application settings."""
    club_name = models.CharField(max_length=100, default='B-CLUB')
    logo_url = models.URLField(blank=True, default='')
    theme_color = models.CharField(max_length=7, default='#eab308')
    table_a_color = models.CharField(max_length=7, default='#10b981')
    table_b_color = models.CharField(max_length=7, default='#3b82f6')
    rate_base = models.IntegerField(default=150)
    rate_reduced = models.IntegerField(default=135)
    threshold_mins = models.IntegerField(default=15)
    floor_min = models.IntegerField(default=1000)
    floor_mid = models.IntegerField(default=1500)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Paramètres'
        verbose_name_plural = 'Paramètres'

    def __str__(self):
        return self.club_name

    @classmethod
    def get_settings(cls):
        """Get or create settings singleton."""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class BilliardTable(models.Model):
    """Model for billiard tables."""
    TABLE_CHOICES = [('A', 'Table A'), ('B', 'Table B')]
    
    table_id = models.CharField(max_length=1, choices=TABLE_CHOICES, unique=True)
    name = models.CharField(max_length=50, default='Table')
    color = models.CharField(max_length=7, default='#10b981')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Table de billard'
        verbose_name_plural = 'Tables de billard'

    def __str__(self):
        return f"{self.name} ({self.table_id})"


class BilliardSession(models.Model):
    """Model for storing billiard game sessions."""
    TABLE_CHOICES = [('A', 'Table A'), ('B', 'Table B')]
    
    table = models.ForeignKey(BilliardTable, on_delete=models.SET_NULL, null=True, blank=True)
    table_identifier = models.CharField(max_length=1, choices=TABLE_CHOICES, default='A')
    client_name = models.CharField(max_length=100, default='Anonyme')
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    price = models.IntegerField(default=0)  # Price in millimes
    is_paid = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-start_time']
        verbose_name = 'Session billard'
        verbose_name_plural = 'Sessions billard'

    def __str__(self):
        return f"{self.table_identifier} - {self.client_name} - {self.start_time}"

    def _calculate_price_from_duration(self, duration_seconds):
        """Helper method to calculate price from duration in seconds.
        
        Pricing rules:
        - 0 to 15 min: 150 mil/min
        - After 15 min: 135 mil/min (for additional minutes)
        
        Floor conditions:
        - If price < 1000 mil → price = 1000 mil
        - If 1000 < price < 1500 mil → price = 1500 mil
        - If price >= 1500 mil → calculated price
        
        Args:
            duration_seconds: Duration in seconds (int)
            
        Returns:
            price: Price in millimes (int)
        """
        settings = AppSettings.get_settings()
        minutes = duration_seconds / 60
        
        # Calculate price based on duration
        if minutes <= settings.threshold_mins:
            # First period: rate_base per minute
            price = int(minutes * settings.rate_base)
        else:
            # First period at rate_base + remaining at rate_reduced
            price = int(settings.threshold_mins * settings.rate_base)
            remaining_minutes = minutes - settings.threshold_mins
            price += int(remaining_minutes * settings.rate_reduced)
        
        # Apply floor conditions
        if price < settings.floor_min:
            price = settings.floor_min
        elif price < settings.floor_mid:
            price = settings.floor_mid
        
        return price

    def calculate_price(self):
        """Calculate price based on session duration and update self.price.
        
        Used when session is completed (has end_time).
        Updates both self.duration_seconds and self.price.
        """
        if not self.end_time:
            return 0
        
        duration = (self.end_time - self.start_time).total_seconds()
        self.duration_seconds = int(duration)
        self.price = self._calculate_price_from_duration(int(duration))
        return self.price

    def calculate_current_price(self):
        """Calculate current price for active session.
        
        Used for real-time price display without modifying model state.
        Returns price without saving.
        """
        end_time = self.end_time if self.end_time else timezone.now()
        duration = (end_time - self.start_time).total_seconds()
        return self._calculate_price_from_duration(int(duration))

    def stop_session(self):
        """Stop the session and calculate price."""
        self.end_time = timezone.now()
        self.is_active = False
        self.calculate_price()
        self.save()

    def get_formatted_duration(self):
        """Return formatted duration string."""
        if self.is_active:
            # Calculate current duration for active sessions
            end = timezone.now()
        elif self.end_time:
            end = self.end_time
        else:
            # No end time and not active - shouldn't happen but handle gracefully
            return "00:00:00"
        
        start = self.start_time
        diff = int((end - start).total_seconds())
        
        h = diff // 3600
        m = (diff % 3600) // 60
        s = diff % 60
        
        return f"{h:02d}:{m:02d}:{s:02d}"

    def get_formatted_price(self):
        """Return formatted price in DT."""
        # For active sessions, calculate current price
        if self.is_active:
            current_price = self.calculate_current_price()
            return f"{current_price / 1000:.3f} DT"
        return f"{self.price / 1000:.3f} DT"

    @property
    def formatted_duration(self):
        return self.get_formatted_duration()

    @property
    def formatted_price(self):
        return self.get_formatted_price()
    
    @property
    def current_price(self):
        """Return current price for active sessions."""
        if self.is_active:
            return self.calculate_current_price()
        return self.price


class PS4Game(models.Model):
    """Model for PS4 games."""
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🎮')
    player_options = models.JSONField(default=list)  # [1, 2, 3, 4]
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Jeu PS4'
        verbose_name_plural = 'Jeux PS4'

    def __str__(self):
        return self.name


class PS4TimeOption(models.Model):
    """Model for PS4 time options with player-specific pricing."""
    game = models.ForeignKey(PS4Game, on_delete=models.CASCADE, related_name='time_options')
    label = models.CharField(max_length=20)
    minutes = models.IntegerField()
    players = models.IntegerField(default=1)  # Number of players (1-4)
    price = models.IntegerField()  # Price in millimes

    class Meta:
        verbose_name = 'Option de temps PS4'
        verbose_name_plural = 'Options de temps PS4'
        ordering = ['minutes', 'players']

    def __str__(self):
        return f"{self.game.name} - {self.label} - {self.players}P"

    def get_formatted_price(self):
        """Return formatted price in DT."""
        return f"{self.price / 1000:.3f} DT"


class PS4Session(models.Model):
    """Model for PS4 sessions."""
    game = models.ForeignKey(PS4Game, on_delete=models.SET_NULL, null=True)
    game_name = models.CharField(max_length=100)
    players = models.IntegerField(default=1)
    duration_minutes = models.IntegerField()
    price = models.IntegerField()  # Price in millimes
    date = models.DateField(auto_now_add=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_paid = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Session PS4'
        verbose_name_plural = 'Sessions PS4'

    def __str__(self):
        return f"{self.game_name} - {self.players}j - {self.date}"

    def get_formatted_price(self):
        """Return formatted price in DT."""
        return f"{self.price / 1000:.3f} DT"


class InventoryItem(models.Model):
    """Model for bar inventory items."""
    name = models.CharField(max_length=100)
    price = models.IntegerField()  # Price in millimes
    icon = models.CharField(max_length=10, default='🍹')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Article inventaire'
        verbose_name_plural = 'Articles inventaire'

    def __str__(self):
        return f"{self.icon} {self.name}"

    def get_formatted_price(self):
        """Return formatted price in DT."""
        return f"{self.price / 1000:.3f} DT"


class BarOrder(models.Model):
    """Model for bar orders."""
    client_name = models.CharField(max_length=100, default='Anonyme')
    items = models.JSONField(default=list)  # List of {item_id, name, price, quantity}
    total_price = models.IntegerField(default=0)
    date = models.DateField(auto_now_add=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_paid = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Commande bar'
        verbose_name_plural = 'Commandes bar'

    def __str__(self):
        return f"{self.client_name} - {self.total_price} mil - {self.date}"

    def calculate_total(self):
        """Calculate total price from items."""
        total = sum(item.get('price', 0) * item.get('quantity', 1) for item in self.items)
        self.total_price = total
        return total

    def get_formatted_price(self):
        """Return formatted price in DT."""
        return f"{self.total_price / 1000:.3f} DT"

    @property
    def formatted_price(self):
        return self.get_formatted_price()


class Client(models.Model):
    """Model for registered clients."""
    name = models.CharField(max_length=100, unique=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    """Model for user roles and permissions."""
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('user', 'Utilisateur'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    
    # Permissions
    can_manage_billiard = models.BooleanField(default=False)
    can_manage_ps4 = models.BooleanField(default=False)
    can_manage_bar = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)
    can_view_agenda = models.BooleanField(default=False)
    can_manage_clients = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Profil utilisateur'
        verbose_name_plural = 'Profils utilisateurs'

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    def save(self, *args, **kwargs):
        # Auto-set permissions based on role
        if self.role == 'admin':
            self.can_manage_billiard = True
            self.can_manage_ps4 = True
            self.can_manage_bar = True
            self.can_view_analytics = True
            self.can_view_agenda = True
            self.can_manage_clients = True
            self.can_manage_settings = True
            self.can_manage_users = True
        else:  # user
            # Keep individual permissions for users
            pass
        
        super().save(*args, **kwargs)
