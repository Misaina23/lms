from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate
from classes.models import Classe, Matiere
from classes.serializers import ClasseSerializer, MatiereSerializer
from .models import CustomUser
from .serializers import CustomUserSerializer, UserListSerializer
from .permissions import IsAdminOnly, IsStaffUser, STAFF_ROLES


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
        'roles': [{'value': CustomUser.Role.PROFESSEUR, 'label': 'Professeur'}],
        'teacher_types': [
            {'value': tt[0], 'label': tt[1]}
            for tt in CustomUser.TeacherType.choices
        ] if request.query_params.get('include_teacher_types') else [],
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
def register_view(request):
    if request.data.get('role') != CustomUser.Role.PROFESSEUR:
        return Response(
            {'role': ['Les inscriptions publiques sont réservées aux enseignants.']},
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
