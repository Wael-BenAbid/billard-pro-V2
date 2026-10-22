import calendar
import datetime
import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
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

logger = logging.getLogger(__name__)

ANONYMOUS_NAMES = ['Anonyme', 'Anonymous']


# ============================================
# QUERY HELPERS
# ============================================
def day_bounds(date):
    """Aware [start, end) datetimes of a local calendar day.

    Filtering on a datetime range (instead of `start_time__date=`) lets the
    database use the start_time index.
    """
    start = timezone.make_aware(datetime.datetime.combine(date, datetime.time.min))
    return start, start + datetime.timedelta(days=1)


def filter_by_period(queryset, params, datetime_field=None, date_field=None):
    """Apply the shared list filters used by the history endpoints.

    - start_date / end_date (YYYY-MM-DD, inclusive)
    - recent=true: today's records plus every unpaid (or still active) one
    """
    start_date = parse_date(params.get('start_date') or '')
    end_date = parse_date(params.get('end_date') or '')
    if datetime_field:
        if start_date:
            queryset = queryset.filter(**{f'{datetime_field}__gte': day_bounds(start_date)[0]})
        if end_date:
            queryset = queryset.filter(**{f'{datetime_field}__lt': day_bounds(end_date)[1]})
    else:
        if start_date:
            queryset = queryset.filter(**{f'{date_field}__gte': start_date})
        if end_date:
            queryset = queryset.filter(**{f'{date_field}__lte': end_date})

    if params.get('recent', '').lower() == 'true':
        today = timezone.localdate()
        if datetime_field:
            recent = Q(**{f'{datetime_field}__gte': day_bounds(today)[0]})
        else:
            recent = Q(**{f'{date_field}__gte': today})
        recent |= Q(is_paid=False)
        if hasattr(queryset.model, 'is_active'):
            recent |= Q(is_active=True)
        queryset = queryset.filter(recent)
    return queryset


def client_totals(queryset, price_field):
    """Per-client count/total/unpaid figures in a single GROUP BY query."""
    unpaid = Q(is_paid=False)
    rows = (
        queryset.exclude(client_name__in=ANONYMOUS_NAMES)
        .values('client_name')
        .annotate(
            count=Count('id'),
            total=Sum(price_field),
            unpaid_total=Sum(price_field, filter=unpaid),
            unpaid_count=Count('id', filter=unpaid),
        )
    )
    return {row['client_name']: row for row in rows}


# ============================================
# CUSTOM PERMISSIONS & MIXINS
# ============================================
class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """Allow read-only access to unauthenticated users, require auth for write."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


def is_admin(user):
    """Staff/superusers and users whose profile role is 'admin'."""
    if user.is_staff or user.is_superuser:
        return True
    try:
        return user.profile.role == 'admin'
    except UserProfile.DoesNotExist:
        return False


def user_has_perm(user, perm):
    """Check one of the UserProfile `can_*` flags (admins have them all)."""
    if is_admin(user):
        return True
    try:
        return bool(getattr(user.profile, perm, False))
    except UserProfile.DoesNotExist:
        return False


def require_perm(perm, read_open=True):
    """Build a DRF permission class enforcing a UserProfile flag server-side.

    read_open=True: any authenticated user may read (GET), the flag is needed
    to write. read_open=False: the flag is needed for every method.
    """
    class _RequirePerm(permissions.BasePermission):
        message = "Vous n'avez pas la permission d'effectuer cette action."

        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if read_open and request.method in permissions.SAFE_METHODS:
                return True
            return user_has_perm(request.user, perm)

    _RequirePerm.__name__ = f'Require_{perm}'
    return _RequirePerm


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
@permission_classes([require_perm('can_manage_clients', read_open=False)])
def clients_list(request):
    """Get all unique clients with their statistics."""
    billiard = client_totals(BilliardSession.objects.filter(archived=False), 'price')
    bar = client_totals(BarOrder.objects.filter(archived=False), 'total_price')
    empty = {'count': 0, 'total': 0, 'unpaid_total': 0, 'unpaid_count': 0}

    clients_data = []
    for client_name in sorted(billiard.keys() | bar.keys()):
        b = billiard.get(client_name, empty)
        o = bar.get(client_name, empty)
        billiard_count = b['count']
        billiard_total = b['total'] or 0
        bar_count = o['count']
        bar_total = o['total'] or 0
        total_visits = billiard_count + bar_count
        total_unpaid = (b['unpaid_total'] or 0) + (o['unpaid_total'] or 0)
        unpaid_count = b['unpaid_count'] + o['unpaid_count']

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
def client_names(request):
    """Lightweight list of known client names (for autocomplete)."""
    billiard = BilliardSession.objects.values_list('client_name', flat=True).distinct()
    bar = BarOrder.objects.values_list('client_name', flat=True).distinct()
    names = (set(billiard) | set(bar)) - set(ANONYMOUS_NAMES) - {''}
    return Response(sorted(names))


@api_view(['GET'])
@permission_classes([require_perm('can_manage_clients', read_open=False)])
def client_history(request, client_name):
    """Get complete history for a specific client."""
    # Billiard sessions
    billiard_sessions = BilliardSession.objects.filter(client_name=client_name, archived=False).order_by('-start_time')
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
    bar_orders = BarOrder.objects.filter(client_name=client_name, archived=False).order_by('-timestamp')
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
@permission_classes([require_perm('can_manage_clients', read_open=False)])
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
@permission_classes([require_perm('can_manage_clients', read_open=False)])
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
@permission_classes([require_perm('can_manage_clients', read_open=False)])
def delete_paid_client(request, client_name):
    """Archive all paid items for a client.

    They disappear from the client history but stay in the revenue
    (Agenda, statistics), so past accounting never changes.
    """
    billiard_deleted = BilliardSession.objects.filter(
        client_name=client_name, is_paid=True, archived=False
    ).update(archived=True)
    
    bar_deleted = BarOrder.objects.filter(
        client_name=client_name, is_paid=True, archived=False
    ).update(archived=True)
    
    return Response({
        'success': True,
        'billiard_deleted': billiard_deleted,
        'bar_deleted': bar_deleted,
        'message': f'{billiard_deleted + bar_deleted} éléments payés archivés'
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


class AppSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for application settings."""
    serializer_class = AppSettingsSerializer
    permission_classes = [require_perm('can_manage_settings')]

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
    permission_classes = [require_perm('can_manage_settings')]
    queryset = BilliardTable.objects.all()


class BilliardSessionViewSet(TogglePaidMixin, viewsets.ModelViewSet):
    """ViewSet for billiard sessions."""
    serializer_class = BilliardSessionSerializer
    permission_classes = [require_perm('can_manage_billiard')]
    queryset = BilliardSession.objects.all()

    def get_queryset(self):
        queryset = BilliardSession.objects.all()
        table_identifier = self.request.query_params.get('table_identifier')
        is_active = self.request.query_params.get('is_active')
        
        if table_identifier:
            queryset = queryset.filter(table_identifier=table_identifier)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return filter_by_period(queryset, self.request.query_params, datetime_field='start_time')

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
        
        logger.debug("start_with_time called: table=%s, time=%s", table_identifier, start_time_str)
        
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
            except (ValueError, AttributeError) as e:
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
        
        logger.debug("Session created: id=%s, start_time=%s", session.id, session.start_time)
        
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
        
        if duration <= 0:
            return Response(
                {'error': "L'heure de fin doit être après l'heure de début"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Same pricing rules as live sessions (see BilliardSession model)
        price = BilliardSession()._calculate_price_from_duration(int(duration))
        
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
        is_paid = request.query_params.get('is_paid')
        
        if table_identifier:
            queryset = queryset.filter(table_identifier=table_identifier)
        queryset = filter_by_period(queryset, request.query_params, datetime_field='start_time')
        if is_paid is not None:
            queryset = queryset.filter(is_paid=is_paid.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PS4GameViewSet(viewsets.ModelViewSet):
    """ViewSet for PS4 games."""
    serializer_class = PS4GameSerializer
    permission_classes = [require_perm('can_manage_settings')]
    queryset = PS4Game.objects.all()


class PS4TimeOptionViewSet(viewsets.ModelViewSet):
    """ViewSet for PS4 time options."""
    serializer_class = PS4TimeOptionSerializer
    permission_classes = [require_perm('can_manage_settings')]
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
    permission_classes = [require_perm('can_manage_ps4')]
    queryset = PS4Session.objects.all()

    def get_queryset(self):
        queryset = PS4Session.objects.all()
        date = self.request.query_params.get('date')
        
        if date:
            queryset = queryset.filter(date=date)
        
        return filter_by_period(queryset, self.request.query_params, date_field='date')

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
    permission_classes = [require_perm('can_manage_settings')]
    queryset = InventoryItem.objects.all()


class BarOrderViewSet(TogglePaidMixin, viewsets.ModelViewSet):
    """ViewSet for bar orders."""
    serializer_class = BarOrderSerializer
    permission_classes = [require_perm('can_manage_bar')]
    queryset = BarOrder.objects.all()

    def get_queryset(self):
        queryset = BarOrder.objects.all()
        date = self.request.query_params.get('date')
        is_paid = self.request.query_params.get('is_paid')
        
        if date:
            queryset = queryset.filter(date=date)
        if is_paid is not None:
            queryset = queryset.filter(is_paid=is_paid.lower() == 'true')
        
        return filter_by_period(queryset, self.request.query_params, date_field='date')

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
    permission_classes = [require_perm('can_view_analytics', read_open=False)]

    def list(self, request):
        """Get overall statistics (one aggregate query per table)."""
        today = timezone.localdate()
        today_start, today_end = day_bounds(today)
        is_today = Q(start_time__gte=today_start, start_time__lt=today_end)

        billiard = BilliardSession.objects.aggregate(
            total_sessions=Count('id', filter=Q(is_active=False)),
            total_revenue=Sum('price', filter=Q(is_active=False)),
            active_sessions=Count('id', filter=Q(is_active=True)),
            today_sessions=Count('id', filter=is_today & Q(is_active=False)),
            today_revenue=Sum('price', filter=is_today & Q(is_active=False)),
        )
        ps4 = PS4Session.objects.aggregate(
            total_sessions=Count('id'),
            total_revenue=Sum('price'),
            today_sessions=Count('id', filter=Q(date=today)),
            today_revenue=Sum('price', filter=Q(date=today)),
        )
        bar = BarOrder.objects.aggregate(
            total_orders=Count('id'),
            total_revenue=Sum('total_price'),
            today_orders=Count('id', filter=Q(date=today)),
            today_revenue=Sum('total_price', filter=Q(date=today)),
        )

        billiard_revenue = billiard['total_revenue'] or 0
        ps4_revenue = ps4['total_revenue'] or 0
        bar_revenue = bar['total_revenue'] or 0

        return Response({
            'billiard': {
                'total_sessions': billiard['total_sessions'],
                'total_revenue': billiard_revenue,
                'formatted_revenue': f"{billiard_revenue / 1000:.3f} DT",
                'active_sessions': billiard['active_sessions'],
            },
            'ps4': {
                'total_sessions': ps4['total_sessions'],
                'total_revenue': ps4_revenue,
                'formatted_revenue': f"{ps4_revenue / 1000:.3f} DT",
            },
            'bar': {
                'total_orders': bar['total_orders'],
                'total_revenue': bar_revenue,
                'formatted_revenue': f"{bar_revenue / 1000:.3f} DT",
            },
            'today': {
                'billiard_sessions': billiard['today_sessions'],
                'billiard_revenue': billiard['today_revenue'] or 0,
                'ps4_sessions': ps4['today_sessions'],
                'ps4_revenue': ps4['today_revenue'] or 0,
                'bar_orders': bar['today_orders'],
                'bar_revenue': bar['today_revenue'] or 0,
            },
            'total_revenue': billiard_revenue + ps4_revenue + bar_revenue,
            'formatted_total': f"{(billiard_revenue + ps4_revenue + bar_revenue) / 1000:.3f} DT",
        })


# ============================================
# AGENDA/CALENDAR VIEWS
# ============================================
@api_view(['GET'])
@permission_classes([require_perm('can_view_agenda', read_open=False)])
def daily_revenue(request, date_str):
    """Get revenue for a specific date.

    Args:
        date_str: Date in format YYYY-MM-DD
    """
    try:
        date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

    try:
        day_start, day_end = day_bounds(date)

        # Billiard sessions for this date
        billiard_sessions = BilliardSession.objects.filter(
            start_time__gte=day_start,
            start_time__lt=day_end,
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
        logger.exception("Error in daily_revenue")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([require_perm('can_view_agenda', read_open=False)])
def monthly_revenue(request, year, month):
    """Get daily revenue for a specific month (3 GROUP BY queries).

    Args:
        year: Year (e.g., 2024)
        month: Month (1-12)
    """
    try:
        year = int(year)
        month = int(month)
        if month < 1 or month > 12:
            raise ValueError('Month must be between 1 and 12')
    except ValueError as e:
        return Response({'error': str(e)}, status=400)

    _, days_in_month = calendar.monthrange(year, month)
    first_day = datetime.date(year, month, 1)
    last_day = datetime.date(year, month, days_in_month)
    month_start, _ = day_bounds(first_day)
    _, month_end = day_bounds(last_day)

    billiard_by_day = {
        row['day']: row['total'] or 0
        for row in BilliardSession.objects.filter(
            start_time__gte=month_start, start_time__lt=month_end, is_active=False
        ).annotate(day=TruncDate('start_time')).values('day').annotate(total=Sum('price'))
    }
    ps4_by_day = {
        row['date']: row['total'] or 0
        for row in PS4Session.objects.filter(date__range=(first_day, last_day))
        .values('date').annotate(total=Sum('price'))
    }
    bar_by_day = {
        row['date']: row['total'] or 0
        for row in BarOrder.objects.filter(date__range=(first_day, last_day))
        .values('date').annotate(total=Sum('total_price'))
    }

    daily_data = []
    for day in range(1, days_in_month + 1):
        date = datetime.date(year, month, day)
        billiard_revenue = billiard_by_day.get(date, 0)
        ps4_revenue = ps4_by_day.get(date, 0)
        bar_revenue = bar_by_day.get(date, 0)
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
    permission_classes = [require_perm('can_manage_clients', read_open=False)]

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
    permission_classes = [require_perm('can_manage_users', read_open=False)]

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

        if role == 'admin' and not is_admin(request.user):
            return Response(
                {'error': 'Seul un administrateur peut créer un administrateur'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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

    def _forbid_if_target_admin(self, request, user):
        """Only an administrator may modify or delete an administrator account."""
        if is_admin(user) and not is_admin(request.user):
            return Response(
                {'error': 'Seul un administrateur peut modifier un administrateur'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def update(self, request, *args, **kwargs):
        forbidden = self._forbid_if_target_admin(request, self.get_object())
        return forbidden or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a user."""
        user = self.get_object()
        forbidden = self._forbid_if_target_admin(request, user)
        if forbidden:
            return forbidden
        
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
        forbidden = self._forbid_if_target_admin(request, user)
        if forbidden:
            return forbidden

        requester_is_admin = is_admin(request.user)
        if not requester_is_admin:
            if user == request.user:
                return Response(
                    {'error': 'Vous ne pouvez pas modifier vos propres permissions'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if request.data.get('role') == 'admin':
                return Response(
                    {'error': 'Seul un administrateur peut nommer un administrateur'},
                    status=status.HTTP_403_FORBIDDEN
                )
        if 'role' in request.data and request.data['role'] not in dict(UserProfile.ROLE_CHOICES):
            return Response({'error': 'Rôle invalide'}, status=status.HTTP_400_BAD_REQUEST)
        
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
                value = bool(request.data[field])
                # A non-admin manager can only grant permissions they hold themselves
                if value and not requester_is_admin and not user_has_perm(request.user, field):
                    return Response(
                        {'error': f"Vous ne pouvez pas accorder une permission que vous n'avez pas ({field})"},
                        status=status.HTTP_403_FORBIDDEN
                    )
                setattr(profile, field, value)
        
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
