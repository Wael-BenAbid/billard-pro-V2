from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    AppSettings, BilliardTable, BilliardSession,
    PS4Game, PS4TimeOption, PS4Session,
    InventoryItem, BarOrder, Client, UserProfile
)


class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = [
            'id', 'club_name', 'logo_url', 'theme_color',
            'table_a_color', 'table_b_color', 'rate_base', 'rate_reduced',
            'threshold_mins', 'floor_min', 'floor_mid'
        ]


class BilliardTableSerializer(serializers.ModelSerializer):
    class Meta:
        model = BilliardTable
        fields = ['id', 'table_id', 'name', 'color', 'is_active']


class BilliardSessionSerializer(serializers.ModelSerializer):
    formatted_duration = serializers.ReadOnlyField(source='get_formatted_duration')
    formatted_price = serializers.ReadOnlyField(source='get_formatted_price')
    current_price = serializers.ReadOnlyField()
    
    class Meta:
        model = BilliardSession
        fields = [
            'id', 'table', 'table_identifier', 'client_name', 'start_time',
            'end_time', 'duration_seconds', 'price', 'is_paid',
            'is_active', 'formatted_duration', 'formatted_price', 'current_price'
        ]
        read_only_fields = ['id', 'start_time', 'end_time', 'duration_seconds', 'price']


class StartSessionSerializer(serializers.Serializer):
    table_identifier = serializers.CharField(max_length=1)
    client_name = serializers.CharField(max_length=100, required=False, default='Anonyme')


class StopSessionSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=100, required=False, default='Anonyme')


class PS4TimeOptionSerializer(serializers.ModelSerializer):
    formatted_price = serializers.ReadOnlyField(source='get_formatted_price')
    
    class Meta:
        model = PS4TimeOption
        fields = ['id', 'game', 'label', 'minutes', 'players', 'price', 'formatted_price']


class PS4GameSerializer(serializers.ModelSerializer):
    time_options = PS4TimeOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = PS4Game
        fields = ['id', 'name', 'icon', 'player_options', 'time_options', 'is_active']


class PS4SessionSerializer(serializers.ModelSerializer):
    formatted_price = serializers.ReadOnlyField(source='get_formatted_price')
    
    class Meta:
        model = PS4Session
        fields = [
            'id', 'game', 'game_name', 'players', 'duration_minutes',
            'price', 'date', 'timestamp', 'is_paid', 'formatted_price'
        ]
        read_only_fields = ['id', 'date', 'timestamp']


class CreatePS4SessionSerializer(serializers.Serializer):
    game_id = serializers.IntegerField()
    players = serializers.IntegerField(min_value=1, max_value=4)
    time_option_id = serializers.IntegerField()


class InventoryItemSerializer(serializers.ModelSerializer):
    formatted_price = serializers.ReadOnlyField(source='get_formatted_price')
    
    class Meta:
        model = InventoryItem
        fields = ['id', 'name', 'price', 'icon', 'is_active', 'formatted_price']


class BarOrderSerializer(serializers.ModelSerializer):
    formatted_price = serializers.ReadOnlyField(source='get_formatted_price')
    
    class Meta:
        model = BarOrder
        fields = [
            'id', 'client_name', 'items', 'total_price',
            'date', 'timestamp', 'is_paid', 'formatted_price'
        ]
        read_only_fields = ['id', 'date', 'timestamp', 'total_price']


class CreateBarOrderSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=100, required=False, default='Anonyme')
    items = serializers.ListField(
        child=serializers.DictField()
    )


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'email', 'notes', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'role',
            'can_manage_billiard', 'can_manage_ps4', 'can_manage_bar',
            'can_view_analytics', 'can_view_agenda', 'can_manage_clients',
            'can_manage_settings', 'can_manage_users',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    can_manage_billiard = serializers.SerializerMethodField()
    can_manage_ps4 = serializers.SerializerMethodField()
    can_manage_bar = serializers.SerializerMethodField()
    can_view_analytics = serializers.SerializerMethodField()
    can_view_agenda = serializers.SerializerMethodField()
    can_manage_clients = serializers.SerializerMethodField()
    can_manage_settings = serializers.SerializerMethodField()
    can_manage_users = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'is_staff', 'is_active',
            'role', 'can_manage_billiard', 'can_manage_ps4', 'can_manage_bar',
            'can_view_analytics', 'can_view_agenda', 'can_manage_clients',
            'can_manage_settings', 'can_manage_users'
        ]
        read_only_fields = ['id']
    
    def get_role(self, obj):
        try:
            return obj.profile.role
        except:
            return 'user'
    
    def get_can_manage_billiard(self, obj):
        try:
            return obj.profile.can_manage_billiard
        except:
            return False
    
    def get_can_manage_ps4(self, obj):
        try:
            return obj.profile.can_manage_ps4
        except:
            return False
    
    def get_can_manage_bar(self, obj):
        try:
            return obj.profile.can_manage_bar
        except:
            return False
    
    def get_can_view_analytics(self, obj):
        try:
            return obj.profile.can_view_analytics
        except:
            return False
    
    def get_can_view_agenda(self, obj):
        try:
            return obj.profile.can_view_agenda
        except:
            return False
    
    def get_can_manage_clients(self, obj):
        try:
            return obj.profile.can_manage_clients
        except:
            return False
    
    def get_can_manage_settings(self, obj):
        try:
            return obj.profile.can_manage_settings
        except:
            return False
    
    def get_can_manage_users(self, obj):
        try:
            return obj.profile.can_manage_users
        except:
            return False


class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6)
    email = serializers.EmailField(required=False, default='')
    role = serializers.ChoiceField(choices=['admin', 'user'], default='user')
