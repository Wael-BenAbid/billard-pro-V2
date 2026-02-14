from rest_framework import serializers
from .models import (
    AppSettings, BilliardTable, BilliardSession,
    PS4Game, PS4TimeOption, PS4Session,
    InventoryItem, BarOrder
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
