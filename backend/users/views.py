from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate, password_validation
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from classes.models import Classe, Matiere
from classes.serializers import ClasseSerializer, MatiereSerializer
from .models import CustomUser
from .serializers import CustomUserSerializer, UserListSerializer
from .permissions import IsAdminOnly, IsStaffUser, STAFF_ROLES

PORTAL_ACCESS_ROLES = {
    CustomUser.Role.ADMIN,
    CustomUser.Role.PROFESSEUR,
    CustomUser.Role.SURVEILLANT,
    CustomUser.Role.SECRETARIAT,
}
PUBLIC_SIGNUP_ROLES = {
    CustomUser.Role.ADMIN,
    CustomUser.Role.PROFESSEUR,
    CustomUser.Role.SURVEILLANT,
}


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role', 'is_active', 'date_of_birth', 'status']

    def get_serializer_class(self):
        if self.action == 'list' and self.request.user.role != 'ADMIN':
            return UserListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return CustomUser.objects.all()
        return CustomUser.objects.filter(
            role__in=STAFF_ROLES,
            status=CustomUser.Status.ACTIVE,
            is_active=True,
        )

    def get_permissions(self):
        if self.action == 'list':
            return [IsStaffUser()]
        return [IsAdminOnly()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def approve(self, request, pk=None):
        user = self.get_object()
        if user.role not in [
            CustomUser.Role.PROFESSEUR,
            CustomUser.Role.SURVEILLANT,
            CustomUser.Role.SECRETARIAT,
        ]:
            return Response({'detail': 'Cannot approve this account type'}, status=status.HTTP_400_BAD_REQUEST)
        user.status = CustomUser.Status.ACTIVE
        user.is_active = True
        user.save()
        return Response({'status': 'approved', 'user': CustomUserSerializer(user).data})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def reject(self, request, pk=None):
        user = self.get_object()
        if user.role not in [
            CustomUser.Role.PROFESSEUR,
            CustomUser.Role.SURVEILLANT,
            CustomUser.Role.SECRETARIAT,
        ]:
            return Response({'detail': 'Cannot reject this account type'}, status=status.HTTP_400_BAD_REQUEST)
        user.status = CustomUser.Status.REJECTED
        user.is_active = False
        user.save()
        return Response({'status': 'rejected', 'user': CustomUserSerializer(user).data})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def suspend(self, request, pk=None):
        user = self.get_object()
        if user.role not in [
            CustomUser.Role.PROFESSEUR,
            CustomUser.Role.SURVEILLANT,
            CustomUser.Role.SECRETARIAT,
        ]:
            return Response({'detail': 'Cannot suspend this account type'}, status=status.HTTP_400_BAD_REQUEST)
        user.status = CustomUser.Status.SUSPENDED
        user.is_active = False
        user.save()
        return Response({'status': 'suspended', 'user': CustomUserSerializer(user).data})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def registration_options(request):
    classes = Classe.objects.all().order_by('niveau', 'nom')
    matieres = Matiere.objects.all().order_by('nom')
    return Response({
        'classes': ClasseSerializer(classes, many=True).data,
        'matieres': MatiereSerializer(matieres, many=True).data,
        'roles': [
            {'value': CustomUser.Role.PROFESSEUR, 'label': 'Professeur'},
            {'value': CustomUser.Role.ADMIN, 'label': 'Administrateur'},
            {'value': CustomUser.Role.SURVEILLANT, 'label': 'Surveillant'},
        ],
        'teacher_types': [
            {'value': tt[0], 'label': tt[1]}
            for tt in CustomUser.TeacherType.choices
        ] if request.query_params.get('include_teacher_types') else [],
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
def register_view(request):
    role = request.data.get('role')
    if role not in PUBLIC_SIGNUP_ROLES:
        return Response(
            {'role': ['Les inscriptions publiques sont réservées aux enseignants, administrateurs et surveillants.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not request.data.get('password'):
        return Response(
            {'password': ['Ce champ est obligatoire.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer = CustomUserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'detail': 'Inscription réussie. Votre compte est en attente de validation par l\'administration.',
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = authenticate(request, username=email, password=password)
    if user is not None:
        if user.role not in PORTAL_ACCESS_ROLES:
            return Response({
                'detail': 'Ce compte n\'est pas autorisé à accéder au portail.',
                'status': 'unauthorized_role'
            }, status=status.HTTP_403_FORBIDDEN)
        if user.status == CustomUser.Status.PENDING_VERIFICATION:
            return Response({
                'detail': 'Votre compte est en attente de validation par l\'administration.',
                'status': 'pending'
            }, status=status.HTTP_403_FORBIDDEN)
        if user.status != CustomUser.Status.ACTIVE or not user.is_active:
            return Response({
                'detail': 'Ce compte n\'est pas actif. Contactez l\'administration.',
                'status': user.status.lower()
            }, status=status.HTTP_403_FORBIDDEN)
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': CustomUserSerializer(user).data})
    return Response({'detail': 'Identifiants invalides'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request_view(request):
    form = PasswordResetForm(data={'email': request.data.get('email', '')})
    if not form.is_valid():
        return Response({'detail': 'Saisissez une adresse e-mail valide.'}, status=status.HTTP_400_BAD_REQUEST)
    if (
        settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend'
        and not settings.EMAIL_HOST
    ):
        return Response({
            'detail': 'La récupération par e-mail n’est pas encore configurée. Contactez l’administration.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    form.save(
        request=request,
        use_https=not settings.DEBUG,
        from_email=settings.DEFAULT_FROM_EMAIL,
        email_template_name='users/password_reset_email.txt',
        subject_template_name='users/password_reset_subject.txt',
        domain_override=settings.FRONTEND_URL,
    )
    return Response({
        'detail': 'Si un compte correspond à cette adresse, un lien de réinitialisation va être envoyé.'
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_confirm_view(request):
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    password = request.data.get('password')
    if not all(isinstance(value, str) and value for value in (uidb64, token, password)):
        return Response({'detail': 'Lien ou mot de passe manquant.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_id = force_str(urlsafe_base64_decode(uidb64))
        user = CustomUser._default_manager.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, UnicodeDecodeError, CustomUser.DoesNotExist):
        return Response({'detail': 'Ce lien de réinitialisation est invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.is_active or not default_token_generator.check_token(user, token):
        return Response({'detail': 'Ce lien de réinitialisation est invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        password_validation.validate_password(password, user)
    except ValidationError as error:
        return Response({'detail': ' '.join(error.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    user.save(update_fields=['password'])
    return Response({'detail': 'Votre mot de passe a été modifié. Vous pouvez vous connecter.'})
