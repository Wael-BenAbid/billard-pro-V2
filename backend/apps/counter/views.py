from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import (
    AppSettings, BilliardTable, BilliardSession,
    PS4Game, PS4TimeOption, PS4Session,
    InventoryItem, BarOrder, Client, UserProfile
)
from .serializers import (
    AppSettingsSerializer, BilliardTableSerializer, BilliardSessionSerializer,
    StartSessionSerializer, StopSessionSerializer,
    PS4GameSerializer, PS4TimeOptionSerializer, PS4SessionSerializer, CreatePS4SessionSerializer,
    InventoryItemSerializer, BarOrderSerializer, CreateBarOrderSerializer,
    ClientSerializer, UserProfileSerializer, UserSerializer, CreateUserSerializer
)


# ============================================
# CUSTOM PERMISSIONS & MIXINS
# ============================================
class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """Allow read-only access to unauthenticated users, require auth for write."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class HasPermission(permissions.BasePermission):
    """Check if user has specific permission from their profile."""
    permission_map = {
        'billiard': 'can_manage_billiard',
        'ps4': 'can_manage_ps4',
        'bar': 'can_manage_bar',
        'analytics': 'can_view_analytics',
        'agenda': 'can_view_agenda',
        'clients': 'can_manage_clients',
        'settings': 'can_manage_settings',
        'users': 'can_manage_users',
    }
    
    def __init__(self, required_permission=None):
        self.required_permission = required_permission
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        try:
            profile = request.user.profile
            if self.required_permission:
                return getattr(profile, self.required_permission, False)
            return True
        except:
            return request.user.is_staff


class TogglePaidMixin:
    """Mixin to provide unified toggle_payment action for all models with is_paid field."""
    
    @action(detail=True, methods=['post'])
    def toggle_payment(self, request, pk=None):
        """Toggle payment status - unified implementation for all payment-tracked models."""
        obj = self.get_object()
        obj.is_paid = not obj.is_paid
        obj.save()
        return Response(self.get_serializer(obj).data)


# ============================================
# CLIENT MANAGEMENT VIEWS
# ============================================
@api_view(['GET'])
def clients_list(request):
    """Get all unique clients with their statistics."""
    # Get unique client names from billiard sessions
    billiard_clients = BilliardSession.objects.values_list('client_name', flat=True).distinct()
    
    # Get unique client names from bar orders
    bar_clients = BarOrder.objects.values_list('client_name', flat=True).distinct()
    
    # Combine all unique client names
    all_clients = set(list(billiard_clients) + list(bar_clients))
    all_clients.discard('Anonyme')
    all_clients.discard('Anonymous')
    
    clients_data = []
    for client_name in sorted(all_clients):
        # Billiard stats
        billiard_sessions = BilliardSession.objects.filter(client_name=client_name)
        billiard_count = billiard_sessions.count()
        billiard_total = billiard_sessions.aggregate(total=Sum('price'))['total'] or 0
        
        # Unpaid billiard
        unpaid_billiard = billiard_sessions.filter(is_paid=False).aggregate(total=Sum('price'))['total'] or 0
        unpaid_billiard_count = billiard_sessions.filter(is_paid=False).count()
        
        # Bar stats
        bar_orders = BarOrder.objects.filter(client_name=client_name)
        bar_count = bar_orders.count()
        bar_total = bar_orders.aggregate(total=Sum('total_price'))['total'] or 0
        
        # Unpaid bar
        unpaid_bar = bar_orders.filter(is_paid=False).aggregate(total=Sum('total_price'))['total'] or 0
        unpaid_bar_count = bar_orders.filter(is_paid=False).count()
        
        # Total visits
        total_visits = billiard_count + bar_count
        
        # Skip clients with no visits (all data deleted)
        if total_visits == 0:
            continue
        
        # Total unpaid
        total_unpaid = unpaid_billiard + unpaid_bar
        unpaid_count = unpaid_billiard_count + unpaid_bar_count
        
        clients_data.append({
            'name': client_name,
            'billiard_sessions': billiard_count,
            'billiard_total': billiard_total,
            'bar_orders': bar_count,
            'bar_total': bar_total,
            'total_visits': total_visits,
            'total_spent': billiard_total + bar_total,
            'total_unpaid': total_unpaid,
            'unpaid_count': unpaid_count,
            'has_unpaid': unpaid_count > 0,
        })
    
    # Sort by total visits
    clients_data.sort(key=lambda x: x['total_visits'], reverse=True)
    
    return Response(clients_data)


@api_view(['GET'])
def client_history(request, client_name):
    """Get complete history for a specific client."""
    # Billiard sessions
    billiard_sessions = BilliardSession.objects.filter(client_name=client_name).order_by('-start_time')
    billiard_data = []
    for session in billiard_sessions:
        billiard_data.append({
            'id': session.id,
            'type': 'billiard',
            'date': session.start_time.strftime('%Y-%m-%d'),
            'time': session.start_time.strftime('%H:%M'),
            'table': session.table_identifier,
            'duration': session.formatted_duration,
            'price': session.price,
            'formatted_price': session.formatted_price,
            'is_paid': session.is_paid,
        })
    
    # Bar orders
    bar_orders = BarOrder.objects.filter(client_name=client_name).order_by('-timestamp')
    bar_data = []
    for order in bar_orders:
        bar_data.append({
            'id': order.id,
            'type': 'bar',
            'date': order.date.strftime('%Y-%m-%d'),
            'time': order.timestamp.strftime('%H:%M'),
            'items': order.items,
            'price': order.total_price,
            'formatted_price': order.formatted_price,
            'is_paid': order.is_paid,
        })
    
    # Combine and sort by date
    all_history = billiard_data + bar_data
    all_history.sort(key=lambda x: x['date'], reverse=True)
    
    # Calculate totals
    total_billiard = sum(s['price'] for s in billiard_data)
    total_bar = sum(o['price'] for o in bar_data)
    
    # Calculate unpaid totals
    unpaid_billiard = sum(s['price'] for s in billiard_data if not s['is_paid'])
    unpaid_bar = sum(o['price'] for o in bar_data if not o['is_paid'])
    unpaid_count = len([s for s in billiard_data if not s['is_paid']]) + len([o for o in bar_data if not o['is_paid']])
    
    return Response({
        'client_name': client_name,
        'billiard_sessions': billiard_data,
        'bar_orders': bar_data,
        'all_history': all_history,
        'stats': {
            'total_billiard_sessions': len(billiard_data),
            'total_bar_orders': len(bar_data),
            'total_billiard_spent': total_billiard,
            'total_bar_spent': total_bar,
            'total_spent': total_billiard + total_bar,
            'total_unpaid': unpaid_billiard + unpaid_bar,
            'unpaid_count': unpaid_count,
        }
    })


@api_view(['POST'])
def toggle_client_payment(request, client_name, item_type, item_id):
    """Toggle payment status for a specific item."""
    if item_type == 'billiard':
        try:
            session = BilliardSession.objects.get(id=item_id, client_name=client_name)
            session.is_paid = not session.is_paid
            session.save()
            return Response({
                'success': True,
                'is_paid': session.is_paid,
                'message': f'Session {"payée" if session.is_paid else "marquée comme non payée"}'
            })
        except BilliardSession.DoesNotExist:
            return Response({'error': 'Session non trouvée'}, status=404)
    
    elif item_type == 'bar':
        try:
            order = BarOrder.objects.get(id=item_id, client_name=client_name)
            order.is_paid = not order.is_paid
            order.save()
            return Response({
                'success': True,
                'is_paid': order.is_paid,
                'message': f'Commande {"payée" if order.is_paid else "marquée comme non payée"}'
            })
        except BarOrder.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=404)
    
    return Response({'error': 'Type invalide'}, status=400)


@api_view(['POST'])
def pay_all_client(request, client_name):
    """Mark all unpaid items as paid for a client."""
    # Update billiard sessions
    billiard_updated = BilliardSession.objects.filter(
        client_name=client_name, is_paid=False
    ).update(is_paid=True)
    
    # Update bar orders
    bar_updated = BarOrder.objects.filter(
        client_name=client_name, is_paid=False
    ).update(is_paid=True)
    
    return Response({
        'success': True,
        'billiard_updated': billiard_updated,
        'bar_updated': bar_updated,
        'message': f'{billiard_updated + bar_updated} éléments marqués comme payés'
    })


@api_view(['DELETE'])
def delete_paid_client(request, client_name):
    """Delete all paid items for a client."""
    # Delete paid billiard sessions
    billiard_deleted = BilliardSession.objects.filter(
        client_name=client_name, is_paid=True
    ).delete()[0]
    
    # Delete paid bar orders
    bar_deleted = BarOrder.objects.filter(
        client_name=client_name, is_paid=True
    ).delete()[0]
    
    return Response({
        'success': True,
        'billiard_deleted': billiard_deleted,
        'bar_deleted': bar_deleted,
        'message': f'{billiard_deleted + bar_deleted} éléments payés supprimés'
    })


# ============================================
# AUTHENTICATION VIEWS
# ============================================
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """Login endpoint for authentication with JWT tokens."""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username et password requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user:
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Get user profile permissions
        try:
            profile = user.profile
            return Response({
                'username': user.username,
                'role': profile.role,
                'can_manage_billiard': profile.can_manage_billiard,
                'can_manage_ps4': profile.can_manage_ps4,
                'can_manage_bar': profile.can_manage_bar,
                'can_view_analytics': profile.can_view_analytics,
                'can_view_agenda': profile.can_view_agenda,
                'can_manage_clients': profile.can_manage_clients,
                'can_manage_settings': profile.can_manage_settings,
                'can_manage_users': profile.can_manage_users,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except:
            # Fallback if no profile exists
            return Response({
                'username': user.username,
                'role': 'admin' if user.is_staff else 'user',
                'can_manage_billiard': user.is_staff,
                'can_manage_ps4': user.is_staff,
                'can_manage_bar': user.is_staff,
                'can_view_analytics': user.is_staff,
                'can_view_agenda': user.is_staff,
                'can_manage_clients': user.is_staff,
                'can_manage_settings': user.is_staff,
                'can_manage_users': user.is_staff,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
    else:
        return Response(
            {'error': 'Identifiants incorrects'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def create_admin_view(request):
    """Create admin user - only works if no users exist."""
    # Check if any user exists
    if User.objects.count() > 0:
        return Response(
            {'error': 'Un utilisateur existe déjà. Utilisez le panneau d\'administration Django.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    username = request.data.get('username', 'admin')
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Password requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = User.objects.create_superuser(
        username=username,
        email=f'{username}@billard.local',
        password=password
    )
    
    return Response({
        'message': f'Admin "{username}" créé avec succès',
        'username': user.username
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def verify_admin_password_view(request):
    """Verify admin password for accessing restricted pages."""
    # Require authentication
    if not request.user or not request.user.is_authenticated:
        return Response(
            {'error': 'Authentification requise'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Password requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify the current user's password
    if request.user.check_password(password):
        return Response({'success': True})
    
    return Response(
        {'error': 'Mot de passe incorrect'},
        status=status.HTTP_401_UNAUTHORIZED
    )


class AppSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for application settings."""
    serializer_class = AppSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AppSettings.objects.all()

    def list(self, request):
        """Return singleton settings."""
        settings = AppSettings.get_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)


class BilliardTableViewSet(viewsets.ModelViewSet):
    """ViewSet for billiard tables."""
    serializer_class = BilliardTableSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = BilliardTable.objects.all()


class BilliardSessionViewSet(TogglePaidMixin, viewsets.ModelViewSet):
    """ViewSet for billiard sessions."""
    serializer_class = BilliardSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = BilliardSession.objects.all()

    def get_queryset(self):
        queryset = BilliardSession.objects.all()
        table_identifier = self.request.query_params.get('table_identifier')
        is_active = self.request.query_params.get('is_active')
        
        if table_identifier:
            queryset = queryset.filter(table_identifier=table_identifier)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset

    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a new billiard session."""
        serializer = StartSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        table_identifier = serializer.validated_data['table_identifier']
        client_name = serializer.validated_data.get('client_name', 'Anonyme')
        
        # Check if there's already an active session for this table
        active_session = BilliardSession.objects.filter(
            table_identifier=table_identifier, is_active=True
        ).first()
        
        if active_session:
            return Response(
                {'error': f'La table {table_identifier} a déjà une session active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new session
        session = BilliardSession.objects.create(
            table_identifier=table_identifier,
            client_name=client_name,
            is_active=True
        )
        
        return Response(
            BilliardSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'])
    def start_with_time(self, request):
        """Start a new billiard session with a specific start time."""
        table_identifier = request.data.get('table_identifier')
        client_name = request.data.get('client_name', 'Anonyme')
        start_time_str = request.data.get('start_time')
        
        print(f"[DEBUG] start_with_time called: table={table_identifier}, time={start_time_str}")
        
        if not table_identifier:
            return Response(
                {'error': 'table_identifier est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already an active session for this table
        active_session = BilliardSession.objects.filter(
            table_identifier=table_identifier, is_active=True
        ).first()
        
        if active_session:
            return Response(
                {'error': f'La table {table_identifier} a déjà une session active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse start time
        from django.utils import timezone
        import datetime
        
        if start_time_str:
            # Si juste l'heure est fournie (ex: "14:30"), utiliser la date d'aujourd'hui
            today = timezone.now().date()
            # Créer une datetime avec timezone
            try:
                # Parser l'heure (format HH:MM)
                hour, minute = map(int, start_time_str.split(':'))
                start_time = timezone.make_aware(
                    datetime.datetime.combine(today, datetime.time(hour, minute, 0))
                )
                print(f"[DEBUG] Parsed start_time: {start_time}")
            except (ValueError, AttributeError) as e:
                print(f"[DEBUG] Error parsing time: {e}")
                return Response(
                    {'error': f'Format d\'heure invalide. Utilisez HH:MM - {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            start_time = timezone.now()
        
        # Create new session with specific start time
        session = BilliardSession.objects.create(
            table_identifier=table_identifier,
            client_name=client_name,
            start_time=start_time,
            is_active=True
        )
        
        print(f"[DEBUG] Session created: id={session.id}, start_time={session.start_time}")
        
        return Response(
            BilliardSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )
        
        return Response(
            BilliardSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        """Stop a billiard session."""
        session = self.get_object()
        
        if not session.is_active:
            return Response(
                {'error': 'Cette session est déjà terminée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update client name if provided
        client_name = request.data.get('client_name', session.client_name)
        session.client_name = client_name
        session.stop_session()
        
        return Response(BilliardSessionSerializer(session).data)

    @action(detail=False, methods=['post'])
    def add_manual(self, request):
        """Add a manual session (for when counter was not started)."""
        table_identifier = request.data.get('table_identifier')
        client_name = request.data.get('client_name', 'Anonyme')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        
        if not table_identifier or not start_time or not end_time:
            return Response(
                {'error': 'table_identifier, start_time et end_time sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime strings
        from django.utils.dateparse import parse_datetime
        
        start_dt = parse_datetime(start_time)
        end_dt = parse_datetime(end_time)
        
        if not start_dt or not end_dt:
            return Response(
                {'error': 'Format de date/heure invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate duration and price
        duration = (end_dt - start_dt).total_seconds()
        
        # Get settings for price calculation
        settings = AppSettings.get_settings()
        
        # Calculate price based on duration
        duration_minutes = duration / 60
        
        # Apply pricing formula
        threshold = settings.threshold_mins  # 15 minutes
        rate_base = settings.rate_base  # 150 mil/min
        rate_reduced = settings.rate_reduced  # 135 mil/min
        floor_min = settings.floor_min  # 1000 mil
        floor_mid = settings.floor_mid  # 1500 mil
        
        if duration_minutes <= threshold:
            price = duration_minutes * rate_base
        else:
            price = (threshold * rate_base) + ((duration_minutes - threshold) * rate_reduced)
        
        # Apply floor conditions
        if duration_minutes <= 10:
            price = max(price, floor_min)
        elif duration_minutes <= 20:
            price = max(price, floor_mid)
        
        price = int(price)
        
        # Create session
        session = BilliardSession.objects.create(
            table_identifier=table_identifier,
            client_name=client_name,
            start_time=start_dt,
            end_time=end_dt,
            duration_seconds=int(duration),
            price=price,
            is_active=False,
            is_paid=False,
        )
        
        return Response(
            BilliardSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active sessions."""
        sessions = BilliardSession.objects.filter(is_active=True)
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get session history with filters."""
        queryset = BilliardSession.objects.filter(is_active=False)
        
        # Apply filters
        table_identifier = request.query_params.get('table_identifier')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        is_paid = request.query_params.get('is_paid')
        
        if table_identifier:
            queryset = queryset.filter(table_identifier=table_identifier)
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)
        if is_paid is not None:
            queryset = queryset.filter(is_paid=is_paid.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PS4GameViewSet(viewsets.ModelViewSet):
    """ViewSet for PS4 games."""
    serializer_class = PS4GameSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PS4Game.objects.all()


class PS4TimeOptionViewSet(viewsets.ModelViewSet):
    """ViewSet for PS4 time options."""
    serializer_class = PS4TimeOptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PS4TimeOption.objects.all()

    def get_queryset(self):
        queryset = PS4TimeOption.objects.all()
        game_id = self.request.query_params.get('game_id')
        if game_id:
            queryset = queryset.filter(game_id=game_id)
        return queryset


class PS4SessionViewSet(TogglePaidMixin, viewsets.ModelViewSet):
    """ViewSet for PS4 sessions."""
    serializer_class = PS4SessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PS4Session.objects.all()

    def get_queryset(self):
        queryset = PS4Session.objects.all()
        date = self.request.query_params.get('date')
        
        if date:
            queryset = queryset.filter(date=date)
        
        return queryset

    def create(self, request):
        """Create a new PS4 session."""
        serializer = CreatePS4SessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        game_id = serializer.validated_data['game_id']
        players = serializer.validated_data['players']
        time_option_id = serializer.validated_data['time_option_id']
        
        try:
            game = PS4Game.objects.get(id=game_id)
            time_option = PS4TimeOption.objects.get(id=time_option_id, game=game)
        except (PS4Game.DoesNotExist, PS4TimeOption.DoesNotExist):
            return Response(
                {'error': 'Jeu ou option de temps non trouvé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session = PS4Session.objects.create(
            game=game,
            game_name=game.name,
            players=players,
            duration_minutes=time_option.minutes,
            price=time_option.price
        )
        
        return Response(
            PS4SessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory items."""
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = InventoryItem.objects.all()


class BarOrderViewSet(TogglePaidMixin, viewsets.ModelViewSet):
    """ViewSet for bar orders."""
    serializer_class = BarOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = BarOrder.objects.all()

    def get_queryset(self):
        queryset = BarOrder.objects.all()
        date = self.request.query_params.get('date')
        is_paid = self.request.query_params.get('is_paid')
        
        if date:
            queryset = queryset.filter(date=date)
        if is_paid is not None:
            queryset = queryset.filter(is_paid=is_paid.lower() == 'true')
        
        return queryset

    def create(self, request):
        """Create a new bar order."""
        serializer = CreateBarOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        client_name = serializer.validated_data.get('client_name', 'Anonyme')
        items = serializer.validated_data['items']
        
        order = BarOrder.objects.create(
            client_name=client_name,
            items=items
        )
        order.calculate_total()
        order.save()
        
        return Response(
            BarOrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class StatsViewSet(viewsets.ViewSet):
    """ViewSet for statistics."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Get overall statistics."""
        today = timezone.now().date()
        
        # Billiard stats
        billiard_sessions = BilliardSession.objects.filter(is_active=False)
        billiard_revenue = billiard_sessions.aggregate(
            total=Sum('price')
        )['total'] or 0
        
        # PS4 stats
        ps4_sessions = PS4Session.objects.all()
        ps4_revenue = ps4_sessions.aggregate(
            total=Sum('price')
        )['total'] or 0
        
        # Bar stats
        bar_orders = BarOrder.objects.all()
        bar_revenue = bar_orders.aggregate(
            total=Sum('total_price')
        )['total'] or 0
        
        # Today's stats
        today_billiard = BilliardSession.objects.filter(
            start_time__date=today, is_active=False
        )
        today_ps4 = PS4Session.objects.filter(date=today)
        today_bar = BarOrder.objects.filter(date=today)
        
        return Response({
            'billiard': {
                'total_sessions': billiard_sessions.count(),
                'total_revenue': billiard_revenue,
                'formatted_revenue': f"{billiard_revenue / 1000:.3f} DT",
                'active_sessions': BilliardSession.objects.filter(is_active=True).count(),
            },
            'ps4': {
                'total_sessions': ps4_sessions.count(),
                'total_revenue': ps4_revenue,
                'formatted_revenue': f"{ps4_revenue / 1000:.3f} DT",
            },
            'bar': {
                'total_orders': bar_orders.count(),
                'total_revenue': bar_revenue,
                'formatted_revenue': f"{bar_revenue / 1000:.3f} DT",
            },
            'today': {
                'billiard_sessions': today_billiard.count(),
                'billiard_revenue': today_billiard.aggregate(
                    total=Sum('price')
                )['total'] or 0,
                'ps4_sessions': today_ps4.count(),
                'ps4_revenue': today_ps4.aggregate(
                    total=Sum('price')
                )['total'] or 0,
                'bar_orders': today_bar.count(),
                'bar_revenue': today_bar.aggregate(
                    total=Sum('total_price')
                )['total'] or 0,
            },
            'total_revenue': billiard_revenue + ps4_revenue + bar_revenue,
            'formatted_total': f"{(billiard_revenue + ps4_revenue + bar_revenue) / 1000:.3f} DT",
        })


# ============================================
# AGENDA/CALENDAR VIEWS
# ============================================
@api_view(['GET'])
def daily_revenue(request, date_str):
    """Get revenue for a specific date.
    
    Args:
        date_str: Date in format YYYY-MM-DD
    """
    from datetime import datetime
    import traceback
    
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    try:
        # Billiard sessions for this date
        billiard_sessions = BilliardSession.objects.filter(
            start_time__date=date,
            is_active=False
        ).order_by('-start_time')
        
        billiard_data = []
        for session in billiard_sessions:
            billiard_data.append({
                'id': session.id,
                'table_identifier': session.table_identifier,
                'client_name': session.client_name,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat() if session.end_time else None,
                'duration_seconds': session.duration_seconds,
                'formatted_duration': session.get_formatted_duration(),
                'price': session.price,
                'formatted_price': session.get_formatted_price(),
                'is_paid': session.is_paid,
            })
        
        billiard_total = sum(s['price'] for s in billiard_data)
        
        # PS4 sessions for this date
        ps4_sessions = PS4Session.objects.filter(date=date).order_by('-timestamp')
        
        ps4_data = []
        for session in ps4_sessions:
            ps4_data.append({
                'id': session.id,
                'game_name': session.game_name,
                'players': session.players,
                'duration_minutes': session.duration_minutes,
                'price': session.price,
                'formatted_price': session.get_formatted_price(),
                'is_paid': session.is_paid,
            })
        
        ps4_total = sum(s['price'] for s in ps4_data)
        
        # Bar orders for this date
        bar_orders = BarOrder.objects.filter(date=date).order_by('-timestamp')
        
        bar_data = []
        for order in bar_orders:
            bar_data.append({
                'id': order.id,
                'client_name': order.client_name,
                'items': order.items,
                'total_price': order.total_price,
                'formatted_price': order.get_formatted_price(),
                'is_paid': order.is_paid,
            })
        
        bar_total = sum(s['total_price'] for s in bar_data)
        
        return Response({
            'date': date_str,
            'billiard': {
                'sessions': billiard_data,
                'total': billiard_total,
                'formatted_total': f"{billiard_total / 1000:.3f} DT",
                'count': len(billiard_data),
            },
            'ps4': {
                'sessions': ps4_data,
                'total': ps4_total,
                'formatted_total': f"{ps4_total / 1000:.3f} DT",
                'count': len(ps4_data),
            },
            'bar': {
                'orders': bar_data,
                'total': bar_total,
                'formatted_total': f"{bar_total / 1000:.3f} DT",
                'count': len(bar_data),
            },
            'grand_total': billiard_total + ps4_total + bar_total,
            'formatted_grand_total': f"{(billiard_total + ps4_total + bar_total) / 1000:.3f} DT",
        })
    except Exception as e:
        print(f"Error in daily_revenue: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def monthly_revenue(request, year, month):
    """Get daily revenue for a specific month.
    
    Args:
        year: Year (e.g., 2024)
        month: Month (1-12)
    """
    from datetime import datetime
    import calendar
    
    try:
        year = int(year)
        month = int(month)
        if month < 1 or month > 12:
            raise ValueError('Month must be between 1 and 12')
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    
    # Get all days in the month
    _, days_in_month = calendar.monthrange(year, month)
    
    daily_data = []
    for day in range(1, days_in_month + 1):
        date = datetime(year, month, day).date()
        
        # Billiard revenue
        billiard_revenue = BilliardSession.objects.filter(
            start_time__date=date,
            is_active=False
        ).aggregate(total=Sum('price'))['total'] or 0
        
        # PS4 revenue
        ps4_revenue = PS4Session.objects.filter(
            date=date
        ).aggregate(total=Sum('price'))['total'] or 0
        
        # Bar revenue
        bar_revenue = BarOrder.objects.filter(
            date=date
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        total = billiard_revenue + ps4_revenue + bar_revenue
        
        daily_data.append({
            'date': date.isoformat(),
            'day': day,
            'billiard_revenue': billiard_revenue,
            'ps4_revenue': ps4_revenue,
            'bar_revenue': bar_revenue,
            'total_revenue': total,
            'formatted_total': f"{total / 1000:.3f} DT",
            'has_data': total > 0,
        })
    
    # Calculate month totals
    month_billiard = sum(d['billiard_revenue'] for d in daily_data)
    month_ps4 = sum(d['ps4_revenue'] for d in daily_data)
    month_bar = sum(d['bar_revenue'] for d in daily_data)
    month_total = month_billiard + month_ps4 + month_bar
    
    return Response({
        'year': year,
        'month': month,
        'month_name': calendar.month_name[month],
        'days': daily_data,
        'totals': {
            'billiard': month_billiard,
            'ps4': month_ps4,
            'bar': month_bar,
            'total': month_total,
            'formatted_total': f"{month_total / 1000:.3f} DT",
        }
    })


# ============================================
# CLIENT MODEL VIEWS
# ============================================
class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet for managing registered clients."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Client.objects.all()
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


# ============================================
# USER MANAGEMENT VIEWS
# ============================================
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.all()
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new user with profile."""
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        email = serializer.validated_data.get('email', '')
        role = serializer.validated_data.get('role', 'user')
        
        # Check if username exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': f'L\'utilisateur "{username}" existe déjà'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Create profile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': role}
        )
        if not created:
            profile.role = role
            profile.save()
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        """Delete a user."""
        user = self.get_object()
        
        # Prevent deleting the last admin
        if user.is_staff and User.objects.filter(is_staff=True).count() == 1:
            return Response(
                {'error': 'Impossible de supprimer le dernier administrateur'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'])
    def update_permissions(self, request, pk=None):
        """Update user permissions."""
        user = self.get_object()
        
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=user)
        
        # Update permissions
        permissions_fields = [
            'can_manage_billiard', 'can_manage_ps4', 'can_manage_bar',
            'can_view_analytics', 'can_view_agenda', 'can_manage_clients',
            'can_manage_settings', 'can_manage_users'
        ]
        
        for field in permissions_fields:
            if field in request.data:
                setattr(profile, field, request.data[field])
        
        if 'role' in request.data:
            profile.role = request.data['role']
        
        profile.save()
        
        # Return the full user data with flattened permissions
        return Response(UserSerializer(user).data)


@api_view(['GET'])
def get_current_user(request):
    """Get current user info with permissions."""
    # Require authentication - get user from JWT token
    if not request.user or not request.user.is_authenticated:
        return Response({'error': 'Authentification requise'}, status=401)
    
    return Response(UserSerializer(request.user).data)
